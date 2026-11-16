"""Phase 5 acceptance: a chapter mix goes through the download pipeline and the resulting
.cue is validated by an independent parser (no network, yt-dlp is faked)."""

import re
from pathlib import Path

import pytest
from test_ytclient import FakeYDL, needs_ffmpeg

from app.core import sidecar, ytclient
from app.core.config import Settings
from app.core.tagging import Chapter, write_cue
from app.core.throttle import Throttle
from app.core.ytclient import YtClient

VID = "abc123XYZ_-"
_QUOTED = re.compile(r'^(PERFORMER|TITLE) "([^"]*)"$')
_FILE = re.compile(r'^FILE "([^"]+)" (MP3|WAVE)$')
_TRACK = re.compile(r"^TRACK (\d{2}) AUDIO$")
_INDEX = re.compile(r"^INDEX 01 (\d+):(\d{2}):(\d{2})$")


def parse_cue(path: Path) -> dict:
    """Strict CUE reader/validator for HCLoader's output; asserts the format rules."""
    raw = path.read_bytes()
    assert raw.startswith(b"\xef\xbb\xbf"), "UTF-8-BOM fehlt"
    assert b"\r" not in raw
    text = raw.decode("utf-8-sig")
    cue = {"file": None, "ftype": None, "tracks": [], "global": {}}
    cur = None
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if m := _FILE.match(stripped):
            assert cue["file"] is None, "mehrere FILE-Zeilen"
            cue["file"], cue["ftype"] = m.group(1), m.group(2)
        elif m := _TRACK.match(stripped):
            cur = {"no": int(m.group(1)), "fields": {}, "index": None}
            cue["tracks"].append(cur)
        elif m := _QUOTED.match(stripped):  # raises on an unescaped inner quote
            (cur["fields"] if cur else cue["global"])[m.group(1)] = m.group(2)
        elif m := _INDEX.match(stripped):
            mm, ss, ff = (int(x) for x in m.groups())
            assert ss < 60 and ff < 75, f"ungültige Zeit {stripped}"
            cur["index"] = (mm, ss, ff)
        else:
            raise AssertionError(f"unbekannte Zeile: {line!r}")
    return cue


def seconds(index) -> float:
    mm, ss, ff = index
    return mm * 60 + ss + ff / 75


def validate(cue: dict, audio: Path) -> None:
    assert cue["file"] == audio.name and cue["ftype"] == "MP3"
    assert (audio.parent / cue["file"]).is_file()
    tracks = cue["tracks"]
    assert tracks, "keine Tracks"
    assert [t["no"] for t in tracks] == list(range(1, len(tracks) + 1))
    assert len(tracks) <= 99
    starts = [seconds(t["index"]) for t in tracks]
    assert tracks[0]["index"] == (0, 0, 0)
    assert all(b > a for a, b in zip(starts, starts[1:], strict=False)), "INDEX nicht monoton"
    for t in tracks:
        assert t["fields"].get("TITLE"), "TITLE fehlt"
        assert "PERFORMER" in t["fields"]


@pytest.fixture
def settings(tmp_path):
    s = Settings()
    s.storage.target_dir = str(tmp_path / "music")
    s.throttle.sleep_requests = 0
    s.network.po_token_mode = "off"
    return s


@pytest.fixture
def client(settings, db, monkeypatch):
    monkeypatch.setenv("HCLOADER_BIN_DIR", str(settings.target_dir_path().parent / "bin"))
    monkeypatch.setattr(ytclient.yt_dlp, "YoutubeDL", FakeYDL)
    FakeYDL.instances, FakeYDL.errors, FakeYDL.make_files = [], [], True
    return YtClient(
        lambda: settings, db, Throttle(db, lambda: settings.throttle, sleep=lambda s: None)
    )


def info(**extra) -> dict:
    return {
        "id": VID,
        "title": 'Partyraiser @ "Masters" of Hardcore 2026',
        "channel": 'Party"raiser',
        "channel_id": "UC1",
        "duration": 7200,
        "upload_date": "20261003",
        "thumbnail": "https://i.ytimg.com/x.jpg",
        "webpage_url": f"https://www.youtube.com/watch?v={VID}",
        **extra,
    }


