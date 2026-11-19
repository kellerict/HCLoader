"""v0.10.0 re-upload detection: fingerprint on synthetic audio arrays (no ffmpeg), the fast
index, the re-upload flow (download -> fingerprint -> mark -> keep/link/delete), backfill pass
with cancel, worker queue events, pre-check, migration 16."""

from __future__ import annotations

import math
import random
import sqlite3
import threading
from array import array
from functools import lru_cache
from pathlib import Path

import pytest

from app.core import config, duplicates, fingerprint
from app.core import db as dbmod
from app.core.db import Database

R = fingerprint.RATE


# --------------------------------------------------------------------------- synthetic audio


@lru_cache(maxsize=64)
def _notes(seed: int, n: int) -> tuple:
    rnd = random.Random(seed)
    return tuple(
        tuple((rnd.uniform(60, 2400), rnd.uniform(0.2, 1.0)) for _ in range(3)) for _ in range(n)
    )


@lru_cache(maxsize=256)
def song(seed: int, start: float, seconds: float) -> tuple:
    """A deterministic 'track' as a function of absolute song time: three tones that change
    every 0.25 s plus a kick every 0.4 s (int16 range)."""
    notes = _notes(seed, int((start + seconds) / 0.25) + 2)
    out = []
    two_pi = 2 * math.pi
    for i in range(int(seconds * R)):
        t = start + i / R
        v = 0.0
        for f, a in notes[int(t / 0.25)]:
            v += a * math.sin(two_pi * f * t)
        kt = t % 0.4
        v += 1.5 * math.exp(-kt * 20) * math.sin(two_pi * 55 * kt)
        out.append(v * 4000)
    return tuple(out)


def degrade(x, seed: int, gain: float = 0.6, noise: float = 600.0) -> list[float]:
    """Re-encode stand-in: low-pass (2-tap), gain change, white noise, clipping."""
    rnd = random.Random(seed)
    y = [gain * (x[i] + x[i - 1]) / 2 + rnd.gauss(0, noise) for i in range(1, len(x))]
    return [max(-32768.0, min(32767.0, v)) for v in y]


def render(seed: int, windows, *, shift: float = 0.0, deg: bool = False, rest_seed=None, cut=None):
    """Decoded windows [(start, samples)] of a file whose audio is `song(seed)` delayed by
    `shift` seconds (other audio before it); `rest_seed` replaces the song after `cut` s."""
    segs = []
    for start, length in windows:
        t0 = start - shift
        if t0 < 0:
            x = list(song(seed + 999, 0.0, -t0)) + list(song(seed, 0.0, length + t0))
        else:
            use = seed if rest_seed is None or (cut is not None and t0 < cut) else rest_seed
            x = list(song(use, t0, length))
        if deg:
            x = degrade(x, seed + int(start))
        segs.append((start, x))
    return segs


WINDOWS = [(0.0, 40.0), (100.0, 15.0), (200.0, 15.0)]


@pytest.fixture(scope="module")
def prints():
    return {
        "orig": fingerprint.compute(render(1, WINDOWS)),
        "reupload": fingerprint.compute(render(1, WINDOWS, shift=2.37, deg=True)),
        "reencode": fingerprint.compute(render(1, WINDOWS, deg=True)),
        "other": fingerprint.compute(render(2, WINDOWS)),
        "same_intro": fingerprint.compute(render(1, WINDOWS, rest_seed=5, cut=40.0)),
    }


# --------------------------------------------------------------------------- algorithm


def test_compute_is_compact_and_segmented(prints):
    fp = prints["orig"]
    assert len(fp.segments) == 3
    seconds = sum(length for _s, length in WINDOWS)
    assert 5 * seconds < len(fp.hashes) < 40 * seconds  # ~20 hashes per second
    assert fp.segments[1][0] == round(100.0 / fingerprint.FRAME_S)
    assert all(0 <= h < (1 << 24) for h, _t in fp.hashes)


def test_same_audio_matches_fully(prints):
    m = fingerprint.compare(prints["orig"], prints["orig"])
    assert m.score == 1.0 and m.offset_s == 0.0 and m.segments_hit == 3


