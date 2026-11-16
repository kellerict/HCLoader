from datetime import UTC, datetime, timedelta

import pytest

from app.core.config import ThrottleSettings
from app.core.throttle import (
    BackoffActive,
    LimitReached,
    Throttle,
    is_rate_limit_error,
)


class FakeTime:
    def __init__(self):
        self.now = datetime(2026, 11, 16, 12, 0, tzinfo=UTC)
        self.slept: list[float] = []

    def clock(self):
        return self.now

    def sleep(self, s):
        self.slept.append(s)
        self.now += timedelta(seconds=s)

    def advance(self, **kw):
        self.now += timedelta(**kw)


def make(db, ft=None, **cfg):
    ft = ft or FakeTime()
    t = Throttle(
        db, ThrottleSettings(**cfg), clock=ft.clock, sleep=ft.sleep, uniform=lambda a, b: b
    )
    return t, ft


@pytest.mark.parametrize(
    "msg",
    [
        "ERROR: HTTP Error 429: Too Many Requests",
        "Sign in to confirm you're not a bot. Use --cookies",
        "Sign in to confirm you’re not a bot",
        "too many requests",
    ],
)
def test_rate_limit_detection(msg):
    assert is_rate_limit_error(msg)


@pytest.mark.parametrize("msg", ["HTTP Error 404", "Video unavailable", "", None])
def test_not_rate_limit(msg):
    assert not is_rate_limit_error(msg)


def test_backoff_doubles_and_caps(db):
    t, ft = make(db)
    hours = []
    for _ in range(6):
        until = t.trigger_backoff("429")
        hours.append((until - ft.now).total_seconds() / 3600)
        ft.advance(hours=hours[-1] + 0.01)  # expire
        assert t.backoff_until() is None
    assert hours == pytest.approx([6, 12, 24, 48, 48, 48])
    assert t.backoff_level() == 6


def test_backoff_active_blocks_and_no_escalation(db):
    t, ft = make(db)
    u1 = t.trigger_backoff("x")
    assert t.trigger_backoff("again") == u1 and t.backoff_level() == 1
    with pytest.raises(BackoffActive) as e:
        t.before_request("search")
    assert e.value.until == u1
    assert not t.can_download()
    with pytest.raises(BackoffActive):
        t.check_download()
    assert t.backoff_remaining() == timedelta(hours=6)


def test_reset_and_manual_clear(db):
    t, ft = make(db)
    t.trigger_backoff("x")
    ft.advance(hours=7)
    t.trigger_backoff("x")
    assert t.backoff_level() == 2
    t.clear_backoff_manual()
    assert t.backoff_until() is None and t.backoff_level() == 2
    t.reset_backoff()
    assert t.backoff_level() == 0
    until = t.trigger_backoff("x")
    assert (until - ft.now) == timedelta(hours=6)


def test_custom_backoff_hours(db):
    t, ft = make(db, backoff_initial_hours=1, backoff_max_hours=3)
    for expected in (1, 2, 3, 3):
        until = t.trigger_backoff("x")
        assert (until - ft.now) == timedelta(hours=expected)
        ft.advance(hours=expected, minutes=1)


def test_backoff_persists_across_instances(db):
    t, ft = make(db)
    u = t.trigger_backoff("429")
    t2, _ = make(db, ft)
    assert t2.backoff_until() == u and t2.backoff_level() == 1


def test_handle_error(db):
    t, _ = make(db)
    assert not t.handle_error("HTTP Error 404")
    assert t.backoff_until() is None
    assert t.handle_error("HTTP Error 429: Too Many Requests")
    assert t.backoff_until() is not None
    assert t.status()["backoff_reason"].startswith("HTTP Error 429")


def test_search_limit_per_hour_sliding(db):
    t, ft = make(db, max_searches_per_hour=3, sleep_requests=0)
    for _ in range(3):
        t.before_request("search")
        ft.advance(minutes=10)
    with pytest.raises(LimitReached) as e:
        t.before_request("search")
    assert e.value.kind == "searches_per_hour"
    t.before_request("list")  # other kinds are not counted
    ft.advance(minutes=31)  # first search now older than 1h
    t.before_request("search")
    assert t.searches_last_hour() == 3


