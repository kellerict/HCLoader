"""Watchlist (SPEC §3.2): incremental source checks, filter, inbox / auto-download.

Pure core logic: `client` is a `YtClient` (or a fake with `list_source`/`search`), so nothing here
imports yt-dlp. Every request goes through the client and therefore through the throttle.

Per source the flat listing (newest first) is walked in order and stops at the first video that
is already known in the DB (`break_on_existing`, SPEC §3.2). New videos are stored with the genre
of the source (or keyword detection); those that pass the filters land in the inbox (or in the
download queue for `auto_download` sources), the others stay `new` and are not shown in the inbox.
A 429 / bot check (backoff) aborts the whole run.
"""

from __future__ import annotations

import logging
import re
import threading
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from urllib.parse import parse_qs, urlparse

from . import filters
from .config import UNSORTED, Settings
from .db import Database, now_iso
from .discover import format_until
from .genre import detect_genre
from .redact import redact
from .throttle import BackoffActive, LimitReached

log = logging.getLogger(__name__)

SOURCE_TYPES = ("channel", "playlist", "search")
K_LAST_RUN = "watchlist_last_run"
MAX_NAME_LENGTH = 120
MAX_QUERY_LENGTH = 300
MAX_URL_LENGTH = 500

_CHANNEL_PATH_RE = re.compile(
    r"^/(?:@[^/?#\s]+|channel/[^/?#\s]+|c/[^/?#\s]+|user/[^/?#\s]+)"
    r"(?:/(?:videos|streams|releases|featured|playlists))?/?$"
)
_YT_HOSTS = ("youtube.com", "www.youtube.com", "m.youtube.com")

SourceEvent = Callable[[dict[str, Any]], None]
Enqueue = Callable[[list[str]], list[str]]


# --------------------------------------------------------------------------- validation


def _youtube_url(text: str) -> tuple[Any, str | None]:
    """(parsed URL, error). Only http(s) URLs of youtube.com."""
    try:
        parsed = urlparse(text)
    except ValueError:
        return None, "Ungültige URL."
    if parsed.scheme not in ("http", "https") or (parsed.hostname or "") not in _YT_HOSTS:
        return None, "YouTube-URL erwartet (https://www.youtube.com/…)."
    return parsed, None


def validate_source(
    data: Mapping[str, Any], settings: Settings, *, existing: Sequence[Mapping[str, Any]] = ()
) -> tuple[dict[str, Any], dict[str, str]]:
    """Check a `Source` from the UI. Returns (clean fields, {field: German message}).

    Extra keys (id, last_checked, new_count) are ignored. `existing`: the other sources (same
    type + URL/query is refused as duplicate).
    """
    errors: dict[str, str] = {}
    stype = str(data.get("type") or "")
    if stype not in SOURCE_TYPES:
        errors["type"] = "Typ muss Kanal, Playlist oder Suche sein."
    name = str(data.get("name") or "").strip()
    if not name:
        errors["name"] = "Name fehlt."
    elif len(name) > MAX_NAME_LENGTH:
        errors["name"] = f"Name ist zu lang (max. {MAX_NAME_LENGTH} Zeichen)."

    target = str(data.get("url_or_query") or "").strip()
    if stype == "search":
        target = re.sub(r"\s+", " ", target)
        if not target:
            errors["url_or_query"] = "Suchbegriff fehlt."
        elif len(target) > MAX_QUERY_LENGTH:
            errors["url_or_query"] = f"Suchbegriff ist zu lang (max. {MAX_QUERY_LENGTH} Zeichen)."
    elif stype in ("channel", "playlist"):
        if not target:
            errors["url_or_query"] = "URL fehlt."
        elif len(target) > MAX_URL_LENGTH:
            errors["url_or_query"] = "URL ist zu lang."
        else:
            parsed, err = _youtube_url(target)
            if err:
                errors["url_or_query"] = err
            elif stype == "channel" and not _CHANNEL_PATH_RE.match(parsed.path):
                errors["url_or_query"] = (
                    "Kanal-URL erwartet (…/@name, …/channel/ID, …/c/name oder …/user/name)."
                )
            elif stype == "playlist" and not parse_qs(parsed.query).get("list"):
                errors["url_or_query"] = "Playlist-URL erwartet (…/playlist?list=ID)."
    elif not target:
        errors["url_or_query"] = "URL oder Suchbegriff fehlt."

    raw_max = data.get("max_entries")
    max_entries = settings.schedule.entries_per_source if raw_max in (None, "") else raw_max
    try:
        if isinstance(max_entries, bool) or int(max_entries) != float(max_entries):
            raise ValueError
        max_entries = int(max_entries)
        if not 1 <= max_entries <= 200:
            raise ValueError
    except (TypeError, ValueError):
        errors["max_entries"] = "Wert muss eine ganze Zahl zwischen 1 und 200 sein."

    genre = data.get("default_genre") or None
    if genre == UNSORTED:
        genre = None
    if genre is not None and genre not in {g.name for g in settings.genres.items}:
        errors["default_genre"] = f"Unbekanntes Genre: {genre}"

    if not errors:
        own = data.get("id")
        for other in existing:
            if (
                other["id"] != own
                and other["type"] == stype
                and str(other["url_or_query"]).strip().rstrip("/").lower()
                == target.rstrip("/").lower()
            ):
                errors["url_or_query"] = f"Quelle existiert bereits ({other['name']})."
                break
    if errors:
        return {}, errors
    return {
        "type": stype,
        "name": name,
        "url_or_query": target,
        "default_genre": genre,
        "enabled": bool(data.get("enabled", True)),
        "auto_download": bool(data.get("auto_download", False)),
        "max_entries": max_entries,
    }, {}


