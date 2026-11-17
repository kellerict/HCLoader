"""Headless watchlist run for the Windows task scheduler: `python -m app.main --headless
--run-watchlist` (SPEC §2, §3.2, Phase 4). No GUI import (no pywebview).

Sequence: config/DB/logging, run lock + watchlist lock (exit 4 if another run holds one), start
the PO-token server (HTTP mode; if the GUI is open and its server answers on the configured port,
that one is used without owning it, Review Phase 4 m1), check all enabled sources incrementally,
then load the queued videos (auto-download entries and anything else already queued)
sequentially through the normal `DownloadQueue` - `throttle.max_downloads_per_run` applies, the
rest stays queued. One `runs` entry of kind `headless` (found, downloaded, errors, note).
Exit codes: `app/exitcodes.py`.
"""

from __future__ import annotations

import logging
import sys
from collections.abc import Callable
from typing import Any

from .core import config, i18n, locks, watchlist
from .core.config import Settings
from .core.db import Database, MigrationBackupError, SchemaTooNewError
from .core.discover import format_until
from .core.i18n import tr
from .core.logging_setup import console_logs_errors, setup_logging
from .core.throttle import Throttle
from .exitcodes import EXIT_BLOCKED, EXIT_BUSY, EXIT_FAILED, EXIT_OK
from .worker import DownloadQueue, EventBus, PotWatchdog, WatchdogPotServer, local_preflight

log = logging.getLogger("hcloader.headless")

ClientFactory = Callable[[], Any]


def gui_running() -> bool:
    """True if a HCLoader GUI holds the single-instance lock (probe: acquire + release)."""
    lock = locks.acquire_single_instance()
    if lock is None:
        return True
    lock.release()
    return False


def pot_answers(port: int) -> bool:
    """GET /ping on the configured local PO-token port (127.0.0.1 only)."""
    from .core.binaries import PotServer

    return PotServer(port).ping()


class SharedPotServer:
    """Review Phase 4 m1: the PO-token server of the running GUI, used but not owned (never
    started or stopped here). `running()` = it still answers /ping."""

    def __init__(self, port: int, ping: Callable[[int], bool] = pot_answers) -> None:
        self.port = port
        self._ping = ping

    def running(self) -> bool:
        return bool(self._ping(self.port))

    def start(self) -> bool:
        return self.running()

    def stop(self) -> None:  # owned by the GUI
        pass


class SharedPotWatchdog:
    """Watchdog stand-in for `SharedPotServer` (same interface as `PotWatchdog` as far as
    headless, `local_preflight` and `WatchdogPotServer` use it)."""

    gave_up = False

    def __init__(self, server: SharedPotServer) -> None:
        self.server = server

    def running(self) -> bool:
        return self.server.running()

    def wait_ready(self, timeout: float, stop: Any = None) -> bool:
        return self.running()

    def check(self) -> None:
        pass

    def stop(self) -> None:
        pass


class _HeldLock:
    """The run lock is held by the headless run itself; the queue's `run_session` gets this."""

    def release(self) -> None:
        pass


def _say(message: str) -> None:
    log.error("%s", message)
    if sys.stderr is not None and not console_logs_errors():  # QA: never twice on stderr
        print(message, file=sys.stderr)


def run_watchlist(
    *,
    settings: Settings | None = None,
    db: Database | None = None,
    client_factory: ClientFactory | None = None,
    watchdog: PotWatchdog | SharedPotWatchdog | None = None,
    run_lock: Callable[[], Any] = locks.acquire_run_lock,
    watchlist_lock: Callable[[], Any] = locks.acquire_watchlist_lock,
    configure_logging: bool = True,
    throttle: Throttle | None = None,
    pot_wait: float = 20.0,
    gui_probe: Callable[[], bool] = gui_running,
    pot_ping: Callable[[int], bool] = pot_answers,
) -> int:
    """Run one headless watchlist cycle; returns the process exit code."""
    if settings is None:
        settings, warnings = config.load_with_warnings()
    else:
        warnings = []
    i18n.set_language(settings.general.language)
    if configure_logging:
        setup_logging(settings.general.log_level, console=sys.stderr is not None)
    for w in warnings:
        log.warning(w)

    run = run_lock()
    if run is None:
        _say(tr("run.busy"))
        return EXIT_BUSY
    wl = watchlist_lock()
    if wl is None:
        run.release()
        # m2: usually the in-app check of the open GUI - it does the work, nothing is lost
        _say(tr("headless.watchlist_busy"))
        return EXIT_BUSY
    if watchdog is None and settings.network.po_token_mode == "http":
        watchdog = _shared_pot(settings.network.po_token_port, gui_probe, pot_ping)
    own_db = db is None
    try:
        db = db or Database(config.db_path())
    except (SchemaTooNewError, MigrationBackupError) as exc:
        wl.release()
        run.release()
        _say(
            exc.user_message(config.app_home() / "backups")
            if isinstance(exc, SchemaTooNewError)
            else str(exc)
        )
        return EXIT_FAILED
    try:
        return _run(
            settings,
            db,
            client_factory,
            watchdog,
            throttle
            or Throttle(
                db,
                lambda: settings.throttle,
                platform_settings={"soundcloud": lambda: settings.soundcloud},
            ),
            pot_wait,
        )
    finally:
        if own_db:
            db.close()
        wl.release()
        run.release()


