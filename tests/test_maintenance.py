import io
import sqlite3
import subprocess
from datetime import datetime
from types import SimpleNamespace

import pytest

from app.core import binaries, config, maintenance, potoken, status
from app.core.db import Database

# pre-v0.2.0 behaviour tests assert the German texts (pins the de catalog)
pytestmark = pytest.mark.usefixtures("german_messages")

# --------------------------------------------------------------------------- pip update


@pytest.fixture(autouse=True)
def _in_venv(monkeypatch):
    monkeypatch.setattr(maintenance, "in_venv", lambda: True)


class HangingProc:
    """Pipe blocks until kill() is called (like a pip that hangs)."""

    def __init__(self):
        import os

        r, w = os.pipe()
        self._w = os.fdopen(w, "w")
        self.stdout = os.fdopen(r, "r")
        self.killed = False

    def kill(self):
        self.killed = True
        self._w.close()

    def wait(self, timeout=None):
        return -9


class FakeProc:
    def __init__(self, lines, code=0):
        self.stdout = io.StringIO("".join(f"{line}\n" for line in lines))
        self.code = code

    def wait(self, timeout=None):
        return self.code


def test_update_command_uses_venv_python(tmp_path):
    pyw = tmp_path / "pythonw.exe"
    py = tmp_path / "python.exe"
    pyw.write_text("")
    py.write_text("")
    cmd = maintenance.update_command(str(pyw))
    assert cmd == [
        str(py),
        "-m",
        "pip",
        "install",
        "-U",
        "yt-dlp[default,curl-cffi]",
        "bgutil-ytdlp-pot-provider",
    ]


def test_run_update_streams_and_reports_change():
    seen, cmds = [], []
    versions = iter([{"ytdlp": "1", "plugin": "1"}, {"ytdlp": "2", "plugin": "1"}])

    def popen(cmd):
        cmds.append(cmd)
        return FakeProc(["Collecting yt-dlp", "", "Successfully installed yt-dlp-2"])

    res = maintenance.run_update(seen.append, popen=popen, versions=lambda: next(versions))
    assert res["ok"] and res["changed"] and res["ytdlp"] == "2" and res["plugin"] == "1"
    assert seen[0] == "> pip install -U yt-dlp[default,curl-cffi] bgutil-ytdlp-pot-provider"
    assert "Successfully installed yt-dlp-2" in seen and "Neustart" in res["output"]
    assert cmds[0][1:3] == ["-m", "pip"]


def test_run_update_timeout_kills_hanging_process():
    same = {"ytdlp": "1", "plugin": "1"}
    proc = HangingProc()
    res = maintenance.run_update(popen=lambda c: proc, versions=lambda: same, timeout_s=0.2)
    assert proc.killed and res["ok"] is False and "Zeitüberschreitung" in res["error"]


def test_run_update_refuses_outside_venv():
    called = []
    res = maintenance.run_update(
        popen=lambda c: called.append(c), venv_check=lambda: False, versions=lambda: {}
    )
    assert res["ok"] is False and "venv" in res["error"] and not called


def test_run_update_unchanged_and_failure():
    same = {"ytdlp": "1", "plugin": "1"}
    res = maintenance.run_update(
        popen=lambda c: FakeProc(["Requirement already satisfied"]), versions=lambda: same
    )
    assert res["ok"] and not res["changed"]
    res = maintenance.run_update(popen=lambda c: FakeProc(["ERROR"], 1), versions=lambda: same)
    assert res["ok"] is False and "Code 1" in res["error"] and "ERROR" in res["output"]

    def broken(cmd):
        raise OSError("kein pip")

    assert maintenance.run_update(popen=broken, versions=lambda: same)["ok"] is False


def test_check_updates_pypi():
    urls = []

    def fetch(url):
        urls.append(url)
        return {"info": {"version": "2026.11.14" if "yt-dlp" in url else "1.3.0"}}

    res = maintenance.check_updates(
        fetch=fetch, installed={"ytdlp": "2026.11.2", "plugin": "1.3.0"}
    )
    assert res["ok"] and res["available"]
    assert res["packages"]["ytdlp"]["newer"] and not res["packages"]["plugin"]["newer"]
    assert all(u.startswith("https://pypi.org/pypi/") for u in urls)
    assert not any("youtube" in u for u in urls)

    def offline(url):
        raise OSError("offline")

    res = maintenance.check_updates(fetch=offline, installed={})
    assert res["ok"] is False and "fehlgeschlagen" in res["error"]


