"""v0.5.0 «Festival collector»: a checklist of the expected sets of one edition, filled from an
organiser playlist, a pasted timetable, a shipped timetable file or by hand, matched against
the library (free) and then - row by row, paced - against flat searches, and queued.

Concept: docs/concepts/festivals.md «v0.5.0 – Collect a whole edition», decisions:
docs/decisions.md «Festival collector», contract: docs/bridge-api.md «Festival collector».

- Rows (`checklist_rows`): artist, stage, day, start/end, set type, `source` (playlist,
  timetable, file, manual), `status` (missing, found, queued, downloaded, ignored - derived from
  the matched video and the user's ignore flag, kept in sync by `sync`), matched `video_id` +
  `confidence` + other `candidates`, `confirmed`, `checked`, `edited`.
- Network only through `client` (a `YtClient` or a fake): the playlist import is one paged flat
  listing (`list_source_paged`, Throttle + backfill pacing like v0.4.0), the matching job one
  flat search per row (`client.search`, Throttle: request spacing, `max_searches_per_hour`,
  backoff) and additionally spread over the hour (`festivals.collector_searches_per_hour`).
  Before any search a row is matched against the stored videos (library, inbox, earlier
  searches) - free and offline.
- The job is resumable: every searched row gets `searched` (cursor); an interrupted job
  (app exit, backoff) stays `pending` and continues at the next app start, a cancelled one
  continues with «Start» where it stopped (`restart` searches every missing row again).
- Queueing: only checked + confirmed rows with a loadable video. The row's edition, stage and
  set type are stored on the video as manual festival values first (the checklist is
  authoritative; detection never overwrites them), so the download is tagged accordingly;
  rows whose video is already downloaded are re-tagged (caller, `retag`).

Pure core logic: nothing here imports yt-dlp or knows the GUI.
"""

from __future__ import annotations

import json
import logging
import re
import threading
import time
from collections.abc import Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from . import discover, platforms, series
from . import festivals as fx
from . import timetable as tt
from .config import Settings
from .db import ENQUEUEABLE, Database, now_iso
from .discover import format_until
from .i18n import tr
from .redact import redact
from .throttle import BackoffActive, LimitReached, MetadataBusy, WaitCancelled

log = logging.getLogger(__name__)

SOURCES = ("playlist", "timetable", "file", "manual")
STATUSES = ("missing", "found", "queued", "downloaded", "ignored")
JOB_STATES = ("pending", "running", "paused", "done", "cancelled")
OPEN = ("pending", "running")  # continue automatically
MAX_ROWS = 1000  # per edition (a festival has a few hundred sets at most)
MAX_FAILURES = 3  # search errors in a row -> paused
MAX_CANDIDATES = 5
MIN_HIT = 0.5  # below: no hit at all
LIBRARY_SCAN = 300  # stored videos scored per row in the offline match
BUSY_WAIT_S = 30.0  # metadata lock busy (a download is extracting): try again after this
K_LAST_SEARCH = "collector_last_search"

# Scoring (docs/decisions.md «Festival collector: matching»)
W_ARTIST = 0.45  # every name of the row in the title («Angerfist b2b Miss K8»: both)
W_ARTIST_PART = 0.3  # only some of the names
W_SERIES = 0.25  # an alias of the series (a weak alias only with the year right after it)
W_SERIES_WEAK = 0.1  # a weak alias («Supremacy», «Rebirth») without the year right after it
W_YEAR = 0.2  # the edition year as own word
W_UPLOAD_YEAR = 0.1  # no year in the title, uploaded in the edition year or the year after
W_STAGE = 0.05
W_SET_TYPE = 0.05
P_OTHER_YEAR = -0.3  # only other years in the title: another edition
P_OTHER_VARIANT = -0.3  # «Defqon.1 Australia» for Defqon.1 (no variant)
P_NO_VARIANT = -0.15  # edition has a variant, the title does not name it
P_NEGATIVE = -0.4  # aftermovie, trailer, reaction …
P_NO_DURATION = -0.05

Progress = Callable[[dict[str, Any]], None]
RowsChanged = Callable[[int, list[int]], None]


class CollectorError(ValueError):
    """User-facing validation error: `errors` = {field: translated message}."""

    def __init__(self, errors: dict[str, str] | str) -> None:
        if isinstance(errors, str):
            errors = {"error": errors}
        super().__init__("; ".join(errors.values()))
        self.errors = errors


# =========================================================================== editions


def _edition_row(db: Database, edition_id: Any) -> dict[str, Any] | None:
    try:
        eid = int(edition_id)
    except (TypeError, ValueError):
        return None
    return db.query_one(
        "SELECT e.id, e.series_id, e.year, e.variant, s.key, s.name, s.kind, s.hidden, "
        "s.default_genre FROM editions e JOIN series s ON s.id = e.series_id WHERE e.id=?",
        (eid,),
    )


def require_edition(db: Database, edition_id: Any) -> dict[str, Any]:
    row = _edition_row(db, edition_id)
    if row is None or row["hidden"]:
        raise CollectorError({"edition_id": tr("festival.edition_unknown")})
    return row


def has_checklist(db: Database, edition_id: int) -> bool:
    return (
        db.query_one("SELECT 1 AS x FROM checklists WHERE edition_id=?", (edition_id,)) is not None
    )


def ensure_checklist(db: Database, edition_id: int) -> None:
    now = now_iso()
    db.execute(
        "INSERT OR IGNORE INTO checklists(edition_id, created, updated) VALUES (?,?,?)",
        (edition_id, now, now),
    )


def open_edition(db: Database, data: Mapping[str, Any] | None) -> int:
    """Edition for a checklist: `{edition_id}` or `{series_id, year, variant?}` (created if
    needed, year required). Creates the (empty) checklist. Returns the edition id."""
    if not isinstance(data, Mapping):
        raise CollectorError({"edition": tr("collector.edition_invalid")})
    if data.get("edition_id") not in (None, ""):
        ed = require_edition(db, data["edition_id"])
        if not ed["year"]:
            raise CollectorError({"year": tr("collector.year_required")})
        ensure_checklist(db, int(ed["id"]))
        return int(ed["id"])
    errors: dict[str, str] = {}
    srow = None
    try:
        srow = db.query_one(
            "SELECT * FROM series WHERE id=? AND hidden=0", (int(data.get("series_id")),)
        )
    except (TypeError, ValueError):
        srow = None
    if srow is None:
        errors["series_id"] = tr("festival.series_unknown")
    try:
        year = int(data.get("year") or 0)
    except (TypeError, ValueError):
        year = 0
    if not (fx.MIN_YEAR <= year <= datetime.now().year + 1):
        errors["year"] = tr("collector.year_required")
    variant = str(data.get("variant") or "").strip()[: series.MAX_NAME]
    if errors:
        raise CollectorError(errors)
    eid = series.ensure_edition(db, int(srow["id"]), year, variant)  # type: ignore[index]
    ensure_checklist(db, eid)
    return eid


def _edition_view(ed: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "edition_id": ed["id"],
        "series_id": ed["series_id"],
        "series_key": ed["key"],
        "series": ed["name"],
        "kind": ed["kind"],
        "year": ed["year"] or None,
        "variant": ed["variant"] or "",
        "edition": fx.edition_name(ed["name"], ed["year"] or None, ed["variant"]),
    }


def summary(db: Database, edition_id: int) -> dict[str, Any] | None:
    """`CollectorEdition` of the bridge contract."""
    ed = _edition_row(db, edition_id)
    if ed is None:
        return None
    cl = db.query_one("SELECT * FROM checklists WHERE edition_id=?", (edition_id,)) or {}
    lib = db.query_one(
        "SELECT COUNT(*) AS n FROM videos WHERE edition_id=? AND status='done'", (edition_id,)
    )
    return {
        **_edition_view(ed),
        "playlist_url": cl.get("playlist_url") or None,
        "stats": stats(db, edition_id),
        "job": job_view(cl) if cl else None,
        "library": int((lib or {}).get("n") or 0),
        "created": cl.get("created"),
        "updated": cl.get("updated"),
    }


def list_editions(db: Database) -> list[dict[str, Any]]:
    """Every edition with a checklist, newest year first."""
    sync(db)
    rows = db.query(
        "SELECT c.edition_id FROM checklists c JOIN editions e ON e.id = c.edition_id "
        "JOIN series s ON s.id = e.series_id WHERE s.hidden=0 "
        "ORDER BY e.year DESC, s.name COLLATE NOCASE, e.variant"
    )
    out = []
    for r in rows:
        item = summary(db, int(r["edition_id"]))
        if item:
            out.append(item)
    return out