def test_reupload_with_offset_noise_and_gain_matches(prints):
    m = fingerprint.compare(prints["reupload"], prints["orig"])
    assert fingerprint.is_match(m, 0.15)
    assert abs(m.offset_s - 2.37) < 0.1  # the intro of the re-upload is 2.37 s longer
    assert m.segments_hit == 3
    m2 = fingerprint.compare(prints["reencode"], prints["orig"])
    assert fingerprint.is_match(m2, 0.15) and m2.offset_s == 0.0


def test_unrelated_audio_does_not_match(prints):
    m = fingerprint.compare(prints["other"], prints["orig"])
    assert m.score < 0.03 and not fingerprint.is_match(m, 0.05)


def test_same_intro_different_set_is_no_match(prints):
    """Two different sets that open with the same track: the head matches, the windows
    later in the set do not -> no re-upload."""
    m = fingerprint.compare(prints["same_intro"], prints["orig"])
    assert m.score > 0.5 and m.segments_hit == 1
    assert not fingerprint.is_match(m, 0.15)


def test_threshold_is_respected(prints):
    m = fingerprint.compare(prints["reupload"], prints["orig"])
    assert not fingerprint.is_match(m, min(0.95, m.score + 0.01))


def test_silence_and_short_input():
    assert fingerprint.compute([(0.0, [0.0] * (R * 5))]).hashes == []
    assert fingerprint.compute([(0.0, [1.0] * 100)]).segments == []
    assert fingerprint.compare(fingerprint.Fingerprint(), fingerprint.Fingerprint()).hits == 0


def test_pack_roundtrip(prints):
    fp = prints["orig"]
    back = fingerprint.Fingerprint.unpack(fp.pack(), fp.segments, 600.0)
    assert back.hashes == fp.hashes and back.segments == fp.segments and back.duration == 600.0
    assert len(fp.pack()) == 8 * len(fp.hashes)


@pytest.mark.parametrize(
    ("duration", "head", "windows", "expected"),
    [
        (None, 3, 3, [(0.0, 180.0)]),
        (120, 3, 3, [(0.0, 120.0)]),  # shorter than the head
        (200, 3, 3, [(0.0, 180.0)]),  # no room for a window
        # anchors: 5 and 10 min from the start, 2 min before the end
        (3780, 3, 3, [(0.0, 180.0), (300.0, 30.0), (600.0, 30.0), (3660.0, 30.0)]),
        (3780, 1, 0, [(0.0, 60.0)]),
        (7200, 3, 4, [(0.0, 180.0), (300.0, 30.0), (600.0, 30.0), (6840.0, 30.0), (7080.0, 30.0)]),
        (600, 3, 3, [(0.0, 180.0), (300.0, 30.0), (480.0, 30.0)]),  # 10 min anchor does not fit
        (330, 3, 3, [(0.0, 180.0), (210.0, 30.0), (300.0, 30.0)]),
        (300, 3, 3, [(0.0, 180.0), (180.0, 30.0)]),  # only 2 min before the end fits
    ],
)
def test_windows_for(duration, head, windows, expected):
    assert fingerprint.windows_for(duration, head, windows) == expected


def test_ffmpeg_command_seeks_and_decodes_mono_low_rate():
    cmd = fingerprint.build_command("ffmpeg", "x.mp3", 1065.0, 30.0)
    assert cmd[cmd.index("-ss") + 1] == "1065.00" and cmd.index("-ss") < cmd.index("-i")
    assert cmd[cmd.index("-ar") + 1] == str(R) and cmd[cmd.index("-ac") + 1] == "1"
    assert cmd[-3:] == ["-f", "s16le", "-"]
    assert "-ss" not in fingerprint.build_command("ffmpeg", "x.mp3", 0.0, 60.0)


def test_decode_reads_pcm_through_fake_ffmpeg(tmp_path):
    pcm = array("h", [0, 1000, -1000, 32767]).tobytes()
    seen = []

    class Proc:
        pid = 1
        returncode = 0

        def __init__(self, cmd, **kw):
            seen.append(cmd)

        def communicate(self):
            return pcm, b""

        def kill(self):
            pass

    f = tmp_path / "a.mp3"
    f.write_bytes(b"x")
    out = fingerprint.decode(f, [(0.0, 60.0), (300.0, 30.0)], exe="ffmpeg", popen=Proc)
    assert [s for s, _x in out] == [0.0, 300.0] and list(out[0][1]) == [0, 1000, -1000, 32767]
    assert len(seen) == 2


