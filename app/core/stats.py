"""v0.9.0 statistics view: library totals and breakdowns, offline from the database only.

Everything is computed with a handful of grouped queries over `videos` (status `done` = the
library) plus the cached DJ index (core/artists.py) - fast on 10k sets. The date range filters
library items by their download time (`downloaded_at`) and watchlist runs by their start.

File sizes come from `videos.file_size` (written with `file_path`, migration 15). Rows from
before v0.9.0 have no size yet: `measure_sizes` stats those files once (local file system only,
no network) and the view shows how many are still unmeasured meanwhile.
"""

from __future__ import annotations

import logging
import re
import threading
from collections.abc import Callable, Mapping
from datetime import UTC, date, datetime, time, timedelta
from pathlib import Path
from typing import Any

from . import artists, series
from .config import UNSORTED, Settings
from .db import Database, file_size_of

log = logging.getLogger(__name__)

TOP = 10
SIZE_BATCH = 200  # rows measured per transaction
RUN_KINDS = ("watchlist", "headless")  # runs that check the watchlist
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class RangeError(ValueError):
    pass


def _parse_day(value: Any) -> date | None:
    if value in (None, ""):
        return None
    if not isinstance(value, str) or not _DATE_RE.match(value):
        raise RangeError(value)
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise RangeError(value) from None


def _utc_bound(day: date) -> str:
    """Local midnight of `day` as an ISO UTC string (same format as `db.now_iso`)."""
    local = datetime.combine(day, time.min).astimezone()
    return local.astimezone(UTC).isoformat(timespec="seconds")


def date_range(opts: Mapping[str, Any] | None) -> tuple[str | None, str | None, dict[str, Any]]:
    """opts {from, to} (local dates YYYY-MM-DD, both optional, inclusive) -> (lower bound,
    exclusive upper bound) as ISO UTC strings + the normalised range for the answer."""
    o = opts or {}
    start, end = _parse_day(o.get("from")), _parse_day(o.get("to"))
    if start and end and end < start:
        start, end = end, start
    lo = _utc_bound(start) if start else None
    hi = _utc_bound(end + timedelta(days=1)) if end else None
    return (
        lo,
        hi,
        {"from": start.isoformat() if start else None, "to": end.isoformat() if end else None},
    )


def _where(lo: str | None, hi: str | None, col: str = "v.downloaded_at") -> tuple[str, list[Any]]:
    sql, params = "v.status = 'done'", []
    if lo:
        sql += f" AND {col} >= ?"
        params.append(lo)
    if hi:
        sql += f" AND {col} < ?"
        params.append(hi)
    return sql, params


def _in_range(value: Any, lo: str | None, hi: str | None) -> bool:
    s = str(value or "")
    if lo and (not s or s < lo):
        return False
    return not (hi and (not s or s >= hi))


def _months(rows: list[dict[str, Any]], lo: str | None, hi: str | None) -> list[dict[str, Any]]:
    """Fill the gaps: one entry per calendar month from the start of the range (or the first
    month with data) to its end (or the last month with data / now)."""
    by = {r["month"]: r for r in rows if r.get("month")}
    keys = sorted(by)
    if not keys and not lo:
        return []
    first = _local_month(lo) if lo else keys[0]
    if hi:
        last = _month_before(hi)
    elif keys:
        last = max(keys[-1], datetime.now().astimezone().strftime("%Y-%m")) if lo else keys[-1]
    else:
        last = datetime.now().astimezone().strftime("%Y-%m")
    if keys:
        first, last = min(first, keys[0]), max(last, keys[-1])
    out: list[dict[str, Any]] = []
    y, m = int(first[:4]), int(first[5:7])
    while (y, m) <= (int(last[:4]), int(last[5:7])) and len(out) < 600:  # max. 50 years
        key = f"{y:04d}-{m:02d}"
        out.append({**(by.get(key) or {}), "month": key})
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return out


def _local_month(bound: str) -> str:
    """Local calendar month of a UTC bound (review v0.9.0 m5: the range is in local days)."""
    return datetime.fromisoformat(bound).astimezone().strftime("%Y-%m")


def _month_before(hi: str) -> str:
    """Local month of the last instant before the exclusive bound `hi`."""
    return _local_month((datetime.fromisoformat(hi) - timedelta(seconds=1)).isoformat())


def _zero_fill(items: list[dict[str, Any]], keys: tuple[str, ...]) -> list[dict[str, Any]]:
    for it in items:
        for k in keys:
            it[k] = int(it.get(k) or 0)
    return items


