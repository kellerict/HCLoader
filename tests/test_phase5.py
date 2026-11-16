"""Phase 5 backend: sidecar, log view/history, run event, backup retention, library API,
update against another interpreter, schtasks next run from XML."""

import json
import logging
import os
import subprocess
import time
from datetime import datetime
from pathlib import Path

from test_api import (
    env,  # noqa: F401  (fixture)
    flush,
)
from test_library import VID, VID2, add_done, tagged_item
from test_scheduler import FakeSchtasks as TaskStore
from test_scheduler import make as make_sched
from test_tagging import make_mp3, needs_ffmpeg

from app.core import logging_setup, logview, maintenance, sidecar
from app.core.db import Database
from app.core.tagging import Chapter

# ------------------------------------------------------------------ sidecar


def test_sidecar_roundtrip_has_no_secrets(tmp_path):
    meta = {
        "id": VID,
        "title": "T",
        "channel_id": "UC1",
        "channel_name": "C",
        "upload_date": "20261003",
        "duration": 7200,
        "url": "https://www.youtube.com/watch?v=" + VID,
        "thumbnail": "https://i.ytimg.com/x.jpg",
        "cookies": "SECRET",
        "http_headers": {"Cookie": "SECRET"},
    }
    data = sidecar.build(
        meta, chapters=[Chapter(0, "A", 60)], description="x" * 5000, genre="Hardcore"
    )
    assert len(data["description"]) == sidecar.DESCRIPTION_MAX
    p = sidecar.write(VID, data)
    assert p == sidecar.sidecar_path(VID) and p.is_file()
    assert "SECRET" not in p.read_text(encoding="utf-8")
    back = sidecar.read(VID)
    assert back["genre"] == "Hardcore" and sidecar.chapters_of(back)[0].end == 60
    sidecar.delete(VID)
    assert sidecar.read(VID) is None
    assert sidecar.write("../evil", data) is None  # invalid id: logged, not raised
    assert sidecar.read("../evil") is None


# ------------------------------------------------------------------ log view


LINES = [
    {"ts": "t1", "level": "debug", "msg": "Alpha"},
    {"ts": "t2", "level": "info", "msg": "Beta"},
    {"ts": "t3", "level": "ok", "msg": "Gamma fertig"},
    {"ts": "t4", "level": "warn", "msg": "Delta"},
    {"ts": "t5", "level": "error", "msg": "Epsilon kaputt"},
]


def test_filter_lines():
    f = logview.filter_lines
    assert f(LINES) == LINES and f(LINES, None) == LINES
    assert [x["msg"] for x in f(LINES, {"level": "warn"})] == ["Delta", "Epsilon kaputt"]
    assert [x["msg"] for x in f(LINES, {"level": "info"})][0] == "Beta"
    assert [x["level"] for x in f(LINES, {"levels": ["ok", "error"]})] == ["ok", "error"]
    assert [x["msg"] for x in f(LINES, {"search": "FERTIG"})] == ["Gamma fertig"]
    assert [x["msg"] for x in f(LINES, {"limit": 2})] == ["Delta", "Epsilon kaputt"]
    assert f(LINES, {"limit": "x"}) == LINES  # bad value ignored
    assert f(LINES, {"level": "bogus"}) == LINES


def test_run_info_duration_and_kind():
    row = {
        "id": 3,
        "kind": "smoke",
        "started": "2026-11-16T10:00:00+00:00",
        "finished": "2026-11-16T10:02:30+00:00",
        "found": None,
        "note": None,
    }
    r = logview.run_info(row)
    assert r["duration"] == 150 and r["kind"] == "manual" and r["found"] == 0 and r["note"] == ""
    assert logview.run_info({**row, "finished": None})["duration"] is None
    assert logview.run_info({**row, "started": "garbage"})["duration"] is None


