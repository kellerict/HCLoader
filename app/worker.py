"""Background work and events to the UI.

- `EventBus`: thread-safe `window.mv.emit(type, data)` via `evaluate_js`. Callers only enqueue;
  one dispatcher thread talks to the window, so a log line or a download hook never blocks on
  the WebView (evaluate_js waits for the browser).
- `Worker`: one background thread with a job queue for long operations (yt-dlp update,
  DB backup, PO-token test). Jobs with the same key are de-duplicated.
- `run_session()`: frame for a download run (Phase 3 queue, headless): holds the process-wide
  run lock, resets the per-run counter and calls `Throttle.finish_run(success)` at the end.
- `DownloadQueue`: the sequential download queue (own thread, persistent in the DB).
- `PotWatchdog`: keeps the bgutil HTTP provider running while `po_token_mode == "http"`.
- `YtdlpGate`: mutual exclusion "yt-dlp update" <-> "search uses yt-dlp" without TOCTOU.
- `local_preflight()`: local download preconditions (PO-token server ready, target writable).
- `LogForwarder`: live log records -> `log` events (LogLine).
- `AnalysisQueue` (v0.7.0): offline loudness/waveform analysis, one file at a time, low
  priority; urgent waveform requests (set being played) before downloads and library passes.

Nothing here imports pywebview; the window is any object with `evaluate_js(str)`.
"""

from __future__ import annotations

import json
import logging
import os
import queue
import threading
import time
from collections import deque
from collections.abc import Callable, Iterator
from concurrent.futures import Future
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any

from .core import analysis, binaries, fingerprint, locks, preflight, watchlist
from .core.discover import format_until
from .core.i18n import tr
from .core.logging_setup import live_handler
from .core.platforms import file_id, platform_of
from .core.preflight import LocalError
from .core.redact import redact
from .core.throttle import ThrottleError, WaitCancelled

# Only the event dispatcher is silent towards the UI (a failing evaluate_js must not produce
# another log event -> evaluate_js loop). Worker, watchdog and queue messages are user-visible.
log = logging.getLogger("hcloader.worker")
_events_log = logging.getLogger("app.worker.events")

EVENT_TYPES = (
    "progress",
    "done",
    "failed",
    "queue",
    "video",
    "status",
    "log",
    "source",
    "watchlist_done",
    "backfill",
    "toast",
)
UI_LEVELS = {
    "DEBUG": "debug",
    "INFO": "info",
    "WARNING": "warn",
    "ERROR": "error",
    "CRITICAL": "error",
}
# never forward these loggers to the UI (feedback loops through evaluate_js)
_SILENT_LOGGERS = ("pywebview", "app.worker.events", "urllib3")


def log_ok(logger: logging.Logger, msg: str, *args: Any) -> None:
    """INFO record shown as "ok" (green) in the UI log."""
    logger.info(msg, *args, extra={"ui_level": "ok"})


# --------------------------------------------------------------------------- events


def event_script(event_type: str, data: Any = None) -> str:
    """JS for one event. JSON with ensure_ascii=True is a valid JS literal (no raw U+2028/2029,
    no quotes or backslashes that could break out), so arbitrary text is safe."""
    payload = json.dumps({} if data is None else data, ensure_ascii=True, default=str)
    return f"window.mv && window.mv.emit({json.dumps(str(event_type))}, {payload})"


class EventBus:
    """Python -> UI events. `emit()` is non-blocking and safe from any thread."""

    def __init__(self, *, max_queue: int = 5000) -> None:
        self._window: Any = None
        self._ready = threading.Event()
        self._queue: queue.Queue[tuple[str, Any] | None] = queue.Queue(maxsize=max_queue)
        self._listeners: list[Callable[[str, Any], None]] = []
        self._lock = threading.Lock()
        self._thread: threading.Thread | None = None
        self._closed = False
        self.dropped = 0

    # -- wiring

    def attach(self, window: Any, *, ready: bool = False) -> None:
        """Bind a pywebview window (or a fake with `evaluate_js`). Events are delivered once the
        page is loaded (`mark_ready`, wired to `window.events.loaded` by the caller)."""
        self._window = window
        if ready:
            self.mark_ready()
        self._ensure_thread()

    def mark_ready(self) -> None:
        self._ready.set()

    def detach(self) -> None:
        self._ready.clear()
        self._window = None

    @property
    def ready(self) -> bool:
        return self._ready.is_set() and self._window is not None

    def subscribe(self, fn: Callable[[str, Any], None]) -> None:
        """Python-side listener (tests, later: tray/notifications)."""
        with self._lock:
            self._listeners.append(fn)

    # -- emitting

    def emit(self, event_type: str, data: Any = None) -> None:
        with self._lock:
            listeners = list(self._listeners)
        for fn in listeners:
            try:
                fn(event_type, data)
            except Exception:
                _events_log.debug("Event listener failed", exc_info=True)
        if self._closed or not self.ready:
            return  # UI not there yet: it fetches the current state itself when it loads
        try:
            self._queue.put_nowait((event_type, data))
        except queue.Full:
            self.dropped += 1

    def toast(self, msg: str, kind: str = "info") -> None:
        self.emit("toast", {"msg": msg, "kind": kind})

    def _ensure_thread(self) -> None:
        if self._thread is None or not self._thread.is_alive():
            self._thread = threading.Thread(target=self._run, name="hcloader-events", daemon=True)
            self._thread.start()

    def _run(self) -> None:
        while True:
            item = self._queue.get()
            try:
                if item is None:
                    return
                window = self._window
                if window is None or not self._ready.is_set():
                    continue
                try:
                    window.evaluate_js(event_script(*item))
                except Exception as exc:  # window closing, page reloading …
                    _events_log.debug("evaluate_js failed: %s", exc)
            finally:
                self._queue.task_done()

    def flush(self, timeout: float = 5.0) -> bool:
        """Wait until all queued events were handed to the window (tests)."""
        done = threading.Event()

        def waiter() -> None:
            self._queue.join()
            done.set()

        threading.Thread(target=waiter, daemon=True).start()
        return done.wait(timeout)

    def close(self) -> None:
        self._closed = True
        self.detach()
        if self._thread is not None and self._thread.is_alive():
            try:
                self._queue.put_nowait(None)
            except queue.Full:
                pass
            self._thread.join(timeout=2)


class LogForwarder:
    """Live log (logging_setup.CallbackHandler) -> `log` events with UI levels."""

    def __init__(self, bus: EventBus) -> None:
        self._bus = bus

    @staticmethod
    def to_line(entry: dict[str, Any]) -> dict[str, Any]:
        ts = entry.get("ts")
        iso = (
            datetime.fromtimestamp(ts, UTC).isoformat(timespec="seconds")
            if isinstance(ts, (int, float))
            else str(ts or "")
        )
        level = entry.get("ui_level") or UI_LEVELS.get(str(entry.get("level")), "info")
        return {"ts": iso, "level": level, "msg": str(entry.get("message", ""))}

    @staticmethod
    def wanted(entry: dict[str, Any]) -> bool:
        name = str(entry.get("logger", ""))
        return not any(name == s or name.startswith(s + ".") for s in _SILENT_LOGGERS)

    def __call__(self, entry: dict[str, Any]) -> None:
        if self.wanted(entry):
            self._bus.emit("log", self.to_line(entry))

    def backlog(self) -> list[dict[str, Any]]:
        return [self.to_line(e) for e in list(live_handler().backlog) if self.wanted(e)]

    def start(self) -> None:
        live_handler().add_listener(self)

    def stop(self) -> None:
        live_handler().remove_listener(self)


# --------------------------------------------------------------------------- worker


@dataclass
class _Job:
    key: str
    fn: Callable[[], Any]
    future: Future


