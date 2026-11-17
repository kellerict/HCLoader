"""Player support (Phase 8, backend): data for the built-in `<audio>` player and the external
player. **No network, nothing through the throttle**: only the local file, its tags, the
sidecar and a cover cache below `<app_home>/cache/covers/`.

Path rule (docs/decisions.md «Player», orchestrator decision): the DB row must be `done` and the
file must be an audio file (`.mp3/.m4a/.opus/...`). Earlier target folders are allowed on
purpose (playing is read-only; mixes stay playable after the target folder changed). The path
only ever comes from our own DB, and the extension check keeps `play_external`/`os.startfile`
from starting anything but audio.

`file:` URLs are built with `Path.as_uri()` (percent-encoding of space, `#`, `%`, `[`, `]`,
umlauts): .NET's `System.Uri` (pywebview/WebView2) treats a raw `?` or `#` as query/fragment.
"""

from __future__ import annotations

import logging
import os
import re
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path
from typing import Any

from mutagen import File as MutagenFile

from . import config, library, platforms, sidecar, tagging
from .config import UNSORTED, Settings
from .db import Database
from .i18n import tr

log = logging.getLogger(__name__)

_CUE_INDEX_RE = re.compile(r"^\s*INDEX\s+01\s+(\d+):(\d{2}):(\d{2})\s*$", re.I)
_CUE_FIELD_RE = re.compile(r'^\s*(TITLE|PERFORMER)\s+"(.*)"\s*$', re.I)


class PlayerError(Exception):
    """User-facing (German) error."""


def cover_dir() -> Path:
    return config.app_home() / "cache" / "covers"


def file_url(path: Path) -> str:
    """Percent-encoded `file:` URL of an absolute path (for the `<audio>`/`<img>` tag only)."""
    return Path(path).resolve().as_uri()


AUDIO_SUFFIXES = {".mp3", ".m4a", ".opus", ".ogg", ".webm", ".flac", ".aac", ".wav"}


def resolve_playable(
    db: Database, settings: Settings, video_id: str
) -> tuple[dict[str, Any], Path]:
    """(row, path) of a library item that may be played; raises PlayerError (German)."""
    row = db.get_video(str(video_id))
    if not row or row.get("status") != "done" or not row.get("file_path"):
        raise PlayerError(tr("library.not_in_library"))
    path = Path(row["file_path"])
    # Playing only reads: files of an earlier target folder stay playable (deleting/moving
    # them stays restricted to the current target folder, see library.py). Only audio files,
    # so play_external/os.startfile can never launch anything else.
    if path.suffix.lower() not in AUDIO_SUFFIXES:
        raise PlayerError(tr("player.no_audio"))
    try:
        if not path.is_file():
            raise PlayerError(tr("player.file_missing"))
    except OSError as exc:
        raise PlayerError(tr("player.file_missing")) from exc
    return row, path


# --------------------------------------------------------------------------- cover cache


def cover_file(video_id: str, path: Path) -> Path | None:
    """Embedded cover as `<cache>/covers/<sidecar name>.jpg`; created once, re-created only if
    the audio file is newer (re-tag). None if the file has no cover."""
    try:
        target = cover_dir() / f"{sidecar.sidecar_path(video_id).stem}.jpg"
    except ValueError:
        return None
    try:
        if target.is_file() and target.stat().st_mtime >= path.stat().st_mtime:
            return target
    except OSError:
        pass
    data = library.extract_cover(path)
    if not data:
        return None
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        tmp = target.with_suffix(".jpg.tmp")
        tmp.write_bytes(data)
        os.replace(tmp, target)
    except OSError as exc:
        log.warning("Cover cache not written (%s): %s", video_id, exc)
        return None
    return target


# --------------------------------------------------------------------------- chapters


