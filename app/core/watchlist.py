"""Watchlist (SPEC §3.2): incremental source checks, filter, inbox / auto-download.

Pure core logic: `client` is a `YtClient` (or a fake with `list_source`/`search`), so nothing here
imports yt-dlp. Every request goes through the client and therefore through the throttle.

Per source the flat listing (newest first; playlists with `newest_last` are read from the end,
reversed) is walked in order and stops at the first video that *this source* has already seen
(table `source_videos`, Review Phase 4 M1; SPEC §3.2 `break_on_existing`). Videos known only from
a search or another source are skipped without stopping; if they are still `new` they are
evaluated for this source. The very first check of a source never stops early. New videos are
stored with the genre of the source (or keyword detection); those that pass the filters land in
the inbox (or in the download queue for `auto_download` sources), the others stay `new` and are
not shown in the inbox. Upcoming premieres / running livestreams are not remembered, so they are
evaluated again at the next check. A 429 / bot check (backoff) aborts the whole run.
"""

from __future__ import annotations

import logging
import re
import threading
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

from . import duplicates, filters, platforms
from .config import UNSORTED, Settings
from .db import Database, now_iso
from .discover import format_until
from .genre import detect_genre
from .redact import redact
from .throttle import BackoffActive, LimitReached, WaitCancelled

log = logging.getLogger(__name__)

SOURCE_TYPES = ("channel", "playlist", "search")
K_LAST_RUN = "watchlist_last_run"
# m2: a full check (GUI or headless) is running since (ISO UTC); deleted at its end
K_RUNNING_SINCE = "watchlist_running_since"
# m3: a full check without any successful source -> retry at this time (ISO UTC)
K_RETRY_AT = "watchlist_retry_at"
K_RETRY_COUNT = "watchlist_retry_count"
RETRY_AFTER = timedelta(hours=1)
RETRY_MAX = timedelta(hours=24)


def retry_delay(failures: int) -> timedelta:
    """Review P4 R2-m1: escalate retries after fully failed checks (1 h, 2 h, 4 h ... max 24 h),
    so a permanent error (deleted playlist, unrecognised block) costs at most a few checks a day."""
    return min(RETRY_AFTER * (2 ** max(0, failures - 1)), RETRY_MAX)


# a running-marker older than this is stale (crashed process; task limit is 6 h)
RUNNING_STALE = timedelta(hours=6)
MAX_ENTRIES = 200
MAX_SEARCH_ENTRIES = 100  # SPEC §3.1: a search returns at most 100 results
SKIP_LIVE_STATUS = ("is_upcoming", "is_live")
MAX_NAME_LENGTH = 120
MAX_QUERY_LENGTH = 300
MAX_URL_LENGTH = 500

_CHANNEL_PATH_RE = re.compile(
    r"^/(?:@[^/?#\s]+|channel/[^/?#\s]+|c/[^/?#\s]+|user/[^/?#\s]+)"
    r"(?:/(?:videos|streams))?/?$"
)
_YT_HOSTS = ("youtube.com", "www.youtube.com", "m.youtube.com")
# SoundCloud (Phase 7a): user root, /tracks or /sets/<set>. Paths that are no user (discover,
# search …) are refused like single tracks (soundcloud.com/<user>/<track>).
_SC_RESERVED = {
    "discover",
    "search",
    "stream",
    "you",
    "charts",
    "upload",
    "pages",
    "settings",
    "messages",
    "notifications",
    "people",
    "stations",
    "terms-of-use",
    "mobile",
    "signin",
    "logout",
    "jobs",
    "imprint",
    "popular",
    "tags",
}
_SC_NAME_RE = r"[A-Za-z0-9_-]+"
_SC_USER_PATH_RE = re.compile(rf"^/({_SC_NAME_RE})(?:/(tracks))?/?$")
_SC_SET_PATH_RE = re.compile(rf"^/({_SC_NAME_RE})/sets/([A-Za-z0-9_:-]+)/?$")
UNSUPPORTED_URL = (
    "Nicht unterstützte URL – erwartet wird eine YouTube-URL (Kanal, Playlist) oder eine "
    "SoundCloud-URL (soundcloud.com/<nutzer>, …/<nutzer>/tracks, …/<nutzer>/sets/<set>)."
)

SourceEvent = Callable[[dict[str, Any]], None]
Enqueue = Callable[[list[str]], list[str]]


# --------------------------------------------------------------------------- validation


