"""js_api bridge for pywebview. Method names = `HC.bridge.call('name')` in ui/js/bridge.js.

Thin by design: validation, persistence, status, scheduler, maintenance live in `app/core/`;
long operations (update, backup, PO-token test) run in `app/worker.Worker`; events go through
`app/worker.EventBus`. pywebview runs every js_api call in its own thread, never in the GUI
thread. Every public method is exposed to JavaScript; internal helpers start with `_` or are
marked with `@_internal` (pywebview skips `_serializable = False`). Contract: docs/bridge-api.md.
"""

from __future__ import annotations

import logging
import re
import threading
import webbrowser
from collections.abc import Callable
from datetime import datetime
from pathlib import Path
from typing import Any

from .core import binaries, config, maintenance, potoken, scheduler
from .core import status as status_mod
from .core.config import Settings
from .core.db import Database
from .core.logging_setup import setup_logging
from .core.throttle import Throttle
from .worker import EventBus, LogForwarder, PotWatchdog, Ticker, Worker, log_ok

log = logging.getLogger("hcloader.api")

PHASE3 = "Folgt in Phase 3"
PHASE4 = "Folgt in Phase 4"
PHASE5 = "Folgt in Phase 5"
JOB_TIMEOUT_S = maintenance.UPDATE_TIMEOUT_S + 60
STATUS_INTERVAL_S = 30.0
_VIDEO_ID_RE = re.compile(r"^[0-9A-Za-z_-]{11}$")
_RUN_KINDS = ("watchlist", "headless", "manual")


def _internal(fn: Callable) -> Callable:
    """Not exposed to JavaScript (pywebview skips attributes with `_serializable = False`)."""
    fn._serializable = False  # type: ignore[attr-defined]
    return fn


def _video(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "title": row.get("title") or "",
        "channel_id": row.get("channel_id"),
        "channel_name": row.get("channel_name") or "",
        "duration": row.get("duration"),
        "upload_date": row.get("upload_date"),
        "view_count": row.get("view_count"),
        "thumbnail": row.get("thumbnail"),
        "genre": row.get("genre") or config.UNSORTED,
        "genre_manual": bool(row.get("genre_manual")),
        "status": row.get("status") or "new",
    }


