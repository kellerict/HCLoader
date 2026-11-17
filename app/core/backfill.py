"""«Read everything (once)» per watchlist source (v0.4.0, docs/decisions.md «Alles einlesen»).

A normal watchlist check reads at most 200 of the newest entries. A *backfill* reads the whole
listing of a channel / playlist / SoundCloud user / set once, page by page (flat, cheap), up to
`watchlist.backfill_max_entries`. Search sources are never backfilled (a search returns at most
100 results anyway).

- Every page request goes through the throttle of the platform (`YtClient.list_source_paged`:
  backoff check, `watchlist.backfill_requests_per_hour` pacing, `sleep_requests` spacing,
  metadata lock per request). A 429 / bot check starts the backoff and interrupts the backfill.
- Results always go to the inbox - never into the download queue, even for `auto_download`
  sources. Filters, dedup (`source_videos`, video status) and festival detection work as for a
  normal check (`watchlist.Ingest`), so nothing is ever stored or loaded twice.
- Progress is persisted after every page (`backfills.position`, the resume cursor). Interrupted
  backfills (backoff, app closed, request budget of a headless run, network error) stay
  `pending` and continue automatically: at the next app start, after the next watchlist check
  (in-app interval or manual) and in headless runs (budget: one hour's worth of requests).
  A pause by the user (`paused`) waits for «Resume»; «Cancel» drops the cursor (hits already
  in the inbox stay).

Pure core logic: `client` is a `YtClient` or a fake with `list_source_paged`; nothing here
imports yt-dlp.
"""

from __future__ import annotations

import logging
import math
import threading
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from typing import Any

from . import platforms
from .config import Settings
from .db import Database, now_iso
from .discover import format_until
from .i18n import tr
from .redact import redact
from .throttle import BackoffActive, RequestBudgetSpent, WaitCancelled
from .watchlist import Ingest, SourceCheck

log = logging.getLogger(__name__)

STATES = ("pending", "running", "paused", "done", "cancelled")
OPEN = ("pending", "running")  # continue automatically
RESUMABLE = ("pending", "running", "paused")  # a cursor that «Resume» continues from
BACKFILL_TYPES = ("channel", "playlist")
MAX_FAILURES = 3  # errors in a row (not backoff) -> paused with the error as note
# entries per page request (yt-dlp 2026.10.x): YouTube channel tab ~30, playlist 100;
# SoundCloud user tracks 200 (API limit), set: stub tracks in batches of 50
PAGE_SIZE = {
    (platforms.YOUTUBE, "channel"): 30,
    (platforms.YOUTUBE, "playlist"): 100,
    (platforms.SOUNDCLOUD, "channel"): 200,
    (platforms.SOUNDCLOUD, "playlist"): 50,
}
# requests before the first entries arrive (YouTube: webpage; SoundCloud: client id + resolve)
OVERHEAD = {platforms.YOUTUBE: 1, platforms.SOUNDCLOUD: 3}

Progress = Callable[[dict[str, Any]], None]


@dataclass
class BackfillResult:
    source_id: int
    state: str = "pending"
    added: int = 0  # hits put into the inbox in this run
    found: int = 0  # new video rows in this run
    requests: int = 0
    position: int = 0
    backoff: bool = False
    budget_spent: bool = False
    cancelled: bool = False  # stopped by pause/cancel/app exit
    skipped: bool = False  # nothing done (not open, platform blocked, not eligible)
    error: str | None = None


# --------------------------------------------------------------------------- checks / views


def refusal(source: Mapping[str, Any] | None, settings: Settings) -> str | None:
    """Why this source cannot be backfilled (translated message), else None."""
    if source is None:
        return tr("api.source_gone")
    if source.get("type") not in BACKFILL_TYPES:
        return tr("backfill.search_refused")
    platform = source.get("platform") or platforms.YOUTUBE
    if platform == platforms.SOUNDCLOUD and not settings.soundcloud.enabled:
        return tr("sc.off")
    return None


def cap_of(settings: Settings) -> int:
    return int(settings.watchlist.backfill_max_entries)


def view(row: Mapping[str, Any] | None, settings: Settings) -> dict[str, Any] | None:
    """`Backfill` of the bridge contract (docs/bridge-api.md), None without a row."""
    if row is None:
        return None
    cap = cap_of(settings)
    total = row.get("total")
    return {
        "source_id": row["source_id"],
        "state": row["state"],
        "position": int(row.get("position") or 0),
        "total": total,
        "target": min(int(total), cap) if isinstance(total, int) else None,
        "cap": cap,
        "added": int(row.get("added") or 0),
        "found": int(row.get("found") or 0),
        "requests": int(row.get("requests") or 0),
        "note": row.get("note") or None,
        "started": row.get("started"),
        "updated": row.get("updated"),
        "finished": row.get("finished"),
    }


