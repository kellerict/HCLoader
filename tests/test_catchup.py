"""v0.10.1 automatic catch-up passes for existing libraries (docs/decisions.md «Automatic
catch-up passes»): festival assignment for items downloaded before v0.3.0, tracklists,
loudness and fingerprints run by themselves after the GUI start - offline, incremental,
cancellable, never overwriting manual values. No network (yt-dlp mocked)."""

from __future__ import annotations

import shutil
import threading
from pathlib import Path

import pytest
from test_api import env  # noqa: F401  (fixture)
from test_integration_queue import world  # noqa: F401  (fixture)

from app.core import binaries, library, series, tracklist
from app.core.config import Settings
from app.worker import CatchUp, CatchUpStep, EventBus, wait_while

USER_CASES = [
    ("adaroQlimax", "Adaro | Qlimax 2024", "Qlimax 2024"),
    ("adaroHardBs", "Adaro Live At Hard Bass 2018", "Hard Bass 2018"),
    ("randAdaroDq", "Ran-D & Adaro | Defqon.1 2026", "Defqon.1 2026"),
]


@pytest.fixture
def settings(tmp_path):
    s = Settings()
    s.storage.target_dir = str(tmp_path / "music")
    return s


def add_done(db, vid, title, **kw):
    db.upsert_video(
        {
            "id": vid,
            "title": title,
            "channel_id": "UC1",
            "channel_name": "Some Channel",
            "upload_date": kw.pop("upload_date", "20240101"),
            "status": "new",
            **kw,
        }
    )
    db.set_status(vid, "done", file_path=f"/x/{vid}.mp3")


def edition_of(db, vid):
    row = db.get_video(vid)
    if not row or not row.get("edition_id"):
        return None
    return series.edition_map(db)[row["edition_id"]]["edition"]


def legacy_library(db):
    """Rows as a pre-v0.3.0 library has them: done, never examined by the detection."""
    series.sync_builtin(db)
    for vid, title, _ in USER_CASES:
        add_done(db, vid, title)
    add_done(db, "plainSet001", "Partyraiser liveset")


# =========================================================================== core: series


def test_migration_adds_festival_checks_and_cascades(db):
    add_done(db, "aaaaaaaaaaa", "x")
    db.execute(
        "INSERT INTO festival_checks(video_id, sig, checked) VALUES ('aaaaaaaaaaa', 's', 't')"
    )
    db.execute("DELETE FROM videos WHERE id='aaaaaaaaaaa'")
    assert db.query("SELECT * FROM festival_checks") == []


def test_auto_pass_assigns_legacy_library_once(db, settings):
    legacy_library(db)
    assert set(series.auto_pending(db, settings)) == {v for v, _, _ in USER_CASES} | {"plainSet001"}
    res = series.assign_pass(db, settings, scope="auto")
    assert res["ok"] and not res["cancelled"] and res["total"] == 4
    assert res["assigned"] == 3
    for vid, _, edition in USER_CASES:
        assert edition_of(db, vid) == edition
    assert db.get_state(series.K_AUTO_LAST)
    # incremental: nothing left (the set without a festival was examined and remembered)
    assert series.auto_pending(db, settings) == []
    assert series.assign_pass(db, settings, scope="auto")["total"] == 0
    # a new download that missed its detection is picked up at the next start
    add_done(db, "newDownload", "Sefa | Qlimax 2023")
    assert series.auto_pending(db, settings) == ["newDownload"]


