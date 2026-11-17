"""Phase 8: player backend (file URLs, cover cache, chapter sources, path rules, external)."""

from pathlib import Path
from urllib.parse import unquote, urlparse
from urllib.request import url2pathname

import pytest
from mutagen.id3 import APIC, CHAP, ID3, TIT2

from app.core import config, player, sidecar
from app.core.config import Settings
from app.core.tagging import Chapter

VID = "abc123XYZ_-"
JPEG = b"\xff\xd8\xff\xe0fake-jpeg\xff\xd9"


@pytest.fixture
def settings(tmp_path):
    s = Settings()
    s.storage.target_dir = str(tmp_path / "music")
    return s


@pytest.fixture
def root(tmp_path):
    p = tmp_path / "music"
    p.mkdir()
    return p


def make_file(path: Path, *, cover=False, chap=None) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b"\xff\xfb\x90\x00" * 64)
    tags = ID3()
    tags.add(TIT2(encoding=3, text="T"))
    if cover:
        tags.add(APIC(encoding=3, mime="image/jpeg", type=3, desc="", data=JPEG))
    for i, (start, title) in enumerate(chap or []):
        tags.add(
            CHAP(
                element_id=f"ch{i}",
                start_time=int(start * 1000),
                end_time=int(start * 1000) + 1000,
                start_offset=0xFFFFFFFF,
                end_offset=0xFFFFFFFF,
                sub_frames=[TIT2(encoding=3, text=title)],
            )
        )
    tags.save(path)
    return path


def add_done(db, path, vid=VID, **kw):
    db.upsert_video({"id": vid, "title": "Mix", "channel_name": "DJ", "duration": 3600, **kw})
    db.set_status(vid, "done", file_path=str(path))


def back(url: str) -> Path:
    return Path(url2pathname(urlparse(url).path))


@pytest.mark.parametrize(
    "name",
    [
        "plain.mp3",
        "with space.mp3",
        "a#b.mp3",
        "50% off.mp3",
        "Müller Ärger Öl.mp3",
        "Mix [abc123XYZ_-].mp3",
        "q?x (1) {2} ~ & = + ;,.mp3",
    ],
)
def test_file_url_roundtrip_special_characters(tmp_path, name):
    f = make_file(tmp_path / "Ordner #1 [x]" / name)
    url = player.file_url(f)
    assert url.startswith("file:")
    assert "#" not in url[5:] and "?" not in url and " " not in url
    assert "[" not in url and "]" not in url
    assert back(url).resolve() == f.resolve()
    assert unquote(urlparse(url).path)  # decodes cleanly


def test_get_media_basic_and_cover_cache(db, settings, root):
    f = make_file(root / "G" / "DJ" / "Mix #1 [abc123XYZ_-].mp3", cover=True)
    add_done(db, f, genre="Hardcore", platform="youtube")
    res = player.get_media(db, settings, VID)
    assert res["ok"] and res["id"] == VID
    assert back(res["src"]) == f.resolve()
    assert res["title"] == "Mix" and res["artist"] == "DJ" and res["genre"] == "Hardcore"
    assert res["platform"] == "youtube" and res["duration"] == 3600.0
    assert res["chapters"] == []
    cover = back(res["cover"])
    assert cover.read_bytes() == JPEG
    assert cover.parent == config.app_home() / "cache" / "covers"
    assert cover.name == f"{sidecar.sidecar_path(VID).stem}.jpg"
    # reused: not rewritten while the audio file is unchanged
    cover.write_bytes(b"cached")
    assert back(player.get_media(db, settings, VID)["cover"]).read_bytes() == b"cached"


def test_no_cover_gives_none(db, settings, root):
    f = make_file(root / "a.mp3")
    add_done(db, f)
    res = player.get_media(db, settings, VID)
    assert res["ok"] and res["cover"] is None
    assert not (config.app_home() / "cache" / "covers").exists()


def test_m4a_cover(db, settings, root, monkeypatch):
    f = root / "a.m4a"
    f.write_bytes(b"x")
    add_done(db, f)
    monkeypatch.setattr(player.library, "extract_cover", lambda p: JPEG if p == f else None)
    assert back(player.get_media(db, settings, VID)["cover"]).read_bytes() == JPEG


def test_duration_from_mutagen_when_db_empty(db, settings, root, monkeypatch):
    f = make_file(root / "a.mp3")
    add_done(db, f, duration=None)

    class Info:
        length = 12.5

    class Fake:
        info = Info()

    monkeypatch.setattr(player, "MutagenFile", lambda p: Fake())
    assert player.get_media(db, settings, VID)["duration"] == 12.5


CUE = (
    'PERFORMER "DJ"\nTITLE "Mix"\nFILE "a.mp3" MP3\n'
    '  TRACK 01 AUDIO\n    TITLE "Intro"\n    PERFORMER "DJ"\n    INDEX 01 00:00:00\n'
    '  TRACK 02 AUDIO\n    TITLE "Hit"\n    PERFORMER "Other"\n    INDEX 01 01:30:37\n'
)