class Worker:
    """One background thread, FIFO job queue. `submit()` returns a Future."""

    def __init__(self, name: str = "hcloader-worker") -> None:
        self._name = name
        self._queue: queue.Queue[_Job | None] = queue.Queue()
        self._lock = threading.Lock()
        self._pending: dict[str, Future] = {}
        self._thread: threading.Thread | None = None
        self._stopped = False
        self.current: str | None = None

    def start(self) -> None:
        with self._lock:
            if self._thread is None or not self._thread.is_alive():
                self._stopped = False
                self._thread = threading.Thread(target=self._run, name=self._name, daemon=True)
                self._thread.start()

    def in_worker(self) -> bool:
        return threading.current_thread() is self._thread

    def busy(self, key: str) -> bool:
        with self._lock:
            return key in self._pending

    def submit(self, key: str, fn: Callable[..., Any], *args: Any, **kwargs: Any) -> Future:
        """Queue `fn(*args, **kwargs)`. A job with the same key that is still queued or running
        is reused (double clicks start nothing twice)."""
        with self._lock:
            if self._stopped:
                fut: Future = Future()
                fut.set_exception(RuntimeError("Worker has stopped"))
                return fut
            existing = self._pending.get(key)
            if existing is not None:
                return existing
            fut = Future()
            self._pending[key] = fut
        self.start()
        self._queue.put(_Job(key, lambda: fn(*args, **kwargs), fut))
        return fut

    def run(self, key: str, fn: Callable[..., Any], *args: Any, timeout: float | None = None):
        """Submit and wait (for js_api calls, which run in their own pywebview thread).
        Inside the worker thread the function runs inline (no self-deadlock)."""
        if self.in_worker():
            return fn(*args)
        return self.submit(key, fn, *args).result(timeout=timeout)

    def _run(self) -> None:
        while True:
            job = self._queue.get()
            if job is None:
                return
            self.current = job.key
            try:
                if job.future.set_running_or_notify_cancel():
                    try:
                        result = job.fn()
                    except BaseException as exc:
                        log.exception("Background job %s failed", job.key)
                        self._release(job)
                        job.future.set_exception(exc)
                    else:
                        # pop before resolving: a submit() right after completion starts anew (n3)
                        self._release(job)
                        job.future.set_result(result)
            finally:
                self._release(job)

    def _release(self, job: _Job) -> None:
        """Forget `job` (only this one: a new job with the same key may already be queued)."""
        with self._lock:
            if self._pending.get(job.key) is job.future:
                del self._pending[job.key]
            if self.current == job.key:
                self.current = None

    def other_job(self, key: str) -> str | None:
        """Key of a different job that is queued or running (maintenance: m3), else None."""
        with self._lock:
            for k in self._pending:
                if k != key:
                    return k
        return None

    def stop(self, timeout: float = 5.0) -> None:
        with self._lock:
            self._stopped = True
            thread = self._thread
        self._queue.put(None)
        if thread is not None and thread.is_alive() and not self.in_worker():
            thread.join(timeout)

    def alive(self) -> bool:
        """True while the worker thread runs (after `stop()`: a job did not end in time)."""
        thread = self._thread
        return thread is not None and thread.is_alive()


# --------------------------------------------------------------------------- download runs


class RunBusy(Exception):
    """Another download run (GUI, headless or smoke) holds the run lock."""

    def __init__(self) -> None:
        super().__init__(tr("run.busy"))


@dataclass
class RunSession:
    success: bool = False
    # Phase 7a: platforms with at least one successful download in this run
    platforms: set[str] = field(default_factory=set)


@contextmanager
def run_session(
    throttle: Any, *, acquire: Callable[[], Any] = locks.acquire_run_lock
) -> Iterator[RunSession]:
    """Frame for one download run (Phase 3 queue / Phase 4 headless):

        with run_session(throttle) as run:
            ... downloads ...; run.success = True if at least one went through

    Holds the process-wide run lock, resets the per-run counter, and always ends with
    `Throttle.finish_run(run.success)` (backoff reset after a successful run, SPEC §5).
    """
    lock = acquire()
    if lock is None:
        raise RunBusy
    session = RunSession()
    try:
        throttle.start_run()
        yield session
    finally:
        try:
            if session.platforms - {"youtube"}:
                throttle.finish_run(session.success, platforms=sorted(session.platforms))
            else:
                throttle.finish_run(session.success)
        finally:
            lock.release()


# --------------------------------------------------------------------------- download queue

# ytclient progress phases -> UI phases (QueueItem.phase / progress.phase)
QUEUE_PHASES = {"laden": "download", "konvertieren": "convert", "taggen": "tag"}
K_QUEUE_PAUSED = "queue_paused"
_UNSORTED = "Unsortiert"


def video_dict(row: dict[str, Any]) -> dict[str, Any]:
    """DB row -> `Video` of the bridge contract (ui/js/bridge.js)."""
    return {
        "id": row["id"],
        "title": row.get("title") or "",
        "channel_id": row.get("channel_id"),
        "channel_name": row.get("channel_name") or "",
        "duration": row.get("duration"),
        "upload_date": row.get("upload_date") or None,
        "date_approx": bool(row.get("date_approx")),
        "view_count": row.get("view_count"),
        "thumbnail": row.get("thumbnail"),
        "genre": row.get("genre") or _UNSORTED,
        "genre_manual": bool(row.get("genre_manual")),
        "status": row.get("status") or "new",
        "source_id": row.get("source_id"),
        "is_live": False,  # only search results know it (discover sets True), Review n1
        # Phase 7a
        "platform": row.get("platform") or platform_of(row["id"]),
        "url": row.get("url") or None,
        "preview": bool(row.get("preview")),
        "geo_blocked": bool(row.get("geo_blocked")),
        # v0.3.0 festivals & series (names: get_series / get_festival_tree)
        "edition_id": row.get("edition_id"),
        "suggested_edition_id": row.get("suggested_edition_id"),
        "stage": row.get("stage"),
        "set_type": row.get("set_type"),
        "episode": row.get("episode"),
        "festival_manual": bool(row.get("festival_manual")),
        "festival_confidence": row.get("festival_confidence"),
    }