def soundcloud_parts(parsed: Any) -> tuple[str, str | None] | None:
    """(kind, set) of a parsed SoundCloud URL: ('user', None) / ('set', slug); None = other."""
    path = parsed.path or "/"
    m = _SC_SET_PATH_RE.match(path)
    if m and m.group(1).lower() not in _SC_RESERVED:
        return "set", m.group(2)
    m = _SC_USER_PATH_RE.match(path)
    if m and m.group(1).lower() not in _SC_RESERVED:
        return "user", None
    return None


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
    platform = platforms.YOUTUBE
    if stype == "search":
        target = re.sub(r"\s+", " ", target)
        platform = str(data.get("platform") or platforms.YOUTUBE)
        if not platforms.valid(platform):
            errors["platform"] = "Plattform muss YouTube oder SoundCloud sein."
        if not target:
            errors["url_or_query"] = "Suchbegriff fehlt."
        elif len(target) > MAX_QUERY_LENGTH:
            errors["url_or_query"] = f"Suchbegriff ist zu lang (max. {MAX_QUERY_LENGTH} Zeichen)."
    elif stype in ("channel", "playlist"):
        if not target:
            errors["url_or_query"] = "URL fehlt."
        elif len(target) > MAX_URL_LENGTH:
            errors["url_or_query"] = "URL ist zu lang."
        elif platforms.url_platform(target) == platforms.SOUNDCLOUD:
            platform = platforms.SOUNDCLOUD
            err = _soundcloud_error(target, stype)
            if err:
                errors["url_or_query"] = err
        elif platforms.url_platform(target) is None and target.lower().startswith(
            ("http://", "https://")
        ):
            errors["url_or_query"] = UNSUPPORTED_URL
        else:
            parsed, err = _youtube_url(target)
            if err:
                errors["url_or_query"] = err
            elif stype == "channel" and not _CHANNEL_PATH_RE.match(parsed.path):
                errors["url_or_query"] = (
                    "Kanal-URL erwartet (…/@name, …/channel/ID, …/c/name oder …/user/name; "
                    "optional /videos oder /streams)."
                )
            elif stype == "playlist" and not parse_qs(parsed.query).get("list"):
                errors["url_or_query"] = "Playlist-URL erwartet (…/playlist?list=ID)."
    elif not target:
        errors["url_or_query"] = "URL oder Suchbegriff fehlt."

    # n7: empty = "use the default" (schedule.entries_per_source at check time), stored as NULL
    raw_max = data.get("max_entries")
    upper = MAX_SEARCH_ENTRIES if stype == "search" else MAX_ENTRIES
    max_entries: int | None = None
    if raw_max not in (None, ""):
        try:
            if isinstance(raw_max, bool) or int(raw_max) != float(raw_max):
                raise ValueError
            max_entries = int(raw_max)
            if not 1 <= max_entries <= upper:
                raise ValueError
        except (TypeError, ValueError):
            errors["max_entries"] = f"Wert muss eine ganze Zahl zwischen 1 und {upper} sein."

    if platform == platforms.SOUNDCLOUD and not settings.soundcloud.enabled:
        errors.setdefault(
            "url_or_query", "SoundCloud ist ausgeschaltet (Einstellungen › SoundCloud)."
        )

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
                and (other.get("platform") or platforms.YOUTUBE) == platform
                and _same_target(str(other["url_or_query"]), target, platform)
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
        # only meaningful for playlists (they append new videos at the end); forced off otherwise
        "newest_last": stype == "playlist" and bool(data.get("newest_last", False)),
        "platform": platform,
        "name_auto": bool(data.get("name_auto", False)),
    }, {}


def _soundcloud_error(target: str, stype: str) -> str | None:
    try:
        parsed = urlparse(target)
    except ValueError:
        return "Ungültige URL."
    if parsed.scheme not in ("http", "https"):
        return "SoundCloud-URL erwartet (https://soundcloud.com/…)."
    kind = soundcloud_parts(parsed)
    if kind is None:
        return (
            "Nicht unterstützte SoundCloud-URL. Erlaubt: soundcloud.com/<nutzer>, "
            "…/<nutzer>/tracks oder …/<nutzer>/sets/<set> (einzelne Tracks sind keine Quelle)."
        )
    if stype == "channel" and kind[0] != "user":
        return "Für ein Set den Typ «Playlist» wählen (…/<nutzer>/sets/<set>)."
    if stype == "playlist" and kind[0] != "set":
        return "SoundCloud-Playlist-URL erwartet (…/<nutzer>/sets/<set>)."
    return None


