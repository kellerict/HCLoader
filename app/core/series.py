"""Festivals & series (v0.3.0): series catalog in the DB, detection on stored rows, the offline
«Assign festivals» pass, library grouping and tag/path values. No network.

- Built-in series come from `app/data/series.yaml` and are synchronised into the table `series`
  (`sync_builtin`, cheap: only when the file changed). A built-in the user edited
  (`user_modified`) or deleted (`hidden`) is never touched again by a sync; `reset_series`
  restores it. User series have keys `u-<slug>`.
- Detection itself is `app/core/festivals.py` (pure). `detect_and_store` runs it on new flat
  results (search, watchlist) and `assign_pass` over the library; rows with `festival_manual`
  are never changed.
- Stored values are language-neutral: series/stage names are proper names, `set_type` is a code
  (festivals.SET_TYPES) the UI translates.
"""

from __future__ import annotations

import hashlib
import json
import logging
import threading
from collections.abc import Callable, Iterable, Mapping
from functools import lru_cache
from pathlib import Path
from typing import Any

from ruamel.yaml import YAML

from . import festivals as fx
from .config import UNSORTED, Settings
from .db import Database, now_iso
from .i18n import tr

log = logging.getLogger(__name__)

DATA_FILE = Path(__file__).resolve().parents[1] / "data" / "series.yaml"
K_BUILTIN_HASH = "series_builtin_hash"
K_LAST_PASS = "festivals_last_pass"
LIBRARY_STATUSES = ("done",)
# statuses whose genre must not change any more (discover.GENRE_LOCKED_STATUSES)
_GENRE_LOCKED = ("queued", "downloading", "done")
MAX_NAME = 80
PASS_BATCH = 200  # rows per transaction in assign_pass
MAX_ALIASES = 40
_SYNC_LOCK = threading.Lock()


class SeriesError(ValueError):
    """User-facing validation error: `errors` = {field: message}."""

    def __init__(self, errors: dict[str, str]) -> None:
        super().__init__("; ".join(errors.values()))
        self.errors = errors


# --------------------------------------------------------------------------- built-in data


@lru_cache(maxsize=4)
def _load_file(path: str, mtime_ns: int) -> tuple[dict[str, Any], str]:
    raw = Path(path).read_bytes()
    data = YAML(typ="safe").load(raw.decode("utf-8")) or {}
    if not isinstance(data, dict):
        data = {}
    return data, hashlib.sha1(raw).hexdigest()


def builtin_data(path: Path | None = None) -> tuple[dict[str, Any], str]:
    """(parsed series.yaml, content hash). A missing/broken file gives ({}, "") and a warning:
    detection then only knows user series."""
    p = path or DATA_FILE
    try:
        return _load_file(str(p), p.stat().st_mtime_ns)
    except Exception as exc:  # shipped file broken: the app must still start
        log.warning(tr("festival.data_unreadable", path=p, error=exc))
        return {}, ""


def _dumps(values: Iterable[Any]) -> str:
    return json.dumps(list(values), ensure_ascii=False)


def _loads(text: str | None) -> list[Any]:
    try:
        v = json.loads(text or "[]")
    except ValueError:
        return []
    return v if isinstance(v, list) else []


def _variants_json(variants: Iterable[fx.Variant]) -> str:
    return _dumps({"name": v.name, "aliases": list(v.aliases)} for v in variants)


def _builtin_row(d: fx.SeriesDef) -> dict[str, Any]:
    return {
        "name": d.name,
        "kind": d.kind,
        "aliases": _dumps(d.aliases),
        "weak_aliases": _dumps(d.weak_aliases),
        "channels": _dumps(d.channels),
        "variants": _variants_json(d.variants),
        "default_genre": d.default_genre,
    }


def sync_builtin(db: Database, path: Path | None = None, *, force: bool = False) -> int:
    """Insert new built-ins and refresh untouched ones from series.yaml. Returns the number of
    rows inserted or updated. Runs only when the file content changed (state hash)."""
    data, digest = builtin_data(path)
    if not digest:
        return 0
    with _SYNC_LOCK:
        if not force and db.get_state(K_BUILTIN_HASH) == digest:
            return 0
        changed = 0
        keys: set[str] = set()
        with db.transaction():
            for raw in data.get("series") or []:
                if not isinstance(raw, Mapping):
                    continue
                d = fx.series_from(raw)
                if not d.key or not d.name or d.key.startswith("u-"):
                    continue
                keys.add(d.key)
                row = db.query_one("SELECT * FROM series WHERE key=?", (d.key,))
                values = _builtin_row(d)
                if row is None:
                    cols = ["key", *values, "builtin", "created", "updated"]
                    vals = [d.key, *values.values(), 1, now_iso(), now_iso()]
                    db.execute(
                        f"INSERT INTO series({','.join(cols)}) "
                        f"VALUES ({','.join('?' for _ in cols)})",
                        vals,
                    )
                    changed += 1
                elif not row["builtin"] and not row["user_modified"]:
                    # m3: a key that is back in the file is a built-in again
                    sets = ", ".join(f"{k}=?" for k in values)
                    db.execute(
                        f"UPDATE series SET {sets}, builtin=1, updated=? WHERE id=?",
                        [*values.values(), now_iso(), row["id"]],
                    )
                    changed += 1
                elif row["builtin"] and not row["user_modified"] and not row["hidden"]:
                    if any(row[k] != v for k, v in values.items()):
                        sets = ", ".join(f"{k}=?" for k in values)
                        db.execute(
                            f"UPDATE series SET {sets}, updated=? WHERE id=?",
                            [*values.values(), now_iso(), row["id"]],
                        )
                        changed += 1
            # a built-in that was dropped from the file stays as a user series (keeps its data);
            # a hidden one becomes visible again, otherwise it could never be restored (m3)
            for row in db.query("SELECT id, key FROM series WHERE builtin=1"):
                if row["key"] not in keys:
                    db.execute("UPDATE series SET builtin=0, hidden=0 WHERE id=?", (row["id"],))
            db.set_state(K_BUILTIN_HASH, digest)
        if changed:
            log.debug("Built-in series synchronised: %d", changed)
        return changed