def test_auto_pass_never_touches_manual_values_or_weakens_suggestions(db, settings):
    legacy_library(db)
    series.set_manual(db, "adaroQlimax", None)  # «no festival» decided by the user
    dq = db.query_one("SELECT id FROM series WHERE key='defqon1'")["id"]
    series.set_manual(db, "randAdaroDq", {"series_id": dq, "event_year": 2019})
    # a suggestion from the full description at download time (not in the sidecar any more)
    eid = series.ensure_edition(db, dq, 2020)
    db.execute(
        "UPDATE videos SET suggested_edition_id=?, festival_confidence=0.5 WHERE id=?",
        (eid, "plainSet001"),
    )
    pending = series.auto_pending(db, settings)
    assert "adaroQlimax" not in pending and "randAdaroDq" not in pending
    series.assign_pass(db, settings, scope="auto")
    assert edition_of(db, "adaroQlimax") is None
    assert db.get_video("adaroQlimax")["festival_manual"] == 1
    assert edition_of(db, "randAdaroDq") == "Defqon.1 2019"
    row = db.get_video("plainSet001")
    assert row["suggested_edition_id"] == eid and row["festival_confidence"] == 0.5
    assert edition_of(db, "adaroHardBs") == "Hard Bass 2018"


def test_new_series_list_or_settings_examine_unassigned_items_again(db, settings, tmp_path):
    add_done(db, "myRaveSet01", "Adaro @ Hardcore Garden Party 2024")
    series.assign_pass(db, settings, scope="auto")
    assert edition_of(db, "myRaveSet01") is None and series.auto_pending(db, settings) == []
    # app update: the shipped series list gains the festival
    data = series.DATA_FILE.read_text(encoding="utf-8")
    extra = (
        "\n  - key: hc-garden-party\n    name: Hardcore Garden Party\n    kind: festival\n"
        "    aliases: [Hardcore Garden Party]\n"
    )
    head, sep, tail = data.partition("\nseries:\n")
    new_file = tmp_path / "series.yaml"
    new_file.write_text(head + sep + extra.lstrip("\n") + tail, encoding="utf-8")
    assert series.sync_builtin(db, new_file) >= 1
    sig_file = series.DATA_FILE
    try:
        series.DATA_FILE = new_file
        assert series.auto_pending(db, settings) == ["myRaveSet01"]
        series.assign_pass(db, settings, scope="auto")
        assert edition_of(db, "myRaveSet01") == "Hardcore Garden Party 2024"
    finally:
        series.DATA_FILE = sig_file
    # a changed threshold is a new signature as well (only unassigned items are examined)
    add_done(db, "plainSet001", "Partyraiser liveset")
    series.assign_pass(db, settings, scope="auto")
    settings.festivals.min_confidence = 0.9
    assert series.auto_pending(db, settings) == ["plainSet001"]


def test_auto_pass_respects_detect_setting(db, settings):
    legacy_library(db)
    settings.festivals.detect = False
    assert series.auto_pending(db, settings) == []


def test_tracklist_unscanned_counts_never_read_items(db):
    add_done(db, "aaaaaaaaaaa", "a")
    add_done(db, "bbbbbbbbbbb", "b")
    assert tracklist.unscanned(db) == 2
    tracklist.index_pass(db, read=lambda v: {}, files_ok=False)
    assert tracklist.unscanned(db) == 0


# =========================================================================== worker: CatchUp


def _bus_events():
    bus = EventBus()
    seen: list[tuple[str, dict]] = []
    bus.subscribe(lambda t, d: seen.append((t, d)))
    return bus, seen


def test_catchup_runs_needed_steps_in_order_and_reports():
    bus, seen = _bus_events()
    ran: list[str] = []
    steps = [
        CatchUpStep("festivals", lambda: True, lambda c: ran.append("festivals"), lambda: None),
        CatchUpStep("tracklists", lambda: False, lambda c: ran.append("tracklists"), lambda: None),
        CatchUpStep("analysis", lambda: 1 / 0, lambda c: ran.append("analysis"), lambda: None),
        CatchUpStep("fingerprints", lambda: True, lambda c: ran.append("fp"), lambda: None),
    ]
    cu = CatchUp(bus, steps, delay=0)
    cu.start()
    cu.join(5)
    assert ran == ["festivals", "fp"]
    bus.flush(5)
    auto = [d for t, d in seen if t == "auto_pass"]
    assert auto == [
        {"phase": "step", "step": "festivals"},
        {"phase": "step", "step": "fingerprints"},
        {"phase": "end", "cancelled": False},
    ]
    cu.start()  # once per session
    cu.join(1)
    assert ran == ["festivals", "fp"]


