"""Headless run: exit codes and edge cases (the full flow is in test_headless_integration)."""

from __future__ import annotations

import pytest

from app import headless
from app.core import config
from app.core.db import Database
from app.core.throttle import Throttle
from app.exitcodes import EXIT_BLOCKED, EXIT_BUSY, EXIT_FAILED, EXIT_OK, EXIT_USAGE
from app.main import main

# pre-v0.2.0 behaviour tests assert the German texts (pins the de catalog)
pytestmark = pytest.mark.usefixtures("german_messages")


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


def test_watchlist_busy_note_names_the_gui_check(env, caplog):
    """m2: the GUI's in-app check holds the watchlist lock -> exit 4 with a log note."""
    import logging

    class Held:
        def release(self):
            pass

    with caplog.at_level(logging.ERROR, logger="hcloader.headless"):
        assert run(env, run_lock=Held, watchlist_lock=lambda: None) == EXIT_BUSY
    assert "In-App-Prüfung" in caplog.text


class _Lock:
    def release(self):
        pass


def test_http_mode_uses_the_po_token_server_of_the_running_gui(env, monkeypatch):
    """m1: GUI open + /ping answers on the configured port -> used, never started/stopped."""
    settings, db = env
    settings.network.po_token_mode = "http"
    settings.network.po_token_port = 4499
    db.add_source("channel", "A", "https://www.youtube.com/@a")
    pings = []

    def ping(port):
        pings.append(port)
        return True

    from app.core import binaries

    def no_start(self):  # a second server must never be started
        raise AssertionError("PotServer.start() aufgerufen")

    monkeypatch.setattr(binaries.PotServer, "start", no_start)
    monkeypatch.setattr(binaries.PotServer, "stop", no_start)
    code = run(env, run_lock=_Lock, watchlist_lock=_Lock, gui_probe=lambda: True, pot_ping=ping)
    assert code == EXIT_OK and pings and set(pings) == {4499}
    r = db.list_runs()[0]
    assert r["errors"] == 0 and db.get_source(1)["last_checked"]


def test_http_mode_without_gui_or_answer_keeps_exit_1(env):
    settings, db = env
    settings.network.po_token_mode = "http"
    db.add_source("channel", "A", "https://www.youtube.com/@a")
    for gui, answers in ((False, True), (True, False)):
        code = run(
            env,
            run_lock=_Lock,
            watchlist_lock=_Lock,
            gui_probe=lambda g=gui: g,
            pot_ping=lambda port, a=answers: a,
            watchdog=None if answers else FakeWatchdog(ok=False),
            pot_wait=0,
        )
        assert code == EXIT_FAILED and "PO-Token" in db.list_runs()[0]["note"]


# --------------------------------------------------------------------------- Review 7a/8 m5


def _sc_throttle(settings, db):
    return Throttle(
        db,
        lambda: settings.throttle,
        platform_settings={"soundcloud": lambda: settings.soundcloud},
    )


def test_disabled_soundcloud_backoff_is_not_exit_blocked(env):
    settings, db = env
    settings.soundcloud.enabled = False
    db.add_source("channel", "A", "https://www.youtube.com/@a")
    db.add_source("channel", "SC", "https://soundcloud.com/a", platform="soundcloud")
    th = _sc_throttle(settings, db)
    th.platform("soundcloud").trigger_backoff("HTTP Error 429")
    assert run(env, throttle=th) == EXIT_OK
    # enabled again: the SoundCloud source is active, its backoff counts
    settings.soundcloud.enabled = True
    assert run(env, throttle=th) == EXIT_BLOCKED


def test_successful_soundcloud_check_resets_its_backoff_level(env):
    settings, db = env
    db.add_source("channel", "SC", "https://soundcloud.com/a", platform="soundcloud")
    th = _sc_throttle(settings, db)
    sc_th = th.platform("soundcloud")
    sc_th.trigger_backoff("HTTP Error 429")
    sc_th.clear_backoff_manual()
    assert sc_th.backoff_level() == 1
    assert run(env, throttle=th) == EXIT_OK
    assert sc_th.backoff_level() == 0


@pytest.mark.parametrize("lang", ["en", "zh-CN", "ru", "de"])
def test_backoff_note_is_not_duplicated_in_any_language(env, monkeypatch, lang):
    """Review v0.2.0 m2: the dedup uses the block code, not the (translated) note text."""
    from app.core import i18n, watchlist

    settings, db = env
    monkeypatch.setattr(i18n, "_active", lang)
    db.upsert_video({"id": "vidAAAAAAA1", "title": "Mix", "status": "queued"})
    db.enqueue(["vidAAAAAAA1"])
    throttle = Throttle(db, settings.throttle)
    monkeypatch.setattr(watchlist, "check_all", lambda **kw: watchlist.WatchlistResult(checked=1))

    class FakeQueue:
        paused = False

        def __init__(self, *a, **kw):
            self.last_session = {}

        def run_pending(self):
            throttle.trigger_backoff("429")  # 429 during the download
            code, msg = queue_block()
            self.last_session = {"downloaded": 0, "errors": 0, "note": msg, "note_code": code}

        def blocked(self):
            return queue_block()

    def queue_block():
        until = throttle.backoff_until()
        return "backoff", i18n.tr("queue.backoff_rest", prefix="", until=until.isoformat())

    monkeypatch.setattr(headless, "DownloadQueue", FakeQueue)
    code = headless.run_watchlist(
        settings=settings,
        db=db,
        throttle=throttle,
        configure_logging=False,
        client_factory=NullClient,
        watchdog=FakeWatchdog(),
    )
    assert code == EXIT_BLOCKED
    note = db.list_runs()[0]["note"]
    assert note.count("; ") == 0, note  # exactly one backoff note