class DownloadQueue:
    """Sequential download queue (SPEC §3.3): exactly one active download, own daemon thread.

    Persistence lives in the DB: status `queued` + `queue_pos` (order), `failed` entries stay
    visible until retried or removed. A *run* (`run_session`: run lock, per-run counter,
    `Throttle.finish_run`) lasts while entries are processed without interruption; it ends
    when the queue is empty, paused, blocked (backoff, run/day limit, restart needed) or the
    app closes. Run limit: the rest stays `queued` until the user starts a new run (resume or
    enqueue). Day limit / backoff: the queue continues by itself once the block is over.

    The throttle pause before a download is waited out *here* (entry stays `queued`, phase
    `sleep`, abortable); `YtClient.download` then finds nothing left to wait.
    """

    def __init__(
        self,
        db: Any,
        throttle: Any,
        bus: EventBus,
        client_factory: Callable[[], Any],
        *,
        settings_provider: Callable[[], Any],
        run_lock: Callable[[], Any] = locks.acquire_run_lock,
        on_change: Callable[[], None] | None = None,
        preflight: Callable[[float, threading.Event], LocalError | None] | None = None,
        pot_wait: float = 20.0,
        on_thread_start: Callable[[], Any] | None = None,
        record_run: bool = True,
        idle_interval: float = 30.0,
        progress_interval: float = 0.5,
        monotonic: Callable[[], float] = time.monotonic,
        on_done: Callable[[str], Any] | None = None,
        on_session_end: Callable[[dict[str, Any]], Any] | None = None,
    ) -> None:
        self._db = db
        self._on_done = on_done  # v0.7.0: e.g. queue the offline analysis of the new file
        # v0.9.0: one call per run that loaded or failed something (aggregated notification)
        self._on_session_end = on_session_end
        self._throttle = throttle
        self._bus = bus
        self._factory = client_factory
        self._settings = settings_provider
        self._run_lock = run_lock
        self._on_change = on_change
        self._preflight = preflight
        self._pot_wait = pot_wait
        self._on_thread_start = on_thread_start
        # False: the caller (headless run) writes its own `runs` entry from `last_session`
        self._record_run = record_run
        self.last_session: dict[str, Any] = {"downloaded": 0, "errors": 0, "note": ""}
        self._idle_interval = idle_interval
        self._progress_interval = progress_interval
        self._mono = monotonic
        self._lock = threading.RLock()
        self._wake = threading.Event()
        self._stop = threading.Event()
        self._idle = threading.Event()
        self._cancel = threading.Event()
        self._cancel_target: str | None = None
        self._current: dict[str, Any] | None = None
        self._paused = db.get_state(K_QUEUE_PAUSED) == "1"
        # platforms whose per-run limit was reached in the current run (Phase 7a: per platform)
        self._run_limit_hit: set[str] = set()
        self._restart_required = False
        self._busy = False
        self._last_block: str | None = None
        # m3: the client (yt-dlp import) failed -> no new attempt until a user action
        self._client_error: str | None = None
        # m2: local precondition failed (code, blocked_reason) -> re-checked every tick
        self._local_block: tuple[str, str] | None = None
        self._thread: threading.Thread | None = None

    # ------------------------------------------------------------------ lifecycle

    def start(self) -> None:
        if self._thread is None or not self._thread.is_alive():
            self._stop.clear()
            self._thread = threading.Thread(target=self._loop, name="hcloader-queue", daemon=True)
            self._thread.start()

    def stop(self, timeout: float = 10.0) -> bool:
        """Stop the thread; an active download is aborted and stays `queued` (resumable).

        Returns True once the thread has ended. Cancelling is only noticed in yt-dlp's hooks;
        a running ffmpeg conversion has none, so this may take a while (m5): the caller must
        not close the DB while it returns False.
        """
        self._stop.set()
        with self._lock:
            self._cancel_target = None  # programme end: entry stays queued
            self._cancel.set()
        self._wake.set()
        thread = self._thread
        if thread is not None and thread.is_alive() and thread is not threading.current_thread():
            thread.join(timeout)
            return not thread.is_alive()
        return True

    def wake(self) -> None:
        """Re-evaluate now (enqueue, resume, backoff lifted, PO-token server ready …)."""
        with self._lock:
            self._idle.clear()
            self._wake.set()

    def user_action(self) -> None:
        """An explicit user action (enqueue, resume, settings saved): retry a client that
        failed to load (m3) and re-evaluate everything now."""
        if self._client_error is not None:
            self._client_error = None
            log.info(tr("queue.reload_module"))
        self.wake()

    def wait_idle(self, timeout: float = 10.0) -> bool:
        """Tests: wait until the thread has nothing runnable left."""
        return self._idle.wait(timeout)

    def _loop(self) -> None:
        if self._on_thread_start is not None:
            try:  # housekeeping (old partial files) before the first download, same thread
                self._on_thread_start()
            except Exception:
                log.debug("Queue: start task failed", exc_info=True)
        while not self._stop.is_set():
            self._wake.clear()
            try:
                self.run_pending()
            except Exception:
                log.exception(tr("queue.unexpected"))
            if self._stop.is_set():
                break
            with self._lock:
                if not self._wake.is_set():
                    self._idle.set()
            self._wake.wait(self._idle_interval)
        self._idle.set()

    # ------------------------------------------------------------------ state

    @property
    def paused(self) -> bool:
        return self._paused

    @property
    def restart_required(self) -> bool:
        return self._restart_required

    def set_restart_required(self) -> None:
        """After a yt-dlp update in this process (Review m2): no more downloads until restart."""
        if not self._restart_required:
            self._restart_required = True
            log.warning(tr("queue.restart_needed_log"))
        self._changed()

    def _th(self, platform: str) -> Any:
        th = self._throttle
        return th.platform(platform) if hasattr(th, "platform") else th

    def _waiting_platforms(self) -> list[str]:
        getter = getattr(self._db, "queued_platforms", None)
        return (getter() if getter else None) or ["youtube"]

    def _platform_block(self, platform: str) -> tuple[str, str] | None:
        """Throttle verdict of one platform: (code, German message) or None. Messages of
        SoundCloud start with «SoundCloud: »; YouTube keeps the texts of Phase 3."""
        th = self._th(platform)
        prefix = "" if platform == "youtube" else f"{getattr(th, 'label', platform)}: "
        until = th.backoff_until()
        if until:
            return "backoff", (tr("queue.backoff_rest", prefix=prefix, until=format_until(until)))
        cfg = th.cfg
        today = th.downloads_today()
        if today >= cfg.max_downloads_per_day:
            return "day_limit", (
                tr("queue.day_limit_rest", prefix=prefix, n=today, max=cfg.max_downloads_per_day)
            )
        if platform in self._run_limit_hit:
            head = tr(
                "queue.run_limit",
                prefix=prefix,
                n=cfg.max_downloads_per_run,
                max=cfg.max_downloads_per_run,
            )
            if not self._record_run:  # headless: no «Fortsetzen» button (QA Phase 4)
                return "run_limit", head + tr("queue.rest_next_run")
            return "run_limit", (head + tr("queue.rest_resume"))
        return None

    def platform_blocked(self) -> dict[str, dict[str, str]]:
        """{platform: {code, reason}} of blocked platforms with waiting entries (7a)."""
        out: dict[str, dict[str, str]] = {}
        for platform in self._waiting_platforms():
            block = self._platform_block(platform)
            if block:
                out[platform] = {"code": block[0], "reason": block[1]}
        return out

    def blocked(self) -> tuple[str | None, str | None]:
        """(code, German message) why waiting entries do not run, or (None, None).

        code: restart | backoff | day_limit | run_limit | error | pot | target | busy
        (not: paused, see `paused`). The throttle verdicts come first: while one of them
        holds, local preconditions are not even checked. Phase 7a: a throttle verdict blocks
        the queue only if it holds for every platform with waiting entries (the first one's
        message is returned); otherwise see `platform_blocked`.
        """
        if self._restart_required:
            return "restart", tr("queue.restart_required")
        verdicts = [self._platform_block(p) for p in self._waiting_platforms()]
        if verdicts and all(verdicts):
            return verdicts[0]  # type: ignore[return-value]
        if self._client_error:
            return "error", self._client_error
        local = self._local_block
        if local:
            return local
        if self._busy:
            return "busy", tr("queue.other_run")
        return None, None

    def snapshot(self) -> dict[str, Any]:
        """`get_queue()`: {paused, items:[QueueItem], blocked_reason, blocked_code}."""
        with self._lock:
            cur = dict(self._current) if self._current else None
        settings = self._settings()
        items: list[dict[str, Any]] = []
        waiting = 0
        for row in self._db.list_queue():
            vid = row["id"]
            item: dict[str, Any] = {
                "id": vid,
                "video": video_dict(row),
                "state": "waiting",
                "phase": "waiting",
                "pct": 0,
                "speed": 0,
                "eta": 0,
                "error": None,
                "target": _target_folder(row, settings, self._db),
            }
            if cur and cur["id"] == vid:
                phase = cur["phase"]
                item["phase"] = phase
                item["state"] = "waiting" if phase in ("waiting", "sleep") else "active"
                item["pct"] = cur.get("pct", 0)
                item["speed"] = cur.get("speed", 0)
                item["eta"] = cur.get("eta", 0)
                if phase == "sleep":
                    left = cur["sleep_until"] - self._mono()
                    item["eta"] = max(0, int(left + 0.999))
                    item["sleep_total"] = cur["sleep_total"]
            elif row["status"] == "downloading":
                item.update(state="active", phase="download")
            elif row["status"] == "failed":
                item.update(state="failed", phase="download", error=row.get("error") or "")
            if row["status"] == "queued":
                waiting += 1
            items.append(item)
        code, msg = self.blocked() if waiting else (None, None)
        return {
            "paused": self._paused,
            "items": items,
            "blocked_reason": msg,
            "blocked_code": code,
            "platform_blocked": self.platform_blocked() if waiting and not code else {},
        }

    # ------------------------------------------------------------------ user actions

    def enqueue(self, ids: list[str], *, auto: bool = False) -> list[str]:
        """Queue videos. `auto=True` (watchlist auto-download) is no user action: it neither
        starts a new run after the run limit nor retries a failed client."""
        accepted = self._db.enqueue([str(i) for i in ids or []])
        for vid in accepted:
            self._emit_video(vid)
        if accepted:
            log.info(tr("queue.enqueued", n=len(accepted)))
            if not auto:
                self._run_limit_hit = set()  # explicit user action = new run
        self._changed()
        if auto:
            self.wake()
        else:
            self.user_action()
        return accepted

    def set_paused(self, paused: bool) -> bool:
        paused = bool(paused)
        self._paused = paused
        self._db.set_state(K_QUEUE_PAUSED, "1" if paused else "0")
        if paused:
            with self._lock:
                in_sleep = bool(self._current and self._current["phase"] == "sleep")
                if in_sleep:  # abort the pause, the entry stays queued
                    self._cancel_target = None
                    self._cancel.set()
            log.info(tr("queue.paused"))
        else:
            self._run_limit_hit = set()
            log.info(tr("queue.resumed"))
        self._changed()
        if paused:
            self.wake()
        else:
            self.user_action()
        return paused

    def move(self, video_id: str, delta: int) -> bool:
        ok = self._db.move_in_queue(str(video_id), int(delta))
        if ok:
            self._changed()
        return ok

    def cancel(self, video_id: str) -> str:
        """Remove an entry. Active/sleeping: abort it (partial files are kept for later).

        Returns "ok", "late" (the download is already past its point of no return or done,
        Review n3) or "missing" (not in the queue).
        """
        vid = str(video_id)
        with self._lock:
            if self._current and self._current["id"] == vid:
                if self._current.get("committed"):
                    return "late"
                self._cancel_target = vid
                self._cancel.set()
                return "ok"
        row = self._db.get_video(vid)
        if row and row["status"] == "done":
            return "late"
        if not row or row["status"] not in ("queued", "failed"):
            return "missing"
        self._db.dequeue(vid, "new")
        log.info(tr("queue.removed", title=row.get("title") or vid))
        self._emit_video(vid)
        self._changed()
        return "ok"

    def retry(self, video_id: str) -> bool:
        """Manual retry of a failed entry (SPEC §5: never automatic)."""
        row = self._db.get_video(str(video_id))
        if not row or row["status"] != "failed":
            return False
        return bool(self.enqueue([row["id"]]))

    # ------------------------------------------------------------------ processing

    def run_pending(self) -> None:
        """One scheduling step: start a run if entries wait and nothing blocks (also tests)."""
        if self._stop.is_set():
            return
        self.last_session = {"downloaded": 0, "errors": 0, "note": "", "note_code": None}
        if self._paused or self._db.next_queued() is None:
            self._note_block(None)
            return
        code, _ = self.blocked()
        if code in ("restart", "backoff", "day_limit", "run_limit", "error"):
            self._note_block(code)
            return
        # local preconditions before a run: no runs entry, no request, nothing counted (m2);
        # at the first start in HTTP mode this waits for the watchdog's first check
        if self._check_local(self._pot_wait):
            self._note_block(self._local_block[0] if self._local_block else None)
            return
        client = self._make_client()  # before the run (m3)
        if client is None:
            return
        try:
            with run_session(self._throttle, acquire=self._run_lock) as run:
                self._busy = False
                self._session(run, client)
        except RunBusy:
            self._busy = True
            self._note_block("busy")
            return
        finally:
            try:
                client.close()
            except Exception:
                log.debug("YtClient.close", exc_info=True)
        self._note_block(self.blocked()[0] if self._db.next_queued() else None)

    def _check_local(self, wait: float) -> bool:
        """Run the local preflight; stores/clears `_local_block`. True = blocked."""
        result: LocalError | None = None
        if self._preflight is not None:
            try:
                result = self._preflight(wait, self._stop)
            except Exception:
                log.exception("Download preflight failed")
        return self._set_local_block(result)

    def _set_local_block(self, exc: LocalError | None) -> bool:
        prev = self._local_block
        block = (exc.code, preflight.block_reason(str(exc))) if exc is not None else None
        self._local_block = block
        if block and block != prev:
            log.warning(tr("queue.waiting", reason=exc))
        elif prev and not block:
            log.info(tr("queue.local_cleared"))
        return block is not None

    def _make_client(self) -> Any:
        """The download client (imports yt-dlp). On failure: block "error" until a user
        action (m3) - no run, no runs entry, no retry loop."""
        try:
            return self._factory()
        except Exception as exc:
            text = redact(exc)[:300] or exc.__class__.__name__
            self._client_error = tr("queue.module_failed", error=text)
            log.error("%s", self._client_error)
            log.debug("Client error", exc_info=True)
            self._note_block("error")
            return None

    def _note_block(self, code: str | None) -> None:
        if code != self._last_block:
            self._last_block = code
            self._changed()

    def _session(self, run: RunSession, client: Any) -> None:
        run_id = self._db.start_run("manual") if self._record_run else None
        downloaded = errors = 0
        note = ""
        note_code: str | None = None  # stable block code of `note` (language-independent)
        log.info(tr("queue.run_started"))
        first = True
        refused: set[str] = set()  # platforms that refused a download in this run (7a)
        titles: list[str] = []  # v0.9.0: for the aggregated notification
        failed_titles: list[str] = []
        try:
            while not self._stop.is_set() and not self._paused:
                if self._db.next_queued() is None:
                    break
                if self._restart_required:
                    note_code, note = self._block_note()
                    break
                excluded = self._blocked_platforms() | refused
                row = self._db.next_queued(exclude_platforms=sorted(excluded))
                if row is None:  # every waiting platform is blocked
                    note_code, note = self._block_note()
                    if not note:
                        note_code, note = self._first_block(excluded)
                    log.warning(tr("queue.halted", reason=note))
                    break
                if not first and self._check_local(0):  # run_pending just checked the first
                    note_code, note = self._block_note()
                    break
                first = False
                platform = row.get("platform") or "youtube"
                outcome = self._process(client, row)
                if outcome == "done":
                    downloaded += 1
                    titles.append(str(row.get("title") or row["id"]))
                    run.success = True
                    run.platforms.add(platform)
                elif outcome == "failed":
                    errors += 1
                    failed_titles.append(str(row.get("title") or row["id"]))
                elif outcome == "blocked" and self._local_block is None:
                    refused.add(platform)  # throttle refusal: the other platform may go on
                    continue
                elif outcome in ("blocked", "stopped"):
                    self._blocked_platforms()
                    note_code, note = self._block_note()
                    break
        finally:
            self._set_current(None)
            self.last_session = {
                "downloaded": downloaded,
                "errors": errors,
                "note": note,
                "note_code": note_code if note else None,
                "titles": titles,
                "failed_titles": failed_titles,
            }
            if run_id is not None:
                self._db.finish_run(run_id, downloaded=downloaded, errors=errors, note=note or None)
            log.info(tr("queue.run_finished", n=downloaded, errors=errors))
            self._changed()
            if self._on_session_end is not None and (downloaded or errors):
                try:
                    self._on_session_end(dict(self.last_session))
                except Exception:
                    log.debug("on_session_end hook failed", exc_info=True)

    def _blocked_platforms(self) -> set[str]:
        """Platforms with waiting entries whose throttle refuses downloads right now; notes a
        reached per-run limit (shown as run_limit until the next user action)."""
        out: set[str] = set()
        for platform in self._waiting_platforms():
            block = self._th(platform).download_block()
            if block is None:
                continue
            if getattr(block, "kind", "") == "downloads_per_run":
                self._run_limit_hit.add(platform)
            out.add(platform)
        return out

    def _block_note(self) -> tuple[str | None, str]:
        """`blocked()` as (code, message) with "" instead of None for the message."""
        code, msg = self.blocked()
        return (code, msg) if msg else (None, "")

    def _first_block(self, platforms: set[str]) -> tuple[str | None, str]:
        """(code, message) of the first waiting platform in `platforms` that is blocked."""
        for platform in self._waiting_platforms():
            if platform in platforms:
                block = self._platform_block(platform)
                if block:
                    return block[0], block[1]
        return None, ""

    def _process(self, client: Any, row: dict[str, Any]) -> str:
        """One entry. Returns done | failed | cancelled | skipped | slept | blocked | stopped."""
        vid = row["id"]
        title = row.get("title") or vid
        with self._lock:
            self._cancel.clear()
            self._cancel_target = None
        if self._stop.is_set():
            return "stopped"

        th = self._th(row.get("platform") or "youtube")
        wait = th.download_wait()
        if wait >= 1.0:  # shorter rests are left to before_request (no countdown needed)
            total = int(wait + 0.999)
            self._set_current(
                vid, phase="sleep", eta=total, sleep_total=total, sleep_until=self._mono() + wait
            )
            self._bus.emit(
                "progress",
                {
                    "id": vid,
                    "phase": "sleep",
                    "pct": 0,
                    "speed": 0,
                    "eta": total,
                    "sleep_total": total,
                },
            )
            self._changed()
            try:
                th.wait_between_downloads(self._cancel)
            except WaitCancelled:
                if self._cancel_target == vid:
                    self._remove_cancelled(vid, title)
                    return "cancelled"
                return "stopped"
            except ThrottleError:
                return "blocked"
            finally:
                self._set_current(None)
            return "slept"  # re-read the next entry: the order may have changed meanwhile

        self._set_current(vid, phase="download", committed=False)
        # YtClient sets 'downloading' in the DB itself; tell the UI (cards) right away
        self._bus.emit(
            "video", {"id": vid, "status": "downloading", "genre": row.get("genre") or _UNSORTED}
        )
        self._changed()
        try:
            result = client.download(
                vid,
                on_progress=self._progress_hook(vid),
                cancel_event=self._cancel,
                on_commit=self._commit_hook(vid),
            )
        except ThrottleError as exc:  # status restored by YtClient
            log.warning(tr("queue.download_blocked", reason=exc))
            self._emit_video(vid)  # m6: cards back from "downloading" to "queued"
            return "blocked"
        except LocalError as exc:  # m2: nothing requested; status restored by YtClient
            self._set_local_block(exc)
            self._emit_video(vid)
            return "blocked"
        except Exception as exc:
            log.exception(tr("queue.download_unexpected", id=vid))
            msg = str(exc)[:500] or exc.__class__.__name__
            if self._db.is_known(vid):
                self._db.set_status(vid, "failed", error=msg)
            self._bus.emit("failed", {"id": vid, "title": title, "error": msg})
            self._emit_video(vid)
            return "failed"
        finally:
            self._set_current(None)

        status = getattr(result, "status", "failed")
        title = getattr(result, "title", "") or title
        if status == "done":
            log_ok(log, "%s", tr("queue.finished", title=title))
            self._emit_video(vid)
            self._bus.emit("done", {"id": vid, "title": title})
            if self._on_done is not None:
                try:
                    self._on_done(vid)
                except Exception:
                    log.debug("on_done hook failed", exc_info=True)
            return "done"
        if status == "skipped":
            current = self._db.get_video(vid)
            if current and current["status"] != "done":
                self._db.set_status(vid, "done", error=tr("queue.in_archive"))
            log.info(tr("yt.skipped_done", id=title))
            self._emit_video(vid)
            return "skipped"
        if status == "cancelled":
            if self._cancel_target == vid:
                self._remove_cancelled(vid, title)
            else:
                self._emit_video(vid)
            return "cancelled"
        error = getattr(result, "error", "") or tr("common.error")
        self._bus.emit("failed", {"id": vid, "title": title, "error": error})
        self._emit_video(vid)
        return "failed"

    def _remove_cancelled(self, vid: str, title: str) -> None:
        self._db.dequeue(vid, "new")
        log.warning(tr("queue.cancelled", title=title))
        self._emit_video(vid)

    def _commit_hook(self, vid: str) -> Callable[[], bool]:
        """Point of no return of a download (n3): atomically either refuse (a cancel or the
        programme end came first) or mark the entry as committed (later cancels: "late")."""

        def commit() -> bool:
            with self._lock:
                if self._cancel.is_set():
                    return False
                if self._current and self._current["id"] == vid:
                    self._current["committed"] = True
                return True

        return commit

    def _progress_hook(self, vid: str) -> Callable[[dict[str, Any]], None]:
        last: dict[str, Any] = {"t": None, "phase": None}

        def hook(d: dict[str, Any]) -> None:
            phase = QUEUE_PHASES.get(str(d.get("phase")), "download")
            pct = d.get("percent")
            if pct is None:
                pct = 0.0 if phase == "download" else 100.0
            speed = d.get("speed") or 0
            data = {
                "id": vid,
                "phase": phase,
                "pct": round(float(pct), 1),
                "speed": round(float(speed) / (1024 * 1024), 2) if phase == "download" else 0,
                "eta": int(d.get("eta") or 0) if phase == "download" else 0,
            }
            with self._lock:
                if self._current and self._current["id"] == vid:
                    self._current.update(
                        phase=phase, pct=data["pct"], speed=data["speed"], eta=data["eta"]
                    )
            now = self._mono()
            if (
                phase != last["phase"]
                or data["pct"] >= 100
                or last["t"] is None
                or now - last["t"] >= self._progress_interval
            ):
                last.update(t=now, phase=phase)
                self._bus.emit("progress", data)

        return hook

    # ------------------------------------------------------------------ helpers

    def _set_current(self, vid: str | None, **fields: Any) -> None:
        with self._lock:
            if vid is None:
                self._current = None
            else:
                self._current = {"id": vid, "pct": 0, "speed": 0, "eta": 0, **fields}

    def _emit_video(self, vid: str) -> None:
        row = self._db.get_video(vid)
        if row:
            self._bus.emit(
                "video",
                {"id": vid, "status": row["status"], "genre": row.get("genre") or _UNSORTED},
            )

    def _changed(self) -> None:
        self._bus.emit("queue", {})
        if self._on_change:
            try:
                self._on_change()
            except Exception:
                log.debug("Queue on_change", exc_info=True)