def totals(db: Database, lo: str | None, hi: str | None) -> dict[str, Any]:
    where, params = _where(lo, hi)
    row = (
        db.query_one(
            "SELECT COUNT(*) AS sets, COALESCE(SUM(v.duration), 0) AS seconds, "
            "COALESCE(SUM(v.file_size), 0) AS bytes, "
            "SUM(CASE WHEN v.file_path IS NOT NULL AND v.file_size IS NULL THEN 1 ELSE 0 END) "
            "AS sizes_missing, MIN(v.downloaded_at) AS first, MAX(v.downloaded_at) AS last "
            f"FROM videos v WHERE {where}",
            params,
        )
        or {}
    )
    sets = int(row.get("sets") or 0)
    seconds = int(row.get("seconds") or 0)
    lib = db.query_one(
        "SELECT COUNT(*) AS n FROM videos WHERE status = 'done'",
    ) or {"n": 0}
    return {
        "sets": sets,
        "seconds": seconds,
        "bytes": int(row.get("bytes") or 0),
        "sizes_missing": int(row.get("sizes_missing") or 0),
        "avg_seconds": int(seconds / sets) if sets else 0,
        "first": row.get("first"),
        "last": row.get("last"),
        "library_sets": int(lib["n"] or 0),
    }


def by_genre(db: Database, settings: Settings, lo: str | None, hi: str | None) -> list[dict]:
    where, params = _where(lo, hi)
    rows = db.query(
        "SELECT COALESCE(NULLIF(v.genre, ''), ?) AS name, COUNT(*) AS sets, "
        "COALESCE(SUM(v.duration), 0) AS seconds, COALESCE(SUM(v.file_size), 0) AS bytes "
        f"FROM videos v WHERE {where} GROUP BY name ORDER BY sets DESC, name",
        [UNSORTED, *params],
    )
    colors = {g.name: g.color for g in settings.genres.items}
    for r in rows:
        r["color"] = colors.get(r["name"])
    return _zero_fill(rows, ("sets", "seconds", "bytes"))


def by_festival(db: Database, lo: str | None, hi: str | None) -> dict[str, Any]:
    """Top festivals (series of kind festival) by sets; `other` = sets of the remaining ones."""
    where, params = _where(lo, hi)
    rows = db.query(
        "SELECT s.key AS key, s.name AS name, COUNT(*) AS sets, "
        "COALESCE(SUM(v.duration), 0) AS seconds, COUNT(DISTINCT e.year) AS editions "
        "FROM videos v JOIN editions e ON e.id = v.edition_id "
        "JOIN series s ON s.id = e.series_id "
        f"WHERE {where} AND s.kind = 'festival' "
        "GROUP BY s.id ORDER BY sets DESC, s.name",
        params,
    )
    rows = _zero_fill(rows, ("sets", "seconds", "editions"))
    total = sum(r["sets"] for r in rows)
    top = rows[:TOP]
    return {"items": top, "other": total - sum(r["sets"] for r in top), "festivals": len(rows)}


def by_year(db: Database, lo: str | None, hi: str | None) -> list[dict[str, Any]]:
    """Sets per year of the event (edition year, else the upload year)."""
    where, params = _where(lo, hi)
    rows = db.query(
        "SELECT COALESCE(NULLIF(e.year, 0), CAST(substr(v.upload_date, 1, 4) AS INTEGER)) "
        "AS year, COUNT(*) AS sets, COALESCE(SUM(v.duration), 0) AS seconds "
        "FROM videos v LEFT JOIN editions e ON e.id = v.edition_id "
        f"WHERE {where} GROUP BY year ORDER BY year",
        params,
    )
    out = [r for r in _zero_fill(rows, ("sets", "seconds")) if r.get("year")]
    unknown = sum(r["sets"] for r in rows if not r.get("year"))
    if unknown:
        out.append({"year": None, "sets": unknown, "seconds": 0})
    return out


def by_platform(db: Database, lo: str | None, hi: str | None) -> list[dict[str, Any]]:
    where, params = _where(lo, hi)
    rows = db.query(
        "SELECT COALESCE(v.platform, 'youtube') AS platform, COUNT(*) AS sets, "
        "COALESCE(SUM(v.duration), 0) AS seconds, COALESCE(SUM(v.file_size), 0) AS bytes "
        f"FROM videos v WHERE {where} GROUP BY platform ORDER BY sets DESC",
        params,
    )
    return _zero_fill(rows, ("sets", "seconds", "bytes"))


