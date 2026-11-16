"""Tags, cover and chapters (SPEC §7) with mutagen.

MP3: ID3v2.4 (TIT2, TPE1, TPE2, TALB, TRCK, TCON, TDRC, COMM, TXXX:YOUTUBE_ID, TXXX:SOURCE,
APIC, optional CHAP/CTOC). `audio_format == original`: `.m4a` (MP4 atoms) and `.opus` (Vorbis
comments + METADATA_BLOCK_PICTURE) are tagged accordingly; any other container is left
untouched with a log message (tagging is skipped, the file is still moved). ID3 chapters only
exist for MP3; for other formats the `.cue` file is the only chapter output.
"""

from __future__ import annotations

import base64
import logging
import re
import subprocess
import tempfile
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from mutagen.id3 import (
    APIC,
    CHAP,
    COMM,
    CTOC,
    ID3,
    TALB,
    TCON,
    TDRC,
    TIT2,
    TPE1,
    TPE2,
    TRCK,
    TXXX,
    CTOCFlags,
    ID3NoHeaderError,
)

from .binaries import _NO_WINDOW, ffmpeg_path
from .paths import normalize_date

log = logging.getLogger(__name__)

COVER_MAX_SIZE = 1200
FFMPEG_TIMEOUT_S = 60


class TaggingError(RuntimeError):
    pass


@dataclass
class Chapter:
    start: float  # seconds
    title: str
    end: float | None = None


# --------------------------------------------------------------------------- chapters

_TS = r"(?:\d{1,2}:)?\d{1,2}:\d{2}"
_LEAD_RE = re.compile(rf"^\s*[\[(]?\s*(?P<ts>{_TS})\s*[\])]?\s*(?P<rest>.*)$")
_TRAIL_RE = re.compile(rf"^(?P<rest>.*?)\s*[\[(]?\s*(?P<ts>{_TS})\s*[\])]?\s*$")
_SEP_STRIP = " \t-–—:.|>)]•*"


def parse_timestamp(text: str) -> int:
    """'1:02:03' -> 3723, '05:30' -> 330."""
    parts = [int(p) for p in text.split(":")]
    secs = 0
    for p in parts:
        secs = secs * 60 + p
    return secs


def parse_timestamps(description: str | None, duration: float | None = None) -> list[Chapter]:
    """Chapters from timestamp lines of a description.

    Accepts `00:00 Artist - Track`, `[1:02:03] Track`, `(12:30) Track` and `Track 12:30`
    (timestamp at the end). Lines that do not increase strictly or lie beyond `duration`
    are dropped. Fewer than two valid lines give [].
    """
    found: list[Chapter] = []
    last = -1
    for line in (description or "").splitlines():
        m = _LEAD_RE.match(line)
        if not m:
            m = _TRAIL_RE.match(line)
        if not m:
            continue
        start = parse_timestamp(m.group("ts"))
        title = m.group("rest").strip(_SEP_STRIP).strip()
        if start <= last or (duration and start >= duration):
            continue
        found.append(Chapter(float(start), title or f"Track {len(found) + 1:02d}"))
        last = start
    return _fill_ends(found, duration) if len(found) >= 2 else []


def _fill_ends(chapters: list[Chapter], duration: float | None) -> list[Chapter]:
    for i, ch in enumerate(chapters):
        if i + 1 < len(chapters):
            ch.end = chapters[i + 1].start
        elif duration:
            ch.end = float(duration)
    return chapters


def _clean_chapters(chapters: list[Chapter], duration: float | None) -> list[Chapter]:
    """Sorted, strictly increasing starts; chapters at/after the end of the media are dropped
    (a wrong description or chapter list must not produce a broken CUE/CHAP)."""
    out: list[Chapter] = []
    last = -1.0
    for ch in sorted(chapters, key=lambda c: c.start):
        if ch.start <= last or (duration and ch.start >= duration):
            continue
        out.append(ch)
        last = ch.start
    return out


