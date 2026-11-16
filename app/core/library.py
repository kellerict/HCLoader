"""Library (Phase 5): list/filter, reveal in Explorer, offline re-tag, delete.

Everything here works on the DB (status `done`), the files below the target folder and the
metadata sidecar (`core/sidecar.py`). **No network access**: re-tagging takes the cover from the
existing file and chapters/title/date from the sidecar. Files are only ever moved or deleted
inside the target folder (`within`); anything outside is refused.
"""

from __future__ import annotations

import logging
import os
import re
import shutil
import subprocess
import sys
from collections.abc import Callable, Mapping
from pathlib import Path
from typing import Any

from mutagen import File as MutagenFile
from mutagen.id3 import ID3, ID3NoHeaderError

from . import paths, sidecar, tagging
from .config import UNSORTED, Settings
from .db import Database
from .filters import normalize
from .genre import detect_genre

log = logging.getLogger(__name__)

COVER_NAME = "cover.jpg"
_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)


class LibraryError(Exception):
    """User-facing (German) error."""


# --------------------------------------------------------------------------- path safety


def within(path: Path | str, root: Path | str) -> bool:
    """True if `path` lies strictly inside `root` (symlinks and `..` resolved)."""
    try:
        p = Path(path).resolve()
        r = Path(root).resolve()
    except (OSError, RuntimeError):
        return False
    return p != r and r in p.parents


def _same_file(a: Path, b: Path) -> bool:
    return os.path.normcase(os.path.abspath(a)) == os.path.normcase(os.path.abspath(b))


def prune_empty_dirs(start: Path, root: Path) -> list[Path]:
    """Remove `start` and its parents while they are empty (a lone `cover.jpg` counts as empty),
    never `root` itself and never anything outside of it. Returns the removed folders."""
    removed: list[Path] = []
    cur = Path(start)
    while within(cur, root):
        try:
            entries = list(cur.iterdir())
            if entries and all(e.name == COVER_NAME and e.is_file() for e in entries):
                for e in entries:
                    e.unlink()
                entries = []
            if entries:
                break
            cur.rmdir()
        except OSError:
            break
        removed.append(cur)
        cur = cur.parent
    return removed


# --------------------------------------------------------------------------- listing


def _year(upload_date: str | None) -> str:
    m = re.match(r"^(\d{4})", str(upload_date or ""))
    return m.group(1) if m else ""


def _duration(row: dict[str, Any], path: Path | None, present: bool) -> int | None:
    if row.get("duration"):
        return int(row["duration"])
    if present and path is not None:
        try:
            f = MutagenFile(path)
            if f is not None and f.info is not None and f.info.length:
                return int(f.info.length)
        except Exception:  # unreadable audio: no duration
            log.debug("Dauer nicht lesbar: %s", path, exc_info=True)
    return None


def library_item(row: dict[str, Any]) -> dict[str, Any]:
    fp = row.get("file_path") or ""
    path = Path(fp) if fp else None
    try:
        present = bool(path and path.is_file())
        size = round(path.stat().st_size / (1024 * 1024), 1) if present and path else 0.0
    except OSError:
        present, size = False, 0.0
    return {
        "id": row["id"],
        "title": row.get("title") or "",
        "artist": row.get("channel_name") or "",
        "channel_id": row.get("channel_id") or "",
        "genre": row.get("genre") or UNSORTED,
        "duration": _duration(row, path, present),
        "upload_date": row.get("upload_date"),
        "year": _year(row.get("upload_date")),
        "downloaded_at": row.get("downloaded_at"),
        "file_path": fp,
        "size_mb": size,
        "missing": not present,
        "has_cue": bool(path and present and path.with_suffix(".cue").is_file()),
    }


def list_library(db: Database, filters: Mapping[str, Any] | None = None) -> list[dict[str, Any]]:
    """Items with status `done`, newest download first.

    filters (all optional): `search` (title/channel/genre, case and umlaut insensitive),
    `genre` (name), `channel` (channel id or channel name), `year` (int or "YYYY"),
    `missing` (true = only items whose file is gone).
    """
    f = filters or {}
    genre = str(f.get("genre") or "").strip()
    channel = str(f.get("channel") or "").strip()
    year = str(f.get("year") or "").strip()
    search = normalize(str(f.get("search") or ""))
    want_missing = f.get("missing")
    rows = db.list_videos(status="done", order_by="downloaded_at")
    out: list[dict[str, Any]] = []
    for row in rows:
        if genre and (row.get("genre") or UNSORTED) != genre:
            continue
        if channel and channel not in (row.get("channel_id"), row.get("channel_name")):
            continue
        if year and _year(row.get("upload_date")) != year:
            continue
        if search:
            hay = normalize(
                f"{row.get('title') or ''} {row.get('channel_name') or ''} {row.get('genre') or ''}"
            )
            if search not in hay:
                continue
        item = library_item(row)
        if want_missing is not None and bool(want_missing) != item["missing"]:
            continue
        out.append(item)
    return out


