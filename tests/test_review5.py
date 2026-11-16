# ruff: noqa: F811
"""Review Phase 5 fixes: M1 (foreign ID3 frames survive re-tag), m1-m3, hints n1-n7, n12."""

import os
import shutil
import threading
import time
from pathlib import Path

import pytest
from mutagen.id3 import APIC, CHAP, ID3, POPM, TBPM, TIT2, TKEY, TXXX, USLT
from test_api import env  # noqa: F401  (fixture)
from test_library import (  # noqa: F401  (fixtures)
    VID,
    VID2,
    add_done,
    make_item,
    root,
    settings,
)
from test_tagging import make_mp3, needs_ffmpeg

from app.core import library, maintenance, sidecar, tagging
from app.core.tagging import Chapter

# ------------------------------------------------------------------ M1


def _foreign(path: Path) -> None:
    tags = ID3(path)
    tags.add(TBPM(encoding=3, text=["200"]))
    tags.add(POPM(email="x@y", rating=200, count=3))
    tags.add(TKEY(encoding=3, text=["Am"]))
    tags.add(TXXX(encoding=3, desc="REPLAYGAIN_TRACK_GAIN", text=["-6.5 dB"]))
    tags.add(USLT(encoding=3, lang="eng", desc="", text="la la"))
    for i in range(3):  # stale chapters of the old tagging
        tags.add(
            CHAP(
                element_id=f"old{i}",
                start_time=i * 1000,
                end_time=i * 1000 + 900,
                start_offset=0xFFFFFFFF,
                end_offset=0xFFFFFFFF,
                sub_frames=[TIT2(encoding=3, text=[f"old {i}"])],
            )
        )
    tags.save(path, v2_version=4)


@needs_ffmpeg
def test_retag_keeps_foreign_id3_frames(tmp_path, root, db, settings):
    f = make_item(tmp_path, root, db)
    _foreign(f)
    sidecar.write(
        VID,
        sidecar.build(
            {"id": VID, "title": "Partyraiser @ Hardcore Mix", "channel_name": "Partyraiser"},
            chapters=[Chapter(0, "Intro", 60), Chapter(60, "Main", 120)],
        ),
    )
    res = library.retag(db, settings, VID)
    assert res["ok"], res
    tags = ID3(res["path"])
    assert str(tags["TBPM"]) == "200" and str(tags["TKEY"]) == "Am"
    assert tags["POPM:x@y"].rating == 200
    assert str(tags["TXXX:REPLAYGAIN_TRACK_GAIN"]) == "-6.5 dB"
    assert tags.getall("USLT")[0].text == "la la"
    assert str(tags["TPE1"]) == "Partyraiser" and str(tags["TXXX:YOUTUBE_ID"]) == VID
    chaps = tags.getall("CHAP")
    assert sorted(c.element_id for c in chaps) == ["chp0", "chp1"]  # replaced, not doubled
    assert len(tags.getall("CTOC")) == 1


@needs_ffmpeg
def test_first_write_still_starts_from_an_empty_tag(tmp_path):
    f = make_mp3(tmp_path / "a.mp3")
    tags = ID3()
    tags.add(TBPM(encoding=3, text=["150"]))
    tags.save(f)
    tagging.write_tags(f, {"title": "T", "artist": "A", "id": VID})
    assert "TBPM" not in ID3(f)
    tags = ID3(f)
    tags.add(TBPM(encoding=3, text=["150"]))
    tags.save(f)
    tagging.write_tags(f, {"title": "T2", "artist": "A", "id": VID}, keep_existing=True)
    assert "TBPM" in ID3(f) and str(ID3(f)["TIT2"]) == "T2"


@needs_ffmpeg
def test_retag_keeps_old_cover_without_new_one(tmp_path):
    f = make_mp3(tmp_path / "a.mp3")
    tagging.write_tags(f, {"title": "T", "artist": "A"}, cover_jpeg=b"JPEGDATA")
    tagging.write_tags(f, {"title": "T", "artist": "A"}, keep_existing=True)
    assert ID3(f).getall("APIC")[0].data == b"JPEGDATA"
    tagging.write_tags(f, {"title": "T", "artist": "A"}, cover_jpeg=b"NEW", keep_existing=True)
    assert [a.data for a in ID3(f).getall("APIC")] == [b"NEW"]


@needs_ffmpeg
def test_retag_keeps_all_pictures_of_an_mp3(tmp_path, root, db, settings):
    """Review P5 R2-m1: re-tagging must not drop a back cover or a user PNG."""
    f = make_item(tmp_path, root, db)
    tags = ID3(f)
    tags.delall("APIC")
    tags.add(APIC(encoding=3, mime="image/jpeg", type=3, desc="front", data=b"FRONT"))
    tags.add(APIC(encoding=3, mime="image/png", type=4, desc="back", data=b"BACKPNG"))
    tags.save(f, v2_version=4)
    res = library.retag(db, settings, VID)
    assert res["ok"], res
    pics = {(a.type, a.mime, a.data) for a in ID3(res["path"]).getall("APIC")}
    assert pics == {(3, "image/jpeg", b"FRONT"), (4, "image/png", b"BACKPNG")}