def test_history_is_read_from_log_file_after_restart(tmp_path):
    log_dir = tmp_path / "logs"
    log_dir.mkdir()
    (log_dir / "hcloader.log").write_text(
        "2026-11-16 10:00:00,123 INFO    hc.test: Erste Zeile\n"
        "Traceback (most recent call last):\n"
        "2026-11-16 10:00:05,500 WARNING app.core.x: Zweite http://u:p@h/ Zeile\n"
        "kaputte Zeile\n"
        "2026-11-16 10:00:06,000 ERROR   app.y: Dritte\n",
        encoding="utf-8",
    )
    hist = logging_setup.read_history(log_dir / "hcloader.log", 2)
    assert [h["message"] for h in hist][0].startswith("Zweite") and "u:p" not in hist[0]["message"]
    assert hist[1]["level"] == "ERROR" and hist[1]["logger"] == "app.y"
    assert datetime.fromtimestamp(hist[1]["ts"]).strftime("%H:%M:%S") == "10:00:06"
    assert logging_setup.read_history(tmp_path / "nope.log") == []

    handler = logging_setup.live_handler()
    before = list(handler.backlog)
    logging_setup._history_loaded = False
    try:
        handler.backlog.clear()
        logging_setup.setup_logging("INFO", log_dir, history=10)
        msgs = [e["message"] for e in handler.backlog]
        assert msgs[:3] == ["Erste Zeile", "Zweite http://***@h/ Zeile", "Dritte"]
        logging_setup.setup_logging("INFO", log_dir, history=10)  # only once per process
        assert [e["message"] for e in handler.backlog].count("Erste Zeile") == 1
    finally:
        handler.backlog.clear()
        handler.backlog.extend(before)
        for x in list(logging.getLogger().handlers):
            if getattr(x, "_hcloader_file", False):
                logging.getLogger().removeHandler(x)
                x.close()
        logging.getLogger().removeHandler(handler)


# ------------------------------------------------------------------ DB: run listener


def test_run_listener_gets_finished_row(tmp_path):
    seen = []
    with Database(tmp_path / "x.db") as db:
        db.add_run_listener(seen.append)
        db.add_run_listener(lambda row: 1 / 0)  # a broken listener must not break the run
        rid = db.start_run("watchlist")
        assert seen == []
        db.finish_run(rid, found=2, downloaded=1, errors=0, note="n")
    assert seen[0]["id"] == rid and seen[0]["found"] == 2 and seen[0]["finished"]


# ------------------------------------------------------------------ backup retention


def test_backup_keeps_only_newest_n(tmp_path):
    src = tmp_path / "src.db"
    dest = tmp_path / "bk"
    dest.mkdir()
    with Database(src):
        for i in range(8):
            f = dest / f"hcloader-2026010{i}-000000.db"
            f.write_bytes(b"x")
            os.utime(f, (1_700_000_000 + i * 100, 1_700_000_000 + i * 100))
        (dest / "other.txt").write_text("keep")
        new = maintenance.backup_database(src, dest, now=datetime(2026, 11, 16, 9, 0, 0), keep=5)
    names = sorted(p.name for p in dest.glob("hcloader-*.db"))
    assert len(names) == 5 and new.name in names
    assert names[:4] == [f"hcloader-2026010{i}-000000.db" for i in (4, 5, 6, 7)]  # newest old ones
    assert (dest / "other.txt").exists()
    assert maintenance.BACKUP_KEEP == 10


def test_prune_backups_edge_cases(tmp_path):
    for i in range(3):
        name = f"hcloader-20260101-00000{i}.db"
        (tmp_path / name).write_bytes(b"x")
        os.utime(tmp_path / name, (1000 + i, 1000 + i))
    assert maintenance.prune_backups(tmp_path, 0) == []  # 0 = unlimited
    assert maintenance.prune_backups(tmp_path / "missing", 2) == []
    assert len(maintenance.prune_backups(tmp_path, 1)) == 2
    assert [p.name for p in tmp_path.glob("hcloader-*.db")] == ["hcloader-20260101-000002.db"]


# ------------------------------------------------------------------ run_update with another python


class FakeProc:
    def __init__(self, lines=("ok",), code=0):
        import io

        self.stdout = io.StringIO("".join(f"{x}\n" for x in lines))
        self.code = code

    def wait(self, timeout=None):
        return self.code


def test_run_update_uses_given_interpreter_and_its_versions(monkeypatch, tmp_path):
    exe = tmp_path / "other" / "python"
    exe.parent.mkdir()
    exe.write_text("")
    probes = []
    answers = iter(
        [
            {"venv": True, "ytdlp": "2024.1.1", "plugin": "1"},  # venv check
            {"venv": True, "ytdlp": "2024.1.1", "plugin": "1"},  # before
            {"venv": True, "ytdlp": "2026.9.9", "plugin": "1"},  # after
        ]
    )
    monkeypatch.setattr(
        maintenance, "probe_python", lambda e: probes.append(str(e)) or next(answers)
    )
    cmds = []
    res = maintenance.run_update(popen=lambda c: cmds.append(c) or FakeProc(), executable=str(exe))
    assert cmds[0][:4] == [str(exe), "-m", "pip", "install"]
    assert res["ok"] and res["changed"] and res["ytdlp"] == "2026.9.9"
    assert probes == [str(exe)] * 3