# --------------------------------------------------------------------------- results


@dataclass
class SourceCheck:
    """Result of one source. `new` = videos stored for the first time."""

    source_id: int
    new: int = 0
    inbox: int = 0  # new and passing the filters, waiting in the inbox
    queued: int = 0  # new and passing, put into the download queue (auto_download)
    queued_ids: list[str] = field(default_factory=list)
    filtered: int = 0  # new but rejected by the filters (status stays 'new')
    seen: int = 0  # entries looked at (up to the first known one)
    error: str | None = None
    backoff: bool = False


@dataclass
class WatchlistResult:
    """Result of `check_all`. `found` = sum of new videos, `errors` = failed sources."""

    checked: int = 0
    found: int = 0
    errors: int = 0
    queued: int = 0
    inbox: int = 0
    backoff: bool = False
    cancelled: bool = False
    note: str = ""
    run_id: int | None = None
    sources: list[SourceCheck] = field(default_factory=list)
    queued_ids: list[str] = field(default_factory=list)


# --------------------------------------------------------------------------- check


def _is_rate_limited(exc: BaseException) -> bool:
    return isinstance(exc, BackoffActive) or bool(getattr(exc, "rate_limited", False))


def _entry_row(entry: Mapping[str, Any], source_id: int, genre: str, status: str) -> dict[str, Any]:
    return {
        "id": entry["id"],
        "title": entry.get("title"),
        "channel_id": entry.get("channel_id") or None,
        "channel_name": entry.get("channel_name") or None,
        "duration": entry.get("duration"),
        "upload_date": entry.get("upload_date") or None,
        "date_approx": bool(entry.get("date_approx")),
        "view_count": entry.get("view_count"),
        "thumbnail": entry.get("thumbnail"),
        "genre": genre,
        "source_id": source_id,
        "status": status,
    }


def check_source(
    source: Mapping[str, Any],
    *,
    client: Any,
    db: Database,
    settings: Settings,
    enqueue: Enqueue | None = None,
) -> SourceCheck:
    """Check one source (a DB row). Raises on request errors (the caller decides); see
    `check_all` for the error handling. Marks the source as checked and returns the counts.

    Channel/playlist: stop at the first known video (incremental). Search: relevance order is
    not chronological, so known videos are skipped instead (no stop).
    """
    sid = int(source["id"])
    stype = source["type"]
    max_entries = int(source.get("max_entries") or settings.schedule.entries_per_source)
    target = source["url_or_query"]
    if stype == "search":
        entries = client.search(target, max_entries)
    else:
        entries = client.list_source(target, max_entries)

    res = SourceCheck(sid)
    genre_names = {g.name for g in settings.genres.items}
    default = source.get("default_genre") or None
    if default not in genre_names or default == UNSORTED:
        default = None
    auto = bool(source.get("auto_download")) and enqueue is not None
    blacklist = db.blacklist_ids()
    to_queue: list[str] = []
    for entry in entries:
        vid = entry.get("id")
        if not vid:
            continue
        res.seen += 1
        if db.is_known(vid):
            if stype == "search":
                continue
            break  # everything after this one was seen in an earlier check
        genre = detect_genre(entry.get("title"), settings.genres.items, source_default=default)
        ok, _reason = filters.passes(entry, settings.filters, status=None, blacklist=blacklist)
        # auto-download rows start as 'new' and are enqueued below (queue_pos); the rest of the
        # passing ones go straight to the inbox, rejected ones stay 'new' (not in the inbox)
        status = "inbox" if ok and not auto else "new"
        db.upsert_video(_entry_row(entry, sid, genre, status))
        res.new += 1
        if not ok:
            res.filtered += 1
        elif auto:
            to_queue.append(vid)
        else:
            res.inbox += 1
    if to_queue:
        accepted = enqueue(to_queue) if enqueue else []
        res.queued = len(accepted)
        res.queued_ids = list(accepted)
        for vid in to_queue:  # not accepted (should not happen): keep them visible
            if vid not in accepted:
                db.set_status(vid, "inbox")
                res.inbox += 1
    db.mark_source_checked(sid)
    log.info(
        "Quelle «%s»: %d neu (%d im Eingang, %d in der Warteschlange, %d gefiltert)",
        source.get("name"),
        res.new,
        res.inbox,
        res.queued,
        res.filtered,
    )
    return res


