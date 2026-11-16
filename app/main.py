"""Entry point: GUI (Phase 2), `--headless --run-watchlist` (Phase 4), `--smoke <URL>` (QA)."""

from __future__ import annotations

import argparse
import logging
import os
import sys
from collections.abc import Sequence
from pathlib import Path

from .core import binaries, config, locks
from .core.db import Database
from .core.logging_setup import setup_logging
from .core.throttle import Throttle, ThrottleError
from .exitcodes import EXIT_BLOCKED, EXIT_BUSY, EXIT_FAILED, EXIT_OK, EXIT_USAGE

# yt-dlp is imported lazily (run_smoke / first search or download in the GUI): an in-app update
# before that takes effect without restart, and Windows does not lock its .pyd files (m2).

log = logging.getLogger("hcloader")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="app.main", description="HCLoader")
    p.add_argument("--smoke", metavar="URL", help="genau einen Download ausführen (nur QA)")
    p.add_argument("--headless", action="store_true", help="ohne GUI laufen")
    p.add_argument("--run-watchlist", action="store_true", help="Watchlist prüfen (mit --headless)")
    return p


def _reset_interrupted(db: Database) -> None:
    """Startup housekeeping: rows left in 'downloading' by a crash become 'failed'."""
    n = db.reset_interrupted_downloads()
    if n:
        log.warning("%d unterbrochene Downloads auf 'failed' gesetzt", n)


WINDOW_TITLE = "HCLoader"
WINDOW_SIZE = (1440, 900)
WINDOW_MIN_SIZE = (1100, 700)
WINDOW_BG = "#08080a"


def ui_url() -> str:
    """`ui/index.html` as file URL; `?host=pywebview` tells bridge.js to wait for the real API
    instead of falling back to the mock (pywebview injects its API only after page load)."""
    index = Path(__file__).resolve().parents[1] / "ui" / "index.html"
    return index.as_uri() + "?host=pywebview"


def _bring_to_front(window) -> None:
    """Restore and show the window (second start, SPEC §2)."""
    for step in (window.restore, window.show):
        try:
            step()
        except Exception:
            log.debug("Fenster: %s fehlgeschlagen", step, exc_info=True)
    try:  # Windows focus rules: briefly topmost so the window really comes forward
        window.on_top = True
        window.on_top = False
    except Exception:
        pass


def _dialog_allowed() -> bool:
    if os.environ.get("HCLOADER_NO_DIALOG"):
        return False
    return (
        sys.stderr is None
        or getattr(sys, "frozen", False)
        or sys.executable.lower().endswith("pythonw.exe")
    )


def show_fatal(message: str) -> None:
    """Make a start error visible: under pythonw there is no console (n4).

    Always stderr + log; on Windows additionally a MessageBox (ctypes, no extra dependency) -
    but only without a console (pythonw: `sys.stderr` is None) and never when
    `HCLOADER_NO_DIALOG` is set (tests/CI: a modal box would block forever).
    """
    log.critical("%s", message)
    try:
        print(message, file=sys.stderr)
    except Exception:  # pythonw: sys.stderr may be None
        pass
    if sys.platform == "win32" and _dialog_allowed():
        try:
            import ctypes

            mb_iconerror = 0x10
            ctypes.windll.user32.MessageBoxW(None, message, "HCLoader", mb_iconerror)  # type: ignore[attr-defined]
        except Exception:
            log.debug("MessageBox fehlgeschlagen", exc_info=True)


def run_gui() -> int:
    """GUI start with visible error reporting (log + MessageBox under pythonw)."""
    try:
        return _run_gui()
    except Exception as exc:
        log.exception("GUI-Start fehlgeschlagen")
        show_fatal(
            f"HCLoader konnte nicht gestartet werden:\n\n{exc}\n\n"
            f"Details im Protokoll: {config.logs_dir()}"
        )
        return EXIT_FAILED


