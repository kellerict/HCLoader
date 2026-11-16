import pytest

from app import main as app_main
from app.core import ytclient
from app.core.ytclient import DownloadResult


def test_headless_stub(capsys):
    assert app_main.main(["--headless", "--run-watchlist"]) == 0
    assert "Phase 4" in capsys.readouterr().out


def test_headless_without_task(capsys):
    assert app_main.main(["--headless"]) == app_main.EXIT_USAGE


def test_no_args_starts_gui(monkeypatch):
    monkeypatch.setattr(app_main, "run_gui", lambda: 0)
    assert app_main.main([]) == 0


def test_smoke_runs_one_download(monkeypatch, capsys, tmp_path):
    calls = []

    class FakeClient:
        def __init__(self, settings_provider, db, throttle):
            pass

        def download(self, url, *, on_progress=None, cancel_event=None):
            calls.append(url)
            on_progress({"phase": "laden", "percent": 50.0})
            return DownloadResult("abc", "done", tmp_path / "x.mp3", "T")

        def close(self):
            pass

    monkeypatch.setattr(ytclient, "YtClient", FakeClient)
    assert app_main.main(["--smoke", "https://youtu.be/abcdefghijk"]) == 0
    out = capsys.readouterr().out
    assert calls == ["https://youtu.be/abcdefghijk"]
    assert "Ergebnis: done" in out and "x.mp3" in out


@pytest.mark.parametrize(
    ("result", "code"),
    [
        (DownloadResult("a", "skipped", skipped=True), 0),
        (DownloadResult("a", "failed", error="e"), 1),
    ],
)
def test_smoke_exit_codes(monkeypatch, result, code):
    class FakeClient:
        def __init__(self, *a):
            pass

        def download(self, url, **kw):
            return result

        def close(self):
            pass

    monkeypatch.setattr(ytclient, "YtClient", FakeClient)
    assert app_main.run_smoke("u") == code


def test_smoke_blocked_by_throttle(monkeypatch, capsys):
    from datetime import UTC, datetime

    from app.core.throttle import BackoffActive

    class FakeClient:
        def __init__(self, *a):
            pass

        def download(self, url, **kw):
            raise BackoffActive(datetime.now(UTC))

        def close(self):
            pass

    monkeypatch.setattr(ytclient, "YtClient", FakeClient)
    assert app_main.run_smoke("u") == app_main.EXIT_BLOCKED
    assert "GESPERRT" in capsys.readouterr().err


def test_smoke_finish_run_resets_backoff_on_done(monkeypatch, tmp_path):
    from app.core.throttle import Throttle

    resets = []
    monkeypatch.setattr(Throttle, "reset_backoff", lambda self: resets.append(1))

    class FakeClient:
        def __init__(self, *a):
            pass

        def download(self, url, **kw):
            return DownloadResult("abc", "done", tmp_path / "x.mp3")

        def close(self):
            pass

    monkeypatch.setattr(ytclient, "YtClient", FakeClient)
    assert app_main.run_smoke("u") == 0 and resets == [1]
    resets.clear()
    FakeClient.download = lambda self, url, **kw: DownloadResult("a", "skipped", skipped=True)
    app_main.run_smoke("u")
    assert resets == []  # a skip is no successful network run


def test_smoke_and_headless_refuse_when_run_lock_held(monkeypatch, capsys):
    from app.core import locks

    held = locks.acquire_run_lock()
    try:
        assert app_main.run_smoke("u") == app_main.EXIT_BUSY
        assert app_main.main(["--headless", "--run-watchlist"]) == app_main.EXIT_BUSY
        assert "anderer Download-Lauf" in capsys.readouterr().err
    finally:
        held.release()
    assert app_main.main(["--headless", "--run-watchlist"]) == 0


def test_second_gui_instance_exits(monkeypatch, capsys):
    from app.core import locks

    started = []
    monkeypatch.setattr(app_main, "run_gui", lambda: started.append(1) or 0)
    first = locks.acquire_single_instance()
    try:
        assert app_main.main([]) == 0 and started == []
    finally:
        first.release()
    assert app_main.main([]) == 0 and started == [1]


def test_gui_start_resets_interrupted_downloads(monkeypatch):
    from app.core import config
    from app.core.db import Database

    with Database(config.db_path()) as db:
        db.upsert_video({"id": "x", "status": "downloading"})
    monkeypatch.setattr(app_main, "run_gui", lambda: 0)
    app_main.main([])
    with Database(config.db_path()) as db:
        row = db.get_video("x")
    assert row["status"] == "failed" and row["error"] == "Unterbrochen"