def parse_cue(text: str) -> list[dict[str, Any]]:
    """Tracks of a CUE sheet as [{start (s), title, performer}]; INDEX 01 mm:ss:ff (75 fps)."""
    out: list[dict[str, Any]] = []
    cur: dict[str, Any] | None = None
    for line in text.splitlines():
        if re.match(r"^\s*TRACK\s+\d+", line, re.I):
            cur = {"start": None, "title": "", "performer": ""}
            out.append(cur)
        elif cur is not None and (m := _CUE_INDEX_RE.match(line)):
            mm, ss, ff = (int(g) for g in m.groups())
            cur["start"] = mm * 60 + ss + ff / 75
        elif cur is not None and (m := _CUE_FIELD_RE.match(line)):
            cur[m.group(1).lower()] = m.group(2)
    return [c for c in out if c["start"] is not None]


def _cue_chapters(path: Path) -> list[dict[str, Any]]:
    cue = path.with_suffix(".cue")
    try:
        text = cue.read_text(encoding="utf-8-sig")
    except (OSError, UnicodeDecodeError):
        return []
    return parse_cue(text)


def _split_title(title: str, artist: str) -> tuple[str, str]:
    """'Artist - Title' chapter titles (as the CUE writer splits them) -> (title, performer)."""
    if " - " in title:
        a, _, rest = title.partition(" - ")
        if a.strip() and rest.strip():
            return rest.strip(), a.strip()
    return title, artist


def chapters_for(video_id: str, path: Path, artist: str = "") -> list[dict[str, Any]]:
    """Sidecar chapters, else ID3 CHAP, else `.cue`; [{start, title, performer}], sorted."""
    data = sidecar.read(video_id)
    chapters: list[tagging.Chapter] = sidecar.chapters_of(data) if data else []
    if not chapters:
        chapters = library._chapters_from_file(path)
    if chapters:
        out = []
        for ch in sorted(chapters, key=lambda c: c.start):
            title, performer = _split_title(ch.title, artist)
            out.append({"start": float(ch.start), "title": title, "performer": performer})
        return out
    cue = _cue_chapters(path)
    for c in cue:
        c["start"] = float(c["start"])
        c["performer"] = c["performer"] or artist
    return sorted(cue, key=lambda c: c["start"])


# --------------------------------------------------------------------------- API helpers


def _duration(row: dict[str, Any], path: Path) -> float | None:
    if row.get("duration"):
        return float(row["duration"])
    try:
        f = MutagenFile(path)
        if f is not None and f.info is not None and f.info.length:
            return float(f.info.length)
    except Exception:  # unreadable audio: unknown duration
        log.debug("Duration not readable: %s", path, exc_info=True)
    return None


def get_media(db: Database, settings: Settings, video_id: str) -> dict[str, Any]:
    try:
        row, path = resolve_playable(db, settings, video_id)
    except PlayerError as exc:
        return {"ok": False, "error": str(exc)}
    artist = row.get("channel_name") or ""
    cover = cover_file(row["id"], path)
    return {
        "ok": True,
        "id": row["id"],
        "src": file_url(path),
        "title": row.get("title") or path.stem,
        "artist": artist,
        "genre": row.get("genre") or UNSORTED,
        "platform": row.get("platform") or platforms.platform_of(row["id"]),
        "duration": _duration(row, path),
        "cover": file_url(cover) if cover else None,
        "chapters": chapters_for(row["id"], path, artist),
    }


def external_command(path: Path, platform: str) -> list[str]:
    return ["open" if platform == "darwin" else "xdg-open", str(path)]


def play_external(
    db: Database,
    settings: Settings,
    video_id: str,
    *,
    platform: str | None = None,
    startfile: Callable[[str], Any] | None = None,
    popen: Callable[..., Any] | None = None,
) -> dict[str, Any]:
    """Open the file in the default player (Windows `os.startfile`, else `xdg-open`/`open`)."""
    try:
        _row, path = resolve_playable(db, settings, video_id)
    except PlayerError as exc:
        return {"ok": False, "error": str(exc)}
    plat = platform or sys.platform
    try:
        if plat == "win32":
            (startfile or getattr(os, "startfile"))(str(path))  # noqa: B009
        else:
            (popen or subprocess.Popen)(
                external_command(path, plat),
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
    except (OSError, AttributeError) as exc:
        return {"ok": False, "error": tr("player.cannot_play", error=exc)}
    return {"ok": True}