def test_run_update_refuses_non_venv_interpreter(monkeypatch, tmp_path):
    monkeypatch.setattr(maintenance, "probe_python", lambda e: {"venv": False})
    called = []
    res = maintenance.run_update(popen=called.append, executable=str(tmp_path / "python"))
    assert res["ok"] is False and "venv" in res["error"] and not called


def test_probe_python_real_interpreter():
    import sys

    data = maintenance.probe_python(sys.executable)
    assert data is not None and set(data) == {"venv", "ytdlp", "plugin"}
    assert maintenance.probe_python("/nonexistent/python") is None


# ------------------------------------------------------------------ schtasks next run (n7)


def test_next_run_comes_from_xml_trigger_not_locale_date():
    class Store(TaskStore):
        def __call__(self, args):
            args = list(args)
            if args[1] == "/Query" and "/XML" in args and self.registered:
                self.calls.append(args)
                xml = "<Task><StartBoundary>2026-11-01T04:15:00</StartBoundary></Task>"
                return subprocess.CompletedProcess(args, 0, xml.encode(), b"")
            return super().__call__(args)

    sched, fake = make_sched(Store(next_run="03/12/2026 10:00:00"))  # ambiguous CSV date
    sched.create("04:15")
    st = sched.query()
    assert st.registered and st.next_run and "T04:15:00" in st.next_run
    assert datetime.fromisoformat(st.next_run) > datetime.now().astimezone()
    # without XML (unreadable) the CSV date is the fallback
    sched2, _ = make_sched(TaskStore(next_run="17.11.2026 03:00:00"))
    sched2.create("03:00")
    assert sched2.query().next_run.startswith("2026-11-17T03:00:00")


# ------------------------------------------------------------------ API


@needs_ffmpeg
def test_api_library_open_retag_delete(env, tmp_path):  # noqa: F811
    revealed = []
    a = env.make(revealer=revealed.append)
    root = a._cfg.target_dir_path()
    f = tagged_item(tmp_path, root, a._db)
    lib = a.get_library({"genre": "Unsortiert"})
    assert [i["id"] for i in lib] == [VID] and a.get_library({"genre": "Hardstyle"}) == []
    assert a.get_library("junk")[0]["id"] == VID  # non-dict filter ignored
    assert a.open_folder(VID) == {"ok": True} and revealed == [f]
    assert a.open_folder("nope")["ok"] is False
    res = a.retag(VID)
    assert res["ok"] and res["moved"] and res["genre"] == "Hardcore"
    flush(a)
    ev = env.window.events_of("video")
    assert ev[-1] == {"id": VID, "status": "done", "genre": "Hardcore"}
    new = Path(res["path"])
    res = a.delete_library_item(VID)
    assert res["ok"] and sorted(res["deleted"]) == sorted([new.name, new.with_suffix(".cue").name])
    flush(a)
    assert a._db.get_video(VID)["status"] == "ignored" and not new.exists()
    assert {"id": VID, "status": "ignored", "genre": None} in env.window.events_of("video")
    assert a.delete_library_item(VID)["ok"] is False
    assert a.retag(VID)["ok"] is False


@needs_ffmpeg
def test_api_delete_flag_keeps_file(env, tmp_path):  # noqa: F811
    a = env.make()
    f = make_mp3(tmp_path / "x.mp3")
    add_done(a._db, VID2, f)
    assert a.delete_library_item(VID2, False)["ok"] and f.exists()


def test_api_log_filters_and_run_event(env):  # noqa: F811
    a = env.make()
    root = logging.getLogger()
    root.addHandler(logging_setup.live_handler())
    old = root.level
    root.setLevel(logging.INFO)
    try:
        lg = logging.getLogger("hcloader.test")
        lg.info("Info-Zeile")
        lg.error("Fehler-Zeile")
    finally:
        root.removeHandler(logging_setup.live_handler())
        root.setLevel(old)
    log = a.get_log({"level": "error", "search": "zeile", "limit": 5})
    assert [x["msg"] for x in log["lines"]] == ["Fehler-Zeile"]
    rid = a._db.start_run("watchlist")
    time.sleep(0.01)
    a._db.finish_run(rid, found=4, downloaded=0, errors=1, note="x")
    flush(a)
    ev = env.window.events_of("run")
    assert ev and ev[-1]["id"] == rid and ev[-1]["found"] == 4 and ev[-1]["duration"] is not None
    assert ev[-1]["kind"] == "watchlist" and set(ev[-1]) == set(a.get_log()["runs"][0])
    rid2 = a._db.start_run("headless")
    a._db.finish_run(rid2)
    assert [r["kind"] for r in a.get_log({"kind": "watchlist"})["runs"]] == ["watchlist"]
    assert len(a.get_log({"runs_limit": 1})["runs"]) == 1
    json.dumps(a.get_log())