def estimate(source: Mapping[str, Any], db: Database, settings: Settings) -> dict[str, Any]:
    """Requests and time of a backfill, without network. Known size: `backfills.total` of an
    earlier attempt or `sources.item_count` from the last check; otherwise a conservative
    estimate for the full cap. A resume walks the already read pages again (counted)."""
    sid = int(source["id"])
    platform = source.get("platform") or platforms.YOUTUBE
    cap = cap_of(settings)
    row = db.get_backfill(sid)
    known = row.get("total") if row else None
    if not isinstance(known, int):
        known = source.get("item_count")
    known = known if isinstance(known, int) and known >= 0 else None
    entries = min(known, cap) if known is not None else cap
    page = PAGE_SIZE.get((platform, str(source.get("type"))), 30)
    requests = OVERHEAD.get(platform, 1) + max(1, math.ceil(entries / page))
    per_hour = int(settings.watchlist.backfill_requests_per_hour)
    interval = max(3600.0 / per_hour, float(settings.throttle_for(platform).sleep_requests))
    position = int(row["position"]) if row and row["state"] in RESUMABLE else 0
    return {
        "ok": True,
        "source_id": sid,
        "known_total": known,
        "entries": entries,
        "cap": cap,
        "requests": requests,
        "seconds": int(round(requests * interval)),
        "per_hour": per_hour,
        "page_size": page,
        "conservative": known is None,
        "position": position,
        "resume": position > 0,
    }


# --------------------------------------------------------------------------- state changes


def request(db: Database, source_id: int) -> dict[str, Any]:
    """Start (or resume) a backfill: a paused/pending one continues at its cursor, anything
    else (none, done, cancelled) starts from the beginning. Returns the row."""
    row = db.get_backfill(source_id)
    if row is not None and row["state"] in RESUMABLE:
        db.update_backfill(source_id, state="pending", failures=0, note=None)
    else:
        db.reset_backfill(source_id)
    return db.get_backfill(source_id) or {}


def pause(db: Database, source_id: int) -> bool:
    """User pause: stays at its cursor until «Resume» (no automatic continuation)."""
    return db.update_backfill(source_id, only_states=OPEN, state="paused", note=None)


def cancel(db: Database, source_id: int) -> bool:
    """Drop the cursor; hits already in the inbox stay."""
    return db.update_backfill(
        source_id, only_states=RESUMABLE, state="cancelled", position=0, finished=now_iso()
    )


def release_running(db: Database, note: str | None = None) -> None:
    """App exit while a backfill runs: back to `pending` (continues automatically)."""
    try:
        for row in db.list_backfills(("running",)):
            db.update_backfill(
                row["source_id"], only_states=("running",), state="pending", note=note
            )
    except Exception:
        log.debug("Backfill state not released", exc_info=True)


def open_ids(db: Database) -> list[int]:
    return [int(r["source_id"]) for r in db.list_backfills(OPEN)]


# --------------------------------------------------------------------------- run


