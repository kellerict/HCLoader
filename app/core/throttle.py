"""Central throttle (SPEC §5): request pacing, hourly/daily limits and persistent backoff.

Every network access (search, list, resolve, download) must go through this class.
State and counters live in the DB table `state`, so they survive restarts. Clock, sleep and
random source are injectable for tests.
"""

from __future__ import annotations

import json
import logging
import random
import re
import threading
import time
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

from .db import Database

log = logging.getLogger(__name__)

K_BACKOFF_UNTIL = "backoff_until"
K_BACKOFF_LEVEL = "backoff_level"
K_BACKOFF_REASON = "backoff_reason"
K_SEARCH_TIMES = "search_times"
K_DL_DAY = "downloads_day"
K_DL_TODAY = "downloads_today"
K_DL_RUN = "downloads_run"
K_LAST_DL_END = "last_download_end"

_RATE_LIMIT_PATTERNS = [
    re.compile(r"http error 429", re.I),
    re.compile(r"too many requests", re.I),
    re.compile(r"sign in to confirm you.{0,3}re not a bot", re.I),
    re.compile(r"confirm you.{0,3}re not a bot", re.I),
    re.compile(r"\bnot a bot\b", re.I),
]


def is_rate_limit_error(message: object) -> bool:
    """True for HTTP 429 / 'confirm you're not a bot' style YouTube errors."""
    text = str(message or "")
    return any(p.search(text) for p in _RATE_LIMIT_PATTERNS)


class ThrottleError(Exception):
    """Base class for throttle refusals."""


class BackoffActive(ThrottleError):
    def __init__(self, until: datetime, reason: str = "") -> None:
        self.until = until
        self.reason = reason
        super().__init__(f"Backoff aktiv bis {until.astimezone():%Y-%m-%d %H:%M}")


class WaitCancelled(Exception):
    """A pause inside the throttle was aborted through the caller's cancel event."""


