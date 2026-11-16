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


def test_sleep_between_downloads_in_range(db):
    ft = FakeTime()
    seen = []
    t = Throttle(
        db,
        ThrottleSettings(),
        clock=ft.clock,
        sleep=ft.sleep,
        uniform=lambda a, b: seen.append((a, b)) or a + 5,
    )
    assert t.sleep_between_downloads() == 35
    assert seen == [(30, 120)] and ft.slept == [35]
    t0, ft0 = make(db, sleep_interval=0, max_sleep_interval=0)
    assert t0.sleep_between_downloads() == 0 and ft0.slept == []


def test_real_random_within_bounds(db):
    t = Throttle(db, ThrottleSettings(sleep_interval=1, max_sleep_interval=2), sleep=lambda s: None)
    for _ in range(20):
        assert 1 <= t.sleep_between_downloads() <= 2


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