def delete_checklist(db: Database, edition_id: int) -> bool:
    """Remove the checklist of an edition (rows + job); videos and files stay."""
    with db.transaction():
        db.execute("DELETE FROM checklist_rows WHERE edition_id=?", (edition_id,))
        cur = db.execute("DELETE FROM checklists WHERE edition_id=?", (edition_id,))
    return cur.rowcount > 0


# =========================================================================== rows


def _loads(text: str | None) -> list[Any]:
    try:
        v = json.loads(text or "[]")
    except ValueError:
        return []
    return v if isinstance(v, list) else []


def _video_view(v: Mapping[str, Any] | None) -> dict[str, Any] | None:
    if not v:
        return None
    return {
        "id": v["id"],
        "title": v.get("title") or "",
        "status": v.get("status") or "new",
        "duration": v.get("duration"),
        "channel_name": v.get("channel_name") or "",
        "upload_date": v.get("upload_date") or None,
        "thumbnail": v.get("thumbnail"),
        "url": v.get("url") or None,
        "platform": v.get("platform") or platforms.platform_of(v["id"]),
    }


def _videos(db: Database, ids: Iterable[str]) -> dict[str, dict[str, Any]]:
    ids = [i for i in dict.fromkeys(ids) if i]
    out: dict[str, dict[str, Any]] = {}
    for i in range(0, len(ids), 500):
        chunk = ids[i : i + 500]
        marks = ",".join("?" for _ in chunk)
        for r in db.query(f"SELECT * FROM videos WHERE id IN ({marks})", chunk):
            out[r["id"]] = r
    return out


def row_view(row: Mapping[str, Any], videos: Mapping[str, Mapping[str, Any]]) -> dict[str, Any]:
    """`ChecklistRow` of the bridge contract."""
    video = videos.get(row["video_id"]) if row.get("video_id") else None
    candidates = []
    for c in _loads(row.get("candidates")):
        if isinstance(c, dict) and c.get("id"):
            candidates.append(
                {
                    "confidence": c.get("confidence"),
                    "video": _video_view(videos.get(c["id"])) or {"id": c["id"]},
                }
            )
    needs = bool(row.get("video_id")) and not row["confirmed"] and not row["ignored"]
    return {
        "id": row["id"],
        "edition_id": row["edition_id"],
        "artist": row["artist"],
        "stage": row.get("stage") or None,
        "day": row.get("day") or None,
        "start": row.get("start_time") or None,
        "end": row.get("end_time") or None,
        "set_type": row.get("set_type") or None,
        "source": row["source"],
        "status": row["status"],
        "video_id": row.get("video_id"),
        "video": _video_view(video),
        "confidence": row.get("confidence"),
        "candidates": candidates,
        "confirmed": bool(row["confirmed"]),
        "needs_confirmation": needs,
        "checked": bool(row["checked"]),
        "ignored": bool(row["ignored"]),
        "edited": bool(row["edited"]),
        "searched": row.get("searched"),
        "position": row["position"],
    }


def _rows(db: Database, edition_id: int, ids: Sequence[int] | None = None) -> list[dict]:
    sql = "SELECT * FROM checklist_rows WHERE edition_id=?"
    params: list[Any] = [edition_id]
    if ids is not None:
        if not ids:
            return []
        sql += f" AND id IN ({','.join('?' for _ in ids)})"
        params += list(ids)
    return db.query(sql + " ORDER BY position, id", params)