def by_month(db: Database, lo: str | None, hi: str | None) -> list[dict[str, Any]]:
    where, params = _where(lo, hi)
    rows = db.query(
        # local month (SQLite 'localtime' = the OS time zone, like the range bounds)
        "SELECT strftime('%Y-%m', v.downloaded_at, 'localtime') AS month, COUNT(*) AS sets, "
        "COALESCE(SUM(v.duration), 0) AS seconds, COALESCE(SUM(v.file_size), 0) AS bytes "
        f"FROM videos v WHERE {where} AND v.downloaded_at IS NOT NULL "
        "GROUP BY month ORDER BY month",
        params,
    )
    return _zero_fill(_months(rows, lo, hi), ("sets", "seconds", "bytes"))


def top_djs(
    db: Database, settings: Settings, lo: str | None, hi: str | None, limit: int = TOP
) -> list[dict[str, Any]]:
    """Top DJs by sets in the range, from the cached DJ index (b2b sets count for each)."""
    idx = artists.index(db, settings)
    out = []
    for a in idx.artists.values():
        if a.hidden or not a.videos:
            continue
        rows = [
            idx.rows[v]
            for v in a.videos
            if v in idx.rows and _in_range(idx.rows[v].get("downloaded_at"), lo, hi)
        ]
        if rows:
            out.append(
                {
                    "key": a.key,
                    "name": a.name,
                    "initials": artists.initials(a.name),
                    "sets": len(rows),
                    "seconds": int(sum(int(r.get("duration") or 0) for r in rows)),
                }
            )
    out.sort(key=lambda d: (-d["sets"], -d["seconds"], d["name"].casefold()))
    return out[:limit]


def top_tracks(db: Database, lo: str | None, hi: str | None, limit: int = TOP) -> list[dict]:
    """Tracks that appear in the most library sets of the range (v0.6.0 tracklists)."""
    where, params = _where(lo, hi)
    keys = db.query(
        "SELECT t.key AS key, COUNT(DISTINCT t.video_id) AS sets FROM tracks t "
        f"JOIN videos v ON v.id = t.video_id WHERE {where} AND t.key <> '' "
        "GROUP BY t.key HAVING sets >= 2 ORDER BY sets DESC, t.key LIMIT ?",
        [*params, limit],
    )
    if not keys:
        return []
    marks = ",".join("?" for _ in keys)
    best: dict[str, dict[str, Any]] = {}
    for s in db.query(
        "SELECT t.key, t.artist, t.title, t.version, COUNT(*) AS n FROM tracks t "
        f"JOIN videos v ON v.id = t.video_id WHERE v.status = 'done' AND t.key IN ({marks}) "
        "GROUP BY t.key, t.artist, t.title, t.version ORDER BY n DESC, t.artist, t.title",
        [k["key"] for k in keys],
    ):
        best.setdefault(s["key"], s)
    return [
        {
            "key": k["key"],
            "artist": (best.get(k["key"]) or {}).get("artist") or "",
            "title": (best.get(k["key"]) or {}).get("title") or "",
            "version": (best.get(k["key"]) or {}).get("version") or "",
            "sets": int(k["sets"]),
        }
        for k in keys
    ]


def watchlist_activity(db: Database, lo: str | None, hi: str | None) -> dict[str, Any]:
    """Checks (in-app and scheduled) per month, found/downloaded, and the most productive
    sources (videos first seen through them in the range, how many of those are in the library
    or still in the inbox)."""
    marks = ",".join("?" for _ in RUN_KINDS)
    cond, params = f"kind IN ({marks}) AND finished IS NOT NULL", list(RUN_KINDS)
    if lo:
        cond += " AND started >= ?"
        params.append(lo)
    if hi:
        cond += " AND started < ?"
        params.append(hi)
    row = (
        db.query_one(
            "SELECT COUNT(*) AS checks, COALESCE(SUM(found), 0) AS found, "
            "COALESCE(SUM(downloaded), 0) AS downloaded, "
            "SUM(CASE WHEN kind = 'headless' THEN 1 ELSE 0 END) AS scheduled, "
            f"MAX(started) AS last FROM runs WHERE {cond}",
            params,
        )
        or {}
    )
    months = db.query(
        "SELECT substr(started, 1, 7) AS month, COUNT(*) AS checks, "
        f"COALESCE(SUM(found), 0) AS found FROM runs WHERE {cond} GROUP BY month ORDER BY month",
        params,
    )
    scond, sparams = "1 = 1", []
    if lo:
        scond += " AND sv.first_seen >= ?"
        sparams.append(lo)
    if hi:
        scond += " AND sv.first_seen < ?"
        sparams.append(hi)
    sources = db.query(
        "SELECT s.id AS id, s.name AS name, s.type AS type, "
        "COALESCE(s.platform, 'youtube') AS platform, COUNT(*) AS found, "
        "SUM(CASE WHEN v.status = 'done' THEN 1 ELSE 0 END) AS downloaded, "
        "SUM(CASE WHEN v.status = 'inbox' THEN 1 ELSE 0 END) AS inbox "
        "FROM source_videos sv JOIN sources s ON s.id = sv.source_id "
        "JOIN videos v ON v.id = sv.video_id "
        f"WHERE {scond} GROUP BY s.id ORDER BY found DESC, s.name LIMIT ?",
        [*sparams, TOP],
    )
    counts = (
        db.query_one(
            "SELECT (SELECT COUNT(*) FROM sources) AS sources, "
            "(SELECT COUNT(*) FROM sources WHERE enabled = 1) AS enabled, "
            "(SELECT COUNT(*) FROM videos WHERE status = 'inbox') AS inbox"
        )
        or {}
    )
    return {
        "checks": int(row.get("checks") or 0),
        "scheduled": int(row.get("scheduled") or 0),
        "found": int(row.get("found") or 0),
        "downloaded": int(row.get("downloaded") or 0),
        "last": row.get("last"),
        "months": _zero_fill(_months(months, lo, hi), ("checks", "found")),
        "sources": _zero_fill(sources, ("found", "downloaded", "inbox")),
        "source_count": int(counts.get("sources") or 0),
        "enabled_sources": int(counts.get("enabled") or 0),
        "inbox": int(counts.get("inbox") or 0),
    }