def test_catchup_nothing_to_do_is_silent():
    bus, seen = _bus_events()
    cu = CatchUp(bus, [CatchUpStep("x", lambda: False, lambda c: None, lambda: None)], delay=0)
    cu.start()
    cu.join(5)
    bus.flush(5)
    assert seen == []


def test_catchup_cancel_stops_running_pass_and_the_rest():
    bus, seen = _bus_events()
    started, stop = threading.Event(), threading.Event()
    ran: list[str] = []

    def long_pass(cancel):
        started.set()
        wait_while(lambda: not stop.is_set(), cancel, 0.01)
        ran.append("first")

    steps = [
        CatchUpStep("festivals", lambda: True, long_pass, stop.set),
        CatchUpStep("tracklists", lambda: True, lambda c: ran.append("second"), lambda: None),
    ]
    cu = CatchUp(bus, steps, delay=0)
    cu.start()
    assert started.wait(5)
    assert cu.running() == "festivals"
    assert cu.cancel() is True
    cu.join(5)
    assert ran == ["first"] and stop.is_set() and cu.running() is None
    bus.flush(5)
    assert [d for t, d in seen if t == "auto_pass"][-1] == {"phase": "end", "cancelled": True}


def test_catchup_skip_only_stops_that_pass():
    bus, _ = _bus_events()
    started, stop = threading.Event(), threading.Event()
    ran: list[str] = []

    def long_pass(cancel):
        started.set()
        wait_while(lambda: not stop.is_set(), cancel, 0.01)
        ran.append("first")

    steps = [
        CatchUpStep("festivals", lambda: True, long_pass, stop.set),
        CatchUpStep("tracklists", lambda: True, lambda c: ran.append("second"), lambda: None),
    ]
    cu = CatchUp(bus, steps, delay=0)
    cu.start()
    assert started.wait(5)
    assert cu.skip("tracklists") is False  # not running
    assert cu.skip("festivals") is True
    cu.join(5)
    assert ran == ["first", "second"]


def test_catchup_stop_during_delay_runs_nothing():
    bus, _ = _bus_events()
    ran: list[str] = []
    cu = CatchUp(bus, [CatchUpStep("x", lambda: True, ran.append, lambda: None)], delay=30)
    cu.start()
    cu.stop(5)
    assert ran == []


# =========================================================================== bridge API


def _restart_catchup(a):
    a._catchup = CatchUp(a._bus, a._catchup_steps(), delay=0)
    a._catchup.start()
    a._catchup.join(20)
    a._worker.run("wait", lambda: None, timeout=10)
    a._bus.flush(5)


def test_api_gui_start_assigns_legacy_library(env):  # noqa: F811
    a = env.make(catchup_delay=0)
    legacy_library(a._db)
    a._on_loaded()  # the GUI start
    a._catchup.join(20)
    a._worker.run("wait", lambda: None, timeout=10)
    a._bus.flush(5)
    for vid, _, edition in USER_CASES:
        assert edition_of(a._db, vid) == edition
    fest = env.window.events_of("festival_assign")
    assert fest and all(e["auto"] is True and e["scope"] == "auto" for e in fest)
    assert fest[-1]["phase"] == "done" and fest[-1]["assigned"] == 3
    steps = [e for e in env.window.events_of("auto_pass") if e["phase"] == "step"]
    assert [e["step"] for e in steps][:2] == ["festivals", "tracklists"]
    assert env.window.events_of("auto_pass")[-1]["phase"] == "end"
    tl = env.window.events_of("tracklist_index")
    assert tl and all(e["auto"] for e in tl) and tracklist.unscanned(a._db) == 0
    assert a.get_catchup_status() == {"ok": True, "running": None}
    # next start: nothing to do, no events
    n_auto = len(env.window.events_of("auto_pass"))
    n_fest = len(env.window.events_of("festival_assign"))
    _restart_catchup(a)
    assert len(env.window.events_of("auto_pass")) == n_auto
    assert len(env.window.events_of("festival_assign")) == n_fest