def views(db: Database, rows: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    ids: list[str] = []
    for r in rows:
        if r.get("video_id"):
            ids.append(r["video_id"])
        ids += [c["id"] for c in _loads(r.get("candidates")) if isinstance(c, dict) and c.get("id")]
    videos = _videos(db, ids)
    return [row_view(r, videos) for r in rows]


def get_rows(db: Database, edition_id: int, ids: Sequence[int]) -> list[dict[str, Any]]:
    return views(db, _rows(db, edition_id, [int(i) for i in ids]))


def derive_status(row: Mapping[str, Any], video: Mapping[str, Any] | None) -> str:
    if row.get("ignored"):
        return "ignored"
    if not row.get("video_id") or not video:
        return "missing"
    vs = video.get("status")
    if vs in ("queued", "downloading"):
        return "queued"
    if vs == "done":
        return "downloaded"
    return "found"


def sync(
    db: Database, edition_id: int | None = None, video_ids: Iterable[str] | None = None
) -> dict[int, list[int]]:
    """Recompute `status` from the matched videos. Returns {edition id: [changed row ids]}."""
    sql = (
        "SELECT r.*, v.status AS v_status FROM checklist_rows r "
        "LEFT JOIN videos v ON v.id = r.video_id"
    )
    clauses: list[str] = []
    params: list[Any] = []
    if edition_id is not None:
        clauses.append("r.edition_id=?")
        params.append(edition_id)
    if video_ids is not None:
        vids = [str(v) for v in video_ids]
        if not vids:
            return {}
        clauses.append(f"r.video_id IN ({','.join('?' for _ in vids)})")
        params += vids
    if clauses:
        sql += " WHERE " + " AND ".join(clauses)
    changed: dict[int, list[int]] = {}
    for r in db.query(sql, params):
        video = {"status": r["v_status"]} if r["v_status"] is not None else None
        status = derive_status(r, video)
        if status != r["status"]:
            db.execute(
                "UPDATE checklist_rows SET status=?, updated=? WHERE id=?",
                (status, now_iso(), r["id"]),
            )
            changed.setdefault(int(r["edition_id"]), []).append(int(r["id"]))
    return changed


def stats(db: Database, edition_id: int) -> dict[str, int]:
    rows = db.query(
        "SELECT status, checked, confirmed, ignored, video_id, searched "
        "FROM checklist_rows WHERE edition_id=?",
        (edition_id,),
    )
    out = {s: 0 for s in STATUSES}
    out.update(total=len(rows), checked=0, to_confirm=0, ready=0, to_search=0)
    for r in rows:
        out[r["status"]] += 1
        if r["checked"] and not r["ignored"]:
            out["checked"] += 1
            if r["video_id"] and not r["confirmed"]:
                out["to_confirm"] += 1
            if r["video_id"] and r["confirmed"] and r["status"] == "found":
                out["ready"] += 1
            if not r["video_id"] and not r["searched"]:
                out["to_search"] += 1
    return out


def get_checklist(db: Database, edition_id: Any) -> dict[str, Any]:
    ed = require_edition(db, edition_id)
    eid = int(ed["id"])
    sync(db, eid)
    return {"ok": True, "edition": summary(db, eid), "rows": views(db, _rows(db, eid))}


# -- validation


def _text(value: Any, limit: int) -> str | None:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    return text[:limit] or None


def clean_row(data: Mapping[str, Any], *, partial: bool = False) -> dict[str, Any]:
    """Validated row fields (DB column names) from a bridge `ChecklistRow` (or a parser row).
    `partial`: only the fields present. Raises CollectorError({field: message})."""
    if not isinstance(data, Mapping):
        raise CollectorError({"row": tr("collector.row_invalid")})
    errors: dict[str, str] = {}
    out: dict[str, Any] = {}
    if not partial or "artist" in data:
        artist = _text(data.get("artist"), tt.MAX_ARTIST)
        if not artist:
            errors["artist"] = tr("collector.artist_required")
        out["artist"] = artist
    if not partial or "stage" in data:
        out["stage"] = _text(data.get("stage"), tt.MAX_STAGE)
    if not partial or "day" in data:
        out["day"] = _text(data.get("day"), tt.MAX_DAY)
    for key, col in (("start", "start_time"), ("end", "end_time")):
        if not partial or key in data:
            raw = data.get(key)
            if raw in (None, ""):
                out[col] = None
            else:
                t = tt.norm_time(str(raw))
                if t is None:
                    errors[key] = tr("collector.time_invalid")
                out[col] = t
    if not partial or "set_type" in data:
        st = data.get("set_type") or None
        if st is not None and st not in fx.SET_TYPES:
            errors["set_type"] = tr("festival.invalid_set_type")
        out["set_type"] = st
    if errors:
        raise CollectorError(errors)
    return out


def _next_position(db: Database, edition_id: int) -> int:
    row = db.query_one(
        "SELECT MAX(position) AS m FROM checklist_rows WHERE edition_id=?", (edition_id,)
    )
    return int((row or {}).get("m") or 0) + 1


def _count(db: Database, edition_id: int) -> int:
    row = db.query_one("SELECT COUNT(*) AS n FROM checklist_rows WHERE edition_id=?", (edition_id,))
    return int((row or {}).get("n") or 0)


def _key(artist: Any, stage: Any = None, day: Any = None) -> tuple[str, str, str]:
    return fx.norm(artist), fx.norm(stage), fx.norm(day)


def _insert(
    db: Database,
    edition_id: int,
    fields: Mapping[str, Any],
    source: str,
    position: int,
    **extra: Any,
) -> int:
    now = now_iso()
    values = {
        "edition_id": edition_id,
        "artist": fields["artist"],
        "stage": fields.get("stage"),
        "day": fields.get("day"),
        "start_time": fields.get("start_time"),
        "end_time": fields.get("end_time"),
        "set_type": fields.get("set_type"),
        "source": source,
        "position": position,
        "edited": int(source == "manual"),
        "created": now,
        "updated": now,
        **extra,
    }
    cols = ",".join(values)
    cur = db.execute(
        f"INSERT INTO checklist_rows({cols}) VALUES ({','.join('?' for _ in values)})",
        list(values.values()),
    )
    return int(cur.lastrowid)


def add_rows(
    db: Database, edition_id: int, rows: Sequence[Mapping[str, Any]], source: str
) -> dict[str, Any]:
    """Store parsed/validated rows (`timetable`/`file`). A row equal to an existing one (same
    artist, stage, day) is merged: empty fields are filled, nothing is overwritten (rows the
    user edited stay as they are). Returns {added, merged, invalid, ids}."""
    if source not in SOURCES:
        raise ValueError(source)
    ensure_checklist(db, edition_id)
    existing = {_key(r["artist"], r["stage"], r["day"]): r for r in _rows(db, edition_id)}
    by_artist: dict[str, list[dict]] = {}
    for r in existing.values():
        by_artist.setdefault(fx.norm(r["artist"]), []).append(r)
    added = merged = invalid = 0
    ids: list[int] = []
    with db.transaction():
        position = _next_position(db, edition_id)
        count = _count(db, edition_id)
        for raw in rows:
            try:
                fields = clean_row(raw)
            except CollectorError:
                invalid += 1
                continue
            key = _key(fields["artist"], fields["stage"], fields["day"])
            match = existing.get(key)
            if match is None:
                # a playlist row of this artist without stage/day: fill it in (same set)
                cands = [
                    r
                    for r in by_artist.get(key[0], [])
                    if not r["day"] and (not r["stage"] or fx.norm(r["stage"]) == key[1])
                ]
                match = cands[0] if len(cands) == 1 else None
            if match is not None:
                fill = {
                    col: fields[col]
                    for col in ("stage", "day", "start_time", "end_time", "set_type")
                    if fields.get(col) and not match.get(col)
                }
                if fill and not match["edited"]:
                    sets = ", ".join(f"{k}=?" for k in fill)
                    db.execute(
                        f"UPDATE checklist_rows SET {sets}, updated=? WHERE id=?",
                        [*fill.values(), now_iso(), match["id"]],
                    )
                    match.update(fill)
                merged += 1
                ids.append(int(match["id"]))
                continue
            if count >= MAX_ROWS:
                invalid += 1
                continue
            rid = _insert(db, edition_id, fields, source, position)
            position += 1
            count += 1
            added += 1
            ids.append(rid)
            new = {**fields, "id": rid, "edited": 0, "artist": fields["artist"]}
            existing[key] = new
            by_artist.setdefault(key[0], []).append(new)
        _touch(db, edition_id)
    return {"added": added, "merged": merged, "invalid": invalid, "ids": ids}


def _touch(db: Database, edition_id: int) -> None:
    db.execute("UPDATE checklists SET updated=? WHERE edition_id=?", (now_iso(), edition_id))


def add_row(db: Database, edition_id: Any, data: Mapping[str, Any]) -> int:
    ed = require_edition(db, edition_id)
    eid = int(ed["id"])
    fields = clean_row(data)
    if _count(db, eid) >= MAX_ROWS:
        raise CollectorError({"row": tr("collector.too_many_rows", n=MAX_ROWS)})
    ensure_checklist(db, eid)
    checked = 1 if data.get("checked", True) else 0
    rid = _insert(db, eid, fields, "manual", _next_position(db, eid), checked=checked)
    _touch(db, eid)
    return rid


def row_by_id(db: Database, row_id: Any) -> dict[str, Any]:
    try:
        rid = int(row_id)
    except (TypeError, ValueError):
        rid = -1
    row = db.query_one("SELECT * FROM checklist_rows WHERE id=?", (rid,))
    if row is None:
        raise CollectorError({"id": tr("collector.row_unknown")})
    return row


def update_row(db: Database, row_id: Any, data: Mapping[str, Any]) -> dict[str, Any]:
    """Edit artist/stage/day/times/set type (`edited` = manual values are authoritative). A
    new artist name drops an unconfirmed match and the search cursor (it is searched again).
    Returns the stored row."""
    row = row_by_id(db, row_id)
    fields = clean_row(data, partial=True)
    if not fields:
        return row
    extra: dict[str, Any] = {"edited": 1, "updated": now_iso()}
    if "artist" in fields and fx.norm(fields["artist"]) != fx.norm(row["artist"]):
        extra["searched"] = None
        if not row["confirmed"]:
            extra.update(video_id=None, confidence=None, candidates="[]")
    values = {**fields, **extra}
    sets = ", ".join(f"{k}=?" for k in values)
    db.execute(f"UPDATE checklist_rows SET {sets} WHERE id=?", [*values.values(), row["id"]])
    sync(db, int(row["edition_id"]))
    return row_by_id(db, row["id"])


def _ids(values: Any) -> list[int]:
    if isinstance(values, (int, str)):
        values = [values]
    out: list[int] = []
    for v in values or []:
        try:
            out.append(int(v))
        except (TypeError, ValueError):
            continue
    return list(dict.fromkeys(out))


def _edition_of_rows(db: Database, ids: Sequence[int]) -> dict[int, list[int]]:
    if not ids:
        return {}
    rows = db.query(
        f"SELECT id, edition_id FROM checklist_rows WHERE id IN ({','.join('?' for _ in ids)})",
        list(ids),
    )
    out: dict[int, list[int]] = {}
    for r in rows:
        out.setdefault(int(r["edition_id"]), []).append(int(r["id"]))
    return out


def delete_rows(db: Database, row_ids: Any) -> dict[int, list[int]]:
    """Delete rows (videos stay). Returns {edition id: [deleted ids]}."""
    by_ed = _edition_of_rows(db, _ids(row_ids))
    with db.transaction():
        for ids in by_ed.values():
            db.execute(
                f"DELETE FROM checklist_rows WHERE id IN ({','.join('?' for _ in ids)})", ids
            )
    return by_ed


def set_flag(db: Database, row_ids: Any, flag: str, value: bool) -> dict[int, list[int]]:
    """`checked` (the user wants it) or `ignored` (never search/queue it). Returns
    {edition id: [row ids]}."""
    if flag not in ("checked", "ignored"):
        raise ValueError(flag)
    by_ed = _edition_of_rows(db, _ids(row_ids))
    for eid, ids in by_ed.items():
        db.execute(
            f"UPDATE checklist_rows SET {flag}=?, updated=? "
            f"WHERE id IN ({','.join('?' for _ in ids)})",
            [int(bool(value)), now_iso(), *ids],
        )
        sync(db, eid)
    return by_ed


def confirm_match(
    db: Database, row_id: Any, video_id: str | None, *, reject: bool = False
) -> dict[str, Any]:
    """Accept a match: `video_id` = the current match or one of the candidates (it becomes the
    match). `video_id=None`: drop the match (row missing again, searched again by the next job);
    `reject=True` additionally never proposes this video for the row again."""
    row = row_by_id(db, row_id)
    candidates = [c for c in _loads(row["candidates"]) if isinstance(c, dict) and c.get("id")]
    rejected = [str(x) for x in _loads(row["rejected"])]
    if video_id in (None, ""):
        old = row.get("video_id")
        if reject and old and old not in rejected:
            rejected.append(old)
        rest = [c for c in candidates if c["id"] not in rejected]
        db.execute(
            "UPDATE checklist_rows SET video_id=NULL, confidence=NULL, confirmed=0, "
            "candidates=?, rejected=?, searched=NULL, updated=? WHERE id=?",
            (json.dumps(rest), json.dumps(rejected), now_iso(), row["id"]),
        )
    else:
        vid = str(video_id)
        known = {c["id"]: c for c in candidates}
        if vid != row.get("video_id") and vid not in known:
            raise CollectorError({"video_id": tr("collector.not_a_candidate")})
        if db.get_video(vid) is None:
            raise CollectorError({"video_id": tr("api.video_unknown")})
        conf = row["confidence"] if vid == row.get("video_id") else known[vid].get("confidence")
        rest = [c for c in candidates if c["id"] != vid]
        if row.get("video_id") and row["video_id"] != vid:
            rest.insert(0, {"id": row["video_id"], "confidence": row["confidence"]})
        db.execute(
            "UPDATE checklist_rows SET video_id=?, confidence=?, confirmed=1, candidates=?, "
            "updated=? WHERE id=?",
            (vid, conf, json.dumps(rest[:MAX_CANDIDATES]), now_iso(), row["id"]),
        )
    sync(db, int(row["edition_id"]))
    return row_by_id(db, row["id"])


# =========================================================================== matching


@dataclass
class Target:
    """What a row of this edition has to match."""

    edition_id: int
    series: fx.SeriesDef
    year: int | None
    variant: str
    aliases: list[str] = field(default_factory=list)
    weak_aliases: list[str] = field(default_factory=list)
    other_series: list[str] = field(default_factory=list)
    variant_forms: list[str] = field(default_factory=list)
    other_variants: list[str] = field(default_factory=list)
    stages: list[fx.StageDef] = field(default_factory=list)
    set_types: list[fx.SetTypeDef] = field(default_factory=list)
    negative: list[str] = field(default_factory=list)
    min_duration: int = 0
    auto_confirm: float = 0.85

    @property
    def query_name(self) -> str:
        return fx.festival_label(self.series.name, self.variant)


def target_for(db: Database, settings: Settings, edition_id: int) -> Target:
    ed = require_edition(db, edition_id)
    sdef = series.series_def(db, int(ed["series_id"]))
    if sdef is None:
        raise CollectorError({"edition_id": tr("festival.series_unknown")})
    cat = series.catalog(db, settings)
    variant = ed["variant"] or ""
    forms: list[str] = []
    others: list[str] = []
    for v in sdef.variants:
        names = [v.name, *v.aliases]
        if variant and fx.norm(v.name) == fx.norm(variant):
            forms += names
        else:
            others += names
    if variant and not forms:
        forms = [variant]
    weak = {fx.norm(a) for a in sdef.weak_aliases} - {""}
    mine = {fx.norm(a) for a in (sdef.name, *sdef.aliases)} - {""}
    # strong aliases of the other series that are not just a piece of one of ours
    # («Defqon.1 Australia» stays a variant, not another series)
    others_series = sorted(
        {
            a
            for s, alias_forms in cat.compiled()
            if s.key != sdef.key
            for a, strong in alias_forms
            if strong and not any(fx.contains(m, a) for m in mine | weak)
        }
    )
    return Target(
        edition_id=int(ed["id"]),
        series=sdef,
        year=int(ed["year"]) or None,
        variant=variant,
        aliases=[a for a in (sdef.name, *sdef.aliases, *sdef.weak_aliases) if fx.norm(a)],
        weak_aliases=[a for a in sdef.weak_aliases if fx.norm(a)],
        other_series=others_series,
        variant_forms=forms,
        other_variants=others,
        stages=list(cat.stages),
        set_types=list(cat.set_types),
        negative=list(cat.negative),
        min_duration=int(settings.filters.min_duration),
        auto_confirm=float(settings.festivals.collector_auto_confirm),
    )


_SPLIT_ARTISTS = re.compile(
    r"\s+(?:b2b|b3b|vs\.?|versus|&|and|x|feat\.?|ft\.?|with|presents|pres\.?|meets)\s+|\s*[+,/]\s*",
    re.I,
)


def artist_parts(artist: str) -> list[str]:
    parts = [p.strip() for p in _SPLIT_ARTISTS.split(artist or "") if fx.norm(p)]
    return parts or [artist]


_BRACKETS = re.compile(r"[()\[\]{}]")


def extra_artists(title: str, parts: Sequence[str]) -> list[str]:
    """Names a title lists next to the row's artist («Angerfist b2b Miss K8», «Angerfist &
    Radical Redemption», «Angerfist feat. MC Tha Watcher») that the row does not list.
    Only the title segments (split at « | », « @ », « - » …) that name one of the row's
    names are looked at, so «Angerfist @ Defqon.1 2024 | RED» has no extra names."""
    mine = [fx.norm(p) for p in parts if fx.norm(p)]
    out: list[str] = []
    for seg in _TITLE_SPLIT.split(title or ""):
        seg = _BRACKETS.sub(" ", seg or "")
        text = fx.title_text(seg)
        if not text or not any(fx.contains(text, m) for m in mine):
            continue
        for piece in _SPLIT_ARTISTS.split(seg):
            n = fx.title_text(piece)
            if not n or any(fx.contains(n, m) or fx.contains(m, n) for m in mine):
                continue
            out.append(piece.strip())
    return out


def _weak_alias_hit(text: str, target: Target) -> bool | None:
    """None: no alias of the series in the title; True: only a weak alias without the
    edition year right after it; False: a strong alias (or weak alias + year)."""
    weak = {fx.norm(a) for a in target.weak_aliases}
    hit: bool | None = None
    tokens = text.split()
    for a in target.aliases:
        n = fx.norm(a)
        pos = fx._find(text, n)
        if pos < 0:
            continue
        if n not in weak:
            return False
        span = len(n.split()) if f" {n} " in f" {text} " else 1
        end = pos + span
        if target.year and end < len(tokens) and tokens[end] == str(target.year):
            return False
        hit = True
    return hit


def score(
    row: Mapping[str, Any], video: Mapping[str, Any], target: Target
) -> tuple[float, list[str]]:
    """Confidence 0..1 that `video` is the set of `row`, with the reasons (codes). 0 = no hit
    (artist missing, too short, not loadable)."""
    if video.get("preview") or video.get("geo_blocked"):
        return 0.0, ["unavailable"]
    if video.get("live_status") in ("is_live", "is_upcoming", "post_live"):
        return 0.0, ["live"]
    duration = video.get("duration")
    if isinstance(duration, (int, float)) and duration < target.min_duration:
        return 0.0, ["too_short"]
    title = str(video.get("title") or "")
    text = fx.title_text(title)
    artist = str(row.get("artist") or "")
    parts = artist_parts(artist)
    found = [p for p in parts if fx.contains(text, p)]
    reasons: list[str] = []
    if fx.contains(text, artist) or len(found) == len(parts):
        s = W_ARTIST
        reasons.append("artist")
        if extra_artists(title, parts):
            # b2b / vs / & / feat. with a name the row does not list: maybe another set
            reasons[-1] = "artist:more"
    elif found:
        s = W_ARTIST_PART
        reasons.append("artist:partial")
    else:
        return 0.0, ["no_artist"]
    weak_hit = _weak_alias_hit(text, target)
    if weak_hit is False:
        s += W_SERIES
        reasons.append("series")
    elif weak_hit:
        s += W_SERIES_WEAK
        reasons.append("series:weak")
    low_artist = fx.norm(artist)
    if any(fx.contains(text, o) and not fx.contains(low_artist, o) for o in target.other_series):
        reasons.append("series:other")
    years = fx.title_years(text)
    if target.year and target.year in years:
        s += W_YEAR
        reasons.append("year")
        if any(y != target.year for y in years):
            reasons.append("year:more")
    elif years:
        s += P_OTHER_YEAR
        reasons.append("year:other")
    elif target.year:
        m = re.match(r"^(\d{4})", str(video.get("upload_date") or ""))
        if m and int(m.group(1)) in (target.year, target.year + 1):
            s += W_UPLOAD_YEAR
            reasons.append("year:upload")
    if target.variant:
        if not any(fx.contains(text, v) for v in target.variant_forms):
            s += P_NO_VARIANT
            reasons.append("variant:missing")
    elif any(fx.contains(text, v) for v in target.other_variants):
        s += P_OTHER_VARIANT
        reasons.append("variant:other")
    if row.get("stage"):
        aliases = next(
            (st.aliases for st in target.stages if fx.norm(st.name) == fx.norm(row["stage"])), ()
        )
        if fx.find_stage(title, [fx.StageDef(str(row["stage"]), tuple(aliases))]):
            s += W_STAGE
            reasons.append("stage")
        else:
            others = [st for st in target.stages if fx.norm(st.name) != fx.norm(row["stage"])]
            if fx.find_stage(title, others):
                reasons.append("stage:other")
    if row.get("set_type"):
        codes = {st.code for st in target.set_types if fx.find_set_type(text, [st])}
        if row["set_type"] in codes:
            s += W_SET_TYPE
            reasons.append("set_type")
        elif codes:
            reasons.append("set_type:other")
    if any(fx.contains(text, w) for w in target.negative) and not any(
        fx.contains(fx.norm(artist), w) for w in target.negative
    ):
        s += P_NEGATIVE
        reasons.append("negative")
    if not isinstance(duration, (int, float)):
        s += P_NO_DURATION
        reasons.append("duration:unknown")
    return round(min(1.0, max(0.0, s)), 2), reasons


# Reasons that always leave a hit «uncertain» (the user confirms it), whatever the score:
# further artists (b2b, vs, &, feat. …), another stage / set type than the row's, more than
# the edition year, another series or the wrong / missing variant.
BLOCKS_CERTAIN = frozenset(
    {
        "artist:more",
        "stage:other",
        "set_type:other",
        "year:more",
        "series:other",
        "variant:other",
        "variant:missing",
        "negative",
    }
)


def certain(confidence: float, reasons: Sequence[str], target: Target) -> bool:
    """A hit that needs no confirmation: exactly the row's DJ name(s), a strong alias of the
    series and the edition year in the title, nothing conflicting (`BLOCKS_CERTAIN`),
    confident. Conservative on purpose: a wrong auto-confirm becomes a wrong download."""
    return (
        confidence >= target.auto_confirm
        and "artist" in reasons
        and "series" in reasons
        and "year" in reasons
        and not BLOCKS_CERTAIN.intersection(reasons)
    )


def _taken(db: Database, edition_id: int, except_row: int) -> set[str]:
    rows = db.query(
        "SELECT video_id FROM checklist_rows WHERE edition_id=? AND id!=? AND video_id IS NOT NULL",
        (edition_id, except_row),
    )
    return {r["video_id"] for r in rows}


def _apply(
    db: Database,
    row: Mapping[str, Any],
    scored: list[tuple[float, list[str], Mapping[str, Any]]],
    target: Target,
) -> bool:
    """Store the best hit (and the other candidates) on a row without a confirmed match.
    Returns True if the row has a match now."""
    if row.get("confirmed") and row.get("video_id"):
        return True
    rejected = {str(x) for x in _loads(row.get("rejected"))}
    taken = _taken(db, int(row["edition_id"]), int(row["id"]))
    hits = [
        (c, r, v)
        for c, r, v in scored
        if c >= MIN_HIT and v["id"] not in rejected and v["id"] not in taken
    ]
    old = {c["id"]: c for c in _loads(row.get("candidates")) if isinstance(c, dict)}
    if row.get("video_id") and row["video_id"] not in old:
        old[row["video_id"]] = {"id": row["video_id"], "confidence": row.get("confidence")}
    for _c, _r, v in hits:
        old.pop(v["id"], None)
    merged = [
        {"id": v["id"], "confidence": c, "certain": certain(c, r, target)} for c, r, v in hits
    ]
    merged += [
        {"id": k, "confidence": o.get("confidence"), "certain": bool(o.get("certain"))}
        for k, o in old.items()
        if k not in rejected and k not in taken
    ]
    if not merged:
        return bool(row.get("video_id"))
    # best first; on equal confidence prefer what is already downloaded (never twice)
    status = {v["id"]: v.get("status") for _c, _r, v in hits}
    merged.sort(
        key=lambda m: (float(m["confidence"] or 0), status.get(m["id"]) == "done"), reverse=True
    )
    best, rest = merged[0], merged[1 : 1 + MAX_CANDIDATES]
    db.execute(
        "UPDATE checklist_rows SET video_id=?, confidence=?, confirmed=?, candidates=?, "
        "updated=? WHERE id=?",
        (
            best["id"],
            best["confidence"],
            int(bool(best["certain"])),
            json.dumps([{"id": m["id"], "confidence": m["confidence"]} for m in rest]),
            now_iso(),
            row["id"],
        ),
    )
    return True


def _library_candidates(db: Database, row: Mapping[str, Any], target: Target) -> list[dict]:
    tokens = sorted(
        (t for t in fx.norm(row["artist"]).split() if len(t) >= 2), key=len, reverse=True
    )
    like = f"%{tokens[0]}%" if tokens else "%"
    return db.query(
        "SELECT * FROM videos WHERE status != 'ignored' AND preview=0 AND geo_blocked=0 AND "
        "(edition_id=? OR suggested_edition_id=? OR title LIKE ?) "
        "ORDER BY status='done' DESC, first_seen DESC LIMIT ?",
        (target.edition_id, target.edition_id, like, LIBRARY_SCAN),
    )


def match_offline(
    db: Database,
    settings: Settings,
    edition_id: int,
    row_ids: Sequence[int] | None = None,
    *,
    target: Target | None = None,
) -> list[int]:
    """Free matching against the stored videos (library, inbox, earlier search hits) for rows
    without a confirmed match. No network. Returns the ids of rows that got a (new) match."""
    target = target or target_for(db, settings, edition_id)
    changed: list[int] = []
    for row in _rows(db, edition_id, row_ids):
        if row["ignored"] or (row["video_id"] and row["confirmed"]):
            continue
        scored = []
        for v in _library_candidates(db, row, target):
            c, r = score(row, v, target)
            if c >= MIN_HIT:
                scored.append((c, r, v))
        if not scored:
            continue
        before = (row["video_id"], row["confidence"], row["confirmed"], row["candidates"])
        _apply(db, row, scored, target)
        after = db.query_one("SELECT * FROM checklist_rows WHERE id=?", (row["id"],)) or {}
        if before != (
            after.get("video_id"),
            after.get("confidence"),
            after.get("confirmed"),
            after.get("candidates"),
        ):
            changed.append(int(row["id"]))
    if changed:
        sync(db, edition_id)
    return changed


# =========================================================================== playlist


def check_playlist_url(url: Any, settings: Settings) -> str:
    """Normalised playlist URL (YouTube `playlist?list=`, SoundCloud set) or CollectorError."""
    from .watchlist import suggest_source  # watchlist imports a lot; only needed here

    text = str(url or "").strip()
    info = suggest_source(text)
    if info.get("type") != "playlist" or not info.get("url_normalized"):
        raise CollectorError({"url": tr("collector.playlist_url_invalid")})
    if info.get("platform") == platforms.SOUNDCLOUD and not settings.soundcloud.enabled:
        raise CollectorError({"url": tr("sc.off")})
    return str(info["url_normalized"])


_TITLE_SPLIT = re.compile(r"\s+[|@~•·]\s+|\s+[-–—]\s+|\s*\|\s*")


def artist_from_title(title: str, target: Target) -> str:
    """«Headhunterz | Defqon.1 2024 | RED» / «Defqon.1 2024 | RED | Headhunterz» /
    «Headhunterz @ Defqon.1 Weekend Festival 2024» -> «Headhunterz». Segments naming the
    series, the year, a stage or a set type are dropped; the first remaining one is the
    artist (fallback: the cleaned title)."""
    segments = [s.strip() for s in _TITLE_SPLIT.split(title or "") if s and s.strip()]
    stage_names = {fx.norm(a) for st in target.stages for a in (st.name, *st.aliases)}
    for seg in segments:
        text = fx.title_text(seg)
        if not text:
            continue
        if any(fx.contains(text, a) for a in target.aliases):
            continue
        if fx.title_years(text) and len(text.split()) <= 2:
            continue
        stripped = re.sub(r"\b(?:stage|full set|live set|liveset|dj set|hq|hd|4k)\b", " ", text)
        if fx.norm(stripped) in stage_names or not fx.norm(stripped):
            continue
        if fx.find_set_type(text, target.set_types) and len(text.split()) <= 3:
            continue
        return re.sub(r"\s+", " ", seg).strip(" -|")[: tt.MAX_ARTIST]
    clean = title or ""
    for a in target.aliases:
        clean = re.sub(re.escape(a), " ", clean, flags=re.I)
    clean = re.sub(r"\b(?:19|20)\d\d\b", " ", clean)
    return (re.sub(r"\s+", " ", clean).strip(" -|@") or title or "?")[: tt.MAX_ARTIST]


@dataclass
class ImportResult:
    edition_id: int
    entries: int = 0
    added: int = 0
    merged: int = 0
    unchecked: int = 0
    requests: int = 0
    cancelled: bool = False
    error: str | None = None
    rows: list[int] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "edition_id": self.edition_id,
            "entries": self.entries,
            "added": self.added,
            "merged": self.merged,
            "unchecked": self.unchecked,
            "requests": self.requests,
            "cancelled": self.cancelled,
            "error": self.error,
        }