def run(
    source: Mapping[str, Any],
    *,
    client: Any,
    db: Database,
    settings: Settings,
    cancel: threading.Event | None = None,
    on_progress: Progress | None = None,
    max_requests: int | None = None,
) -> BackfillResult:
    """Continue the open backfill of `source` until it is done or interrupted.

    The caller holds the backfill lock (one backfill at a time, across processes). The row
    must be `pending` (or a stale `running`); otherwise nothing happens (`skipped`)."""
    sid = int(source["id"])
    res = BackfillResult(sid)
    row = db.get_backfill(sid)
    if row is None or row["state"] not in OPEN:
        res.skipped = True
        res.state = row["state"] if row else "none"
        return res
    if not db.update_backfill(sid, only_states=OPEN, state="running", note=None):
        res.skipped = True
        return res
    start = int(row["position"] or 0)
    res.position = start
    counts = {"added": int(row["added"] or 0), "found": int(row["found"] or 0)}
    counts["requests"] = int(row["requests"] or 0)
    cap = cap_of(settings)

    def emit() -> None:
        if on_progress is None:
            return
        try:
            on_progress(view(db.get_backfill(sid), settings) or {"source_id": sid, "state": "none"})
        except Exception:
            log.debug("backfill event failed", exc_info=True)

    def on_request() -> None:
        res.requests += 1

    def on_info(listing: Any) -> None:
        total = getattr(listing, "total", None)
        if isinstance(total, int) and total >= 0:
            db.update_backfill(sid, only_states=("running",), total=total)
            db.update_source(sid, item_count=total)

    def on_entries(batch: list[dict[str, Any]], position: int) -> None:
        check = SourceCheck(sid)
        ing = Ingest(source, db=db, settings=settings, res=check, auto=False)  # inbox only
        ing.walk(batch)
        ing.finish(batch)
        res.added += check.inbox
        res.found += check.new
        res.position = position
        db.update_backfill(
            sid,
            only_states=("running",),
            position=position,
            added=counts["added"] + res.added,
            found=counts["found"] + res.found,
            requests=counts["requests"] + res.requests,
            failures=0,
        )
        emit()

    log.info(
        tr("backfill.started", name=source.get("name"), cap=cap)
        if start == 0
        else tr("backfill.resumed", name=source.get("name"), n=start)
    )
    emit()
    platform = source.get("platform") or platforms.YOUTUBE
    note: str | None = None
    final = "pending"
    fields: dict[str, Any] = {}
    try:
        listing = client.list_source_paged(
            source["url_or_query"],
            start=start,
            limit=cap,
            on_entries=on_entries,
            on_info=on_info,
            on_request=on_request,
            requests_per_hour=int(settings.watchlist.backfill_requests_per_hour),
            max_requests=max_requests,
            cancel_event=cancel,
        )
    except WaitCancelled:
        res.cancelled = True
        note = tr("backfill.note_interrupted")
    except RequestBudgetSpent:
        res.budget_spent = True
        note = tr("backfill.note_budget")
    except Exception as exc:
        if isinstance(exc, BackoffActive) or getattr(exc, "rate_limited", False):
            res.backoff = True
            until = getattr(exc, "until", None)
            if until is None and hasattr(client, "throttle"):
                th = client.throttle
                th = th.platform(platform) if hasattr(th, "platform") else th
                until = th.backoff_until()
            note = tr(
                "backfill.note_backoff",
                platform=platforms.label(platform),
                until=format_until(until) if until else "?",
            )
        else:
            res.error = str(redact(exc) or exc.__class__.__name__)[:300]
            failures = int((db.get_backfill(sid) or {}).get("failures") or 0) + 1
            fields["failures"] = failures
            note = tr("backfill.note_error", error=res.error)
            if failures >= MAX_FAILURES:
                final = "paused"
            log.debug("Backfill details", exc_info=True)
    else:
        final = "done"
        res.position = listing.position
        total = listing.total
        if total is None and listing.complete:
            total = listing.position
        fields.update(position=listing.position, finished=now_iso())
        if total is not None:
            fields["total"] = total
    res.state = final
    db.update_backfill(
        sid,
        only_states=("running",),
        state=final,
        note=note,
        requests=counts["requests"] + res.requests,
        **fields,
    )
    after = db.get_backfill(sid)
    if after is not None:
        res.state = after["state"]  # a pause/cancel of the user wins
    if res.state == "done":
        log.info(
            tr(
                "backfill.done",
                name=source.get("name"),
                n=res.position,
                added=counts["added"] + res.added,
            )
        )
    elif note:
        log.warning(tr("backfill.stopped", name=source.get("name"), note=note))
    emit()
    return res


def continue_open(
    *,
    client: Any,
    db: Database,
    throttle: Any,
    settings: Settings,
    ids: Sequence[int] | None = None,
    cancel_for: Callable[[int], threading.Event | None] | None = None,
    on_progress: Progress | None = None,
    max_requests: int | None = None,
    stop: threading.Event | None = None,
) -> list[BackfillResult]:
    """Run the open backfills one after the other (oldest first).

    `ids=None` (automatic continuation: app start, after a check, headless): every open one
    of an enabled source; sources of a platform in backoff are skipped without a request.
    `ids`: exactly these (a user's start, also for disabled sources). `max_requests`: budget
    over all of them (headless). `stop`: ends after the current source (app exit)."""
    rows = db.list_backfills(OPEN)
    if ids is not None:
        wanted = [int(i) for i in ids]
        rows = sorted(
            (r for r in rows if r["source_id"] in wanted),
            key=lambda r: wanted.index(r["source_id"]),
        )
    out: list[BackfillResult] = []
    spent = 0
    for row in rows:
        if stop is not None and stop.is_set():
            break
        sid = int(row["source_id"])
        source = db.get_source(sid)
        if source is None:
            continue
        reason = refusal(source, settings)
        if reason or (ids is None and not source.get("enabled")):
            out.append(BackfillResult(sid, state=row["state"], skipped=True, error=reason))
            continue
        platform = source.get("platform") or platforms.YOUTUBE
        th = throttle.platform(platform) if hasattr(throttle, "platform") else throttle
        until = th.backoff_until() if th is not None else None
        if until is not None:
            note = tr(
                "backfill.note_backoff",
                platform=platforms.label(platform),
                until=format_until(until),
            )
            db.update_backfill(sid, only_states=OPEN, state="pending", note=note)
            if on_progress is not None:
                on_progress(view(db.get_backfill(sid), settings) or {})
            out.append(BackfillResult(sid, skipped=True, backoff=True))
            continue
        budget = None if max_requests is None else max(0, max_requests - spent)
        if budget == 0:
            break
        res = run(
            source,
            client=client,
            db=db,
            settings=settings,
            cancel=cancel_for(sid) if cancel_for else None,
            on_progress=on_progress,
            max_requests=budget,
        )
        spent += res.requests
        out.append(res)
        if res.budget_spent:
            break
        if res.cancelled and stop is not None and stop.is_set():
            break
    return out