def test_is_newer():
    assert maintenance.is_newer("2026.11.14", "2026.11.2")
    assert not maintenance.is_newer("2026.11.2", "2026.11.14")
    assert maintenance.is_newer("1.0", None)
    assert not maintenance.is_newer(None, "1.0")


def test_update_check_due_once_per_day():
    now = datetime(2026, 11, 16, 9, 0).astimezone()
    assert maintenance.update_check_due(None, now)
    assert maintenance.update_check_due("garbage", now)
    assert not maintenance.update_check_due(now.replace(hour=1).isoformat(), now)
    assert maintenance.update_check_due(now.replace(day=15, hour=23).isoformat(), now)


def test_backup_database(tmp_path):
    src = tmp_path / "src.db"
    with Database(src) as db:
        db.set_state("x", "1")
        now = datetime(2026, 11, 16, 9, 30, 5)
        a = maintenance.backup_database(src, tmp_path / "bk", now=now)
        b = maintenance.backup_database(src, tmp_path / "bk", now=now)
    assert a.name == "hcloader-20261116-093005.db" and b.name == "hcloader-20261116-093005-1.db"
    con = sqlite3.connect(a)
    try:
        assert con.execute("SELECT value FROM state WHERE key='x'").fetchone() == ("1",)
    finally:
        con.close()
    assert maintenance.last_backup(tmp_path / "bk")
    assert maintenance.last_backup(tmp_path / "none") is None


def test_versions_info_shape(tmp_path):
    with Database(tmp_path / "x.db") as db:
        info = maintenance.versions_info(
            db_path=tmp_path / "x.db",
            db_entries=3,
            last_update_check=None,
            status={"yt_dlp_version": "1", "bgutil_version": "2", "deno_version": None},
        )
        assert db
    assert info["ytdlp"] == "1" and info["plugin"] == "2" and info["deno"] is None
    assert info["db_size_mb"] >= 0 and info["data_dir"] == str(config.app_home())


# --------------------------------------------------------------------------- PO token


@pytest.fixture
def provider(tmp_path, monkeypatch):
    """A fake bin/ with deno and the provider tree."""
    monkeypatch.setenv("HCLOADER_BIN_DIR", str(tmp_path / "bin"))
    server = tmp_path / "bin" / "bgutil-pot-provider" / "server"
    (server / "src").mkdir(parents=True)
    (server / "node_modules").mkdir()
    (server / "src" / "generate_once.ts").write_text("")
    monkeypatch.setattr(binaries, "deno_version", lambda: "2.5.4")
    monkeypatch.setattr(
        binaries, "package_version", lambda d: "2.0.2" if "bgutil" in d else "2026.11.2"
    )
    return server


def test_probe_off():
    assert potoken.probe("off", 4416)["state"] == "inactive"


def test_probe_script_runs_generate_once_version(provider):
    calls = []

    def run(cmd):
        calls.append(cmd)
        return subprocess.CompletedProcess(cmd, 0, "1.2.3\n", "")

    res = potoken.probe("script", 4416, run=run)
    assert res["ok"] and res["state"] == "active" and "1.2.3" in res["detail"]
    cmd = calls[0]
    assert cmd[1:4] == ["run", "--allow-env", "--allow-net"]
    assert cmd[-2].endswith("generate_once.ts") and cmd[-1] == "--version"
    assert not any("youtube" in c for c in cmd)


