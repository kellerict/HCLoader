"""Playlist export (v0.8.0): M3U8 files for a festival edition/series, a genre, a DJ, the current
library filter, a collector checklist and «Continue listening». No network.

Format: UTF-8 without BOM, `#EXTM3U`, then per set `#EXTINF:<seconds>,<Artist> - <Title>` and the
path. Paths are relative to the folder of the playlist by default (the playlist keeps working
when the whole music folder moves or sits on a USB stick); a file on another drive or share
cannot be relative on Windows and is written absolute (`absolute_fallback` counts them). Sets
whose file is missing are skipped (`skipped`).

A spec says what is exported (language-neutral, stored with saved playlists):
  {kind: "edition", edition_id} | {kind: "series", series_id} | {kind: "genre", genre}
  {kind: "artist", key} | {kind: "filter", filters: {search, genre, channel, year, ...}, sort}
  {kind: "checklist", edition_id} | {kind: "continue"}
Every export is remembered in the table `playlists` (by path); those marked `sync` are
rewritten after downloads when `playlists.sync_after_download` is on.
"""

from __future__ import annotations

import contextlib
import json
import logging
import ntpath
import os
import posixpath
import re
import sys
import tempfile
from collections.abc import Mapping
from pathlib import Path
from types import ModuleType
from typing import Any

from . import artists, library, paths, playback, series
from .config import UNSORTED, Settings, expand_path
from .db import Database, now_iso
from .filters import normalize
from .i18n import tr

log = logging.getLogger(__name__)

EXT = ".m3u8"
# length of the temporary file name «.hcl-XXXXXXXX.tmp» (tempfile.mkstemp)
TMP_NAME_LEN = 17
KINDS = ("edition", "series", "genre", "artist", "filter", "checklist", "continue")
MAX_NAME = 120
CONTINUE_MAX = 20
SORTS = ("newest", "title", "channel", "duration")


class PlaylistError(ValueError):
    """User-facing error (already translated)."""


def _pathmod() -> ModuleType:
    return ntpath if sys.platform == "win32" else posixpath


# --------------------------------------------------------------------------- spec


def clean_spec(spec: Any) -> dict[str, Any]:
    """Validate a spec from the UI; raises PlaylistError."""
    if not isinstance(spec, Mapping) or spec.get("kind") not in KINDS:
        raise PlaylistError(tr("playlist.spec_invalid"))
    kind = spec["kind"]
    out: dict[str, Any] = {"kind": kind}
    try:
        if kind in ("edition", "checklist"):
            out["edition_id"] = int(spec["edition_id"])
        elif kind == "series":
            out["series_id"] = int(spec["series_id"])
        elif kind == "genre":
            out["genre"] = str(spec.get("genre") or "").strip() or UNSORTED
        elif kind == "artist":
            out["key"] = str(spec["key"]).strip()
            if not out["key"]:
                raise ValueError
        elif kind == "filter":
            f = spec.get("filters") if isinstance(spec.get("filters"), Mapping) else {}
            keep = ("search", "genre", "channel", "year", "platform", "series_id", "edition_id")
            out["filters"] = {k: f[k] for k in keep if f.get(k) not in (None, "")}
            out["sort"] = spec.get("sort") if spec.get("sort") in SORTS else "newest"
    except (KeyError, TypeError, ValueError) as exc:
        raise PlaylistError(tr("playlist.spec_invalid")) from exc
    return out


def _edition(db: Database, edition_id: int) -> dict[str, Any] | None:
    return series.edition_map(db).get(int(edition_id))


