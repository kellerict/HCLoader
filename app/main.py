"""Entry point: GUI (Phase 2), `--headless --run-watchlist` (Phase 4), `--smoke <URL>` (QA)."""

from __future__ import annotations

import argparse
import logging
import os
import re
import sys
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from .core import binaries, config, i18n, locks, selfupdate, webview2
from .core.db import Database, MigrationBackupError, SchemaTooNewError
from .core.i18n import tr
from .core.logging_setup import console_logs_errors, setup_logging
from .core.throttle import Throttle, ThrottleError
from .exitcodes import EXIT_BLOCKED, EXIT_BUSY, EXIT_FAILED, EXIT_OK, EXIT_USAGE

# yt-dlp is imported lazily (run_smoke / first search or download in the GUI): an in-app update
# before that takes effect without restart, and Windows does not lock its .pyd files (m2).

log = logging.getLogger("hcloader")


def build_parser() -> argparse.ArgumentParser:
    # no abbreviations: `--op`/`--prot` must not silently match a real option (review v0.9.0 M1)
    p = argparse.ArgumentParser(prog="app.main", description="HCLoader", allow_abbrev=False)
    p.add_argument("--smoke", metavar="URL", help=tr("cli.smoke"))
    p.add_argument("--headless", action="store_true", help=tr("cli.headless"))
    p.add_argument("--run-watchlist", action="store_true", help=tr("cli.run_watchlist"))
    # v0.9.0: open a view (a click on a Windows notification starts `--open hcloader://inbox`)
    p.add_argument("--open", metavar="VIEW", default=None, help=tr("cli.open"))
    return p


OPEN_VIEWS = ("discover", "inbox", "watchlist", "downloads", "library", "stats", "log", "settings")


def view_arg(value: str | None) -> str | None:
    """`inbox`, `hcloader://inbox` or `hcloader:inbox/` -> "inbox"; anything else -> None."""
    if not value:
        return None
    v = value.strip().lower()
    if v.startswith("hcloader:"):
        v = v[len("hcloader:") :]
    v = v.strip("/")
    return v if v in OPEN_VIEWS else None


# Review v0.9.0 M1: `hcloader:` links (toast click, or any other program/web page) may only
# navigate. Registered command: `... -c "<code>" --protocol "%1"`; see main() / docs/decisions.md.
PROTOCOL_FLAG = "--protocol"
PROTOCOL_VIEWS = ("inbox", "downloads", "library", "stats")
_PROTOCOL_RE = re.compile(r"hcloader://(?:open/)?(inbox|downloads|library|stats)/?")
_PROTOCOL_CHARS = re.compile(r"[A-Za-z:/]{1,64}")


def protocol_view(url: str | None) -> str | None:
    """Strict allow-list: `hcloader://open/<view>` (or the v0.9.0 form `hcloader://<view>`) with
    <view> in PROTOCOL_VIEWS, optional trailing slash -> view; anything else -> None. No
    percent-decoding, no query/fragment, no spaces/quotes/dashes."""
    if not url or not _PROTOCOL_CHARS.fullmatch(url):
        return None
    m = _PROTOCOL_RE.fullmatch(url.lower())
    return m.group(1) if m else None


def _is_protocol_call(argv: Sequence[str]) -> bool:
    return any(a == PROTOCOL_FLAG or a.startswith(PROTOCOL_FLAG + "=") for a in argv)


def run_protocol(argv: Sequence[str]) -> int:
    """`--protocol <url>`: exactly these two arguments, otherwise nothing happens. Only forwards
    the view to the running instance or starts the GUI at it - never smoke, watchlist,
    headless or a download."""
    if len(argv) != 2 or argv[0] != PROTOCOL_FLAG:
        log.warning("hcloader: link refused (unexpected arguments)")
        return EXIT_USAGE
    view = protocol_view(argv[1])
    if view is None:
        log.warning("hcloader: link refused (not an allowed target)")
        return EXIT_USAGE
    _init_language()
    if sys.platform == "win32" and (
        selfupdate.interrupted(update_dir()) or selfupdate.update_in_progress(update_dir())
    ):
        return EXIT_BUSY  # a link does not start the updater recovery; a normal start does
    return _start_gui(view)