def _builtin_def(key: str) -> fx.SeriesDef | None:
    data, _ = builtin_data()
    for raw in data.get("series") or []:
        if isinstance(raw, Mapping) and raw.get("key") == key:
            return fx.series_from(raw)
    return None


# --------------------------------------------------------------------------- catalog


def _def_from_row(row: Mapping[str, Any]) -> fx.SeriesDef:
    return fx.SeriesDef(
        key=row["key"],
        name=row["name"],
        kind=row["kind"],
        aliases=tuple(str(a) for a in _loads(row["aliases"])),
        weak_aliases=tuple(str(a) for a in _loads(row["weak_aliases"])),
        channels=tuple(str(a) for a in _loads(row["channels"])),
        variants=fx.variants_from(_loads(row["variants"])),
        default_genre=row["default_genre"] or None,
        id=row["id"],
        enabled=bool(row["enabled"]) and not row["hidden"],
    )


def catalog(db: Database, settings: Settings) -> fx.Catalog:
    """Detection catalog: enabled, visible series from the DB + built-in stages/set types/
    negative words + the user's extra stages and set-type keywords (settings)."""
    sync_builtin(db)
    data, _ = builtin_data()
    fs = settings.festivals
    rows = db.query("SELECT * FROM series WHERE hidden=0 ORDER BY id")
    return fx.Catalog(
        series=[_def_from_row(r) for r in rows],
        stages=fx.stages_from(data.get("stages"), fs.extra_stages),
        set_types=fx.set_types_from(
            data.get("set_types"), [(e.keyword, e.set_type) for e in fs.extra_set_types]
        ),
        negative=[str(w) for w in data.get("negative_keywords") or [] if str(w).strip()],
    )


def stage_names(settings: Settings) -> list[str]:
    data, _ = builtin_data()
    return [s.name for s in fx.stages_from(data.get("stages"), settings.festivals.extra_stages)]


def set_type_labels() -> dict[str, str]:
    """{code: language-neutral label} (the label goes into TXXX:SET_TYPE)."""
    data, _ = builtin_data()
    out = {code: code.replace("_", " ").title() for code in fx.SET_TYPES}
    for st in fx.set_types_from(data.get("set_types")):
        out[st.code] = st.label
    return out


# --------------------------------------------------------------------------- editions


def ensure_edition(db: Database, series_id: int, year: int | None, variant: str = "") -> int:
    y = int(year or 0)
    v = (variant or "").strip()
    db.execute(
        "INSERT OR IGNORE INTO editions(series_id, year, variant) VALUES (?,?,?)",
        (series_id, y, v),
    )
    row = db.query_one(
        "SELECT id FROM editions WHERE series_id=? AND year=? AND variant=?", (series_id, y, v)
    )
    assert row is not None
    return int(row["id"])


def edition_map(db: Database) -> dict[int, dict[str, Any]]:
    """{edition id: {edition_id, series_id, series_key, series, kind, event_year, variant,
    edition, festival}} for every edition (one query; used by library listings)."""
    out: dict[int, dict[str, Any]] = {}
    for r in db.query(
        "SELECT e.id, e.series_id, e.year, e.variant, s.key, s.name, s.kind, s.default_genre "
        "FROM editions e JOIN series s ON s.id = e.series_id"
    ):
        out[r["id"]] = {
            "edition_id": r["id"],
            "series_id": r["series_id"],
            "series_key": r["key"],
            "series": r["name"],
            "kind": r["kind"],
            "event_year": r["year"] or None,
            "variant": r["variant"] or "",
            "edition": fx.edition_name(r["name"], r["year"] or None, r["variant"]),
            "festival": fx.festival_label(r["name"], r["variant"]),
        }
    return out


