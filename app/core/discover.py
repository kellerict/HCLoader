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

from . import duplicates, filters, platforms
from .config import UNSORTED, Settings
from .db import Database
from .genre import detect_genre
from .redact import redact
from .throttle import BackoffActive, LimitReached, MetadataBusy, Throttle

log = logging.getLogger(__name__)

K_LAST_SEARCH = "last_search"
MIN_YEAR = 2005
# M1: the genre of these rows is what the file got (or is about to get); searches leave it alone
GENRE_LOCKED_STATUSES = ("queued", "downloading", "done")


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


def clean_platform(opts: Mapping[str, Any] | None) -> str | None:
    """`opts.platform` of a search: 'youtube' (default) | 'soundcloud'; None = invalid."""
    value = (opts or {}).get("platform") or platforms.YOUTUBE
    return value if platforms.valid(value) else None


def soundcloud_page(db: Database, video_id: str) -> str | None:
    """Web page of a stored SoundCloud track (`open_video`), only https://soundcloud.com."""
    if not platforms.is_valid_db_id(video_id) or platforms.platform_of(video_id) != "soundcloud":
        return None
    row = db.get_video(video_id) or {}
    url = str(row.get("url") or "")
    return url if _sc_web_url(url) else None


def soundcloud_channel_page(db: Database, channel_id: str) -> str | None:
    """Profile URL of a SoundCloud uploader known from stored tracks (`add_channel_source`)."""
    row = db.query_one(
        "SELECT channel_url FROM videos WHERE channel_id=? AND channel_url IS NOT NULL "
        "AND channel_url != '' ORDER BY first_seen DESC LIMIT 1",
        (channel_id,),
    )
    url = str((row or {}).get("channel_url") or "").rstrip("/")
    return url if _sc_web_url(url) else None


def _sc_web_url(url: str) -> bool:
    return url.startswith("https://") and platforms.url_platform(url) == platforms.SOUNDCLOUD


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
    entry: Mapping[str, Any],
    row: Mapping[str, Any] | None,
    settings: Settings,
    hint: str | None,
    source_default: str | None = None,
) -> str:
    """manual > source default > keyword > genre chip of the search > Unsortiert.

    The same order `YtClient._finish` applies at download time (it falls back to the stored,
    non-manual genre = this chip hint when the keywords decide nothing; Review Phase 3 M1)."""
    manual = row.get("genre") if row and row.get("genre_manual") else None
    genre = detect_genre(
        entry.get("title"), settings.genres.items, manual=manual, source_default=source_default
    )
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
    db: Database | None = None,
) -> dict[str, Any]:
    out = video_dict(dict(row))
    out["is_live"] = bool(live)  # n1: the UI uses this flag, not the German filter text
    probe = {**out, "live_status": "is_live" if live else None}
    out["filter_reason"] = filter_reason(probe, settings, out["status"], blacklist, year=year)
    annotate_duplicate(out, db, settings, set_reason=True)
    return out


def annotate_duplicate(
    out: dict[str, Any], db: Database | None, settings: Settings, *, set_reason: bool = False
) -> dict[str, Any]:
    """Phase 7a: `duplicate_of: {id, platform, title} | None` (same mix probably already loaded
    from the other platform). With `filters.hide_cross_platform_duplicates` and `set_reason`,
    an otherwise passing hit gets the filter reason «Vermutlich bereits geladen (…)»."""
    dup = None
    if db is not None and out.get("status") not in ("done", "ignored"):
        dup = duplicates.find_duplicate(db, out)
    out["duplicate_of"] = dup
    if (
        dup
        and set_reason
        and settings.filters.hide_cross_platform_duplicates
        and not out.get("filter_reason")
    ):
        out["filter_reason"] = duplicates.reason(dup)
    return out