# --------------------------------------------------------------------------- reveal


def explorer_command(path: Path) -> str:
    """`explorer /select,"<file>"` as one command string (a list would be quoted as a whole,
    which Explorer does not understand when the path contains spaces)."""
    return f'explorer /select,"{path}"'


def reveal(
    path: Path,
    *,
    opener: Callable[[Path], None],
    platform: str | None = None,
    popen: Callable[..., Any] = subprocess.Popen,
) -> None:
    """Windows: Explorer with the file selected. Elsewhere (or if the file is gone): open the
    folder. Explorer returns exit code 1 even on success, so the result is never checked."""
    plat = platform or sys.platform
    path = Path(path)
    if plat == "win32" and path.is_file():
        popen(explorer_command(path), creationflags=_NO_WINDOW)
        return
    opener(path.parent)


# --------------------------------------------------------------------------- re-tag


def extract_cover(path: Path) -> bytes | None:
    """Embedded cover (JPEG/PNG bytes) of an existing file; None if there is none."""
    try:
        ext = path.suffix.lower()
        if ext == ".mp3":
            frames = ID3(path).getall("APIC")
            if frames:
                front = [f for f in frames if f.type == 3]
                return bytes((front or frames)[0].data)
        elif ext in (".m4a", ".mp4"):
            from mutagen.mp4 import MP4

            covr = (MP4(path).tags or {}).get("covr")
            if covr:
                return bytes(covr[0])
    except (ID3NoHeaderError, OSError, ValueError):
        pass
    except Exception:  # corrupt tag block: re-tag without cover rather than failing
        log.debug("Cover nicht lesbar: %s", path, exc_info=True)
    return None


def _chapters_from_file(path: Path) -> list[tagging.Chapter]:
    """ID3 CHAP frames of the file (fallback when no sidecar exists)."""
    if path.suffix.lower() != ".mp3":
        return []
    try:
        tags = ID3(path)
    except (ID3NoHeaderError, OSError):
        return []
    out = []
    for ch in tags.getall("CHAP"):
        title = ""
        for sub in ch.sub_frames.values():
            if sub.FrameID == "TIT2" and sub.text:
                title = str(sub.text[0])
        out.append(tagging.Chapter(ch.start_time / 1000, title, ch.end_time / 1000))
    out.sort(key=lambda c: c.start)
    return out


def _rewrite_cue_file_line(cue: Path, audio_name: str) -> None:
    name = audio_name.replace('"', "'")
    try:
        text = cue.read_text(encoding="utf-8-sig")
        text = re.sub(r'^FILE ".*?"', lambda _m: f'FILE "{name}"', text, count=1, flags=re.M)
        cue.write_text(text, encoding="utf-8-sig", newline="\n")
    except OSError as exc:
        log.warning("CUE-Datei nicht angepasst (%s): %s", cue, exc)