# ------------------------------------------------------------------ m1


@needs_ffmpeg
def test_retag_path_too_long_is_a_clean_error(tmp_path, root, db, settings):
    deep = "d" * 20
    f = make_item(tmp_path, root, db, rel="/".join([deep] * 4))
    settings.storage.max_path_length = 100
    before = f.read_bytes()
    res = library.retag(db, settings, VID)
    assert res["ok"] is False and "zu lang" in res["error"]
    assert f.read_bytes() == before and db.get_video(VID)["file_path"] == str(f)


# ------------------------------------------------------------------ m2


def test_target_reachable_and_timeout(tmp_path, monkeypatch):
    assert library.target_reachable(tmp_path)
    assert not library.target_reachable(tmp_path / "nope")
    real = Path.is_dir

    def slow(self):
        time.sleep(1.0)
        return real(self)

    monkeypatch.setattr(Path, "is_dir", slow)
    t0 = time.monotonic()
    assert library.target_reachable(tmp_path, timeout=0.1) is False  # hanging share
    assert time.monotonic() - t0 < 0.8


@needs_ffmpeg
def test_unreachable_root_gives_unknown_not_missing(tmp_path, root, db, settings):
    make_item(tmp_path, root, db)
    outside = tmp_path / "elsewhere.mp3"
    add_done(db, VID2, outside)
    items = {i["id"]: i for i in library.list_library(db, root=root, root_ok=False, filters=None)}
    assert items[VID]["unknown"] is True and items[VID]["missing"] is False
    assert items[VID2]["unknown"] is False and items[VID2]["missing"] is True
    assert library.list_library(db, {"missing": True}, root=root, root_ok=False)[0]["id"] == VID2
    ok = {i["id"]: i for i in library.list_library(db, root=root, root_ok=True)}
    assert ok[VID]["unknown"] is False and ok[VID]["missing"] is False


@needs_ffmpeg
def test_delete_refused_while_target_unreachable(tmp_path, root, db, settings):
    f = make_item(tmp_path, root, db)
    shutil.move(str(root), str(tmp_path / "moved"))  # share gone
    for flag in (True, False):
        res = library.delete_item(db, settings, VID, delete_file=flag)
        assert res["ok"] is False and res["unreachable"] and "nicht erreichbar" in res["error"]
    assert db.get_video(VID)["status"] == "done" and db.get_video(VID)["file_path"] == str(f)


def test_api_library_status(env, tmp_path):
    a = env.make()
    a._cfg.storage.target_dir = str(tmp_path / "gone")
    a._db.upsert_video({"id": "abcdefghijk", "title": "Mix"})
    a._db.set_status("abcdefghijk", "done", file_path=str(tmp_path / "gone" / "x.mp3"))
    lib = a.get_library()
    assert lib[0]["unknown"] is True and lib[0]["missing"] is False
    st = a.get_library_status()
    assert st == {"target_ok": False, "target": str(tmp_path / "gone")}
    (tmp_path / "gone").mkdir()
    assert a.get_library()[0]["missing"] is True
    assert a.get_library_status()["target_ok"] is True


# ------------------------------------------------------------------ m3 / n2


@needs_ffmpeg
def test_delete_outside_target_flags_outside_and_entry_only_works(
    tmp_path,
    root,
    db,
    settings,
):
    f = tmp_path / "old_place.mp3"
    make_mp3(f)
    add_done(db, VID, f)
    res = library.delete_item(db, settings, VID)
    assert res["ok"] is False and res["outside"] is True and f.exists()
    assert library.delete_item(db, settings, VID, delete_file=False)["ok"]
    assert f.exists() and db.get_video(VID)["status"] == "ignored"


@needs_ffmpeg
def test_delete_removes_cue_first_and_keeps_db_on_failure(
    tmp_path,
    root,
    db,
    settings,
    monkeypatch,
):
    f = make_item(tmp_path, root, db)
    cue = f.with_suffix(".cue")
    cue.write_text("x")
    real = Path.unlink

    def failing(self, *a, **k):
        if self.suffix == ".mp3":
            raise PermissionError("in use")
        return real(self, *a, **k)

    monkeypatch.setattr(Path, "unlink", failing)
    res = library.delete_item(db, settings, VID)
    assert res["ok"] is False and "in Benutzung" in res["error"]
    assert not cue.exists() and f.exists()
    assert db.get_video(VID)["status"] == "done"


# ------------------------------------------------------------------ n1, n3, n4, n5


def test_fs_lock_is_shared_with_the_downloader():
    from app.core import ytclient

    assert ytclient.FS_LOCK is library.FS_LOCK