def _reset_interrupted(db: Database) -> None:
    """Startup housekeeping: rows left in 'downloading' by a crash become 'failed'."""
    n = db.reset_interrupted_downloads()
    if n:
        log.warning(tr("run.interrupted_reset", n=n))


WINDOW_TITLE = "HCLoader"
WINDOW_SIZE = (1440, 900)
WINDOW_MIN_SIZE = (1100, 700)
WINDOW_BG = "#08080a"
# Explicit AppUserModelID: the taskbar groups the window under HCLoader (own icon) instead of
# under pythonw.exe.
APP_USER_MODEL_ID = "HCLoader.App"


# Marker in the user agent: tells bridge.js it runs inside the app (wait for the real API instead
# of falling back to the mock). Not a query string: pywebview hands the file URL to .NET
# System.Uri, and the .NET Framework treats "?host=..." of a file: URL as part of the file name
# (ERR_FILE_NOT_FOUND in WebView2).
UA_MARKER = "HCLoader-App"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
    f"Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0 {UA_MARKER}/1"
)


def ui_url() -> str:
    """`ui/index.html` as plain file URL (no query or fragment: pywebview hands it to .NET
    System.Uri, which keeps neither for file: URLs, see USER_AGENT)."""
    index = Path(__file__).resolve().parents[1] / "ui" / "index.html"
    return index.as_uri()


def icon_path() -> Path:
    """Window/taskbar icon (multi-size ICO, built by scripts/make_icon.py)."""
    return Path(__file__).resolve().parents[1] / "ui" / "img" / "hcloader.ico"


def _set_app_user_model_id() -> None:
    """Windows only, best effort; must run before the first window is created."""
    if sys.platform != "win32":
        return
    try:
        import ctypes

        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(APP_USER_MODEL_ID)  # type: ignore[attr-defined]
    except Exception:
        log.debug("AppUserModelID could not be set", exc_info=True)


def _bring_to_front(window) -> None:
    """Restore and show the window (second start, SPEC §2)."""
    for step in (window.restore, window.show):
        try:
            step()
        except Exception:
            log.debug("Window: %s failed", step, exc_info=True)
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


def show_fatal(message: str, open_url: str | None = None) -> None:
    """Make a start error visible: under pythonw there is no console (n4).

    Always stderr + log; on Windows additionally a MessageBox (ctypes, no extra dependency) -
    but only without a console (pythonw: `sys.stderr` is None) and never when
    `HCLOADER_NO_DIALOG` is set (tests/CI: a modal box would block forever). With `open_url`
    the box asks whether to open that page (Yes = default browser).
    """
    log.critical("%s", message)
    try:
        if not console_logs_errors():  # the console log handler printed it already
            print(message, file=sys.stderr)
    except Exception:  # pythonw: sys.stderr may be None
        pass
    if sys.platform == "win32" and _dialog_allowed():
        try:
            import ctypes

            mb_iconerror, mb_yesno, idyes = 0x10, 0x04, 6
            if open_url:
                text = f"{message}\n\n{tr('main.open_page')}"
                flags = mb_iconerror | mb_yesno
            else:
                text, flags = message, mb_iconerror
            answer = ctypes.windll.user32.MessageBoxW(None, text, "HCLoader", flags)  # type: ignore[attr-defined]
            if open_url and answer == idyes:
                os.startfile(open_url)  # type: ignore[attr-defined]
        except Exception:
            log.debug("MessageBox failed", exc_info=True)


def db_error_message(exc: Exception) -> str:
    """Start dialog text for DB errors that need the user (self-update, docs/decisions.md)."""
    if isinstance(exc, SchemaTooNewError):
        return exc.user_message(config.app_home() / "backups")
    return tr("main.start_failed", error=exc)


# message keys (app/locales)
UPDATE_RUNNING = "main.update_running"
UPDATE_RECOVERING = "main.update_recovering"
UPDATE_RECOVER_FAILED = "main.update_recover_failed"


def update_dir() -> Path:
    return config.app_home() / "update"


