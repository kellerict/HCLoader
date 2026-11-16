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
- `LogForwarder`: live log records -> `log` events (LogLine).

Nothing here imports pywebview; the window is any object with `evaluate_js(str)`.
"""

from __future__ import annotations

import json
import logging
import os
import queue
import threading
import time
from collections.abc import Callable, Iterator
from concurrent.futures import Future
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from .core import binaries, locks
from .core.discover import format_until
from .core.logging_setup import live_handler
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
                _events_log.debug("Event-Listener fehlgeschlagen", exc_info=True)
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
                    _events_log.debug("evaluate_js fehlgeschlagen: %s", exc)
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
                        result = job.fn()
                    except BaseException as exc:
                        log.exception("Hintergrundauftrag %s fehlgeschlagen", job.key)
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
        idle_interval: float = 30.0,
        progress_interval: float = 0.5,
        monotonic: Callable[[], float] = time.monotonic,
    ) -> None:
        self._db = db
        self._throttle = throttle
        self._bus = bus
        self._factory = client_factory
        self._settings = settings_provider
        self._run_lock = run_lock
        self._on_change = on_change
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
        self._run_limit_hit = False
        self._restart_required = False
        self._busy = False
        self._last_block: str | None = None
        self._thread: threading.Thread | None = None

    # ------------------------------------------------------------------ lifecycle

    def start(self) -> None:
        if self._thread is None or not self._thread.is_alive():
            self._stop.clear()
            self._thread = threading.Thread(target=self._loop, name="hcloader-queue", daemon=True)
            self._thread.start()

    def stop(self, timeout: float = 10.0) -> None:
        """Stop the thread; an active download is aborted and stays `queued` (resumable)."""
        self._stop.set()
        self._cancel.set()
        self._wake.set()
        if self._thread is not None and self._thread.is_alive():
            self._thread.join(timeout)

    def wake(self) -> None:
        """Re-evaluate now (enqueue, resume, backoff lifted, settings changed)."""
        with self._lock:
            self._idle.clear()
            self._wake.set()

    def wait_idle(self, timeout: float = 10.0) -> bool:
        """Tests: wait until the thread has nothing runnable left."""
        return self._idle.wait(timeout)

    def _loop(self) -> None:
        while not self._stop.is_set():
            self._wake.clear()
            try:
                self.run_pending()
            except Exception:
                log.exception("Download-Warteschlange: unerwarteter Fehler")
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
            log.warning("yt-dlp wurde aktualisiert – Downloads erst nach einem Neustart")
        self._changed()

    def blocked(self) -> tuple[str | None, str | None]:
        """(code, German message) why waiting entries do not run, or (None, None).

        code: restart | backoff | day_limit | run_limit | busy (not: paused, see `paused`).
        """
        if self._restart_required:
            return "restart", (
                "Neustart nötig – yt-dlp wurde aktualisiert. Bitte HCLoader neu starten, "
                "die Warteschlange bleibt erhalten"
            )
        th = self._throttle
        until = th.backoff_until()
        if until:
            return "backoff", (
                f"Backoff aktiv bis {format_until(until)} – Rest bleibt in der Warteschlange"
            )
        cfg = th.cfg
        today = th.downloads_today()
        if today >= cfg.max_downloads_per_day:
            return "day_limit", (
                f"Tageslimit erreicht ({today}/{cfg.max_downloads_per_day}) – "
                "Rest bleibt in der Warteschlange"
            )
        if self._run_limit_hit:
            return "run_limit", (
                f"Limit pro Lauf erreicht ({cfg.max_downloads_per_run}/"
                f"{cfg.max_downloads_per_run}) – Rest bleibt in der Warteschlange; "
                "«Fortsetzen» startet einen neuen Lauf"
            )
        if self._busy:
            return "busy", "Ein anderer Download-Lauf ist aktiv (z.B. geplante Prüfung) – wartet"
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
                "target": _target_folder(row, settings),
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
        }

    # ------------------------------------------------------------------ user actions

    def enqueue(self, ids: list[str]) -> list[str]:
        accepted = self._db.enqueue([str(i) for i in ids or []])
        for vid in accepted:
            self._emit_video(vid)
        if accepted:
            log.info("%d Mix(es) zur Warteschlange hinzugefügt", len(accepted))
            self._run_limit_hit = False  # explicit user action = new run
        self._changed()
        self.wake()
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
            log.info("Warteschlange pausiert (laufender Download wird fertig geladen)")
        else:
            self._run_limit_hit = False
            log.info("Warteschlange fortgesetzt")
        self._changed()
        self.wake()
        return paused

    def move(self, video_id: str, delta: int) -> bool:
        ok = self._db.move_in_queue(str(video_id), int(delta))
        if ok:
            self._changed()
        return ok

    def cancel(self, video_id: str) -> bool:
        """Remove an entry. Active/sleeping: abort it (partial files are kept for later)."""
        vid = str(video_id)
        with self._lock:
            if self._current and self._current["id"] == vid:
                self._cancel_target = vid
                self._cancel.set()
                return True
        row = self._db.get_video(vid)
        if not row or row["status"] not in ("queued", "failed"):
            return False
        self._db.dequeue(vid, "new")
        log.info("Aus der Warteschlange entfernt: %s", row.get("title") or vid)
        self._emit_video(vid)
        self._changed()
        return True

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
        if self._paused or self._db.next_queued() is None:
            self._note_block(None)
            return
        code, _ = self.blocked()
        if code and code != "busy":
            self._note_block(code)
            return
        try:
            with run_session(self._throttle, acquire=self._run_lock) as run:
                self._busy = False
                self._session(run)
        except RunBusy:
            self._busy = True
            self._note_block("busy")
            return
        self._note_block(self.blocked()[0] if self._db.next_queued() else None)

    def _note_block(self, code: str | None) -> None:
        if code != self._last_block:
            self._last_block = code
            self._changed()

    def _session(self, run: RunSession) -> None:
        run_id = self._db.start_run("manual")
        downloaded = errors = 0
        note = ""
        client = None
        log.info("Download-Lauf gestartet")
        try:
            client = self._factory()
            while not self._stop.is_set() and not self._paused:
                row = self._db.next_queued()
                if row is None:
                    break
                if self._restart_required:
                    note = self.blocked()[1] or ""
                    break
                block = self._download_block()
                if block:
                    note = block
                    log.warning("Warteschlange angehalten: %s", note)
                    break
                outcome = self._process(client, row)
                if outcome == "done":
                    downloaded += 1
                    run.success = True
                elif outcome == "failed":
                    errors += 1
                elif outcome in ("blocked", "stopped"):
                    note = self._download_block() or ""
                    break
        finally:
            if client is not None:
                try:
                    client.close()
                except Exception:
                    log.debug("YtClient.close", exc_info=True)
            self._set_current(None)
            self._db.finish_run(run_id, downloaded=downloaded, errors=errors, note=note or None)
            log.info("Download-Lauf beendet: %d geladen, %d Fehler", downloaded, errors)
            self._changed()

    def _download_block(self) -> str | None:
        """Throttle verdict incl. the per-run counter of this run; message or None."""
        block = self._throttle.download_block()
        if block is None:
            return None
        if getattr(block, "kind", "") == "downloads_per_run":
            self._run_limit_hit = True
        return self.blocked()[1] or str(block)

    def _process(self, client: Any, row: dict[str, Any]) -> str:
        """One entry. Returns done | failed | cancelled | skipped | slept | blocked | stopped."""
        vid = row["id"]
        title = row.get("title") or vid
        with self._lock:
            self._cancel.clear()
            self._cancel_target = None
        if self._stop.is_set():
            return "stopped"

        wait = self._throttle.download_wait()
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
                self._throttle.wait_between_downloads(self._cancel)
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

        self._set_current(vid, phase="download")
        # YtClient sets 'downloading' in the DB itself; tell the UI (cards) right away
        self._bus.emit(
            "video", {"id": vid, "status": "downloading", "genre": row.get("genre") or _UNSORTED}
        )
        self._changed()
        try:
            result = client.download(
                vid, on_progress=self._progress_hook(vid), cancel_event=self._cancel
            )
        except ThrottleError as exc:  # status restored by YtClient
            log.warning("Download gesperrt: %s", exc)
            return "blocked"
        except Exception as exc:
            log.exception("Download von %s: unerwarteter Fehler", vid)
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
            log_ok(log, "Fertig: %s", title)
            self._emit_video(vid)
            self._bus.emit("done", {"id": vid, "title": title})
            return "done"
        if status == "skipped":
            current = self._db.get_video(vid)
            if current and current["status"] != "done":
                self._db.set_status(vid, "done", error="Bereits im Download-Archiv")
            log.info("Übersprungen (bereits geladen): %s", title)
            self._emit_video(vid)
            return "skipped"
        if status == "cancelled":
            if self._cancel_target == vid:
                self._remove_cancelled(vid, title)
            else:
                self._emit_video(vid)
            return "cancelled"
        error = getattr(result, "error", "") or "Fehler"
        self._bus.emit("failed", {"id": vid, "title": title, "error": error})
        self._emit_video(vid)
        return "failed"

    def _remove_cancelled(self, vid: str, title: str) -> None:
        self._db.dequeue(vid, "new")
        log.warning("Abgebrochen: %s", title)
        self._emit_video(vid)

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


def _target_folder(row: dict[str, Any], settings: Any) -> str:
    """Relative target folder (QueueItem.target), e.g. 'Hardcore\\Partyraiser\\2026\\'."""
    try:
        from .core import paths

        st = settings.storage
        meta = {
            "id": row["id"],
            "title": row.get("title") or row["id"],
            "artist": row.get("channel_name") or "",
            "channel": row.get("channel_name") or "",
            "genre": row.get("genre") or _UNSORTED,
            "upload_date": row.get("upload_date") or "",
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