def _playlist_rows(
    db: Database,
    settings: Settings,
    target: Target,
    entries: list[dict[str, Any]],
    res: ImportResult,
) -> None:
    """Rows for one page of the organiser playlist (one row per set, match = the entry)."""
    entries = [
        e for e in entries if e.get("id") and e.get("live_status") not in ("is_live", "is_upcoming")
    ]
    if not entries:
        return
    res.entries += len(entries)
    discover.store_results(db, entries, settings, genre_hint=target.series.default_genre)
    eid = target.edition_id
    existing = _rows(db, eid)
    by_video = {r["video_id"]: r for r in existing if r["video_id"]}
    with db.transaction():
        position = _next_position(db, eid)
        count = len(existing)
        for e in entries:
            vid = str(e["id"])
            if vid in by_video:
                res.merged += 1
                continue
            title = str(e.get("title") or "")
            artist = artist_from_title(title, target)
            stage = fx.find_stage(title, target.stages)
            set_type = fx.find_set_type(fx.title_text(title), target.set_types)
            conf, _reasons = score(
                {"artist": artist, "stage": stage, "set_type": set_type}, e, target
            )
            # trailers, aftermovies, short clips: kept as row but not ticked
            wanted = conf > 0 and not any(
                fx.contains(fx.title_text(title), w) for w in target.negative
            )
            free = [
                r
                for r in existing
                if not r["video_id"]
                and not r["ignored"]
                and fx.norm(r["artist"]) == fx.norm(artist)
            ]
            if free:
                r = free[0]
                db.execute(
                    "UPDATE checklist_rows SET video_id=?, confidence=1.0, confirmed=1, "
                    "updated=? WHERE id=? AND video_id IS NULL",
                    (vid, now_iso(), r["id"]),
                )
                r["video_id"] = vid
                by_video[vid] = r
                res.merged += 1
                res.rows.append(int(r["id"]))
                continue
            if count >= MAX_ROWS:
                continue
            fields = {"artist": artist, "stage": stage, "set_type": set_type}
            rid = _insert(
                db,
                eid,
                fields,
                "playlist",
                position,
                video_id=vid,
                confidence=1.0,
                confirmed=1,
                checked=int(wanted),
            )
            position += 1
            count += 1
            res.added += 1
            res.unchecked += int(not wanted)
            res.rows.append(rid)
            by_video[vid] = {"id": rid, "video_id": vid}
        _touch(db, eid)
    sync(db, eid)