# --------------------------------------------------------------------------- DB / index / flow


def _settings(**kw):
    s = config.defaults()
    s.reupload.head_minutes = 1
    s.reupload.windows = 2
    for k, v in kw.items():
        setattr(s.reupload, k, v)
    return s


def _add(db: Database, tmp_path: Path, vid: str, title: str, when: str, duration=600) -> None:
    f = tmp_path / f"{vid.replace(':', '-')}.mp3"
    f.write_bytes(b"audio")
    db.upsert_video({"id": vid, "title": title, "duration": duration, "channel_name": "DJ"})
    db.set_status(vid, "done", file_path=str(f))
    db.execute("UPDATE videos SET downloaded_at=? WHERE id=?", (when, vid))


def fake_decoder(by_file: dict[str, dict]):
    """decoder(path, windows, cancel) -> synthetic windows per file name."""
    calls = []

    def decode(path, windows, *, cancel=None):
        calls.append((Path(path).name, list(windows)))
        spec = by_file[Path(path).name]
        return render(spec["seed"], windows, shift=spec.get("shift", 0.0), deg=spec.get("deg"))

    decode.calls = calls
    return decode


@pytest.fixture
def lib(db, tmp_path):
    _add(db, tmp_path, "abcdefghijk", "Masters of Hardcore 2026 – DJ X", "2026-10-01T10:00:00")
    _add(db, tmp_path, "sc:111", "Some other mix", "2026-10-02T10:00:00")
    _add(db, tmp_path, "mc:DJ_X_reup", "MOH 2026 DJ X (reupload)", "2026-11-01T10:00:00")
    dec = fake_decoder(
        {
            "abcdefghijk.mp3": {"seed": 1},
            "sc-111.mp3": {"seed": 2},
            "mc-DJ_X_reup.mp3": {"seed": 1, "shift": 1.5, "deg": True},
        }
    )
    return db, dec


def test_process_marks_newer_item_as_reupload(lib):
    db, dec = lib
    s = _settings()
    for vid in ("abcdefghijk", "sc:111"):
        res = fingerprint.process(db, s, vid, decoder=dec)
        assert res["ok"] and "reupload" not in res
    # windows from the stored duration: head 1 min + 30 s at 5 min and 2 min before the end
    assert dec.calls[0][1] == [(0.0, 60.0), (300.0, 30.0), (480.0, 30.0)]
    res = fingerprint.process(db, s, "mc:DJ_X_reup", decoder=dec)
    mark = res["reupload"]
    assert mark["id"] == "mc:DJ_X_reup" and mark["of"]["id"] == "abcdefghijk"
    assert mark["of"]["title"].startswith("Masters of Hardcore") and mark["state"] == "open"
    assert mark["of"]["platform"] == "youtube" and mark["score"] >= 0.15
    assert fingerprint.info_of(db, "abcdefghijk") is None  # the older one stays unmarked
    st = fingerprint.status(db)
    assert st["fingerprinted"] == 3 and st["open"] == 1 and st["pending"] == 0


def test_index_finds_candidates_fast(lib):
    db, dec = lib
    s = _settings()
    for vid in ("abcdefghijk", "sc:111"):
        fingerprint.process(db, s, vid, decoder=dec)
    rows = db.query_one("SELECT COUNT(*) AS n FROM fingerprint_index")["n"]
    full = sum(len(fingerprint.get(db, v).hashes) for v in ("abcdefghijk", "sc:111"))
    assert 0 < rows < full / 2  # only a sample is indexed
    probe = fingerprint.compute(render(1, [(0.0, 60.0)], shift=0.7, deg=True))
    cands = fingerprint.candidates(db, probe)
    assert cands and cands[0][0] == "abcdefghijk"
    assert all(v != "x" for v, _n in fingerprint.candidates(db, probe, exclude="x"))
    other = fingerprint.compute(render(9, [(0.0, 60.0)]))
    assert fingerprint.find_match(db, "new", other, 0.15) is None