def test_search_counter_persistent(db):
    t, ft = make(db, max_searches_per_hour=2, sleep_requests=0)
    t.before_request("search")
    t.before_request("search")
    t2, _ = make(db, ft, max_searches_per_hour=2, sleep_requests=0)
    with pytest.raises(LimitReached):
        t2.before_request("search")


def test_request_spacing(db):
    t, ft = make(db, sleep_requests=3)
    t.before_request("list")
    assert ft.slept == []
    t.before_request("list")
    assert ft.slept == [3]
    ft.advance(seconds=10)
    t.before_request("list")
    assert ft.slept == [3]  # already waited long enough


def test_download_limits_run_and_day(db):
    t, ft = make(db, max_downloads_per_run=2, max_downloads_per_day=3)
    t.start_run()
    assert t.can_download()
    t.register_download()
    t.register_download()
    assert not t.can_download()
    with pytest.raises(LimitReached) as e:
        t.check_download()
    assert e.value.kind == "downloads_per_run"
    t.start_run()
    assert t.can_download()
    t.register_download()
    assert t.downloads_today() == 3 and t.downloads_this_run() == 1
    with pytest.raises(LimitReached) as e:
        t.check_download()
    assert e.value.kind == "downloads_per_day"


def test_day_rollover_resets_daily_counter(db):
    t, ft = make(db, max_downloads_per_run=10, max_downloads_per_day=1)
    t.start_run()
    t.register_download()
    assert not t.can_download()
    ft.advance(hours=25)
    assert t.downloads_today() == 0
    t.start_run()
    assert t.can_download()
    t.register_download()
    assert t.downloads_today() == 1


def test_daily_counter_persistent(db):
    t, ft = make(db, max_downloads_per_day=1)
    t.register_download()
    t2, _ = make(db, ft, max_downloads_per_day=1)
    t2.start_run()
    assert not t2.can_download()


def test_limit_rate_and_live_settings(db):
    cfg = ThrottleSettings()
    t = Throttle(db, lambda: cfg)
    assert t.limit_rate_bytes() == 3 * 1024 * 1024
    cfg.limit_rate_mb = 0
    assert t.limit_rate_bytes() is None


def test_status_dict(db):
    t, _ = make(db)
    st = t.status()
    assert st["backoff_until"] is None and st["max_downloads_per_day"] == 25


# ------------------------------------------------------------------ download pacing (M4)


def test_download_pacing_waits_since_last_end(db):
    seen = []
    ft = FakeTime()
    t = Throttle(
        db,
        ThrottleSettings(sleep_requests=0),
        clock=ft.clock,
        sleep=ft.sleep,
        uniform=lambda a, b: seen.append((a, b)) or a + 5,
    )
    t.before_request("download")  # first download ever: no pause
    assert ft.slept == []
    t.mark_download_end()
    ft.advance(seconds=10)
    t.before_request("download")
    assert seen == [(30, 120)] and ft.slept == [25]  # 35 s pause minus 10 s already elapsed


def test_download_pacing_persisted_across_instances(db):
    t, ft = make(db, sleep_requests=0, sleep_interval=30, max_sleep_interval=30)
    t.mark_download_end()
    t2, _ = make(db, ft, sleep_requests=0, sleep_interval=30, max_sleep_interval=30)
    t2.before_request("download")
    assert ft.slept == [30]


def test_no_pause_after_long_time_or_zero_interval(db):
    t, ft = make(db, sleep_requests=0, sleep_interval=30, max_sleep_interval=30)
    t.mark_download_end()
    ft.advance(seconds=31)
    t.before_request("download")
    assert ft.slept == []
    t0, ft0 = make(db, sleep_requests=0, sleep_interval=0, max_sleep_interval=0)
    t0.mark_download_end()
    t0.before_request("download")
    assert ft0.slept == []