def test_api_catchup_file_passes_respect_settings(env, monkeypatch, tmp_path):  # noqa: F811
    a = env.make(catchup_delay=0)
    exe = tmp_path / "ffmpeg.exe"
    exe.write_bytes(b"")
    monkeypatch.setattr(binaries, "ffmpeg_path", lambda: exe)
    monkeypatch.setattr(library, "target_reachable", lambda p, *k, **kw: True)
    add_done(a._db, "aaaaaaaaaaa", "Partyraiser liveset")
    calls: list[tuple[str, str, bool]] = []
    monkeypatch.setattr(
        a._analysis, "start_pass", lambda scope, auto=False: calls.append(("an", scope, auto))
    )
    monkeypatch.setattr(
        a._fp, "start_pass", lambda scope, auto=False: calls.append(("fp", scope, auto))
    )
    _restart_catchup(a)
    assert calls == [("an", "new", True), ("fp", "new", True)]
    # switched off in the settings: no automatic pass
    calls.clear()
    a._settings.loudness.analyse_after_download = False
    a._settings.reupload.fingerprint_after_download = False
    _restart_catchup(a)
    assert calls == []
    a._settings.loudness.analyse_after_download = True
    a._settings.reupload.enabled = False
    a._settings.reupload.fingerprint_after_download = True
    _restart_catchup(a)
    assert calls == [("an", "new", True)]
    # no ffmpeg (Windows CI) or unreachable library folder: nothing is started
    calls.clear()
    monkeypatch.setattr(binaries, "ffmpeg_path", lambda: tmp_path / "missing.exe")
    _restart_catchup(a)
    assert calls == []


def test_api_user_maintenance_job_has_priority(env, monkeypatch):  # noqa: F811
    a = env.make(catchup_delay=0)
    legacy_library(a._db)
    entered, cancelled_seen = threading.Event(), []
    real = series.assign_pass

    def slow(db, settings, **kw):
        if kw.get("scope") == "auto":
            entered.set()
            assert kw["cancel"].wait(10)
            cancelled_seen.append(True)
            return {"ok": True, "cancelled": True, "total": 4, "done": 0, "assigned": 0,
                    "suggested": 0, "none": 0, "manual": 0, "unchanged": 0}  # fmt: skip
        return real(db, settings, **kw)

    monkeypatch.setattr(series, "assign_pass", slow)
    a._catchup = CatchUp(a._bus, a._catchup_steps(), delay=0)
    a._catchup.start()
    assert entered.wait(10)
    assert a._catchup.running() == "festivals"
    res = a.assign_festivals({"scope": "library"})  # the user's own pass replaces the auto one
    assert res == {"ok": True, "started": True, "scope": "library"}
    a._worker.run("wait", lambda: None, timeout=10)
    a._catchup.join(20)
    assert cancelled_seen == [True]
    assert edition_of(a._db, "adaroQlimax") == "Qlimax 2024"


def test_api_cancel_catchup(env):  # noqa: F811
    a = env.make(catchup_delay=30)
    a._catchup.start()
    assert a.cancel_catchup() == {"ok": True, "cancelled": True}
    a._catchup.join(5)
    assert a.get_catchup_status()["running"] is None


# =========================================================================== end to end


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg fehlt")
def test_search_queue_download_tag_then_catchup_assigns(world):  # noqa: F811
    """Search (mocked yt-dlp) -> filter -> queue -> download -> tags -> DB done; the row then
    looks like a pre-v0.3.0 download (no assignment) and the catch-up assigns it at the next
    GUI start without any button."""
    w = world
    res = w.api.search("hardcore", {"genre": "Hardcore", "year": None})
    assert res["ok"]
    assert w.api.enqueue(["prDominat08"])["ids"] == ["prDominat08"]
    w.api._queue.run_pending()
    row = w.db.get_video("prDominat08")
    assert row["status"] == "done" and Path(row["file_path"]).exists()
    w.db.execute(
        "UPDATE videos SET edition_id=NULL, suggested_edition_id=NULL, festival_confidence=NULL "
        "WHERE id='prDominat08'"
    )
    assert "prDominat08" in series.auto_pending(w.db, w.api._cfg)
    _restart_catchup(w.api)
    assert edition_of(w.db, "prDominat08") == "Dominator 2024"
    lib = {i["id"]: i for i in w.api.get_library()}
    assert lib["prDominat08"]["festival"]["edition"] == "Dominator 2024"


