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
        self.db.delete_state(K_BACKOFF_UNTIL)
        self.db.delete_state(K_BACKOFF_REASON)
        self.db.set_state(K_BACKOFF_LEVEL, 0)

    def clear_backoff_manual(self) -> None:
        """User override: lift the block but keep the level, so a repeat doubles again."""
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

    def before_request(self, kind: str = "request") -> None:
        """Call before every metadata request (kind: 'search', 'list', 'resolve', ...).

        Raises BackoffActive / LimitReached; otherwise sleeps so that at least
        `sleep_requests` seconds lie between two requests.
        """
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
            if wait > 0:
                self._sleep(wait)
        self._last_request = self._now()

    # ------------------------------------------------------------------ downloads

    def start_run(self) -> None:
        """Reset the per-run download counter."""
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
        """Count one finished (or attempted) download for the run and the day."""
        today = self._day_key()
        count = self.downloads_today() + 1
        self.db.set_state(K_DL_DAY, today)
        self.db.set_state(K_DL_TODAY, count)
        self.db.set_state(K_DL_RUN, self.downloads_this_run() + 1)

    def next_download_delay(self) -> float:
        cfg = self.cfg
        low, high = cfg.sleep_interval, max(cfg.sleep_interval, cfg.max_sleep_interval)
        return float(self._uniform(low, high)) if high > 0 else 0.0

    def sleep_between_downloads(self) -> float:
        """Sleep a random time in [sleep_interval, max_sleep_interval]; returns seconds."""
        delay = self.next_download_delay()
        if delay > 0:
            self._sleep(delay)
        return delay

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