def _same_target(a: str, b: str, platform: str) -> bool:
    def key(text: str) -> str:
        text = text.strip().rstrip("/").lower()
        if platform == platforms.SOUNDCLOUD:
            text = re.sub(r"^https?://(?:www\.|m\.)?", "", text)
            text = re.sub(r"/tracks$", "", text)
        return text

    return key(a) == key(b)


# --------------------------------------------------------------------------- name suggestion


def _humanize(slug: str) -> str:
    """SoundCloud slug -> name: `-`/`_` to spaces; all-lowercase slugs get title case
    («dj-thera» -> «Dj Thera»), mixed case stays («DJ-Thera» -> «DJ Thera»)."""
    text = re.sub(r"[-_]+", " ", unquote(slug)).strip()
    text = re.sub(r"\s+", " ", text)
    if text and text == text.lower() and any(c.isalpha() for c in text):
        text = " ".join(w[:1].upper() + w[1:] for w in text.split(" "))
    return text


def suggest_source(url_or_query: str, type_hint: str | None = None) -> dict[str, Any]:
    """Name/type/platform suggestion for a new source, **without network** (URL only).

    Returns {type, platform, name, url_normalized}. type '' = not recognised (no URL of a
    supported kind); name '' = no good name from the URL (e.g. /channel/UC…, playlists):
    the first check then fills in the real name (`name_auto`).
    Search (anything that is no URL, or type_hint 'search'): the query itself.
    """
    text = re.sub(r"\s+", " ", str(url_or_query or "")).strip()
    out = {"type": "", "platform": platforms.YOUTUBE, "name": "", "url_normalized": ""}
    looks_url = bool(
        re.match(r"^(https?://|www\.|m\.|youtube\.com|soundcloud\.com|youtu\.be)", text, re.I)
    )
    if not text:
        out["type"] = type_hint or ""
        return out
    if type_hint == "search" or not looks_url:
        out.update(type="search", name=text[:MAX_NAME_LENGTH], url_normalized=text)
        return out
    url = text if re.match(r"^https?://", text, re.I) else f"https://{text}"
    try:
        parsed = urlparse(url)
    except ValueError:
        return out
    platform = platforms.url_platform(url)
    if platform == platforms.SOUNDCLOUD:
        out["platform"] = platforms.SOUNDCLOUD
        kind = soundcloud_parts(parsed)
        if kind is None:
            return out
        user = parsed.path.strip("/").split("/")[0]
        if kind[0] == "set":
            out.update(
                type="playlist",
                name=f"{_humanize(user)} – {_humanize(kind[1] or '')}"[:MAX_NAME_LENGTH],
                url_normalized=f"https://soundcloud.com/{user}/sets/{kind[1]}",
            )
        else:
            out.update(
                type="channel",
                name=_humanize(user)[:MAX_NAME_LENGTH],
                url_normalized=f"https://soundcloud.com/{user}",
            )
        return out
    if platform != platforms.YOUTUBE:
        return out
    path = parsed.path or "/"
    lst = parse_qs(parsed.query).get("list")
    if lst and (path.startswith("/playlist") or path.startswith("/watch")):
        out.update(
            type="playlist", url_normalized=f"https://www.youtube.com/playlist?list={lst[0]}"
        )
        return out
    m = re.match(r"^/(@[^/?#\s]+|channel/[^/?#\s]+|c/[^/?#\s]+|user/[^/?#\s]+)", path)
    if not m:
        return out
    part = m.group(1)
    if part.startswith("@"):
        name = unquote(part[1:])
    elif part.startswith("channel/"):
        name = ""  # UC… ids are no names: the first check fills in the real one
    else:
        name = unquote(part.split("/", 1)[1])
    out.update(
        type="channel",
        name=name[:MAX_NAME_LENGTH],
        url_normalized=f"https://www.youtube.com/{part}",
    )
    return out


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
    seen: int = 0  # entries looked at (up to the first one this source has seen)
    adopted: int = 0  # known from a search/other source, still 'new', now passing (M1)
    skipped_live: int = 0  # upcoming premieres / running livestreams (n8, not remembered)
    duplicates: int = 0  # new and passing, but probably loaded from the other platform (7a)
    name: str | None = None  # new name (name_auto: real channel/uploader name of the listing)
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
    # Review m5: platforms with at least one successfully checked source / with a backoff
    checked_platforms: set[str] = field(default_factory=set)
    backoff_platforms: set[str] = field(default_factory=set)

    def ok_platforms(self) -> list[str]:
        """Platforms checked successfully without a backoff in this run (backoff reset)."""
        return sorted(self.checked_platforms - self.backoff_platforms)


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
        "platform": entry.get("platform") or platforms.platform_of(entry["id"]),
        "url": entry.get("url") or None,
        "channel_url": entry.get("channel_url") or None,
        "preview": bool(entry.get("preview")),
        "geo_blocked": bool(entry.get("geo_blocked")),
    }


