"""js_api bridge for pywebview. Method names = `HC.bridge.call('name')` in ui/js/bridge.js.

Thin by design: validation, persistence, status, scheduler, maintenance, search processing live
in `app/core/`; long operations run in `app/worker.py` (maintenance jobs in `Worker`, searches
in a second `Worker`, downloads in `DownloadQueue`); events go through `app/worker.EventBus`.
yt-dlp is imported lazily (first search/download), never at GUI start (Review m2).
pywebview runs every js_api call in its own thread, never in the GUI
thread. Every public method is exposed to JavaScript; internal helpers start with `_` or are
marked with `@_internal` (pywebview skips `_serializable = False`). Contract: docs/bridge-api.md.
"""

from __future__ import annotations

import json
import logging
import re
import sys
import threading
import webbrowser
from collections.abc import Callable
from concurrent.futures import TimeoutError as FutureTimeout
from datetime import datetime
from pathlib import Path
from typing import Any

from .core import (
    analysis,
    artists,
    backfill,
    binaries,
    collector,
    config,
    credentials,
    discover,
    fingerprint,
    i18n,
    library,
    locks,
    logview,
    maintenance,
    mediaserver,
    notify,
    paths,
    platforms,
    playback,
    player,
    playlists,
    potoken,
    scheduler,
    selfupdate,
    series,
    sidecar,
    stats,
    tracklist,
    watchlist,
)
from .core import status as status_mod
from .core.config import Settings
from .core.db import Database
from .core.i18n import tr
from .core.logging_setup import setup_logging
from .core.platforms import file_id
from .core.redact import redact
from .core.throttle import Throttle
from .worker import (
    AnalysisQueue,
    CatchUp,
    CatchUpStep,
    DownloadQueue,
    EventBus,
    FingerprintQueue,
    GateBusy,
    LogForwarder,
    MediaScanQueue,
    NotificationService,
    PotWatchdog,
    Ticker,
    WatchdogPotServer,
    WatchlistScheduler,
    Worker,
    YtdlpGate,
    local_preflight,
    log_ok,
    video_dict,
    wait_while,
)

log = logging.getLogger("hcloader.api")

JOB_TIMEOUT_S = maintenance.UPDATE_TIMEOUT_S + 60
STATUS_INTERVAL_S = 30.0
PO_TEST_TIMEOUT_S = 60
# a flat search is one request (+ request spacing); generous for slow networks / PO token
SEARCH_TIMEOUT_S = 180
# m5: an ffmpeg conversion has no cancel hook; wait this long for the queue thread at exit
QUEUE_STOP_TIMEOUT_S = 60.0
WATCHLIST_STOP_TIMEOUT_S = 10.0  # n5: a cancelled check ends after the current request
# v0.4.0: open «Read everything (once)» backfills continue this long after the app start
BACKFILL_START_DELAY_S = 90.0
# v0.10.1: automatic catch-up passes (festivals, tracklists, loudness, fingerprints) start this
# long after the GUI start, so the first view loads without competition
CATCHUP_START_DELAY_S = 20.0
# v0.9.0: «Test connection» = 2 requests of at most mediaserver.TIMEOUT_S each (+ margin)
MEDIA_TEST_TIMEOUT_S = 2 * mediaserver.TIMEOUT_S + 10
MEDIA_SCAN_TIMEOUT_S = (mediaserver.PLEX_MAX_FOLDERS + 1) * mediaserver.TIMEOUT_S + 10
NOTIFY_TEST_TIMEOUT_S = notify.PS_TIMEOUT_S + 10
NAV_VIEWS = ("discover", "inbox", "watchlist", "downloads", "library", "stats", "log", "settings")
# m2: at the first queue start in HTTP mode, wait this long for the PO-token watchdog
POT_START_WAIT_S = 20.0
# message keys (app/locales), translated when used
_JOB_LABELS = {
    "update": "job.update",
    "update_check": "job.update_check",
    "backup": "job.backup",
    "po_test": "job.po_test",
    "task_check": "job.task_check",
    "festivals": "job.festivals",
    "tracklists": "job.tracklists",
}
_TASK_MOVED = "api.task_moved"
_UPDATE_BUSY = "api.update_busy"
# self-update (docs/decisions.md "Selbst-Update"): a manual check waits at most this long
APP_UPDATE_CHECK_WAIT_S = 30.0
APP_UPDATE_CLOSE_DELAY_S = 0.3  # let apply_update_now() answer before the window closes
_VIDEO_ID_RE = re.compile(r"^[0-9A-Za-z_-]{11}$")


def _internal(fn: Callable) -> Callable:
    """Not exposed to JavaScript (pywebview skips attributes with `_serializable = False`)."""
    fn._serializable = False  # type: ignore[attr-defined]
    return fn


def _run(row: dict[str, Any]) -> dict[str, Any]:
    return logview.run_info(row)