class WatchdogPotServer:
    """Hands the watchdog's HTTP PO-token server to `YtClient(pot_server=...)`.

    YtClient treats it as externally managed (never starts/stops it, so no second server on
    the same port) and only asks `running()`; the watchdog may replace the real server
    object after a crash, so this proxy always asks the watchdog.
    """

    def __init__(self, watchdog: Any) -> None:
        self._watchdog = watchdog

    @property
    def port(self) -> int | None:
        server = self._watchdog.server
        return getattr(server, "port", None)

    def running(self) -> bool:
        return bool(self._watchdog.running())

    def start(self) -> bool:
        return self.running()

    def stop(self) -> None:  # owned by the watchdog
        pass


def _target_folder(row: dict[str, Any], settings: Any, db: Any = None) -> str:
    """Relative target folder (QueueItem.target), e.g. 'Hardcore\\Partyraiser\\2026\\'."""
    try:
        from .core import paths, series

        st = settings.storage
        fest: dict[str, str] = {}
        tpl = st.path_template
        if db is not None and any(f"{{{n}}}" in tpl for n in paths.OPTIONAL_PLACEHOLDERS):
            fest = series.path_values(series.tag_fields(db, row["id"]))
        meta = {
            "id": file_id(row["id"]),
            "platform": row.get("platform") or platform_of(row["id"]),
            "title": row.get("title") or row["id"],
            "artist": row.get("channel_name") or "",
            "channel": row.get("channel_name") or "",
            "genre": row.get("genre") or _UNSORTED,
            "upload_date": row.get("upload_date") or "",
            **fest,
        }
        base = settings.target_dir_path()
        full = paths.build_target_path(
            base,
            st.path_template,
            meta,
            ext=".mp3",
            max_title_length=st.max_title_length,
            max_path_length=st.max_path_length,
        )
        rel = full.parent.relative_to(base)
    except Exception:
        return ""
    text = str(rel)
    return "" if text == "." else text + os.sep