@needs_ffmpeg
def test_chapter_mix_from_info_chapters_gives_valid_cue(client):
    FakeYDL.info = info(
        chapters=[
            {"start_time": 0, "end_time": 600, "title": 'Intro "Warm Up"'},
            {"start_time": 600, "end_time": 3600, "title": "DJ B - Hardcore Anthem"},
            {"start_time": 3600.5, "end_time": 6100, "title": "Ümläut – Track\nzwei"},
            {"start_time": 6100, "end_time": 7200, "title": "Over 99 minutes"},  # 101:40
            {"start_time": 6100, "end_time": 7200, "title": "duplicate stamp"},
            {"start_time": 9000, "end_time": 9500, "title": "beyond the end"},
        ]
    )
    res = client.download(VID)
    assert res.status == "done" and res.cue_path
    cue = parse_cue(res.cue_path)
    validate(cue, res.file_path)
    assert [t["fields"]["TITLE"] for t in cue["tracks"]] == [
        "'Warm Up'".join(["Intro ", ""]),  # `"` replaced by `'`
        "Hardcore Anthem",
        "Ümläut – Track zwei",
        "Over 99 minutes",
    ]
    assert cue["tracks"][1]["fields"]["PERFORMER"] == "DJ B"
    assert cue["global"]["PERFORMER"] == "Party'raiser"
    assert cue["tracks"][3]["index"] == (101, 40, 0)  # minutes may exceed 99
    assert cue["tracks"][2]["index"] == (60, 0, 38)  # 3600.5 s = 38 frames
    assert sidecar.read(VID)["chapters"][3]["title"] == "Over 99 minutes"


@needs_ffmpeg
def test_chapter_mix_from_description_timestamps_gives_valid_cue(client):
    FakeYDL.info = info(
        description="\n".join(
            [
                "Tracklist",
                '00:30 First "quoted" - Intro',  # first stamp not at 0
                "05:00 Second",
                "05:00 Second again (duplicate)",
                "1:41:40 Late track",  # over 99 minutes
                "2:30:00 beyond the duration of 2 h",
                "not a stamp",
            ]
        )
    )
    res = client.download(VID)
    cue = parse_cue(res.cue_path)
    validate(cue, res.file_path)
    assert [t["index"] for t in cue["tracks"]] == [(0, 0, 0), (5, 0, 0), (101, 40, 0)]
    assert cue["tracks"][0]["fields"]["TITLE"] == "Intro"
    assert cue["tracks"][0]["fields"]["PERFORMER"] == "First 'quoted'"


@needs_ffmpeg
def test_no_chapters_no_cue(client):
    FakeYDL.info = info(description="nothing here")
    res = client.download(VID)
    assert res.status == "done" and res.cue_path is None
    assert sidecar.read(VID)["chapters"] == []


def test_write_cue_edge_cases(tmp_path):
    audio = tmp_path / "Mix [x].mp3"
    audio.write_bytes(b"")
    chapters = [Chapter(float(i * 60) + (0.001 if i == 3 else 0), f"T{i}") for i in range(120)]
    chapters.insert(4, Chapter(3 * 60 + 0.004, "same frame as T3"))
    cue = parse_cue(write_cue(audio, chapters, performer="DJ", title="Mix"))
    validate(cue, audio)
    assert len(cue["tracks"]) == 99  # the CUE format ends at TRACK 99
    assert cue["tracks"][3]["fields"]["TITLE"] == "T3"
    # unsorted input, first chapter after 0
    cue = parse_cue(write_cue(audio, [Chapter(120, "B"), Chapter(30, "A")], performer="DJ"))
    validate(cue, audio)
    assert [t["fields"]["TITLE"] for t in cue["tracks"]] == ["A", "B"]


def test_parser_rejects_broken_cue(tmp_path):
    bad = tmp_path / "x.cue"
    bad.write_text('FILE "a.mp3" MP3\n', encoding="utf-8")
    with pytest.raises(AssertionError):
        parse_cue(bad)  # no BOM
    bad.write_bytes(b'\xef\xbb\xbfTITLE "a "b" c"\n')
    with pytest.raises(AssertionError):
        parse_cue(bad)  # unescaped quote
    bad.write_bytes(b"\xef\xbb\xbfTRACK 01 AUDIO\n  INDEX 01 00:75:00\n")
    with pytest.raises(AssertionError):
        parse_cue(bad)  # seconds >= 60
