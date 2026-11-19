"""Review v0.10.0 M1: «Delete this newer file» only while the original file is present; with the
original gone the copy can replace it (adopt). The archive never blocks a re-download when no
copy remains."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.core import config, fingerprint, library, platforms
from app.core.db import Database

ORIG = "abcdefghijk"
COPY = "mc:DJ_X_reup"


@pytest.fixture
def setup(db: Database, tmp_path: Path):
    s = config.defaults()
    root = tmp_path / "music"
    root.mkdir()
    s.storage.target_dir = str(root)
    files = {}
    for vid, when in ((ORIG, "2026-10-01T10:00:00"), (COPY, "2026-11-01T10:00:00")):
        f = root / f"{vid.replace(':', '-')}.mp3"
        f.write_bytes(b"audio")
        files[vid] = f
        db.upsert_video({"id": vid, "title": vid, "duration": 600, "channel_name": "DJ"})
        db.set_status(vid, "done", file_path=str(f))
        db.execute("UPDATE videos SET downloaded_at=? WHERE id=?", (when, vid))
    fingerprint.mark(db, COPY, ORIG, fingerprint.Match(score=0.6, offset_s=1.5))
    archive = config.archive_path()
    archive.parent.mkdir(parents=True, exist_ok=True)
    archive.write_text(
        platforms.archive_line(ORIG) + "\n" + platforms.archive_line(COPY) + "\n",
        encoding="utf-8",
    )
    return db, s, files


def _archive() -> list[str]:
    return config.archive_path().read_text(encoding="utf-8").splitlines()


def test_original_state(setup):
    db, s, files = setup
    root = s.target_dir_path()
    assert library.original_state(db, ORIG, root) == "ok"
    assert library.original_state(db, ORIG, root, root_ok=False) == "unknown"
    files[ORIG].unlink()
    assert library.original_state(db, ORIG, root) == "missing"
    db.set_status(ORIG, "queued")
    assert library.original_state(db, ORIG, root) == "gone"
    assert library.original_state(db, "nope", root) == "gone"


def test_annotate_and_list_report_presence(setup):
    db, s, files = setup
    root = s.target_dir_path()
    items = library.annotate_reuploads(db, [{"id": COPY}, {"id": ORIG}], root, True)
    assert items[0]["reupload"]["of"]["present"] == "ok" and items[1]["reupload"] is None
    assert [i["id"] for i in library.annotate_reuploads(db, items, root, True, only_open=True)] == [
        COPY
    ]
    files[ORIG].unlink()
    listed = library.list_reuploads(db, root, True)
    assert [i["id"] for i in listed] == [COPY]
    assert listed[0]["reupload"]["of"]["present"] == "missing"


def test_delete_new_with_original_present_deletes_copy_keeps_archive(setup):
    db, s, files = setup
    res = library.delete_reupload(db, s, COPY)
    assert res["ok"] and not files[COPY].exists() and files[ORIG].exists()
    assert db.get_video(COPY)["status"] == "ignored"
    assert platforms.archive_line(COPY) in _archive()  # original survives: never fetch again
    assert "archive_removed" not in res


@pytest.mark.parametrize("how", ["file_deleted", "requeued", "failed"])
def test_delete_new_refused_when_original_missing(setup, how):
    db, s, files = setup
    if how == "file_deleted":
        files[ORIG].unlink()
    else:
        db.set_status(ORIG, how.replace("requeued", "queued"))
    res = library.delete_reupload(db, s, COPY)
    assert not res["ok"] and res["original"] in ("missing", "gone")
    assert "original" in res["error"].lower() or "Original" in res["error"]
    assert files[COPY].exists() and db.get_video(COPY)["status"] == "done"
    assert platforms.archive_line(COPY) in _archive()


def test_delete_new_refused_when_target_unreachable(setup, monkeypatch):
    db, s, files = setup
    monkeypatch.setattr(library, "target_reachable", lambda root, timeout=0: False)
    res = library.delete_reupload(db, s, COPY)
    assert not res["ok"] and res["original"] == "unknown" and files[COPY].exists()


def test_delete_new_original_vanishes_meanwhile_frees_archive(setup, monkeypatch):
    """Explorer deletes the original during the delete: the copy is gone too, so its archive
    line goes and the watchlist may fetch it again."""
    db, s, files = setup
    real = library._delete_item

    def racing(*a, **kw):
        files[ORIG].unlink()
        return real(*a, **kw)

    monkeypatch.setattr(library, "_delete_item", racing)
    res = library.delete_reupload(db, s, COPY)
    assert res["ok"] and res["archive_removed"] is True
    assert platforms.archive_line(COPY) not in _archive()
    assert platforms.archive_line(ORIG) in _archive()


def test_adopt_replaces_missing_original(setup):
    db, s, files = setup
    assert library.adopt_reupload(db, s, COPY)["ok"] is False  # original still there
    files[ORIG].unlink()
    res = library.adopt_reupload(db, s, COPY)
    assert res == {"ok": True, "id": COPY, "removed": ORIG, "reupload": None}
    assert db.get_video(ORIG)["status"] == "ignored"
    assert db.get_video(COPY)["status"] == "done" and files[COPY].exists()
    assert fingerprint.info_of(db, COPY) is None


def test_adopt_with_original_gone_only_drops_mark(setup):
    db, s, _files = setup
    db.set_status(ORIG, "failed")
    res = library.adopt_reupload(db, s, COPY)
    assert res["ok"] and res["removed"] is None
    assert db.get_video(ORIG)["status"] == "failed" and fingerprint.info_of(db, COPY) is None


def test_archive_forget_without_file():
    assert library.archive_forget("abcdefghijk") is False


def test_api_resolve_reupload_delete_and_adopt(setup, tmp_path):
    from app.api import Api
    from app.worker import EventBus

    db, s, files = setup
    cfg = config.save(s, tmp_path / "config.yaml")
    api = Api(bus=EventBus(), config_file=cfg, db=db, configure_logging=False)
    try:
        files[ORIG].unlink()
        lib = api.get_library()
        mark = next(i for i in lib if i["id"] == COPY)["reupload"]
        assert mark["of"]["present"] == "missing"
        res = api.resolve_reupload(COPY, "delete_new")
        assert not res["ok"] and files[COPY].exists()
        res = api.resolve_reupload(COPY, "adopt")
        assert res["ok"] and res["removed"] == ORIG
        assert [i["id"] for i in api.get_library()] == [COPY]
        assert api.get_reuploads()["items"] == []
    finally:
        api.shutdown()
