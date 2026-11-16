"""Background work and events to the UI.

- `EventBus`: thread-safe `window.mv.emit(type, data)` via `evaluate_js`. Callers only enqueue;
  one dispatcher thread talks to the window, so a log line or a download hook never blocks on
  the WebView (evaluate_js waits for the browser).
- `Worker`: one background thread with a job queue for long operations (yt-dlp update,
  DB backup, PO-token test). Jobs with the same key are de-duplicated.
- `run_session()`: frame for a download run (Phase 3 queue, headless): holds the process-wide
  run lock, resets the per-run counter and calls `Throttle.finish_run(success)` at the end.
- `PotWatchdog`: keeps the bgutil HTTP provider running while `po_token_mode == "http"`.
- `LogForwarder`: live log records -> `log` events (LogLine).

Nothing here imports pywebview; the window is any object with `evaluate_js(str)`.
"""

from __future__ import annotations

import json
import logging
import os
import queue
import threading
from collections.abc import Callable, Iterator
from concurrent.futures import Future
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from .core import binaries, locks
from .core.logging_setup import live_handler

log = logging.getLogger(__name__)

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
_SILENT_LOGGERS = ("pywebview", "app.worker", "urllib3")


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
                log.debug("Event-Listener fehlgeschlagen", exc_info=True)
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
                    log.debug("evaluate_js fehlgeschlagen: %s", exc)
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
                fut.set_exception(RuntimeError("Worker ist beendet"))
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
                        job.future.set_result(job.fn())
                    except BaseException as exc:
                        log.exception("Hintergrundauftrag %s fehlgeschlagen", job.key)
                        job.future.set_exception(exc)
            finally:
                self.current = None
                with self._lock:
                    self._pending.pop(job.key, None)

    def stop(self, timeout: float = 5.0) -> None:
        with self._lock:
            self._stopped = True
            thread = self._thread
        self._queue.put(None)
        if thread is not None and thread.is_alive() and not self.in_worker():
            thread.join(timeout)


# --------------------------------------------------------------------------- download runs


class RunBusy(Exception):
    """Another download run (GUI, headless or smoke) holds the run lock."""

    def __init__(self) -> None:
        super().__init__("Ein anderer Download-Lauf ist aktiv (GUI oder Headless).")


@dataclass
class RunSession:
    success: bool = False


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
            throttle.finish_run(session.success)
        finally:
            lock.release()


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
                                "PO-Token-Server startet nicht (%d Versuche) – bitte prüfen",
                                self._failures,
                            )
                    self._server = server
                    changed = True
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