def test_probe_script_errors(provider, monkeypatch):
    res = potoken.probe("script", 4416, run=lambda c: subprocess.CompletedProcess(c, 1, "", "boom"))
    assert res["state"] == "error" and "Code 1" in res["detail"] and "boom" in res["detail"]

    def timeout(c):
        raise subprocess.TimeoutExpired(c, 15)

    assert "Timeout" in potoken.probe("script", 4416, run=timeout)["detail"]
    monkeypatch.setattr(binaries, "deno_version", lambda: "2.1.0")
    assert "zu alt" in potoken.probe("script", 4416)["detail"]
    monkeypatch.setattr(binaries, "deno_version", lambda: None)
    assert "Deno nicht gefunden" in potoken.probe("script", 4416)["detail"]


def test_probe_http_ping(provider):
    pinged = []
    ok = potoken.probe("http", 4500, ping=lambda p: pinged.append(p) or True)
    assert ok["ok"] and pinged == [4500]
    bad = potoken.probe("http", 4500, ping=lambda p: False)
    assert bad["state"] == "error" and "4500" in bad["detail"]


def test_probe_without_plugin(provider, monkeypatch):
    monkeypatch.setattr(binaries, "package_version", lambda d: None)
    assert "nicht installiert" in potoken.probe("script", 4416)["detail"]


def test_quick_state(provider, monkeypatch):
    assert potoken.quick_state("off")["state"] == "inactive"
    assert potoken.quick_state("script")["state"] == "active"
    assert potoken.quick_state("http", http_running=False)["state"] == "error"
    assert potoken.quick_state("http", http_running=True)["state"] == "active"
    monkeypatch.setattr(binaries, "deno_version", lambda: None)
    assert "Deno fehlt" in potoken.quick_state("script")["detail"]


# --------------------------------------------------------------------------- status


def test_next_check():
    s = config.defaults()
    assert status.next_check(s) is None
    s.schedule.task_scheduler_enabled = True
    now = datetime(2026, 11, 16, 9, 0).astimezone()
    assert "T03:00:00" in status.next_check(s, now=now)
    soon = now.replace(hour=10)
    assert status.next_check(s, in_app_next=soon, now=now) == soon.isoformat(timespec="seconds")
    s.schedule.in_app_check = False
    assert "T03:00:00" in status.next_check(s, in_app_next=soon, now=now)


def test_build_status_uses_given_binaries(db):
    from app.core.throttle import Throttle

    s = config.defaults()
    st = status.build_status(
        s,
        Throttle(db, s.throttle),
        db,
        po_token={"state": "active", "mode": "script", "detail": "ok"},
        bin_status={
            "yt_dlp_version": "2026.11.2",
            "bgutil_version": "2.0.2",
            "deno_ok": True,
            "deno_version": "2.5.4",
            "ffmpeg_ok": False,
            "ffmpeg_version": None,
        },
    )
    assert st["ytdlp_version"] == "2026.11.2" and st["deno_ok"] and not st["ffmpeg_ok"]
    assert st["counters"] == {"downloads_run": 0, "downloads_day": 0, "searches_hour": 0}
    assert SimpleNamespace(**st).queue_paused is False


# --------------------------------------------------------------------------- n6: partial files


def test_cleanup_stale_partials(tmp_path):
    import os
    import time

    tmp = tmp_path / ".tmp"
    tmp.mkdir()
    old = time.time() - 8 * 86400
    names = {
        "aaaaaaaaaaa.webm.part": old,  # old, not queued -> deleted
        "bbbbbbbbbbb.f251.webm.part": old,  # old but still queued -> kept
        "ccccccccccc.webm.ytdl": old,  # old yt-dlp state file -> deleted
        "ddddddddddd.webm.part-Frag3": old,  # old fragment -> deleted
        "eeeeeeeeeee.webm.part": time.time() - 3600,  # recent -> kept
        "fffffffffff.mp3": old,  # not a partial file -> kept
    }
    for name, mtime in names.items():
        p = tmp / name
        p.write_text("x")
        os.utime(p, (mtime, mtime))
    removed = maintenance.cleanup_stale_partials(tmp, {"bbbbbbbbbbb"})
    assert removed == 3
    assert sorted(p.name for p in tmp.iterdir()) == [
        "bbbbbbbbbbb.f251.webm.part",
        "eeeeeeeeeee.webm.part",
        "fffffffffff.mp3",
    ]
    assert maintenance.cleanup_stale_partials(tmp_path / "missing", set()) == 0