def default_name(db: Database, settings: Settings, spec: Mapping[str, Any]) -> str:
    """Suggested file name (without extension) in the UI language; names are data."""
    kind = spec["kind"]
    if kind in ("edition", "checklist"):
        ed = _edition(db, spec["edition_id"])
        name = ed["edition"] if ed else tr("playlist.name_edition")
        return tr("playlist.name_checklist", name=name) if kind == "checklist" else name
    if kind == "series":
        s = db.query_one("SELECT name FROM series WHERE id = ?", (spec["series_id"],))
        return s["name"] if s else tr("playlist.name_edition")
    if kind == "genre":
        return spec["genre"]
    if kind == "artist":
        d = artists.detail(db, settings, spec["key"])
        return d["artist"]["name"] if d else spec["key"]
    if kind == "continue":
        return tr("playlist.name_continue")
    f = spec.get("filters") or {}
    parts = [str(f[k]) for k in ("search", "genre", "channel", "year") if f.get(k)]
    if f.get("edition_id"):
        ed = _edition(db, f["edition_id"])
        if ed:
            parts.insert(0, ed["edition"])
    return " · ".join(parts) if parts else tr("playlist.name_library")


# --------------------------------------------------------------------------- items


def _done_rows(db: Database, where: str, params: tuple[Any, ...], order: str) -> list[dict]:
    return db.query(
        f"SELECT * FROM videos WHERE status = 'done' AND {where} ORDER BY {order}", params
    )


def resolve(db: Database, settings: Settings, spec: Mapping[str, Any]) -> list[dict[str, Any]]:
    """Video rows (status done) of a spec in playlist order (missing files included)."""
    kind = spec["kind"]
    if kind == "edition":
        return _done_rows(
            db,
            "edition_id = ?",
            (spec["edition_id"],),
            "IFNULL(stage, 'zzz'), upload_date, title COLLATE NOCASE",
        )
    if kind == "series":
        return _done_rows(
            db,
            "edition_id IN (SELECT id FROM editions WHERE series_id = ?)",
            (spec["series_id"],),
            "(SELECT year FROM editions e WHERE e.id = videos.edition_id) DESC, "
            "IFNULL(stage, 'zzz'), upload_date, title COLLATE NOCASE",
        )
    if kind == "genre":
        return _done_rows(
            db, "IFNULL(genre, ?) = ?", (UNSORTED, spec["genre"]), "downloaded_at DESC"
        )
    if kind == "artist":
        k = artists.resolve_key(db, settings, spec["key"])
        ids = artists.video_ids(db, settings, k) if k else []
        return _by_ids(db, ids)
    if kind == "checklist":
        rows = db.query(
            "SELECT video_id FROM checklist_rows WHERE edition_id = ? AND status = 'downloaded' "
            "AND video_id IS NOT NULL ORDER BY position, id",
            (spec["edition_id"],),
        )
        return _by_ids(db, list(dict.fromkeys(r["video_id"] for r in rows)))
    if kind == "continue":
        items = playback.continue_listening(db, settings, CONTINUE_MAX)
        return _by_ids(db, [i["id"] for i in items])
    # filter: same rules as the library list (search also matches the festival name)
    items = library.list_library(db, {k: v for k, v in spec["filters"].items() if k != "search"})
    q = normalize(str(spec["filters"].get("search") or ""))
    if q:
        items = [
            i
            for i in items
            if q
            in normalize(
                f"{i['title']} {i['artist']} {i['genre']} {i['file_path']} "
                f"{(i.get('festival') or {}).get('edition') or ''}"
            )
        ]
    sort = spec.get("sort") or "newest"
    if sort == "title":
        items.sort(key=lambda i: normalize(i["title"]))
    elif sort == "channel":
        items.sort(key=lambda i: (normalize(i["artist"]), i.get("downloaded_at") or ""))
    elif sort == "duration":
        items.sort(key=lambda i: -(i.get("duration") or 0))
    return _by_ids(db, [i["id"] for i in items])


def _by_ids(db: Database, ids: list[str]) -> list[dict[str, Any]]:
    out = []
    for vid in ids:
        r = db.get_video(vid)
        if r and r.get("status") == "done":
            out.append(r)
    return out


# --------------------------------------------------------------------------- rendering