def retag(db: Database, settings: Settings, video_id: str) -> dict[str, Any]:
    """Rewrite tags, cover, CUE and CHAP from the sidecar and the *current* settings, and move
    the file to the path the current template gives. No network.

    Returns {ok, path, moved, genre, cue, sidecar} or {ok: False, error}.
    A file outside the target folder is tagged in place but never moved.
    """
    row = db.get_video(video_id)
    if not row or row.get("status") != "done" or not row.get("file_path"):
        return {"ok": False, "error": "Eintrag ist nicht in der Bibliothek"}
    path = Path(row["file_path"])
    if not path.is_file():
        return {"ok": False, "error": f"Datei fehlt: {path}"}
    data = sidecar.read(video_id)
    st, dl = settings.storage, settings.download

    raw_title = (data or {}).get("title") or row.get("title") or path.stem
    channel = (data or {}).get("channel_name") or row.get("channel_name") or ""
    upload = (data or {}).get("upload_date") or row.get("upload_date") or ""
    duration = (data or {}).get("duration") or row.get("duration")
    description = (data or {}).get("description") or ""
    source_default = None
    if row.get("source_id") is not None:
        source_default = (db.get_source(row["source_id"]) or {}).get("default_genre") or None
    manual = row.get("genre") if row.get("genre_manual") else None
    genre = detect_genre(
        raw_title,
        settings.genres.items,
        manual=manual,
        source_default=source_default,
        description=description if settings.filters.match_description else None,
    )
    if genre == UNSORTED and manual is None:
        stored = row.get("genre")
        if stored and stored in {g.name for g in settings.genres.items}:
            genre = stored
    title = paths.clean_title(raw_title, st.title_cleanup_patterns)
    artist = channel
    if st.artist_from_title:
        artist = paths.parse_artist_from_title(title) or channel
    chapters = sidecar.chapters_of(data) if data else _chapters_from_file(path)
    cover = extract_cover(path)
    url = (data or {}).get("url") or f"https://www.youtube.com/watch?v={video_id}"
    tag_meta = {
        "title": title,
        "artist": artist,
        "albumartist": artist,
        "album": title,
        "genre": genre,
        "date": upload,
        "url": url,
        "id": video_id,
        "source": (data or {}).get("source") or "YouTube",
    }
    total = float(duration) if duration else None

    root = settings.target_dir_path()
    new_path = path
    if within(path, root):
        new_path = paths.build_target_path(
            root,
            st.path_template,
            {
                "id": video_id,
                "title": title,
                "artist": artist,
                "channel": channel,
                "genre": genre,
                "upload_date": upload,
            },
            ext=path.suffix,
            max_title_length=st.max_title_length,
            max_path_length=st.max_path_length,
        )
    moving = not _same_file(new_path, path)
    if moving and new_path.exists():
        return {"ok": False, "error": f"Zieldatei existiert bereits: {new_path}"}

    try:
        tagging.write_tags(
            path,
            tag_meta,
            cover_jpeg=cover,
            chapters=chapters,
            id3_chapters=dl.write_id3_chapters,
            total_duration=total,
        )
    except Exception as exc:
        log.error("Neu taggen fehlgeschlagen (%s): %s", video_id, exc)
        return {"ok": False, "error": f"Tags konnten nicht geschrieben werden: {exc}"}

    old_cue = path.with_suffix(".cue")
    had_cue = old_cue.is_file()
    if moving:
        try:
            new_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(path), str(new_path))
        except OSError as exc:
            log.error("Verschieben fehlgeschlagen (%s): %s", video_id, exc)
            return {"ok": False, "error": f"Datei konnte nicht verschoben werden: {exc}"}
        db.set_file_path(video_id, str(new_path))
    db.set_genre(video_id, genre, manual=bool(manual))

    new_cue = new_path.with_suffix(".cue")
    cue_written = False
    try:
        if chapters and (dl.write_cue or had_cue):
            tagging.write_cue(new_path, chapters, performer=artist, title=title)
            cue_written = True
            if had_cue and not _same_file(old_cue, new_cue):
                old_cue.unlink(missing_ok=True)
        elif had_cue and not _same_file(old_cue, new_cue):
            shutil.move(str(old_cue), str(new_cue))
            _rewrite_cue_file_line(new_cue, new_path.name)
            cue_written = True
        elif had_cue:
            cue_written = True
    except (OSError, tagging.TaggingError) as exc:
        log.warning("CUE-Datei nicht aktualisiert (%s): %s", video_id, exc)
    if cover and dl.write_cover_jpg:
        try:
            cover_file = new_path.parent / COVER_NAME
            if not cover_file.exists():
                cover_file.write_bytes(cover)
        except OSError as exc:
            log.warning("cover.jpg nicht geschrieben (%s): %s", video_id, exc)
    if moving and within(path.parent, root):
        prune_empty_dirs(path.parent, root)
    if data is not None and data.get("genre") != genre:
        sidecar.write(video_id, {**data, "genre": genre})
    log.info("Neu getaggt: %s%s", new_path, " (verschoben)" if moving else "")
    return {
        "ok": True,
        "path": str(new_path),
        "moved": moving,
        "genre": genre,
        "cue": cue_written,
        "sidecar": data is not None,
    }


# --------------------------------------------------------------------------- delete


def delete_item(
    db: Database, settings: Settings, video_id: str, *, delete_file: bool = True
) -> dict[str, Any]:
    """Remove a library item.

    `delete_file=True`: the file and its `.cue` are deleted (only inside the target folder; a
    path outside is refused and nothing changes), `cover.jpg` only when the folder is otherwise
    empty, then empty folders are removed up to (excluding) the target folder.
    In both cases the DB row becomes `ignored` with no file path; the `archive.txt` line stays,
    so the video is never fetched again by search/watchlist. The sidecar is removed.
    """
    row = db.get_video(video_id)
    if not row or row.get("status") != "done":
        return {"ok": False, "error": "Eintrag ist nicht in der Bibliothek"}
    removed: list[str] = []
    if delete_file and row.get("file_path"):
        path = Path(row["file_path"])
        root = settings.target_dir_path()
        if not within(path, root):
            return {
                "ok": False,
                "error": f"Datei liegt ausserhalb des Zielordners ({root}) – nicht gelöscht",
            }
        if path.is_dir():
            return {"ok": False, "error": f"Kein Dateipfad: {path}"}
        try:
            for victim in (path, path.with_suffix(".cue")):
                if victim.is_file() and within(victim, root):
                    victim.unlink()
                    removed.append(victim.name)
        except OSError as exc:
            log.error("Löschen fehlgeschlagen (%s): %s", video_id, exc)
            return {
                "ok": False,
                "error": f"Datei konnte nicht gelöscht werden (in Benutzung?): {exc}",
            }
        prune_empty_dirs(path.parent, root)
    sidecar.delete(video_id)
    db.mark_removed(video_id)
    log.info("Aus der Bibliothek entfernt: %s (%s)", video_id, ", ".join(removed) or "ohne Datei")
    return {"ok": True, "deleted": removed}