def chapters_from_info(info: Mapping[str, Any]) -> list[Chapter]:
    """Chapters from yt-dlp `chapters` or, failing that, from the description."""
    duration = info.get("duration")
    raw = info.get("chapters")
    if isinstance(raw, list) and raw:
        out = [
            Chapter(
                float(c.get("start_time") or 0),
                str(c.get("title") or "").strip() or f"Track {i + 1:02d}",
                float(c["end_time"]) if c.get("end_time") is not None else None,
            )
            for i, c in enumerate(raw)
            if isinstance(c, Mapping)
        ]
        out = _clean_chapters(out, duration)
        if out:
            return _fill_ends(out, duration) if out[-1].end is None else out
    return parse_timestamps(info.get("description"), duration)


MAX_CUE_TRACKS = 99  # CUE sheets know TRACK 01..99 only


def cue_chapters(chapters: Iterable[Chapter]) -> list[Chapter]:
    """Chapters as a valid CUE track list: sorted, strictly increasing INDEX 01 (compared on
    the 1/75 s frame grid), the first one at 00:00:00, at most 99 tracks."""
    out: list[Chapter] = []
    last_frame = -1
    for ch in sorted(chapters, key=lambda c: c.start):
        frame = int(round(max(0.0, ch.start) * 75))
        if frame <= last_frame:
            continue
        out.append(ch)
        last_frame = frame
    if out and out[0].start > 0:
        out[0] = Chapter(0.0, out[0].title, out[0].end)  # intro before the first stamp
    if len(out) > MAX_CUE_TRACKS:
        log.warning(
            "CUE: %d Kapitel, nur die ersten %d werden geschrieben", len(out), MAX_CUE_TRACKS
        )
        out = out[:MAX_CUE_TRACKS]
    return out


def format_cue_time(seconds: float) -> str:
    """mm:ss:ff (75 frames per second); mm may exceed 99."""
    total_frames = int(round(max(0.0, seconds) * 75))
    mm, rest = divmod(total_frames, 75 * 60)
    ss, ff = divmod(rest, 75)
    return f"{mm:02d}:{ss:02d}:{ff:02d}"


def _q(text: str) -> str:
    return str(text).replace('"', "'").replace("\r", " ").replace("\n", " ").strip()


def write_cue(
    audio_path: Path,
    chapters: Iterable[Chapter],
    *,
    performer: str = "",
    title: str = "",
) -> Path:
    """Write `<audio>.cue` next to the audio file and return its path."""
    audio_path = Path(audio_path)
    chapters = cue_chapters(chapters)
    if not chapters:
        raise TaggingError("Keine Kapitel für die CUE-Datei")
    ftype = "MP3" if audio_path.suffix.lower() == ".mp3" else "WAVE"
    lines: list[str] = []
    if performer:
        lines.append(f'PERFORMER "{_q(performer)}"')
    if title:
        lines.append(f'TITLE "{_q(title)}"')
    lines.append(f'FILE "{_q(audio_path.name)}" {ftype}')
    for i, ch in enumerate(chapters, 1):
        track_title, track_performer = ch.title, performer
        if " - " in ch.title:
            artist, _, rest = ch.title.partition(" - ")
            if artist.strip() and rest.strip():
                track_performer, track_title = artist.strip(), rest.strip()
        lines.append(f"  TRACK {i:02d} AUDIO")
        lines.append(f'    TITLE "{_q(track_title)}"')
        if track_performer:
            lines.append(f'    PERFORMER "{_q(track_performer)}"')
        lines.append(f"    INDEX 01 {format_cue_time(ch.start)}")
    cue = audio_path.with_suffix(".cue")
    # UTF-8 with BOM: foobar2000 & co. read BOM-less CUE files as ANSI and garble umlauts
    cue.write_text("\n".join(lines) + "\n", encoding="utf-8-sig", newline="\n")
    return cue