def effective_max_entries(source: Mapping[str, Any], settings: Settings) -> int:
    """`max_entries` of a source; NULL = `schedule.entries_per_source` (n7). Searches are capped
    at 100 (SPEC §3.1), everything else at 200 (m4)."""
    n = int(source.get("max_entries") or settings.schedule.entries_per_source)
    cap = MAX_SEARCH_ENTRIES if source.get("type") == "search" else MAX_ENTRIES
    return max(1, min(n, cap))


def check_source(
    source: Mapping[str, Any],
    *,
    client: Any,
    db: Database,
    settings: Settings,
    enqueue: Enqueue | None = None,
    cancel: threading.Event | None = None,
) -> SourceCheck:
    """Check one source (a DB row). Raises on request errors (the caller decides); see
    `check_all` for the error handling. Marks the source as checked and returns the counts.

    Channel/playlist: stop at the first video *this source* has already seen (M1), except on
    the very first check of the source (`last_checked` empty: `max_entries` is the only limit).
    Search: relevance order is not chronological, so seen videos are skipped (no stop).
    Videos known only from a search or another source never stop the check; if they are still
    `new` and pass the filters, they go to the inbox (or the queue) for this source.
    """
    sid = int(source["id"])
    stype = source["type"]
    max_entries = effective_max_entries(source, settings)
    target = source["url_or_query"]
    kwargs: dict[str, Any] = {"cancel_event": cancel} if cancel is not None else {}
    platform = source.get("platform") or platforms.YOUTUBE
    if stype == "search":
        if platform != platforms.YOUTUBE:
            kwargs["platform"] = platform
        entries = client.search(target, max_entries, **kwargs)
    elif source.get("newest_last") and stype == "playlist":
        entries = client.list_source(target, max_entries, newest_last=True, **kwargs)
    else:
        entries = client.list_source(target, max_entries, **kwargs)

    res = SourceCheck(sid)
    genre_names = {g.name for g in settings.genres.items}
    default = source.get("default_genre") or None
    if default not in genre_names or default == UNSORTED:
        default = None
    auto = bool(source.get("auto_download")) and enqueue is not None
    incremental = stype != "search" and bool(source.get("last_checked"))
    blacklist = db.blacklist_ids()
    hide_dups = settings.filters.hide_cross_platform_duplicates
    to_queue: list[str] = []
    _maybe_rename(source, entries, db, res)
    for entry in entries:
        vid = entry.get("id")
        if not vid:
            continue
        res.seen += 1
        if entry.get("live_status") in SKIP_LIVE_STATUS:
            # n8: duration unknown before the broadcast - evaluate again at the next check
            res.skipped_live += 1
            continue
        if db.source_has_seen(sid, vid):
            if incremental:
                break  # everything after this one was seen in an earlier check of this source
            continue
        existing = db.get_video(vid)
        ok, _reason = filters.passes(entry, settings.filters, status=None, blacklist=blacklist)
        # 7a: probably the same mix from the other platform -> never automatically loaded
        dup = duplicates.find_duplicate(db, entry) if ok else None
        if dup and hide_dups:
            ok = False
        if existing is None:
            genre = detect_genre(entry.get("title"), settings.genres.items, source_default=default)
            # n6: auto-download rows start in the inbox (visible if the process ends before
            # they are enqueued below); rejected ones stay 'new' (not in the inbox)
            with db.transaction():
                db.upsert_video(_entry_row(entry, sid, genre, "inbox" if ok else "new"))
                db.link_source_video(sid, vid)
            res.new += 1
            if dup:
                res.duplicates += 1
                log.info(
                    "Vermutlich bereits geladen (%s): %s",
                    platforms.label(dup["platform"]),
                    entry.get("title"),
                )
            if not ok:
                res.filtered += 1
            elif auto and not dup:
                to_queue.append(vid)
            else:
                res.inbox += 1
            continue
        # M1: known from a search or another source - never a reason to stop
        promote = ok and existing["status"] == "new"
        genre = (
            detect_genre(entry.get("title"), settings.genres.items, source_default=default)
            if promote
            else None
        )
        with db.transaction():
            db.upsert_video(_entry_row(entry, sid, genre, existing["status"]))
            db.link_source_video(sid, vid)
            if promote:
                db.set_status(vid, "inbox")
        if promote:
            res.adopted += 1
            if auto and not dup:
                to_queue.append(vid)
            else:
                res.inbox += 1
    if to_queue:
        accepted = enqueue(to_queue) if enqueue else []
        res.queued = len(accepted)
        res.queued_ids = list(accepted)
        res.inbox += len([v for v in to_queue if v not in accepted])  # stay in the inbox
    db.mark_source_checked(sid)
    log.info(
        "Quelle «%s»: %d neu (%d im Eingang, %d in der Warteschlange, %d gefiltert)%s",
        source.get("name"),
        res.new,
        res.inbox,
        res.queued,
        res.filtered,
        f" · {res.adopted} schon bekannt übernommen" if res.adopted else "",
    )
    return res


