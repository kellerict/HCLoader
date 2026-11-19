from datetime import UTC, datetime, timedelta

import pytest

from app.core.config import ThrottleSettings
from app.core.throttle import (
    BackoffActive,
    LimitReached,
    Throttle,
    is_rate_limit_error,
)

# pre-v0.2.0 behaviour tests assert the German texts (pins the de catalog)
pytestmark = pytest.mark.usefixtures("german_messages")


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


# ------------------------------------------------------------------ phase 3 queue helpers


def test_download_wait_is_rolled_once_and_used_by_before_request(db):
    rolls = []
    ft = FakeTime()
    t = Throttle(
        db,
        ThrottleSettings(sleep_requests=0, sleep_interval=30, max_sleep_interval=120),
        clock=ft.clock,
        sleep=ft.sleep,
        uniform=lambda a, b: rolls.append(1) or 40.0 + len(rolls),
    )
    assert t.download_wait() == 0.0  # no download yet
    t.mark_download_end()
    ft.advance(seconds=10)
    assert t.download_wait() == 31.0 and t.download_wait() == 31.0  # same roll
    t.wait_between_downloads()
    assert ft.slept == [31.0] and t.download_wait() == 0.0
    t.before_request("download")  # nothing left to wait
    assert ft.slept == [31.0] and len(rolls) == 1
    t.mark_download_end()
    assert t.download_wait() == 42.0 and len(rolls) == 2  # new end -> new roll


def test_wait_between_downloads_checks_limits_and_cancels(db):
    import threading

    from app.core.throttle import WaitCancelled

    t, ft = make(db, sleep_requests=0, sleep_interval=30, max_sleep_interval=30)
    t.mark_download_end()
    ev = threading.Event()
    ev.set()
    with pytest.raises(WaitCancelled):
        t.wait_between_downloads(ev)
    t.trigger_backoff("429")
    with pytest.raises(BackoffActive):
        t.wait_between_downloads()


def test_search_available_at(db):
    t, ft = make(db, sleep_requests=0, max_searches_per_hour=2)
    assert t.search_available_at() is None
    t.before_request("search")
    first = ft.now
    ft.advance(minutes=10)
    t.before_request("search")
    assert t.search_available_at() == first + timedelta(hours=1)
    with pytest.raises(LimitReached):
        t.before_request("search")


# ------------------------------------------------------------------ Review Phase 3 m4


def test_metadata_lock_timeout_and_cancel(db):
    import threading

    from app.core.throttle import MetadataBusy, WaitCancelled

    t, _ = make(db)
    with t.metadata_lock():
        assert t.metadata_busy()
        with pytest.raises(MetadataBusy) as ei:
            with t.metadata_lock(timeout=0.05):
                pass
        assert str(ei.value) == "Download-Abfrage läuft gerade – bitte gleich erneut versuchen"
        ev = threading.Event()
        ev.set()
        with pytest.raises(WaitCancelled):
            with t.metadata_lock(cancel_event=ev):
                pass
    assert not t.metadata_busy()
    with t.metadata_lock(timeout=0.05):  # free again
        pass


def test_metadata_lock_waits_for_release(db):
    import threading
    import time

    t, _ = make(db)
    held = threading.Event()
    order = []

    def holder():
        with t.metadata_lock():
            held.set()
            time.sleep(0.2)
            order.append("download extraction done")

    th = threading.Thread(target=holder)
    th.start()
    assert held.wait(5)
    with t.metadata_lock(timeout=5):
        order.append("search")
    th.join()
    assert order == ["download extraction done", "search"]


# ------------------------------------------------------------------ N5 / R2: cross-process state


def test_request_spacing_is_shared_through_the_db(db):
    """N5: a second Throttle (= second process) keeps the spacing to the first one's request."""
    ft = FakeTime()
    a, _ = make(db, ft, sleep_requests=3)
    b, _ = make(db, ft, sleep_requests=3)
    a.before_request("list")
    b.before_request("list")
    assert ft.slept == [3]
    assert db.get_state("last_request")


def test_search_counter_is_shared_through_the_db(db):
    ft = FakeTime()
    a, _ = make(db, ft, max_searches_per_hour=2, sleep_requests=0)
    b, _ = make(db, ft, max_searches_per_hour=2, sleep_requests=0)
    a.before_request("search")
    b.before_request("search")
    with pytest.raises(LimitReached):
        a.before_request("search")