def test_backfill_pass_marks_newer_and_reports_progress(lib):
    db, dec = lib
    progress, items = [], []
    res = fingerprint.run_pass(
        db, _settings, progress=progress.append, item_done=items.append, decoder=dec
    )
    assert res == {"ok": True, "total": 3, "done": 3, "found": 1, "failed": 0, "cancelled": False}
    assert progress[-1] == {"done": 3, "total": 3, "found": 1, "failed": 0}
    # oldest download first: the newer item is the one that finds the older and gets marked
    assert [r["id"] for r in items] == ["abcdefghijk", "sc:111", "mc:DJ_X_reup"]
    assert fingerprint.reupload_map(db)["mc:DJ_X_reup"]["of"]["id"] == "abcdefghijk"
    assert db.get_state(fingerprint.K_LAST_PASS)
    # nothing left; «all» redoes everything but keeps the decision of the user
    assert fingerprint.pending(db) == []
    fingerprint.resolve(db, "mc:DJ_X_reup", "keep")
    fingerprint.run_pass(db, _settings, scope="all", decoder=dec)
    assert fingerprint.info_of(db, "mc:DJ_X_reup")["state"] == "kept"


def test_backfill_pass_cancel_between_items(lib):
    db, dec = lib
    cancel = threading.Event()
    res = fingerprint.run_pass(
        db, _settings, cancel=cancel, item_done=lambda r: cancel.set(), decoder=dec
    )
    assert res["cancelled"] and res["done"] == 1
    assert db.get_state(fingerprint.K_LAST_PASS) is None
    assert len(fingerprint.pending(db)) == 2


def test_errors_are_stored_and_not_retried(lib, tmp_path):
    db, _dec = lib

    def broken(path, windows, *, cancel=None):
        raise fingerprint.FingerprintError("ffmpeg: invalid data")

    res = fingerprint.process(db, _settings(), "sc:111", decoder=broken)
    assert not res["ok"] and "invalid data" in res["error"]
    row = db.query_one("SELECT * FROM fingerprints WHERE video_id='sc:111'")
    assert row["hashes"] is None and "invalid data" in row["error"]
    assert "sc:111" not in fingerprint.pending(db)  # not again until downloaded again
    db.execute("UPDATE videos SET downloaded_at='2099-01-01T00:00:00' WHERE id='sc:111'")
    assert "sc:111" in fingerprint.pending(db)
    # transient (file missing): nothing stored, tried again
    Path(db.get_video("abcdefghijk")["file_path"]).unlink()
    res = fingerprint.process(db, _settings(), "abcdefghijk", decoder=broken)
    assert not res["ok"] and "abcdefghijk" in fingerprint.pending(db)


def test_resolve_actions_and_forget(lib):
    db, dec = lib
    fingerprint.run_pass(db, _settings, decoder=dec)
    assert fingerprint.resolve(db, "mc:DJ_X_reup", "nope")["ok"] is False
    assert fingerprint.resolve(db, "abcdefghijk", "keep")["ok"] is False  # not marked
    res = fingerprint.resolve(db, "mc:DJ_X_reup", "link")
    assert res["state"] == "linked" and fingerprint.info_of(db, "mc:DJ_X_reup")["state"] == "linked"
    assert fingerprint.resolve(db, "mc:DJ_X_reup", "open")["state"] == "open"
    fingerprint.forget(db, "abcdefghijk")  # the older item was deleted
    assert fingerprint.info_of(db, "mc:DJ_X_reup") is None
    assert fingerprint.get(db, "abcdefghijk") is None
    assert (
        db.query_one("SELECT COUNT(*) AS n FROM fingerprint_index WHERE video_id='abcdefghijk'")[
            "n"
        ]
        == 0
    )


def test_since_pending_only_after_first_start(lib):
    db, _dec = lib
    assert fingerprint.since_pending(db) == []  # first start: remembers the time
    db.execute("UPDATE videos SET downloaded_at='2999-01-01T00:00:00' WHERE id='sc:111'")
    assert fingerprint.since_pending(db) == ["sc:111"]


