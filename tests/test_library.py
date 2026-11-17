import socket
from pathlib import Path

import pytest
from mutagen.id3 import ID3
from test_tagging import make_image, make_mp3, needs_ffmpeg

from app.core import library, sidecar, tagging
from app.core.config import Settings
from app.core.tagging import Chapter

# pre-v0.2.0 behaviour tests assert the German texts (pins the de catalog)
pytestmark = pytest.mark.usefixtures("german_messages")

VID = "abc123XYZ_-"
VID2 = "def456UVW_-"


@pytest.fixture
def settings(tmp_path):
    s = Settings()
    s.storage.target_dir = str(tmp_path / "music")
    return s


@pytest.fixture
def root(settings):
    p = settings.target_dir_path()
    p.mkdir(parents=True)
    return p


def add_done(db, vid, path, **fields):
    row = {
        "id": vid,
        "title": "Partyraiser @ Hardcore Mix",
        "channel_id": "UC1",
        "channel_name": "Partyraiser",
        "duration": 7200,
        "upload_date": "20261003",
        "genre": "Unsortiert",
    }
    db.upsert_video({**row, **fields})
    db.set_status(vid, "done", file_path=str(path))


def make_item(tmp_path, root, db, vid=VID, rel="Unsortiert/Partyraiser/2026", name="old.mp3", **kw):
    folder = root / rel
    folder.mkdir(parents=True, exist_ok=True)
    f = make_mp3(folder / name)
    add_done(db, vid, f, **kw)
    return f


# ------------------------------------------------------------------ within / prune


def test_within(tmp_path):
    root = tmp_path / "music"
    (root / "a").mkdir(parents=True)
    assert library.within(root / "a" / "x.mp3", root)
    assert not library.within(root, root)
    assert not library.within(root / ".." / "x.mp3", root)
    assert not library.within(tmp_path / "music2" / "x.mp3", root)
    link = root / "evil"
    try:
        link.symlink_to(tmp_path)
    except OSError:
        return
    assert not library.within(link / "x.mp3", root)


def test_prune_stops_at_non_empty_and_root(tmp_path):
    root = tmp_path / "music"
    deep = root / "G" / "A" / "2026"
    deep.mkdir(parents=True)
    (root / "G" / "keep.txt").write_text("x")
    (deep / "cover.jpg").write_bytes(b"x")
    removed = library.prune_empty_dirs(deep, root)
    assert [p.name for p in removed] == ["2026", "A"]
    assert (root / "G" / "keep.txt").exists() and root.exists()
    assert library.prune_empty_dirs(root, root) == []


# ------------------------------------------------------------------ list / filters


@needs_ffmpeg
def test_list_library_filters_and_flags(tmp_path, root, db):
    f1 = make_item(tmp_path, root, db, genre="Hardcore")
    f1.with_suffix(".cue").write_text("x")
    add_done(
        db,
        VID2,
        root / "gone.mp3",
        title="Ümlaut Set",
        channel_id="UC2",
        channel_name="Other",
        genre="Hardstyle",
        upload_date="20250101",
        duration=None,
    )
    db.upsert_video({"id": "ghi789RST_-", "title": "not done"})
    items = library.list_library(db)
    assert {i["id"] for i in items} == {VID, VID2}
    a = next(i for i in items if i["id"] == VID)
    b = next(i for i in items if i["id"] == VID2)
    assert a["missing"] is False and a["has_cue"] is True and a["size_mb"] >= 0
    assert a["year"] == "2026" and a["duration"] == 7200
    assert b["missing"] is True and b["size_mb"] == 0.0 and b["has_cue"] is False
    ids = lambda **f: [i["id"] for i in library.list_library(db, f)]  # noqa: E731
    assert ids(genre="Hardstyle") == [VID2]
    assert ids(year=2026) == [VID]
    assert ids(year="2025") == [VID2]
    assert ids(channel="UC2") == [VID2] and ids(channel="Partyraiser") == [VID]
    assert ids(search="umlaut") == [VID2]  # umlaut-insensitive
    assert ids(search="PARTYRAISER") == [VID]
    assert ids(missing=True) == [VID2] and ids(missing=False) == [VID]
    assert ids(genre="Hardcore", year=2025) == []
    assert a["duration"] == 7200
    # no DB duration -> read from the file
    db.upsert_video({"id": VID, "duration": None})
    db.execute("UPDATE videos SET duration=NULL WHERE id=?", (VID,))
    assert library.list_library(db, {"search": "hardcore"})[0]["duration"] in (2, 3)


# ------------------------------------------------------------------ reveal


def test_reveal(tmp_path):
    f = tmp_path / "A B" / "x y.mp3"
    f.parent.mkdir()
    f.write_bytes(b"")
    opened, spawned = [], []
    library.reveal(
        f, opener=opened.append, platform="win32", popen=lambda *a, **k: spawned.append(a)
    )
    assert spawned == [(f'explorer /select,"{f}"',)] and opened == []
    library.reveal(
        f, opener=opened.append, platform="linux", popen=lambda *a, **k: spawned.append(a)
    )
    assert opened == [f.parent] and len(spawned) == 1
    gone = f.parent / "gone.mp3"  # file missing: open the folder instead
    library.reveal(gone, opener=opened.append, platform="win32", popen=lambda *a, **k: 1 / 0)
    assert opened[-1] == f.parent