class LimitReached(ThrottleError):
    """kind: 'searches_per_hour' | 'downloads_per_run' | 'downloads_per_day'."""

    def __init__(self, kind: str, limit: int) -> None:
        self.kind = kind
        self.limit = limit
        names = {
            "searches_per_hour": "Suchen pro Stunde",
            "downloads_per_run": "Downloads pro Lauf",
            "downloads_per_day": "Downloads pro Tag",
        }
        super().__init__(f"Limit erreicht: {names.get(kind, kind)} ({limit})")


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Throttle:
    """`settings` is a ThrottleSettings object or a zero-arg callable returning the current one."""

    def __init__(
        self,
        db: Database,
        settings: Any,
        *,
        clock: Callable[[], datetime] = _utcnow,
        sleep: Callable[[float], None] = time.sleep,
        uniform: Callable[[float, float], float] = random.uniform,
    ) -> None:
        self.db = db
        self._settings = settings
        self._clock = clock
        self._sleep = sleep
        self._uniform = uniform
        self._last_request: datetime | None = None
        # Guards read-modify-write sequences (counters, backoff, request spacing). Re-entrant:
        # public methods call each other. Held across the request sleep on purpose, so requests
        # of different threads run serially with the configured spacing.
        self._lock = threading.RLock()
        # Serialises the (long) pause between downloads without blocking searches meanwhile.
        self._dl_lock = threading.Lock()
        self._default_sleep = sleep is time.sleep

    @property
    def cfg(self) -> Any:
        return self._settings() if callable(self._settings) else self._settings

    def _now(self) -> datetime:
        return self._clock()

    # ------------------------------------------------------------------ backoff

    def backoff_until(self) -> datetime | None:
        """End of the active backoff, or None if there is none (or it has expired)."""
        raw = self.db.get_state(K_BACKOFF_UNTIL)
        if not raw:
            return None
        try:
            until = datetime.fromisoformat(raw)
        except ValueError:
            return None
        return until if until > self._now() else None

    def backoff_remaining(self) -> timedelta:
        until = self.backoff_until()
        return (until - self._now()) if until else timedelta(0)

    def backoff_level(self) -> int:
        return int(self.db.get_state(K_BACKOFF_LEVEL, "0") or 0)

    def check_backoff(self) -> None:
        until = self.backoff_until()
        if until:
            raise BackoffActive(until, self.db.get_state(K_BACKOFF_REASON, "") or "")

    def trigger_backoff(self, reason: str = "") -> datetime:
        """Start (or escalate) the backoff: initial hours, doubling up to the cap.

        Triggering while a backoff is already active does not escalate further.
        """
        with self._lock:
            active = self.backoff_until()
            if active:
                return active
            cfg = self.cfg
            level = self.backoff_level() + 1
            hours = min(cfg.backoff_initial_hours * 2 ** (level - 1), cfg.backoff_max_hours)
            until = self._now() + timedelta(hours=hours)
            self.db.set_state(K_BACKOFF_LEVEL, level)
            self.db.set_state(K_BACKOFF_UNTIL, until.isoformat())
            self.db.set_state(K_BACKOFF_REASON, reason)
            log.error("YouTube-Sperre erkannt (%s): Pause bis %s (%.1f h)", reason, until, hours)
            return until

    def handle_error(self, message: object) -> bool:
        """Trigger backoff if `message` looks like a 429/bot-check. Returns True if it did."""
        if is_rate_limit_error(message):
            self.trigger_backoff(str(message)[:200])
            return True
        return False

    def reset_backoff(self) -> None:
        """After a successful run: clear backoff and reset the escalation level."""
        with self._lock:
            self.db.delete_state(K_BACKOFF_UNTIL)
            self.db.delete_state(K_BACKOFF_REASON)
            self.db.set_state(K_BACKOFF_LEVEL, 0)

    def finish_run(self, success: bool) -> None:
        """Call at the end of every run (GUI queue, headless, smoke).

        A successful run (at least one real download/request went through) resets the backoff
        escalation (SPEC §5); a failed one leaves the state untouched.
        """
        if success:
            self.reset_backoff()

    def clear_backoff_manual(self) -> None:
        """User override: lift the block but keep the level, so a repeat doubles again."""
        with self._lock:
            self.db.delete_state(K_BACKOFF_UNTIL)
            self.db.delete_state(K_BACKOFF_REASON)
        log.warning("Backoff manuell aufgehoben")

    # ------------------------------------------------------------------ requests

    def _search_times(self) -> list[float]:
        try:
            times = json.loads(self.db.get_state(K_SEARCH_TIMES, "[]") or "[]")
        except ValueError:
            times = []
        horizon = self._now().timestamp() - 3600
        return [t for t in times if isinstance(t, (int, float)) and t > horizon]

    def searches_last_hour(self) -> int:
        return len(self._search_times())

    def _wait(self, seconds: float, cancel_event: threading.Event | None) -> None:
        """Sleep `seconds` (injectable); abortable through `cancel_event` -> WaitCancelled."""
        if seconds > 0:
            if cancel_event is not None and self._default_sleep:
                cancel_event.wait(seconds)
            else:
                self._sleep(seconds)
        if cancel_event is not None and cancel_event.is_set():
            raise WaitCancelled

    def before_request(
        self,
        kind: str = "request",
        *,
        cancel_event: threading.Event | None = None,
        count_attempt: bool = False,
        retry: bool = False,
    ) -> None:
        """Call before every network request (kind: 'search', 'list', 'resolve', 'download').

        Raises BackoffActive / LimitReached; otherwise sleeps so that at least `sleep_requests`
        seconds lie between two requests. For kind 'download' it additionally enforces the
        random pause `sleep_interval`..`max_sleep_interval` since the end of the previous
        download (persisted, so it survives restarts) and, with `count_attempt=True`, counts the
        attempt against the run/day limits atomically with the limit check (failed attempts
        count, skipped videos never reach this point). `retry=True` marks the single network
        retry of an already counted attempt (backoff check and request spacing only).
        `cancel_event` aborts waiting (WaitCancelled).
        """
        if kind == "download" and not retry:
            self.check_download()
            with self._dl_lock:
                self._wait_between_downloads(cancel_event)
                self._request_slot(kind, cancel_event, count_attempt, limits=True)
        else:
            self._request_slot(kind, cancel_event, False, limits=False)

    def _request_slot(
        self,
        kind: str,
        cancel_event: threading.Event | None,
        count_attempt: bool,
        *,
        limits: bool,
    ) -> None:
        with self._lock:
            if limits:
                self.check_download()
            else:
                self.check_backoff()
            cfg = self.cfg
            if kind == "search":
                times = self._search_times()
                if len(times) >= cfg.max_searches_per_hour:
                    raise LimitReached("searches_per_hour", cfg.max_searches_per_hour)
                times.append(self._now().timestamp())
                self.db.set_state(K_SEARCH_TIMES, json.dumps(times))
            if self._last_request is not None and cfg.sleep_requests > 0:
                wait = cfg.sleep_requests - (self._now() - self._last_request).total_seconds()
                self._wait(wait, cancel_event)
            self._last_request = self._now()
            if count_attempt:
                self.register_download()

    def _wait_between_downloads(self, cancel_event: threading.Event | None) -> None:
        raw = self.db.get_state(K_LAST_DL_END)
        if not raw:
            return
        try:
            last_end = datetime.fromisoformat(raw)
        except ValueError:
            return
        pause = self.next_download_delay()
        wait = pause - (self._now() - last_end).total_seconds()
        if wait > 0:
            log.info("Pause zwischen Downloads: %.0f s", wait)
            self._wait(wait, cancel_event)

    def mark_download_end(self) -> None:
        """Record the end of a download attempt; the next one waits relative to it."""
        self.db.set_state(K_LAST_DL_END, self._now().isoformat())

    # ------------------------------------------------------------------ downloads

    def start_run(self) -> None:
        """Reset the per-run download counter."""
        with self._lock:
            self.db.set_state(K_DL_RUN, 0)

    def _day_key(self) -> str:
        return self._now().astimezone().date().isoformat()

    def downloads_today(self) -> int:
        if self.db.get_state(K_DL_DAY) != self._day_key():
            return 0
        return int(self.db.get_state(K_DL_TODAY, "0") or 0)

    def downloads_this_run(self) -> int:
        return int(self.db.get_state(K_DL_RUN, "0") or 0)

    def download_block(self) -> ThrottleError | None:
        """The reason downloads are currently refused (exception instance) or None."""
        until = self.backoff_until()
        if until:
            return BackoffActive(until, self.db.get_state(K_BACKOFF_REASON, "") or "")
        cfg = self.cfg
        if self.downloads_this_run() >= cfg.max_downloads_per_run:
            return LimitReached("downloads_per_run", cfg.max_downloads_per_run)
        if self.downloads_today() >= cfg.max_downloads_per_day:
            return LimitReached("downloads_per_day", cfg.max_downloads_per_day)
        return None

    def can_download(self) -> bool:
        return self.download_block() is None

    def check_download(self) -> None:
        block = self.download_block()
        if block:
            raise block

    def register_download(self) -> None:
        """Count one download attempt (successful or not) for the run and the day."""
        with self._lock:
            today = self._day_key()
            count = self.downloads_today() + 1
            self.db.set_state(K_DL_DAY, today)
            self.db.set_state(K_DL_TODAY, count)
            self.db.set_state(K_DL_RUN, self.downloads_this_run() + 1)

    def next_download_delay(self) -> float:
        cfg = self.cfg
        low, high = cfg.sleep_interval, max(cfg.sleep_interval, cfg.max_sleep_interval)
        return float(self._uniform(low, high)) if high > 0 else 0.0

    def limit_rate_bytes(self) -> int | None:
        """Download speed cap in bytes/s for yt-dlp (None = unlimited)."""
        mb = self.cfg.limit_rate_mb
        return int(mb * 1024 * 1024) if mb and mb > 0 else None

    # ------------------------------------------------------------------ status

    def status(self) -> dict[str, Any]:
        cfg = self.cfg
        until = self.backoff_until()
        return {
            "backoff_until": until.isoformat() if until else None,
            "backoff_remaining_s": int(self.backoff_remaining().total_seconds()),
            "backoff_reason": (self.db.get_state(K_BACKOFF_REASON, "") or "") if until else "",
            "backoff_level": self.backoff_level(),
            "searches_last_hour": self.searches_last_hour(),
            "max_searches_per_hour": cfg.max_searches_per_hour,
            "downloads_this_run": self.downloads_this_run(),
            "max_downloads_per_run": cfg.max_downloads_per_run,
            "downloads_today": self.downloads_today(),
            "max_downloads_per_day": cfg.max_downloads_per_day,
        }
