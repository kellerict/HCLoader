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
import threading
from collections.abc import Callable, Mapping
from pathlib import Path
from typing import Any

from mutagen import File as MutagenFile
from mutagen.id3 import ID3, ID3NoHeaderError

from . import config, fingerprint, paths, platforms, series, sidecar, tagging
from .config import UNSORTED, Settings
from .db import Database
from .filters import normalize
from .genre import detect_genre
from .i18n import tr

log = logging.getLogger(__name__)

COVER_NAME = "cover.jpg"
# files that do not count as content when deciding whether a folder is empty (n5)
_JUNK_NAMES = {COVER_NAME, "desktop.ini", "thumbs.db"}
ROOT_CHECK_TIMEOUT_S = 3.0
# n1: one lock for everything that creates/moves/removes files in the library (downloader's final
# move, re-tag, delete, pruning of empty folders). Re-entrant: retag -> prune_empty_dirs.
FS_LOCK = threading.RLock()
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
    """Same file on disk (symlinks/junctions, case-insensitive file systems); lexical fallback
    when one of them does not exist."""
    try:
        if a.exists() and b.exists():
            return os.path.samefile(a, b)
    except OSError:
        pass
    return os.path.normcase(os.path.abspath(a)) == os.path.normcase(os.path.abspath(b))


def _under(path: Path | str, root: Path | str) -> bool:
    """Lexical `path` below `root` (no resolve: must not touch a dead network share)."""
    p = Path(os.path.normcase(os.path.abspath(path)))
    r = Path(os.path.normcase(os.path.abspath(root)))
    return p != r and r in p.parents


def target_reachable(root: Path | str, timeout: float = ROOT_CHECK_TIMEOUT_S) -> bool:
    """Is the target folder there? The check runs in a thread with a timeout, because a dead SMB
    share can block a `stat` for a minute; a timeout counts as unreachable."""
    result: list[bool] = []

    def probe() -> None:
        try:
            result.append(Path(root).is_dir())
        except OSError:
            result.append(False)

    t = threading.Thread(target=probe, name="target-check", daemon=True)
    t.start()
    t.join(timeout)
    return bool(result and result[0])


def _move(src: Path, dst: Path) -> None:
    """Move a file. A pure case change (same file, different spelling; Windows) goes through a
    temporary name. If a cross-volume move fails half-way, the copy at the target is removed."""
    if _same_file(src, dst):
        tmp = dst.with_name(f"{dst.name}.hcl-rename")
        os.replace(src, tmp)
        os.replace(tmp, dst)
        return
    try:
        shutil.move(str(src), str(dst))
    except OSError:
        if src.exists() and dst.exists():
            try:
                dst.unlink()
            except OSError:
                log.warning(tr("library.copy_not_removed", path=dst))
        raise


def prune_empty_dirs(start: Path, root: Path) -> list[Path]:
    """Remove `start` and its parents while they are empty (only `cover.jpg`, `desktop.ini` and
    `Thumbs.db` count as empty),
    never `root` itself and never anything outside of it. Returns the removed folders."""
    removed: list[Path] = []
    cur = Path(start)
    with FS_LOCK:
        while within(cur, root):
            try:
                entries = list(cur.iterdir())
                if entries and all(e.name.lower() in _JUNK_NAMES and e.is_file() for e in entries):
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
            log.debug("Duration not readable: %s", path, exc_info=True)
    return None