def import_playlist(
    edition_id: int,
    url: str,
    *,
    client: Any,
    db: Database,
    settings: Settings,
    cancel: threading.Event | None = None,
    on_progress: Progress | None = None,
) -> ImportResult:
    """Read the organiser playlist of an edition once (flat, paged through the Throttle with
    the backfill pacing) - each entry becomes a confirmed row. A row of the same artist
    without a video (timetable) gets the entry as its match instead."""
    target = target_for(db, settings, edition_id)
    url = check_playlist_url(url, settings)
    ensure_checklist(db, target.edition_id)
    db.execute(
        "UPDATE checklists SET playlist_url=?, updated=? WHERE edition_id=?",
        (url, now_iso(), target.edition_id),
    )
    res = ImportResult(target.edition_id)

    def progress(phase: str) -> None:
        if on_progress is not None:
            try:
                on_progress({"phase": phase, "kind": "playlist", **res.to_dict()})
            except Exception:
                log.debug("collector import event failed", exc_info=True)

    def on_entries(batch: list[dict[str, Any]], _position: int) -> None:
        if cancel is not None and cancel.is_set():
            raise WaitCancelled
        _playlist_rows(db, settings, target, batch, res)
        progress("progress")

    def on_request() -> None:
        res.requests += 1

    log.info(tr("collector.playlist_started", edition=target_name(target)))
    progress("start")
    try:
        client.list_source_paged(
            url,
            limit=int(settings.watchlist.backfill_max_entries),
            on_entries=on_entries,
            on_request=on_request,
            requests_per_hour=int(settings.watchlist.backfill_requests_per_hour),
            cancel_event=cancel,
        )
    except WaitCancelled:
        res.cancelled = True
    except Exception as exc:
        res.error = _error_text(exc, client)
        log.warning(tr("collector.playlist_failed", error=res.error))
        log.debug("Playlist import details", exc_info=True)
    if not res.error:
        log.info(
            tr(
                "collector.playlist_done",
                edition=target_name(target),
                added=res.added,
                merged=res.merged,
            )
        )
    progress("error" if res.error else "done")
    return res