def configure_webview(module: Any) -> None:
    """Explicit pywebview settings instead of relying on defaults. ALLOW_FILE_URLS: the player
    plays local files via file: URLs and routes them through Web Audio; on WebView2 pywebview
    then adds `--allow-file-access-from-files` (otherwise the media element source may be
    treated as cross-origin and output silence - the player falls back, see player.js)."""
    settings = getattr(module, "settings", None)
    if isinstance(settings, dict):
        settings["ALLOW_FILE_URLS"] = True


def run_gui(view: str | None = None) -> int:
    """GUI start with visible error reporting (log + MessageBox under pythonw)."""
    try:
        return _run_gui(view) if view else _run_gui()
    except (SchemaTooNewError, MigrationBackupError) as exc:
        log.error(tr("main.database_error", error=exc))
        show_fatal(db_error_message(exc))
        return EXIT_FAILED
    except Exception as exc:
        log.exception(tr("main.gui_failed"))
        show_fatal(tr("main.start_failed_log", error=exc, logs=config.logs_dir()))
        return EXIT_FAILED


def _run_gui(view: str | None = None) -> int:
    """pywebview window with the js_api bridge (app/api.py) and background services."""
    from .core import portable

    portable.prepare_gui_start()  # Mark of the Web on pythonnet DLLs (portable ZIP)
    try:
        import webview
    except ImportError:
        show_fatal(tr("main.no_pywebview"))
        return EXIT_FAILED
    from .api import Api
    from .instance import ActivationServer

    settings, _ = config.load_with_warnings()
    setup_logging(settings.general.log_level, history=500)
    if webview2.missing():
        # pywebview would fall back to MSHTML, where the UI does not work (portable ZIP: nobody
        # installed the runtime; the installer does it itself)
        show_fatal(
            tr("main.webview2_missing", url=webview2.DOWNLOAD_URL), open_url=webview2.DOWNLOAD_URL
        )
        return EXIT_FAILED
    st = binaries.status()
    log.info(
        tr(
            "main.started",
            ytdlp=st["yt_dlp_version"] or tr("main.missing"),
            deno=st["deno_version"] or tr("main.missing"),
            ffmpeg=st["ffmpeg_version"] or tr("main.missing"),
            plugin=st["bgutil_version"] or tr("main.missing"),
        ),
    )
    api = Api()  # logs config warnings itself
    try:  # M1: a v0.9.0 dev build registered the old `--open "%1"` command - rewrite it
        from .core import notify

        notify.refresh_registration(config.app_root(), notify.icon_file(config.app_root()))
    except Exception:
        log.debug("Protocol registration refresh failed", exc_info=True)
    if view:
        api.set_open_view(view)  # v0.9.0: --open / click on a notification, first get_settings
    _set_app_user_model_id()
    configure_webview(webview)
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
    activation = ActivationServer(lambda: _bring_to_front(window), on_view=api.open_view)
    activation.start()
    api.start()
    try:
        log.info("UI: %s", ui_url())
        # pywebview (WinForms) sets Form.Icon from this path; a missing file falls back to the
        # icon of the Python executable
        webview.start(user_agent=USER_AGENT, icon=str(icon_path()))
    finally:
        # R2-n4: shut the services down first, then stop answering "show" requests; a second
        # start in between finds the (still held) single-instance lock and just exits
        try:
            api.shutdown()
        finally:
            activation.stop()
        # self-update: "Jetzt neu starten" or "beim Beenden einspielen" - the updater waits
        # for this process to end (after the queue has stopped and the DB is closed)
        try:
            api.finish_update()
        except Exception:
            log.exception(tr("main.update_start_failed"))
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
        st["deno_version"] or "MISSING",
        st["ffmpeg_version"] or "MISSING",
    )
    from .core.ytclient import DownloadResult, YtClient, YtClientError, soundcloud_track_url

    run_lock = locks.acquire_run_lock()
    if run_lock is None:
        print(tr("run.busy"), file=sys.stderr)
        return EXIT_BUSY
    db = Database(config.db_path())
    _reset_interrupted(db)
    throttle = Throttle(
        db,
        lambda: settings.throttle,
        platform_settings={"soundcloud": lambda: settings.soundcloud},
    )
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
        target = url
        if soundcloud_track_url(url):
            # a permalink carries no track id: resolve it first (through the throttle), then
            # download by id like every other track
            meta = client.resolve(url)
            target = meta.get("id") or ""
            if not target:
                print(tr("smoke.no_track_id"), file=sys.stderr)
                return EXIT_FAILED
            print(tr("smoke.resolved", id=target, title=meta.get("title") or ""), flush=True)
        result: DownloadResult = client.download(target, on_progress=on_progress)
        throttle.finish_run(result.status == "done")
    except YtClientError as exc:
        print(tr("smoke.error", error=exc), file=sys.stderr)
        return EXIT_BLOCKED if exc.rate_limited else EXIT_FAILED
    except ThrottleError as exc:
        print(tr("smoke.blocked", error=exc), file=sys.stderr)
        return EXIT_BLOCKED
    finally:
        client.close()
        db.close()
        run_lock.release()
    print(tr("smoke.result", status=result.status))
    if result.file_path:
        print(tr("smoke.file", path=result.file_path))
    if result.cue_path:
        print(f"CUE: {result.cue_path}")
    if result.error:
        print(tr("smoke.error", error=result.error), file=sys.stderr)
    return EXIT_OK if result.ok else EXIT_FAILED