def library_item(
    row: dict[str, Any],
    *,
    root: Path | None = None,
    root_ok: bool = True,
    editions: Mapping[int, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """`root_ok=False` (target folder unreachable): for files below `root` nothing is probed, the
    state is unknown (`unknown: true`, `missing: false`) instead of «missing».
    `editions` (series.edition_map) fills `festival` / `festival_suggestion` (v0.3.0)."""
    fp = row.get("file_path") or ""
    path = Path(fp) if fp else None
    unknown = bool(path and root is not None and not root_ok and _under(path, root))
    if unknown:
        present, size = False, 0.0
    else:
        try:
            present = bool(path and path.is_file())
            size = round(path.stat().st_size / (1024 * 1024), 1) if present and path else 0.0
        except OSError:
            present, size = False, 0.0
    festival, suggestion = series.festival_info(row, editions or {})
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
        "missing": not present and not unknown,
        "unknown": unknown,
        "has_cue": bool(path and present and path.with_suffix(".cue").is_file()),
        "platform": row.get("platform") or platforms.platform_of(row["id"]),
        "genre_manual": bool(row.get("genre_manual")),
        "thumbnail": row.get("thumbnail") or None,
        "festival": festival,
        "festival_suggestion": suggestion,
    }


def list_library(
    db: Database,
    filters: Mapping[str, Any] | None = None,
    *,
    root: Path | None = None,
    root_ok: bool = True,
) -> list[dict[str, Any]]:
    """Items with status `done`, newest download first.

    filters (all optional): `search` (title/channel/genre, case and umlaut insensitive),
    `genre` (name), `channel` (channel id or channel name), `year` (int or "YYYY"),
    `missing` (true = only items whose file is gone). With `root_ok=False` (target folder not
    reachable, see `target_reachable`) files below `root` are neither present nor missing.
    v0.3.0: `series_id`, `edition_id`, `event_year`, `stage`, `set_type` (assigned values) and
    `festival` ("assigned" | "none" = no edition | "suggested" = only a suggestion).
    """
    f = filters or {}
    genre = str(f.get("genre") or "").strip()
    channel = str(f.get("channel") or "").strip()
    year = str(f.get("year") or "").strip()
    search = normalize(str(f.get("search") or ""))
    want_missing = f.get("missing")
    want_platform = str(f.get("platform") or "").strip()
    rows = db.list_videos(status="done", order_by="downloaded_at")
    editions = series.edition_map(db)
    out: list[dict[str, Any]] = []
    for row in rows:
        if want_platform and (row.get("platform") or "youtube") != want_platform:
            continue
        if not _festival_filter(row, f, editions):
            continue
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
        item = library_item(row, root=root, root_ok=root_ok, editions=editions)
        if want_missing is not None and bool(want_missing) != item["missing"]:
            continue
        out.append(item)
    return out


def _festival_filter(
    row: Mapping[str, Any], f: Mapping[str, Any], editions: Mapping[int, dict[str, Any]]
) -> bool:
    ed = editions.get(row.get("edition_id")) if row.get("edition_id") else None
    mode = str(f.get("festival") or "").strip()
    if mode == "assigned" and not ed:
        return False
    if mode == "none" and ed:
        return False
    if mode == "suggested" and (ed or not row.get("suggested_edition_id")):
        return False
    for key, value in (
        ("series_id", ed and ed["series_id"]),
        ("edition_id", ed and ed["edition_id"]),
        ("event_year", ed and ed["event_year"]),
    ):
        want = f.get(key)
        if want not in (None, "") and str(want) != str(value or ""):
            return False
    for key in ("stage", "set_type"):
        want = f.get(key)
        if want not in (None, "") and (not ed or str(want) != str(row.get(key) or "")):
            return False
    return True


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
        log.debug("Cover not readable: %s", path, exc_info=True)
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
        log.warning(tr("library.cue_not_adjusted", path=cue, error=exc))


def retag(db: Database, settings: Settings, video_id: str) -> dict[str, Any]:
    """Re-tag one item (see `_retag`), serialised with the downloader's final move and deletes."""
    with FS_LOCK:
        return _retag(db, settings, video_id)


def _retag(db: Database, settings: Settings, video_id: str) -> dict[str, Any]:
    """Rewrite tags, cover, CUE and CHAP from the sidecar and the *current* settings, and move
    the file to the path the current template gives. No network.

    Returns {ok, path, moved, genre, cue, sidecar} or {ok: False, error}.
    A file outside the target folder is tagged in place but never moved. MP3: ID3 frames the app
    does not write itself (BPM, key, rating, ReplayGain, lyrics ...) are kept.
    """
    row = db.get_video(video_id)
    if not row or row.get("status") != "done" or not row.get("file_path"):
        return {"ok": False, "error": tr("library.not_in_library")}
    path = Path(row["file_path"])
    if not path.is_file():
        return {"ok": False, "error": tr("library.file_missing", path=path)}
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
    platform = platforms.platform_of(video_id)
    url = (
        (data or {}).get("url")
        or row.get("url")
        or (f"https://www.youtube.com/watch?v={video_id}" if platform == platforms.YOUTUBE else "")
    )
    tag_meta = {
        "title": title,
        "artist": artist,
        "albumartist": artist,
        "album": title,
        "genre": genre,
        "date": upload,
        "url": url,
        "id": platforms.native_id(video_id),
        "platform": platform,
        "source": (data or {}).get("source") or platforms.label(platform),
    }
    # v0.3.0: TXXX:FESTIVAL … + album = edition (stored assignment; no re-detection here)
    fest = series.tag_fields(db, video_id)
    series.apply_to_tags(tag_meta, fest, settings)
    total = float(duration) if duration else None

    root = settings.target_dir_path()
    new_path = path
    if within(path, root):
        try:
            new_path = paths.build_target_path(
                root,
                st.path_template,
                {
                    "id": platforms.file_id(video_id),
                    "platform": platform,
                    "title": title,
                    "artist": artist,
                    "channel": channel,
                    "genre": genre,
                    "upload_date": upload,
                    **series.path_values(fest),
                },
                ext=path.suffix,
                max_title_length=st.max_title_length,
                max_path_length=st.max_path_length,
            )
        except paths.PathTooLongError as exc:
            log.warning(tr("library.retag_path_long", id=video_id, error=exc))
            return {
                "ok": False,
                "error": tr("library.path_too_long", error=exc),
            }
        except (ValueError, OSError) as exc:
            log.warning(tr("library.retag_path_failed", id=video_id, error=exc))
            return {"ok": False, "error": tr("library.path_impossible", error=exc)}
    same = _same_file(new_path, path)
    # a pure case change counts as a rename (same file, other spelling)
    moving = str(new_path) != str(path) and (not same or new_path.name != path.name)
    if moving and not same and new_path.exists():
        return {"ok": False, "error": tr("library.target_exists", path=new_path)}

    try:
        tagging.write_tags(
            path,
            tag_meta,
            # Review P5 R2-m1: for MP3 the existing pictures (front cover, back, user images)
            # stay untouched - the cover only comes from the file anyway. M4A/Opus keep the
            # old behaviour (single cover rewritten from the file).
            cover_jpeg=None if path.suffix.lower() == ".mp3" else cover,
            chapters=chapters,
            id3_chapters=dl.write_id3_chapters,
            total_duration=total,
            keep_existing=True,
        )
    except Exception as exc:
        log.error(tr("library.retag_failed_log", id=video_id, error=exc))
        return {"ok": False, "error": tr("library.tags_failed", error=exc)}

    old_cue = path.with_suffix(".cue")
    had_cue = old_cue.is_file()
    if moving:
        try:
            new_path.parent.mkdir(parents=True, exist_ok=True)
            _move(path, new_path)
        except OSError as exc:
            log.error(tr("library.move_failed_log", id=video_id, error=exc))
            return {"ok": False, "error": tr("library.move_failed", error=exc)}
        db.set_file_path(video_id, str(new_path))
    else:
        db.set_file_path(video_id, str(path))  # new tags change the size (statistics)
    db.set_genre(video_id, genre, manual=bool(manual))

    new_cue = new_path.with_suffix(".cue")
    cue_written = False
    try:
        if chapters and (dl.write_cue or had_cue):
            tagging.write_cue(new_path, chapters, performer=artist, title=title)
            cue_written = True
            if had_cue and not _same_file(old_cue, new_cue):
                old_cue.unlink(missing_ok=True)
        elif had_cue and str(old_cue) != str(new_cue):
            _move(old_cue, new_cue)
            _rewrite_cue_file_line(new_cue, new_path.name)
            cue_written = True
        elif had_cue:
            cue_written = True
    except (OSError, tagging.TaggingError) as exc:
        log.warning(tr("library.cue_not_updated", path=video_id, error=exc))
    if cover and dl.write_cover_jpg:
        try:
            cover_file = new_path.parent / COVER_NAME
            if not cover_file.exists():
                cover_file.write_bytes(cover)
        except OSError as exc:
            log.warning(tr("library.cover_jpg_failed", path=video_id, error=exc))
    if moving and within(path.parent, root):
        prune_empty_dirs(path.parent, root)
    if data is not None and data.get("genre") != genre:
        sidecar.write(video_id, {**data, "genre": genre})
    log.info(
        tr("library.retagged", title=new_path, moved=tr("library.moved_suffix") if moving else "")
    )
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
    with FS_LOCK:
        return _delete_item(db, settings, video_id, delete_file=delete_file)


def _delete_item(
    db: Database, settings: Settings, video_id: str, *, delete_file: bool = True
) -> dict[str, Any]:
    """Remove a library item.

    `delete_file=True`: the file and its `.cue` are deleted (only inside the target folder; a
    path outside is refused and nothing changes), `cover.jpg` only when the folder is otherwise
    empty, then empty folders are removed up to (excluding) the target folder.
    In both cases the DB row becomes `ignored` with no file path; the `archive.txt` line stays,
    so the video is never fetched again by search/watchlist. The sidecar is removed.
    A file outside the target folder is refused (`outside: true`); the UI then offers
    `delete_file=False`. If the target folder is unreachable nothing happens (`unreachable: true`).
    """
    row = db.get_video(video_id)
    if not row or row.get("status") != "done":
        return {"ok": False, "error": tr("library.not_in_library")}
    removed: list[str] = []
    root = settings.target_dir_path()
    fp = row.get("file_path")
    if fp and _under(fp, root) and not target_reachable(root):
        # the file's state is unknown: never drop the entry (m2)
        return {
            "ok": False,
            "error": tr("library.target_unreachable", path=root),
            "unreachable": True,
        }
    if delete_file and fp:
        path = Path(fp)
        if not within(path, root):
            return {
                "ok": False,
                "error": tr("library.outside_target", path=root),
                "outside": True,
            }
        if path.is_dir():
            return {"ok": False, "error": tr("library.no_path", id=path)}
        try:
            # .cue first: if the audio file cannot be deleted (in use), the DB stays consistent
            for victim in (path.with_suffix(".cue"), path):
                if victim.is_file() and within(victim, root):
                    victim.unlink()
                    removed.append(victim.name)
        except OSError as exc:
            log.error(tr("library.delete_failed_log", id=video_id, error=exc))
            return {
                "ok": False,
                "error": tr("library.delete_failed", error=exc),
            }
        prune_empty_dirs(path.parent, root)
    sidecar.delete(video_id)
    db.mark_removed(video_id)
    log.info(
        tr("library.removed", title=video_id, what=", ".join(removed) or tr("library.without_file"))
    )
    return {"ok": True, "deleted": removed}


# --------------------------------------------------------------------------- re-uploads (v0.10.0)

ORIGINAL_STATES = ("ok", "missing", "gone", "unknown")


def original_state(
    db: Database, original_id: str, root: Path | str, root_ok: bool | None = None
) -> str:
    """State of the original of a re-upload mark (review v0.10.0 M1):
    `ok` (in the library, file present and readable), `missing` (in the library, file gone or
    unreadable), `gone` (no longer in the library: deleted, re-queued, failed) or `unknown`
    (file below the target folder, which is unreachable). `root_ok` = known reachability."""
    row = db.get_video(original_id)
    if not row or row.get("status") != "done" or not row.get("file_path"):
        return "gone"
    path = Path(row["file_path"])
    if _under(path, root):
        reachable = target_reachable(root) if root_ok is None else root_ok
        if not reachable:
            return "unknown"
    try:
        if path.is_file() and os.access(path, os.R_OK):
            return "ok"
    except OSError:
        pass
    return "missing"


def annotate_reuploads(
    db: Database,
    items: list[dict[str, Any]],
    root: Path | str,
    root_ok: bool | None = None,
    *,
    only_open: bool = False,
) -> list[dict[str, Any]]:
    """Set `reupload` (fingerprint.info_of + `of.present`) on library items (one query for the
    marks, one state check per mark). `only_open`: keep only items with an open mark."""
    marks = fingerprint.reupload_map(db)
    present: dict[str, str] = {}
    for it in items:
        mark = marks.get(it["id"])
        if mark is not None:
            of = mark["of"]["id"]
            if of not in present:
                present[of] = original_state(db, of, root, root_ok)
            mark["of"]["present"] = present[of]
        it["reupload"] = mark
    if only_open:
        items = [it for it in items if it["reupload"] and it["reupload"]["state"] == "open"]
    return items


def list_reuploads(
    db: Database, root: Path | str, root_ok: bool | None = None, *, state: str = "open"
) -> list[dict[str, Any]]:
    """Marked library items (status done), newest download first: [{id, title, platform,
    channel, file_path, downloaded_at, reupload}]. `state` "open" or "all"."""
    items = []
    for vid, mark in fingerprint.reupload_map(db).items():
        if state != "all" and mark["state"] != "open":
            continue
        row = db.get_video(vid) or {}
        if row.get("status") != "done":
            continue
        mark["of"]["present"] = original_state(db, mark["of"]["id"], root, root_ok)
        items.append(
            {
                "id": vid,
                "title": row.get("title") or "",
                "platform": row.get("platform") or platforms.platform_of(vid),
                "channel": row.get("channel_name") or "",
                "file_path": row.get("file_path"),
                "downloaded_at": row.get("downloaded_at"),
                "reupload": mark,
            }
        )
    items.sort(key=lambda x: str(x.get("downloaded_at") or ""), reverse=True)
    return items


def archive_forget(video_id: str) -> bool:
    """Remove the `archive.txt` line of `video_id` (atomic rewrite). True if one was removed."""
    archive = config.archive_path()
    line = platforms.archive_line(video_id)
    try:
        lines = archive.read_text(encoding="utf-8").splitlines()
    except OSError:
        return False
    keep = [ln for ln in lines if ln.strip() != line]
    if len(keep) == len(lines):
        return False
    tmp = archive.with_name(archive.name + ".tmp")
    try:
        tmp.write_text("".join(ln + "\n" for ln in keep), encoding="utf-8", newline="\n")
        os.replace(tmp, archive)
    except OSError as exc:
        log.warning(tr("yt.archive_not_writable", path=archive, error=exc))
        return False
    return True


def delete_reupload(db: Database, settings: Settings, video_id: str) -> dict[str, Any]:
    """«Delete this newer file» of a re-upload mark (M1). Allowed only while the original is
    in the library with its file present and readable; otherwise the copy is the last one and
    stays (`original: <state>`, the UI offers `adopt_reupload`). Runs under FS_LOCK, so no
    other library operation can move/delete the original in between. Should the original
    still vanish meanwhile (Explorer), the deleted item's archive line is removed, so the
    watchlist/search may fetch it again (`archive_removed: true`)."""
    with FS_LOCK:
        info = fingerprint.info_of(db, video_id)
        if not info:
            return {"ok": False, "error": tr("reupload.not_marked")}
        root = settings.target_dir_path()
        of_id = info["of"]["id"]
        state = original_state(db, of_id, root)
        if state != "ok":
            key = "reupload.original_unknown" if state == "unknown" else "reupload.original_missing"
            return {"ok": False, "error": tr(key), "original": state}
        res = _delete_item(db, settings, video_id, delete_file=True)
        if res.get("ok") and original_state(db, of_id, root) != "ok":
            res["archive_removed"] = archive_forget(video_id)
        return res


def adopt_reupload(db: Database, settings: Settings, video_id: str) -> dict[str, Any]:
    """«Original missing – keep this copy» (M1): the marked copy replaces its original. Allowed
    only when the original is `missing` or `gone`. A `missing` original row leaves the library
    (`ignored`, no file; its archive line stays because this copy is kept); the mark is
    dropped. -> {ok, id, removed: original id | None}. Fingerprint/analysis cleanup of the
    removed original is the caller's (`Api.delete_library_item` path)."""
    with FS_LOCK:
        info = fingerprint.info_of(db, video_id)
        if not info:
            return {"ok": False, "error": tr("reupload.not_marked")}
        of_id = info["of"]["id"]
        state = original_state(db, of_id, settings.target_dir_path())
        if state == "ok":
            return {"ok": False, "error": tr("reupload.original_present"), "original": state}
        if state == "unknown":
            return {"ok": False, "error": tr("reupload.original_unknown"), "original": state}
        removed = None
        if state == "missing":
            res = _delete_item(db, settings, of_id, delete_file=False)
            if not res.get("ok"):
                return res
            removed = of_id
        db.execute("DELETE FROM reuploads WHERE video_id=?", (video_id,))
        return {"ok": True, "id": video_id, "removed": removed, "reupload": None}
