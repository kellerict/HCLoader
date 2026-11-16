"""Entry point: GUI (Phase 2), `--headless --run-watchlist` (Phase 4), `--smoke <URL>` (QA)."""

from __future__ import annotations

import argparse
import logging
import sys
from collections.abc import Sequence
from pathlib import Path

from .core import binaries, config
from .core.db import Database
from .core.logging_setup import setup_logging
from .core.throttle import Throttle, ThrottleError
from .core.ytclient import DownloadResult, YtClient

log = logging.getLogger("hcloader")

EXIT_OK = 0
EXIT_FAILED = 1
EXIT_BLOCKED = 2
EXIT_USAGE = 3


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="app.main", description="HCLoader")
    p.add_argument("--smoke", metavar="URL", help="genau einen Download ausführen (nur QA)")
    p.add_argument("--headless", action="store_true", help="ohne GUI laufen")
    p.add_argument("--run-watchlist", action="store_true", help="Watchlist prüfen (mit --headless)")
    return p


def acquire_single_instance() -> bool:
    """Placeholder: the single-instance lock follows with the GUI (Phase 2/3)."""
    return True


def run_gui() -> int:
    """Open the UI prototype in pywebview if available (full bridge follows in Phase 2)."""
    try:
        import webview
    except ImportError:
        print("pywebview ist nicht installiert (pip install pywebview).", file=sys.stderr)
        return EXIT_FAILED
    index = Path(__file__).resolve().parents[1] / "ui" / "index.html"
    webview.create_window("HCLoader", index.as_uri(), width=1280, height=820)
    webview.start()
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
    db = Database(config.db_path())
    throttle = Throttle(db, lambda: settings.throttle)
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
    except ThrottleError as exc:
        print(f"GESPERRT: {exc}", file=sys.stderr)
        return EXIT_BLOCKED
    finally:
        client.close()
        db.close()
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
    if args.headless or args.run_watchlist:
        if args.run_watchlist:
            print("Watchlist-Lauf folgt in Phase 4.")
            return EXIT_OK
        print("--headless braucht --run-watchlist.", file=sys.stderr)
        return EXIT_USAGE
    if not acquire_single_instance():
        return EXIT_OK
    return run_gui()


if __name__ == "__main__":
    sys.exit(main())