def _backoff_note(throttle: Any, exc: BaseException | None = None) -> str:
    until = throttle.backoff_until() if throttle is not None else None
    if until is None and isinstance(exc, BackoffActive):
        until = exc.until
    tail = f" bis {format_until(until)}" if until else ""
    reason = getattr(exc, "reason", "") if exc is not None else ""
    return f"Backoff{tail}" + (f" ({reason[:80]})" if reason else "")


def check_all(
    *,
    client: Any,
    db: Database,
    throttle: Any,
    settings: Settings,
    ids: Sequence[int] | None = None,
    enqueue: Enqueue | None = None,
    on_source: SourceEvent | None = None,
    cancel: threading.Event | None = None,
    run_kind: str | None = "watchlist",
) -> WatchlistResult:
    """Check sources one after the other (never in parallel).

    `ids=None`: all enabled sources; otherwise exactly these (also disabled ones). A `runs`
    entry of kind `run_kind` (found, errors, note) is written unless `run_kind` is None (the
    headless run writes its own entry). Backoff (active or triggered by a 429) aborts the whole
    run: note starts with "Backoff". A failing source is counted as an error, the run goes on.
    Events: `on_source({id, checking, last_checked?, new_count?, error?})`.
    """
    sources = db.list_sources(enabled_only=ids is None)
    if ids is not None:
        wanted = {int(i) for i in ids}
        sources = [s for s in sources if s["id"] in wanted]
    result = WatchlistResult()
    if run_kind:
        result.run_id = db.start_run(run_kind)
    log.info("Watchlist-Prüfung gestartet · %d Quelle(n)", len(sources))

    def emit(payload: dict[str, Any]) -> None:
        if on_source:
            try:
                on_source(payload)
            except Exception:
                log.debug("source-Event fehlgeschlagen", exc_info=True)

    try:
        for source in sources:
            if cancel is not None and cancel.is_set():
                result.cancelled = True
                result.note = "Abgebrochen"
                break
            sid = source["id"]
            emit({"id": sid, "checking": True})
            try:
                check = check_source(
                    source, client=client, db=db, settings=settings, enqueue=enqueue
                )
            except Exception as exc:
                check = SourceCheck(sid)
                if _is_rate_limited(exc):
                    check.backoff = True
                    check.error = "YouTube blockiert gerade (429/Bot-Prüfung)"
                    result.backoff = True
                    result.note = _backoff_note(throttle, exc)
                    log.error("Watchlist abgebrochen: %s", result.note)
                else:
                    text = redact(exc) or exc.__class__.__name__
                    check.error = (
                        "Limit «Suchen pro Stunde» erreicht"
                        if isinstance(exc, LimitReached)
                        else str(text)[:300]
                    )
                    log.error("Quelle «%s»: %s", source.get("name"), check.error)
                    log.debug("Details", exc_info=True)
                result.errors += 1
                result.sources.append(check)
                fresh = db.get_source(sid) or source
                emit(
                    {
                        "id": sid,
                        "checking": False,
                        "last_checked": fresh.get("last_checked"),
                        "new_count": db.count_videos(status="inbox", source_id=sid),
                        "error": check.error,
                    }
                )
                if check.backoff:
                    break
                continue
            result.checked += 1
            result.found += check.new
            result.inbox += check.inbox
            result.queued += check.queued
            result.sources.append(check)
            fresh = db.get_source(sid) or source
            emit(
                {
                    "id": sid,
                    "checking": False,
                    "last_checked": fresh.get("last_checked"),
                    "new_count": db.count_videos(status="inbox", source_id=sid),
                }
            )
            result.queued_ids.extend(check.queued_ids)
    finally:
        if ids is None and not result.backoff and not result.cancelled:
            db.set_state(K_LAST_RUN, now_iso())
        if result.errors and not result.note and not result.backoff:
            result.note = f"{result.errors} Quelle(n) mit Fehler"
        if result.run_id is not None:
            db.finish_run(
                result.run_id, found=result.found, errors=result.errors, note=result.note or None
            )
        log.info(
            "Watchlist-Prüfung beendet: %d geprüft, %d neu, %d Fehler%s",
            result.checked,
            result.found,
            result.errors,
            f" · {result.note}" if result.note else "",
        )
    return result


def last_run(db: Database) -> datetime | None:
    """When the last complete watchlist check of all sources finished (UTC), or None."""
    raw = db.get_state(K_LAST_RUN)
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(raw)
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)