# --------------------------------------------------------------------------- PO-token server


class PotWatchdog:
    """Runs the bgutil HTTP provider as a child process while `po_token_mode == "http"`.

    One daemon thread does all starting/stopping (start waits up to 10 s for /ping), so
    neither the UI nor the worker queue blocks. `apply()` re-evaluates immediately (after
    saving settings); otherwise the thread checks every `interval` seconds and restarts a
    crashed server, giving up after `max_failures` attempts until the next `apply()`.
    """

    def __init__(
        self,
        settings_provider: Callable[[], Any],
        *,
        server_factory: Callable[[int], Any] = binaries.PotServer,
        interval: float = 60.0,
        max_failures: int = 3,
        on_change: Callable[[], None] | None = None,
    ) -> None:
        self._settings = settings_provider
        self._factory = server_factory
        self._interval = interval
        self._max_failures = max_failures
        self._on_change = on_change
        self._server: Any = None
        self._failures = 0
        self._wake = threading.Event()
        self._stop = threading.Event()
        self._lock = threading.Lock()
        self._thread: threading.Thread | None = None
        # set after each completed check(), cleared by apply(): "a verdict is available" (m2)
        self._checked = threading.Event()

    @property
    def gave_up(self) -> bool:
        """True after `max_failures` failed starts (until the next `apply()`)."""
        return self._failures >= self._max_failures

    def wait_ready(self, timeout: float, stop: threading.Event | None = None) -> bool:
        """Wait (max. `timeout` s) until a check has completed since the start / the last
        `apply()`; returns `running()`. The queue calls this before its first run in HTTP
        mode, so an entry waiting at app start does not run into a server still starting."""
        deadline = time.monotonic() + max(0.0, timeout)
        while not self._checked.is_set():
            left = deadline - time.monotonic()
            if left <= 0 or (stop is not None and stop.is_set()):
                break
            self._checked.wait(min(0.2, left))
        return self.running()

    @property
    def server(self) -> Any:
        """The running PotServer (Phase 3: hand to YtClient so it does not start a second one)."""
        return self._server

    def running(self) -> bool:
        server = self._server
        return bool(server is not None and server.running())

    def start(self) -> None:
        if self._thread is None or not self._thread.is_alive():
            self._stop.clear()
            self._thread = threading.Thread(target=self._loop, name="hcloader-pot", daemon=True)
            self._thread.start()

    def apply(self) -> None:
        """Settings changed: reset the failure counter and re-check now."""
        self._failures = 0
        self._checked.clear()
        self._wake.set()

    def _loop(self) -> None:
        while not self._stop.is_set():
            try:
                self.check()
            except Exception:
                log.exception("PO-Token-Watchdog")
            self._wake.wait(self._interval)
            self._wake.clear()

    def check(self) -> None:
        """One watchdog step (also callable directly in tests)."""
        net = self._settings().network
        changed = False
        with self._lock:
            want_http = net.po_token_mode == "http"
            server = self._server
            if server is not None and (not want_http or server.port != net.po_token_port):
                server.stop()
                self._server = server = None
                changed = True
            if want_http and (server is None or not server.running()):
                if self._failures < self._max_failures:
                    os.environ["TOKEN_TTL"] = str(max(1, round(net.po_token_ttl_hours)))
                    server = server or self._factory(net.po_token_port)
                    if server.start():
                        self._failures = 0
                    else:
                        self._failures += 1
                        if self._failures >= self._max_failures:
                            log.error(
                                tr("pot.watchdog_gave_up", n=self._failures),
                            )
                    self._server = server
                    changed = True
        self._checked.set()
        if changed and self._on_change:
            self._on_change()

    def stop(self) -> None:
        self._stop.set()
        self._wake.set()
        if self._thread is not None and self._thread.is_alive():
            self._thread.join(timeout=2)
        with self._lock:
            if self._server is not None:
                self._server.stop()
                self._server = None


def local_preflight(
    settings: Any, watchdog: Any, *, wait: float = 0.0, stop: threading.Event | None = None
) -> LocalError | None:
    """Local download preconditions for the GUI queue (Review Phase 3 m2), no request:

    - HTTP PO-token mode: the watchdog's server runs (waits up to `wait` s for its first
      check, e.g. right after app start); otherwise LocalError('pot').
    - `<target>/.tmp` is writable; otherwise LocalError('target').
    """
    if settings.network.po_token_mode == "http" and watchdog is not None:
        running = watchdog.running()
        if not running and wait > 0 and hasattr(watchdog, "wait_ready"):
            running = watchdog.wait_ready(wait, stop)
        if not running:
            gave_up = bool(getattr(watchdog, "gave_up", False))
            return LocalError(
                "pot", tr(preflight.POT_GAVE_UP if gave_up else preflight.POT_NOT_READY)
            )
    return preflight.check_target(settings.target_dir_path())


class GateBusy(Exception):
    """`YtdlpGate` refused: `what` is "update" or "search"."""

    def __init__(self, what: str) -> None:
        super().__init__(what)
        self.what = what