# ------------------------------------------------------------------ retag


@pytest.fixture
def no_network(monkeypatch):
    def deny(*a, **k):
        raise AssertionError("network access during re-tag")

    monkeypatch.setattr(socket.socket, "connect", deny)
    monkeypatch.setattr(socket, "create_connection", deny)


def tagged_item(tmp_path, root, db, **kw):
    f = make_item(tmp_path, root, db, **kw)
    cover = tagging.make_square_cover(make_image(tmp_path / "c.png"))
    tagging.write_tags(f, {"title": "old", "artist": "old", "id": VID}, cover_jpeg=cover)
    (f.parent / "cover.jpg").write_bytes(cover)
    sidecar.write(
        VID,
        {
            "id": VID,
            "title": "Partyraiser @ Hardcore Mix (Official Video)",
            "channel_name": "Partyraiser",
            "upload_date": "20261003",
            "duration": 7200,
            "description": "",
            "chapters": [
                {"start": 0, "end": 60, "title": "Intro"},
                {"start": 60, "end": 7200, "title": "DJ B - Main"},
            ],
            "genre": "Unsortiert",
            "url": f"https://www.youtube.com/watch?v={VID}",
        },
    )
    return f


@needs_ffmpeg
def test_retag_moves_to_new_genre_and_keeps_cover(tmp_path, root, db, settings, no_network):
    f = tagged_item(tmp_path, root, db)
    f.with_suffix(".cue").write_text("stale")
    res = library.retag(db, settings, VID)
    assert res["ok"] and res["moved"] and res["genre"] == "Hardcore" and res["sidecar"]
    new = Path(res["path"])
    assert new.relative_to(root).parts[:3] == ("Hardcore", "Partyraiser", "2026")
    assert new.is_file() and not f.exists()
    assert not f.with_suffix(".cue").exists() and new.with_suffix(".cue").is_file()
    assert not (root / "Unsortiert").exists()  # old folders incl. lone cover.jpg pruned
    tags = ID3(new)
    assert str(tags["TIT2"]) == "Partyraiser @ Hardcore Mix"  # cleanup patterns applied
    assert str(tags["TCON"]) == "Hardcore" and tags.getall("APIC")
    assert len(tags.getall("CHAP")) == 2
    row = db.get_video(VID)
    assert row["file_path"] == str(new) and row["genre"] == "Hardcore" and row["status"] == "done"
    assert 'FILE "' + new.name + '" MP3' in new.with_suffix(".cue").read_text(encoding="utf-8-sig")
    assert sidecar.read(VID)["genre"] == "Hardcore"
    # settings change: template without genre folder -> moved again, cue moves along
    settings.storage.path_template = "{artist}/{title} [{id}]"
    res = library.retag(db, settings, VID)
    assert res["ok"] and res["moved"]
    again = Path(res["path"])
    assert again.relative_to(root).parts[0] == "Partyraiser" and again.with_suffix(".cue").is_file()
    assert not (root / "Hardcore").exists() and not new.with_suffix(".cue").exists()
    assert library.retag(db, settings, VID)["moved"] is False  # idempotent


@needs_ffmpeg
def test_retag_artist_from_title_and_cue_toggle(tmp_path, root, db, settings):
    tagged_item(tmp_path, root, db)
    settings.storage.artist_from_title = True
    settings.download.write_cue = False
    res = library.retag(db, settings, VID)
    new = Path(res["path"])
    assert str(ID3(new)["TPE1"]) == "Partyraiser" and res["cue"] is False
    assert not new.with_suffix(".cue").exists()


@needs_ffmpeg
def test_retag_without_sidecar_keeps_chapters_from_file(tmp_path, root, db, settings):
    f = make_item(tmp_path, root, db)
    tagging.write_tags(
        f,
        {"title": "x", "artist": "y"},
        chapters=[Chapter(0, "A", 30), Chapter(30, "B", 100)],
        total_duration=100,
    )
    res = library.retag(db, settings, VID)
    assert res["ok"] and res["sidecar"] is False
    new = Path(res["path"])
    assert len(ID3(new).getall("CHAP")) == 2 and new.with_suffix(".cue").is_file()