def _run(row: dict[str, Any]) -> dict[str, Any]:
    kind = row.get("kind")
    return {
        "id": row["id"],
        "kind": kind if kind in _RUN_KINDS else "manual",
        "started": row.get("started"),
        "finished": row.get("finished"),
        "found": row.get("found") or 0,
        "downloaded": row.get("downloaded") or 0,
        "errors": row.get("errors") or 0,
        "note": row.get("note") or "",
    }


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
        browser: Callable[[str], Any] | None = None,
        probe: Callable[..., dict[str, Any]] | None = None,
        update_runner: Callable[..., dict[str, Any]] | None = None,
        update_checker: Callable[[], dict[str, Any]] | None = None,
        run_lock: Callable[[], Any] | None = None,
        configure_logging: bool = True,
    ) -> None:
        from .core import locks

        self._config_file = config_file or config.config_path()
        settings, warnings = config.load_with_warnings(self._config_file)
        for w in warnings:
            log.warning(w)
        self._settings: Settings = settings
        self._lock = threading.RLock()
        self._own_db = db is None
        self._db = db or Database(config.db_path())
        self._throttle = Throttle(self._db, lambda: self._settings.throttle)
        self._bus = bus or EventBus()
        self._worker = worker or Worker()
        self._scheduler = task_scheduler or scheduler.TaskScheduler()
        self._watchdog = watchdog or PotWatchdog(lambda: self._settings, on_change=self._push)
        self._logs = LogForwarder(self._bus)
        self._open = opener or maintenance.open_in_shell
        self._browser = browser or webbrowser.open
        self._probe = probe or potoken.probe
        self._update_runner = update_runner or maintenance.run_update
        self._update_checker = update_checker or maintenance.check_updates
        self._run_lock = run_lock or locks.acquire_run_lock
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
        """Background services: live log, PO-token watchdog, status ticker."""
        self._logs.start()
        self._worker.start()
        self._watchdog.start()
        self._ticker = Ticker(STATUS_INTERVAL_S, self._push)
        self._ticker.start()

    @_internal
    def shutdown(self) -> None:
        self._logs.stop()
        if self._ticker:
            self._ticker.stop()
        self._watchdog.stop()
        self._worker.stop()
        self._bus.close()
        if self._own_db:
            self._db.close()

    def _on_loaded(self) -> None:
        self._bus.mark_ready()
        if not self._loaded_once:
            self._loaded_once = True
            self._startup_update_check()

    def _push(self) -> None:
        """Send the current status to the status bar."""
        try:
            self._bus.emit("status", self.get_status())
        except Exception:
            log.debug("Status konnte nicht gesendet werden", exc_info=True)

    @property
    def _cfg(self) -> Settings:
        return self._settings

    # ================================================================== settings

    def get_settings(self) -> dict[str, Any]:
        return {"values": self._cfg.to_dict(), "defaults": config.defaults_dict()}

    def save_settings(self, values: dict[str, Any]) -> dict[str, Any]:
        parsed, errors = config.parse_settings(values)
        if parsed is None:
            return {"ok": False, "errors": errors}
        with self._lock:
            old = self._cfg
            task_errors = self._sync_task(old, parsed)
            if task_errors:
                return {"ok": False, "errors": task_errors}
            try:
                config.save(parsed, self._config_file)
            except OSError as exc:
                msg = f"Speichern fehlgeschlagen: {exc}"
                log.error(msg)
                return {"ok": False, "errors": {"settings": msg}}
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
            config.save(fresh, self._config_file)
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
        self._push()

    def _persist(self, **schedule: Any) -> None:
        with self._lock:
            data = self._cfg.to_dict()
            data["schedule"].update(schedule)
            self._settings = Settings.model_validate(data)
            config.save(self._settings, self._config_file)

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
            self._cfg, self._throttle, self._db, po_token=self._po_state(), queue_paused=False
        )

    def get_versions(self) -> dict[str, Any]:
        return maintenance.versions_info(
            db_path=Path(self._db.path),
            db_entries=self._db.count_videos(),
            last_update_check=self._db.get_state(maintenance.K_LAST_UPDATE_CHECK),
        )

    def update_ytdlp(self) -> dict[str, Any]:
        return self._worker.run("update", self._do_update, timeout=JOB_TIMEOUT_S)

    def _do_update(self) -> dict[str, Any]:
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

    def backup_db(self) -> dict[str, Any]:
        return self._worker.run("backup", self._do_backup, timeout=JOB_TIMEOUT_S)

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
        return self._worker.run("po_test", self._do_po_test, timeout=60)

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

    def clear_backoff(self) -> dict[str, Any]:
        self._throttle.clear_backoff_manual()
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
        if st.registered != sched.task_scheduler_enabled:  # changed outside HCLoader
            self._persist(task_scheduler_enabled=st.registered)
        return st.to_dict()

    def create_task(self, time: str) -> dict[str, Any]:
        try:
            st = self._scheduler.create(time)
        except scheduler.SchedulerError as exc:
            log.error("Aufgabenplanung: %s", exc)
            return {"ok": False, "error": str(exc)}
        self._persist(task_scheduler_enabled=True, task_time=scheduler.validate_time(time))
        self._push()
        return {"ok": True, **st.to_dict()}

    def remove_task(self) -> dict[str, Any]:
        try:
            self._scheduler.delete()
        except scheduler.SchedulerUnavailable as exc:
            self._persist(task_scheduler_enabled=False)
            return {"ok": False, "error": str(exc)}
        except scheduler.SchedulerError as exc:
            log.error("Aufgabenplanung: %s", exc)
            return {"ok": False, "error": str(exc)}
        self._persist(task_scheduler_enabled=False)
        self._push()
        return {"ok": True, "registered": False}

    # ================================================================== log

    def get_log(self) -> dict[str, Any]:
        return {
            "lines": self._logs.backlog(),
            "runs": [_run(r) for r in self._db.list_runs(50)],
        }

    # ================================================================== discover / inbox

    def _later(self, phase: str) -> dict[str, Any]:
        self._bus.toast(phase, "info")
        return {"ok": False, "error": phase}

    def get_last_search(self) -> dict[str, Any] | None:
        return None  # Phase 3

    def search(self, query: str) -> dict[str, Any]:
        return self._later(PHASE3)

    def get_inbox(self) -> list[dict[str, Any]]:
        return [_video(v) for v in self._db.list_videos(status="inbox")]

    def enqueue(self, ids: list[str]) -> dict[str, Any]:
        return {**self._later(PHASE3), "ids": []}

    def set_video_status(self, video_id: str, status: str) -> dict[str, Any]:
        if status not in ("ignored", "new"):
            return {"ok": False, "error": f"Ungültiger Status: {status}"}
        if not self._db.get_video(video_id):
            return {"ok": False, "error": "Video unbekannt"}
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
        if not _VIDEO_ID_RE.match(str(video_id or "")):
            return {"ok": False, "error": "Ungültige Video-ID"}
        self._browser(f"https://www.youtube.com/watch?v={video_id}")
        return {"ok": True}

    def add_channel_source(self, channel_id: str, channel_name: str) -> dict[str, Any]:
        return self._later(PHASE4)

    def block_channel(self, channel_id: str, channel_name: str = "") -> dict[str, Any]:
        if not channel_id:
            return {"ok": False, "error": "Kanal-ID fehlt"}
        self._db.add_to_blacklist(str(channel_id), str(channel_name or ""))
        log.info("Kanal blockiert: %s", channel_name or channel_id)
        return {"ok": True}

    # ================================================================== watchlist

    def get_sources(self) -> list[dict[str, Any]]:
        out = []
        for s in self._db.list_sources():
            out.append(
                {
                    "id": s["id"],
                    "type": s["type"],
                    "name": s["name"],
                    "url_or_query": s["url_or_query"],
                    "default_genre": s.get("default_genre") or None,
                    "enabled": bool(s.get("enabled")),
                    "auto_download": bool(s.get("auto_download")),
                    "max_entries": s.get("max_entries"),
                    "last_checked": s.get("last_checked"),
                    "new_count": self._db.count_videos(status="inbox", source_id=s["id"]),
                }
            )
        return out

    def save_source(self, source: dict[str, Any]) -> dict[str, Any]:
        return {**self._later(PHASE4), "errors": {}}

    def delete_source(self, source_id: int) -> dict[str, Any]:
        self._db.delete_source(int(source_id))
        return {"ok": True}

    def check_sources(self, ids: list[int] | None = None) -> dict[str, Any]:
        return {**self._later(PHASE4), "started": 0}

    # ================================================================== downloads

    def get_queue(self) -> dict[str, Any]:
        return {"paused": False, "items": []}  # Phase 3

    def set_queue_paused(self, paused: bool) -> dict[str, Any]:
        return {**self._later(PHASE3), "paused": False}

    def queue_move(self, video_id: str, delta: int) -> dict[str, Any]:
        return self._later(PHASE3)

    def queue_cancel(self, video_id: str) -> dict[str, Any]:
        return self._later(PHASE3)

    def queue_retry(self, video_id: str) -> dict[str, Any]:
        return self._later(PHASE3)

    # ================================================================== library

    def get_library(self) -> list[dict[str, Any]]:
        out = []
        for v in self._db.list_videos(status="done", order_by="downloaded_at"):
            path = Path(v["file_path"]) if v.get("file_path") else None
            try:
                size = round(path.stat().st_size / (1024 * 1024), 1) if path else 0.0
            except OSError:
                size = 0.0
            out.append(
                {
                    "id": v["id"],
                    "title": v.get("title") or "",
                    "artist": v.get("channel_name") or "",
                    "genre": v.get("genre") or config.UNSORTED,
                    "duration": v.get("duration"),
                    "upload_date": v.get("upload_date"),
                    "downloaded_at": v.get("downloaded_at"),
                    "file_path": v.get("file_path") or "",
                    "size_mb": size,
                }
            )
        return out

    def open_folder(self, video_id: str) -> dict[str, Any]:
        row = self._db.get_video(str(video_id))
        if not row or not row.get("file_path"):
            return {"ok": False, "error": "Keine Datei zu diesem Eintrag"}
        folder = Path(row["file_path"]).parent
        if not folder.is_dir():
            return {"ok": False, "error": f"Ordner fehlt: {folder}"}
        try:
            self._open(folder)
        except OSError as exc:
            return {"ok": False, "error": f"Ordner kann nicht geöffnet werden: {exc}"}
        return {"ok": True}

    def retag(self, video_id: str) -> dict[str, Any]:
        return self._later(PHASE5)

    def delete_library_item(self, video_id: str) -> dict[str, Any]:
        return self._later(PHASE5)


def _now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")
