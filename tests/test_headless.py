"""Headless run: exit codes and edge cases (the full flow is in test_headless_integration)."""

from __future__ import annotations

import pytest

from app import headless
from app.core import config
from app.core.db import Database
from app.core.throttle import Throttle
from app.exitcodes import EXIT_BLOCKED, EXIT_BUSY, EXIT_FAILED, EXIT_OK, EXIT_USAGE
from app.main import main


class NullClient:
    def __init__(self, fail=None):
        self.fail = fail

    def list_source(self, url, n=None):
        if self.fail:
            raise self.fail
        return []

    def search(self, *a, **kw):
        return []

    def close(self):
        pass


class FakeWatchdog:
    def __init__(self, ok=True):
        self.ok, self.stopped, self.checked, self.gave_up = ok, False, False, False

    def check(self):
        self.checked = True

    def running(self):
        return self.ok

    def stop(self):
        self.stopped = True


@pytest.fixture
def env(tmp_path):
    settings = config.defaults()
    settings.storage.target_dir = str(tmp_path / "music")
    settings.network.po_token_mode = "off"
    db = Database(tmp_path / "h.db")
    yield settings, db
    db.close()


def run(env, **kw):
    settings, db = env
    kw.setdefault("client_factory", NullClient)
    return headless.run_watchlist(settings=settings, db=db, configure_logging=False, **kw)


def test_usage_errors(capsys):
    assert main(["--headless"]) == EXIT_USAGE
    assert "--run-watchlist" in capsys.readouterr().err


def test_ok_run_stops_watchdog_and_resets_nothing_wrong(env):
    wd = FakeWatchdog()
    assert run(env, watchdog=wd) == EXIT_OK
    assert wd.checked and wd.stopped  # PO-token server started and stopped by the run itself


def test_pot_server_missing_aborts_before_any_request(env):
    settings, db = env
    settings.network.po_token_mode = "http"
    db.add_source("channel", "A", "https://www.youtube.com/@a")
    calls = []
    code = run(env, watchdog=FakeWatchdog(ok=False), client_factory=lambda: calls.append(1))
    assert code == EXIT_FAILED and calls == []
    assert "PO-Token" in db.list_runs()[0]["note"]


def test_backoff_active_at_start_exit_2(env):
    settings, db = env
    Throttle(db, settings.throttle).trigger_backoff("429")
    assert run(env) == EXIT_BLOCKED
    assert db.list_runs()[0]["note"].startswith("Backoff aktiv bis")


def test_rate_limited_client_error_sets_exit_2_and_note(env):
    settings, db = env
    db.add_source("channel", "A", "https://www.youtube.com/@a")

    class Limited(Exception):
        rate_limited = True

    code = run(env, client_factory=lambda: NullClient(Limited("HTTP Error 429")))
    assert code == EXIT_BLOCKED and db.list_runs()[0]["note"].startswith("Backoff")


def test_unexpected_error_is_exit_1_and_logged_in_run(env):
    def boom():
        raise RuntimeError("kaputt")

    assert run(env, client_factory=boom) == EXIT_FAILED
    r = env[1].list_runs()[0]
    assert r["errors"] == 1 and "kaputt" in r["note"] and r["finished"]


def test_paused_queue_is_not_loaded(env):
    settings, db = env
    db.upsert_video({"id": "queuedAAAA1", "title": "t"})
    db.enqueue(["queuedAAAA1"])
    db.set_state("queue_paused", "1")
    assert run(env) == EXIT_OK
    assert db.get_video("queuedAAAA1")["status"] == "queued"
    assert "pausiert" in db.list_runs()[0]["note"]


def test_busy_returns_4_without_touching_locks(env):
    class Held:
        released = False

        def release(self):
            Held.released = True

    assert run(env, run_lock=lambda: None) == EXIT_BUSY
    assert run(env, run_lock=Held, watchlist_lock=lambda: None) == EXIT_BUSY
    assert Held.released and env[1].list_runs() == []
