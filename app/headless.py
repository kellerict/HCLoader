"""Headless watchlist run for the Windows task scheduler: `python -m app.main --headless
--run-watchlist` (SPEC §2, §3.2, Phase 4). No GUI import (no pywebview).

Sequence: config/DB/logging, run lock + watchlist lock (exit 4 if another run holds one), start the
PO-token server (HTTP mode), check all enabled sources incrementally, then load the queued videos
(auto-download entries and anything else already queued) sequentially through the normal
`DownloadQueue` - `throttle.max_downloads_per_run` applies, the rest stays queued. One `runs`
entry of kind `headless` (found, downloaded, errors, note). Exit codes: `app/exitcodes.py`.
"""

from __future__ import annotations

import logging
import sys
from collections.abc import Callable
from typing import Any

from .core import config, locks, watchlist
from .core.config import Settings
from .core.db import Database
from .core.discover import format_until
from .core.logging_setup import setup_logging
from .core.throttle import Throttle
from .exitcodes import EXIT_BLOCKED, EXIT_BUSY, EXIT_FAILED, EXIT_OK
from .worker import DownloadQueue, EventBus, PotWatchdog, WatchdogPotServer, local_preflight

log = logging.getLogger("hcloader.headless")

ClientFactory = Callable[[], Any]


class _HeldLock:
    """The run lock is held by the headless run itself; the queue's `run_session` gets this."""

    def release(self) -> None:
        pass


def _say(message: str) -> None:
    log.error("%s", message)
    print(message, file=sys.stderr)  # no-op under pythonw (no stderr)


def run_watchlist(
    *,
    settings: Settings | None = None,
    db: Database | None = None,
    client_factory: ClientFactory | None = None,
    watchdog: PotWatchdog | None = None,
    run_lock: Callable[[], Any] = locks.acquire_run_lock,
    watchlist_lock: Callable[[], Any] = locks.acquire_watchlist_lock,
    configure_logging: bool = True,
    throttle: Throttle | None = None,
    pot_wait: float = 20.0,
) -> int:
    """Run one headless watchlist cycle; returns the process exit code."""
    if settings is None:
        settings, warnings = config.load_with_warnings()
    else:
        warnings = []
    if configure_logging:
        setup_logging(settings.general.log_level, console=sys.stderr is not None)
    for w in warnings:
        log.warning(w)

    run = run_lock()
    if run is None:
        _say("Ein anderer Download-Lauf ist aktiv (GUI oder Headless).")
        return EXIT_BUSY
    wl = watchlist_lock()
    if wl is None:
        run.release()
        _say("Die Watchlist wird gerade von einem anderen Lauf geprüft.")
        return EXIT_BUSY
    own_db = db is None
    db = db or Database(config.db_path())
    try:
        return _run(
            settings,
            db,
            client_factory,
            watchdog,
            throttle or Throttle(db, lambda: settings.throttle),
            pot_wait,
        )
    finally:
        if own_db:
            db.close()
        wl.release()
        run.release()


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
    watchdog: PotWatchdog | None,
    throttle: Throttle,
    pot_wait: float,
) -> int:
    # we hold the run lock: rows left in 'downloading' by a crash are not in use by anyone
    n = db.reset_interrupted_downloads()
    if n:
        log.warning("%d unterbrochene Downloads auf 'failed' gesetzt", n)

    run_id = db.start_run("headless")
    log.info("Headless-Lauf gestartet (Watchlist)")
    found = downloaded = errors = 0
    notes: list[str] = []
    code = EXIT_OK
    watchdog = watchdog or PotWatchdog(lambda: settings)
    client: Any = None
    try:
        until = throttle.backoff_until()
        if until:
            notes.append(f"Backoff aktiv bis {format_until(until)} – nichts geprüft")
            log.warning(notes[-1])
            return EXIT_BLOCKED

        watchdog.check()  # HTTP mode: start the PO-token server (stopped again in `finally`)
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
                notes.append("Warteschlange pausiert – nichts geladen")
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
        # SPEC §5: a successful run resets the backoff escalation (never lifts an active backoff)
        throttle.finish_run(res.checked > 0 and not res.backoff)
        if throttle.backoff_until() is not None:
            code = EXIT_BLOCKED
            if not any(n.startswith("Backoff") for n in notes):
                notes.append(f"Backoff bis {format_until(throttle.backoff_until())}")
        elif errors:
            code = EXIT_FAILED
        return code
    except Exception as exc:
        log.exception("Headless-Lauf: unerwarteter Fehler")
        errors += 1
        notes.append(f"Unerwarteter Fehler: {exc}"[:200])
        return EXIT_FAILED
    finally:
        if client is not None:
            try:
                client.close()
            except Exception:
                log.debug("Client schliessen", exc_info=True)
        try:
            watchdog.stop()
        except Exception:
            log.debug("PO-Token-Server beenden", exc_info=True)
        db.finish_run(
            run_id,
            found=found,
            downloaded=downloaded,
            errors=errors,
            note="; ".join(n for n in notes if n) or None,
        )
        log.info(
            "Headless-Lauf beendet: %d neu, %d geladen, %d Fehler%s",
            found,
            downloaded,
            errors,
            f" · {'; '.join(notes)}" if notes else "",
        )
