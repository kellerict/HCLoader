"""Central throttle (SPEC §5): request pacing, hourly/daily limits and persistent backoff.

Every network access (search, list, resolve, download) must go through this class.
State and counters live in the DB table `state`, so they survive restarts. Clock, sleep and
random source are injectable for tests.

Phase 7a: one throttle per platform. The object the app creates is the YouTube throttle (state
keys and lock names unchanged); `throttle.platform("soundcloud")` returns the SoundCloud
sibling with its own limits (`settings.soundcloud`), counters, backoff, request spacing, pause
between downloads, cross-process throttle lock and metadata lock. State keys of non-YouTube
platforms carry the prefix `<platform>.` (e.g. `soundcloud.backoff_until`). A 429 of one
platform therefore never blocks the other one.
"""

from __future__ import annotations

import json
import logging
import random
import re
import threading
import time
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from typing import Any

from . import locks, platforms
from .db import Database
from .i18n import tr

log = logging.getLogger(__name__)

K_BACKOFF_UNTIL = "backoff_until"
K_BACKOFF_LEVEL = "backoff_level"
K_BACKOFF_REASON = "backoff_reason"
K_SEARCH_TIMES = "search_times"
K_DL_DAY = "downloads_day"
K_DL_TODAY = "downloads_today"
K_DL_RUN = "downloads_run"
K_LAST_DL_END = "last_download_end"
K_LAST_REQUEST = "last_request"
# v0.4.0 «Read everything (once)»: time of the last backfill page request (pacing per hour)
K_BACKFILL_LAST = "backfill_last_request"
# Review v0.4.0 M3: global (not per platform) stamp of the last yt-dlp update start. A backfill
# of another process (headless) stops before its next request when it changes.
K_YTDLP_UPDATE = "ytdlp_update_started"

_RATE_LIMIT_PATTERNS = [
    re.compile(r"http error 429", re.I),
    re.compile(r"too many requests", re.I),
    re.compile(r"sign in to confirm you.{0,3}re not a bot", re.I),
    re.compile(r"confirm you.{0,3}re not a bot", re.I),
    re.compile(r"\bnot a bot\b", re.I),
]


# Review M3: SoundCloud blocks bots (Datadome) with HTTP 403, rarely with 429. yt-dlp's
# `SoundcloudBaseIE._call_api` answers the first 401/403 itself by fetching a new client_id
# and repeating the call once; a 403 that still reaches us from a SoundCloud extractor
# (`[soundcloud]`, `[soundcloud:search]`, `[soundcloud:user]`, ...) is therefore the second
# one in a row = bot check. Deliberately narrow: 404 (track deleted), 401 (private) and a
# 403 of the media CDN (expired signed URL, no extractor prefix) never match.
_SC_BLOCK_PATTERNS = [
    re.compile(r"\[soundcloud(?::[\w:-]+)?\][^\n]*http error 403", re.I),
    re.compile(r"captcha-delivery|\bdatadome\b", re.I),
]


# review v0.10.0 m4: Mixcloud (Cloudflare in front of GraphQL/API) and hearthis.at answer a block
# with 403; only a 403 of an extractor/API request counts (tagged `[mixcloud…]` / `[HearThisAt]` /
# our `hearthis:…` extractors), never a 403 of an expired media URL during the download
_MC_BLOCK_PATTERNS = [
    re.compile(r"\[mixcloud(?::[\w:-]+)?\][^\n]*http error 403", re.I),
    re.compile(r"\bcf-mitigated\b|cloudflare[^\n]*challenge", re.I),
]
_HT_BLOCK_PATTERNS = [
    re.compile(r"\[(?:hearthisat|hearthis(?::[\w:-]+)?)\][^\n]*http error 403", re.I),
]
_BLOCK_PATTERNS = {
    "soundcloud": _SC_BLOCK_PATTERNS,
    "mixcloud": _MC_BLOCK_PATTERNS,
    "hearthis": _HT_BLOCK_PATTERNS,
}


def is_rate_limit_error(message: object, platform: str = "youtube") -> bool:
    """True for HTTP 429 / 'confirm you're not a bot' style errors; for `platform`
    'soundcloud' also a SoundCloud API 403 after the client_id refresh (Datadome), for
    'mixcloud' / 'hearthis' a 403 of an API request (Cloudflare block)."""
    text = str(message or "")
    if any(p.search(text) for p in _RATE_LIMIT_PATTERNS):
        return True
    return any(p.search(text) for p in _BLOCK_PATTERNS.get(platform, ()))