def target_name(target: Target) -> str:
    return fx.edition_name(target.series.name, target.year, target.variant)


def _error_text(exc: BaseException, client: Any = None) -> str:
    if isinstance(exc, BackoffActive) or getattr(exc, "rate_limited", False):
        until = getattr(exc, "until", None)
        if until is None and client is not None and hasattr(client, "throttle"):
            until = client.throttle.backoff_until()
        return tr("collector.note_backoff", until=format_until(until) if until else "?")
    return str(redact(exc) or exc.__class__.__name__)[:300]


# =========================================================================== timetables


def import_timetable(
    db: Database,
    settings: Settings,
    edition_id: Any,
    data: str | Sequence[Mapping[str, Any]],
    *,
    source: str = "timetable",
) -> dict[str, Any]:
    """Pasted text (parsed here) or already parsed/edited rows -> checklist rows; then the free
    offline match. Returns {added, merged, invalid, skipped, ids, matched}."""
    ed = require_edition(db, edition_id)
    eid = int(ed["id"])
    skipped: list[str] = []
    if isinstance(data, str):
        parsed = parse_text(db, settings, data)
        rows = parsed["rows"]
        skipped = parsed["skipped"]
    elif isinstance(data, (list, tuple)):
        rows = list(data)
    else:
        raise CollectorError({"rows": tr("collector.row_invalid")})
    res = add_rows(db, eid, rows, source)
    matched = match_offline(db, settings, eid, res["ids"]) if res["ids"] else []
    return {**res, "skipped": skipped, "matched": len(matched)}


def parse_text(db: Database, settings: Settings, text: str) -> dict[str, Any]:
    cat = series.catalog(db, settings)
    return tt.parse(text, cat.stages, cat.set_types)


def _series_by_key(db: Database) -> dict[str, dict[str, Any]]:
    return {r["key"]: r for r in db.query("SELECT * FROM series WHERE hidden=0")}


def list_files(db: Database, root: Path | None = None) -> list[dict[str, Any]]:
    """Shipped timetable files with the series name (null = series unknown/hidden here)."""
    known = _series_by_key(db)
    out = []
    for f in tt.list_files(root):
        s = known.get(f.get("series_key") or "")
        out.append(
            {
                **f,
                "series_id": s["id"] if s else None,
                "series": s["name"] if s else None,
                "edition": fx.edition_name(s["name"], f.get("year"), f.get("variant"))
                if s and not f.get("error")
                else None,
            }
        )
    return out


def import_file(
    db: Database, settings: Settings, file: str, root: Path | None = None
) -> dict[str, Any]:
    """Import a shipped timetable file into the checklist of its edition (created if needed)."""
    path = tt.resolve_file(file, root)
    if path is None:
        raise CollectorError({"file": tr("collector.file_unknown")})
    try:
        data = tt.load_file(path, root)
    except tt.TimetableFileError as exc:
        raise CollectorError({"file": tr("collector.file_invalid", error=exc)}) from exc
    s = _series_by_key(db).get(data["series_key"])
    if s is None:
        raise CollectorError(
            {"file": tr("collector.file_series_unknown", series=data["series_key"])}
        )
    eid = open_edition(db, {"series_id": s["id"], "year": data["year"], "variant": data["variant"]})
    rows = [
        {
            "artist": r["artist"],
            "stage": r["stage"],
            "day": r["day"],
            "start": r["start"],
            "end": r["end"],
            "set_type": r["set_type"],
        }
        for r in data["rows"]
    ]
    res = import_timetable(db, settings, eid, rows, source="file")
    return {**res, "edition_id": eid}


# =========================================================================== matching job


def job_view(cl: Mapping[str, Any] | None) -> dict[str, Any] | None:
    """`CollectorJob` of the bridge contract (None = never started)."""
    if not cl or not cl.get("job_state"):
        return None
    return {
        "edition_id": cl["edition_id"],
        "state": cl["job_state"],
        "total": int(cl.get("job_total") or 0),
        "done": int(cl.get("job_done") or 0),
        "searches": int(cl.get("job_searches") or 0),
        "hits": int(cl.get("job_hits") or 0),
        "note": cl.get("job_note") or None,
        "started": cl.get("job_started"),
        "updated": cl.get("job_updated"),
        "finished": cl.get("job_finished"),
    }