def test_precheck_same_platform_by_duration_and_title(db):
    db.upsert_video(
        {"id": "abcdefghijk", "title": "Masters of Hardcore 2026 | DJ X", "duration": 3600}
    )
    db.set_status("abcdefghijk", "done", file_path="x.mp3")
    reup = {"id": "zyxwvutsrqp", "title": "Masters of Hardcore 2026 - DJ X", "duration": 3602}
    assert duplicates.find_duplicate(db, reup) is None  # 7a: only other platforms
    dup = duplicates.find_duplicate(db, reup, same_platform=True)
    assert dup == {
        "id": "abcdefghijk",
        "platform": "youtube",
        "title": "Masters of Hardcore 2026 | DJ X",
    }
    assert duplicates.find_duplicate(db, {**reup, "duration": 3700}, same_platform=True) is None
    # the item itself is never its own duplicate
    assert duplicates.find_duplicate(db, {**reup, "id": "abcdefghijk"}, same_platform=True) is None


def test_precheck_same_platform_needs_the_same_numbers(db):
    """Review v0.10.0 m6: the next episode of a weekly show (same length, title differs only
    in the number) is no re-upload on the same platform; leading zeros do not matter."""
    t = "Rawstyle Hardcore Radio Show Weekly Episode {} (Uptempo Special) Live Mix"
    db.upsert_video({"id": "abcdefghijk", "title": t.format(101), "duration": 3600})
    db.set_status("abcdefghijk", "done", file_path="x.mp3")
    nxt = {"id": "zyxwvutsrqp", "title": t.format(102), "duration": 3600}
    assert duplicates.title_tokens(nxt["title"]) != duplicates.title_tokens(t.format(101))
    assert duplicates.find_duplicate(db, nxt, same_platform=True) is None
    same = {**nxt, "title": t.format("0101")}
    assert duplicates.find_duplicate(db, same, same_platform=True)["id"] == "abcdefghijk"


def test_watchlist_precheck_sends_reupload_to_inbox_not_queue(db):
    from app.core import watchlist, ytclient

    s = config.defaults()
    s.reupload.precheck = True
    db.upsert_video(
        {"id": "abcdefghijk", "title": "Defqon.1 2026 Endshow liveset", "duration": 3600}
    )
    db.set_status("abcdefghijk", "done", file_path="x.mp3")
    sid = db.add_source("channel", "x", "https://www.youtube.com/@x/videos", auto_download=True)
    entry = ytclient.normalize_entry(
        {"id": "zyxwvutsrqp", "title": "Defqon.1 2026 Endshow liveset", "duration": 3601}
    )

    class C:
        def list_source(self, *a, **kw):
            return ytclient.SourceListing([entry])

    queued = []
    res = watchlist.check_source(
        db.get_source(sid),
        client=C(),
        db=db,
        settings=s,
        enqueue=lambda ids: queued.extend(ids) or ids,
    )
    assert queued == [] and db.get_video("zyxwvutsrqp")["status"] == "inbox"
    assert res.duplicates == 1


# --------------------------------------------------------------------------- migration


def test_migration_16_from_v15(tmp_path):
    path = tmp_path / "old.db"
    conn = sqlite3.connect(path)
    for step in dbmod.MIGRATIONS[:15]:
        step(conn)
    conn.execute("CREATE TABLE IF NOT EXISTS schema_version(version INTEGER)")
    conn.execute("DELETE FROM schema_version")
    conn.execute("INSERT INTO schema_version VALUES (15)")
    conn.execute(
        "INSERT INTO videos(id, title, status, platform) "
        "VALUES ('abcdefghijk', 'x', 'done', 'youtube')"
    )
    conn.commit()
    conn.close()
    with Database(path) as d:
        assert d.schema_version() == len(dbmod.MIGRATIONS) >= 16
        tables = {r["name"] for r in d.query("SELECT name FROM sqlite_master WHERE type='table'")}
        assert {"fingerprints", "fingerprint_index", "reuploads"} <= tables
        assert d.get_video("abcdefghijk")["title"] == "x"
        d.execute(
            "INSERT INTO reuploads(video_id, of_id, score, detected) "
            "VALUES ('abcdefghijk', 'b', 0.5, 'n')"
        )
        with pytest.raises(sqlite3.IntegrityError):
            d.execute("UPDATE reuploads SET state='weird'")
        # deleting the video row removes its marks (ON DELETE CASCADE)
        d.delete_video("abcdefghijk")
        assert d.query("SELECT * FROM reuploads") == []