class ThrottleError(Exception):
    """Base class for throttle refusals."""


class BackoffActive(ThrottleError):
    def __init__(self, until: datetime, reason: str = "") -> None:
        self.until = until
        self.reason = reason
        super().__init__(tr("throttle.backoff_until", until=f"{until.astimezone():%Y-%m-%d %H:%M}"))


class WaitCancelled(Exception):
    """A pause inside the throttle was aborted through the caller's cancel event."""


class MetadataBusy(Exception):
    """The metadata lock stayed busy (a download is extracting) - try again shortly."""

    def __init__(self) -> None:
        super().__init__(tr("throttle.download_query_busy"))


class RequestBudgetSpent(Exception):
    """v0.4.0: a backfill used up the request budget of this run (headless: one hour's worth).
    Not an error: the backfill stays pending and continues in the next run."""


class LimitReached(ThrottleError):
    """kind: 'searches_per_hour' | 'downloads_per_run' | 'downloads_per_day'."""

    def __init__(self, kind: str, limit: int) -> None:
        self.kind = kind
        self.limit = limit
        names = {
            "searches_per_hour": tr("throttle.limit_searches_hour"),
            "downloads_per_run": tr("throttle.limit_downloads_run"),
            "downloads_per_day": tr("throttle.limit_downloads_day"),
        }
        super().__init__(tr("throttle.limit_reached", what=names.get(kind, kind), count=limit))