def write_id3_chapters(
    mp3_path: Path, chapters: Iterable[Chapter], total_duration: float | None = None
) -> None:
    """Add CHAP/CTOC frames to an MP3 (keeps the other tags)."""
    chapters = list(chapters)
    if not chapters:
        return
    try:
        tags = ID3(mp3_path)
    except ID3NoHeaderError:
        tags = ID3()
    _add_chapter_frames(tags, chapters, total_duration)
    tags.save(mp3_path, v2_version=4)


def _add_chapter_frames(tags: ID3, chapters: list[Chapter], total: float | None) -> None:
    tags.delall("CHAP")
    tags.delall("CTOC")
    ids: list[str] = []
    for i, ch in enumerate(chapters):
        end = ch.end
        if end is None:
            end = chapters[i + 1].start if i + 1 < len(chapters) else (total or ch.start)
        eid = f"chp{i}"
        ids.append(eid)
        tags.add(
            CHAP(
                element_id=eid,
                start_time=int(ch.start * 1000),
                end_time=int(max(end, ch.start) * 1000),
                start_offset=0xFFFFFFFF,
                end_offset=0xFFFFFFFF,
                sub_frames=[TIT2(encoding=3, text=[ch.title])],
            )
        )
    tags.add(
        CTOC(
            element_id="toc",
            flags=CTOCFlags.TOP_LEVEL | CTOCFlags.ORDERED,
            child_element_ids=ids,
            sub_frames=[TIT2(encoding=3, text=["Kapitel"])],
        )
    )


# --------------------------------------------------------------------------- cover


def make_square_cover(
    src: Path, *, ffmpeg: Path | str | None = None, max_size: int = COVER_MAX_SIZE
) -> bytes:
    """Crop `src` (webp/jpg/png) to a centred square via ffmpeg and return JPEG bytes."""
    exe = str(ffmpeg or ffmpeg_path())
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "cover.jpg"
        vf = f"crop='min(iw,ih)':'min(iw,ih)',scale='min({max_size},iw)':-2"
        cmd = [exe, "-y", "-v", "error", "-i", str(src), "-vf", vf, "-frames:v", "1", "-q:v", "2"]
        try:
            proc = subprocess.run(
                [*cmd, str(out)],
                capture_output=True,
                timeout=FFMPEG_TIMEOUT_S,
                creationflags=_NO_WINDOW,
                check=False,
            )
        except (OSError, subprocess.SubprocessError) as exc:
            raise TaggingError(f"Cover konnte nicht erzeugt werden: {exc}") from exc
        if proc.returncode != 0 or not out.exists():
            err = (proc.stderr or b"").decode("utf-8", "replace").strip()[:300]
            raise TaggingError(f"Cover konnte nicht erzeugt werden: {err}")
        return out.read_bytes()


# --------------------------------------------------------------------------- tags


def _tag_text(meta: Mapping[str, Any], key: str) -> str:
    return str(meta.get(key) or "").strip()


def write_tags(
    path: Path,
    meta: Mapping[str, Any],
    *,
    cover_jpeg: bytes | None = None,
    chapters: Iterable[Chapter] = (),
    id3_chapters: bool = True,
    total_duration: float | None = None,
) -> bool:
    """Write tags for `path` according to its extension. Returns False if the format is skipped.

    meta keys: title, artist, albumartist (default artist), album (default title), genre,
    date (upload date), url, id, source (default 'YouTube').
    """
    ext = Path(path).suffix.lower()
    chapters = list(chapters)
    if ext == ".mp3":
        _write_id3(Path(path), meta, cover_jpeg, chapters if id3_chapters else [], total_duration)
        return True
    if ext in (".m4a", ".mp4"):
        _write_mp4(Path(path), meta, cover_jpeg)
        return True
    if ext == ".opus":
        _write_opus(Path(path), meta, cover_jpeg)
        return True
    log.info("Tagging für %s übersprungen (nicht unterstützt)", ext or "?")
    return False


