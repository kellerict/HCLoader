"""Status bar data (SPEC §3.6) in the shape `get_status()` returns to the UI (ui/js/bridge.js)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from . import binaries, maintenance, scheduler
from .config import Settings
from .db import Database
from .platforms import PLATFORMS
from .throttle import Throttle

QUEUE_STATUSES = ("queued", "downloading")


def next_check(
    settings: Settings,
    *,
    in_app_next: datetime | None = None,
    now: datetime | None = None,
) -> str | None:
    """Earliest planned watchlist check: the daily scheduled task (if enabled) and/or the
    in-app interval check (passed in by the running scheduler from Phase 4 on)."""
    candidates: list[datetime] = []
    sched = settings.schedule
    if sched.task_scheduler_enabled:
        try:
            candidates.append(scheduler.next_daily(sched.task_time, now))
        except scheduler.SchedulerError:
            pass
    if sched.in_app_check and in_app_next is not None:
        candidates.append(in_app_next.astimezone())
    return min(candidates).isoformat(timespec="seconds") if candidates else None


def build_status(
    settings: Settings,
    throttle: Throttle,
    db: Database,
    *,
    po_token: dict[str, Any],
    queue_paused: bool = False,
    in_app_next: datetime | None = None,
    bin_status: dict[str, Any] | None = None,
) -> dict[str, Any]:
    st = bin_status if bin_status is not None else binaries.status()
    th = throttle.status()
    level = th["backoff_level"]
    until = th["backoff_until"]
    return {
        "app_version": maintenance.app_version(),
        "ytdlp_version": st.get("yt_dlp_version"),
        "plugin_version": st.get("bgutil_version"),
        "deno_ok": bool(st.get("deno_ok")),
        "deno_version": st.get("deno_version"),
        "ffmpeg_ok": bool(st.get("ffmpeg_ok")),
        "ffmpeg_version": st.get("ffmpeg_version"),
        "po_token": {
            "state": po_token.get("state", "inactive"),
            "mode": po_token.get("mode", settings.network.po_token_mode),
            "detail": po_token.get("detail", ""),
        },
        "backoff": {
            "active": until is not None,
            "until": until,
            "level": level,
            "remaining_s": th["backoff_remaining_s"] if until else 0,
        },
        "next_check": next_check(settings, in_app_next=in_app_next),
        "queue_length": db.count_videos(status=list(QUEUE_STATUSES)),
        "queue_paused": bool(queue_paused),
        "inbox_count": db.count_videos(status="inbox"),
        "counters": {
            "downloads_run": th["downloads_this_run"],
            "downloads_day": th["downloads_today"],
            "searches_hour": th["searches_last_hour"],
        },
        # Phase 7a: per platform; `backoff`/`counters` above stay = YouTube (compatibility)
        "platforms": platform_status(settings, throttle),
    }


def _one(th: Any, enabled: bool) -> dict[str, Any]:
    st = th.status()
    until = st["backoff_until"]
    return {
        "enabled": bool(enabled),
        "backoff": {
            "active": until is not None,
            "until": until,
            "level": st["backoff_level"],
            "remaining_s": st["backoff_remaining_s"] if until else 0,
            "reason": st["backoff_reason"],
        },
        "counters": {
            "downloads_run": st["downloads_this_run"],
            "downloads_day": st["downloads_today"],
            "searches_hour": st["searches_last_hour"],
        },
        "limits": {
            "downloads_run": st["max_downloads_per_run"],
            "downloads_day": st["max_downloads_per_day"],
            "searches_hour": st["max_searches_per_hour"],
        },
    }


def platform_status(settings: Settings, throttle: Any) -> dict[str, Any]:
    """{youtube: {...}, soundcloud: {...}, mixcloud: {...}, hearthis: {...}} with backoff,
    counters and limits of each platform (v0.10.0: every platform of `platforms.PLATFORMS`)."""
    if not hasattr(throttle, "platform"):
        return {"youtube": _one(throttle, True)}
    return {p: _one(throttle.platform(p), settings.platform_enabled(p)) for p in PLATFORMS}
