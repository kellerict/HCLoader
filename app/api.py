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
    binaries,
    config,
    discover,
    library,
    locks,
    logview,
    maintenance,
    paths,
    player,
    potoken,
    scheduler,
    selfupdate,
    watchlist,
)
from .core import status as status_mod
from .core.config import Settings
from .core.db import Database
from .core.logging_setup import setup_logging
from .core.platforms import file_id
from .core.redact import redact
from .core.throttle import Throttle
from .worker import (
    DownloadQueue,
    EventBus,
    GateBusy,
    LogForwarder,
    PotWatchdog,
    Ticker,
    WatchdogPotServer,
    WatchlistScheduler,
    Worker,
    YtdlpGate,
    local_preflight,
    log_ok,
    video_dict,
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
# m2: at the first queue start in HTTP mode, wait this long for the PO-token watchdog
POT_START_WAIT_S = 20.0
_JOB_LABELS = {
    "update": "Update",
    "update_check": "Update-Prüfung",
    "backup": "Sicherung",
    "po_test": "PO-Token-Test",
    "task_check": "Aufgabenprüfung",
}
_TASK_MOVED = (
    "HCLoader wurde verschoben – die geplante Aufgabe startet noch den alten Ordner. "
    "Einstellungen › Zeitplan › «Aufgabe neu anlegen»."
)
_SC_OFF = "SoundCloud ist ausgeschaltet (Einstellungen › SoundCloud)"
_UPDATE_BUSY = "Wartung läuft gerade (Update) – bitte später erneut"
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
        client_factory: Callable[[], Any] | None = None,
        throttle: Throttle | None = None,
        queue_options: dict[str, Any] | None = None,
        schedule_options: dict[str, Any] | None = None,
        configure_logging: bool = True,
        self_updater: selfupdate.SelfUpdater | None = None,
    ) -> None:
        self._config_file = config_file or config.config_path()
        settings, warnings = config.load_with_warnings(self._config_file)
        for w in warnings:
            log.warning(w)
        self._settings: Settings = settings
        self._lock = threading.RLock()
        self._own_db = db is None
        self._db = db or Database(config.db_path())
        self._throttle = throttle or Throttle(
            self._db,
            lambda: self._settings.throttle,
            platform_settings={"soundcloud": lambda: self._settings.soundcloud},
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
            **qopts,
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
        self._ticker = Ticker(STATUS_INTERVAL_S, self._push)
        self._ticker.start()
        self._update_worker.start()
        try:
            self._update_result = self._updater.take_result()  # outcome of apply_update.ps1
            self._updater.restore()  # an update staged in an earlier session is ready again
        except Exception:
            log.exception("App-Update-Zustand nicht lesbar")

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
            watchlist.close_interrupted(self._db, "Abgebrochen (App beendet)")
        self._updater.stop()  # a running app-update download is aborted and discarded
        self._update_worker.stop()
        ended = self._queue.stop(queue_timeout)
        self._search_worker.stop()
        self._watchdog.stop()
        self._worker.stop()
        self._bus.close()
        if not ended:
            log.warning(
                "Download wird beim Beenden noch abgeschlossen (Konvertierung) – "
                "Eintrag bleibt in der Warteschlange"
            )
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

    def _push(self) -> None:
        """Send the current status to the status bar."""
        try:
            self._bus.emit("status", self.get_status())
        except Exception:
            log.debug("Status konnte nicht gesendet werden", exc_info=True)

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
        return {"values": self._cfg.to_dict(), "defaults": config.defaults_dict()}

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
                msg = f"Speichern fehlgeschlagen: {exc}"
                log.error(msg)
                return {"ok": False, "errors": {"settings": msg}}
            task_errors = self._sync_task(old, parsed)
            if task_errors:
                try:
                    config.save(old, self._config_file)  # roll back
                except OSError as exc:
                    log.error("Einstellungen konnten nicht zurückgesetzt werden: %s", exc)
                return {"ok": False, "errors": task_errors}
            self._settings = parsed
        self._apply(old, parsed)
        log.info("Einstellungen gespeichert")
        return {"ok": True, "values": parsed.to_dict()}

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
                msg = f"Speichern fehlgeschlagen: {exc}"
                log.error(msg)
                return {"ok": False, "error": msg}
            self._settings = fresh
        self._apply(old, fresh)
        if section:
            log.warning("Einstellungen «%s» auf Standard zurückgesetzt", section)
        else:
            log.warning("Alle Einstellungen auf Standard zurückgesetzt")
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
        if self._configure_logging and old.general.log_level != new.general.log_level:
            setup_logging(new.general.log_level)
        if old.network != new.network:
            self._po_test = None
            self._watchdog.apply()
        # limits, target folder or a failed client may allow the queue to continue (m2/m3)
        self._queue.user_action()
        self._push()

    def _persist(self, **schedule: Any) -> str | None:
        """Store schedule fields; returns a German error message or None (m8)."""
        with self._lock:
            data = self._cfg.to_dict()
            data["schedule"].update(schedule)
            fresh = Settings.model_validate(data)
            try:
                config.save(fresh, self._config_file)
            except OSError as exc:
                msg = f"Speichern fehlgeschlagen: {exc}"
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
        other = self._worker.other_job(key)
        if other is not None:
            label = "Neu taggen" if other.startswith("retag:") else _JOB_LABELS.get(other, other)
            return {"ok": False, "error": f"Wartung läuft gerade ({label}) – bitte später erneut"}
        try:
            return self._worker.run(key, fn, timeout=timeout)
        except FutureTimeout:
            return {
                "ok": False,
                "error": "Zeitüberschreitung – der Auftrag läuft im Hintergrund weiter",
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
                "error": "Eine Suche läuft gerade – Update danach ausführen.",
                "output": "",
            }

    def _do_update_locked(self) -> dict[str, Any]:
        lock = self._run_lock()
        if lock is None:
            return {
                "ok": False,
                "error": "Ein Download-Lauf ist aktiv – Update danach ausführen.",
                "output": "",
            }
        ulog = logging.getLogger("hcloader.update")
        try:
            log.info("yt-dlp & Plugin werden aktualisiert …")
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
            self._bus.toast("yt-dlp aktualisiert – bitte HCLoader neu starten", "warn")
        if result.get("ok"):
            log_ok(
                log,
                "Aktualisierung fertig: yt-dlp %s, Plugin %s%s",
                result.get("ytdlp"),
                result.get("plugin"),
                " (neu)" if result.get("changed") else " (bereits aktuell)",
            )
        else:
            log.error("Aktualisierung fehlgeschlagen: %s", result.get("error"))
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
            log.debug("Aufgabenprüfung: %s", exc)
            return {"ok": False, "error": str(exc)}
        if st.registered and st.path_mismatch:
            log.warning(
                "Aufgabenplanung: Aufgabe startet %s, die App liegt jetzt in %s – "
                "Aufgabe neu anlegen (Einstellungen › Zeitplan)",
                st.task_command,
                config.app_root(),
            )
            self._bus.toast(_TASK_MOVED, "warn")
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
            msg = "Update verfügbar: " + ", ".join(newer) + " (Einstellungen › Wartung)"
            log.warning(msg)
            self._bus.toast(msg, "info")
        else:
            log.info("yt-dlp und Plugin sind aktuell")
        return res

    # ================================================================== app self-update

    def _startup_app_update(self) -> None:
        """Toast for the result of the last update; then one check per start (if enabled).
        GitHub only, no YouTube, no throttle; errors stay in the log."""
        res, self._update_result = self._update_result, None
        if res:
            if res.get("ok"):
                msg = f"HCLoader aktualisiert auf v{res.get('to_version')}"
                log_ok(log, "%s", msg)
                self._bus.toast(msg, "ok")
            else:
                msg = f"App-Update fehlgeschlagen: {res.get('error') or 'unbekannter Fehler'}"
                msg += (
                    " – die bisherige Version wurde wiederhergestellt"
                    if res.get("rolled_back")
                    else f" – Details: {res.get('log') or 'logs/update.log'}"
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
            return {"ok": False, "error": "Zeitüberschreitung bei der Update-Prüfung"}
        except RuntimeError as exc:  # worker stopped (app is closing)
            return {"ok": False, "error": str(exc)}
        res["apply_on_exit"] = bool(self._cfg.maintenance.apply_update_on_exit)
        return res

    def download_update(self) -> dict[str, Any]:
        """Start download + preparation in the background; progress via `update_progress`,
        state via `update`. Returns at once."""
        refusal = self._updater.begin_download()
        if refusal:
            return {"ok": False, "error": refusal, **self.get_update_status()}
        self._update_worker.submit("app_update_download", self._updater.download)
        return {"ok": True, **self.get_update_status()}

    def cancel_update(self) -> dict[str, Any]:
        """Abort the download, or drop a prepared update (then nothing is applied on exit)."""
        self._apply_requested = False
        self._updater.cancel()
        return {"ok": True, **self.get_update_status()}

    def apply_update_now(self) -> dict[str, Any]:
        """Close the app; after `shutdown` (queue stopped like a normal exit) `main.py` calls
        `finish_update`, which starts the updater with restart."""
        st = self._updater.status()
        if st["blocked"]:
            return {"ok": False, "error": st["blocked"]}
        if st["state"] != "ready":
            return {"ok": False, "error": "Kein Update bereit"}
        self._apply_requested = True
        log.warning("App wird für das Update auf v%s beendet …", st["latest"])
        if self._window is not None:
            timer = threading.Timer(APP_UPDATE_CLOSE_DELAY_S, self._close_window)
            timer.daemon = True
            timer.start()
        return {"ok": True}

    def _close_window(self) -> None:
        try:
            self._window.destroy()
        except Exception:
            log.exception("Fenster konnte nicht geschlossen werden")

    @_internal
    def finish_update(self) -> dict[str, Any] | None:
        """Called by main.py after `shutdown`: start apply_update.ps1 if the user chose
        «Jetzt neu starten» (restart) or an update is ready and `apply_update_on_exit` is on."""
        if self._updater.state != "ready":
            return None
        if self._apply_requested:
            return self._updater.launch(restart=True)
        if self._cfg.maintenance.apply_update_on_exit:
            return self._updater.launch(restart=False)
        log.info("App-Update bleibt bereit (wird beim nächsten Start wieder angeboten)")
        return None

    def backup_db(self) -> dict[str, Any]:
        return self._job("backup", self._do_backup, JOB_TIMEOUT_S)

    def _do_backup(self) -> dict[str, Any]:
        try:
            path = maintenance.backup_database(Path(self._db.path))
        except Exception as exc:
            log.error("Datenbank-Sicherung fehlgeschlagen: %s", exc)
            return {"ok": False, "error": f"Sicherung fehlgeschlagen: {exc}"}
        self._db.set_state(maintenance.K_LAST_BACKUP, _now_iso())
        log_ok(log, "Datenbank gesichert: %s", path)
        return {"ok": True, "path": str(path)}

    def open_path(self, kind: str) -> dict[str, Any]:
        targets = {
            "data": config.app_home,
            "target": self._cfg.target_dir_path,
            "logs": config.logs_dir,
        }
        if kind not in targets:
            return {"ok": False, "error": f"Unbekannter Ordner: {kind}"}
        path = targets[kind]()
        try:
            path.mkdir(parents=True, exist_ok=True)
            self._open(path)
        except OSError as exc:
            return {"ok": False, "error": f"Ordner kann nicht geöffnet werden: {exc}"}
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
            log_ok(log, "PO-Token-Test erfolgreich (%s ms): %s", res.get("ms"), res.get("detail"))
        elif res.get("state") == "error":
            log.error("PO-Token-Test fehlgeschlagen: %s", res.get("detail"))
        self._push()
        return res

    def clear_backoff(self, platform: str | None = None) -> dict[str, Any]:
        """Lift the backoff of `platform` ('youtube' | 'soundcloud'); none = every platform."""
        if platform not in (None, "", "youtube", "soundcloud"):
            return {"ok": False, "error": "Unbekannte Plattform"}
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
        log.info("Kanal entsperrt: %s", channel_id)
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
                log.warning("Aufgabenplanung: Abgleich nicht gespeichert (%s)", err)
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
            log.error("Aufgabenplanung: %s", exc)
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
            log.error("Aufgabenplanung: %s", exc)
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
            return {"ok": False, "error": "Suchbegriff fehlt"}
        if self._queue.restart_required:
            return {"ok": False, "error": "Neustart nötig – yt-dlp wurde aktualisiert"}
        if self._ytdlp_gate.updating:
            return {"ok": False, "error": _UPDATE_BUSY}
        clean = opts if isinstance(opts, dict) else None
        genre, year = discover.clean_options(clean, self._cfg)
        platform = discover.clean_platform(clean)
        if platform is None:
            return {"ok": False, "error": "Unbekannte Plattform"}
        if platform == "soundcloud" and not self._cfg.soundcloud.enabled:
            return {
                "ok": False,
                "error": "SoundCloud ist ausgeschaltet (Einstellungen › SoundCloud)",
            }
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
            return {"ok": False, "error": "Suche dauert zu lange – bitte später erneut versuchen"}

    def _do_search(
        self, query: str, genre: str | None, year: int | None, platform: str = "youtube"
    ) -> dict[str, Any]:
        try:
            with self._ytdlp_gate.search():  # n2: checked and registered atomically
                return self._do_search_locked(query, genre, year, platform)
        except GateBusy:
            return {"ok": False, "error": _UPDATE_BUSY}

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
            return {"ok": False, "error": "Ungültige Auswahl", "ids": []}
        accepted = self._queue.enqueue([str(i) for i in ids])
        skipped = len(ids) - len(accepted)
        res: dict[str, Any] = {"ok": True, "ids": accepted}
        if skipped:
            res["skipped"] = skipped
        return res

    def set_video_status(self, video_id: str, status: str) -> dict[str, Any]:
        if status not in ("ignored", "new"):
            return {"ok": False, "error": f"Ungültiger Status: {status}"}
        row = self._db.get_video(video_id)
        if not row:
            return {"ok": False, "error": "Video unbekannt"}
        if row["status"] in ("queued", "downloading", "done"):
            return {"ok": False, "error": "Status in der Warteschlange/Bibliothek nicht änderbar"}
        self._db.set_status(video_id, status)
        self._bus.emit("video", {"id": video_id, "status": status})
        self._push()
        return {"ok": True}

    def set_genre(self, video_id: str, genre: str) -> dict[str, Any]:
        names = {g.name for g in self._cfg.genres.items}
        if genre not in names:
            return {"ok": False, "error": f"Unbekanntes Genre: {genre}"}
        row = self._db.get_video(video_id)
        if not row:
            return {"ok": False, "error": "Video unbekannt"}
        self._db.set_genre(video_id, genre, manual=True)
        self._bus.emit("video", {"id": video_id, "status": row["status"], "genre": genre})
        return {"ok": True}

    def open_video(self, video_id: str) -> dict[str, Any]:
        vid = str(video_id or "")
        if _VIDEO_ID_RE.match(vid):
            self._browser(f"https://www.youtube.com/watch?v={vid}")
            return {"ok": True}
        url = discover.soundcloud_page(self._db, vid)
        if url is None:
            return {"ok": False, "error": "Ungültige Video-ID"}
        self._browser(url)
        return {"ok": True}

    def suggest_source(self, url_or_query: str, type_hint: str | None = None) -> dict[str, Any]:
        """Name/type/platform for a new source from the URL only (no network); the UI asks
        while typing (debounced)."""
        return watchlist.suggest_source(str(url_or_query or ""), type_hint or None)

    def add_channel_source(self, channel_id: str, channel_name: str = "") -> dict[str, Any]:
        cid = str(channel_id or "").strip()
        platform = "soundcloud" if cid.startswith("sc:") else "youtube"
        if platform == "soundcloud":
            url = discover.soundcloud_channel_page(self._db, cid)
            if url is None:
                return {"ok": False, "error": "SoundCloud-Nutzer unbekannt (keine Profil-URL)"}
        elif re.fullmatch(r"[0-9A-Za-z_-]{3,64}", cid):
            url = f"https://www.youtube.com/channel/{cid}"
        else:
            return {"ok": False, "error": "Ungültige Kanal-ID"}
        for s in self.get_sources():
            if s["url_or_query"].rstrip("/").lower() == url.lower():
                return {"ok": False, "error": "Kanal ist bereits in der Watchlist", "source": s}
        name = str(channel_name or "").strip() or cid
        # the known channel name from the search: no automatic renaming (name_auto false)
        sid = self._db.add_source(
            "channel", name, url, platform=platform, name_auto=not str(channel_name or "").strip()
        )  # n7: max_entries NULL = default
        log.info("Kanal zur Watchlist hinzugefügt: %s", name)
        source = next(s for s in self.get_sources() if s["id"] == sid)
        return {"ok": True, "source": source}

    def block_channel(self, channel_id: str, channel_name: str = "") -> dict[str, Any]:
        if not channel_id:
            return {"ok": False, "error": "Kanal-ID fehlt"}
        self._db.add_to_blacklist(str(channel_id), str(channel_name or ""))
        log.info("Kanal blockiert: %s", channel_name or channel_id)
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
        }

    def get_sources(self) -> list[dict[str, Any]]:
        return [self._source_dict(s) for s in self._db.list_sources()]

    def save_source(self, source: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(source, dict):
            return {"ok": False, "error": "Ungültige Quelle", "errors": {}}
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
            log.info("Quelle hinzugefügt: %s", source.get("name"))
        else:
            sid = int(raw_id)
            if self._db.get_source(sid) is None:
                return {"ok": False, "error": "Quelle existiert nicht mehr", "errors": {}}
            self._db.update_source(sid, **clean)
            log.info("Quelle gespeichert: %s", clean["name"])
        self._push()  # next planned check may change (first source / enabled flag)
        return {"ok": True, "source": self._source_dict(self._db.get_source(sid))}

    def delete_source(self, source_id: int) -> dict[str, Any]:
        self._db.delete_source(int(source_id))
        self._push()
        return {"ok": True}

    def check_sources(self, ids: list[int] | None = None) -> dict[str, Any]:
        """Start a check in the watchlist thread; progress comes as `source` events and a final
        `watchlist_done`. `started` = number of sources that will be checked."""
        if ids is not None and not isinstance(ids, (list, tuple)):
            return {"ok": False, "error": "Ungültige Auswahl", "started": 0}
        try:
            wanted = None if ids is None else sorted({int(i) for i in ids})
        except (TypeError, ValueError):
            return {"ok": False, "error": "Ungültige Auswahl", "started": 0}
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
            return "Neustart nötig – yt-dlp wurde aktualisiert"
        if self._ytdlp_gate.updating:
            return _UPDATE_BUSY
        until = watchlist.blocked_until(self._db, self._throttle)
        if until:
            return f"Backoff aktiv bis {discover.format_until(until)} – Prüfung gesperrt"
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
        log.info("Geplante Watchlist-Prüfung (Intervall in der App)")
        self._submit_check(None, scheduled=True)
        return True

    def _do_watchlist(self, ids: list[int] | None, *, scheduled: bool = False) -> dict[str, Any]:
        lock = self._watchlist_lock()
        if lock is None and scheduled:  # m2: the headless task checks right now - quietly later
            retry = self._wl_sched.defer()
            log.debug("Watchlist-Lock belegt (Aufgabe läuft) – neuer Versuch ab %s", retry)
            self._push()
            return {"ok": False, "deferred": True}
        if lock is None:  # a headless run checks right now
            msg = "Die Watchlist wird gerade von einem anderen Lauf geprüft (z.B. geplante Prüfung)"
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
            self._bus.toast(_UPDATE_BUSY, "warn")
        except Exception as exc:
            log.exception("Watchlist-Prüfung fehlgeschlagen")
            self._bus.toast(f"Watchlist-Prüfung fehlgeschlagen: {redact(exc)}", "err")
        finally:
            lock.release()
        if result.backoff:
            self._bus.toast(f"Watchlist abgebrochen: {result.note}", "warn")
        checked = result.checked + result.errors  # sources processed (checked or failed)
        self._bus.emit("watchlist_done", {"checked": checked, "found": result.found})
        self._push()
        return {"ok": True, "checked": checked, "found": result.found}

    # ================================================================== downloads

    def get_queue(self) -> dict[str, Any]:
        return self._queue.snapshot()

    def set_queue_paused(self, paused: bool) -> dict[str, Any]:
        return {"ok": True, "paused": self._queue.set_paused(bool(paused))}

    def queue_move(self, video_id: str, delta: int) -> dict[str, Any]:
        try:
            step = int(delta)
        except (TypeError, ValueError):
            return {"ok": False, "error": "Ungültige Richtung"}
        if self._queue.move(str(video_id), step):
            return {"ok": True}
        return {"ok": False, "error": "Nur wartende Einträge lassen sich verschieben"}

    def queue_cancel(self, video_id: str) -> dict[str, Any]:
        res = self._queue.cancel(str(video_id))
        if res == "ok":
            return {"ok": True}
        if res == "late":
            return {"ok": False, "error": "Download bereits fertig"}
        return {"ok": False, "error": "Eintrag ist nicht (mehr) in der Warteschlange"}

    def queue_retry(self, video_id: str) -> dict[str, Any]:
        if self._queue.retry(str(video_id)):
            return {"ok": True}
        return {"ok": False, "error": "Nur fehlgeschlagene Einträge lassen sich wiederholen"}

    # ================================================================== library

    def get_library(self, filters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        """filters (optional): search, genre, channel (id or name), year, missing.

        The target folder is checked once per call (with a timeout). If it is unreachable, files
        below it get `unknown: true` instead of `missing: true`; see `get_library_status`."""
        root = self._cfg.target_dir_path()
        ok = library.target_reachable(root)
        self._lib_status = {"target_ok": ok, "target": str(root)}
        return library.list_library(
            self._db, filters if isinstance(filters, dict) else None, root=root, root_ok=ok
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
            return {"ok": False, "error": "Keine Datei zu diesem Eintrag"}
        path = Path(row["file_path"])
        if not path.parent.is_dir():
            return {"ok": False, "error": f"Ordner fehlt: {path.parent}"}
        try:
            self._reveal(path)
        except OSError as exc:
            return {"ok": False, "error": f"Ordner kann nicht geöffnet werden: {exc}"}
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
        res = library.delete_item(self._db, self._cfg, str(video_id), delete_file=bool(delete_file))
        if res.get("ok"):
            self._bus.emit("video", {"id": str(video_id), "status": "ignored", "genre": None})
            self._push()
        return res


def _now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")