PLATFORM_NAMES = dict(platforms.LABELS)


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
        platform: str = "youtube",
        platform_settings: dict[str, Any] | None = None,
        _root: Throttle | None = None,
    ) -> None:
        """`platform_settings`: {platform: ThrottleSettings or provider} for the siblings
        (`platform()`); a platform without an entry uses the same limits as this throttle (own
        state all the same)."""
        self.db = db
        self.platform_name = platform
        self._prefix = "" if platform == "youtube" else f"{platform}."
        self._platform_settings = dict(platform_settings or {})
        self._root = _root
        self._siblings: dict[str, Throttle] = {}
        self._siblings_lock = threading.Lock()
        suffix = "" if platform == "youtube" else f"-{platform}"
        self._throttle_lock_name = locks.THROTTLE_LOCK + suffix
        self._metadata_lock_name = locks.METADATA_LOCK + suffix
        self._settings = settings
        self._clock = clock
        self._sleep = sleep
        self._uniform = uniform
        # N5: the time of the last request and the search timestamps live in DB `state`; their
        # read-modify-write runs under a cross-process file lock (`_xlock`), so a GUI search
        # and a headless watchlist run keep the request spacing and count searches together.
        self._xdepth = 0
        self._local = threading.local()  # last slot written by this thread (request_spacing)
        # Guards read-modify-write sequences (counters, backoff, request spacing). Re-entrant:
        # public methods call each other. Held across the request sleep on purpose, so requests
        # of different threads run serially with the configured spacing.
        self._lock = threading.RLock()
        # Serialises the (long) pause between downloads without blocking searches meanwhile.
        self._dl_lock = threading.Lock()
        self._default_sleep = sleep is time.sleep
        # Random pause before the next download, rolled once per `last_download_end` value so
        # that a countdown shown in advance (download_wait) equals the pause actually waited.
        self._planned_pause: tuple[str, float] | None = None
        # Review Phase 3 m4: only one YouTube *metadata* exchange at a time. Searches, lists,
        # resolves and the extraction part of a download hold it; a download releases it as
        # soon as the media transfer starts (docs/decisions.md). Never acquired while `_lock`
        # is held (lock order: metadata lock -> `_lock`).
        self._meta_lock = threading.Lock()

    # ------------------------------------------------------------------ platforms

    def platform(self, name: str | None) -> Throttle:
        """Throttle of platform `name` (None/'youtube' = the YouTube throttle)."""
        root = self._root or self
        name = name or "youtube"
        if name == root.platform_name:
            return root
        with root._siblings_lock:
            sib = root._siblings.get(name)
            if sib is None:
                cfg = root._platform_settings.get(name, root._settings)
                sib = Throttle(
                    root.db,
                    cfg,
                    clock=root._clock,
                    sleep=root._sleep,
                    uniform=root._uniform,
                    platform=name,
                    _root=root,
                )
                sib._default_sleep = root._default_sleep
                root._siblings[name] = sib
            return sib

    def platforms(self) -> list[Throttle]:
        """YouTube first, then every configured platform."""
        root = self._root or self
        names = ["youtube"]
        for n in [*root._platform_settings, *root._siblings]:
            if n not in names:
                names.append(n)
        return [root.platform(n) for n in names]

    @property
    def label(self) -> str:
        return PLATFORM_NAMES.get(self.platform_name, self.platform_name)

    def _key(self, key: str) -> str:
        return self._prefix + key

    def _get(self, key: str, default: str | None = None) -> str | None:
        return self.db.get_state(self._key(key), default)

    def _set(self, key: str, value: Any) -> None:
        self.db.set_state(self._key(key), value)

    def _del(self, key: str) -> None:
        self.db.delete_state(self._key(key))

    @contextmanager
    def _xlock(self, cancel_event: threading.Event | None = None) -> Iterator[None]:
        """Cross-process critical section (re-entrant; always taken under `self._lock`)."""
        with self._lock:
            if self._xdepth:
                self._xdepth += 1
                try:
                    yield
                finally:
                    self._xdepth -= 1
                return
            with locks.cross_process_lock(self._throttle_lock_name, cancel=cancel_event):
                self._xdepth = 1
                try:
                    yield
                finally:
                    self._xdepth = 0

    @property
    def cfg(self) -> Any:
        return self._settings() if callable(self._settings) else self._settings

    def _now(self) -> datetime:
        return self._clock()

    # ------------------------------------------------------------------ backoff

    def backoff_until(self) -> datetime | None:
        """End of the active backoff, or None if there is none (or it has expired)."""
        raw = self._get(K_BACKOFF_UNTIL)
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
        return int(self._get(K_BACKOFF_LEVEL, "0") or 0)

    def check_backoff(self) -> None:
        until = self.backoff_until()
        if until:
            raise BackoffActive(until, self._get(K_BACKOFF_REASON, "") or "")

    def trigger_backoff(self, reason: str = "") -> datetime:
        """Start (or escalate) the backoff: initial hours, doubling up to the cap.

        Triggering while a backoff is already active does not escalate further.
        """
        with self._xlock():
            active = self.backoff_until()
            if active:
                return active
            cfg = self.cfg
            level = self.backoff_level() + 1
            hours = min(cfg.backoff_initial_hours * 2 ** (level - 1), cfg.backoff_max_hours)
            until = self._now() + timedelta(hours=hours)
            self._set(K_BACKOFF_LEVEL, level)
            self._set(K_BACKOFF_UNTIL, until.isoformat())
            self._set(K_BACKOFF_REASON, reason)
            log.error(
                tr(
                    "throttle.block_detected",
                    platform=self.label,
                    reason=reason,
                    until=until,
                    hours=f"{hours:.1f}",
                )
            )
            return until

    def handle_error(self, message: object) -> bool:
        """Trigger backoff if `message` looks like a 429/bot-check of this platform. Returns
        True if it did."""
        if is_rate_limit_error(message, self.platform_name):
            self.trigger_backoff(str(message)[:200])
            return True
        return False

    def reset_backoff(self) -> None:
        """After a successful run: clear backoff and reset the escalation level."""
        with self._xlock():  # n1: never between another process's check and trigger
            self._del(K_BACKOFF_UNTIL)
            self._del(K_BACKOFF_REASON)
            self._set(K_BACKOFF_LEVEL, 0)

    def finish_run(self, success: bool, platforms: Any = None) -> None:
        """Call at the end of every run (GUI queue, headless, smoke).

        A successful run (at least one real download/request went through) resets the backoff
        escalation (SPEC §5); a failed one leaves the state untouched. `platforms` (Phase 7a):
        the platforms that succeeded in this run; None = this throttle only.
        """
        if not success:
            return
        if platforms is not None:
            for name in platforms:
                self.platform(name).finish_run(True)
            return
        with self._xlock():  # n1
            # Never lift a backoff that is still active (e.g. a 429 warning seen during this
            # run while the download itself succeeded) - only reset the escalation level.
            if self.backoff_until() is not None:
                log.info(tr("throttle.backoff_stays"))
                return
            self.reset_backoff()

    def clear_backoff_manual(self) -> None:
        """User override: lift the block but keep the level, so a repeat doubles again."""
        with self._xlock():  # n1
            self._del(K_BACKOFF_UNTIL)
            self._del(K_BACKOFF_REASON)
        log.warning(tr("throttle.backoff_cleared", platform=self.label))

    # ------------------------------------------------------------------ requests

    def _search_times(self) -> list[float]:
        try:
            times = json.loads(self._get(K_SEARCH_TIMES, "[]") or "[]")
        except ValueError:
            times = []
        horizon = self._now().timestamp() - 3600
        return [t for t in times if isinstance(t, (int, float)) and t > horizon]

    def searches_last_hour(self) -> int:
        return len(self._search_times())

    def search_available_at(self) -> datetime | None:
        """When the next search is allowed again if the hourly limit is used up, else None."""
        times = sorted(self._search_times())
        limit = self.cfg.max_searches_per_hour
        if len(times) < limit:
            return None
        # the oldest search that keeps the count at the limit must drop out of the hour
        return datetime.fromtimestamp(times[len(times) - limit] + 3600, UTC)

    def _last_request(self) -> datetime | None:
        raw = self._get(K_LAST_REQUEST)
        if not raw:
            return None
        try:
            return datetime.fromisoformat(raw)
        except ValueError:
            return None

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
        with self._xlock(cancel_event):
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
                self._set(K_SEARCH_TIMES, json.dumps(times))
            last = self._last_request()
            if last is not None and cfg.sleep_requests > 0:
                since = (self._now() - last).total_seconds()
                # a clock set back must not produce an endless wait
                wait = min(cfg.sleep_requests - since, float(cfg.sleep_requests))
                self._wait(wait, cancel_event)
            stamp = self._now().isoformat()
            self._set(K_LAST_REQUEST, stamp)
            self._local.slot = stamp
            if count_attempt:
                self.register_download()

    def backfill_pace(self, per_hour: int, cancel_event: threading.Event | None = None) -> None:
        """v0.4.0: pacing wait before a «Read everything (once)» page request.

        Waits until `3600 / per_hour` seconds have passed since the last backfill request
        (persisted in `state`, so a restart never bursts). Review v0.4.0 M1: the caller holds
        *no* lock while waiting here - neither the throttle lock nor the metadata lock - so
        searches, watchlist checks and download extraction are never held up by the pacing.
        Raises BackoffActive; `cancel_event` aborts the wait (WaitCancelled)."""
        interval = 3600.0 / max(1, int(per_hour))
        with self._xlock(cancel_event):
            self.check_backoff()
            raw = self._get(K_BACKFILL_LAST)
        wait = 0.0
        if raw:
            try:
                since = (self._now() - datetime.fromisoformat(raw)).total_seconds()
                # a clock set back must not produce an endless wait
                wait = min(interval - since, interval)
            except ValueError:
                wait = 0.0
        if wait > 0:
            self._wait(wait, cancel_event)
        elif cancel_event is not None and cancel_event.is_set():
            raise WaitCancelled

    def backfill_request(self, cancel_event: threading.Event | None = None) -> None:
        """v0.4.0: the request slot of a backfill page request, called under the metadata lock
        right before the request (after `backfill_pace`): backoff check, `sleep_requests`
        spacing to *any* other request, then the backfill pacing stamp."""
        self._request_slot("list", cancel_event, False, limits=False)
        with self._xlock(cancel_event):
            self._set(K_BACKFILL_LAST, self._now().isoformat())

    def backfill_slot(self, per_hour: int, cancel_event: threading.Event | None = None) -> None:
        """`backfill_pace` + `backfill_request` in one call (no metadata lock involved)."""
        self.backfill_pace(per_hour, cancel_event)
        self.backfill_request(cancel_event)

    def request_spacing(self, cancel_event: threading.Event | None = None) -> None:
        """Re-enforce `sleep_requests` after waiting for the metadata lock (R2-m1), without
        counting anything. A download reserves its request slot in `before_request` and only then
        waits for the metadata lock; if another request (a search) went out meanwhile, the
        spacing to it is waited out here. No wait if this thread's slot is still the latest."""
        with self._xlock(cancel_event):
            cfg = self.cfg
            raw = self._get(K_LAST_REQUEST)
            last = self._last_request()
            if (
                last is not None
                and raw != getattr(self._local, "slot", None)
                and (cfg.sleep_requests > 0)
            ):
                since = (self._now() - last).total_seconds()
                self._wait(min(cfg.sleep_requests - since, float(cfg.sleep_requests)), cancel_event)
                stamp = self._now().isoformat()
                self._set(K_LAST_REQUEST, stamp)
                self._local.slot = stamp

    def mark_request(self) -> None:
        """Review Phase 4 m4: a metadata call (possibly several pages) just ended. The request
        spacing of the next request counts from now, not from the start of that call."""
        with self._xlock():
            stamp = self._now().isoformat()
            self._set(K_LAST_REQUEST, stamp)
            self._local.slot = stamp

    @contextmanager
    def metadata_lock(
        self,
        *,
        timeout: float | None = None,
        cancel_event: threading.Event | None = None,
        poll: float = 0.2,
    ) -> Iterator[None]:
        """Hold the YouTube metadata lock (m4). `timeout` (s) -> MetadataBusy; `cancel_event`
        aborts the wait (WaitCancelled). Real time (time.monotonic), not the injected clock."""
        deadline = None if timeout is None else time.monotonic() + max(0.0, timeout)
        while True:
            step = poll
            if deadline is not None:
                step = max(0.0, min(poll, deadline - time.monotonic()))
            if self._meta_lock.acquire(timeout=step):
                break
            if cancel_event is not None and cancel_event.is_set():
                raise WaitCancelled
            if deadline is not None and time.monotonic() >= deadline:
                raise MetadataBusy
        try:
            # R2-n2: also exclusive across processes (GUI search vs. headless watchlist run)
            left = 3600.0 if deadline is None else max(0.0, deadline - time.monotonic())
            with locks.cross_process_lock(
                self._metadata_lock_name,
                timeout=left,
                cancel=cancel_event,
                on_timeout=lambda: (
                    WaitCancelled()
                    if cancel_event is not None and cancel_event.is_set()
                    else MetadataBusy()
                ),
            ):
                yield
        finally:
            self._meta_lock.release()

    def metadata_busy(self) -> bool:
        return self._meta_lock.locked()

    def download_wait(self) -> float:
        """Seconds left of the random pause before the next download (0 if none).

        The random value is rolled once per end-of-download timestamp and reused by
        `before_request("download")`, so a countdown shown in advance is exact.
        """
        with self._lock:
            raw = self._get(K_LAST_DL_END)
            if not raw:
                return 0.0
            try:
                last_end = datetime.fromisoformat(raw)
            except ValueError:
                return 0.0
            if self._planned_pause is None or self._planned_pause[0] != raw:
                self._planned_pause = (raw, self.next_download_delay())
            pause = self._planned_pause[1]
            return max(0.0, pause - (self._now() - last_end).total_seconds())

    def wait_between_downloads(self, cancel_event: threading.Event | None = None) -> None:
        """Wait out the pause before the next download now (abortable -> WaitCancelled).

        The download queue calls this before `YtClient.download` so the queue entry stays
        'queued' during the pause; `before_request("download")` then finds nothing left to wait.
        """
        self.check_download()
        with self._dl_lock:
            self._wait_between_downloads(cancel_event)

    def _wait_between_downloads(self, cancel_event: threading.Event | None) -> None:
        wait = self.download_wait()
        if wait > 0:
            log.info(tr("throttle.pause", s=f"{wait:.0f}"))
            self._wait(wait, cancel_event)

    def mark_download_end(self) -> None:
        """Record the end of a download attempt; the next one waits relative to it."""
        self._set(K_LAST_DL_END, self._now().isoformat())

    # ------------------------------------------------------------------ downloads

    def start_run(self) -> None:
        """Reset the per-run download counter (of every platform: a run spans all of them)."""
        targets = self.platforms() if self._root is None else [self]
        for t in targets:
            with t._lock:
                t._set(K_DL_RUN, 0)

    def _day_key(self) -> str:
        return self._now().astimezone().date().isoformat()

    def downloads_today(self) -> int:
        if self._get(K_DL_DAY) != self._day_key():
            return 0
        return int(self._get(K_DL_TODAY, "0") or 0)

    def downloads_this_run(self) -> int:
        return int(self._get(K_DL_RUN, "0") or 0)

    def download_block(self) -> ThrottleError | None:
        """The reason downloads are currently refused (exception instance) or None."""
        until = self.backoff_until()
        if until:
            return BackoffActive(until, self._get(K_BACKOFF_REASON, "") or "")
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
            self._set(K_DL_DAY, today)
            self._set(K_DL_TODAY, count)
            self._set(K_DL_RUN, self.downloads_this_run() + 1)

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
            "backoff_reason": (self._get(K_BACKOFF_REASON, "") or "") if until else "",
            "backoff_level": self.backoff_level(),
            "searches_last_hour": self.searches_last_hour(),
            "max_searches_per_hour": cfg.max_searches_per_hour,
            "downloads_this_run": self.downloads_this_run(),
            "max_downloads_per_run": cfg.max_downloads_per_run,
            "downloads_today": self.downloads_today(),
            "max_downloads_per_day": cfg.max_downloads_per_day,
        }