def _maybe_rename(source: Mapping[str, Any], entries: Any, db: Database, res: SourceCheck) -> None:
    """`name_auto`: replace the suggested name by the channel/uploader/playlist name the flat
    listing already reported (`SourceListing.source_name`; no extra request). Searches keep
    their query as name."""
    if not source.get("name_auto") or source.get("type") == "search":
        return
    name = re.sub(r"\s+", " ", str(getattr(entries, "source_name", "") or "")).strip()
    name = name[:MAX_NAME_LENGTH]
    if name and name != source.get("name"):
        db.update_source(int(source["id"]), name=name)
        res.name = name
        log.info("Quelle «%s» heisst jetzt «%s»", source.get("name"), name)


def active_platforms(db: Database, settings: Settings | None = None) -> set[str]:
    """Platforms with an enabled source; SoundCloud only while `soundcloud.enabled` (its
    sources are skipped otherwise, Review m5). Without sources: {YouTube}."""
    names = set(db.source_platforms())
    if settings is not None and not settings.soundcloud.enabled:
        names.discard(platforms.SOUNDCLOUD)
    return names or {platforms.YOUTUBE}


def blocked_until(db: Database, throttle: Any, settings: Settings | None = None) -> datetime | None:
    """Phase 7a: a watchlist check is blocked only if *every* active platform with an enabled
    source is in backoff (`active_platforms`); then the earliest end, else None. Without
    sources: the YouTube backoff."""
    if throttle is None:
        return None
    names = active_platforms(db, settings)
    untils = []
    for name in sorted(names):
        th = throttle.platform(name) if hasattr(throttle, "platform") else throttle
        until = th.backoff_until()
        if until is None:
            return None
        untils.append(until)
    return min(untils) if untils else None