def entry_path(
    file: str, base_dir: str, relative: bool, mod: ModuleType | None = None
) -> tuple[str, bool]:
    """(path to write, fell back to absolute). Relative to `base_dir`; another drive or share
    (Windows: `relpath` raises) gives the absolute path."""
    m = mod or _pathmod()
    if not relative:
        return file, False
    try:
        return m.relpath(file, base_dir), False
    except ValueError:
        return file, True


# line breaks of any kind (some parsers also break at U+0085, U+2028, U+2029)
_LINE = re.compile(r"[\r\n\x0b\x0c\x85\u2028\u2029]+")
_TITLE_SPLIT = re.compile(r"\s+[|@~•·]\s+|\s+[-–—]\s+|\s*\|\s*")


def label(row: Mapping[str, Any], names: list[str], settings: Settings) -> str:
    """«Artist - Title» for #EXTINF. Artist = credited DJs (b2b joined), else the channel;
    a title segment that only repeats the artist is dropped («Sub Zero Project | Defqon.1
    2024 | RED» -> «Sub Zero Project - Defqon.1 2024 | RED»)."""
    title = paths.clean_title(str(row.get("title") or ""), settings.storage.title_cleanup_patterns)
    artist = " b2b ".join(names) if names else str(row.get("channel_name") or "").strip()
    if names:
        keys = {artists.key_of(n) for n in names} | {artists.key_of(" b2b ".join(names))}
        segs = [s for s in _TITLE_SPLIT.split(title) if s and s.strip()]
        kept = [s.strip() for s in segs if artists.key_of(s) not in keys]
        if kept and len(kept) < len(segs):
            title = " | ".join(kept)
    text = f"{artist} - {title}" if artist else title
    return _LINE.sub(" ", text).strip()


def render(
    rows: list[dict[str, Any]],
    playlist: Path | str,
    *,
    relative: bool,
    labels: Mapping[str, str],
    mod: ModuleType | None = None,
) -> tuple[str, dict[str, int]]:
    """M3U8 text and counts {count, skipped (file missing), absolute_fallback}."""
    m = mod or _pathmod()
    base = m.dirname(str(playlist))
    lines = ["#EXTM3U"]
    counts = {"count": 0, "skipped": 0, "absolute_fallback": 0}
    for r in rows:
        fp = str(r.get("file_path") or "")
        if not fp or not _exists(fp):
            counts["skipped"] += 1
            continue
        p, fell_back = entry_path(fp, base, relative, m)
        counts["absolute_fallback"] += int(fell_back)
        p = _LINE.sub(" ", p)
        if not fell_back and relative and (p.lstrip().startswith("#") or p[:1].isspace()):
            # «#HardstyleMixes\…» would read as a comment line, and players strip leading
            # whitespace (« #Mix\…» likewise): anchor it as «.\…»
            p = m.curdir + m.sep + p
        dur = int(r["duration"]) if r.get("duration") else -1
        text = _LINE.sub(" ", str(labels.get(r["id"]) or "")).strip()
        if not text:
            text = _LINE.sub(" ", str(r.get("title") or "")).strip() or str(r["id"])
        lines.append(f"#EXTINF:{dur},{text}")
        lines.append(p)
        counts["count"] += 1
    return "\n".join(lines) + "\n", counts


def _exists(fp: str) -> bool:
    try:
        return Path(fp).is_file()
    except OSError:
        return False