def test_clock_set_back_does_not_wait_forever(db):
    ft = FakeTime()
    t, _ = make(db, ft, sleep_requests=3)
    t.before_request("list")
    ft.advance(hours=-5)
    t.before_request("list")
    assert ft.slept == [3]


def test_r2m1_request_spacing_after_waiting_for_the_metadata_lock(db):
    """A download reserves its slot, a search goes out while it waits for the metadata lock:
    after getting the lock the download must again keep `sleep_requests` to that search."""
    ft = FakeTime()
    t, _ = make(db, ft, sleep_requests=3)
    t.before_request("download", count_attempt=True)  # slot reserved
    t.request_spacing()  # nothing since -> no extra wait
    assert ft.slept == []
    import threading

    searcher = threading.Thread(target=lambda: t.before_request("search"))
    searcher.start()  # the search (other thread) goes out first, 3 s after the download's slot
    searcher.join()
    assert ft.slept == [3]
    ft.slept.clear()
    with t.metadata_lock():
        t.request_spacing()  # download now: spacing to the search again
    assert ft.slept == [3]
    assert t.downloads_this_run() == 1  # not counted again


def test_r2m1_real_threads_search_during_download_wait(db):
    import threading

    ft = FakeTime()
    t, _ = make(db, ft, sleep_requests=3)
    t.before_request("download", count_attempt=True)
    got_lock = threading.Event()
    done = threading.Event()

    def download():
        with t.metadata_lock():
            got_lock.set()
            t.request_spacing()
        done.set()

    with t.metadata_lock():
        th = threading.Thread(target=download)
        th.start()
        t.before_request("search")  # download is waiting for the lock meanwhile
        assert not got_lock.is_set()
        searched_at = ft.now
    assert done.wait(5)
    th.join()
    assert (ft.now - searched_at).total_seconds() >= 3


def test_r2n2_metadata_lock_is_cross_process(db, tmp_path):
    from app.core import locks
    from app.core.throttle import MetadataBusy

    t, _ = make(db)
    with locks.cross_process_lock(locks.METADATA_LOCK):  # "another process" holds it
        with pytest.raises(MetadataBusy):
            with t.metadata_lock(timeout=0.2, poll=0.02):
                pass
        assert not t.metadata_busy()  # the thread lock was released again
    with t.metadata_lock(timeout=1):
        pass


@pytest.mark.parametrize("method", ["reset_backoff", "finish_run", "clear_backoff_manual"])
def test_backoff_writes_run_under_the_cross_process_lock(db, monkeypatch, method):
    """n1: a backoff triggered by another process between check and reset is never lost."""
    from contextlib import contextmanager

    from app.core import locks

    t, _ft = make(db)
    taken = []

    @contextmanager
    def fake_lock(name, **kw):
        taken.append(name)
        yield True

    monkeypatch.setattr(locks, "cross_process_lock", fake_lock)
    getattr(t, method)(*([True] if method == "finish_run" else []))
    assert taken == [locks.THROTTLE_LOCK]


@pytest.mark.parametrize(
    ("message", "platform", "hit"),
    [
        ("ERROR: [mixcloud] x: Unable to download JSON metadata: HTTP Error 403", "mixcloud", True),
        ("ERROR: [mixcloud:user] DJ: HTTP Error 403: Forbidden", "mixcloud", True),
        ("ERROR: [mixcloud] x: HTTP Error 403", "youtube", False),
        ("ERROR: unable to download video data: HTTP Error 403: Forbidden", "mixcloud", False),
        ("ERROR: [HearThisAt] 4001: HTTP Error 403: Forbidden", "hearthis", True),
        ("ERROR: [hearthis:list:hcloader] x: HTTP Error 403", "hearthis", True),
        ("ERROR: [HearThisAt] 4001: HTTP Error 404: Not Found", "hearthis", False),
        ("ERROR: [mixcloud] x: HTTP Error 429: Too Many Requests", "mixcloud", True),
    ],
)
def test_mixcloud_hearthis_403_is_a_block(message, platform, hit):
    """Review v0.10.0 m4: an API 403 of Mixcloud / hearthis.at starts that platform's backoff."""
    assert is_rate_limit_error(message, platform) is hit
