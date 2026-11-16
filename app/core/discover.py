"""Discover (SPEC §3.1): search post-processing, filter reasons and the last search.

`run_search` takes an already built client (YtClient or a fake with `.search(...)`), so this
module never imports yt-dlp. The UI filters live on the client side; the backend returns *all*
hits with their DB status and a `filter_reason` computed from the saved filter settings
(docs/decisions.md, Phase 3).
"""

from __future__ import annotations

import json
import logging
from collections.abc import Collection, Mapping
from datetime import UTC, datetime
from typing import Any

from . import filters
from .config import UNSORTED, Settings
from .db import Database
from .genre import detect_genre
from .throttle import BackoffActive, LimitReached, Throttle

log = logging.getLogger(__name__)

K_LAST_SEARCH = "last_search"
MIN_YEAR = 2005


def format_until(until: datetime, now: datetime | None = None) -> str:
    """'14:30' today, else '17.11. 14:30' (local time)."""
    local = until.astimezone()
    today = (now or datetime.now(UTC)).astimezone(local.tzinfo).date()
    return f"{local:%H:%M}" if local.date() == today else f"{local:%d.%m. %H:%M}"


def clean_options(
    opts: Mapping[str, Any] | None, settings: Settings
) -> tuple[str | None, int | None]:
    """`{genre, year}` from the UI -> (known genre name | None, plausible year | None)."""
    opts = opts or {}
    genre = opts.get("genre") or None
    if genre not in {g.name for g in settings.genres.items}:
        genre = None
    year: int | None
    try:
        year = int(opts.get("year")) if opts.get("year") not in (None, "", 0) else None
    except (TypeError, ValueError):
        year = None
    if year is not None and not (MIN_YEAR <= year <= datetime.now().year + 1):
        year = None
    return genre, year


def filter_reason(
    video: Mapping[str, Any],
    settings: Settings,
    status: str | None,
    blacklist: Collection[str],
    *,
    year: int | None = None,
) -> str:
    """'' if the video passes the saved filters (SPEC §4), else the German reason.

    A year chosen for this search (opts.year) replaces the saved upload period.
    """
    f = settings.filters
    if year:
        f = f.model_copy(update={"upload_period": "year", "upload_year": int(year)})
    ok, reason = filters.passes(video, f, status=status, blacklist=blacklist)
    return "" if ok else reason


def _genre_for(
    entry: Mapping[str, Any], row: Mapping[str, Any] | None, settings: Settings, hint: str | None
) -> str:
    manual = row.get("genre") if row and row.get("genre_manual") else None
    genre = detect_genre(entry.get("title"), settings.genres.items, manual=manual)
    # the genre chip of the search implies the genre when no keyword decides (not "manual")
    return hint if genre == UNSORTED and hint else genre


def _result(
    row: Mapping[str, Any],
    settings: Settings,
    blacklist: Collection[str],
    *,
    live: bool,
    year: int | None,
    video_dict: Any,
) -> dict[str, Any]:
    out = video_dict(dict(row))
    probe = {**out, "live_status": "is_live" if live else None}
    out["filter_reason"] = filter_reason(probe, settings, out["status"], blacklist, year=year)
    return out


def store_results(
    db: Database,
    entries: list[dict[str, Any]],
    settings: Settings,
    *,
    genre_hint: str | None,
) -> list[str]:
    """Upsert flat search hits (new rows get status 'new') with detected genre. Returns ids."""
    ids: list[str] = []
    for e in entries:
        vid = e.get("id")
        if not vid or vid in ids:
            continue
        row = db.get_video(vid)
        db.upsert_video(
            {
                "id": vid,
                "title": e.get("title"),
                "channel_id": e.get("channel_id") or None,
                "channel_name": e.get("channel_name") or None,
                "duration": e.get("duration"),
                "upload_date": e.get("upload_date") or None,
                "date_approx": bool(e.get("date_approx")),
                "view_count": e.get("view_count"),
                "thumbnail": e.get("thumbnail"),
                "genre": _genre_for(e, row, settings, genre_hint),
            }
        )
        ids.append(vid)
    return ids


def run_search(
    client: Any,
    db: Database,
    throttle: Throttle,
    settings: Settings,
    query: str,
    *,
    genre: str | None,
    year: int | None,
    effective_query: str,
    video_dict: Any,
) -> dict[str, Any]:
    """Search (through the client = throttle), store, annotate. Bridge response shape."""
    try:
        entries = client.search(query, genre=genre, year=year)
    except BackoffActive as exc:
        return {
            "ok": False,
            "error": f"Backoff aktiv bis {format_until(exc.until)} – Suche gesperrt",
        }
    except LimitReached as exc:
        at = throttle.search_available_at()
        when = f" – wieder möglich ab {format_until(at)}" if at else ""
        return {
            "ok": False,
            "error": f"Limit «Suchen pro Stunde» erreicht ({exc.limit}/{exc.limit}){when}",
        }
    except Exception as exc:
        if getattr(exc, "rate_limited", False):
            until = throttle.backoff_until()
            tail = f" – Backoff bis {format_until(until)}" if until else ""
            return {"ok": False, "error": f"YouTube blockiert gerade (429/Bot-Prüfung){tail}"}
        log.error("Suche fehlgeschlagen: %s", exc)
        return {"ok": False, "error": f"Suche fehlgeschlagen: {exc}"}
    ids = store_results(db, entries, settings, genre_hint=genre)
    live = [e["id"] for e in entries if filters.is_live(e)]
    db.set_state(
        K_LAST_SEARCH,
        json.dumps(
            {
                "query": query,
                "effective_query": effective_query,
                "genre": genre,
                "year": year,
                "ids": ids,
                "live": live,
                "ts": datetime.now(UTC).isoformat(timespec="seconds"),
            }
        ),
    )
    results = _annotated(db, ids, set(live), settings, year=year, video_dict=video_dict)
    hidden = sum(1 for r in results if r["filter_reason"])
    log.info("Suche «%s»: %d Treffer, %d davon ausgefiltert", effective_query, len(results), hidden)
    return {
        "ok": True,
        "results": results,
        "effective_query": effective_query,
        "query": query,
        "genre": genre,
        "year": year,
        "hidden_count": hidden,
    }


def _annotated(
    db: Database,
    ids: list[str],
    live: set[str],
    settings: Settings,
    *,
    year: int | None,
    video_dict: Any,
) -> list[dict[str, Any]]:
    blacklist = db.blacklist_ids()
    out = []
    for vid in ids:
        row = db.get_video(vid)
        if row:
            out.append(
                _result(
                    row, settings, blacklist, live=vid in live, year=year, video_dict=video_dict
                )
            )
    return out


def last_search(db: Database, settings: Settings, *, video_dict: Any) -> dict[str, Any] | None:
    """The last search from the DB (no network), statuses and filter reasons up to date."""
    raw = db.get_state(K_LAST_SEARCH)
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except ValueError:
        return None
    year = data.get("year")
    results = _annotated(
        db,
        [str(i) for i in data.get("ids") or []],
        set(data.get("live") or []),
        settings,
        year=year,
        video_dict=video_dict,
    )
    return {
        "query": data.get("query") or "",
        "effective_query": data.get("effective_query") or data.get("query") or "",
        "genre": data.get("genre"),
        "year": year,
        "results": results,
        "hidden_count": sum(1 for r in results if r["filter_reason"]),
    }