class Api:
    def __init__(
        self,
        *,
        config_file: Path | None = None,
        db: Database | None = None,
        bus: EventBus | None = None,
        worker: Worker | None = None,
        task_scheduler: scheduler.TaskScheduler | None = None,
        watchdog: PotWatchdog | None = None,
        opener: Callable[[Path], None] | None = None,
        revealer: Callable[[Path], None] | None = None,
        browser: Callable[[str], Any] | None = None,
        probe: Callable[..., dict[str, Any]] | None = None,
        update_runner: Callable[..., dict[str, Any]] | None = None,
        update_checker: Callable[[], dict[str, Any]] | None = None,
        run_lock: Callable[[], Any] | None = None,
        watchlist_lock: Callable[[], Any] | None = None,
        backfill_lock: Callable[[], Any] | None = None,
        client_factory: Callable[[], Any] | None = None,
        throttle: Throttle | None = None,
        queue_options: dict[str, Any] | None = None,
        schedule_options: dict[str, Any] | None = None,
        configure_logging: bool = True,
        self_updater: selfupdate.SelfUpdater | None = None,
        secret_store: credentials.SecretStore | None = None,
        notify_sender: Callable[[], Any] | None = None,
        media_transport: mediaserver.Transport | None = None,
        notify_delay: float = 15.0,
        catchup_delay: float = CATCHUP_START_DELAY_S,
    ) -> None:
        self._config_file = config_file or config.config_path()
        settings, warnings = config.load_with_warnings(self._config_file)
        i18n.set_language(settings.general.language)
        for w in warnings:
            log.warning(w)
        self._settings: Settings = settings
        self._lock = threading.RLock()
        self._own_db = db is None
        self._db = db or Database(config.db_path())
        self._throttle = throttle or Throttle(
            self._db,
            lambda: self._settings.throttle,
            platform_settings=config.platform_throttle_settings(lambda: self._settings),
        )
        self._bus = bus or EventBus()
        self._worker = worker or Worker()
        self._search_worker = Worker("hcloader-search")
        self._scheduler = task_scheduler or scheduler.TaskScheduler()
        self._watchdog = watchdog or PotWatchdog(
            lambda: self._settings, on_change=self._on_pot_change
        )
        self._ytdlp_gate = YtdlpGate()
        self._logs = LogForwarder(self._bus)
        self._db.add_run_listener(self._on_run_finished)
        self._open = opener or maintenance.open_in_shell
        self._lib_status: dict[str, Any] | None = None
        self._reveal = revealer or (lambda p: library.reveal(p, opener=self._open))
        self._browser = browser or webbrowser.open
        self._probe = probe or potoken.probe
        self._update_runner = update_runner or maintenance.run_update
        self._update_checker = update_checker or maintenance.check_updates
        self._run_lock = run_lock or locks.acquire_run_lock
        self._watchlist_lock = watchlist_lock or locks.acquire_watchlist_lock
        self._backfill_lock = backfill_lock or locks.acquire_backfill_lock
        self._client_factory = client_factory or self._make_client
        qopts: dict[str, Any] = {"pot_wait": POT_START_WAIT_S, **(queue_options or {})}
        self._queue = DownloadQueue(
            self._db,
            self._throttle,
            self._bus,
            self._client_factory,
            settings_provider=lambda: self._settings,
            run_lock=self._run_lock,
            on_change=self._push,
            preflight=lambda wait, stop: local_preflight(
                self._settings, self._watchdog, wait=wait, stop=stop
            ),
            on_thread_start=self._cleanup_partials,  # n6: in the queue thread, before downloads
            on_done=self._after_download,  # v0.7.0: offline analysis of the new file
            on_session_end=self._on_queue_session_end,  # v0.9.0: one notification per run
            **qopts,
        )
        # v0.7.0 loudness/waveform analysis: own low-priority thread, one file at a time
        self._analysis = AnalysisQueue(self._db, lambda: self._settings, self._bus)
        # v0.10.0 re-upload detection: own low-priority thread, waits while the analysis decodes
        self._fp = FingerprintQueue(
            self._db,
            lambda: self._settings,
            self._bus,
            busy=lambda: not self._analysis.idle(),
        )
        # Watchlist checks: own thread (never blocks maintenance jobs), one check at a time
        self._wl_worker = Worker("hcloader-watchlist")
        self._wl_cancel = threading.Event()
        self._wl_sched = WatchlistScheduler(
            self._db,
            self._throttle,
            lambda: self._settings,
            self._trigger_scheduled_check,
            **(schedule_options or {}),
        )
        # v0.4.0 «Read everything (once)»: own thread (a backfill takes long and must not block
        # watchlist checks), one backfill at a time; per-source stop events (pause/cancel)
        self._bf_worker = Worker("hcloader-backfill")
        self._bf_events: dict[int, threading.Event] = {}
        self._bf_stop = threading.Event()  # app exit
        self._bf_jobs = 0
        self._bf_current: int | None = None  # source read by the backfill thread right now
        self._bf_timer: threading.Timer | None = None
        # Self-update of HCLoader (GitHub releases): own worker, never blocks maintenance jobs
        self._updater = self_updater or selfupdate.SelfUpdater(
            current=maintenance.app_version(),
            repo=lambda: self._settings.maintenance.update_repo,
            update_dir=config.app_home() / "update",
            root=config.app_root(),
            data_dir=config.app_home(),
            logs_dir=config.logs_dir(),
        )
        self._updater.bind(
            lambda st: self._bus.emit("update", st),
            lambda data: self._bus.emit("update_progress", data),
        )
        self._update_worker = Worker("hcloader-selfupdate")
        self._update_result: dict[str, Any] | None = None
        self._apply_requested = False
        self._configure_logging = configure_logging
        self._window: Any = None
        self._po_test: tuple[str, int, dict[str, Any]] | None = None
        self._ticker: Ticker | None = None
        self._loaded_once = False
        self._fest_cancel = threading.Event()
        self._tl_cancel = threading.Event()  # v0.6.0 tracklist pass
        # v0.10.1: one-off passes catch up on existing libraries by themselves (GUI only)
        self._catchup = CatchUp(self._bus, self._catchup_steps(), delay=catchup_delay)
        # v0.5.0 «Festival collector»: matching jobs (one at a time, long: paced searches) and
        # playlist imports (short) in their own threads; per-edition stop events
        self._col_worker = Worker("hcloader-collector")
        self._col_import_worker = Worker("hcloader-collector-import")
        self._col_events: dict[int, threading.Event] = {}
        self._col_stop = threading.Event()  # app exit
        self._col_jobs = 0
        self._col_current: int | None = None
        self._col_timer: threading.Timer | None = None
        self._bus.subscribe(self._on_collector_event)
        # v0.8.0 DJ pages + playlist export: index builds, exports and syncs (local only) in
        # their own thread; `_pl_dirty` makes a sync that is already running go once more
        self._pl_worker = Worker("hcloader-playlists")
        self._pl_dirty = threading.Event()
        # v0.9.0 statistics (file sizes measured once in the background), notifications,
        # Plex/Jellyfin scan (token in the Windows Credential Manager, never in config.yaml)
        self._stats_worker = Worker("hcloader-stats")
        self._sizes_cancel = threading.Event()
        self._secrets: credentials.SecretStore = secret_store or credentials.default_store()
        self._notifier = NotificationService(
            self._db,
            lambda: self._settings,
            notify_sender or notify.default_sender,
            delay=notify_delay,
            registrar=self._register_notifications,
        )
        self._media_transport = media_transport or mediaserver.urllib_transport
        self._media = MediaScanQueue(
            self._db,
            lambda: self._settings,
            self._media_secret,
            self._bus,
            transport=self._media_transport,
        )
        self._ms_worker = Worker("hcloader-mediaserver")
        self._open_view: str | None = None

    # ================================================================== lifecycle (internal)

    @_internal
    def attach_window(self, window: Any) -> None:
        """Bind the pywebview window: events start flowing once the page has loaded."""
        self._window = window
        self._bus.attach(window)
        events = getattr(window, "events", None)
        if events is not None:
            events.loaded += self._on_loaded
            events.closed += self._bus.detach

    @_internal
    def start(self) -> None:
        """Background services: live log, PO-token watchdog, download queue, status ticker."""
        self._logs.start()
        self._worker.start()
        self._watchdog.start()
        self._queue.start()
        self._wl_sched.start()
        self._ticker = Ticker(STATUS_INTERVAL_S, self._tick)
        self._ticker.start()
        self._update_worker.start()
        self._analysis.start()
        self._fp.start()
        try:
            self._update_result = self._updater.take_result()  # outcome of apply_update.ps1
            self._updater.restore()  # an update staged in an earlier session is ready again
        except Exception:
            log.exception("App update state not readable")

    @_internal
    def shutdown(self, queue_timeout: float = QUEUE_STOP_TIMEOUT_S) -> bool:
        """Stop everything. The DB is closed only after the queue thread has ended (m5): an
        active download is cancelled and stays `queued`. If the thread does not end in time
        (long ffmpeg conversion), the DB stays open until the process exits and a row left in
        `downloading` is put back to `queued`. Returns True if the queue thread ended."""
        self._logs.stop()
        self._db.remove_run_listener(self._on_run_finished)
        if self._ticker:
            self._ticker.stop()
        self._wl_sched.stop()
        self._wl_cancel.set()  # n5: reaches the throttle/metadata-lock waits of the check
        self._wl_worker.stop(WATCHLIST_STOP_TIMEOUT_S)
        if self._wl_worker.alive():  # stuck in a request: close its run entry now
            watchlist.close_interrupted(self._db, tr("run.cancelled_exit"))
        self._bf_stop.set()  # v0.4.0: the running backfill stops before its next request
        if self._bf_timer is not None:
            self._bf_timer.cancel()
        for ev in list(self._bf_events.values()):
            ev.set()
        self._bf_worker.stop(WATCHLIST_STOP_TIMEOUT_S)
        backfill.release_running(self._db, tr("backfill.note_interrupted"))
        self._catchup.stop(0)  # v0.10.1: no further catch-up pass starts
        self._fest_cancel.set()  # a running «Assign festivals» pass stops after the current row
        self._tl_cancel.set()  # v0.6.0: a running tracklist pass stops after the current item
        self._col_stop.set()  # v0.5.0: collector job/import stop before their next request
        if self._col_timer is not None:
            self._col_timer.cancel()
        for ev in list(self._col_events.values()):
            ev.set()
        self._col_worker.stop(WATCHLIST_STOP_TIMEOUT_S)
        self._col_import_worker.stop(WATCHLIST_STOP_TIMEOUT_S)
        collector.release_running(self._db, tr("collector.note_interrupted"))
        self._analysis.stop()  # v0.7.0: a running ffmpeg analysis is killed (nothing written)
        self._fp.stop()  # v0.10.0: a running fingerprint decode is killed (nothing stored)
        self._pl_worker.stop()  # v0.8.0: a running playlist export finishes its file first
        self._sizes_cancel.set()  # v0.9.0: size measuring stops after the current batch
        self._stats_worker.stop()
        self._notifier.stop()
        self._media.stop()
        self._ms_worker.stop()
        self._updater.stop()  # a running app-update download is aborted and discarded
        self._update_worker.stop()
        ended = self._queue.stop(queue_timeout)
        self._search_worker.stop()
        self._watchdog.stop()
        self._worker.stop()
        self._bus.close()
        if not ended:
            log.warning(tr("api.exit_converting"))
            try:
                self._db.requeue_downloading()
            except Exception:
                log.debug("requeue_downloading", exc_info=True)
            return False
        if self._own_db:
            self._db.close()
        return True

    def _on_loaded(self) -> None:
        self._bus.mark_ready()
        if not self._loaded_once:
            self._loaded_once = True
            self._startup_update_check()
            self._startup_task_check()
            self._startup_app_update()
            self._startup_backfills()
            self._startup_collector()
            self._startup_analysis()
            self._startup_fingerprints()
            self._catchup.start()  # v0.10.1

    def _on_run_finished(self, row: dict[str, Any]) -> None:
        """A run (watchlist, headless, manual queue) ended: event `run` for the log view."""
        self._bus.emit("run", _run(row))

    def _on_pot_change(self) -> None:
        """Watchdog started/stopped the PO-token server: status bar + queue re-check (m2)."""
        self._push()
        self._queue.wake()

    def _cleanup_partials(self) -> int:
        keep = {
            file_id(v["id"])
            for v in self._db.list_videos(status=("queued", "downloading", "failed"))
        }
        return maintenance.cleanup_stale_partials(paths.tmp_dir(self._cfg.target_dir_path()), keep)

    def _tick(self) -> None:
        """Status ticker: status bar + a notification batch that may be shown now (v0.9.0)."""
        self._push()
        self._notifier.tick()

    @_internal
    def set_open_view(self, view: str | None) -> None:
        """Start view for the first page load (`--open inbox`), see get_settings."""
        self._open_view = view if view in NAV_VIEWS else None

    @_internal
    def open_view(self, view: str | None) -> None:
        """A second start (`--open inbox`, toast click `hcloader://inbox`) asks the running
        window to show a view: event `navigate` (v0.9.0)."""
        if view in NAV_VIEWS:
            self._bus.emit("navigate", {"view": view})

    def _push(self) -> None:
        """Send the current status to the status bar."""
        try:
            self._bus.emit("status", self.get_status())
        except Exception:
            log.debug("Status could not be sent", exc_info=True)

    @property
    def _cfg(self) -> Settings:
        return self._settings

    def _make_client(self) -> Any:
        """YtClient for searches and the queue. Imported lazily: yt-dlp is loaded on first use,
        so an update before that needs no restart (m2). In HTTP mode the watchdog's server is
        used (never a second one on the same port)."""
        from .core.ytclient import YtClient

        return YtClient(
            lambda: self._settings,
            self._db,
            self._throttle,
            pot_server=WatchdogPotServer(self._watchdog),  # type: ignore[arg-type]
        )

    # ================================================================== settings

    def get_settings(self) -> dict[str, Any]:
        # language: `general.language` resolved ("auto" -> Windows display language);
        # open_view (v0.9.0): view requested with --open for this start, handed out once
        out = {
            "values": self._cfg.to_dict(),
            "defaults": config.defaults_dict(),
            "language": i18n.current(),
        }
        with self._lock:
            view, self._open_view = self._open_view, None
        if view:
            out["open_view"] = view
        return out

    def save_settings(self, values: dict[str, Any]) -> dict[str, Any]:
        parsed, errors = config.parse_settings(values)
        if parsed is None:
            return {"ok": False, "errors": errors}
        with self._lock:
            old = self._cfg
            # save first: the Windows task is only changed once the config is safely written (m8)
            try:
                config.save(parsed, self._config_file)
            except OSError as exc:
                msg = tr("api.save_failed", error=exc)
                log.error(msg)
                return {"ok": False, "errors": {"settings": msg}}
            task_errors = self._sync_task(old, parsed)
            if task_errors:
                try:
                    config.save(old, self._config_file)  # roll back
                except OSError as exc:
                    log.error(tr("api.settings_rollback_failed", error=exc))
                return {"ok": False, "errors": task_errors}
            self._settings = parsed
        self._apply(old, parsed)
        log.info(tr("api.settings_saved"))
        return {"ok": True, "values": parsed.to_dict(), "language": i18n.current()}

    def reset_settings(self, section: str | None = None) -> dict[str, Any]:
        with self._lock:
            old = self._cfg
            try:
                fresh = config.reset(old, section or None)
            except KeyError as exc:
                return {"ok": False, "error": str(exc.args[0])}
            # the scheduled task is OS state: create_task/remove_task change it, a reset does not
            fresh.schedule.task_scheduler_enabled = old.schedule.task_scheduler_enabled
            fresh.schedule.task_time = old.schedule.task_time
            try:
                config.save(fresh, self._config_file)
            except OSError as exc:
                msg = tr("api.save_failed", error=exc)
                log.error(msg)
                return {"ok": False, "error": msg}
            self._settings = fresh
        self._apply(old, fresh)
        if section:
            log.warning(tr("api.settings_reset_section", section=section))
        else:
            log.warning(tr("api.settings_reset_all"))
        return {"ok": True}

    def _sync_task(self, old: Settings, new: Settings) -> dict[str, str]:
        """The form's "Aufgabenplanung nutzen" switch / time also change the Windows task."""
        o, n = old.schedule, new.schedule
        try:
            if n.task_scheduler_enabled and (
                not o.task_scheduler_enabled or n.task_time != o.task_time
            ):
                self._scheduler.create(n.task_time)
            elif o.task_scheduler_enabled and not n.task_scheduler_enabled:
                self._scheduler.delete()
        except scheduler.SchedulerError as exc:
            key = (
                "schedule.task_time"
                if o.task_scheduler_enabled == n.task_scheduler_enabled
                else "schedule.task_scheduler_enabled"
            )
            return {key: str(exc)}
        return {}

    def _apply(self, old: Settings, new: Settings) -> None:
        """Make saved settings effective: log level, PO-token server, status bar.
        Throttle and yt-dlp options read the settings live; appearance is applied by the UI."""
        if old.general.language != new.general.language:
            i18n.set_language(new.general.language)  # backend messages follow at once
        if self._configure_logging and old.general.log_level != new.general.log_level:
            setup_logging(new.general.log_level)
        if old.network != new.network:
            self._po_test = None
            self._watchdog.apply()
        # limits, target folder or a failed client may allow the queue to continue (m2/m3)
        self._queue.user_action()
        self._push()

    def _persist(self, **schedule: Any) -> str | None:
        """Store schedule fields; returns a translated error message or None (m8)."""
        with self._lock:
            data = self._cfg.to_dict()
            data["schedule"].update(schedule)
            fresh = Settings.model_validate(data)
            try:
                config.save(fresh, self._config_file)
            except OSError as exc:
                msg = tr("api.save_failed", error=exc)
                log.error(msg)
                return msg
            self._settings = fresh
            return None

    # ================================================================== status / maintenance

    def _po_state(self) -> dict[str, Any]:
        net = self._cfg.network
        state = potoken.quick_state(net.po_token_mode, http_running=self._watchdog.running())
        test = self._po_test
        if (
            test
            and test[0] == net.po_token_mode
            and test[1] == net.po_token_port
            and state["state"] != "error"
        ):
            res = test[2]
            state = {"state": res["state"], "mode": net.po_token_mode, "detail": res["detail"]}
        return state

    def get_status(self) -> dict[str, Any]:
        return status_mod.build_status(
            self._cfg,
            self._throttle,
            self._db,
            po_token=self._po_state(),
            queue_paused=self._queue.paused,
            in_app_next=self._wl_sched.next_check(),
        )

    def _job(self, key: str, fn: Callable[[], dict[str, Any]], timeout: float) -> dict[str, Any]:
        """Run a maintenance job; refuse at once if another one is running (m3)."""
        other = self._maintenance_other(key)
        if other is not None:
            label = (
                tr("job.retag")
                if other.startswith("retag:")
                else (tr(_JOB_LABELS[other]) if other in _JOB_LABELS else other)
            )
            return {"ok": False, "error": tr("api.maintenance_busy", label=label)}
        try:
            return self._worker.run(key, fn, timeout=timeout)
        except FutureTimeout:
            return {
                "ok": False,
                "error": tr("api.job_timeout"),
            }

    def get_versions(self) -> dict[str, Any]:
        info = maintenance.versions_info(
            db_path=Path(self._db.path),
            db_entries=self._db.count_videos(),
            last_update_check=self._db.get_state(maintenance.K_LAST_UPDATE_CHECK),
        )
        info["backups"] = maintenance.list_backups()
        info["restart_required"] = bool(self._queue.restart_required)
        return info

    def update_ytdlp(self) -> dict[str, Any]:
        res = self._job("update", self._do_update, JOB_TIMEOUT_S)
        res.setdefault("output", "")
        return res

    def _do_update(self) -> dict[str, Any]:
        try:
            with self._ytdlp_gate.update():  # n2: no search may start meanwhile
                return self._do_update_locked()
        except GateBusy:
            return {
                "ok": False,
                "error": tr("api.update_search_running"),
                "output": "",
            }

    def _do_update_locked(self) -> dict[str, Any]:
        lock = self._run_lock()
        if lock is None:
            return {
                "ok": False,
                "error": tr("api.update_run_active"),
                "output": "",
            }
        ulog = logging.getLogger("hcloader.update")
        try:
            backfill.stop_for_update(
                self._db
            )  # M3: a headless backfill stops before its next request
            log.info(tr("api.updating_ytdlp"))
            result = self._update_runner(on_line=lambda line: ulog.info("%s", line))
        finally:
            lock.release()
        binaries.clear_cache()
        self._db.set_state(maintenance.K_LAST_UPDATE_CHECK, _now_iso())
        if result.get("ok") and result.get("changed") and "yt_dlp" in sys.modules:
            # the old yt-dlp is loaded in this process: mixing it with the new files (lazy
            # extractor imports) or locked .pyd files on Windows -> no downloads until restart
            self._queue.set_restart_required()
            result["restart_required"] = True
            self._bus.toast(tr("api.ytdlp_updated_restart"), "warn")
        if result.get("ok"):
            log_ok(
                log,
                tr(
                    "api.update_done",
                    ytdlp=result.get("ytdlp"),
                    plugin=result.get("plugin"),
                    state=tr("api.update_state_new")
                    if result.get("changed")
                    else tr("api.update_state_same"),
                ),
            )
        else:
            log.error(tr("api.update_failed", error=result.get("error")))
        self._push()
        return result

    def _startup_update_check(self) -> None:
        """At most once per day, only if enabled; PyPI only (no YouTube)."""
        if not self._cfg.maintenance.check_updates_on_start:
            return
        if not maintenance.update_check_due(self._db.get_state(maintenance.K_LAST_UPDATE_CHECK)):
            return
        self._worker.submit("update_check", self._do_update_check)

    def _startup_task_check(self) -> None:
        """Phase 6: after moving the app (portable, USB stick) the scheduled task still starts
        the old folder. Checked once per GUI start in the worker (schtasks may take seconds)."""
        if not self._cfg.schedule.task_scheduler_enabled or not self._scheduler.available:
            return
        self._worker.submit("task_check", self._do_task_check)

    def _do_task_check(self) -> dict[str, Any]:
        try:
            st = self._scheduler.query(self._cfg.schedule.task_time)
        except scheduler.SchedulerError as exc:
            log.debug("Task check: %s", exc)
            return {"ok": False, "error": str(exc)}
        if st.registered and st.path_mismatch:
            log.warning(
                tr("api.task_moved_log", task=st.task_command, app=config.app_root()),
            )
            self._bus.toast(tr(_TASK_MOVED), "warn")
        return {"ok": True, "path_mismatch": st.path_mismatch}

    def _do_update_check(self) -> dict[str, Any]:
        res = self._update_checker()
        if not res.get("ok"):
            log.warning("%s", res.get("error"))
            return res
        self._db.set_state(maintenance.K_LAST_UPDATE_CHECK, _now_iso())
        newer = [
            f"{'yt-dlp' if k == 'ytdlp' else 'Plugin'} {p['installed'] or '–'} → {p['latest']}"
            for k, p in res.get("packages", {}).items()
            if p.get("newer")
        ]
        if newer:
            msg = tr("api.update_available", packages=", ".join(newer))
            log.warning(msg)
            self._bus.toast(msg, "info")
        else:
            log.info(tr("api.ytdlp_up_to_date"))
        return res

    # ================================================================== app self-update

    def _startup_app_update(self) -> None:
        """Toast for the result of the last update; then one check per start (if enabled).
        GitHub only, no YouTube, no throttle; errors stay in the log."""
        res, self._update_result = self._update_result, None
        if res:
            if res.get("ok"):
                msg = tr("api.app_updated", version=res.get("to_version"))
                log_ok(log, "%s", msg)
                self._bus.toast(msg, "ok")
            else:
                msg = tr(
                    "api.app_update_failed", error=res.get("error") or tr("common.unknown_error")
                )
                msg += (
                    tr("api.app_update_rolled_back")
                    if res.get("rolled_back")
                    else tr("api.app_update_details", log=res.get("log") or "logs/update.log")
                )
                log.error("%s", msg)
                self._bus.toast(msg, "err")
        if self._cfg.maintenance.check_app_updates_on_start:
            self._update_worker.submit("app_update_check", self._updater.check)

    def get_update_status(self) -> dict[str, Any]:
        st = self._updater.status()
        st["apply_on_exit"] = bool(self._cfg.maintenance.apply_update_on_exit)
        return st

    def check_update(self) -> dict[str, Any]:
        """Manual check (maintenance tab). Errors come back as {ok:false, error}."""
        try:
            res = self._update_worker.run(
                "app_update_check_manual",
                lambda: self._updater.check(manual=True),
                timeout=APP_UPDATE_CHECK_WAIT_S,
            )
        except FutureTimeout:
            return {"ok": False, "error": tr("api.update_check_timeout")}
        except RuntimeError as exc:  # worker stopped (app is closing)
            return {"ok": False, "error": str(exc)}
        res["apply_on_exit"] = bool(self._cfg.maintenance.apply_update_on_exit)
        return res

    def download_update(self) -> dict[str, Any]:
        """Start download + preparation in the background; progress via `update_progress`,
        state via `update`. Returns at once."""
        refusal = self._updater.begin_download()
        if refusal:
            return {**self.get_update_status(), "ok": False, "error": refusal}
        self._update_worker.submit("app_update_download", self._updater.download)
        return {**self.get_update_status(), "ok": True}

    def cancel_update(self) -> dict[str, Any]:
        """Abort the download, or drop a prepared update (then nothing is applied on exit)."""
        self._apply_requested = False
        self._updater.cancel()
        return {**self.get_update_status(), "ok": True}

    def get_release_notes(self) -> dict[str, Any]:
        """Release history from the app's own CHANGELOG.md (offline, Maintenance tab)."""
        return {
            "current": self._updater.current,
            "releases": selfupdate.local_release_notes(self._updater.root),
        }

    def open_url(self, url: str) -> dict[str, Any]:
        """Link from the release notes in the system browser (https, github.com / update repo
        host only; selfupdate.open_link)."""
        return selfupdate.open_link(url, self._updater.repo(), self._browser)

    def apply_update_now(self) -> dict[str, Any]:
        """Close the app; after `shutdown` (queue stopped like a normal exit) `main.py` calls
        `finish_update`, which starts the updater with restart."""
        st = self._updater.status()
        if st["blocked"]:
            return {"ok": False, "error": st["blocked"]}
        if st["state"] != "ready":
            return {"ok": False, "error": tr("update.none_ready")}
        self._apply_requested = True
        log.warning(tr("api.closing_for_update", version=st["latest"]))
        if self._window is not None:
            timer = threading.Timer(APP_UPDATE_CLOSE_DELAY_S, self._close_window)
            timer.daemon = True
            timer.start()
        return {"ok": True}

    def _close_window(self) -> None:
        try:
            self._window.destroy()
        except Exception:
            log.exception("Window could not be closed")

    @_internal
    def finish_update(self) -> dict[str, Any] | None:
        """Called by main.py after `shutdown`: start apply_update.ps1 if the user chose
        «Jetzt neu starten» (restart) or an update is ready and `apply_update_on_exit` is on."""
        if self._updater.state != "ready":
            return None
        if selfupdate.session_ending():
            # m1: Windows logs off / shuts down - the updater would be killed mid-way
            log.info(tr("api.update_session_ending"))
            return None
        if self._apply_requested:
            return self._updater.launch(restart=True)
        if self._cfg.maintenance.apply_update_on_exit:
            return self._updater.launch(restart=False)
        log.info(tr("api.update_stays_ready"))
        return None

    def backup_db(self) -> dict[str, Any]:
        return self._job("backup", self._do_backup, JOB_TIMEOUT_S)

    def _do_backup(self) -> dict[str, Any]:
        try:
            path = maintenance.backup_database(Path(self._db.path))
        except Exception as exc:
            log.error(tr("api.backup_failed_log", error=exc))
            return {"ok": False, "error": tr("api.backup_failed", error=exc)}
        self._db.set_state(maintenance.K_LAST_BACKUP, _now_iso())
        log_ok(log, tr("api.backup_done", path=path))
        return {"ok": True, "path": str(path)}

    def open_path(self, kind: str) -> dict[str, Any]:
        targets = {
            "data": config.app_home,
            "target": self._cfg.target_dir_path,
            "logs": config.logs_dir,
        }
        if kind not in targets:
            return {"ok": False, "error": tr("api.unknown_folder", kind=kind)}
        path = targets[kind]()
        try:
            path.mkdir(parents=True, exist_ok=True)
            self._open(path)
        except OSError as exc:
            return {"ok": False, "error": tr("api.folder_open_failed", error=exc)}
        return {"ok": True}

    def pick_folder(self, current: str | None = None) -> dict[str, Any] | None:
        window = self._window
        if window is None:
            return None
        import webview  # lazy: only present in the GUI process

        folder = getattr(getattr(webview, "FileDialog", None), "FOLDER", None)
        if folder is None:
            folder = webview.FOLDER_DIALOG
        start = ""
        if current:
            try:
                start = str(config.expand_path(current))
            except Exception:
                start = ""
        chosen = window.create_file_dialog(folder, directory=start)
        if not chosen:
            return None
        return {"path": str(chosen[0] if isinstance(chosen, (list, tuple)) else chosen)}

    def test_po_token(self) -> dict[str, Any]:
        res = self._job("po_test", self._do_po_test, PO_TEST_TIMEOUT_S)
        if not res.get("ok") and "state" not in res:  # refused / timed out: same shape
            res.update(state="error", detail=res.get("error", ""), ms=0)
        return res

    def _do_po_test(self) -> dict[str, Any]:
        net = self._cfg.network
        res = self._probe(net.po_token_mode, net.po_token_port)
        self._po_test = (net.po_token_mode, net.po_token_port, res)
        if res.get("ok"):
            log_ok(log, tr("api.po_test_ok", ms=res.get("ms"), detail=res.get("detail")))
        elif res.get("state") == "error":
            log.error(tr("api.po_test_failed", detail=res.get("detail")))
        self._push()
        return res

    def clear_backoff(self, platform: str | None = None) -> dict[str, Any]:
        """Lift the backoff of `platform` ('youtube' | 'soundcloud' | 'mixcloud' | 'hearthis');
        none = every platform."""
        if platform not in (None, "", *platforms.PLATFORMS):
            return {"ok": False, "error": tr("api.unknown_platform")}
        targets = [self._throttle.platform(platform)] if platform else self._throttle.platforms()
        for th in targets:
            if th is self._throttle or th.backoff_until() is not None:
                th.clear_backoff_manual()
        self._queue.wake()
        self._push()
        return {"ok": True}

    def get_blacklist(self) -> list[dict[str, Any]]:
        return [
            {"channel_id": b["channel_id"], "channel_name": b["channel_name"], "added": b["added"]}
            for b in self._db.list_blacklist()
        ]

    def unblock_channel(self, channel_id: str) -> dict[str, Any]:
        self._db.remove_from_blacklist(str(channel_id))
        log.info(tr("api.channel_unblocked", channel=channel_id))
        return {"ok": True}

    # ================================================================== scheduled task

    def get_task_status(self) -> dict[str, Any]:
        sched = self._cfg.schedule
        try:
            st = self._scheduler.query(sched.task_time)
        except scheduler.SchedulerError as exc:
            return {
                "registered": False,
                "name": self._scheduler.name,
                "next_run": None,
                "time": sched.task_time,
                "error": str(exc),
            }
        # registered None = unknown (schtasks failed otherwise): never change the config then
        if st.registered is not None and st.registered != sched.task_scheduler_enabled:
            err = self._persist(task_scheduler_enabled=st.registered)  # changed outside
            if err:
                log.warning(tr("api.task_sync_not_saved", error=err))
        return st.to_dict()

    def create_task(self, time: str) -> dict[str, Any]:
        try:
            hhmm = scheduler.validate_time(time)
        except scheduler.SchedulerError as exc:
            return {"ok": False, "error": str(exc)}
        old = self._cfg.schedule
        # save first, create the Windows task only after the config is written (m8)
        err = self._persist(task_scheduler_enabled=True, task_time=hhmm)
        if err:
            return {"ok": False, "error": err}
        try:
            st = self._scheduler.create(hhmm)
        except scheduler.SchedulerError as exc:
            log.error(tr("api.task_error", error=exc))
            self._persist(
                task_scheduler_enabled=old.task_scheduler_enabled, task_time=old.task_time
            )
            return {"ok": False, "error": str(exc)}
        self._push()
        return {"ok": True, **st.to_dict()}

    def remove_task(self) -> dict[str, Any]:
        old = self._cfg.schedule
        err = self._persist(task_scheduler_enabled=False)
        if err:
            return {"ok": False, "error": err}
        try:
            self._scheduler.delete()
        except scheduler.SchedulerUnavailable as exc:
            return {"ok": False, "error": str(exc)}
        except scheduler.SchedulerError as exc:
            log.error(tr("api.task_error", error=exc))
            self._persist(task_scheduler_enabled=old.task_scheduler_enabled)
            return {"ok": False, "error": str(exc)}
        self._push()
        return {"ok": True, "registered": False}

    # ================================================================== log

    def get_log(self, filters: dict[str, Any] | None = None) -> dict[str, Any]:
        """filters (optional): level (minimum), levels, search, limit, kind (runs),
        runs_limit. Lines = live backlog incl. history of the log file."""
        f = filters if isinstance(filters, dict) else {}
        runs = [logview.run_info(r) for r in self._db.list_runs(logview.runs_limit(f))]
        if f.get("kind") in logview.RUN_KINDS:
            runs = [r for r in runs if r["kind"] == f["kind"]]
        return {"lines": logview.filter_lines(self._logs.backlog(), f), "runs": runs}

    # ================================================================== discover / inbox

    def _later(self, phase: str) -> dict[str, Any]:
        self._bus.toast(phase, "info")
        return {"ok": False, "error": phase}

    def get_last_search(self) -> dict[str, Any] | None:
        return discover.last_search(self._db, self._cfg, video_dict=video_dict)

    def search(self, query: str, opts: dict[str, Any] | None = None) -> dict[str, Any]:
        query = str(query or "").strip()
        if not query:
            return {"ok": False, "error": tr("api.query_missing")}
        if self._queue.restart_required:
            return {"ok": False, "error": tr("api.restart_required")}
        if self._ytdlp_gate.updating:
            return {"ok": False, "error": tr(_UPDATE_BUSY)}
        clean = opts if isinstance(opts, dict) else None
        genre, year = discover.clean_options(clean, self._cfg)
        platform = discover.clean_platform(clean)
        if platform is None:
            return {"ok": False, "error": tr("api.unknown_platform")}
        if platform == "soundcloud" and not self._cfg.soundcloud.enabled:
            return {
                "ok": False,
                "error": tr("sc.off_settings"),
            }
        if not self._cfg.platform_enabled(platform):
            label = platforms.label(platform)
            return {"ok": False, "error": tr("platform.off_settings", platform=label)}
        try:
            return self._search_worker.run(
                f"search:{platform}|{query}|{genre}|{year}",
                self._do_search,
                query,
                genre,
                year,
                platform,
                timeout=SEARCH_TIMEOUT_S,
            )
        except FutureTimeout:
            return {"ok": False, "error": tr("api.search_timeout")}

    def _do_search(
        self, query: str, genre: str | None, year: int | None, platform: str = "youtube"
    ) -> dict[str, Any]:
        try:
            with self._ytdlp_gate.search():  # n2: checked and registered atomically
                return self._do_search_locked(query, genre, year, platform)
        except GateBusy:
            return {"ok": False, "error": tr(_UPDATE_BUSY)}

    def _do_search_locked(
        self, query: str, genre: str | None, year: int | None, platform: str = "youtube"
    ) -> dict[str, Any]:
        from .core.ytclient import build_search_query  # lazy: loads yt-dlp (m2)

        settings = self._cfg
        effective = build_search_query(query, genre=genre, year=year, settings=settings)
        client = self._client_factory()
        try:
            res = discover.run_search(
                client,
                self._db,
                self._throttle,
                settings,
                query,
                genre=genre,
                year=year,
                effective_query=effective,
                video_dict=video_dict,
                platform=platform,
            )
        finally:
            client.close()
        self._push()  # search counter / backoff in the status bar
        return res

    def get_inbox(self) -> list[dict[str, Any]]:
        return [
            discover.annotate_duplicate(video_dict(v), self._db, self._cfg)
            for v in self._db.list_videos(status="inbox")
        ]

    def enqueue(self, ids: list[str]) -> dict[str, Any]:
        if not isinstance(ids, (list, tuple)):
            return {"ok": False, "error": tr("api.invalid_selection"), "ids": []}
        accepted = self._queue.enqueue([str(i) for i in ids])
        skipped = len(ids) - len(accepted)
        res: dict[str, Any] = {"ok": True, "ids": accepted}
        if skipped:
            res["skipped"] = skipped
            # QA 7a/8: Go+ previews / geo-blocked tracks are never loadable
            rows = (self._db.get_video(str(i)) for i in ids if str(i) not in accepted)
            unloadable = sum(1 for r in rows if r and (r.get("preview") or r.get("geo_blocked")))
            if unloadable:
                res["skipped_unloadable"] = unloadable
                log.info(tr("api.skipped_unloadable", n=unloadable))
        return res

    def set_video_status(self, video_id: str, status: str) -> dict[str, Any]:
        if status not in ("ignored", "new"):
            return {"ok": False, "error": tr("api.invalid_status", status=status)}
        row = self._db.get_video(video_id)
        if not row:
            return {"ok": False, "error": tr("api.video_unknown")}
        if row["status"] in ("queued", "downloading", "done"):
            return {"ok": False, "error": tr("api.status_locked")}
        self._db.set_status(video_id, status)
        self._bus.emit("video", {"id": video_id, "status": status})
        self._push()
        return {"ok": True}

    def set_genre(self, video_id: str, genre: str) -> dict[str, Any]:
        names = {g.name for g in self._cfg.genres.items}
        if genre not in names:
            return {"ok": False, "error": tr("genre.unknown", genre=genre)}
        row = self._db.get_video(video_id)
        if not row:
            return {"ok": False, "error": tr("api.video_unknown")}
        self._db.set_genre(video_id, genre, manual=True)
        self._bus.emit("video", {"id": video_id, "status": row["status"], "genre": genre})
        return {"ok": True}

    def open_video(self, video_id: str) -> dict[str, Any]:
        vid = str(video_id or "")
        if _VIDEO_ID_RE.match(vid):
            self._browser(f"https://www.youtube.com/watch?v={vid}")
            return {"ok": True}
        url = discover.track_page(self._db, vid)
        if url is None:
            return {"ok": False, "error": tr("api.invalid_video_id")}
        self._browser(url)
        return {"ok": True}

    def suggest_source(self, url_or_query: str, type_hint: str | None = None) -> dict[str, Any]:
        """Name/type/platform for a new source from the URL only (no network); the UI asks
        while typing (debounced)."""
        return watchlist.suggest_source(str(url_or_query or ""), type_hint or None)

    def add_channel_source(self, channel_id: str, channel_name: str = "") -> dict[str, Any]:
        cid = str(channel_id or "").strip()
        platform = platforms.platform_of(cid)
        if platform != "youtube":
            url = discover.channel_page(self._db, cid)
            if url is None:
                if platform == "soundcloud":
                    return {"ok": False, "error": tr("api.sc_user_unknown")}
                return {
                    "ok": False,
                    "error": tr("api.platform_user_unknown", platform=platforms.label(platform)),
                }
        elif re.fullmatch(r"[0-9A-Za-z_-]{3,64}", cid):
            url = f"https://www.youtube.com/channel/{cid}"
        else:
            return {"ok": False, "error": tr("api.invalid_channel_id")}
        for s in self.get_sources():
            if s["url_or_query"].rstrip("/").lower() == url.lower():
                return {"ok": False, "error": tr("api.channel_in_watchlist"), "source": s}
        name = str(channel_name or "").strip() or cid
        # the known channel name from the search: no automatic renaming (name_auto false)
        sid = self._db.add_source(
            "channel", name, url, platform=platform, name_auto=not str(channel_name or "").strip()
        )  # n7: max_entries NULL = default
        log.info(tr("api.channel_watched", channel=name))
        source = next(s for s in self.get_sources() if s["id"] == sid)
        return {"ok": True, "source": source}

    def block_channel(self, channel_id: str, channel_name: str = "") -> dict[str, Any]:
        if not channel_id:
            return {"ok": False, "error": tr("api.channel_id_missing")}
        self._db.add_to_blacklist(str(channel_id), str(channel_name or ""))
        log.info(tr("api.channel_blocked", channel=channel_name or channel_id))
        return {"ok": True}

    # ================================================================== watchlist

    def _source_dict(self, s: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": s["id"],
            "type": s["type"],
            "name": s["name"],
            "url_or_query": s["url_or_query"],
            "default_genre": s.get("default_genre") or None,
            "enabled": bool(s.get("enabled")),
            "auto_download": bool(s.get("auto_download")),
            "max_entries": s.get("max_entries"),
            "newest_last": bool(s.get("newest_last")),
            "platform": s.get("platform") or "youtube",
            "name_auto": bool(s.get("name_auto")),
            "last_checked": s.get("last_checked"),
            "new_count": self._db.count_videos(status="inbox", source_id=s["id"]),
            "item_count": s.get("item_count"),
            "backfill": backfill.view(self._db.get_backfill(s["id"]), self._cfg),
        }

    def get_sources(self) -> list[dict[str, Any]]:
        return [self._source_dict(s) for s in self._db.list_sources()]

    def save_source(self, source: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(source, dict):
            return {"ok": False, "error": tr("api.invalid_source"), "errors": {}}
        clean, errors = watchlist.validate_source(
            source, self._cfg, existing=self._db.list_sources()
        )
        if errors:
            return {"ok": False, "errors": errors}
        raw_id = source.get("id")
        if raw_id in (None, ""):
            sid = self._db.add_source(
                clean.pop("type"), clean.pop("name"), clean.pop("url_or_query"), **clean
            )
            log.info(tr("api.source_added", name=source.get("name")))
        else:
            sid = int(raw_id)
            if self._db.get_source(sid) is None:
                return {"ok": False, "error": tr("api.source_gone"), "errors": {}}
            self._db.update_source(sid, **clean)
            log.info(tr("api.source_saved", name=clean["name"]))
        self._push()  # next planned check may change (first source / enabled flag)
        return {"ok": True, "source": self._source_dict(self._db.get_source(sid))}

    def delete_source(self, source_id: int) -> dict[str, Any]:
        ev = self._bf_events.get(int(source_id))
        if ev is not None:
            ev.set()  # Review v0.4.0 m2: its backfill stops before the next page
        self._db.delete_source(int(source_id))
        self._push()
        return {"ok": True}

    def check_sources(self, ids: list[int] | None = None) -> dict[str, Any]:
        """Start a check in the watchlist thread; progress comes as `source` events and a final
        `watchlist_done`. `started` = number of sources that will be checked."""
        if ids is not None and not isinstance(ids, (list, tuple)):
            return {"ok": False, "error": tr("api.invalid_selection"), "started": 0}
        try:
            wanted = None if ids is None else sorted({int(i) for i in ids})
        except (TypeError, ValueError):
            return {"ok": False, "error": tr("api.invalid_selection"), "started": 0}
        refusal = self._watchlist_refusal()
        if refusal:
            return {"ok": False, "error": refusal, "started": 0}
        sources = self._db.list_sources(enabled_only=wanted is None)
        count = len(sources) if wanted is None else sum(1 for s in sources if s["id"] in wanted)
        if count == 0:
            return {"ok": True, "started": 0}
        self._submit_check(wanted)
        return {"ok": True, "started": count}

    def _watchlist_refusal(self) -> str | None:
        """Why no check may start right now (German), else None."""
        if self._queue.restart_required:
            return tr("api.restart_required")
        if self._ytdlp_gate.updating:
            return tr(_UPDATE_BUSY)
        until = watchlist.blocked_until(self._db, self._throttle, self._cfg)
        if until:
            return tr("api.watchlist_backoff", until=discover.format_until(until))
        return None

    @staticmethod
    def _check_key(ids: list[int] | None) -> str:
        return "watchlist:all" if ids is None else "watchlist:" + ",".join(map(str, ids))

    def _submit_check(self, ids: list[int] | None, *, scheduled: bool = False) -> None:
        self._wl_worker.submit(self._check_key(ids), self._do_watchlist, ids, scheduled=scheduled)

    def _trigger_scheduled_check(self) -> bool:
        """In-app interval (WatchlistScheduler): start a full check unless one is queued/running
        or something forbids it. Never during a backoff, a yt-dlp update or a headless run."""
        if self._watchlist_refusal() or self._wl_worker.busy(self._check_key(None)):
            return False
        log.info(tr("api.scheduled_check"))
        self._submit_check(None, scheduled=True)
        return True

    def _do_watchlist(self, ids: list[int] | None, *, scheduled: bool = False) -> dict[str, Any]:
        lock = self._watchlist_lock()
        if lock is None and scheduled:  # m2: the headless task checks right now - quietly later
            retry = self._wl_sched.defer()
            log.debug("Watchlist lock busy (task running) – next attempt from %s", retry)
            self._push()
            return {"ok": False, "deferred": True}
        if lock is None:  # a headless run checks right now
            msg = tr("watchlist.busy_other")
            log.warning(msg)
            self._bus.toast(msg, "warn")
            self._bus.emit("watchlist_done", {"checked": 0, "found": 0})
            return {"ok": False, "error": msg}
        result = watchlist.WatchlistResult()
        try:
            with self._ytdlp_gate.search():  # no yt-dlp update meanwhile (n2)
                client = self._client_factory()
                try:
                    result = watchlist.check_all(
                        client=client,
                        db=self._db,
                        throttle=self._throttle,
                        settings=self._cfg,
                        ids=ids,
                        enqueue=lambda vids: self._queue.enqueue(vids, auto=True),
                        on_source=lambda payload: self._bus.emit("source", payload),
                        cancel=self._wl_cancel,
                    )
                finally:
                    client.close()
        except GateBusy:
            self._bus.toast(tr(_UPDATE_BUSY), "warn")
        except Exception as exc:
            log.exception(tr("watchlist.check_failed"))
            self._bus.toast(tr("watchlist.check_failed_error", error=redact(exc)), "err")
        finally:
            lock.release()
        if result.backoff:
            self._bus.toast(tr("watchlist.aborted", error=result.note), "warn")
        checked = result.checked + result.errors  # sources processed (checked or failed)
        self._bus.emit(
            "watchlist_done", {"checked": checked, "found": result.found, "inbox": result.inbox}
        )
        if result.inbox:
            self._notifier.note(new_sets=result.inbox)  # v0.9.0
        self._push()
        if not result.backoff and not result.cancelled:
            self._resume_backfills()  # v0.4.0: open backfills continue after a check
        return {"ok": True, "checked": checked, "found": result.found}

    # ================================================================== backfill (v0.4.0)

    def estimate_backfill(self, source_id: int) -> dict[str, Any]:
        """Requests/time of «Read everything (once)» for the confirmation dialog (no network)."""
        source = self._source_row(source_id)
        reason = backfill.refusal(source, self._cfg)
        if reason:
            return {"ok": False, "error": reason}
        return backfill.estimate(source, self._db, self._cfg)  # type: ignore[arg-type]

    def start_backfill(self, source_id: int) -> dict[str, Any]:
        """Start or resume «Read everything (once)» in the backfill thread; progress comes as
        `backfill` events. Refused for search sources, during a backoff of the platform, a
        yt-dlp update or when a restart is required."""
        source = self._source_row(source_id)
        reason = backfill.refusal(source, self._cfg)
        if reason is None and self._queue.restart_required:
            reason = tr("api.restart_required")
        if reason is None and self._ytdlp_gate.updating:
            reason = tr(_UPDATE_BUSY)
        if reason is None:
            platform = source.get("platform") or "youtube"  # type: ignore[union-attr]
            until = self._throttle.platform(platform).backoff_until()
            if until is not None:
                reason = tr("api.watchlist_backoff", until=discover.format_until(until))
        if reason:
            return {"ok": False, "error": reason}
        sid = int(source["id"])  # type: ignore[index]
        row = self._db.get_backfill(sid)
        if row and row["state"] == "running" and self._bf_current == sid:
            # already being read (double click / second window): nothing to change
            return {"ok": True, "backfill": backfill.view(row, self._cfg)}
        if row and row["state"] == "running" and self._bf_current is None:
            # Review v0.4.0 m1: `running` and not ours - another process (headless) may read it
            probe = self._backfill_lock()
            if probe is None:
                return {"ok": False, "error": tr("api.backfill_busy")}
            probe.release()  # stale row of a crashed process: start/resume it here
        backfill.request(self._db, sid)
        self._emit_backfill(sid)
        self._submit_backfill([sid])
        return {"ok": True, "backfill": backfill.view(self._db.get_backfill(sid), self._cfg)}

    def pause_backfill(self, source_id: int) -> dict[str, Any]:
        return self._stop_backfill(source_id, backfill.pause)

    def cancel_backfill(self, source_id: int) -> dict[str, Any]:
        return self._stop_backfill(source_id, backfill.cancel)

    def _stop_backfill(
        self, source_id: int, change: Callable[[Database, int], bool]
    ) -> dict[str, Any]:
        try:
            sid = int(source_id)
        except (TypeError, ValueError):
            return {"ok": False, "error": tr("api.invalid_source")}
        if self._db.get_backfill(sid) is None:
            return {"ok": False, "error": tr("api.backfill_none")}
        change(self._db, sid)
        ev = self._bf_events.get(sid)
        if ev is not None:
            ev.set()  # the running backfill stops before its next request
        self._emit_backfill(sid)
        return {"ok": True, "backfill": backfill.view(self._db.get_backfill(sid), self._cfg)}

    def _source_row(self, source_id: Any) -> dict[str, Any] | None:
        try:
            return self._db.get_source(int(source_id))
        except (TypeError, ValueError):
            return None

    def _emit_backfill(self, sid: int) -> None:
        data = backfill.view(self._db.get_backfill(sid), self._cfg)
        self._bus.emit("backfill", data or {"source_id": sid, "state": "none"})

    def _bf_event(self, sid: int) -> threading.Event:
        ev = threading.Event()
        if self._bf_stop.is_set():
            ev.set()
        self._bf_events[sid] = ev
        self._bf_current = sid
        return ev

    def _submit_backfill(self, ids: list[int] | None) -> None:
        if ids is None:
            if not self._bf_worker.busy("backfill:open"):
                self._bf_worker.submit("backfill:open", self._do_backfill, None)
            return
        self._bf_jobs += 1  # own key: a resume right after a pause must not be swallowed
        self._bf_worker.submit(f"backfill:{self._bf_jobs}", self._do_backfill, ids)

    def _resume_backfills(self) -> None:
        """Continue open backfills (app start, after a watchlist check). Interrupted ones only;
        paused ones wait for the user. Sources in backoff are skipped without a request."""
        if self._bf_stop.is_set() or not backfill.open_ids(self._db):
            return
        self._submit_backfill(None)

    def _startup_backfills(self) -> None:
        if not backfill.open_ids(self._db):
            return
        timer = threading.Timer(BACKFILL_START_DELAY_S, self._resume_backfills)
        timer.daemon = True
        self._bf_timer = timer
        timer.start()

    def _do_backfill(self, ids: list[int] | None) -> dict[str, Any]:
        lock = self._backfill_lock()
        if lock is None:  # a headless run reads a source right now
            msg = tr("api.backfill_busy")
            log.warning(msg)
            if ids is not None:
                self._bus.toast(msg, "warn")
            return {"ok": False, "error": msg}
        results: list[backfill.BackfillResult] = []
        try:
            with self._ytdlp_gate.search():  # no yt-dlp update meanwhile (n2)
                client = self._client_factory()
                try:
                    results = backfill.continue_open(
                        client=client,
                        db=self._db,
                        throttle=self._throttle,
                        settings=self._cfg,
                        ids=ids,
                        cancel_for=self._bf_event,
                        on_progress=lambda data: self._bus.emit("backfill", data),
                        stop=self._bf_stop,
                    )
                finally:
                    client.close()
        except GateBusy:
            self._bus.toast(tr(_UPDATE_BUSY), "warn")
        except Exception as exc:
            log.exception(tr("backfill.failed", error=redact(exc)))
            self._bus.toast(tr("backfill.failed", error=redact(exc)), "err")
        finally:
            self._bf_current = None
            lock.release()
            for sid in ids or []:
                self._emit_backfill(sid)  # also when nothing ran (busy, refused)
        if any(r.found or r.added for r in results):
            self._push()  # inbox badge
        return {"ok": True, "ran": sum(1 for r in results if not r.skipped)}

    # ================================================================== festival collector (v0.5.0)

    def get_collector_editions(self) -> list[dict[str, Any]]:
        """Editions with a checklist, with stats and matching job; offline."""
        return collector.list_editions(self._db)

    def open_collector_edition(self, data: dict[str, Any] | None) -> dict[str, Any]:
        """Create (or open) the checklist of an edition: {edition_id} | {series_id, year,
        variant?}."""
        return self._col(
            lambda: {"edition": collector.summary(self._db, collector.open_edition(self._db, data))}
        )

    def delete_checklist(self, edition_id: int) -> dict[str, Any]:
        def run() -> dict[str, Any]:
            eid = int(collector.require_edition(self._db, edition_id)["id"])
            self._stop_matching(eid)
            return {"deleted": collector.delete_checklist(self._db, eid)}

        return self._col(run)

    def get_checklist(self, edition_id: int) -> dict[str, Any]:
        return self._col(lambda: collector.get_checklist(self._db, edition_id))

    def parse_timetable(self, text: str) -> dict[str, Any]:
        """Preview of a pasted timetable (nothing stored): {ok, rows, skipped, days, stages,
        csv}."""
        return {"ok": True, **collector.parse_text(self._db, self._cfg, str(text or ""))}

    def import_timetable(self, edition_id: int, data: Any) -> dict[str, Any]:
        """Pasted text or the edited preview rows -> checklist rows (+ free offline match)."""

        def run() -> dict[str, Any]:
            res = collector.import_timetable(self._db, self._cfg, edition_id, data)
            self._emit_col_rows(int(edition_id), res["ids"])
            return res

        return self._col(run)

    def get_timetable_files(self) -> list[dict[str, Any]]:
        """Timetable files shipped with the app (app/data/timetables)."""
        return collector.list_files(self._db)

    def import_timetable_file(self, file: str) -> dict[str, Any]:
        def run() -> dict[str, Any]:
            res = collector.import_file(self._db, self._cfg, str(file or ""))
            self._emit_col_rows(res["edition_id"], res["ids"])
            return res

        return self._col(run)

    def import_checklist_playlist(self, edition_id: int, url: str) -> dict[str, Any]:
        """Read the organiser playlist once (thread `hcloader-collector-import`, Throttle);
        progress as `collector_import` events."""

        def run() -> dict[str, Any]:
            eid = int(collector.require_edition(self._db, edition_id)["id"])
            norm = collector.check_playlist_url(url, self._cfg)
            reason = self._collector_refusal(norm)
            if reason:
                return {"ok": False, "error": reason}
            if self._col_import_worker.busy(f"import:{eid}"):
                return {"started": False, "running": True}
            self._col_import_worker.submit(f"import:{eid}", self._do_col_import, eid, norm)
            return {"started": True, "url": norm}

        return self._col(run)

    def add_checklist_row(self, edition_id: int, data: dict[str, Any]) -> dict[str, Any]:
        def run() -> dict[str, Any]:
            rid = collector.add_row(self._db, edition_id, data)
            eid = int(edition_id)
            collector.match_offline(self._db, self._cfg, eid, [rid])
            row = collector.get_rows(self._db, eid, [rid])
            self._emit_col_rows(eid, [])
            return {"row": row[0] if row else None}

        return self._col(run)

    def update_checklist_row(self, row_id: int, data: dict[str, Any]) -> dict[str, Any]:
        def run() -> dict[str, Any]:
            row = collector.update_row(self._db, row_id, data)
            eid = int(row["edition_id"])
            collector.match_offline(self._db, self._cfg, eid, [row["id"]])
            retag = []
            if row.get("video_id") and row.get("confirmed"):
                fresh = collector.row_by_id(self._db, row["id"])
                if fresh["status"] in ("queued", "downloaded") and collector.apply_row_values(
                    self._db, fresh
                ):
                    if fresh["status"] == "downloaded":
                        retag.append(fresh["video_id"])
            self._submit_col_retag(eid, retag)
            out = collector.get_rows(self._db, eid, [row["id"]])
            self._emit_col_rows(eid, [])
            return {"row": out[0] if out else None, "retag": len(retag)}

        return self._col(run)

    def delete_checklist_rows(self, row_ids: list[int]) -> dict[str, Any]:
        def run() -> dict[str, Any]:
            by_ed = collector.delete_rows(self._db, row_ids)
            for eid, ids in by_ed.items():
                self._emit_col_rows(eid, [], deleted=ids)
            return {"deleted": sum(len(v) for v in by_ed.values())}

        return self._col(run)

    def set_checklist_checked(self, row_ids: list[int], checked: bool) -> dict[str, Any]:
        return self._col_flag(row_ids, "checked", checked)

    def set_checklist_ignored(self, row_ids: list[int], ignored: bool) -> dict[str, Any]:
        return self._col_flag(row_ids, "ignored", ignored)

    def confirm_checklist_match(
        self, row_id: int, video_id: str | None = None, reject: bool = False
    ) -> dict[str, Any]:
        """Accept the match or a candidate (`video_id`), or drop it (`null`, `reject`: never
        propose that video for the row again)."""

        def run() -> dict[str, Any]:
            row = collector.confirm_match(self._db, row_id, video_id, reject=bool(reject))
            eid = int(row["edition_id"])
            out = collector.get_rows(self._db, eid, [row["id"]])
            self._emit_col_rows(eid, [])
            return {"row": out[0] if out else None}

        return self._col(run)

    def estimate_checklist_matching(
        self, edition_id: int, opts: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Requests/time of the matching job (no network; runs the free library match)."""
        restart = bool((opts or {}).get("restart")) if isinstance(opts, dict) else False

        def run() -> dict[str, Any]:
            res = collector.estimate(
                self._db, self._cfg, self._throttle, edition_id, restart=restart
            )
            if res.get("matched_offline"):
                self._emit_col_rows(int(res["edition_id"]), [])
            return res

        return self._col(run)

    def start_checklist_matching(
        self, edition_id: int, opts: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Start/continue the matching job in thread `hcloader-collector`; progress as
        `collector_job`, row changes as `collector_rows` events."""
        restart = bool((opts or {}).get("restart")) if isinstance(opts, dict) else False

        def run() -> dict[str, Any]:
            eid = int(collector.require_edition(self._db, edition_id)["id"])
            reason = self._collector_refusal(None)
            if reason:
                return {"ok": False, "error": reason}
            job = collector.get_job(self._db, eid)
            if job and job["state"] == "running" and self._col_current == eid:
                return {"job": job}
            collector.match_offline(self._db, self._cfg, eid)
            job = collector.request_job(self._db, eid, restart=restart)
            if not job or job["total"] <= job["done"]:
                collector.update_job(self._db, eid, job_state="done", job_finished=_now_iso())
                self._emit_col_job(eid)
                self._emit_col_rows(eid, [])
                return {"job": collector.get_job(self._db, eid), "nothing": True}
            self._emit_col_job(eid)
            self._submit_matching(eid)
            return {"job": collector.get_job(self._db, eid)}

        return self._col(run)

    def cancel_checklist_matching(self, edition_id: int) -> dict[str, Any]:
        def run() -> dict[str, Any]:
            eid = int(collector.require_edition(self._db, edition_id)["id"])
            self._stop_matching(eid)
            self._emit_col_job(eid)
            return {"job": collector.get_job(self._db, eid)}

        return self._col(run)

    def queue_checklist(self, edition_id: int, row_ids: list[int] | None = None) -> dict[str, Any]:
        """Queue the checked + confirmed rows (all, or `row_ids`); normal sequential queue."""

        def run() -> dict[str, Any]:
            res = collector.queue_rows(self._db, edition_id, row_ids)
            queued = self._queue.enqueue(res["video_ids"]) if res["video_ids"] else []
            eid = int(edition_id)
            self._submit_col_retag(eid, res["retag"])
            self._emit_col_rows(eid, [])
            self._push()
            return {"queued": queued, "retag": len(res["retag"]), "skipped": res["skipped"]}

        return self._col(run)

    # -- collector helpers (internal)

    def _col(self, fn: Callable[[], dict[str, Any]]) -> dict[str, Any]:
        try:
            res = fn()
        except collector.CollectorError as exc:
            return {"ok": False, "errors": exc.errors, "error": str(exc)}
        return res if res.get("ok") is not None else {"ok": True, **res}

    def _col_flag(self, row_ids: Any, flag: str, value: Any) -> dict[str, Any]:
        by_ed = collector.set_flag(self._db, row_ids, flag, bool(value))
        for eid, ids in by_ed.items():
            self._emit_col_rows(eid, ids)
        return {"ok": True, "changed": sum(len(v) for v in by_ed.values())}

    def _collector_refusal(self, url: str | None) -> str | None:
        if self._queue.restart_required:
            return tr("api.restart_required")
        if self._ytdlp_gate.updating:
            return tr(_UPDATE_BUSY)
        platform = (url and platforms.url_platform(url)) or "youtube"
        until = self._throttle.platform(platform).backoff_until()
        if until is not None:
            return tr("api.watchlist_backoff", until=discover.format_until(until))
        return None

    def _emit_col_rows(self, eid: int, ids: list[int], *, deleted: list[int] | None = None) -> None:
        """Event `collector_rows`: changed rows (empty `rows` + `reload`: fetch the checklist)."""
        try:
            rows = collector.get_rows(self._db, eid, ids) if ids else []
            self._bus.emit(
                "collector_rows",
                {
                    "edition_id": eid,
                    "rows": rows,
                    "deleted": list(deleted or []),
                    "reload": not ids and not deleted,
                    "stats": collector.stats(self._db, eid),
                },
            )
        except Exception:
            log.debug("collector_rows event failed", exc_info=True)

    def _emit_col_job(self, eid: int) -> None:
        job = collector.get_job(self._db, eid) or {"edition_id": eid, "state": "none"}
        self._bus.emit("collector_job", {**job, "stats": collector.stats(self._db, eid)})

    def _on_collector_event(self, event_type: str, data: Any) -> None:
        """Downloads change row states (queued -> downloaded): `collector_rows` for them."""
        if event_type not in ("video", "done", "failed") or not isinstance(data, dict):
            return
        vid = data.get("id")
        if not vid:
            return
        for eid, ids in collector.rows_for_videos(self._db, [str(vid)]).items():
            self._emit_col_rows(eid, ids)

    def _col_event(self, eid: int) -> threading.Event:
        ev = threading.Event()
        if self._col_stop.is_set():
            ev.set()
        self._col_events[eid] = ev
        return ev

    def _stop_matching(self, eid: int) -> None:
        collector.cancel_job(self._db, eid)
        ev = self._col_events.get(eid)
        if ev is not None:
            ev.set()

    def _submit_matching(self, eid: int) -> None:
        self._col_jobs += 1  # own key: a restart right after a cancel must not be swallowed
        self._col_worker.submit(f"match:{self._col_jobs}", self._do_matching, eid)

    def _startup_collector(self) -> None:
        if not collector.open_jobs(self._db):
            return
        timer = threading.Timer(BACKFILL_START_DELAY_S, self._resume_collector)
        timer.daemon = True
        self._col_timer = timer
        timer.start()

    def _resume_collector(self) -> None:
        """Interrupted matching jobs (app exit, backoff) continue after the app start."""
        if self._col_stop.is_set():
            return
        for eid in collector.open_jobs(self._db):
            if self._collector_refusal(None) is None:
                self._submit_matching(eid)

    def _do_matching(self, eid: int) -> dict[str, Any]:
        res = None
        try:
            with self._ytdlp_gate.search():  # no yt-dlp update meanwhile
                client = self._client_factory()
                try:
                    self._col_current = eid
                    res = collector.run_job(
                        eid,
                        client=client,
                        db=self._db,
                        settings=self._cfg,
                        throttle=self._throttle,
                        cancel=self._col_event(eid),
                        on_progress=lambda job: self._bus.emit(
                            "collector_job", {**job, "stats": collector.stats(self._db, eid)}
                        ),
                        on_rows=self._emit_col_rows,
                    )
                finally:
                    self._col_current = None
                    client.close()
        except GateBusy:
            self._bus.toast(tr(_UPDATE_BUSY), "warn")
        except Exception as exc:
            log.exception(tr("collector.job_failed", error=redact(exc)))
            self._bus.toast(tr("collector.job_failed", error=redact(exc)), "err")
        finally:
            self._emit_col_job(eid)
        self._push()
        return {"ok": True, "state": res.state if res else None}

    def _do_col_import(self, eid: int, url: str) -> dict[str, Any]:
        res = None
        try:
            with self._ytdlp_gate.search():
                client = self._client_factory()
                try:
                    res = collector.import_playlist(
                        eid,
                        url,
                        client=client,
                        db=self._db,
                        settings=self._cfg,
                        cancel=self._col_stop,
                        on_progress=lambda d: self._bus.emit("collector_import", d),
                    )
                finally:
                    client.close()
        except GateBusy:
            self._bus.emit(
                "collector_import",
                {
                    "phase": "error",
                    "kind": "playlist",
                    "edition_id": eid,
                    "error": tr(_UPDATE_BUSY),
                },
            )
        except Exception as exc:
            msg = tr("collector.playlist_failed", error=redact(exc))
            log.exception(msg)
            self._bus.emit(
                "collector_import",
                {"phase": "error", "kind": "playlist", "edition_id": eid, "error": msg},
            )
        if res is not None:
            collector.match_offline(self._db, self._cfg, eid)
        self._emit_col_rows(eid, [])
        self._push()
        return {"ok": res is not None and not res.error}

    def _submit_col_retag(self, eid: int, video_ids: list[str]) -> None:
        """Downloaded rows whose festival values changed: retag in the maintenance worker."""
        if not video_ids:
            return
        ids = list(video_ids)

        def job() -> dict[str, Any]:
            done = 0
            for vid in ids:
                if self._do_retag(vid).get("ok"):
                    done += 1
            log_ok(log, tr("collector.retagged", n=done))
            return {"ok": True, "retagged": done}

        self._worker.submit(f"collector-retag:{eid}:{','.join(ids)}", job)

    # ================================================================== downloads

    def get_queue(self) -> dict[str, Any]:
        return self._queue.snapshot()

    def set_queue_paused(self, paused: bool) -> dict[str, Any]:
        return {"ok": True, "paused": self._queue.set_paused(bool(paused))}

    def queue_move(self, video_id: str, delta: int) -> dict[str, Any]:
        try:
            step = int(delta)
        except (TypeError, ValueError):
            return {"ok": False, "error": tr("api.invalid_direction")}
        if self._queue.move(str(video_id), step):
            return {"ok": True}
        return {"ok": False, "error": tr("api.only_waiting_move")}

    def queue_cancel(self, video_id: str) -> dict[str, Any]:
        res = self._queue.cancel(str(video_id))
        if res == "ok":
            return {"ok": True}
        if res == "late":
            return {"ok": False, "error": tr("api.download_finished")}
        return {"ok": False, "error": tr("api.not_in_queue")}

    def queue_retry(self, video_id: str) -> dict[str, Any]:
        if self._queue.retry(str(video_id)):
            return {"ok": True}
        return {"ok": False, "error": tr("api.only_failed_retry")}

    # ================================================================== library

    def get_library(self, filters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        """filters (optional): search, genre, channel (id or name), year, missing.

        The target folder is checked once per call (with a timeout). If it is unreachable, files
        below it get `unknown: true` instead of `missing: true`; see `get_library_status`."""
        root = self._cfg.target_dir_path()
        ok = library.target_reachable(root)
        self._lib_status = {"target_ok": ok, "target": str(root)}
        f = filters if isinstance(filters, dict) else None
        items = library.list_library(self._db, f, root=root, root_ok=ok)
        # v0.10.0: «probable re-upload of X» (+ state of the original, review M1)
        return library.annotate_reuploads(
            self._db, items, root, ok, only_open=bool(f and f.get("reupload"))
        )

    def get_library_status(self) -> dict[str, Any]:
        """{target_ok, target}: result of the last `get_library` check (fresh check if none yet)."""
        st = self._lib_status
        if st is None or st["target"] != str(self._cfg.target_dir_path()):
            root = self._cfg.target_dir_path()
            st = {"target_ok": library.target_reachable(root), "target": str(root)}
            self._lib_status = st
        return dict(st)

    def open_folder(self, video_id: str) -> dict[str, Any]:
        row = self._db.get_video(str(video_id))
        if not row or not row.get("file_path"):
            return {"ok": False, "error": tr("api.no_file")}
        path = Path(row["file_path"])
        if not path.parent.is_dir():
            return {"ok": False, "error": tr("api.folder_missing", path=path.parent)}
        try:
            self._reveal(path)
        except OSError as exc:
            return {"ok": False, "error": tr("api.folder_open_failed", error=exc)}
        return {"ok": True}

    def get_media(self, video_id: str) -> dict[str, Any]:
        """Data for the built-in player (file: URL, cover, chapters); local only, no network."""
        return player.get_media(self._db, self._cfg, str(video_id))

    def play_external(self, video_id: str) -> dict[str, Any]:
        """Open the file in the system's default player."""
        return player.play_external(self._db, self._cfg, str(video_id))

    def retag(self, video_id: str) -> dict[str, Any]:
        """Tags, cover, CUE/CHAP from sidecar + current settings, file moved to the current
        path template; no network. Runs in the maintenance worker (never in the GUI thread)."""
        vid = str(video_id)
        res = self._job(f"retag:{vid}", lambda: self._do_retag(vid), JOB_TIMEOUT_S)
        return res

    def _do_retag(self, vid: str) -> dict[str, Any]:
        res = library.retag(self._db, self._cfg, vid)
        if res.get("ok"):
            self._bus.emit("video", {"id": vid, "status": "done", "genre": res.get("genre")})
        return res

    def delete_library_item(self, video_id: str, delete_file: bool = True) -> dict[str, Any]:
        """Datei + CUE (+ leere Ordner) löschen, Eintrag auf `ignored`. Bestätigung: UI."""
        self._fp.drop(str(video_id), (self._db.get_video(str(video_id)) or {}).get("file_path"))
        res = library.delete_item(self._db, self._cfg, str(video_id), delete_file=bool(delete_file))
        if res.get("ok"):
            self._forget_item(str(video_id))
        return res

    def _forget_item(self, video_id: str) -> None:
        """A library item left the library: caches, fingerprint, marks; tell the UI."""
        analysis.forget(self._db, video_id)  # v0.7.0: measurement + waveform cache
        playback.forget(self._db, video_id)
        fingerprint.forget(self._db, video_id)  # v0.10.0: fingerprint + marks
        self._bus.emit("video", {"id": video_id, "status": "ignored", "genre": None})
        self._push()

    # ================================================================== festivals & series (v0.3.0)

    def get_series(self, include_hidden: bool = False) -> list[dict[str, Any]]:
        """Series catalog (built-ins + user series) with library counts; offline."""
        return series.list_series(self._db, include_hidden=bool(include_hidden))

    def save_series(self, data: dict[str, Any]) -> dict[str, Any]:
        try:
            saved = series.save_series(self._db, self._cfg, data)
        except series.SeriesError as exc:
            return {"ok": False, "errors": exc.errors}
        log.info(tr("festival.series_saved", name=saved["name"]))
        return {"ok": True, "series": saved}

    def set_series_enabled(self, series_id: int, enabled: bool) -> dict[str, Any]:
        """On/off for detection only; a built-in stays updatable (no content edit)."""
        try:
            saved = series.set_series_enabled(self._db, int(series_id), bool(enabled))
        except (series.SeriesError, TypeError, ValueError) as exc:
            return {"ok": False, "error": str(exc) or tr("festival.series_unknown")}
        return {"ok": True, "series": saved}

    def delete_series(self, series_id: int) -> dict[str, Any]:
        try:
            res = series.delete_series(self._db, int(series_id))
        except (series.SeriesError, TypeError, ValueError) as exc:
            return {"ok": False, "error": str(exc) or tr("festival.series_unknown")}
        return {"ok": True, **res}

    def reset_series(self, series_id: int | None = None) -> dict[str, Any]:
        try:
            restored = series.reset_series(self._db, None if series_id is None else int(series_id))
        except (series.SeriesError, TypeError, ValueError) as exc:
            return {"ok": False, "error": str(exc) or tr("festival.series_unknown")}
        return {"ok": True, "series": restored}

    def get_festival_options(self) -> dict[str, Any]:
        """Choices for dialogs: kinds, set types (code + tag label), stage names."""
        labels = series.set_type_labels()
        return {
            "kinds": list(series.fx.KINDS),
            "set_types": [{"code": c, "label": labels[c]} for c in series.fx.SET_TYPES],
            "stages": series.stage_names(self._cfg),
        }

    def get_library_groups(self, by: str = "festival") -> dict[str, Any]:
        """Library (status done) grouped with counts; by: festival | year | event_year |
        artist | genre | stage | set_type."""
        try:
            if by == "festival":
                return {"ok": True, "by": by, **series.festival_tree(self._db)}
            return {"ok": True, "by": by, "groups": series.group_counts(self._db, str(by))}
        except ValueError:
            return {"ok": False, "error": tr("festival.invalid_grouping", by=by)}

    def _festival_payload(self, vid: str) -> dict[str, Any]:
        row = self._db.get_video(vid) or {}
        fest, sugg = series.festival_info(row, series.edition_map(self._db))
        return {"festival": fest, "festival_suggestion": sugg}

    def _emit_festival(self, vid: str) -> dict[str, Any]:
        payload = self._festival_payload(vid)
        row = self._db.get_video(vid) or {}
        self._bus.emit(
            "video", {"id": vid, "status": row.get("status"), "genre": row.get("genre"), **payload}
        )
        return payload

    def set_festival(self, video_id: str, data: dict[str, Any] | None) -> dict[str, Any]:
        """Manual festival values (detection never overwrites them); data null = «no festival».
        Tags/path of a downloaded file change only with retag(id)."""
        vid = str(video_id)
        try:
            series.set_manual(self._db, vid, data)
        except series.SeriesError as exc:
            return {"ok": False, "errors": exc.errors, "error": str(exc)}
        return {"ok": True, **self._emit_festival(vid)}

    def reset_festival(self, video_id: str) -> dict[str, Any]:
        """Manual values off: automatic detection runs again at once (offline)."""
        vid = str(video_id)
        try:
            outcome = series.reset_manual(self._db, self._cfg, vid)
        except series.SeriesError as exc:
            return {"ok": False, "error": str(exc)}
        return {"ok": True, "outcome": outcome, **self._emit_festival(vid)}

    def detect_festival(self, title: str, opts: dict[str, Any] | None = None) -> dict[str, Any]:
        """Try the detection on a text (settings tab «Test»); nothing is stored."""
        o = opts if isinstance(opts, dict) else {}
        cat = series.catalog(self._db, self._cfg)
        det = series.detect_row(
            {
                "title": str(title or ""),
                "channel_name": o.get("channel_name"),
                "upload_date": o.get("upload_date"),
            },
            cat,
            self._cfg,
            description=o.get("description"),
        )
        if det is None:
            return {"ok": True, "detection": None, "assigned": False}
        return {
            "ok": True,
            "detection": det.to_dict(),
            "assigned": det.confidence >= self._cfg.festivals.min_confidence,
        }

    def get_festival_status(self) -> dict[str, Any]:
        st = series.status(self._db)
        st["running"] = self._worker.busy("festivals")
        return st

    def assign_festivals(self, opts: dict[str, Any] | None = None) -> dict[str, Any]:
        """Start the offline pass in the maintenance worker; progress via `festival_assign`."""
        o = opts if isinstance(opts, dict) else {}
        scope = "all" if o.get("scope") == "all" else "library"
        if self._catchup.running() == "festivals":
            self._catchup.skip("festivals")  # the user's pass replaces the automatic one
            if not self._wait_maintenance("festivals:wait"):
                return self._busy("festivals")
        if self._worker.busy("festivals"):
            return {"ok": True, "started": False, "running": True}
        other = self._maintenance_other("festivals")
        if other is not None:
            label = tr(_JOB_LABELS[other]) if other in _JOB_LABELS else tr("job.retag")
            return {"ok": False, "error": tr("api.maintenance_busy", label=label)}
        self._fest_cancel.clear()
        self._worker.submit("festivals", self._do_assign, scope)
        return {"ok": True, "started": True, "scope": scope}

    def cancel_assign_festivals(self) -> dict[str, Any]:
        self._fest_cancel.set()
        return {"ok": True, "running": self._worker.busy("festivals")}

    def _do_assign(self, scope: str) -> dict[str, Any]:
        auto = scope == "auto"  # v0.10.1 catch-up: shown discreetly (status bar, no toast)
        self._bus.emit("festival_assign", {"phase": "start", "scope": scope, "auto": auto})
        log.info(tr("festival.pass_started"))

        def progress(data: dict[str, Any]) -> None:
            ev = {"phase": "progress", "scope": scope, "auto": auto, **data}
            self._bus.emit("festival_assign", ev)

        def description_of(vid: str) -> str | None:
            return (sidecar.read(vid) or {}).get("description") or None

        try:
            res = series.assign_pass(
                self._db,
                self._cfg,
                scope=scope,
                description_of=description_of,
                progress=progress,
                cancel=self._fest_cancel,
            )
        except Exception as exc:
            log.error(tr("festival.pass_failed", error=exc))
            res = {"ok": False, "error": tr("festival.pass_failed", error=exc)}
            ev = {"phase": "error", "scope": scope, "auto": auto, **res}
            self._bus.emit("festival_assign", ev)
            return res
        key = "festival.pass_cancelled" if res["cancelled"] else "festival.pass_done"
        log_ok(log, tr(key, n=res["done"], assigned=res["assigned"], suggested=res["suggested"]))
        self._bus.emit("festival_assign", {"phase": "done", "scope": scope, "auto": auto, **res})
        return res

    # ================================================================== catch-up passes (v0.10.1)

    def _wait_maintenance(self, key: str) -> bool:
        """Wait until the jobs queued in the maintenance worker before now have ended (the
        stopped automatic pass); False after JOB_TIMEOUT_S (e.g. a backup to a slow share
        ahead of it) - then the caller reports «busy» instead of raising (review v0.10.1
        minor 2)."""
        try:
            self._worker.run(key, lambda: None, timeout=JOB_TIMEOUT_S)
        except FutureTimeout:
            return False
        return True

    def _busy(self, key: str) -> dict[str, Any]:
        other = self._worker.other_job(key) or key
        label = tr(_JOB_LABELS[other]) if other in _JOB_LABELS else tr("job.retag")
        return {"ok": False, "error": tr("api.maintenance_busy", label=label)}

    def _after_auto_pass(self, step: str, queue: Any, scope: str) -> bool:
        """«Re-measure all» while the automatic pass `step` («new» only) runs: stop it and start
        the user's pass as soon as it has ended (a short helper thread, the bridge thread does
        not wait). False if no automatic pass of `step` runs (review v0.10.1 minor 3)."""
        if scope != "all" or self._catchup.running() != step or not self._catchup.skip(step):
            return False

        def later() -> None:
            stop = threading.Event()
            deadline = JOB_TIMEOUT_S
            while queue.pass_running() and deadline > 0:
                stop.wait(0.2)
                deadline -= 0.2
            if not queue.start_pass(scope):
                log.warning("User pass %s not started: another pass still runs", step)

        threading.Thread(target=later, name=f"hcloader-{step}-after-auto", daemon=True).start()
        return True

    def _maintenance_other(self, key: str) -> str | None:
        """Another maintenance job, for the refusal «… is running». An automatic catch-up pass
        never blocks the user: it is stopped (continues at the next start) and the user's
        job queues behind it (it ends after the current batch/item)."""
        other = self._worker.other_job(key)
        if other is not None and other == self._catchup.running():
            self._catchup.skip(other)
            return None
        return other

    def _catchup_steps(self) -> list[CatchUpStep]:
        """The one-off passes older libraries need, in order (cheap first). Each step checks
        its own settings; the file passes need ffmpeg and a reachable library folder."""

        def files_ok() -> bool:
            return binaries.ffmpeg_path().exists() and library.target_reachable(
                self._cfg.target_dir_path()
            )

        def maintenance(
            key: str, stop: threading.Event, fn: Callable[..., Any], *args: Any
        ) -> Callable[..., Any]:
            def run(cancel: threading.Event) -> Any:
                if self._worker.other_job(key) is not None or self._worker.busy(key):
                    return None  # the user runs a maintenance job: next start
                if cancel.is_set():
                    return None
                stop.clear()
                future = self._worker.submit(key, fn, *args)
                if self._catchup.stopped(key):
                    # the user started a job (or pressed «x») between the check above and
                    # `clear()`: the cleared stop request is set again (review v0.10.1 minor 1)
                    stop.set()
                return future.result()

            return run

        def analysis_needed() -> bool:
            lo = self._settings.loudness
            return (
                lo.analyse_after_download
                and bool(analysis.pending(self._db, self._settings))
                and files_ok()
            )

        def fingerprints_needed() -> bool:
            rp = self._settings.reupload
            return (
                rp.enabled
                and rp.fingerprint_after_download
                and bool(fingerprint.pending(self._db))
                and files_ok()
            )

        def analysis_run(cancel: threading.Event) -> None:
            if self._analysis.start_pass("new", auto=True):
                wait_while(self._analysis.pass_running, cancel)

        def fingerprints_run(cancel: threading.Event) -> None:
            if self._fp.start_pass("new", auto=True):
                wait_while(self._fp.pass_running, cancel)

        return [
            CatchUpStep(
                "festivals",
                lambda: bool(series.auto_pending(self._db, self._settings)),
                maintenance("festivals", self._fest_cancel, self._do_assign, "auto"),
                self._fest_cancel.set,
            ),
            CatchUpStep(
                "tracklists",
                lambda: tracklist.unscanned(self._db) > 0,
                maintenance("tracklists", self._tl_cancel, self._do_tracklists, "new", True),
                self._tl_cancel.set,
            ),
            CatchUpStep("analysis", analysis_needed, analysis_run, self._analysis.cancel_pass),
            CatchUpStep(
                "fingerprints", fingerprints_needed, fingerprints_run, self._fp.cancel_pass
            ),
        ]

    def get_catchup_status(self) -> dict[str, Any]:
        """Which automatic catch-up pass runs right now (None = none)."""
        return {"ok": True, "running": self._catchup.running()}

    def cancel_catchup(self) -> dict[str, Any]:
        """Stop the automatic catch-up for this session (it continues at the next start)."""
        return {"ok": True, "cancelled": self._catchup.cancel()}

    # ================================================================== tracklist search (v0.6.0)

    def search_tracks(self, query: str, opts: dict[str, Any] | None = None) -> dict[str, Any]:
        """Sets of the library whose tracklist contains `query` (artist and/or title words,
        prefix match). Offline: SQLite FTS5 (LIKE fallback)."""
        q = str(query or "").strip()[:200]
        try:
            return {"ok": True, **tracklist.search(self._db, q)}
        except Exception as exc:  # e.g. a damaged FTS index: say so instead of a stack trace
            log.exception(tr("tracklist.search_failed", error=exc))
            return {"ok": False, "error": tr("tracklist.search_failed", error=exc)}

    def get_tracklist(self, video_id: str) -> dict[str, Any]:
        """Tracks of one set with timestamps; extracted on the spot if never examined."""
        vid = str(video_id)
        try:
            # a dead network share must not block the panel: then no audio/CUE file reads
            files_ok = library.target_reachable(self._cfg.target_dir_path())
            res = tracklist.get_tracklist(self._db, vid, files_ok=files_ok)
        except Exception:  # e.g. a damaged MP3 (mutagen) – a message, not a stack trace
            log.warning("Tracklist not readable: %s", vid, exc_info=True)
            return {"ok": False, "error": tr("tracklist.read_failed")}
        if not res.get("ok"):
            return {"ok": False, "error": tr(res.pop("error_key", "tracklist.unknown_item"))}
        return res

    def get_top_tracks(self, limit: int = 20) -> dict[str, Any]:
        """«Most played»: tracks that appear in the most sets (at least two)."""
        try:
            n = int(limit)
        except (TypeError, ValueError):
            n = 20
        return {"ok": True, "tracks": tracklist.top_tracks(self._db, n)}

    def get_tracklist_status(self) -> dict[str, Any]:
        st = tracklist.status(self._db)
        st["running"] = self._worker.busy("tracklists")
        return st

    def build_tracklists(self, opts: dict[str, Any] | None = None) -> dict[str, Any]:
        """Offline pass over the library in the maintenance worker; progress via
        `tracklist_index`. opts {scope: "new" (default: never read or changed since; alias
        "missing") | "all" (re-read everything)}."""
        o = opts if isinstance(opts, dict) else {}
        scope = "all" if o.get("scope") == "all" else "new"
        if self._catchup.running() == "tracklists" and scope == "all":
            self._catchup.skip("tracklists")  # the user's full pass replaces the automatic one
            if not self._wait_maintenance("tracklists:wait"):
                return self._busy("tracklists")
        if self._worker.busy("tracklists"):
            return {"ok": True, "started": False, "running": True}
        other = self._maintenance_other("tracklists")
        if other is not None:
            label = tr(_JOB_LABELS[other]) if other in _JOB_LABELS else tr("job.retag")
            return {"ok": False, "error": tr("api.maintenance_busy", label=label)}
        self._tl_cancel.clear()
        self._worker.submit("tracklists", self._do_tracklists, scope)
        return {"ok": True, "started": True, "scope": scope}

    def cancel_build_tracklists(self) -> dict[str, Any]:
        self._tl_cancel.set()
        return {"ok": True, "running": self._worker.busy("tracklists")}

    def _do_tracklists(self, scope: str, auto: bool = False) -> dict[str, Any]:
        self._bus.emit("tracklist_index", {"phase": "start", "scope": scope, "auto": auto})
        log.info(tr("tracklist.pass_started"))

        def progress(data: dict[str, Any]) -> None:
            ev = {"phase": "progress", "scope": scope, "auto": auto, **data}
            self._bus.emit("tracklist_index", ev)

        try:
            # a dead network share must not hang the pass: files below it are skipped
            files_ok = library.target_reachable(self._cfg.target_dir_path())
            res = tracklist.index_pass(
                self._db, scope=scope, progress=progress, cancel=self._tl_cancel, files_ok=files_ok
            )
        except Exception as exc:
            log.error(tr("tracklist.pass_failed", error=exc))
            res = {"ok": False, "error": tr("tracklist.pass_failed", error=exc)}
            ev = {"phase": "error", "scope": scope, "auto": auto, **res}
            self._bus.emit("tracklist_index", ev)
            return res
        key = "tracklist.pass_cancelled" if res["cancelled"] else "tracklist.pass_done"
        log_ok(log, tr(key, n=res["done"], sets=res["sets"], tracks=res["tracks"]))
        self._bus.emit("tracklist_index", {"phase": "done", "scope": scope, "auto": auto, **res})
        return res

    # ======================================================== loudness, waveform, memory (v0.7.0)

    def _after_download(self, vid: str) -> None:
        if self._settings.loudness.analyse_after_download:
            self._analysis.request(vid)
        if self._settings.playlists.sync_after_download:
            self._request_playlist_sync()
        self._media.add(vid)  # v0.9.0: batched Plex/Jellyfin scan (no-op when off)
        rp = self._settings.reupload
        if rp.enabled and rp.fingerprint_after_download:  # v0.10.0 re-upload detection
            self._fp.request(vid)

    def _on_queue_session_end(self, session: dict[str, Any]) -> None:
        """v0.9.0: one aggregated notification per queue run (done / failed)."""
        self._notifier.note(
            downloaded=session.get("downloaded") or 0,
            failed=session.get("errors") or 0,
            titles=session.get("titles") or [],
            failed_titles=session.get("failed_titles") or [],
        )

    def _startup_analysis(self) -> None:
        """Downloads since the first v0.7.0 start that were never analysed (e.g. by the
        scheduled headless run, which does not analyse) are queued once after the start."""
        try:
            ids = analysis.since_pending(self._db, self._settings)
        except Exception:
            log.debug("Analysis backlog not readable", exc_info=True)
            return
        if self._settings.loudness.analyse_after_download:
            for vid in ids:
                self._analysis.request(vid)
        threading.Thread(  # m5: orphaned waveform cache files (cheap, but off this thread)
            target=lambda: _quiet(analysis.prune_peaks, self._db),
            name="hcloader-peaks-prune",
            daemon=True,
        ).start()

    def get_waveform(self, video_id: str) -> dict[str, Any]:
        """Cached waveform of a library item, or {status: "pending"} and the computation is
        queued (low priority, before downloads and passes); event `waveform` follows."""
        vid = str(video_id)
        try:
            _row, _path = player.resolve_playable(self._db, self._cfg, vid)
        except player.PlayerError as exc:
            return {"ok": False, "error": str(exc)}
        row = self._db.get_video(vid) or {}
        cached = analysis.load_peaks(vid, row.get("downloaded_at"))
        if cached:
            return {"ok": True, "status": "ready", **cached}
        if not binaries.ffmpeg_path().exists():
            return {"ok": False, "status": "unavailable", "error": tr("analysis.no_ffmpeg")}
        self._analysis.request_waveform(vid)
        return {"ok": True, "status": "pending"}

    def set_now_playing(self, video_id: str | None = None) -> dict[str, Any]:
        """The set loaded in the player (file open), None/"" = nothing. Its file is never
        tagged meanwhile; deferred ReplayGain tags are written after it is released."""
        self._analysis.set_playing(str(video_id) if video_id else None)
        return {"ok": True}

    def save_position(self, video_id: str, position: Any, duration: Any = None) -> dict[str, Any]:
        """Remember where a set was left (not in the first/last 30 s; `player.resume` off:
        nothing is stored). Quick DB write."""
        return playback.save(self._db, self._cfg, str(video_id), position, duration)

    def forget_position(self, video_id: str) -> dict[str, Any]:
        playback.forget(self._db, str(video_id))
        return {"ok": True}

    def get_continue_listening(self, limit: int = playback.CONTINUE_LIMIT) -> dict[str, Any]:
        """«Continue listening»: last unfinished sets still in the library, newest first."""
        return {"ok": True, "items": playback.continue_listening(self._db, self._cfg, limit)}

    def get_analysis_status(self) -> dict[str, Any]:
        st = analysis.status(self._db, self._cfg)
        st["running"] = self._analysis.pass_running()
        return st

    def analyse_library(self, opts: dict[str, Any] | None = None) -> dict[str, Any]:
        """Offline loudness/waveform pass over the library (one file at a time, low priority);
        progress via `audio_analysis`. opts {scope: "new" (default) | "all"}."""
        o = opts if isinstance(opts, dict) else {}
        scope = "all" if o.get("scope") == "all" else "new"
        if not binaries.ffmpeg_path().exists():
            return {"ok": False, "error": tr("analysis.no_ffmpeg")}
        if not self._analysis.start_pass(scope):
            if self._after_auto_pass("analysis", self._analysis, scope):
                return {"ok": True, "started": True, "scope": scope, "after_auto": True}
            return {"ok": True, "started": False, "running": True}
        return {"ok": True, "started": True, "scope": scope}

    def cancel_analyse_library(self) -> dict[str, Any]:
        self._analysis.cancel_pass()
        return {"ok": True, "running": self._analysis.pass_running()}

    # ======================================================== re-upload detection (v0.10.0)

    def _startup_fingerprints(self) -> None:
        """Downloads since the first v0.10.0 start without a fingerprint (e.g. from the
        scheduled headless run, which does not decode) are queued once after the start."""
        try:
            ids = fingerprint.since_pending(self._db)
        except Exception:
            log.debug("Fingerprint backlog not readable", exc_info=True)
            return
        rp = self._settings.reupload
        if rp.enabled and rp.fingerprint_after_download:
            for vid in ids:
                self._fp.request(vid)

    def get_reupload_status(self) -> dict[str, Any]:
        """Fingerprint counts, open/kept/linked marks, last pass, whether a pass runs."""
        st = fingerprint.status(self._db)
        st["running"] = self._fp.pass_running()
        st["enabled"] = bool(self._settings.reupload.enabled)
        return st

    def fingerprint_library(self, opts: dict[str, Any] | None = None) -> dict[str, Any]:
        """Backfill pass over the library (one file at a time, low priority, offline);
        progress via `fingerprint`, matches via `reupload`. opts {scope: "new" | "all"}."""
        o = opts if isinstance(opts, dict) else {}
        scope = "all" if o.get("scope") == "all" else "new"
        if not self._settings.reupload.enabled:
            return {"ok": False, "error": tr("reupload.off")}
        if not binaries.ffmpeg_path().exists():
            return {"ok": False, "error": tr("analysis.no_ffmpeg")}
        if not self._fp.start_pass(scope):
            if self._after_auto_pass("fingerprints", self._fp, scope):
                return {"ok": True, "started": True, "scope": scope, "after_auto": True}
            return {"ok": True, "started": False, "running": True}
        return {"ok": True, "started": True, "scope": scope}

    def cancel_fingerprint_library(self) -> dict[str, Any]:
        self._fp.cancel_pass()
        return {"ok": True, "running": self._fp.pass_running()}

    def get_reuploads(self, opts: dict[str, Any] | None = None) -> dict[str, Any]:
        """Marked items: [{id, title, platform, channel, file_path, downloaded_at, reupload}].
        opts {state: "open" (default) | "all"}."""
        o = opts if isinstance(opts, dict) else {}
        state = "all" if o.get("state") == "all" else "open"
        items = library.list_reuploads(self._db, self._cfg.target_dir_path(), state=state)
        return {"ok": True, "items": items}

    def resolve_reupload(self, video_id: str, action: str) -> dict[str, Any]:
        """Decision on «probable re-upload»: keep (keep both) | link (same mix, linked) |
        delete_new (delete this newer file, entry -> ignored; only while the original file is
        present) | adopt (original missing: this copy replaces it) | open (undo keep/link)."""
        vid = str(video_id or "")
        if action == "delete_new":
            self._fp.drop(vid, (self._db.get_video(vid) or {}).get("file_path"))
            res = library.delete_reupload(self._db, self._cfg, vid)
            if res.get("ok"):
                self._forget_item(vid)
                self._bus.emit("reupload", {"id": vid, "reupload": None, "deleted": True})
            return res
        if action == "adopt":
            res = library.adopt_reupload(self._db, self._cfg, vid)
            if res.get("ok"):
                if res.get("removed"):
                    self._forget_item(res["removed"])
                self._bus.emit("reupload", {"id": vid, "reupload": None, "adopted": True})
            return res
        res = fingerprint.resolve(self._db, vid, str(action or ""))
        if res.get("ok"):
            self._bus.emit("reupload", {"id": vid, "reupload": res.get("reupload")})
        return res

    # ======================================================== DJ pages + playlists (v0.8.0)

    def _pl(self, key: str, fn: Callable[..., Any], *args: Any) -> Any:
        """Run in the playlist thread (index build / file writes) and wait for the answer."""
        return self._pl_worker.run(key, fn, *args, timeout=JOB_TIMEOUT_S)

    @staticmethod
    def _artist_error(exc: artists.ArtistError) -> dict[str, Any]:
        return {"ok": False, "errors": exc.errors, "error": next(iter(exc.errors.values()), "")}

    def get_artists(self, opts: dict[str, Any] | None = None) -> dict[str, Any]:
        """DJ list: {ok, artists: [ArtistSummary], hidden: n}. opts {search, sort: sets |
        recent | name, hidden: true = only the hidden ones}."""
        o = opts if isinstance(opts, dict) else {}

        def run() -> dict[str, Any]:
            items = artists.list_artists(self._db, self._cfg, o)
            hidden = len(artists.list_artists(self._db, self._cfg, {"hidden": True}))
            return {"ok": True, "artists": items, "hidden": hidden}

        return self._pl("artists", run)

    def get_artist(self, key: str) -> dict[str, Any]:
        """DJ page: {ok, artist, sets: [LibraryItem + role + with], tracks}."""

        def run() -> dict[str, Any]:
            d = artists.detail(self._db, self._cfg, str(key or ""))
            if d is None:
                return {"ok": False, "error": tr("artist.unknown")}
            root = self._cfg.target_dir_path()
            ok = library.target_reachable(root)
            editions = series.edition_map(self._db)
            sets = []
            for s in d["sets"]:
                row = self._db.get_video(s["id"])
                if row:
                    item = library.library_item(row, root=root, root_ok=ok, editions=editions)
                    sets.append({**item, "role": s["role"], "with": s["with"]})
            return {"ok": True, "artist": d["artist"], "sets": sets, "tracks": d["tracks"]}

        return self._pl(f"artist:{key}", run)

    def save_artist(self, data: dict[str, Any]) -> dict[str, Any]:
        """Create/edit an artist {key?, name, aliases, channel_url} -> {ok, key} | {ok: false,
        errors}."""
        if not isinstance(data, dict):
            return {"ok": False, "error": tr("artist.unknown"), "errors": {}}
        try:
            return {
                "ok": True,
                **self._pl("artist-edit", artists.save_artist, self._db, self._cfg, data),
            }
        except artists.ArtistError as exc:
            return self._artist_error(exc)

    def merge_artists(self, keys: list[str], into: str) -> dict[str, Any]:
        try:
            return {
                "ok": True,
                **self._pl(
                    "artist-edit", artists.merge, self._db, self._cfg, list(keys or []), str(into)
                ),
            }
        except artists.ArtistError as exc:
            return self._artist_error(exc)

    def split_artist(self, key: str, alias: str) -> dict[str, Any]:
        try:
            return {
                "ok": True,
                **self._pl("artist-edit", artists.split, self._db, self._cfg, str(key), str(alias)),
            }
        except artists.ArtistError as exc:
            return self._artist_error(exc)

    def hide_artist(self, key: str, hidden: bool = True) -> dict[str, Any]:
        try:
            return {
                "ok": True,
                **self._pl(
                    "artist-edit", artists.set_hidden, self._db, self._cfg, str(key), bool(hidden)
                ),
            }
        except artists.ArtistError as exc:
            return self._artist_error(exc)

    def get_artist_watch(self, key: str) -> dict[str, Any]:
        """«Add to watchlist»: the source that would be created ({type, name, url_or_query,
        platform?}) and an existing source with the same target, if any. Nothing is saved:
        after the user confirms, the UI calls `save_source(source)`."""
        prop = self._pl("artist-watch", artists.watch_proposal, self._db, self._cfg, str(key))
        if prop is None:
            return {"ok": False, "error": tr("artist.unknown")}
        source = {k: v for k, v in prop.items() if k != "artist"}
        _clean, errors = watchlist.validate_source(
            source, self._cfg, existing=self._db.list_sources()
        )
        existing = None
        if errors.get("url_or_query"):
            target = str(source["url_or_query"]).rstrip("/").lower()
            existing = next(
                (
                    s
                    for s in self.get_sources()
                    if s["type"] == source["type"]
                    and str(s["url_or_query"]).rstrip("/").lower() == target
                ),
                None,
            )
        return {"ok": True, "source": source, "existing": existing}

    def preview_playlist(self, spec: dict[str, Any]) -> dict[str, Any]:
        """Export dialog: {ok, spec, name, folder, relative, count, missing, seconds, saved}."""
        try:
            return {
                "ok": True,
                **self._pl("pl-preview", playlists.preview, self._db, self._cfg, spec),
            }
        except playlists.PlaylistError as exc:
            return {"ok": False, "error": str(exc)}

    def export_playlist(
        self, spec: dict[str, Any], opts: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Write an M3U8 file. opts {name, folder, relative, overwrite, sync} -> {ok, path, count,
        skipped, absolute_fallback, relative, sync} | {ok: false, exists: true, path} (ask,
        then again with overwrite) | {ok: false, error}."""
        o = opts if isinstance(opts, dict) else {}
        try:
            return self._pl("pl-export", playlists.export, self._db, self._cfg, spec, o)
        except playlists.PlaylistError as exc:
            return {"ok": False, "error": str(exc)}

    def get_saved_playlists(self) -> dict[str, Any]:
        return {
            "ok": True,
            "playlists": playlists.saved(self._db),
            "sync_enabled": self._cfg.playlists.sync_after_download,
        }

    def set_playlist_sync(self, playlist_id: int, sync: bool) -> dict[str, Any]:
        pid = _int_or_none(playlist_id)
        if pid is None or not playlists.set_sync(self._db, pid, bool(sync)):
            return {"ok": False, "error": tr("playlist.unknown")}
        return {"ok": True}

    def forget_playlist(self, playlist_id: int) -> dict[str, Any]:
        """Remove a playlist from the saved list (the file stays where it is)."""
        pid = _int_or_none(playlist_id)
        if pid is None or not playlists.forget(self._db, pid):
            return {"ok": False, "error": tr("playlist.unknown")}
        return {"ok": True}

    def sync_playlists(self, ids: list[int] | None = None) -> dict[str, Any]:
        """Rewrite saved playlists now (`ids` or all marked «keep up to date»)."""
        only = None
        if isinstance(ids, list):
            only = [i for i in (_int_or_none(x) for x in ids) if i is not None]
            if len(only) != len(ids):
                return {"ok": False, "error": tr("playlist.unknown")}
        res = self._pl("pl-sync-now", lambda: playlists.sync_all(self._db, self._cfg, only=only))
        self._bus.emit("playlists_synced", {k: res[k] for k in ("synced", "failed")})
        return res

    def _request_playlist_sync(self) -> None:
        self._pl_dirty.set()
        fut = self._pl_worker.submit("pl-sync", self._playlist_sync_job)
        # a request that arrives after the running job's last dirty check reuses that job's
        # future (same key): check again once it is done (review v0.8.0 m5)
        fut.add_done_callback(self._playlist_sync_done)

    def _playlist_sync_done(self, fut: Any) -> None:
        if fut.cancelled() or fut.exception() is not None:  # worker stopped: no new job
            return
        if self._pl_dirty.is_set():
            self._request_playlist_sync()

    def _playlist_sync_job(self) -> None:
        res: dict[str, Any] | None = None
        while self._pl_dirty.is_set():  # a download finished while we were writing: again
            self._pl_dirty.clear()
            try:
                res = playlists.sync_all(self._db, self._cfg)
            except Exception as exc:
                log.warning(tr("playlist.sync_crashed", error=exc), exc_info=True)
                return
        if res and (res["synced"] or res["failed"]):
            self._bus.emit("playlists_synced", {k: res[k] for k in ("synced", "failed")})

    # ======================================================== statistics (v0.9.0)

    def get_stats(self, opts: dict[str, Any] | None = None) -> dict[str, Any]:
        """Statistics view, offline from the DB: {ok, range, totals, genres, festivals, years,
        djs, months, platforms, tracks, watchlist, measuring}. opts {from, to} (local dates
        YYYY-MM-DD, inclusive, both optional). Unmeasured file sizes (libraries from before
        v0.9.0) are measured once in the background -> events `stats_sizes`."""
        o = opts if isinstance(opts, dict) else {}
        try:
            data = self._pl("stats", stats.compute, self._db, self._cfg, o)
        except stats.RangeError:
            return {"ok": False, "error": tr("stats.invalid_range")}
        measuring = self._stats_worker.busy("sizes")
        if data["totals"]["sizes_missing"] and not measuring:
            self._sizes_cancel.clear()
            self._stats_worker.submit("sizes", self._measure_sizes)
            measuring = True
        return {"ok": True, **data, "measuring": measuring}

    def _measure_sizes(self) -> dict[str, int]:
        def progress(done: int, total: int) -> None:
            self._bus.emit("stats_sizes", {"phase": "progress", "done": done, "total": total})

        res = stats.measure_sizes(self._db, cancel=self._sizes_cancel, progress=progress)
        self._bus.emit("stats_sizes", {"phase": "done", **res})
        return res

    # ======================================================== notifications (v0.9.0)

    def _register_notifications(self) -> bool:
        return notify.ensure_registered(config.app_root(), notify.icon_file(config.app_root()))

    def get_notification_status(self) -> dict[str, Any]:
        """{ok, available, backend, quiet_now, pending}: can toasts be shown on this system?"""
        sender = notify.default_sender()
        data = notify.pending(self._db)
        return {
            "ok": True,
            "available": bool(sender.available()),
            "backend": sender.name,
            "quiet_now": notify.in_quiet_hours(self._cfg.notifications),
            "pending": data["new_sets"] + data["downloaded"] + data["failed"],
        }

    def test_notification(self) -> dict[str, Any]:
        """Show a sample toast right away (ignores quiet hours and the on/off switches)."""

        def run() -> dict[str, Any]:
            sender = notify.default_sender()
            if not sender.available():
                return {"ok": False, "error": tr("notify.test_unavailable"), "backend": sender.name}
            _quiet(self._register_notifications)
            toast = notify.Toast(tr("notify.test_title"), tr("notify.test_body"), "inbox")
            try:
                sender.show(notify.toast_xml(toast))
            except Exception as exc:
                log.warning(tr("notify.log_failed", error=str(exc)[:200]))
                return {"ok": False, "error": tr("notify.test_failed"), "backend": sender.name}
            return {"ok": True, "backend": sender.name}

        try:
            return self._ms_worker.run("notify-test", run, timeout=NOTIFY_TEST_TIMEOUT_S)
        except FutureTimeout:
            return {"ok": False, "error": tr("notify.test_failed")}

    # ======================================================== Plex / Jellyfin (v0.9.0)

    def _media_secret(self, kind: str) -> str | None:
        try:
            return self._secrets.get(kind)
        except credentials.CredentialError:
            log.warning(tr("media.secret_unreadable"))
            return None

    def _stored_secret_allowed(self, url: str) -> bool:
        """The stored token only goes to the saved server (review v0.9.0 m2): a changed or
        mistyped address in the form needs the token typed again."""
        saved = self._settings.media_server.url
        return bool(saved) and saved.rstrip("/") == url.rstrip("/")

    def get_media_server_status(self) -> dict[str, Any]:
        """{ok, type, has_secret: {plex, jellyfin}, persistent, last_scan, pending}."""
        last = None
        raw = self._db.get_state("media_scan_last")
        if raw:
            try:
                last = json.loads(raw)
            except ValueError:
                last = None
        return {
            "ok": True,
            "type": self._cfg.media_server.type,
            "has_secret": {k: bool(self._media_secret(k)) for k in mediaserver.KINDS},
            "persistent": bool(self._secrets.persistent),
            "last_scan": last,
            "pending": self._media.pending,
        }

    def test_media_server(self, data: dict[str, Any] | None = None) -> dict[str, Any]:
        """«Test connection» with the values in the form (not saved yet): data {type, url,
        secret?, verify_tls?}. `secret` empty = the stored one; a typed secret is stored in the
        Windows Credential Manager once the server accepted it. -> {ok, name, version,
        libraries: [{id, name, type, paths, music}], stored} | {ok: false, error, code}."""
        d = data if isinstance(data, dict) else {}
        kind = str(d.get("type") or "")
        if kind not in mediaserver.KINDS:
            return {"ok": False, "code": "config", "error": tr("media.err_config")}
        parsed, errors = config.parse_settings(
            {"media_server": {"type": kind, "url": d.get("url") or ""}}
        )
        if parsed is None:
            msg = next(iter(errors.values()), tr("media.err_config"))
            return {"ok": False, "code": "config", "error": msg, "errors": errors}
        url = parsed.media_server.url
        typed = d.get("secret")
        secret = None
        if typed not in (None, ""):
            try:
                secret = credentials.clean_secret(typed)
            except credentials.CredentialError:
                return {"ok": False, "code": "auth", "error": tr("media.err_auth")}
        if not secret and self._stored_secret_allowed(url):
            secret = self._media_secret(kind)
        if not secret:
            return {"ok": False, "code": "no_secret", "error": tr("media.err_no_secret")}
        verify = bool(d.get("verify_tls", True))

        def run() -> dict[str, Any]:
            try:
                res = mediaserver.test_connection(
                    kind, url, secret, verify_tls=verify, transport=self._media_transport
                )
            except mediaserver.MediaServerError as exc:
                log.warning(tr("media.test_failed", error=exc.message()))
                return {"ok": False, "code": exc.code, "error": exc.message()}
            stored = False
            if typed not in (None, ""):
                try:
                    self._secrets.set(kind, secret)
                    stored = True
                except credentials.CredentialError:
                    log.warning(tr("media.secret_failed"))
            log_ok(log, tr("media.test_ok", name=res["name"], n=len(res["libraries"])))
            return {"ok": True, **res, "stored": stored, "persistent": self._secrets.persistent}

        try:
            return self._ms_worker.run(f"ms-test:{kind}", run, timeout=MEDIA_TEST_TIMEOUT_S)
        except FutureTimeout:
            return {"ok": False, "code": "timeout", "error": tr("media.err_timeout")}

    def forget_media_server_secret(self, kind: str | None = None) -> dict[str, Any]:
        """Remove the stored token/API key (`kind` plex | jellyfin; default: the configured)."""
        k = str(kind or self._cfg.media_server.type)
        if k not in mediaserver.KINDS:
            return {"ok": False, "error": tr("media.err_config")}
        try:
            self._secrets.delete(k)
        except credentials.CredentialError:
            return {"ok": False, "error": tr("media.secret_failed")}
        return {"ok": True}

    def scan_media_server(self) -> dict[str, Any]:
        """«Scan now»: full scan of the configured library (saved settings + stored secret).
        -> {ok, server, requests, ...} | {ok: false, error, code}; also event `media_scan`."""
        try:
            return self._ms_worker.run(
                "ms-scan", self._media.scan_now, timeout=MEDIA_SCAN_TIMEOUT_S
            )
        except FutureTimeout:
            return {"ok": False, "code": "timeout", "error": tr("media.err_timeout")}


def _int_or_none(value: Any) -> int | None:
    """Id from JS (number or numeric string); None for anything else (no exception to JS)."""
    if isinstance(value, bool):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def _quiet(fn: Callable[..., Any], *args: Any) -> Any:
    try:
        return fn(*args)
    except Exception:
        log.debug("Background task failed: %s", getattr(fn, "__name__", fn), exc_info=True)
        return None