def _platform_throttle(throttle: Any, platform: str) -> Any:
    if throttle is None:
        return None
    return throttle.platform(platform) if hasattr(throttle, "platform") else throttle


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
    if ids is None:  # m2: other processes see that a full check is running
        db.set_state(K_RUNNING_SINCE, now_iso())
    log.info("Watchlist-Prüfung gestartet · %d Quelle(n)", len(sources))

    def emit(payload: dict[str, Any]) -> None:
        if on_source:
            try:
                on_source(payload)
            except Exception:
                log.debug("source-Event fehlgeschlagen", exc_info=True)

    blocked: set[str] = set()  # 7a: platforms in backoff - their sources are skipped
    try:
        for source in sources:
            if cancel is not None and cancel.is_set():
                result.cancelled = True
                result.note = "Abgebrochen"
                break
            sid = source["id"]
            platform = source.get("platform") or platforms.YOUTUBE
            if platform == platforms.SOUNDCLOUD and not settings.soundcloud.enabled:
                log.info("Quelle «%s» übersprungen: SoundCloud ist ausgeschaltet", source["name"])
                emit({"id": sid, "checking": False, "error": "SoundCloud ist ausgeschaltet"})
                continue
            pth = _platform_throttle(throttle, platform)
            if platform in blocked:  # the first source of this platform hit the backoff
                label = platforms.label(platform)
                emit(
                    {
                        "id": sid,
                        "checking": False,
                        "name": source.get("name"),
                        "error": f"{label} blockiert gerade (Backoff) – nicht geprüft",
                    }
                )
                continue
            emit({"id": sid, "checking": True})
            try:
                check = check_source(
                    source, client=client, db=db, settings=settings, enqueue=enqueue, cancel=cancel
                )
            except WaitCancelled:  # n5: app is closing (cancel reached the throttle wait)
                result.cancelled = True
                result.note = "Abgebrochen"
                emit({"id": sid, "checking": False})
                break
            except Exception as exc:
                check = SourceCheck(sid)
                if _is_rate_limited(exc):
                    check.backoff = True
                    label = platforms.label(platform)
                    check.error = f"{label} blockiert gerade (429/Bot-Prüfung)"
                    result.backoff = True
                    result.backoff_platforms.add(platform)
                    blocked.add(platform)
                    note = _backoff_note(pth, exc)
                    result.note = result.note or note
                    log.error("Watchlist: %s-Quellen werden übersprungen: %s", label, note)
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
                        "name": fresh.get("name"),
                        "last_checked": fresh.get("last_checked"),
                        "new_count": db.count_videos(status="inbox", source_id=sid),
                        "error": check.error,
                    }
                )
                continue
            result.checked += 1
            result.checked_platforms.add(platform)
            result.found += check.new
            result.inbox += check.inbox
            result.queued += check.queued
            result.sources.append(check)
            fresh = db.get_source(sid) or source
            emit(
                {
                    "id": sid,
                    "checking": False,
                    "name": fresh.get("name"),
                    "last_checked": fresh.get("last_checked"),
                    "new_count": db.count_videos(status="inbox", source_id=sid),
                }
            )
            result.queued_ids.extend(check.queued_ids)
    finally:
        if ids is None:
            _finish_full_run(db, result)
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


def _finish_full_run(db: Database, result: WatchlistResult) -> None:
    """m2/m3: clear the running marker; `last_run` only after at least one successful source,
    otherwise (all failed, no backoff) retry in an hour. Backoff/cancel: neither."""
    try:
        db.delete_state(K_RUNNING_SINCE)
        if result.backoff or result.cancelled:
            return
        if result.checked > 0:
            db.set_state(K_LAST_RUN, now_iso())
            db.delete_state(K_RETRY_AT)
            db.delete_state(K_RETRY_COUNT)
        elif result.errors:
            failures = int(db.get_state(K_RETRY_COUNT, "0") or 0) + 1
            db.set_state(K_RETRY_COUNT, failures)
            retry = datetime.now(UTC) + retry_delay(failures)
            db.set_state(K_RETRY_AT, retry.isoformat(timespec="seconds"))
            log.warning(
                "Keine Quelle erfolgreich geprüft – neuer Versuch um %s", format_until(retry)
            )
    except Exception:
        log.debug("Watchlist-Status nicht gespeichert", exc_info=True)


def close_interrupted(db: Database, note: str) -> None:
    """n5: the app closes while a check hangs in a request - finish its open `watchlist` run
    entry and drop the running marker (the check thread may not reach its `finally`)."""
    try:
        db.execute(
            "UPDATE runs SET finished=?, note=COALESCE(note, ?) "
            "WHERE kind='watchlist' AND finished IS NULL",
            (now_iso(), note),
        )
        db.delete_state(K_RUNNING_SINCE)
    except Exception:
        log.debug("Watchlist-Lauf nicht abgeschlossen", exc_info=True)


def _state_time(db: Database, key: str) -> datetime | None:
    raw = db.get_state(key)
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(raw)
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)


def retry_at(db: Database) -> datetime | None:
    """m3: when a full check that failed for every source is retried (UTC), or None."""
    return _state_time(db, K_RETRY_AT)


def running_since(db: Database, now: datetime | None = None) -> datetime | None:
    """m2: start of a full check that is running right now (any process), None if none or if
    the marker is stale (older than 6 h: crashed process)."""
    since = _state_time(db, K_RUNNING_SINCE)
    now = now or datetime.now(UTC)
    if since is None or now - since > RUNNING_STALE:
        return None
    return since


def last_run(db: Database) -> datetime | None:
    """When the last complete watchlist check of all sources finished (UTC), or None."""
    return _state_time(db, K_LAST_RUN)