def test_pacing_not_applied_to_metadata_requests(db):
    t, ft = make(db, sleep_requests=0)
    t.mark_download_end()
    t.before_request("search")
    assert ft.slept == []


def test_pacing_cancel_event_aborts(db):
    import threading

    ev = threading.Event()
    ft = FakeTime()

    def sleep_and_cancel(s):
        ft.sleep(s)
        ev.set()

    t = Throttle(
        db,
        ThrottleSettings(sleep_requests=0),
        clock=ft.clock,
        sleep=sleep_and_cancel,
        uniform=lambda a, b: b,
    )
    t.mark_download_end()
    from app.core.throttle import WaitCancelled

    with pytest.raises(WaitCancelled):
        t.before_request("download", cancel_event=ev, count_attempt=True)
    assert t.downloads_this_run() == 0  # cancelled while waiting: no attempt counted


def test_real_wait_is_abortable_via_event(db):
    import threading

    ev = threading.Event()
    ev.set()
    t = Throttle(db, ThrottleSettings(sleep_requests=0, sleep_interval=60, max_sleep_interval=60))
    t.mark_download_end()
    from app.core.throttle import WaitCancelled

    with pytest.raises(WaitCancelled):  # returns immediately instead of sleeping 60 s
        t.before_request("download", cancel_event=ev)


# ------------------------------------------------------------------ attempts count (M5)


def test_attempt_counts_on_request_release_not_on_retry(db):
    t, _ = make(
        db, sleep_requests=0, sleep_interval=0, max_sleep_interval=0, max_downloads_per_run=2
    )
    t.before_request("download", count_attempt=True)
    assert t.downloads_this_run() == 1 and t.downloads_today() == 1
    t.before_request("download", retry=True)  # network retry: not counted again, no limit check
    assert t.downloads_this_run() == 1
    t.before_request("download", count_attempt=True)
    with pytest.raises(LimitReached):
        t.before_request("download", count_attempt=True)
    assert t.downloads_this_run() == 2


# ------------------------------------------------------------------ finish_run (m1)


def test_finish_run_resets_backoff_only_on_success(db):
    t, ft = make(db)
    t.trigger_backoff("429")
    ft.advance(hours=7)
    t.finish_run(False)
    assert t.backoff_level() == 1
    t.finish_run(True)
    assert t.backoff_level() == 0 and t.backoff_until() is None


def test_finish_run_keeps_backoff_triggered_during_run(db):
    """N1: a successful run must not lift a backoff that is still active."""
    t, ft = make(db)
    t.start_run()
    until = t.trigger_backoff("429 als Warnung")
    t.finish_run(True)
    assert t.backoff_until() == until
    assert t.backoff_level() == 1


# ------------------------------------------------------------------ thread safety (M3)


def test_concurrent_requests_are_serialised_with_spacing(db):
    import threading

    ft = FakeTime()
    t = Throttle(db, ThrottleSettings(sleep_requests=3), clock=ft.clock, sleep=ft.sleep)
    t.before_request("resolve")  # primes _last_request
    stamps: list[datetime] = []
    barrier = threading.Barrier(4)

    def work():
        barrier.wait()
        t.before_request("resolve")
        stamps.append(ft.now)

    threads = [threading.Thread(target=work) for _ in range(4)]
    for th in threads:
        th.start()
    for th in threads:
        th.join()
    stamps.sort()
    assert all((b - a).total_seconds() >= 3 for a, b in zip(stamps, stamps[1:], strict=False))


def test_concurrent_download_counter_does_not_lose_updates(db):
    import threading

    t, _ = make(db, sleep_requests=0)
    threads = [threading.Thread(target=t.register_download) for _ in range(20)]
    for th in threads:
        th.start()
    for th in threads:
        th.join()
    assert t.downloads_today() == 20 and t.downloads_this_run() == 20