def festival_info(
    row: Mapping[str, Any], editions: Mapping[int, dict[str, Any]]
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    """(festival, festival_suggestion) of a video row for the bridge (docs/bridge-api.md)."""
    festival = None
    ed = editions.get(row.get("edition_id")) if row.get("edition_id") else None
    if ed:
        festival = {
            **ed,
            "stage": row.get("stage") or None,
            "set_type": row.get("set_type") or None,
            "episode": row.get("episode"),
            "manual": bool(row.get("festival_manual")),
            "confidence": row.get("festival_confidence"),
        }
    suggestion = None
    sid = row.get("suggested_edition_id")
    if not festival and sid and sid in editions and not row.get("festival_manual"):
        suggestion = {
            **editions[sid],
            "stage": row.get("stage") or None,
            "set_type": row.get("set_type") or None,
            "episode": row.get("episode"),
            "confidence": row.get("festival_confidence"),
        }
    return festival, suggestion


# --------------------------------------------------------------------------- detection on rows


def detect_row(
    row: Mapping[str, Any],
    cat: fx.Catalog,
    settings: Settings,
    *,
    description: str | None = None,
) -> fx.Detection | None:
    fs = settings.festivals
    return fx.detect(
        row.get("title"),
        cat,
        description=description if fs.match_description else None,
        channel_id=row.get("channel_id"),
        channel_name=row.get("channel_name"),
        channel_url=row.get("channel_url"),
        upload_date=row.get("upload_date"),
        year_from_upload=fs.year_from_upload_date,
    )


def apply_detection(
    db: Database,
    row: Mapping[str, Any],
    det: fx.Detection | None,
    settings: Settings,
    *,
    keep_stronger: bool = False,
) -> str:
    """Store a detection on a video row. Returns "manual" (untouched), "assigned",
    "suggested", "none" or "unchanged". The series' default genre replaces «Unsortiert» on rows
    whose genre may still change (not manual, not queued/downloading/done).

    `keep_stronger` (flat sources, review v0.3.0 M1): an existing assignment/suggestion is never
    replaced by a weaker or empty result - it may come from the description, which flat
    listings almost never deliver. A series deleted or hidden since the catalog snapshot counts
    as no detection (review m2: no FK error, no assignment to a hidden series)."""
    if row.get("festival_manual"):
        return "manual"
    if det is not None and det.series_id is not None:
        live = db.query_one("SELECT hidden FROM series WHERE id=?", (det.series_id,))
        if not live or live["hidden"]:
            det = None
    threshold = settings.festivals.min_confidence
    if keep_stronger:
        new_conf = det.confidence if det is not None and det.series_id is not None else None
        old_conf = row.get("festival_confidence") or 0
        if row.get("edition_id") and (new_conf is None or new_conf < threshold):
            return "unchanged"
        if row.get("edition_id") and new_conf is not None and new_conf < old_conf:
            return "unchanged"
        if row.get("suggested_edition_id") and (new_conf is None or new_conf < old_conf):
            return "unchanged"
    edition = suggested = None
    stage = set_type = episode = None
    conf = None
    outcome = "none"
    if det is not None and det.series_id is not None:
        eid = ensure_edition(db, det.series_id, det.year, det.variant)
        conf = det.confidence
        stage, set_type, episode = det.stage, det.set_type, det.episode
        if det.confidence >= threshold:
            edition, outcome = eid, "assigned"
        else:
            suggested, outcome = eid, "suggested"
    new = (edition, suggested, stage, set_type, episode, conf)
    old = (
        row.get("edition_id"),
        row.get("suggested_edition_id"),
        row.get("stage"),
        row.get("set_type"),
        row.get("episode"),
        row.get("festival_confidence"),
    )
    genre = None
    if (
        outcome == "assigned"
        and det is not None
        and det.default_genre
        and not row.get("genre_manual")
        and (row.get("genre") or UNSORTED) == UNSORTED
        and row.get("status") not in _GENRE_LOCKED
        and det.default_genre in {g.name for g in settings.genres.items}
    ):
        genre = det.default_genre
    if new == old and genre is None:
        return "none" if outcome == "none" else "unchanged"
    db.execute(
        "UPDATE videos SET edition_id=?, suggested_edition_id=?, stage=?, set_type=?, "
        "episode=?, festival_confidence=? WHERE id=? AND festival_manual=0",
        [*new, row["id"]],
    )
    if genre:
        db.execute("UPDATE videos SET genre=? WHERE id=? AND genre_manual=0", (genre, row["id"]))
    return outcome


def detect_and_store(
    db: Database,
    settings: Settings,
    ids: Iterable[str],
    *,
    descriptions: Mapping[str, str] | None = None,
    flat: bool = False,
) -> dict[str, int]:
    """Detection for freshly stored flat results (search, watchlist) or a finished download.
    Never raises: a detection problem must not break a search or a download.

    `flat=True` (search/watchlist listings, review v0.3.0 M1): rows that are queued,
    downloading or done are skipped (their detection belongs to the download step and the
    «Assign festivals» pass, which see the full description), and an existing assignment is
    never replaced by a weaker or empty result."""
    counts = {"assigned": 0, "suggested": 0, "none": 0, "manual": 0, "unchanged": 0}
    if not settings.festivals.detect:
        return counts
    try:
        cat = catalog(db, settings)
        for vid in ids:
            row = db.get_video(vid)
            if not row:
                continue
            if flat and row.get("status") in _GENRE_LOCKED:
                counts["manual" if row.get("festival_manual") else "unchanged"] += 1
                continue
            desc = (descriptions or {}).get(vid)
            det = detect_row(row, cat, settings, description=desc)
            counts[apply_detection(db, row, det, settings, keep_stronger=flat)] += 1
    except Exception:
        log.warning(tr("festival.detect_failed"), exc_info=True)
    return counts


def assign_pass(
    db: Database,
    settings: Settings,
    *,
    scope: str = "library",
    description_of: Callable[[str], str | None] | None = None,
    progress: Callable[[dict[str, Any]], None] | None = None,
    cancel: threading.Event | None = None,
) -> dict[str, Any]:
    """One-off offline pass («Assign festivals»): detection for every library item
    (`scope="library"`, status done) or every known video (`scope="all"`). Manual rows are
    skipped. Runs even when `festivals.detect` is off (explicit user action).
    `progress({done, total, assigned, suggested, none, manual, unchanged})` is called about
    every 25 rows and at the end. Returns {ok, cancelled, total, assigned, suggested, none,
    manual, unchanged}."""
    cat = catalog(db, settings)
    if scope == "all":
        rows = db.query("SELECT * FROM videos ORDER BY first_seen, id")
    else:
        rows = db.query("SELECT * FROM videos WHERE status IN ('done') ORDER BY downloaded_at, id")
    total = len(rows)
    counts = {"assigned": 0, "suggested": 0, "none": 0, "manual": 0, "unchanged": 0}
    done = 0
    cancelled = False
    # review v0.3.0 m5: one short transaction per batch instead of one commit per row; the
    # detection (and sidecar reading) runs outside the lock, rows are re-read inside it
    for start in range(0, total, PASS_BATCH):
        if start:
            cat = catalog(db, settings)  # series edited/deleted/hidden meanwhile (m2)
        batch: list[tuple[str, fx.Detection | None]] = []
        for row in rows[start : start + PASS_BATCH]:
            if cancel is not None and cancel.is_set():
                cancelled = True
                break
            desc = None
            if description_of is not None and settings.festivals.match_description:
                try:
                    desc = description_of(row["id"])
                except Exception:  # unreadable sidecar: title only
                    desc = None
            batch.append((row["id"], detect_row(row, cat, settings, description=desc)))
        with db.transaction():
            results = []
            for vid, det in batch:
                cur = db.get_video(vid)
                results.append(apply_detection(db, cur, det, settings) if cur else "unchanged")
        for outcome in results:
            counts[outcome] += 1
            done += 1
            if progress is not None and (done % 25 == 0 or done == total):
                progress({"done": done, "total": total, **counts})
        if cancelled:
            break
    if not cancelled:
        db.set_state(K_LAST_PASS, now_iso())
    if progress is not None and (cancelled or total == 0):
        progress({"done": done, "total": total, **counts})
    return {"ok": True, "cancelled": cancelled, "total": total, "done": done, **counts}


# --------------------------------------------------------------------------- manual values


def set_manual(db: Database, video_id: str, data: Mapping[str, Any] | None) -> dict[str, Any]:
    """Manual festival values for one video (detection never changes the row afterwards).

    data = None -> «no festival» (cleared, still manual).
    data = {edition_id} or {series_id, event_year?, variant?}, plus optional stage, set_type,
    episode. Unknown series/edition or set type -> SeriesError({field: message})."""
    row = db.get_video(video_id)
    if not row:
        raise SeriesError({"id": tr("api.video_unknown")})
    if data is None:
        db.execute(
            "UPDATE videos SET edition_id=NULL, suggested_edition_id=NULL, stage=NULL, "
            "set_type=NULL, episode=NULL, festival_confidence=NULL, festival_manual=1 "
            "WHERE id=?",
            (video_id,),
        )
        return {"edition_id": None}
    if not isinstance(data, Mapping):
        raise SeriesError({"festival": tr("festival.invalid")})
    errors: dict[str, str] = {}
    edition_id = data.get("edition_id")
    if edition_id not in (None, ""):
        try:
            edition_id = int(edition_id)
        except (TypeError, ValueError):
            edition_id = -1
        if not db.query_one("SELECT 1 AS x FROM editions WHERE id=?", (edition_id,)):
            errors["edition_id"] = tr("festival.edition_unknown")
    else:
        edition_id = None
        sid = data.get("series_id")
        srow = None
        try:
            srow = db.query_one("SELECT * FROM series WHERE id=?", (int(sid),))
        except (TypeError, ValueError):
            pass
        if not srow:
            errors["series_id"] = tr("festival.series_unknown")
        year = data.get("event_year")
        try:
            year = int(year or 0)
        except (TypeError, ValueError):
            year = -1
        if year and not (fx.MIN_YEAR <= year <= 2100):
            errors["event_year"] = tr("festival.invalid_year")
        variant = str(data.get("variant") or "").strip()[:MAX_NAME]
        if srow and not errors:
            edition_id = ensure_edition(db, srow["id"], year, variant)
    set_type = data.get("set_type") or None
    if set_type is not None and set_type not in fx.SET_TYPES:
        errors["set_type"] = tr("festival.invalid_set_type")
    stage = str(data.get("stage") or "").strip()[:40] or None
    episode = data.get("episode")
    if episode in (None, ""):
        episode = None
    else:
        try:
            episode = int(episode)
            if episode <= 0:
                raise ValueError
        except (TypeError, ValueError):
            errors["episode"] = tr("festival.invalid_episode")
    if errors:
        raise SeriesError(errors)
    db.execute(
        "UPDATE videos SET edition_id=?, suggested_edition_id=NULL, stage=?, set_type=?, "
        "episode=?, festival_confidence=NULL, festival_manual=1 WHERE id=?",
        (edition_id, stage, set_type, episode, video_id),
    )
    return {"edition_id": edition_id}


def reset_manual(db: Database, settings: Settings, video_id: str) -> str:
    """Back to automatic detection (manual flag off, detection runs at once on the stored
    title; description from `description_of` is not needed here)."""
    db.execute("UPDATE videos SET festival_manual=0 WHERE id=?", (video_id,))
    row = db.get_video(video_id)
    if not row:
        raise SeriesError({"id": tr("api.video_unknown")})
    cat = catalog(db, settings)
    return apply_detection(db, row, detect_row(row, cat, settings), settings)


# --------------------------------------------------------------------------- series CRUD


def _counts_by_series(db: Database, statuses: Iterable[str] = LIBRARY_STATUSES) -> dict[int, int]:
    st = list(statuses)
    marks = ",".join("?" for _ in st)
    return {
        r["series_id"]: r["n"]
        for r in db.query(
            "SELECT e.series_id, COUNT(*) AS n FROM videos v JOIN editions e "
            f"ON e.id = v.edition_id WHERE v.status IN ({marks}) GROUP BY e.series_id",
            st,
        )
    }


def series_dict(row: Mapping[str, Any], count: int = 0) -> dict[str, Any]:
    d = _def_from_row(row)
    return {
        "id": row["id"],
        "key": row["key"],
        "name": row["name"],
        "kind": row["kind"],
        "aliases": list(d.aliases),
        "weak_aliases": list(d.weak_aliases),
        "channels": list(d.channels),
        "variants": [{"name": v.name, "aliases": list(v.aliases)} for v in d.variants],
        "default_genre": row["default_genre"] or None,
        "builtin": bool(row["builtin"]),
        "user_modified": bool(row["user_modified"]),
        "enabled": bool(row["enabled"]),
        "count": count,
    }


def list_series(db: Database, *, include_hidden: bool = False) -> list[dict[str, Any]]:
    sync_builtin(db)
    counts = _counts_by_series(db)
    sql = "SELECT * FROM series" + ("" if include_hidden else " WHERE hidden=0")
    rows = db.query(sql + " ORDER BY name COLLATE NOCASE, id")
    out = [series_dict(r, counts.get(r["id"], 0)) for r in rows]
    if include_hidden:
        hidden = {r["id"] for r in rows if r["hidden"]}
        for s in out:
            s["hidden"] = s["id"] in hidden
    return out


def get_series(db: Database, series_id: int) -> dict[str, Any] | None:
    row = db.query_one("SELECT * FROM series WHERE id=?", (series_id,))
    if not row:
        return None
    return series_dict(row, _counts_by_series(db).get(row["id"], 0))


def _slug(name: str) -> str:
    s = fx.norm(name).replace(" ", "-")[:40].strip("-")
    return s or "series"


def _clean_strings(value: Any, field: str, errors: dict[str, str], limit: int = MAX_ALIASES):
    if value is None:
        return []
    if not isinstance(value, (list, tuple)):
        errors[field] = tr("config.must_list")
        return []
    out: list[str] = []
    seen: set[str] = set()
    for v in value:
        if not isinstance(v, (str, int)):
            continue
        t = str(v).strip()[:MAX_NAME]
        if t and t.casefold() not in seen:
            seen.add(t.casefold())
            out.append(t)
    if len(out) > limit:
        errors[field] = tr("config.at_most", v=limit)
    return out


def _validate(
    db: Database, data: Mapping[str, Any], settings: Settings, own_id: int | None
) -> dict[str, Any]:
    errors: dict[str, str] = {}
    name = str(data.get("name") or "").strip()
    if not name:
        errors["name"] = tr("config.not_empty")
    elif len(name) > MAX_NAME:
        errors["name"] = tr("config.at_most", v=MAX_NAME)
    kind = data.get("kind") or "festival"
    if kind not in fx.KINDS:
        errors["kind"] = tr("config.allowed_values", values=", ".join(fx.KINDS))
    aliases = _clean_strings(data.get("aliases"), "aliases", errors)
    weak = _clean_strings(data.get("weak_aliases"), "weak_aliases", errors)
    channels = _clean_strings(data.get("channels"), "channels", errors)
    variants: list[dict[str, Any]] = []
    raw_variants = data.get("variants") or []
    if not isinstance(raw_variants, (list, tuple)):
        errors["variants"] = tr("config.must_list")
        raw_variants = []
    for v in raw_variants:
        if isinstance(v, str):
            v = {"name": v}
        if not isinstance(v, Mapping) or not str(v.get("name") or "").strip():
            continue
        va = _clean_strings(v.get("aliases"), "variants", errors)
        variants.append({"name": str(v["name"]).strip()[:MAX_NAME], "aliases": va})
    genre = str(data.get("default_genre") or "").strip() or None
    if genre and genre not in {g.name for g in settings.genres.items}:
        errors["default_genre"] = tr("genre.unknown", genre=genre)
    # an alias must not belong to another series (detection would be ambiguous)
    mine = {fx.norm(a) for a in (name, *aliases, *weak)} - {""}
    for other in db.query("SELECT * FROM series WHERE hidden=0"):
        if own_id is not None and other["id"] == own_id:
            continue
        d = _def_from_row(other)
        theirs = {fx.norm(a) for a in (d.name, *d.aliases, *d.weak_aliases)}
        clash = sorted(mine & theirs)
        if clash:
            field = "name" if fx.norm(name) in theirs else "aliases"
            errors.setdefault(field, tr("festival.alias_taken", alias=clash[0], series=d.name))
    if errors:
        raise SeriesError(errors)
    return {
        "name": name,
        "kind": kind,
        "aliases": _dumps(aliases),
        "weak_aliases": _dumps(weak),
        "channels": _dumps(channels),
        "variants": _dumps(variants),
        "default_genre": genre,
        "enabled": int(bool(data.get("enabled", True))),
    }


def save_series(db: Database, settings: Settings, data: Mapping[str, Any]) -> dict[str, Any]:
    """Add (no `id`) or edit a series. Editing a built-in marks it `user_modified` (updates of
    series.yaml no longer touch it; `reset_series` restores it). Returns the series dict."""
    if not isinstance(data, Mapping):
        raise SeriesError({"series": tr("festival.invalid")})
    sync_builtin(db)
    sid = data.get("id")
    row = None
    if sid not in (None, ""):
        try:
            row = db.query_one("SELECT * FROM series WHERE id=?", (int(sid),))
        except (TypeError, ValueError):
            row = None
        if not row:
            raise SeriesError({"id": tr("festival.series_unknown")})
    values = _validate(db, data, settings, row["id"] if row else None)
    with db.transaction():
        if row is None:
            base = f"u-{_slug(values['name'])}"
            key, n = base, 2
            while db.query_one("SELECT 1 AS x FROM series WHERE key=?", (key,)):
                key, n = f"{base}-{n}", n + 1
            cols = ["key", *values, "builtin", "created", "updated"]
            vals = [key, *values.values(), 0, now_iso(), now_iso()]
            cur = db.execute(
                f"INSERT INTO series({','.join(cols)}) VALUES ({','.join('?' for _ in cols)})",
                vals,
            )
            new_id = int(cur.lastrowid)
        else:
            # m1: compare normalised content (case-insensitive duplicates, trimming) so that
            # saving an unchanged built-in does not freeze it against series.yaml updates
            modified = row["user_modified"] or _content_key(row) != _content_key(values)
            sets = ", ".join(f"{k}=?" for k in values)
            db.execute(
                f"UPDATE series SET {sets}, user_modified=?, updated=? WHERE id=?",
                [*values.values(), int(bool(modified and row["builtin"])), now_iso(), row["id"]],
            )
            new_id = row["id"]
    out = get_series(db, new_id)
    assert out is not None
    return out


def _content_key(values: Mapping[str, Any]) -> tuple[Any, ...]:
    """Comparable, normalised content of a series row/values (everything but `enabled`)."""
    errors: dict[str, str] = {}

    def strings(text: Any) -> tuple[str, ...]:
        return tuple(_clean_strings(_loads(text), "x", errors, limit=10**6))

    variants = tuple(
        (str(v.get("name") or "").strip(), tuple(_clean_strings(v.get("aliases"), "x", errors)))
        for v in _loads(values["variants"])
        if isinstance(v, Mapping)
    )
    return (
        str(values["name"] or "").strip(),
        values["kind"],
        strings(values["aliases"]),
        strings(values["weak_aliases"]),
        strings(values["channels"]),
        variants,
        values["default_genre"] or None,
    )


def set_series_enabled(db: Database, series_id: int, enabled: bool) -> dict[str, Any]:
    """Switch a series on/off for detection. Not a content edit: a built-in stays
    `user_modified=0` and keeps receiving series.yaml updates (review v0.3.0 m1)."""
    cur = db.execute(
        "UPDATE series SET enabled=?, updated=? WHERE id=?",
        (int(bool(enabled)), now_iso(), int(series_id)),
    )
    if not cur.rowcount:
        raise SeriesError({"id": tr("festival.series_unknown")})
    out = get_series(db, int(series_id))
    assert out is not None
    return out


def _clear_assignments(db: Database, series_id: int) -> int:
    """Remove every assignment/suggestion pointing at editions of a series (manual ones too,
    which then go back to automatic). Returns the number of videos changed."""
    cur = db.execute(
        "UPDATE videos SET edition_id=NULL, suggested_edition_id=NULL, stage=NULL, "
        "set_type=NULL, episode=NULL, festival_confidence=NULL, festival_manual=0 "
        "WHERE edition_id IN (SELECT id FROM editions WHERE series_id=?) "
        "OR suggested_edition_id IN (SELECT id FROM editions WHERE series_id=?)",
        (series_id, series_id),
    )
    return int(cur.rowcount)


def delete_series(db: Database, series_id: int) -> dict[str, Any]:
    """User series: deleted with its editions. Built-in: hidden (not re-added by updates;
    `reset_series` brings it back). Assignments to it are removed in both cases."""
    row = db.query_one("SELECT * FROM series WHERE id=?", (series_id,))
    if not row:
        raise SeriesError({"id": tr("festival.series_unknown")})
    with db.transaction():
        cleared = _clear_assignments(db, series_id)
        if row["builtin"]:
            db.execute("UPDATE series SET hidden=1, updated=? WHERE id=?", (now_iso(), series_id))
        else:
            db.execute("DELETE FROM series WHERE id=?", (series_id,))
    return {"hidden": bool(row["builtin"]), "cleared": cleared}


def reset_series(db: Database, series_id: int | None = None) -> list[dict[str, Any]]:
    """Restore built-ins to the shipped state (visible, enabled, not modified): one
    (`series_id`) or all of them (None). Returns the restored series. A user series -> error."""
    if series_id is None:
        rows = db.query("SELECT * FROM series WHERE builtin=1")
    else:
        row = db.query_one("SELECT * FROM series WHERE id=?", (series_id,))
        if not row:
            raise SeriesError({"id": tr("festival.series_unknown")})
        if not row["builtin"]:
            raise SeriesError({"id": tr("festival.not_builtin")})
        rows = [row]
    out = []
    with db.transaction():
        for row in rows:
            d = _builtin_def(row["key"])
            if d is None:
                continue
            values = _builtin_row(d)
            sets = ", ".join(f"{k}=?" for k in values)
            db.execute(
                f"UPDATE series SET {sets}, user_modified=0, hidden=0, enabled=1, updated=? "
                "WHERE id=?",
                [*values.values(), now_iso(), row["id"]],
            )
            out.append(row["id"])
    for sid in out:
        _warn_alias_clashes(db, sid)
    return [s for s in (get_series(db, i) for i in out) if s]


def _warn_alias_clashes(db: Database, series_id: int) -> None:
    """m4: a restored built-in may share an alias with a user series created while it was
    hidden. Detection stays deterministic (lowest id wins), but the user should know."""
    row = db.query_one("SELECT * FROM series WHERE id=?", (series_id,))
    if not row:
        return
    d = _def_from_row(row)
    mine = {fx.norm(a) for a in (d.name, *d.aliases, *d.weak_aliases)} - {""}
    for other in db.query("SELECT * FROM series WHERE hidden=0 AND id<>?", (series_id,)):
        o = _def_from_row(other)
        clash = sorted(mine & {fx.norm(a) for a in (o.name, *o.aliases, *o.weak_aliases)})
        if clash:
            log.warning(tr("festival.alias_taken", alias=clash[0], series=o.name))


# --------------------------------------------------------------------------- grouping


def festival_tree(db: Database, *, statuses: Iterable[str] = LIBRARY_STATUSES) -> dict[str, Any]:
    """Library grouped series -> editions -> stages (only assigned items count).

    {series: [{id, key, name, kind, count, editions: [{id, event_year, variant, edition,
    festival, count, stages: [{stage|null, count}], set_types: [{set_type|null, count}]}]}],
     unassigned, suggested, total}. Series by count (desc) then name; editions newest first."""
    st = list(statuses)
    marks = ",".join("?" for _ in st)
    rows = db.query(
        "SELECT e.id AS eid, e.year, e.variant, s.id AS sid, s.key, s.name, s.kind, "
        "v.stage, v.set_type, COUNT(*) AS n FROM videos v "
        "JOIN editions e ON e.id = v.edition_id JOIN series s ON s.id = e.series_id "
        f"WHERE v.status IN ({marks}) GROUP BY e.id, v.stage, v.set_type",
        st,
    )
    series: dict[int, dict[str, Any]] = {}
    for r in rows:
        s = series.setdefault(
            r["sid"],
            {
                "id": r["sid"],
                "key": r["key"],
                "name": r["name"],
                "kind": r["kind"],
                "count": 0,
                "_editions": {},
            },
        )
        ed = s["_editions"].setdefault(
            r["eid"],
            {
                "id": r["eid"],
                "event_year": r["year"] or None,
                "variant": r["variant"] or "",
                "edition": fx.edition_name(r["name"], r["year"] or None, r["variant"]),
                "festival": fx.festival_label(r["name"], r["variant"]),
                "count": 0,
                "_stages": {},
                "_types": {},
            },
        )
        s["count"] += r["n"]
        ed["count"] += r["n"]
        ed["_stages"][r["stage"]] = ed["_stages"].get(r["stage"], 0) + r["n"]
        ed["_types"][r["set_type"]] = ed["_types"].get(r["set_type"], 0) + r["n"]

    def stage_key(item: tuple[str | None, int]) -> tuple[int, str]:
        return (item[0] is None, (item[0] or "").casefold())

    out = []
    for s in series.values():
        eds = []
        for ed in s.pop("_editions").values():
            ed["stages"] = [
                {"stage": k, "count": n}
                for k, n in sorted(ed.pop("_stages").items(), key=stage_key)
            ]
            ed["set_types"] = [
                {"set_type": k, "count": n}
                for k, n in sorted(ed.pop("_types").items(), key=stage_key)
            ]
            eds.append(ed)
        eds.sort(key=lambda e: (-(e["event_year"] or 0), e["variant"].casefold()))
        s["editions"] = eds
        out.append(s)
    out.sort(key=lambda s: (-s["count"], s["name"].casefold()))
    total = db.query(f"SELECT COUNT(*) AS n FROM videos WHERE status IN ({marks})", st)[0]["n"]
    unassigned = db.query(
        f"SELECT COUNT(*) AS n FROM videos WHERE status IN ({marks}) AND edition_id IS NULL", st
    )[0]["n"]
    suggested = db.query(
        f"SELECT COUNT(*) AS n FROM videos WHERE status IN ({marks}) AND edition_id IS NULL "
        "AND suggested_edition_id IS NOT NULL AND festival_manual=0",
        st,
    )[0]["n"]
    return {"series": out, "unassigned": unassigned, "suggested": suggested, "total": total}


_YEAR_SQL = "CASE WHEN substr(upload_date,1,4) GLOB '[0-9][0-9][0-9][0-9]' "
_YEAR_SQL += "THEN substr(upload_date,1,4) ELSE '' END"


def group_counts(
    db: Database, by: str, *, statuses: Iterable[str] = LIBRARY_STATUSES
) -> list[dict[str, Any]]:
    """Flat groups with counts: by "year" (upload year), "event_year" (assigned edition year),
    "artist" (channel name), "genre", "stage", "set_type". [{key, count}], key "" = unknown /
    none. Year groups newest first, the others by count then key."""
    st = list(statuses)
    marks = ",".join("?" for _ in st)
    exprs = {
        "year": _YEAR_SQL,
        "artist": "COALESCE(channel_name,'')",
        "genre": f"COALESCE(NULLIF(genre,''),'{UNSORTED}')",
        "stage": "CASE WHEN edition_id IS NULL THEN '' ELSE COALESCE(stage,'') END",
        "set_type": "CASE WHEN edition_id IS NULL THEN '' ELSE COALESCE(set_type,'') END",
    }
    if by == "event_year":
        rows = db.query(
            "SELECT CASE WHEN e.year > 0 THEN CAST(e.year AS TEXT) ELSE '' END AS k, "
            "COUNT(*) AS n FROM videos v LEFT JOIN editions e ON e.id = v.edition_id "
            f"WHERE v.status IN ({marks}) GROUP BY k",
            st,
        )
    elif by in exprs:
        rows = db.query(
            f"SELECT {exprs[by]} AS k, COUNT(*) AS n FROM videos "
            f"WHERE status IN ({marks}) GROUP BY k",
            st,
        )
    else:
        raise ValueError(by)
    groups = [{"key": r["k"] or "", "count": r["n"]} for r in rows]
    if by in ("year", "event_year"):
        groups.sort(key=lambda g: g["key"], reverse=True)
        groups.sort(key=lambda g: g["key"] == "")  # stable: unknown last
    else:
        groups.sort(key=lambda g: (g["key"] == "", -g["count"], g["key"].casefold()))
    return groups


def status(db: Database) -> dict[str, Any]:
    tree = festival_tree(db)
    return {
        "series": db.query("SELECT COUNT(*) AS n FROM series WHERE hidden=0")[0]["n"],
        "assigned": tree["total"] - tree["unassigned"],
        "suggested": tree["suggested"],
        "unassigned": tree["unassigned"],
        "total": tree["total"],
        "last_pass": db.get_state(K_LAST_PASS),
    }


# --------------------------------------------------------------------------- tags and paths


def tag_fields(db: Database, video_id: str) -> dict[str, str]:
    """Values for tags and path placeholders of an assigned video (empty strings if none):
    festival, event_year, stage, set_type (language-neutral label), episode, edition."""
    empty = {k: "" for k in ("festival", "event_year", "stage", "set_type", "episode", "edition")}
    row = db.get_video(video_id)
    if not row or not row.get("edition_id"):
        return empty
    ed = edition_map(db).get(row["edition_id"])
    if not ed:
        return empty
    labels = set_type_labels()
    return {
        "festival": ed["festival"],
        "event_year": str(ed["event_year"] or ""),
        "stage": row.get("stage") or "",
        "set_type": labels.get(row.get("set_type") or "", "") if row.get("set_type") else "",
        "episode": str(row["episode"]) if row.get("episode") else "",
        "edition": ed["edition"],
    }


def apply_to_tags(
    tag_meta: dict[str, Any], fields: Mapping[str, str], settings: Settings
) -> dict[str, Any]:
    """Add the festival frames to a tag dict; album = edition when
    `storage.album_from_edition` (default on) and an edition is assigned."""
    for key in ("festival", "event_year", "stage", "set_type", "episode"):
        tag_meta[key] = fields.get(key, "")
    if settings.storage.album_from_edition and fields.get("edition"):
        tag_meta["album"] = fields["edition"]
    return tag_meta


def path_values(fields: Mapping[str, str]) -> dict[str, str]:
    """`{festival}`, `{event_year}`, `{stage}` for paths.build_target_path."""
    return {k: fields.get(k, "") for k in ("festival", "event_year", "stage")}