def target_path(folder: Path | str, name: str, settings: Settings) -> Path:
    """Folder + sanitised name + .m3u8, shortened to fit `storage.max_path_length`."""
    folder = Path(folder)
    raw = str(name or "").strip()
    if raw.lower().endswith(EXT):  # «foo.m3u8» -> foo.m3u8, not foo.m3u8.m3u8
        raw = raw[: -len(EXT)].strip()
    base = paths.sanitize_filename(paths.truncate(raw, MAX_NAME), fallback="")
    if not base:
        raise PlaylistError(tr("playlist.name_missing"))
    limit = settings.storage.max_path_length
    # the temporary file next to it must fit as well (see `_write`)
    if paths.windows_length(folder / ("x" * TMP_NAME_LEN)) >= limit:
        raise PlaylistError(tr("playlist.path_too_long", max=limit))
    while paths.windows_length(folder / f"{base}{EXT}") >= limit:
        shorter = paths.truncate(base, len(base) - 1)
        if len(shorter) < 3 or shorter == base:
            raise PlaylistError(tr("playlist.path_too_long", max=limit))
        base = shorter
    return folder / f"{base}{EXT}"


# --------------------------------------------------------------------------- export


def preview(db: Database, settings: Settings, spec: Any) -> dict[str, Any]:
    """What an export would contain: {name, folder, relative, count, missing, seconds}."""
    s = clean_spec(spec)
    rows = resolve(db, settings, s)
    present = [r for r in rows if r.get("file_path") and _exists(str(r["file_path"]))]
    saved = db.query_one(
        "SELECT * FROM playlists WHERE spec = ? ORDER BY updated DESC LIMIT 1", (_spec_json(s),)
    )
    return {
        "spec": s,
        "name": default_name(db, settings, s),
        "folder": str(settings.playlist_dir_path()),
        "relative": bool(settings.playlists.relative_paths),
        "count": len(present),
        "missing": len(rows) - len(present),
        "seconds": int(sum(int(r.get("duration") or 0) for r in present)),
        "saved": _saved_view(saved) if saved else None,
    }


def _spec_json(spec: Mapping[str, Any]) -> str:
    return json.dumps(spec, sort_keys=True, ensure_ascii=False)


def export(
    db: Database,
    settings: Settings,
    spec: Any,
    opts: Mapping[str, Any] | None = None,
    *,
    mod: ModuleType | None = None,
) -> dict[str, Any]:
    """Write the playlist. opts: name, folder, relative (default from settings), overwrite,
    sync (remember for «keep up to date»). An existing file without `overwrite` ->
    {ok: False, exists: True, path}."""
    o = opts or {}
    s = clean_spec(spec)
    folder = str(o.get("folder") or "").strip()
    folder_path = expand_path(folder) if folder else settings.playlist_dir_path()
    if not folder_path.is_absolute():
        raise PlaylistError(tr("playlist.folder_relative"))
    name = str(o.get("name") or "").strip() or default_name(db, settings, s)
    target = target_path(folder_path, name, settings)
    relative = bool(o.get("relative", settings.playlists.relative_paths))
    if target.exists() and not o.get("overwrite"):
        return {"ok": False, "exists": True, "path": str(target)}
    res = _write(db, settings, s, target, relative, mod=mod)
    sync = bool(o.get("sync", False))
    _remember(db, s, target, name, relative, sync, res["count"])
    log.info(tr("playlist.exported", path=target, n=res["count"]))
    return {"ok": True, "path": str(target), "relative": relative, "sync": sync, **res}


def _write(
    db: Database,
    settings: Settings,
    spec: Mapping[str, Any],
    target: Path,
    relative: bool,
    *,
    mod: ModuleType | None = None,
) -> dict[str, int]:
    rows = resolve(db, settings, spec)
    idx = artists.index(db, settings)
    labels = {r["id"]: label(r, idx.names_of(r["id"]), settings) for r in rows}
    text, counts = render(rows, target, relative=relative, labels=labels, mod=mod)
    tmp: str | None = None
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        # own unique temporary file (a GUI and a headless sync never share one, an unrelated
        # «<name>.tmp» is never overwritten); short name, checked in `target_path`
        fd, tmp = tempfile.mkstemp(prefix=".hcl-", suffix=".tmp", dir=target.parent)
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(text)
        with contextlib.suppress(OSError):  # mkstemp creates 0600; a playlist is shared
            os.chmod(tmp, 0o644)
        os.replace(tmp, target)
        tmp = None
    except OSError as exc:
        raise PlaylistError(tr("playlist.write_failed", error=exc)) from exc
    finally:
        if tmp is not None:
            with contextlib.suppress(OSError):
                os.unlink(tmp)
    return counts