def _run_gui() -> int:
    """pywebview window with the js_api bridge (app/api.py) and background services."""
    from .core import portable

    portable.prepare_gui_start()  # Mark of the Web on pythonnet DLLs (portable ZIP)
    try:
        import webview
    except ImportError:
        show_fatal("pywebview ist nicht installiert (pip install pywebview).")
        return EXIT_FAILED
    from .api import Api
    from .instance import ActivationServer

    settings, _ = config.load_with_warnings()
    setup_logging(settings.general.log_level, history=500)
    st = binaries.status()
    log.info(
        "HCLoader gestartet · yt-dlp %s · Deno %s · ffmpeg %s · Plugin %s",
        st["yt_dlp_version"] or "FEHLT",
        st["deno_version"] or "FEHLT",
        st["ffmpeg_version"] or "FEHLT",
        st["bgutil_version"] or "FEHLT",
    )
    api = Api()  # logs config warnings itself
    window = webview.create_window(
        WINDOW_TITLE,
        url=ui_url(),
        js_api=api,
        width=WINDOW_SIZE[0],
        height=WINDOW_SIZE[1],
        min_size=WINDOW_MIN_SIZE,
        background_color=WINDOW_BG,
    )
    api.attach_window(window)
    activation = ActivationServer(lambda: _bring_to_front(window))
    activation.start()
    api.start()
    try:
        webview.start()
    finally:
        # R2-n4: shut the services down first, then stop answering "show" requests; a second
        # start in between finds the (still held) single-instance lock and just exits
        try:
            api.shutdown()
        finally:
            activation.stop()
    return EXIT_OK


def run_smoke(url: str) -> int:
    """One real download through the full pipeline; prints the result and the target path."""
    settings, warnings = config.load_with_warnings()
    setup_logging(settings.general.log_level, console=True)
    for w in warnings:
        log.warning(w)
    st = binaries.status()
    log.info(
        "yt-dlp %s, ejs %s, bgutil %s, deno %s, ffmpeg %s",
        st["yt_dlp_version"],
        st["ejs_version"],
        st["bgutil_version"],
        st["deno_version"] or "FEHLT",
        st["ffmpeg_version"] or "FEHLT",
    )
    from .core.ytclient import DownloadResult, YtClient

    run_lock = locks.acquire_run_lock()
    if run_lock is None:
        print("Ein anderer Download-Lauf ist aktiv (GUI oder Headless).", file=sys.stderr)
        return EXIT_BUSY
    db = Database(config.db_path())
    _reset_interrupted(db)
    throttle = Throttle(db, lambda: settings.throttle)
    # no GUI watchdog here: the smoke run starts (and stops) its own PO-token server if needed
    client = YtClient(lambda: settings, db, throttle)
    throttle.start_run()
    last = {"key": None}

    def on_progress(d: dict) -> None:
        pct = d.get("percent")
        key = (d.get("phase"), int(pct // 10) if pct is not None else None)
        if key != last["key"]:
            last["key"] = key
            shown = f"{pct:.0f} %" if pct is not None else ""
            print(f"[{d.get('phase')}] {shown}".rstrip(), flush=True)

    try:
        result: DownloadResult = client.download(url, on_progress=on_progress)
        throttle.finish_run(result.status == "done")
    except ThrottleError as exc:
        print(f"GESPERRT: {exc}", file=sys.stderr)
        return EXIT_BLOCKED
    finally:
        client.close()
        db.close()
        run_lock.release()
    print(f"Ergebnis: {result.status}")
    if result.file_path:
        print(f"Datei: {result.file_path}")
    if result.cue_path:
        print(f"CUE: {result.cue_path}")
    if result.error:
        print(f"Fehler: {result.error}", file=sys.stderr)
    return EXIT_OK if result.ok else EXIT_FAILED


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.smoke:
        return run_smoke(args.smoke)
    if args.run_watchlist:
        from .headless import run_watchlist

        return run_watchlist()
    if args.headless:
        print("--headless braucht --run-watchlist.", file=sys.stderr)
        return EXIT_USAGE
    instance = locks.acquire_single_instance()
    if instance is None:
        from .instance import request_activation

        if not request_activation():
            print("HCLoader läuft bereits.", file=sys.stderr)
        return EXIT_OK
    try:
        # only while no download run is active (a headless run may be downloading right now)
        run_lock = locks.acquire_run_lock()
        if run_lock is not None:
            try:
                with Database(config.db_path()) as db:
                    _reset_interrupted(db)
            finally:
                run_lock.release()
        return run_gui()
    finally:
        instance.release()


if __name__ == "__main__":
    sys.exit(main())