class YtdlpGate:
    """yt-dlp update vs. searches (Review Phase 3 n2): both sides check and register under
    one lock, so a search that starts while an update begins (or vice versa) is refused
    instead of slipping through a check-then-act gap. Searches may run concurrently."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._searches = 0
        self._updating = False

    @property
    def updating(self) -> bool:
        return self._updating

    @contextmanager
    def search(self) -> Iterator[None]:
        with self._lock:
            if self._updating:
                raise GateBusy("update")
            self._searches += 1
        try:
            yield
        finally:
            with self._lock:
                self._searches -= 1

    @contextmanager
    def update(self) -> Iterator[None]:
        with self._lock:
            if self._searches:
                raise GateBusy("search")
            self._updating = True
        try:
            yield
        finally:
            with self._lock:
                self._updating = False


# --------------------------------------------------------------------------- ticker


class Ticker:
    """Calls `fn` every `interval` seconds in a daemon thread (status bar refresh)."""

    def __init__(self, interval: float, fn: Callable[[], None], name: str = "hcloader-tick"):
        self._interval = interval
        self._fn = fn
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._loop, name=name, daemon=True)

    def start(self) -> None:
        if not self._thread.is_alive():
            self._thread.start()

    def _loop(self) -> None:
        while not self._stop.wait(self._interval):
            try:
                self._fn()
            except Exception:
                log.debug("Ticker", exc_info=True)

    def stop(self) -> None:
        self._stop.set()


# --------------------------------------------------------------------------- in-app interval


class WatchlistScheduler:
    """Checks the whole watchlist every `schedule.watchlist_interval_hours` while the app is open
    (`schedule.in_app_check`). One daemon thread ticks every `tick` seconds and calls `trigger()`
    (the API submits a watchlist job; True = started) when a check is due.

    The time of the last complete check (GUI or headless) is persisted in
    `state.watchlist_last_run`, so a restart or a headless run just before does not cause an
    immediate second check. Without a previous check the first one starts `start_delay` seconds
    after the app start. Never during a backoff (then at the end of the backoff at the earliest).

    Review Phase 4: a full check of another process (`state.watchlist_running_since`, set at the
    start of every full check) or a busy watchlist lock (`defer()`) postpones the check by
    `grace` seconds (re-evaluated then, no toast). A full check without any successful source
    is retried at `state.watchlist_retry_at` (escalating 1 h, 2 h, 4 h ... max 24 h) instead of
    after the full interval.
    """

    GRACE_S = 600.0

    def __init__(
        self,
        db: Any,
        throttle: Any,
        settings_provider: Callable[[], Any],
        trigger: Callable[[], bool],
        *,
        tick: float = 30.0,
        start_delay: float = 60.0,
        grace: float = GRACE_S,
        clock: Callable[[], datetime] = lambda: datetime.now(UTC),
    ) -> None:
        self._grace = grace
        self._deferred: datetime | None = None
        self._db = db
        self._throttle = throttle
        self._settings = settings_provider
        self._trigger = trigger
        self._tick = tick
        self._start_delay = start_delay
        self._clock = clock
        self._started = clock()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def next_check(self) -> datetime | None:
        """When the next in-app check is planned (tz-aware), None if there is none."""
        sched = self._settings().schedule
        if not sched.in_app_check or not self._db.list_sources(enabled_only=True):
            return None
        last = watchlist.last_run(self._db)
        retry = watchlist.retry_at(self._db)
        if retry is not None and (last is None or retry > last):
            due = retry if last is None else min(retry, last + self._interval(sched))
        elif last is None:
            due = self._started + timedelta(seconds=self._start_delay)
        else:
            due = last + self._interval(sched)
        running = watchlist.running_since(self._db, self._clock())
        if running is not None:  # another process checks right now: look again later
            due = max(due, running + timedelta(seconds=self._grace))
        if self._deferred is not None:
            due = max(due, self._deferred)
        until = watchlist.blocked_until(self._db, self._throttle, self._settings())  # 7a
        return max(due, until) if until else due

    @staticmethod
    def _interval(sched: Any) -> timedelta:
        return timedelta(hours=sched.watchlist_interval_hours)

    def defer(self) -> datetime:
        """The watchlist lock was busy (headless run): try again in `grace` seconds."""
        self._deferred = self._clock() + timedelta(seconds=self._grace)
        return self._deferred

    def due(self) -> bool:
        nxt = self.next_check()
        return nxt is not None and self._clock() >= nxt

    def check_now(self) -> bool:
        """One scheduling step (also for tests): trigger a check if one is due."""
        if self._stop.is_set() or not self.due():
            return False
        return bool(self._trigger())

    def start(self) -> None:
        if self._thread is None or not self._thread.is_alive():
            self._stop.clear()
            self._thread = threading.Thread(target=self._loop, name="hcloader-wlsched", daemon=True)
            self._thread.start()

    def _loop(self) -> None:
        while not self._stop.wait(self._tick):
            try:
                self.check_now()
            except Exception:
                log.debug("Watchlist-Zeitplan", exc_info=True)

    def stop(self) -> None:
        self._stop.set()
        thread = self._thread
        if thread is not None and thread.is_alive() and thread is not threading.current_thread():
            thread.join(timeout=2)


class AnalysisQueue:
    """v0.7.0 offline audio analysis (core/analysis.py): one daemon thread, one file at a time,
    ffmpeg at lowered priority. Three kinds of work, in this order:

    1. urgent waveform requests (`request_waveform`, the set that is being played) -> event
       `waveform` {id, ok, peaks?, duration?, loudness?, error?}
    2. items after a download (`request`) -> event `media_analysed`
    3. one library pass at a time (`start_pass`) -> events `audio_analysis` {phase ...} and
       `media_analysed` per item; urgent requests and new downloads are served between files.

    Cancelling a pass stops the running ffmpeg as well. Never touches the network."""

    def __init__(
        self,
        db: Any,
        settings_provider: Callable[[], Any],
        bus: EventBus,
        *,
        runner: Callable[..., Any] | None = None,
        name: str = "hcloader-analysis",
    ) -> None:
        self._db = db
        self._settings = settings_provider
        self._bus = bus
        self._runner = runner or analysis.run_ffmpeg
        self._name = name
        self._cond = threading.Condition()
        self._urgent: deque[str] = deque()
        self._items: deque[str] = deque()
        self._pass_scope: str | None = None
        self._pass_running = False
        self._pass_cancel = threading.Event()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self.current: str | None = None

    # ------------------------------------------------------------------ lifecycle

    def start(self) -> None:
        with self._cond:
            if self._thread is None or not self._thread.is_alive():
                self._stop.clear()
                self._thread = threading.Thread(target=self._loop, name=self._name, daemon=True)
                self._thread.start()

    def stop(self, timeout: float = 5.0) -> None:
        self._stop.set()
        self._pass_cancel.set()
        with self._cond:
            self._cond.notify_all()
        thread = self._thread
        if thread is not None and thread.is_alive() and thread is not threading.current_thread():
            thread.join(timeout)

    # ------------------------------------------------------------------ requests

    def request_waveform(self, video_id: str) -> None:
        with self._cond:
            if video_id not in self._urgent and self.current != f"waveform:{video_id}":
                self._urgent.append(video_id)
            self._cond.notify_all()
        self.start()

    def request(self, video_id: str) -> None:
        with self._cond:
            if video_id not in self._items:
                self._items.append(video_id)
            self._cond.notify_all()
        self.start()

    def set_playing(self, video_id: str | None) -> None:
        """The player has `video_id` loaded (None = nothing). Its file is never tagged while
        loaded (`analysis.in_use`); once released, a deferred tag write is queued."""
        prev = analysis.set_in_use(video_id)
        if prev and prev != (str(video_id) if video_id else None):
            try:
                row = analysis.get_row(self._db, prev) or {}
            except Exception:
                row = {}
            settings = self._settings()
            if (
                settings.loudness.write_tags
                and row.get("lufs") is not None
                and not row.get("tagged")
            ):
                self.request(prev)

    def start_pass(self, scope: str = "new") -> bool:
        """False if a pass is already queued or running."""
        with self._cond:
            if self._pass_running or self._pass_scope is not None:
                return False
            self._pass_cancel.clear()
            self._pass_scope = "all" if scope == "all" else "new"
            self._cond.notify_all()
        self.start()
        return True

    def cancel_pass(self) -> None:
        with self._cond:
            if self._pass_scope is not None and not self._pass_running:
                scope, self._pass_scope = self._pass_scope, None
                self._bus.emit(
                    "audio_analysis",
                    {
                        "phase": "done",
                        "scope": scope,
                        "ok": True,
                        "cancelled": True,
                        "total": 0,
                        "done": 0,
                        "analysed": 0,
                        "failed": 0,
                    },
                )
            self._pass_cancel.set()

    def pass_running(self) -> bool:
        with self._cond:
            return self._pass_running or self._pass_scope is not None

    def idle(self) -> bool:
        with self._cond:
            return not (
                self._urgent
                or self._items
                or self._pass_running
                or self._pass_scope
                or self.current
            )

    # ------------------------------------------------------------------ thread

    def _loop(self) -> None:
        while not self._stop.is_set():
            with self._cond:
                while not (self._stop.is_set() or self._urgent or self._items or self._pass_scope):
                    self._cond.wait()
                if self._stop.is_set():
                    return
                scope = None
                if not self._urgent and not self._items:
                    scope, self._pass_scope = self._pass_scope, None
                    self._pass_running = scope is not None
            try:
                if scope is not None:
                    self._run_pass(scope)
                else:
                    self._serve()
            except Exception:
                log.exception("Audio analysis failed")
            finally:
                with self._cond:
                    if scope is not None:
                        self._pass_running = False
                    self.current = None

    def _serve(self) -> None:
        """All urgent requests and queued download items (also between files of a pass)."""
        while not self._stop.is_set():
            with self._cond:
                if self._urgent:
                    kind, vid = "waveform", self._urgent.popleft()
                elif self._items:
                    kind, vid = "item", self._items.popleft()
                else:
                    return
                self.current = f"{kind}:{vid}"
            try:
                if kind == "waveform":
                    self._waveform(vid)
                else:
                    self._item(vid)
            finally:
                with self._cond:
                    self.current = None

    def _waveform(self, vid: str) -> None:
        try:
            res = analysis.ensure_peaks(
                self._db, self._settings(), vid, cancel=self._stop, runner=self._runner
            )
        except Exception as exc:
            log.warning("Waveform failed: %s", vid, exc_info=True)
            res = {"ok": False, "id": vid, "error": str(exc)}
        if res.get("cancelled"):
            return
        self._bus.emit("waveform", {"id": vid, **{k: v for k, v in res.items() if k != "id"}})

    def _item(self, vid: str) -> None:
        try:
            res = analysis.process_pending(
                self._db, self._settings(), vid, cancel=self._stop, runner=self._runner
            )
        except Exception as exc:
            log.warning("Analysis failed: %s", vid, exc_info=True)
            res = {"ok": False, "id": vid, "error": str(exc)}
        if res.get("cancelled") or res.get("skipped"):
            return
        if not res.get("ok"):
            log.warning(tr("analysis.item_failed", id=vid, error=res.get("error") or "?"))
        self._bus.emit("media_analysed", res)

    def _run_pass(self, scope: str) -> None:
        self._bus.emit("audio_analysis", {"phase": "start", "scope": scope})
        log.info(tr("analysis.pass_started"))

        def progress(data: dict[str, Any]) -> None:
            self._bus.emit("audio_analysis", {"phase": "progress", "scope": scope, **data})

        def between() -> None:
            self._serve()

        try:
            res = analysis.run_pass(
                self._db,
                self._settings,
                scope=scope,
                progress=progress,
                cancel=_AnyEvent(self._pass_cancel, self._stop),
                between=between,
                item_done=lambda r: self._bus.emit("media_analysed", r),
                runner=self._runner,
            )
        except Exception as exc:
            log.error(tr("analysis.pass_failed", error=exc))
            self._bus.emit(
                "audio_analysis",
                {
                    "phase": "error",
                    "scope": scope,
                    "ok": False,
                    "error": tr("analysis.pass_failed", error=exc),
                },
            )
            return
        if not res.get("ok"):
            log.error(res.get("error") or "")
            self._bus.emit("audio_analysis", {"phase": "error", "scope": scope, **res})
            return
        key = "analysis.pass_cancelled" if res["cancelled"] else "analysis.pass_done"
        log_ok(log, tr(key, n=res["done"], analysed=res["analysed"], failed=res["failed"]))
        self._bus.emit("audio_analysis", {"phase": "done", "scope": scope, **res})


class FingerprintQueue:
    """v0.10.0 re-upload detection (core/fingerprint.py): one daemon thread, one file at a
    time, ffmpeg at lowered priority, never the network.

    1. items after a download (`request`) -> event `reupload` {id, reupload} on a match
    2. one backfill pass over the library (`start_pass`, cancellable) -> events
       `fingerprint` {phase: start|progress|done|error, scope, done, total, found, failed}
       and `reupload` per match; new downloads are served between files of the pass.

    `busy()` (the loudness analysis is working) makes it wait between files, so at most one
    decoding ffmpeg runs at a time."""

    def __init__(
        self,
        db: Any,
        settings_provider: Callable[[], Any],
        bus: EventBus,
        *,
        decoder: Callable[..., Any] | None = None,
        busy: Callable[[], bool] | None = None,
        name: str = "hcloader-fingerprint",
        idle_wait: float = 1.0,
    ) -> None:
        self._db = db
        self._settings = settings_provider
        self._bus = bus
        self._raw_decoder = decoder or fingerprint.decode
        self._decoder = self._decode
        self._decoding: str | None = None  # file ffmpeg reads right now (n2)
        self._drop = threading.Event()
        self._busy = busy or (lambda: False)
        self._name = name
        self._idle_wait = idle_wait
        self._cond = threading.Condition()
        self._items: deque[str] = deque()
        self._pass_scope: str | None = None
        self._pass_running = False
        self._pass_cancel = threading.Event()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self.current: str | None = None

    def start(self) -> None:
        with self._cond:
            if self._thread is None or not self._thread.is_alive():
                self._stop.clear()
                self._thread = threading.Thread(target=self._loop, name=self._name, daemon=True)
                self._thread.start()

    def stop(self, timeout: float = 5.0) -> None:
        self._stop.set()
        self._pass_cancel.set()
        with self._cond:
            self._cond.notify_all()
        thread = self._thread
        if thread is not None and thread.is_alive() and thread is not threading.current_thread():
            thread.join(timeout)

    def request(self, video_id: str) -> None:
        with self._cond:
            if video_id not in self._items:
                self._items.append(video_id)
            self._cond.notify_all()
        self.start()

    def start_pass(self, scope: str = "new") -> bool:
        with self._cond:
            if self._pass_running or self._pass_scope is not None:
                return False
            self._pass_cancel.clear()
            self._pass_scope = "all" if scope == "all" else "new"
            self._cond.notify_all()
        self.start()
        return True

    def cancel_pass(self) -> None:
        with self._cond:
            if self._pass_scope is not None and not self._pass_running:
                scope, self._pass_scope = self._pass_scope, None
                self._bus.emit(
                    "fingerprint",
                    {
                        "phase": "done",
                        "scope": scope,
                        "ok": True,
                        "cancelled": True,
                        "total": 0,
                        "done": 0,
                        "found": 0,
                        "failed": 0,
                    },
                )
            self._pass_cancel.set()

    def pass_running(self) -> bool:
        with self._cond:
            return self._pass_running or self._pass_scope is not None

    def drop(self, video_id: str, path: str | None = None, timeout: float = 3.0) -> None:
        """Review v0.10.0 n2: the item is about to be deleted/moved. Forget a waiting request
        and stop an ffmpeg that reads its file (Windows: an open file cannot be deleted);
        waits up to `timeout` s until it let go. A pass continues with the next file."""
        with self._cond:
            if video_id in self._items:
                self._items.remove(video_id)
            if not path or self._decoding != str(path):
                return
            self._drop.set()
            self._cond.wait_for(lambda: self._decoding != str(path), timeout)

    def _decode(self, path: Any, windows: Any, *, cancel: Any = None) -> Any:
        with self._cond:
            self._decoding = str(path)
            self._drop.clear()
        try:
            ev = _AnyEvent(self._drop, *([cancel] if cancel is not None else []))
            out = self._raw_decoder(path, windows, cancel=ev)
            if out is None and self._drop.is_set() and not (cancel is not None and cancel.is_set()):
                raise fingerprint.FingerprintError(tr("library.not_in_library"), permanent=False)
            return out
        finally:
            with self._cond:
                self._decoding = None
                self._drop.clear()
                self._cond.notify_all()

    def idle(self) -> bool:
        with self._cond:
            return not (self._items or self._pass_running or self._pass_scope or self.current)

    def _loop(self) -> None:
        while not self._stop.is_set():
            with self._cond:
                while not (self._stop.is_set() or self._items or self._pass_scope):
                    self._cond.wait()
                if self._stop.is_set():
                    return
                scope = None
                if not self._items:
                    scope, self._pass_scope = self._pass_scope, None
                    self._pass_running = scope is not None
            try:
                if scope is not None:
                    self._run_pass(scope)
                else:
                    self._serve()
            except Exception:
                log.exception("Fingerprint failed")
            finally:
                with self._cond:
                    if scope is not None:
                        self._pass_running = False
                    self.current = None

    def _yield(self) -> None:
        """Wait while the loudness analysis decodes (one ffmpeg at a time)."""
        while self._busy() and not self._stop.wait(self._idle_wait):
            pass

    def _serve(self) -> None:
        while not self._stop.is_set():
            with self._cond:
                if not self._items:
                    return
                vid = self._items.popleft()
                self.current = vid
            try:
                self._yield()
                self._item(vid)
            finally:
                with self._cond:
                    self.current = None

    def _emit_match(self, res: dict[str, Any], from_pass: bool = False) -> None:
        mark = res.get("reupload")
        if mark:
            data = {"id": mark.get("id"), "reupload": mark}
            if from_pass:
                data["pass"] = True  # the UI shows no toast per match of a library pass
            self._bus.emit("reupload", data)

    def _item(self, vid: str) -> None:
        if not self._settings().reupload.enabled:
            return
        try:
            res = fingerprint.process(
                self._db, self._settings(), vid, cancel=self._stop, decoder=self._decoder
            )
        except Exception as exc:
            log.warning("Fingerprint failed: %s", vid, exc_info=True)
            res = {"ok": False, "id": vid, "error": str(exc)}
        if res.get("cancelled"):
            return
        if not res.get("ok"):
            log.warning(tr("reupload.item_failed", id=vid, error=res.get("error") or "?"))
        self._emit_match(res)

    def _run_pass(self, scope: str) -> None:
        self._bus.emit("fingerprint", {"phase": "start", "scope": scope})
        log.info(tr("reupload.pass_started"))

        def progress(data: dict[str, Any]) -> None:
            self._bus.emit("fingerprint", {"phase": "progress", "scope": scope, **data})

        def between() -> None:
            self._serve()
            self._yield()

        try:
            res = fingerprint.run_pass(
                self._db,
                self._settings,
                scope=scope,
                progress=progress,
                cancel=_AnyEvent(self._pass_cancel, self._stop),
                between=between,
                item_done=lambda r: self._emit_match(r, True),
                decoder=self._decoder,
            )
        except Exception as exc:
            log.error(tr("reupload.pass_failed", error=exc))
            self._bus.emit(
                "fingerprint",
                {
                    "phase": "error",
                    "scope": scope,
                    "ok": False,
                    "error": tr("reupload.pass_failed", error=exc),
                },
            )
            return
        if not res.get("ok"):
            log.error(res.get("error") or "")
            self._bus.emit("fingerprint", {"phase": "error", "scope": scope, **res})
            return
        key = "reupload.pass_cancelled" if res["cancelled"] else "reupload.pass_done"
        log_ok(log, tr(key, n=res["done"], found=res["found"], failed=res["failed"]))
        self._bus.emit("fingerprint", {"phase": "done", "scope": scope, **res})


class _AnyEvent:
    """`is_set()` of several events (pass cancel OR app exit) for code that polls."""

    def __init__(self, *events: threading.Event) -> None:
        self._events = events

    def is_set(self) -> bool:
        return any(e.is_set() for e in self._events)

    def wait(self, timeout: float | None = None) -> bool:
        return self._events[0].wait(timeout) or self.is_set()


class NotificationService:
    """v0.9.0 aggregated Windows notifications of the GUI (core/notify.py).

    `note(...)` collects events in the DB batch and schedules one flush `delay` seconds after
    the last event (a watchlist check that auto-queues downloads and the end of a queue run
    become one toast when they are close together). `tick()` (status ticker) delivers a batch
    that waited for the end of the quiet hours or for the minimum gap - also one left by the
    scheduled headless run. Sending happens in this service's own short-lived thread, never in
    a pywebview callback or the queue thread.
    """

    def __init__(
        self,
        db: Any,
        settings_provider: Callable[[], Any],
        sender_factory: Callable[[], Any],
        *,
        delay: float = 15.0,
        timer_factory: Callable[..., Any] = threading.Timer,
        registrar: Callable[[], Any] | None = None,
    ) -> None:
        self._db = db
        self._settings = settings_provider
        self._sender_factory = sender_factory
        self._delay = delay
        self._timer_factory = timer_factory
        self._registrar = registrar
        self._registered = False
        self._lock = threading.Lock()
        self._timer: Any = None
        self._stopped = False
        self.last: dict[str, Any] | None = None

    def _cfg(self) -> Any:
        return self._settings().notifications

    def note(self, **counts: Any) -> bool:
        from .core import notify

        try:
            added = notify.add(self._db, self._cfg(), **counts)
        except Exception:
            log.debug("Notification not collected", exc_info=True)
            return False
        if added:
            self._schedule(self._delay)
        return added

    def _schedule(self, delay: float) -> None:
        with self._lock:
            if self._stopped:
                return
            if self._timer is not None:
                self._timer.cancel()
            self._timer = self._timer_factory(max(0.0, delay), self.flush)
            self._timer.daemon = True
            self._timer.start()

    def tick(self) -> None:
        """Periodic check (status ticker): deliver a waiting batch once that is allowed."""
        from .core import notify

        with self._lock:
            if self._stopped or self._timer is not None:
                return
        try:
            if notify.has_pending(notify.pending(self._db)):
                self._schedule(0)
        except Exception:
            log.debug("Pending notifications not readable", exc_info=True)

    def flush(self) -> dict[str, Any]:
        from .core import notify

        with self._lock:
            self._timer = None
            if self._stopped:
                return {"sent": False, "reason": "stopped"}
        cfg = self._cfg()
        if cfg.enabled and not self._registered and self._registrar is not None:
            self._registered = True  # once per session (cheap, idempotent)
            try:
                self._registrar()
            except Exception:
                log.debug("Notification registration failed", exc_info=True)
        try:
            res = notify.flush(self._db, cfg, self._sender_factory())
        except Exception:
            log.debug("Notification flush failed", exc_info=True)
            return {"sent": False, "reason": "error"}
        self.last = res
        if res.get("reason") == "gap":
            self._schedule(float(res.get("retry_in") or 1) + 0.5)
        return res

    def stop(self) -> None:
        with self._lock:
            self._stopped = True
            if self._timer is not None:
                self._timer.cancel()
                self._timer = None


class MediaScanQueue:
    """v0.9.0 Plex/Jellyfin library scan after downloads (core/mediaserver.py), batched and
    debounced: every finished download restarts a timer of `media_server.delay_seconds`; when it
    fires, the files collected so far go to the server in one batch (a few requests at most).
    Runs in its own thread; a failure is logged and shown as a toast, never retried."""

    def __init__(
        self,
        db: Any,
        settings_provider: Callable[[], Any],
        secret_provider: Callable[[str], str | None],
        bus: EventBus,
        *,
        transport: Callable[..., Any] | None = None,
        timer_factory: Callable[..., Any] = threading.Timer,
    ) -> None:
        self._db = db
        self._settings = settings_provider
        self._secret = secret_provider
        self._bus = bus
        self._transport = transport
        self._timer_factory = timer_factory
        self._lock = threading.Lock()
        self._run_lock = threading.Lock()
        self._files: list[str] = []
        self._full = False
        self._timer: Any = None
        self._stopped = False

    @property
    def pending(self) -> int:
        with self._lock:
            return len(self._files) + (1 if self._full else 0)

    def add(self, video_id: str) -> bool:
        cfg = self._settings().media_server
        if cfg.type == "off" or not cfg.url:
            return False
        row = self._db.get_video(video_id) or {}
        if not row.get("file_path"):
            return False
        with self._lock:
            if self._stopped:
                return False
            self._files.append(str(row["file_path"]))
            if self._timer is not None:
                self._timer.cancel()
            self._timer = self._timer_factory(float(cfg.delay_seconds), self.fire)
            self._timer.daemon = True
            self._timer.start()
        return True

    def scan_now(self) -> dict[str, Any]:
        """Full scan of the configured library right now (button «Scan now»), synchronous."""
        with self._lock:
            self._full = True
        return self.fire()

    def fire(self) -> dict[str, Any]:
        from .core import mediaserver

        with self._lock:
            self._timer = None
            files, full = self._files, self._full
            self._files, self._full = [], False
        if not files and not full:
            return {"ok": True, "requests": 0}
        settings = self._settings()
        cfg = settings.media_server
        with self._run_lock:  # one batch at a time
            res = run_scan(
                self._db,
                settings,
                self._secret,
                [] if full else files,
                transport=self._transport or mediaserver.urllib_transport,
            )
        self._bus.emit("media_scan", res)
        if not res["ok"]:
            self._bus.toast(res["error"], "warn")
        elif cfg.type != "off":
            log.info(tr("media.scan_done", server=res.get("server", ""), n=res["files"]))
        return res

    def stop(self) -> None:
        with self._lock:
            self._stopped = True
            if self._timer is not None:
                self._timer.cancel()
                self._timer = None


def run_scan(
    db: Any,
    settings: Any,
    secret_provider: Callable[[str], str | None],
    files: list[str],
    *,
    transport: Callable[..., Any],
) -> dict[str, Any]:
    """One scan batch (GUI queue and headless run). `files` empty = full library scan.
    -> {ok, server, files, requests, partial, at} | {ok: false, error, code, ...}; the outcome
    is remembered in `state.media_scan_last` for the settings view."""
    from .core import mediaserver

    cfg = settings.media_server
    out: dict[str, Any] = {
        "server": cfg.type,
        "files": len(files),
        "at": datetime.now(UTC).isoformat(timespec="seconds"),
    }
    try:
        if cfg.type == "off" or not cfg.url:
            raise mediaserver.MediaServerError("config")
        secret = secret_provider(cfg.type)
        if not secret:
            raise mediaserver.MediaServerError("no_secret")
        paths = mediaserver.server_paths(files, settings.target_dir_path(), cfg.server_root)
        res = mediaserver.scan(
            cfg.type,
            cfg.url,
            secret,
            cfg.library,
            paths or [None],
            verify_tls=cfg.verify_tls,
            transport=transport,
        )
        out.update(ok=True, **res)
    except mediaserver.MediaServerError as exc:
        msg = tr("media.scan_failed", error=exc.message())
        log.warning(msg)
        out.update(ok=False, error=msg, code=exc.code)
    except Exception as exc:  # never break the queue/headless run
        msg = tr("media.scan_failed", error=redact(exc))
        log.warning(msg, exc_info=True)
        out.update(ok=False, error=msg, code="error")
    try:
        db.set_state("media_scan_last", json.dumps(out, ensure_ascii=False))
    except Exception:
        log.debug("Scan result not stored", exc_info=True)
    return out