def test_prune_waits_for_fs_lock(tmp_path):
    base = tmp_path / "m"
    d = base / "a" / "b"
    d.mkdir(parents=True)
    done = []
    with library.FS_LOCK:
        t = threading.Thread(target=lambda: done.append(library.prune_empty_dirs(d, base)))
        t.start()
        t.join(0.2)
        assert t.is_alive() and d.exists()  # blocked while the downloader holds the lock
    t.join(2)
    assert not d.exists() and len(done[0]) == 2


def test_same_file_and_case_only_rename(tmp_path):
    a = tmp_path / "mix.mp3"
    a.write_bytes(b"data")
    link = tmp_path / "Mix.mp3"
    link.symlink_to(a)  # stands in for a case-insensitive spelling of the same file
    assert library._same_file(a, link)
    assert not library._same_file(a, tmp_path / "other.mp3")
    library._move(a, link)
    assert (tmp_path / "Mix.mp3").read_bytes() == b"data"
    assert sorted(p.name for p in tmp_path.iterdir()) == ["Mix.mp3"]


def test_failed_move_removes_the_copy_at_the_target(tmp_path, monkeypatch):
    src, dst = tmp_path / "a.mp3", tmp_path / "b.mp3"
    src.write_bytes(b"x")

    def half(s, d):
        Path(d).write_bytes(b"x")
        raise OSError("source locked")

    monkeypatch.setattr(shutil, "move", half)
    with pytest.raises(OSError):
        library._move(src, dst)
    assert src.exists() and not dst.exists()


def test_prune_ignores_desktop_ini_and_thumbs(tmp_path):
    base = tmp_path / "m"
    d = base / "Hardcore" / "Art" / "2026"
    d.mkdir(parents=True)
    for n in ("desktop.ini", "Thumbs.db", "cover.jpg"):
        (d / n).write_bytes(b"x")
    assert len(library.prune_empty_dirs(d, base)) == 3 and base.exists()
    d.mkdir(parents=True)
    (d / "Desktop.ini").write_bytes(b"x")
    (d / "notes.txt").write_bytes(b"x")
    assert library.prune_empty_dirs(d, base) == [] and (d / "notes.txt").exists()


# ------------------------------------------------------------------ n6, n7, n12


def test_backups_use_a_strict_name_pattern(tmp_path):
    mine = tmp_path / "hcloader-vor-umzug.db"
    mine.write_bytes(b"x")
    names = []
    for i in range(3):
        n = f"hcloader-20260101-00000{i}.db"
        (tmp_path / n).write_bytes(b"x")
        os.utime(tmp_path / n, (1000 + i, 1000 + i))
        names.append(n)
    (tmp_path / "hcloader-20260101-000009-2.db").write_bytes(b"x")
    assert mine.name not in [b["name"] for b in maintenance.list_backups(tmp_path)]
    maintenance.prune_backups(tmp_path, 1)
    assert mine.exists()
    assert len([p for p in tmp_path.glob("hcloader-2*.db")]) == 1


def test_backup_listing_survives_vanishing_files(tmp_path, monkeypatch):
    (tmp_path / "hcloader-20260101-000000.db").write_bytes(b"x")
    (tmp_path / "hcloader-20260101-000001.db").write_bytes(b"x")
    real = Path.stat

    def flaky(self, *a, **k):
        if self.name.endswith("000000.db"):
            raise FileNotFoundError(self)
        return real(self, *a, **k)

    monkeypatch.setattr(Path, "stat", flaky)
    assert [b["name"] for b in maintenance.list_backups(tmp_path)] == [
        "hcloader-20260101-000001.db"
    ]
    assert maintenance.prune_backups(tmp_path, 1) == []
    assert maintenance.last_backup(tmp_path) is not None


def test_busy_message_is_readable(env):
    a = env.make()
    gate = threading.Event()
    t = threading.Thread(
        target=lambda: a._job("retag:abcdefghijk", lambda: gate.wait(3) and {"ok": True}, 5)
    )
    t.start()
    for _ in range(100):
        if a._worker.other_job("backup"):
            break
        time.sleep(0.02)
    res = a._job("backup", lambda: {"ok": True}, 5)
    gate.set()
    t.join(3)
    assert "Neu taggen" in res["error"] and "retag:" not in res["error"]


def test_sidecar_names_differ_by_id_case_and_legacy_is_read(tmp_path):
    a, b = "abcdefghijA", "abcdefghija"
    assert sidecar.sidecar_path(a).name.lower() != sidecar.sidecar_path(b).name.lower()
    legacy = sidecar.meta_dir() / f"{a}.json"
    legacy.parent.mkdir(parents=True, exist_ok=True)
    legacy.write_text('{"id": "abcdefghijA", "title": "old"}', encoding="utf-8")
    assert sidecar.read(a)["title"] == "old"
    assert sidecar.read(b) is None or sidecar.read(b)["id"] == b
    sidecar.write(a, {"id": a, "title": "new"})
    assert sidecar.read(a)["title"] == "new" and not legacy.exists()  # migrated
    sidecar.delete(a)
    assert sidecar.read(a) is None