def _recover_interrupted_update(args: argparse.Namespace) -> bool:
    """Review m2: apply_update.ps1 left its journal (killed mid-swap, failed rollback). Start
    the updater with `-Recover` (it does nothing while that updater is still alive) and exit;
    the GUI is restarted by the script, a headless run simply ends (next scheduled run)."""
    if sys.platform != "win32" or not selfupdate.interrupted(update_dir()):
        return False
    started = selfupdate.start_recovery(
        update_dir(), config.app_root(), restart=not args.run_watchlist
    )
    text = tr(UPDATE_RECOVERING if started else UPDATE_RECOVER_FAILED)
    if args.run_watchlist:
        print(text, file=sys.stderr)
    else:
        show_fatal(text)
    return True


def _init_language() -> None:
    """Messages before the GUI/headless run (CLI help, start dialogs) in the configured
    language; a broken config is reported later by the normal start."""
    try:
        i18n.set_language(config.load_with_warnings()[0].general.language)
    except Exception:
        i18n.set_language(i18n.REFERENCE)


ACTION_FLAGS = ("smoke", "headless", "run_watchlist")


def main(argv: Sequence[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    if _is_protocol_call(argv):  # first, before any other flag is looked at (M1)
        return run_protocol(argv)
    _init_language()
    args = build_parser().parse_args(argv)
    if args.open is not None and any(getattr(args, f) for f in ACTION_FLAGS):
        print(tr("cli.open_alone"), file=sys.stderr)
        return EXIT_USAGE
    if args.smoke:
        return run_smoke(args.smoke)
    if (args.run_watchlist or not args.headless) and _recover_interrupted_update(args):
        return EXIT_BUSY
    if (args.run_watchlist or not args.headless) and selfupdate.update_in_progress(update_dir()):
        # apply_update.ps1 swaps the program files right now (lock file, docs/decisions.md)
        if args.run_watchlist:
            print(tr(UPDATE_RUNNING), file=sys.stderr)
        else:
            show_fatal(tr(UPDATE_RUNNING))
        return EXIT_BUSY
    if args.run_watchlist:
        from .headless import run_watchlist

        return run_watchlist()
    if args.headless:
        print(tr("cli.headless_needs_watchlist"), file=sys.stderr)
        return EXIT_USAGE
    return _start_gui(view_arg(args.open))


def _start_gui(view: str | None) -> int:
    """Single instance: forward `view` to the running window, or start the GUI at it."""
    instance = locks.acquire_single_instance()
    if instance is None:
        from .instance import request_activation

        acked = request_activation(view=view) if view else request_activation()
        if not acked:
            print(tr("main.already_running"), file=sys.stderr)
        return EXIT_OK
    try:
        # only while no download run is active (a headless run may be downloading right now)
        run_lock = locks.acquire_run_lock()
        if run_lock is not None:
            try:
                with Database(config.db_path()) as db:
                    _reset_interrupted(db)
            except (SchemaTooNewError, MigrationBackupError) as exc:
                show_fatal(db_error_message(exc))
                return EXIT_FAILED
            finally:
                run_lock.release()
        return run_gui(view) if view else run_gui()
    finally:
        instance.release()


if __name__ == "__main__":
    sys.exit(main())