@needs_ffmpeg
def test_retag_conflicts_and_errors(tmp_path, root, db, settings, monkeypatch):
    f = tagged_item(tmp_path, root, db)
    target = Path(library.retag(db, settings, VID)["path"])
    # a second item with the same metadata: the id in the name keeps the targets apart
    make_item(tmp_path, root, db, vid=VID2, name="other.mp3", title="Partyraiser @ Hardcore Mix")
    sidecar.write(VID2, {**sidecar.read(VID), "id": VID2})
    blocked = library.retag(db, settings, VID2)
    assert blocked["ok"] is True  # different id in the name: no clash
    assert Path(blocked["path"]) != target
    # missing file / unknown id / not done
    f2n = Path(db.get_video(VID2)["file_path"])
    f2n.unlink()
    assert "Datei fehlt" in library.retag(db, settings, VID2)["error"]
    assert library.retag(db, settings, "zzzzzzzzzzz")["ok"] is False
    # tag write failure leaves DB and file untouched
    monkeypatch.setattr(tagging, "write_tags", lambda *a, **k: 1 / 0)
    before = db.get_video(VID)["file_path"]
    res = library.retag(db, settings, VID)
    assert res["ok"] is False and db.get_video(VID)["file_path"] == before
    assert f.exists() is False and Path(before).exists()


@needs_ffmpeg
def test_retag_file_outside_target_is_tagged_in_place(tmp_path, root, db, settings):
    outside = tmp_path / "elsewhere"
    outside.mkdir()
    f = make_mp3(outside / "x.mp3")
    add_done(db, VID, f)
    res = library.retag(db, settings, VID)
    assert res["ok"] and res["moved"] is False and Path(res["path"]) == f
    assert str(ID3(f)["TCON"]) == "Hardcore"


@needs_ffmpeg
def test_retag_target_exists(tmp_path, root, db, settings):
    tagged_item(tmp_path, root, db)
    expected = library.retag(db, settings, VID)
    target = Path(expected["path"])
    # move away again and block the target path with a foreign file
    back = root / "Unsortiert" / "Partyraiser" / "2026" / "old.mp3"
    back.parent.mkdir(parents=True)
    target.rename(back)
    db.set_file_path(VID, str(back))
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(b"foreign")
    res = library.retag(db, settings, VID)
    assert res["ok"] is False and "existiert bereits" in res["error"]
    assert back.exists() and db.get_video(VID)["file_path"] == str(back)


# ------------------------------------------------------------------ delete


@needs_ffmpeg
def test_delete_removes_file_cue_cover_and_empty_dirs(tmp_path, root, db, settings):
    f = tagged_item(tmp_path, root, db)
    f.with_suffix(".cue").write_text("x")
    archive = tmp_path / "archive.txt"
    archive.write_text(f"youtube {VID}\n")
    res = library.delete_item(db, settings, VID)
    assert res["ok"] and sorted(res["deleted"]) == ["old.cue", "old.mp3"]
    assert not (root / "Unsortiert").exists() and root.exists()
    row = db.get_video(VID)
    assert row["status"] == "ignored" and row["file_path"] is None
    assert sidecar.read(VID) is None and archive.read_text() == f"youtube {VID}\n"
    assert library.list_library(db) == []


@needs_ffmpeg
def test_delete_keeps_cover_while_other_mixes_share_the_folder(tmp_path, root, db, settings):
    f = tagged_item(tmp_path, root, db)
    other = make_mp3(f.parent / "other.mp3")
    assert library.delete_item(db, settings, VID)["ok"]
    assert (f.parent / "cover.jpg").exists() and other.exists()


@needs_ffmpeg
def test_delete_refuses_outside_target(tmp_path, root, db, settings):
    outside = make_mp3(tmp_path / "precious.mp3")
    add_done(db, VID, outside)
    res = library.delete_item(db, settings, VID)
    assert res["ok"] is False and "ausserhalb" in res["error"]
    assert outside.exists() and db.get_video(VID)["status"] == "done"
    # traversal in the stored path
    sneaky = root / ".." / "precious.mp3"
    db.set_file_path(VID, str(sneaky))
    assert library.delete_item(db, settings, VID)["ok"] is False and outside.exists()
    # entry-only removal is allowed for such items
    res = library.delete_item(db, settings, VID, delete_file=False)
    assert res["ok"] and outside.exists() and db.get_video(VID)["status"] == "ignored"


@needs_ffmpeg
def test_delete_without_file_and_missing_file(tmp_path, root, db, settings):
    f = tagged_item(tmp_path, root, db)
    res = library.delete_item(db, settings, VID, delete_file=False)
    assert res["ok"] and f.exists() and res["deleted"] == []
    add_done(db, VID2, root / "Hardcore" / "gone.mp3")  # file already gone
    assert library.delete_item(db, settings, VID2)["ok"]
    assert library.delete_item(db, settings, VID2)["ok"] is False  # not in the library anymore


@needs_ffmpeg
def test_delete_locked_file_changes_nothing(tmp_path, root, db, settings, monkeypatch):
    f = tagged_item(tmp_path, root, db)

    def locked(self, *a, **k):
        raise PermissionError("in use")

    monkeypatch.setattr(Path, "unlink", locked)
    res = library.delete_item(db, settings, VID)
    monkeypatch.undo()
    assert res["ok"] is False and "Benutzung" in res["error"]
    assert f.exists() and db.get_video(VID)["status"] == "done"