# =========================================================================== review v0.10.1 minors


def test_api_skip_between_check_and_clear_is_not_lost(env, monkeypatch):  # noqa: F811
    """Minor 1: the user's job skips the automatic pass right before the catch-up clears the
    shared stop event; the pass must still stop."""
    a = env.make(catchup_delay=30)
    seen: list[bool] = []

    def fake_pass(db, **kw):
        seen.append(kw["cancel"].wait(5))
        return {"ok": True, "cancelled": True, "done": 0, "sets": 0, "tracks": 0}

    monkeypatch.setattr(tracklist, "index_pass", fake_pass)
    step = next(s for s in a._catchup_steps() if s.name == "tracklists")
    a._catchup.current = "tracklists"
    assert a._catchup.skip("tracklists") is True  # sets the stop event ...
    step.run(threading.Event())  # ... which the step clears before submitting
    assert seen == [True]
    a._catchup.current = None


def test_api_wait_for_auto_pass_timeout_reports_busy(env, monkeypatch):  # noqa: F811
    """Minor 2: a long job ahead of the stopped automatic pass: «busy», no exception."""
    from concurrent.futures import TimeoutError as FutureTimeout

    a = env.make(catchup_delay=30)
    real_run = a._worker.run

    def run(key, fn, *args, timeout=None):
        if key.endswith(":wait"):
            raise FutureTimeout()
        return real_run(key, fn, *args, timeout=timeout)

    monkeypatch.setattr(a._worker, "run", run)
    a._catchup.current = "festivals"
    res = a.assign_festivals({"scope": "library"})
    assert res["ok"] is False and res["error"]
    a._catchup.current = "tracklists"
    res = a.build_tracklists({"scope": "all"})
    assert res["ok"] is False and res["error"]
    a._catchup.current = None


@pytest.mark.parametrize(("method", "queue", "step"), [
    ("analyse_library", "_analysis", "analysis"),
    ("fingerprint_library", "_fp", "fingerprints"),
])  # fmt: skip
def test_api_full_pass_replaces_running_auto_pass(env, monkeypatch, tmp_path, method, queue, step):  # noqa: F811
    """Minor 3: «re-measure all» while the automatic «new» pass runs is not dropped silently:
    the automatic pass stops and the user's full pass starts after it."""
    a = env.make(catchup_delay=30)
    exe = tmp_path / "ffmpeg.exe"
    exe.write_bytes(b"")
    monkeypatch.setattr(binaries, "ffmpeg_path", lambda: exe)
    a._settings.reupload.enabled = True
    q = getattr(a, queue)
    state = {"running": True}
    started = threading.Event()
    calls: list[str] = []

    def start_pass(scope, auto=False):
        if state["running"]:
            return False
        calls.append(scope)
        started.set()
        return True

    def cancel_pass():
        state["running"] = False

    monkeypatch.setattr(q, "start_pass", start_pass)
    monkeypatch.setattr(q, "pass_running", lambda: state["running"])
    monkeypatch.setattr(q, "cancel_pass", cancel_pass)
    a._catchup = CatchUp(a._bus, a._catchup_steps(), delay=30)
    a._catchup.current = step
    res = getattr(a, method)({"scope": "all"})
    assert res == {"ok": True, "started": True, "scope": "all", "after_auto": True}
    assert started.wait(5) and calls == ["all"]
    # «new» while the automatic «new» pass runs: the same work, nothing to replace
    state["running"] = True
    res = getattr(a, method)({"scope": "new"})
    assert res == {"ok": True, "started": False, "running": True}
    a._catchup.current = None