def test_chapters_order_sidecar_then_chap_then_cue(db, settings, root):
    f = make_file(root / "a.mp3", chap=[(5, "Chap One"), (65.5, "Chap Two")])
    f.with_suffix(".cue").write_text(CUE, encoding="utf-8-sig")
    add_done(db, f)
    # 1. sidecar wins
    sidecar.write(VID, {"id": VID, "chapters": [{"start": 10, "title": "DJX - Side", "end": 20}]})
    ch = player.get_media(db, settings, VID)["chapters"]
    assert ch == [{"start": 10.0, "title": "Side", "performer": "DJX"}]
    # 2. no sidecar -> ID3 CHAP
    sidecar.delete(VID)
    ch = player.get_media(db, settings, VID)["chapters"]
    assert [(c["start"], c["title"], c["performer"]) for c in ch] == [
        (5.0, "Chap One", "DJ"),
        (65.5, "Chap Two", "DJ"),
    ]
    # 3. no CHAP -> CUE
    make_file(f)
    ch = player.get_media(db, settings, VID)["chapters"]
    assert [c["title"] for c in ch] == ["Intro", "Hit"]
    assert ch[0]["start"] == 0.0 and ch[1]["start"] == pytest.approx(90 + 37 / 75)
    assert ch[1]["performer"] == "Other"
    # 4. nothing at all
    f.with_suffix(".cue").unlink()
    assert player.get_media(db, settings, VID)["chapters"] == []


def test_sidecar_chapters_roundtrip_with_tagging_chapter(db, settings, root):
    f = make_file(root / "a.mp3")
    add_done(db, f)
    data = sidecar.build({"id": VID}, chapters=[Chapter(0, "A", 30), Chapter(30, "B", None)])
    sidecar.write(VID, data)
    assert [c["start"] for c in player.get_media(db, settings, VID)["chapters"]] == [0.0, 30.0]


def test_missing_file(db, settings, root):
    add_done(db, root / "gone.mp3")
    assert player.get_media(db, settings, VID) == {"ok": False, "error": "Datei fehlt"}
    assert player.play_external(db, settings, VID, popen=lambda *a, **k: 1)["ok"] is False


def test_unknown_or_not_done(db, settings, root):
    assert player.get_media(db, settings, "nope")["ok"] is False
    f = make_file(root / "a.mp3")
    db.upsert_video({"id": VID, "title": "x"})
    db.set_status(VID, "queued")
    assert player.get_media(db, settings, VID)["ok"] is False
    db.set_status(VID, "done", file_path=str(f))
    assert player.get_media(db, settings, VID)["ok"] is True


def test_file_outside_current_target_folder_still_playable(db, settings, root, tmp_path):
    """Target folder changed later: old mixes stay playable (read only)."""
    out = make_file(tmp_path / "elsewhere" / "a.mp3")
    add_done(db, out)
    assert player.get_media(db, settings, VID)["ok"] is True


def test_only_audio_files_are_played(db, settings, root, tmp_path):
    exe = tmp_path / "evil.exe"
    exe.write_bytes(b"MZ")
    add_done(db, exe)
    res = player.get_media(db, settings, VID)
    assert res["ok"] is False and "Audiodatei" in res["error"]
    calls = []
    ext = player.play_external(
        db, settings, VID, platform="linux", popen=lambda *a, **k: calls.append(a)
    )
    assert ext["ok"] is False and calls == []


def test_play_external_platforms(db, settings, root):
    f = make_file(root / "a b#.mp3")
    add_done(db, f)
    opened, cmds = [], []
    assert player.play_external(db, settings, VID, platform="win32", startfile=opened.append) == {
        "ok": True
    }
    assert opened == [str(f)]
    assert player.play_external(
        db, settings, VID, platform="linux", popen=lambda c, **k: cmds.append(c)
    ) == {"ok": True}
    assert player.play_external(
        db, settings, VID, platform="darwin", popen=lambda c, **k: cmds.append(c)
    ) == {"ok": True}
    assert cmds == [["xdg-open", str(f)], ["open", str(f)]]


def test_play_external_os_error(db, settings, root):
    f = make_file(root / "a.mp3")
    add_done(db, f)

    def boom(*a, **k):
        raise FileNotFoundError("xdg-open")

    res = player.play_external(db, settings, VID, platform="linux", popen=boom)
    assert res["ok"] is False and "xdg-open" in res["error"]


def test_api_delegation(tmp_path, monkeypatch, root):
    from app.api import Api

    api = Api(config_file=tmp_path / "c.yaml", db=None)
    try:
        f = make_file(root / "a.mp3")
        api._cfg.storage.target_dir = str(root)
        add_done(api._db, f)
        assert api.get_media(VID)["ok"] is True
        monkeypatch.setattr(player.subprocess, "Popen", lambda *a, **k: None)
        monkeypatch.setattr(player.sys, "platform", "linux")
        assert api.play_external(VID) == {"ok": True}
    finally:
        api.shutdown()


def test_player_setting_default_and_validation():
    s = config.defaults()
    assert s.player.mode == "internal"
    values = s.to_dict()
    values["player"]["mode"] = "external"
    parsed, errors = config.parse_settings(values)
    assert not errors and parsed.player.mode == "external"
    values["player"]["mode"] = "vlc"
    assert "player.mode" in config.validate_settings(values)