_JOB_FIELDS = (
    "job_state",
    "job_total",
    "job_done",
    "job_searches",
    "job_hits",
    "job_failures",
    "job_note",
    "job_started",
    "job_updated",
    "job_finished",
)


def update_job(
    db: Database, edition_id: int, *, only_states: Sequence[str] | None = None, **fields: Any
) -> bool:
    bad = set(fields) - set(_JOB_FIELDS)
    if bad:
        raise ValueError(f"Unknown fields: {', '.join(sorted(bad))}")
    fields.setdefault("job_updated", now_iso())
    sets = ", ".join(f"{k}=?" for k in fields)
    sql = f"UPDATE checklists SET {sets} WHERE edition_id=?"
    params: list[Any] = [*fields.values(), edition_id]
    if only_states:
        sql += f" AND job_state IN ({','.join('?' for _ in only_states)})"
        params += list(only_states)
    return db.execute(sql, params).rowcount > 0


def get_job(db: Database, edition_id: int) -> dict[str, Any] | None:
    return job_view(db.query_one("SELECT * FROM checklists WHERE edition_id=?", (edition_id,)))


def _to_search_sql(restart: bool = False) -> str:
    base = "edition_id=? AND checked=1 AND ignored=0 AND video_id IS NULL"
    return base if restart else base + " AND searched IS NULL"


def _to_search(db: Database, edition_id: int, restart: bool = False) -> int:
    row = db.query_one(
        f"SELECT COUNT(*) AS n FROM checklist_rows WHERE {_to_search_sql(restart)}",
        (edition_id,),
    )
    return int((row or {}).get("n") or 0)


def per_hour(settings: Settings) -> int:
    """Searches per hour of the matching job: its own setting, never above the global limit."""
    return max(
        1,
        min(
            int(settings.festivals.collector_searches_per_hour),
            int(settings.throttle.max_searches_per_hour),
        ),
    )


def interval(settings: Settings) -> float:
    return max(3600.0 / per_hour(settings), float(settings.throttle.sleep_requests))


def estimate(
    db: Database, settings: Settings, throttle: Any, edition_id: Any, *, restart: bool = False
) -> dict[str, Any]:
    """Requests/time of the matching job, without network. Runs the free offline match first
    (so rows the library already covers are not counted). `restart`: also rows searched
    before without a hit."""
    ed = require_edition(db, edition_id)
    eid = int(ed["id"])
    matched = match_offline(db, settings, eid)
    rows = _to_search(db, eid, restart)
    gap = interval(settings)
    used = throttle.searches_last_hour() if throttle is not None else 0
    limit = int(settings.throttle.max_searches_per_hour)
    available = throttle.search_available_at() if throttle is not None else None
    backoff = throttle.backoff_until() if throttle is not None else None
    job = get_job(db, eid)
    return {
        "ok": True,
        "edition_id": eid,
        "rows": rows,
        "requests": rows,
        "per_hour": per_hour(settings),
        "seconds": int(round(max(0, rows - 1) * gap)),
        "searches_left_hour": max(0, limit - used),
        "available_at": available.isoformat() if available else None,
        "backoff_until": backoff.isoformat() if backoff else None,
        "matched_offline": len(matched),
        "resume": bool(job and job["state"] in ("pending", "running", "paused", "cancelled")),
    }


def request_job(db: Database, edition_id: int, *, restart: bool = False) -> dict[str, Any] | None:
    """Start the job: an unfinished one (pending, paused, cancelled) continues with the rows
    not searched yet; a finished one or `restart` searches every missing row again."""
    cl = db.query_one("SELECT * FROM checklists WHERE edition_id=?", (edition_id,))
    if cl is None:
        ensure_checklist(db, edition_id)
        cl = {}
    state = cl.get("job_state")
    now = now_iso()
    if restart or state in (None, "done"):
        db.execute(
            f"UPDATE checklist_rows SET searched=NULL WHERE {_to_search_sql(True)}", (edition_id,)
        )
        update_job(
            db,
            edition_id,
            job_state="pending",
            job_total=_to_search(db, edition_id),
            job_done=0,
            job_searches=0,
            job_hits=0,
            job_failures=0,
            job_note=None,
            job_started=now,
            job_finished=None,
        )
    else:
        done = int(cl.get("job_done") or 0)
        update_job(
            db,
            edition_id,
            job_state="pending",
            job_total=done + _to_search(db, edition_id),
            job_failures=0,
            job_note=None,
            job_finished=None,
        )
    return get_job(db, edition_id)


def cancel_job(db: Database, edition_id: int) -> bool:
    """Stop (keeps the cursor: «Start» continues with the rows not searched yet)."""
    return update_job(
        db,
        edition_id,
        only_states=("pending", "running", "paused"),
        job_state="cancelled",
        job_note=None,
        job_finished=now_iso(),
    )


def release_running(db: Database, note: str | None = None) -> None:
    """App exit while a job runs: back to `pending` (continues at the next start)."""
    try:
        db.execute(
            "UPDATE checklists SET job_state='pending', job_note=?, job_updated=? "
            "WHERE job_state='running'",
            (note, now_iso()),
        )
    except Exception:
        log.debug("Collector job state not released", exc_info=True)


def open_jobs(db: Database) -> list[int]:
    return [
        int(r["edition_id"])
        for r in db.query(
            "SELECT edition_id FROM checklists WHERE job_state IN ('pending','running') "
            "ORDER BY job_started, edition_id"
        )
    ]


@dataclass
class JobResult:
    edition_id: int
    state: str = "pending"
    searched: int = 0
    searches: int = 0
    hits: int = 0
    backoff: bool = False
    cancelled: bool = False
    skipped: bool = False
    error: str | None = None


def _query(row: Mapping[str, Any], target: Target) -> str:
    parts = [str(row["artist"]), target.query_name]
    if target.year:
        parts.append(str(target.year))
    return " ".join(p for p in parts if p).strip()