def _shared_pot(
    port: int, gui_probe: Callable[[], bool], pot_ping: Callable[[int], bool]
) -> SharedPotWatchdog | None:
    """m1: GUI open and its PO-token server answers on our port -> use it (not owned)."""
    try:
        if not gui_probe() or not pot_ping(port):
            return None
    except Exception:
        log.debug("PO token server of the GUI not checkable", exc_info=True)
        return None
    log.info(tr("headless.shared_pot", port=port))
    return SharedPotWatchdog(SharedPotServer(port, pot_ping))


def _default_factory(
    settings: Settings, db: Database, throttle: Throttle, watchdog: PotWatchdog
) -> ClientFactory:
    def make() -> Any:
        from .core.ytclient import YtClient  # lazy: loads yt-dlp

        return YtClient(
            lambda: settings,
            db,
            throttle,
            pot_server=WatchdogPotServer(watchdog),  # type: ignore[arg-type]
        )

    return make


def _run(
    settings: Settings,
    db: Database,
    client_factory: ClientFactory | None,
    watchdog: PotWatchdog | SharedPotWatchdog | None,
    throttle: Throttle,
    pot_wait: float,
) -> int:
    # we hold the run lock: rows left in 'downloading' by a crash are not in use by anyone
    n = db.reset_interrupted_downloads()
    if n:
        log.warning(tr("run.interrupted_reset", n=n))

    run_id = db.start_run("headless")
    log.info(tr("headless.started"))
    found = downloaded = errors = 0
    notes: list[str] = []
    code = EXIT_OK
    watchdog = watchdog or PotWatchdog(lambda: settings)
    client: Any = None
    try:
        # 7a: blocked only if every platform with an enabled source is in backoff
        until = watchlist.blocked_until(db, throttle, settings)
        if until:
            notes.append(tr("headless.backoff", until=format_until(until)))
            log.warning(notes[-1])
            return EXIT_BLOCKED

        # HTTP mode: start the PO-token server (stopped again in `finally`); a shared server of
        # the GUI (m1) is neither started nor stopped
        watchdog.check()
        pre = local_preflight(settings, watchdog, wait=pot_wait)
        if pre is not None and pre.code == "pot":  # no request at all without the token server
            errors += 1
            notes.append(str(pre))
            log.error("%s", pre)
            return EXIT_FAILED
        target_error = pre  # 'target': checking works, loading does not

        factory = client_factory or _default_factory(settings, db, throttle, watchdog)
        bus = EventBus()
        queue = DownloadQueue(
            db,
            throttle,
            bus,
            factory,
            settings_provider=lambda: settings,
            run_lock=_HeldLock,
            preflight=lambda wait, stop: local_preflight(settings, watchdog, wait=wait, stop=stop),
            record_run=False,
            pot_wait=pot_wait,
        )
        throttle.start_run()
        client = factory()
        res = watchlist.check_all(
            client=client,
            db=db,
            throttle=throttle,
            settings=settings,
            enqueue=lambda ids: queue.enqueue(ids, auto=True),
            run_kind=None,
        )
        found, errors = res.found, res.errors
        if res.note:
            notes.append(res.note)

        if not res.backoff and db.next_queued() is not None:
            if queue.paused:
                notes.append(tr("headless.paused"))
            elif target_error is not None:
                errors += 1
                notes.append(str(target_error))
                log.error("%s", target_error)
            else:
                queue.run_pending()
                session = queue.last_session
                downloaded = session["downloaded"]
                errors += session["errors"]
                if session["note"]:
                    notes.append(session["note"])
                elif db.next_queued() is not None and queue.blocked()[1]:
                    notes.append(queue.blocked()[1])
        # SPEC §5: a successful run resets the backoff escalation (never lifts an active
        # backoff). Review m5: per platform - every platform whose sources were checked
        # without a 429/bot check (SoundCloud's level was never reset by watchlist checks)
        ok_platforms = res.ok_platforms()
        if ok_platforms and hasattr(throttle, "platform"):
            throttle.finish_run(True, platforms=ok_platforms)
        else:
            throttle.finish_run(res.checked > 0 and not res.backoff)
        # Review m5: only active platforms count for the exit code (a SoundCloud backoff with
        # `soundcloud.enabled = false` or without SoundCloud sources is not «blocked»)
        until_now = None
        if hasattr(throttle, "platform"):
            relevant = watchlist.active_platforms(db, settings)
            if db.next_queued() is not None:  # waiting downloads count as well
                relevant |= set(db.queued_platforms())
            if not settings.soundcloud.enabled:
                relevant.discard("soundcloud")
            for name in sorted(relevant):
                until_now = throttle.platform(name).backoff_until()
                if until_now is not None:
                    break
        else:
            until_now = throttle.backoff_until()
        if until_now is not None or res.backoff:
            code = EXIT_BLOCKED
            if until_now is not None and not any(n.startswith("Backoff") for n in notes):
                notes.append(tr("headless.backoff_until", until=format_until(until_now)))
        elif errors:
            code = EXIT_FAILED
        return code
    except Exception as exc:
        log.exception(tr("headless.unexpected_log"))
        errors += 1
        notes.append(tr("headless.unexpected", error=exc)[:200])
        return EXIT_FAILED
    finally:
        if client is not None:
            try:
                client.close()
            except Exception:
                log.debug("Closing client", exc_info=True)
        try:
            watchdog.stop()
        except Exception:
            log.debug("Stopping PO token server", exc_info=True)
        db.finish_run(
            run_id,
            found=found,
            downloaded=downloaded,
            errors=errors,
            note="; ".join(n for n in notes if n) or None,
        )
        log.info(
            tr(
                "headless.finished",
                n=found,
                downloaded=downloaded,
                errors=errors,
                extra=f" · {'; '.join(notes)}" if notes else "",
            ),
        )
