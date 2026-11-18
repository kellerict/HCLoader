"""v0.7.0 player memory (core/playback.py) and the Api side of loudness/waveform/memory:
get_media extras, get_waveform (lazy, event), save/forget position, «continue listening»,
analyse_library, the after-download hook and clean-up on delete."""

from __future__ import annotations

import threading
import time

import pytest

from app.core import analysis, playback
from app.core.analysis import Loudness, RunResult
from app.core.config import Settings
from tests.audio_fixtures import make_mp3
from tests.test_api import env  # noqa: F401  (fixture)

VID = "abc123XYZ_-"


@pytest.fixture
def settings(tmp_path):
    s = Settings()
    s.storage.target_dir = str(tmp_path / "music")
    return s


def add_done(db, path, vid=VID, duration=3600, **kw):
    db.upsert_video({"id": vid, "title": f"Mix {vid}", "channel_name": "DJ", "duration": duration})
    db.set_status(vid, "done", file_path=str(path))


# --------------------------------------------------------------------------- resume rules


@pytest.mark.parametrize(
    ("pos", "dur", "ok"),
    [
        (0, 3600, False),
        (29.9, 3600, False),
        (30, 3600, True),
        (1800, 3600, True),
        (3570, 3600, True),
        (3570.5, 3600, False),
        (3599, 3600, False),
        (45, None, True),  # unknown duration: only the start margin applies
        (float("nan"), 3600, False),
        ("x", 3600, False),
        (None, 3600, False),
    ],
)
def test_resumable_margins(pos, dur, ok):
    assert playback.resumable(pos, dur) is ok


def test_save_get_forget(db, settings, tmp_path):
    add_done(db, make_mp3(tmp_path / "a.mp3"))
    assert playback.save(db, settings, VID, 1234.567, 3600) == {"ok": True, "stored": True}
    got = playback.get(db, settings, VID)
    assert got["position"] == 1234.57 and got["duration"] == 3600 and got["updated"]
    # near the end = finished: the entry disappears
    assert playback.save(db, settings, VID, 3590, 3600) == {"ok": True, "stored": False}
    assert playback.get(db, settings, VID) is None
    playback.save(db, settings, VID, 100, None)  # duration from the DB row
    assert playback.get(db, settings, VID)["duration"] == 3600
    playback.forget(db, VID)
    assert playback.get(db, settings, VID) is None


def test_save_rejects_unknown_and_garbage(db, settings, tmp_path):
    assert playback.save(db, settings, "nope", 100)["ok"] is False
    add_done(db, make_mp3(tmp_path / "a.mp3"))
    assert playback.save(db, settings, VID, "abc")["ok"] is False
    assert playback.save(db, settings, VID, 100, "abc")["stored"] is True


def test_resume_off_remembers_nothing(db, settings, tmp_path):
    add_done(db, make_mp3(tmp_path / "a.mp3"))
    playback.save(db, settings, VID, 600, 3600)
    settings.player.resume = "off"
    assert playback.get(db, settings, VID) is None
    assert playback.continue_listening(db, settings) == []
    assert playback.save(db, settings, "x", 600) == {"ok": True, "stored": False}


def test_continue_listening_order_limit_and_library_only(db, settings, tmp_path):
    for i in range(7):
        vid = f"vid{i:08d}"
        add_done(db, make_mp3(tmp_path / f"{i}.mp3"), vid=vid)
        playback.save(db, settings, vid, 100 + i, 3600)
        db.execute(
            "UPDATE playback SET updated = ? WHERE video_id = ?", (f"2026-11-0{i + 1}T10:00", vid)
        )
    db.set_status("vid00000006", "ignored")  # deleted from the library
    items = playback.continue_listening(db, settings)
    assert [x["id"] for x in items] == [f"vid{i:08d}" for i in (5, 4, 3, 2, 1)]
    first = items[0]
    assert first["position"] == 105 and first["duration"] == 3600
    assert first["title"] == "Mix vid00000005" and first["artist"] == "DJ"
    assert len(playback.continue_listening(db, settings, 2)) == 2
    assert len(playback.continue_listening(db, settings, "x")) == 5
    assert len(playback.continue_listening(db, settings, 999)) == 6


def test_playback_rows_follow_video_deletion(db, settings, tmp_path):
    add_done(db, make_mp3(tmp_path / "a.mp3"))
    playback.save(db, settings, VID, 600, 3600)
    db.delete_video(VID)  # ON DELETE CASCADE
    assert db.query("SELECT * FROM playback") == []


# --------------------------------------------------------------------------- Api


def fake_runner(path, *, loudness=True, peaks=True, cancel=None, **kw):
    return RunResult(
        loudness=Loudness(-8.0, 0.5, 4.0) if loudness else None,
        peaks=[1, 50, 255, 9] if peaks else [],
        samples=4 * 200,
    )


@pytest.fixture
def api(env, tmp_path, monkeypatch):  # noqa: F811
    fake = tmp_path / "bin" / "ffmpeg"
    fake.parent.mkdir()
    fake.write_bytes(b"")
    from app.core import binaries

    monkeypatch.setattr(binaries, "ffmpeg_path", lambda: fake)
    monkeypatch.setattr(analysis, "ffmpeg_path", lambda: fake)
    a = env.make()
    a._analysis._runner = fake_runner
    a._settings.storage.target_dir = str(tmp_path / "music")
    return a


