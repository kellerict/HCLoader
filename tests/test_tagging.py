import shutil
import subprocess

import pytest
from mutagen.id3 import ID3
from mutagen.mp3 import MP3

from app.core import tagging
from app.core.tagging import Chapter

needs_ffmpeg = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg fehlt")


def make_mp3(path, seconds=2):
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"]
        + ["-t", str(seconds), "-q:a", "9", str(path)],
        check=True,
    )
    return path


def make_image(path, w=640, h=360):
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"color=c=red:s={w}x{h}"]
        + ["-frames:v", "1", str(path)],
        check=True,
    )
    return path


META = {
    "title": "Masters of Hardcore 2026 Liveset",
    "artist": "Partyraiser",
    "genre": "Hardcore",
    "date": "20261003",
    "url": "https://www.youtube.com/watch?v=abc123XYZ_-",
    "id": "abc123XYZ_-",
}


# ------------------------------------------------------------------ timestamps


def test_parse_timestamp():
    assert tagging.parse_timestamp("05:30") == 330
    assert tagging.parse_timestamp("1:02:03") == 3723


def test_parse_timestamps_variants():
    desc = "\n".join(
        [
            "Tracklist:",
            "00:00 Artist A - Opening",
            "[05:30] Artist B - Second",
            "(1:02:03) Third",
            "Fourth track 1:30:00",
            "no timestamp here",
        ]
    )
    ch = tagging.parse_timestamps(desc, duration=6000)
    assert [c.start for c in ch] == [0, 330, 3723, 5400]
    assert ch[0].title == "Artist A - Opening"
    assert ch[2].title == "Third"
    assert ch[3].title == "Fourth track"
    assert ch[0].end == 330 and ch[-1].end == 6000


def test_parse_timestamps_needs_two_increasing():
    assert tagging.parse_timestamps("00:00 Only one") == []
    ch = tagging.parse_timestamps("00:00 A\n05:00 B\n04:00 backwards\n99:00 beyond", duration=1000)
    assert [c.title for c in ch] == ["A", "B"]
    assert tagging.parse_timestamps(None) == []


def test_chapters_from_info_prefers_chapters_key():
    info = {
        "duration": 100,
        "chapters": [
            {"start_time": 0, "end_time": 40, "title": "One"},
            {"start_time": 40, "end_time": 100, "title": "Two"},
        ],
        "description": "00:00 X\n01:00 Y",
    }
    ch = tagging.chapters_from_info(info)
    assert [c.title for c in ch] == ["One", "Two"]
    info.pop("chapters")
    assert [c.title for c in tagging.chapters_from_info(info)] == ["X", "Y"]


# ------------------------------------------------------------------ CUE


def test_format_cue_time():
    assert tagging.format_cue_time(0) == "00:00:00"
    assert tagging.format_cue_time(65.5) == "01:05:37"
    assert tagging.format_cue_time(3723) == "62:03:00"
    assert tagging.format_cue_time(7200) == "120:00:00"  # mm may exceed 99


def test_write_cue_format(tmp_path):
    mp3 = tmp_path / "Mix [abc].mp3"
    chapters = [Chapter(0, 'Intro "x"'), Chapter(330, "DJ B - Second"), Chapter(6000, "End")]
    cue = tagging.write_cue(mp3, chapters, performer="Partyraiser", title="Mix")
    assert cue == tmp_path / "Mix [abc].cue"
    lines = cue.read_text(encoding="utf-8").splitlines()
    assert lines[0] == 'PERFORMER "Partyraiser"'
    assert lines[1] == 'TITLE "Mix"'
    assert lines[2] == 'FILE "Mix [abc].mp3" MP3'
    assert "  TRACK 01 AUDIO" in lines and "  TRACK 03 AUDIO" in lines
    assert "    TITLE \"Intro 'x'\"" in lines
    assert '    TITLE "Second"' in lines and '    PERFORMER "DJ B"' in lines
    assert "    INDEX 01 00:00:00" in lines
    assert "    INDEX 01 05:30:00" in lines
    assert "    INDEX 01 100:00:00" in lines


def test_write_cue_requires_chapters(tmp_path):
    with pytest.raises(tagging.TaggingError):
        tagging.write_cue(tmp_path / "x.mp3", [])