def run_job(
    edition_id: int,
    *,
    client: Any,
    db: Database,
    settings: Settings,
    throttle: Any,
    cancel: threading.Event | None = None,
    on_progress: Progress | None = None,
    on_rows: RowsChanged | None = None,
    sleep: Callable[[float], None] | None = None,
    clock: Callable[[], datetime] | None = None,
) -> JobResult:
    """Search the checked rows without a match one by one until done or interrupted.

    Per row: offline match first (free); otherwise one flat search `<artist> <series> <year>`
    through `client.search` (Throttle: backoff, request spacing, `max_searches_per_hour`),
    spaced by `interval(settings)` (persisted, also across restarts). Hits are scored, the best
    becomes the match (certain ones confirmed), the others candidates. A row is marked
    `searched` after its search (resume cursor). Backoff / rate limit: stays `pending` with a
    note; 3 errors in a row: `paused`; cancel/app exit: before the next request."""
    eid = int(edition_id)
    res = JobResult(eid)
    cl = db.query_one("SELECT * FROM checklists WHERE edition_id=?", (eid,))
    if cl is None or cl.get("job_state") not in OPEN:
        res.skipped = True
        res.state = (cl or {}).get("job_state") or "none"
        return res
    if not update_job(db, eid, only_states=OPEN, job_state="running", job_note=None):
        res.skipped = True
        return res
    now = clock or (lambda: datetime.now(UTC))
    counters = {
        "done": int(cl.get("job_done") or 0),
        "searches": int(cl.get("job_searches") or 0),
        "hits": int(cl.get("job_hits") or 0),
    }
    failures = int(cl.get("job_failures") or 0)
    try:
        target = target_for(db, settings, eid)
    except CollectorError as exc:
        update_job(db, eid, only_states=("running",), job_state="paused", job_note=str(exc))
        res.state, res.error = "paused", str(exc)
        return res
    th = throttle

    def emit() -> None:
        if on_progress is None:
            return
        try:
            on_progress(get_job(db, eid) or {"edition_id": eid, "state": "none"})
        except Exception:
            log.debug("collector job event failed", exc_info=True)

    def rows_changed(ids: list[int]) -> None:
        if on_rows is not None and ids:
            try:
                on_rows(eid, ids)
            except Exception:
                log.debug("collector row event failed", exc_info=True)

    def stop_check() -> None:
        if cancel is not None and cancel.is_set():
            raise WaitCancelled
        cur = db.query_one("SELECT job_state FROM checklists WHERE edition_id=?", (eid,))
        if cur is None or cur["job_state"] != "running":
            raise WaitCancelled

    def wait(seconds: float) -> None:
        if seconds > 0:
            if sleep is not None:
                sleep(seconds)
            elif cancel is not None:
                cancel.wait(seconds)
            else:
                time.sleep(seconds)
        stop_check()

    def store(**extra: Any) -> None:
        ok = update_job(
            db,
            eid,
            only_states=("running",),
            job_done=counters["done"],
            job_searches=counters["searches"],
            job_hits=counters["hits"],
            job_failures=failures,
            **extra,
        )
        if not ok:
            raise WaitCancelled

    def mark_searched(row_id: int) -> None:
        db.execute(
            "UPDATE checklist_rows SET searched=?, updated=? WHERE id=?",
            (now().isoformat(timespec="seconds"), now_iso(), row_id),
        )

    def next_due() -> datetime | None:
        due: datetime | None = None
        raw = db.get_state(K_LAST_SEARCH)
        if raw:
            try:
                due = datetime.fromisoformat(raw) + timedelta(seconds=interval(settings))
            except ValueError:
                due = None
        avail = th.search_available_at() if th is not None else None
        if avail is not None and (due is None or avail > due):
            due = avail
        return due

    log.info(tr("collector.job_started", edition=target_name(target)))
    emit()
    final = "done"
    note: str | None = None
    busy = 0
    try:
        while True:
            stop_check()
            row = db.query_one(
                f"SELECT * FROM checklist_rows WHERE {_to_search_sql()} "
                "ORDER BY position, id LIMIT 1",
                (eid,),
            )
            if row is None:
                break
            if match_offline(db, settings, eid, [row["id"]], target=target):
                mark_searched(row["id"])
                counters["done"] += 1
                counters["hits"] += 1
                res.searched += 1
                res.hits += 1
                store()
                rows_changed([int(row["id"])])
                emit()
                continue
            due = next_due()
            current = now()
            if due is not None and due > current:
                store(job_note=tr("collector.note_next", time=format_until(due)))
                emit()
                wait((due - current).total_seconds())
            if th is not None and th.backoff_until() is not None:
                raise BackoffActive(th.backoff_until())
            db.set_state(K_LAST_SEARCH, now().isoformat())
            try:
                hits = client.search(
                    _query(row, target),
                    int(settings.festivals.collector_results_per_search),
                    cancel_event=cancel,
                )
            except LimitReached:
                continue  # another search used the hour: next_due waits for the free slot
            except MetadataBusy:
                busy += 1
                if busy > 10:
                    raise
                wait(BUSY_WAIT_S)
                continue
            except WaitCancelled:
                raise
            except Exception as exc:
                if isinstance(exc, BackoffActive) or getattr(exc, "rate_limited", False):
                    raise
                failures += 1
                res.error = str(redact(exc) or exc.__class__.__name__)[:300]
                log.warning(tr("collector.search_failed", artist=row["artist"], error=res.error))
                mark_searched(row["id"])  # no endless retry of one row
                counters["done"] += 1
                if failures >= MAX_FAILURES:
                    final = "paused"
                    note = tr("collector.note_error", error=res.error)
                    break
                store(job_note=None)
                emit()
                continue
            busy = 0
            failures = 0
            counters["searches"] += 1
            res.searches += 1
            stop_check()
            scored = []
            for e in hits or []:
                if not e.get("id"):
                    continue
                known = db.get_video(str(e["id"]))
                if known and known.get("status") == "ignored":
                    continue
                c, r = score(row, {**e, "status": (known or {}).get("status")}, target)
                if c >= MIN_HIT:
                    scored.append((c, r, {**e, "status": (known or {}).get("status")}))
            if scored:
                discover.store_results(
                    db,
                    [v for _c, _r, v in scored],
                    settings,
                    genre_hint=target.series.default_genre,
                )
                fresh = db.query_one("SELECT * FROM checklist_rows WHERE id=?", (row["id"],))
                if fresh and _apply(db, fresh, scored, target):
                    counters["hits"] += 1
                    res.hits += 1
            mark_searched(row["id"])
            counters["done"] += 1
            res.searched += 1
            sync(db, eid)
            store(job_note=None)
            rows_changed([int(row["id"])])
            emit()
    except WaitCancelled:
        res.cancelled = True
        final, note = "pending", tr("collector.note_interrupted")
    except Exception as exc:
        if isinstance(exc, BackoffActive) or getattr(exc, "rate_limited", False):
            res.backoff = True
            final, note = "pending", _error_text(exc, client)
        else:
            res.error = str(redact(exc) or exc.__class__.__name__)[:300]
            final, note = "paused", tr("collector.note_error", error=res.error)
            log.debug("Collector job details", exc_info=True)
    fields: dict[str, Any] = {
        "job_state": final,
        "job_note": note,
        "job_done": counters["done"],
        "job_searches": counters["searches"],
        "job_hits": counters["hits"],
        "job_failures": failures,
    }
    if final == "done":
        fields["job_finished"] = now_iso()
    update_job(db, eid, only_states=("running",), **fields)
    after = get_job(db, eid)
    res.state = after["state"] if after else final  # a cancel of the user wins
    if res.state == "done":
        log.info(
            tr(
                "collector.job_done",
                edition=target_name(target),
                searched=counters["done"],
                hits=counters["hits"],
            )
        )
    elif note and not res.cancelled:
        log.warning(tr("collector.job_stopped", edition=target_name(target), note=note))
    emit()
    return res


# =========================================================================== queue


def row_values(row: Mapping[str, Any], video: Mapping[str, Any]) -> dict[str, Any]:
    """Festival values the video gets from its row: the row's stage/set type; a row the user
    did not edit keeps what the video's own detection found where the row is empty."""
    if row.get("edited"):
        stage, set_type = row.get("stage"), row.get("set_type")
    else:
        stage = row.get("stage") or video.get("stage")
        set_type = row.get("set_type") or video.get("set_type")
    if set_type not in fx.SET_TYPES:
        set_type = None
    return {"edition_id": row["edition_id"], "stage": stage or None, "set_type": set_type}


def apply_row_values(db: Database, row: Mapping[str, Any]) -> bool:
    """Store the row's edition/stage/set type on its video as manual festival values. Returns
    True if something changed (a downloaded file then needs a retag)."""
    vid = row.get("video_id")
    video = db.get_video(vid) if vid else None
    if not video:
        return False
    values = row_values(row, video)
    current = {
        "edition_id": video.get("edition_id"),
        "stage": video.get("stage") or None,
        "set_type": video.get("set_type") or None,
    }
    if current == values and video.get("festival_manual"):
        return False
    series.set_manual(db, vid, values)
    return True


def queue_rows(db: Database, edition_id: Any, row_ids: Any = None) -> dict[str, Any]:
    """Rows to load: checked, not ignored, confirmed, with a video that may be queued
    (new/inbox/failed, loadable). Their festival values are applied first. Rows whose video is
    already downloaded get the values too (`retag` = their video ids). Returns
    {video_ids (queue order), retag, skipped:{unchecked, unconfirmed, missing, other}}."""
    ed = require_edition(db, edition_id)
    eid = int(ed["id"])
    sync(db, eid)
    rows = _rows(db, eid, _ids(row_ids) if row_ids is not None else None)
    videos = _videos(db, [r["video_id"] for r in rows if r["video_id"]])
    out: list[str] = []
    retag: list[str] = []
    skipped = {"unchecked": 0, "unconfirmed": 0, "missing": 0, "other": 0}
    for r in rows:
        if r["ignored"] or not r["checked"]:
            skipped["unchecked"] += 1
            continue
        video = videos.get(r["video_id"]) if r["video_id"] else None
        if not video:
            skipped["missing"] += 1
            continue
        if not r["confirmed"]:
            skipped["unconfirmed"] += 1
            continue
        if video["status"] == "done":
            if apply_row_values(db, r):
                retag.append(video["id"])
            continue
        if video["status"] not in ENQUEUEABLE or video.get("preview") or video.get("geo_blocked"):
            if video["status"] not in ("queued", "downloading"):
                skipped["other"] += 1
            else:
                apply_row_values(db, r)  # already waiting: tags follow the checklist too
            continue
        apply_row_values(db, r)
        if video["id"] not in out:
            out.append(video["id"])
    return {"video_ids": out, "retag": retag, "skipped": skipped}


def rows_for_videos(db: Database, video_ids: Iterable[str]) -> dict[int, list[int]]:
    """{edition id: [row ids]} of the rows matched to these videos (status sync first)."""
    vids = [str(v) for v in video_ids if v]
    if not vids:
        return {}
    sync(db, video_ids=vids)
    rows = db.query(
        f"SELECT id, edition_id FROM checklist_rows WHERE video_id IN "
        f"({','.join('?' for _ in vids)})",
        vids,
    )
    out: dict[int, list[int]] = {}
    for r in rows:
        out.setdefault(int(r["edition_id"]), []).append(int(r["id"]))
    return out