def _remember(
    db: Database,
    spec: Mapping[str, Any],
    target: Path,
    name: str,
    relative: bool,
    sync: bool,
    n: int,
) -> None:
    now = now_iso()
    db.execute(
        "INSERT INTO playlists(name, spec, path, relative, sync, count, created, updated) "
        "VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(path) DO UPDATE SET name=excluded.name, "
        "spec=excluded.spec, relative=excluded.relative, sync=excluded.sync, "
        "count=excluded.count, updated=excluded.updated",
        (name, _spec_json(spec), str(target), int(relative), int(sync), n, now, now),
    )


def _saved_view(r: Mapping[str, Any]) -> dict[str, Any]:
    try:
        spec = json.loads(r["spec"])
    except (TypeError, ValueError):
        spec = {}
    return {
        "id": r["id"],
        "name": r["name"],
        "path": r["path"],
        "kind": spec.get("kind"),
        "relative": bool(r["relative"]),
        "sync": bool(r["sync"]),
        "count": r["count"],
        "updated": r["updated"],
        "exists": _exists(r["path"]),
    }


def saved(db: Database) -> list[dict[str, Any]]:
    return [_saved_view(r) for r in db.query("SELECT * FROM playlists ORDER BY updated DESC, id")]


def set_sync(db: Database, playlist_id: int, sync: bool) -> bool:
    cur = db.execute(
        "UPDATE playlists SET sync = ? WHERE id = ?", (int(bool(sync)), int(playlist_id))
    )
    return cur.rowcount > 0


def forget(db: Database, playlist_id: int) -> bool:
    """Remove a saved playlist from the list (the file itself stays)."""
    return db.execute("DELETE FROM playlists WHERE id = ?", (int(playlist_id),)).rowcount > 0


def sync_all(
    db: Database,
    settings: Settings,
    *,
    only: list[int] | None = None,
    mod: ModuleType | None = None,
) -> dict[str, Any]:
    """Rewrite the saved playlists marked `sync` (or `only` these ids). Errors are counted and
    logged per playlist; a playlist whose spec no longer resolves is written empty."""
    if only is not None:
        marks = ",".join("?" for _ in only) or "NULL"
        rows = db.query(f"SELECT * FROM playlists WHERE id IN ({marks})", [int(i) for i in only])
    else:
        rows = db.query("SELECT * FROM playlists WHERE sync = 1 ORDER BY id")
    done, failed, gone = [], 0, 0
    for r in rows:
        if only is None and not _exists(r["path"]):
            # deleted in Explorer: do not bring it back - stop keeping it up to date (the
            # settings list shows it as «gone»; «Write now» or a new export recreate it)
            db.execute("UPDATE playlists SET sync = 0 WHERE id = ?", (r["id"],))
            gone += 1
            log.info(tr("playlist.gone_unsynced", path=r["path"]))
            continue
        try:
            spec = clean_spec(json.loads(r["spec"]))
            counts = _write(db, settings, spec, Path(r["path"]), bool(r["relative"]), mod=mod)
            db.execute(
                "UPDATE playlists SET count = ?, updated = ? WHERE id = ?",
                (counts["count"], now_iso(), r["id"]),
            )
            done.append(r["path"])
        except (PlaylistError, ValueError, OSError) as exc:
            failed += 1
            log.warning(tr("playlist.sync_failed", path=r["path"], error=exc))
    if done:
        log.info(tr("playlist.synced", n=len(done)))
    return {"ok": True, "synced": len(done), "failed": failed, "gone": gone, "paths": done}