def _write_id3(
    path: Path,
    meta: Mapping[str, Any],
    cover: bytes | None,
    chapters: list[Chapter],
    total: float | None,
) -> None:
    title = _tag_text(meta, "title")
    artist = _tag_text(meta, "artist")
    tags = ID3()
    tags.add(TIT2(encoding=3, text=[title]))
    tags.add(TPE1(encoding=3, text=[artist]))
    tags.add(TPE2(encoding=3, text=[_tag_text(meta, "albumartist") or artist]))
    tags.add(TALB(encoding=3, text=[_tag_text(meta, "album") or title]))
    tags.add(TRCK(encoding=3, text=["1"]))
    if genre := _tag_text(meta, "genre"):
        tags.add(TCON(encoding=3, text=[genre]))
    if date := normalize_date(_tag_text(meta, "date")):
        tags.add(TDRC(encoding=3, text=[date]))
    if url := _tag_text(meta, "url"):
        tags.add(COMM(encoding=3, lang="eng", desc="", text=[url]))
    if vid := _tag_text(meta, "id"):
        tags.add(TXXX(encoding=3, desc="YOUTUBE_ID", text=[vid]))
    tags.add(TXXX(encoding=3, desc="SOURCE", text=[_tag_text(meta, "source") or "YouTube"]))
    if cover:
        tags.add(APIC(encoding=3, mime="image/jpeg", type=3, desc="Cover", data=cover))
    if chapters:
        _add_chapter_frames(tags, chapters, total)
    tags.save(path, v2_version=4)


def _write_mp4(path: Path, meta: Mapping[str, Any], cover: bytes | None) -> None:
    from mutagen.mp4 import MP4, MP4Cover, MP4FreeForm

    audio = MP4(path)
    title = _tag_text(meta, "title")
    artist = _tag_text(meta, "artist")
    if audio.tags is None:
        audio.add_tags()
    tags = audio.tags
    tags["\xa9nam"] = [title]
    tags["\xa9ART"] = [artist]
    tags["aART"] = [_tag_text(meta, "albumartist") or artist]
    tags["\xa9alb"] = [_tag_text(meta, "album") or title]
    tags["trkn"] = [(1, 1)]
    if genre := _tag_text(meta, "genre"):
        tags["\xa9gen"] = [genre]
    if date := normalize_date(_tag_text(meta, "date")):
        tags["\xa9day"] = [date]
    if url := _tag_text(meta, "url"):
        tags["\xa9cmt"] = [url]
    if vid := _tag_text(meta, "id"):
        tags["----:com.apple.iTunes:YOUTUBE_ID"] = [MP4FreeForm(vid.encode("utf-8"))]
    source = (_tag_text(meta, "source") or "YouTube").encode("utf-8")
    tags["----:com.apple.iTunes:SOURCE"] = [MP4FreeForm(source)]
    if cover:
        tags["covr"] = [MP4Cover(cover, imageformat=MP4Cover.FORMAT_JPEG)]
    audio.save()


def _write_opus(path: Path, meta: Mapping[str, Any], cover: bytes | None) -> None:
    from mutagen.flac import Picture
    from mutagen.oggopus import OggOpus

    audio = OggOpus(path)
    title = _tag_text(meta, "title")
    artist = _tag_text(meta, "artist")
    values: dict[str, str] = {
        "title": title,
        "artist": artist,
        "albumartist": _tag_text(meta, "albumartist") or artist,
        "album": _tag_text(meta, "album") or title,
        "tracknumber": "1",
        "genre": _tag_text(meta, "genre"),
        "date": normalize_date(_tag_text(meta, "date")),
        "comment": _tag_text(meta, "url"),
        "youtube_id": _tag_text(meta, "id"),
        "source": _tag_text(meta, "source") or "YouTube",
    }
    for key, value in values.items():
        if value:
            audio[key] = [value]
    if cover:
        pic = Picture()
        pic.type = 3
        pic.mime = "image/jpeg"
        pic.desc = "Cover"
        pic.data = cover
        audio["metadata_block_picture"] = [base64.b64encode(pic.write()).decode("ascii")]
    audio.save()