# ------------------------------------------------------------------ ID3 / cover


@needs_ffmpeg
def test_write_tags_all_frames(tmp_path):
    mp3 = make_mp3(tmp_path / "a.mp3")
    img = make_image(tmp_path / "t.jpg")
    cover = tagging.make_square_cover(img)
    chapters = [Chapter(0, "One", 1.0), Chapter(1.0, "Two", 2.0)]
    assert tagging.write_tags(mp3, META, cover_jpeg=cover, chapters=chapters, total_duration=2)
    tags = ID3(mp3)
    assert tags.version == (2, 4, 0)
    assert str(tags["TIT2"]) == META["title"]
    assert str(tags["TPE1"]) == "Partyraiser" and str(tags["TPE2"]) == "Partyraiser"
    assert str(tags["TALB"]) == META["title"]
    assert str(tags["TRCK"]) == "1" and str(tags["TCON"]) == "Hardcore"
    assert str(tags["TDRC"]) == "2026-10-03"
    assert tags.getall("COMM")[0].text == [META["url"]]
    assert tags["TXXX:YOUTUBE_ID"].text == [META["id"]]
    assert tags["TXXX:SOURCE"].text == ["YouTube"]
    assert tags.getall("APIC")[0].mime == "image/jpeg"
    assert len(tags.getall("CHAP")) == 2
    assert tags.getall("CTOC")[0].child_element_ids == ["chp0", "chp1"]
    assert MP3(mp3).info.length > 1


@needs_ffmpeg
def test_cover_is_square_centered(tmp_path):
    img = make_image(tmp_path / "wide.png", 640, 360)
    data = tagging.make_square_cover(img)
    out = tmp_path / "c.jpg"
    out.write_bytes(data)
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0"]
        + [str(out)],
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()
    w, h = (int(x) for x in probe.split(","))
    assert w == h == 360


def test_cover_error_raises(tmp_path):
    bad = tmp_path / "bad.jpg"
    bad.write_bytes(b"not an image")
    if shutil.which("ffmpeg") is None:
        pytest.skip("ffmpeg fehlt")
    with pytest.raises(tagging.TaggingError):
        tagging.make_square_cover(bad)


@needs_ffmpeg
def test_write_id3_chapters_keeps_tags(tmp_path):
    mp3 = make_mp3(tmp_path / "a.mp3")
    tagging.write_tags(mp3, META)
    tagging.write_id3_chapters(mp3, [Chapter(0, "A"), Chapter(1, "B")], total_duration=2)
    tags = ID3(mp3)
    assert str(tags["TIT2"]) == META["title"]
    chap = tags.getall("CHAP")
    assert [c.start_time for c in chap] == [0, 1000]
    assert chap[1].end_time == 2000


@needs_ffmpeg
def test_original_formats(tmp_path):
    opus = tmp_path / "a.opus"
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]
        + ["-t", "1", "-c:a", "libopus", str(opus)],
        check=False,
    )
    if not opus.exists():
        pytest.skip("libopus fehlt")
    cover = tagging.make_square_cover(make_image(tmp_path / "t.jpg"))
    assert tagging.write_tags(opus, META, cover_jpeg=cover)
    from mutagen.oggopus import OggOpus

    audio = OggOpus(opus)
    assert audio["artist"] == ["Partyraiser"] and audio["youtube_id"] == [META["id"]]
    assert "metadata_block_picture" in audio


@needs_ffmpeg
def test_m4a_tags(tmp_path):
    m4a = tmp_path / "a.m4a"
    r = subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"]
        + ["-t", "1", "-c:a", "aac", str(m4a)],
        check=False,
    )
    if r.returncode != 0:
        pytest.skip("aac fehlt")
    assert tagging.write_tags(m4a, META)
    from mutagen.mp4 import MP4

    audio = MP4(m4a)
    assert audio["\xa9nam"] == [META["title"]] and audio["trkn"] == [(1, 1)]


def test_unsupported_container_is_skipped(tmp_path):
    f = tmp_path / "a.webm"
    f.write_bytes(b"x")
    assert tagging.write_tags(f, META) is False