def store_results(
    db: Database,
    entries: list[dict[str, Any]],
    settings: Settings,
    *,
    genre_hint: str | None,
) -> list[str]:
    """Upsert flat search hits (new rows get status 'new') with detected genre. Returns ids.

    The genre of rows that are queued, downloading or done is never changed by a search
    (Review Phase 3 M1): library, file folder and TCON must stay consistent."""
    ids: list[str] = []
    for e in entries:
        vid = e.get("id")
        if not vid or vid in ids:
            continue
        row = db.get_video(vid)
        data: dict[str, Any] = {
            "id": vid,
            "title": e.get("title"),
            "channel_id": e.get("channel_id") or None,
            "channel_name": e.get("channel_name") or None,
            "duration": e.get("duration"),
            "upload_date": e.get("upload_date") or None,
            "date_approx": bool(e.get("date_approx")),
            "view_count": e.get("view_count"),
            "thumbnail": e.get("thumbnail"),
            "platform": e.get("platform") or platforms.platform_of(vid),
            "url": e.get("url") or None,
            "channel_url": e.get("channel_url") or None,
            "preview": bool(e.get("preview")),
            "geo_blocked": bool(e.get("geo_blocked")),
        }
        if not row or row.get("status") not in GENRE_LOCKED_STATUSES:
            source_default = None
            if row and row.get("source_id") is not None:
                src = db.get_source(row["source_id"])
                source_default = (src or {}).get("default_genre") or None
            data["genre"] = _genre_for(e, row, settings, genre_hint, source_default)
        db.upsert_video(data)
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
    platform: str = platforms.YOUTUBE,
) -> dict[str, Any]:
    """Search (through the client = throttle of `platform`), store, annotate. Bridge response
    shape. Fake clients without a `platform` argument keep working for YouTube."""
    name = platforms.label(platform)
    pth = throttle.platform(platform) if hasattr(throttle, "platform") else throttle
    kwargs: dict[str, Any] = {"genre": genre, "year": year}
    if platform != platforms.YOUTUBE:
        kwargs["platform"] = platform
    try:
        entries = client.search(query, **kwargs)
    except BackoffActive as exc:
        what = "Backoff" if platform == platforms.YOUTUBE else f"Backoff ({name})"
        return {
            "ok": False,
            "error": f"{what} aktiv bis {format_until(exc.until)} – Suche gesperrt",
        }
    except MetadataBusy as exc:  # a download is extracting right now (m4)
        return {"ok": False, "error": str(exc)}
    except LimitReached as exc:
        at = pth.search_available_at()
        when = f" – wieder möglich ab {format_until(at)}" if at else ""
        return {
            "ok": False,
            "error": f"Limit «Suchen pro Stunde» erreicht ({exc.limit}/{exc.limit}){when}",
        }
    except Exception as exc:
        if getattr(exc, "rate_limited", False):
            until = pth.backoff_until()
            tail = f" – Backoff bis {format_until(until)}" if until else ""
            return {"ok": False, "error": f"{name} blockiert gerade (429/Bot-Prüfung){tail}"}
        text = redact(exc)  # n4: proxy credentials never reach the UI or the log
        log.error("Suche fehlgeschlagen: %s", text)
        return {"ok": False, "error": f"Suche fehlgeschlagen: {text}"}
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
                "platform": platform,
                "ids": ids,
                "live": live,
                "ts": datetime.now(UTC).isoformat(timespec="seconds"),
            }
        ),
    )
    results = _annotated(db, ids, set(live), settings, year=year, video_dict=video_dict)
    hidden = sum(1 for r in results if r["filter_reason"])
    log.info(
        "Suche «%s» (%s): %d Treffer, %d davon ausgefiltert",
        effective_query,
        name,
        len(results),
        hidden,
    )
    return {
        "ok": True,
        "results": results,
        "effective_query": effective_query,
        "query": query,
        "genre": genre,
        "year": year,
        "platform": platform,
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
                    row,
                    settings,
                    blacklist,
                    live=vid in live,
                    year=year,
                    video_dict=video_dict,
                    db=db,
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
        "platform": data.get("platform") or platforms.YOUTUBE,
        "results": results,
        "hidden_count": sum(1 for r in results if r["filter_reason"]),
    }