def _events(env, kind):  # noqa: F811
    for a in env.made:
        a._bus.flush(5)
    return env.window.events_of(kind)


def _wait(pred, timeout=5):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if pred():
            return True
        time.sleep(0.02)
    return False


def test_get_media_extras_and_lazy_waveform(api, env, tmp_path):  # noqa: F811
    f = make_mp3(tmp_path / "music" / "set.mp3")
    add_done(api._db, f)
    m = api.get_media(VID)
    assert m["ok"] and m["loudness"] is None and m["resume"] is None and m["peaks"] is None
    r = api.get_waveform(VID)
    assert r == {"ok": True, "status": "pending"}
    assert _wait(lambda: _events(env, "waveform"))
    wf = _events(env, "waveform")[0]
    assert wf["id"] == VID and wf["ok"] and wf["peaks"] == [1, 50, 255, 9]
    assert wf["loudness"]["gain"] == -10.0
    r = api.get_waveform(VID)
    assert r["status"] == "ready" and r["peaks"] == [1, 50, 255, 9] and r["duration"] == 3600
    assert api.save_position(VID, 1500, 3600) == {"ok": True, "stored": True}
    m = api.get_media(VID)
    assert m["loudness"]["lufs"] == -8.0 and m["loudness"]["peak"] == pytest.approx(1.059254)
    assert m["resume"]["position"] == 1500
    assert m["peaks"] == [1, 50, 255, 9]
    items = api.get_continue_listening()["items"]
    assert [x["id"] for x in items] == [VID]
    assert api.forget_position(VID) == {"ok": True}
    assert api.get_continue_listening()["items"] == []


def test_get_waveform_errors(api, tmp_path, monkeypatch):
    assert api.get_waveform("nope")["ok"] is False
    add_done(api._db, make_mp3(tmp_path / "music" / "set.mp3"))
    from app.core import binaries

    monkeypatch.setattr(binaries, "ffmpeg_path", lambda: tmp_path / "none")
    r = api.get_waveform(VID)
    assert r["ok"] is False and r["status"] == "unavailable" and "ffmpeg" in r["error"]


def test_analyse_library_pass_and_status(api, env, tmp_path):  # noqa: F811
    for i in range(3):
        add_done(api._db, make_mp3(tmp_path / "music" / f"{i}.mp3"), vid=f"vid{i:08d}")
    st = api.get_analysis_status()
    assert st["total"] == 3 and st["pending"] == 3 and st["ffmpeg"] and not st["running"]
    r = api.analyse_library({"scope": "new"})
    assert r["ok"] and r["started"]
    assert _wait(lambda: any(d.get("phase") == "done" for d in _events(env, "audio_analysis")))
    done = [d for d in _events(env, "audio_analysis") if d["phase"] == "done"][0]
    assert done["analysed"] == 3 and done["total"] == 3
    assert len(_events(env, "media_analysed")) == 3
    st = api.get_analysis_status()
    assert st["analysed"] == 3 and st["tagged"] == 3 and st["pending"] == 0 and st["last_pass"]
    assert api.cancel_analyse_library()["ok"]


def test_analyse_library_twice_and_without_ffmpeg(api, tmp_path, monkeypatch):
    gate = threading.Event()

    def slow(path, **kw):
        gate.wait(5)
        return fake_runner(path, **kw)

    api._analysis._runner = slow
    add_done(api._db, make_mp3(tmp_path / "music" / "a.mp3"))
    assert api.analyse_library()["started"]
    again = api.analyse_library({"scope": "all"})
    assert again == {"ok": True, "started": False, "running": True}
    assert api.get_analysis_status()["running"]
    gate.set()
    from app.core import binaries

    monkeypatch.setattr(binaries, "ffmpeg_path", lambda: tmp_path / "none")
    r = api.analyse_library()
    assert r["ok"] is False and "ffmpeg" in r["error"]


def test_after_download_hook_respects_setting(api, env, tmp_path):  # noqa: F811
    add_done(api._db, make_mp3(tmp_path / "music" / "a.mp3"))
    api._settings.loudness.analyse_after_download = False
    api._after_download(VID)
    time.sleep(0.2)
    assert analysis.get_row(api._db, VID) is None
    api._settings.loudness.analyse_after_download = True
    api._after_download(VID)
    assert _wait(lambda: (analysis.get_row(api._db, VID) or {}).get("tagged") == 1)
    assert _wait(lambda: _events(env, "media_analysed"))


def test_delete_forgets_analysis_and_position(api, tmp_path):
    f = make_mp3(tmp_path / "music" / "a.mp3")
    add_done(api._db, f)
    analysis.process(api._db, api._settings, VID, runner=fake_runner)
    api.save_position(VID, 600, 3600)
    assert api.delete_library_item(VID, True)["ok"]
    assert analysis.get_row(api._db, VID) is None
    assert not analysis.peaks_file(VID).exists()
    assert api._db.query("SELECT * FROM playback") == []