# --------------------------------------------------------------------------- worker / API


def test_fingerprint_queue_events(lib):
    from app.worker import EventBus, FingerprintQueue

    db, dec = lib
    events = []
    bus = EventBus()
    bus.subscribe(lambda t, d: events.append((t, d)))
    done = threading.Event()
    s = _settings()
    q = FingerprintQueue(db, lambda: s, bus, decoder=dec)
    try:
        assert q.start_pass("new") and not q.start_pass("new")

        def watch(t, d):
            if t == "fingerprint" and d.get("phase") in ("done", "error"):
                done.set()

        bus.subscribe(watch)
        assert done.wait(60)
    finally:
        q.stop()
    kinds = [(t, d.get("phase")) for t, d in events]
    assert ("fingerprint", "start") in kinds and ("fingerprint", "done") in kinds
    found = [d for t, d in events if t == "reupload"]
    assert found and found[0]["id"] == "mc:DJ_X_reup"
    last = [d for t, d in events if t == "fingerprint"][-1]
    assert last["found"] == 1 and last["total"] == 3


def test_fingerprint_queue_waits_while_analysis_busy(lib):
    from app.worker import EventBus, FingerprintQueue

    db, dec = lib
    busy = {"on": True}
    q = FingerprintQueue(
        db, _settings, EventBus(), decoder=dec, busy=lambda: busy["on"], idle_wait=0.02
    )
    try:
        q.request("abcdefghijk")
        threading.Event().wait(0.2)
        assert fingerprint.get(db, "abcdefghijk") is None  # still waiting
        busy["on"] = False
        for _ in range(200):
            if q.idle() and fingerprint.get(db, "abcdefghijk") is not None:
                break
            threading.Event().wait(0.05)
        assert fingerprint.get(db, "abcdefghijk") is not None
    finally:
        q.stop()


def test_item_deleted_while_decoding_leaves_no_rows(lib):
    """Review v0.10.0 n1: the item leaves the library during the decode -> nothing stored."""
    db, dec = lib

    def deleting(path, windows, *, cancel=None):
        db.mark_removed("abcdefghijk")
        return dec(path, windows, cancel=cancel)

    res = fingerprint.process(db, _settings(), "abcdefghijk", decoder=deleting)
    assert not res["ok"]
    assert db.query_one("SELECT COUNT(*) AS n FROM fingerprints")["n"] == 0
    assert db.query_one("SELECT COUNT(*) AS n FROM fingerprint_index")["n"] == 0


def test_fingerprint_queue_drop_stops_ffmpeg_of_a_deleted_item(lib):
    """Review v0.10.0 n2: deleting an item whose file ffmpeg reads stops that decode (the file
    is free on Windows); a pass goes on with the next file."""
    from app.worker import EventBus, FingerprintQueue

    db, dec = lib
    started = threading.Event()
    stopped = threading.Event()
    target = db.get_video("abcdefghijk")["file_path"]

    def slow(path, windows, *, cancel=None):
        if str(path) == target:
            started.set()
            while not cancel.is_set():
                threading.Event().wait(0.01)
            stopped.set()
            return None  # what fingerprint.decode returns after killing ffmpeg
        return dec(path, windows, cancel=cancel)

    bus = EventBus()
    done = threading.Event()
    events = []
    bus.subscribe(
        lambda t, d: (
            events.append((t, d)),
            t == "fingerprint" and d.get("phase") == "done" and done.set(),
        )
    )
    q = FingerprintQueue(db, _settings, bus, decoder=slow)
    try:
        assert q.start_pass("new")
        assert started.wait(30)
        q.drop("abcdefghijk", target)
        assert stopped.is_set()  # drop() returned only after the decode let go
        assert done.wait(60)
    finally:
        q.stop()
    last = [d for t, d in events if t == "fingerprint"][-1]
    assert not last["cancelled"] and last["failed"] == 1 and last["done"] == 3
    assert fingerprint.get(db, "abcdefghijk") is None
    assert fingerprint.get(db, "sc:111") is not None