def compute(
    db: Database, settings: Settings, opts: Mapping[str, Any] | None = None
) -> dict[str, Any]:
    """All statistics of the view for opts {from, to} (see docs/bridge-api.md «Statistics»).
    Raises `RangeError` for a malformed date."""
    lo, hi, rng = date_range(opts)
    t = totals(db, lo, hi)
    return {
        "range": rng,
        "totals": t,
        "genres": by_genre(db, settings, lo, hi),
        "festivals": by_festival(db, lo, hi),
        "years": by_year(db, lo, hi),
        "djs": top_djs(db, settings, lo, hi),
        "months": by_month(db, lo, hi),
        "platforms": by_platform(db, lo, hi),
        "tracks": top_tracks(db, lo, hi),
        "watchlist": watchlist_activity(db, lo, hi),
        "series_count": len(series.edition_map(db)) if t["sets"] else 0,
    }


def missing_sizes(db: Database) -> int:
    row = db.query_one(
        "SELECT COUNT(*) AS n FROM videos WHERE status = 'done' AND file_path IS NOT NULL "
        "AND file_size IS NULL"
    )
    return int((row or {}).get("n") or 0)


def _root_of(path: str) -> str:
    """Drive letter / UNC share (Windows) or the first path part: one reachability check each."""
    p = Path(path)
    return p.anchor or (p.parts[0] if p.parts else "")


def _root_reachable(root: str) -> bool:
    """The drive / share of a library file is there (a relative root cannot be checked)."""
    try:
        return not Path(root).is_absolute() or Path(root).exists()
    except (OSError, ValueError):
        return False


def measure_sizes(
    db: Database,
    *,
    cancel: threading.Event | None = None,
    progress: Callable[[int, int], None] | None = None,
    stat: Callable[[str], int | None] = file_size_of,
    reachable: Callable[[str], bool] | None = None,
) -> dict[str, int]:
    """Fill `file_size` for library rows without one (local `stat`, batches of SIZE_BATCH).
    A file that is gone gets size 0 (counted as `missing`), so it is not measured again - but
    only if its drive/share is reachable: an offline NAS or USB drive leaves the row unmeasured
    for a later run (counted as `offline`, review v0.9.0 m1)."""
    ids = db.query(
        "SELECT id, file_path FROM videos WHERE status = 'done' AND file_path IS NOT NULL "
        "AND file_size IS NULL"
    )
    total, done, gone, offline = len(ids), 0, 0, 0
    roots: dict[str, bool] = {}
    reachable = reachable or _root_reachable
    for i in range(0, total, SIZE_BATCH):
        if cancel is not None and cancel.is_set():
            break
        batch = ids[i : i + SIZE_BATCH]
        values = []
        for r in batch:
            size = stat(r["file_path"])
            if size is None:
                root = _root_of(r["file_path"])
                if root not in roots:
                    roots[root] = reachable(root)
                if not roots[root]:
                    offline += 1
                    continue
                gone += 1
            values.append((int(size or 0), r["id"]))
        with db.transaction():
            for size, vid in values:
                db.execute(
                    "UPDATE videos SET file_size = ? WHERE id = ? AND file_size IS NULL",
                    (size, vid),
                )
        done += len(batch)
        if progress is not None:
            progress(done, total)
    return {"done": done, "total": total, "missing": gone, "offline": offline}
