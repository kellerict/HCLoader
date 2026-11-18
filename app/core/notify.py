"""v0.9.0 Windows notifications (toasts): new sets in the inbox, downloads finished / failed.

No spam: events are collected in the database (`state.notify_pending`, shared by the GUI and the
scheduled headless run) and shown as ONE toast per batch - the GUI waits a short moment after
the last event (worker.NotificationService), downloads count once per queue run, two toasts
are at least `MIN_GAP_S` apart, and during the quiet hours nothing is shown: the batch grows and
becomes one summary afterwards. Clicking the toast opens the app at the matching view
(protocol `hcloader://open/<view>`, registered per user in HKCU, see `ensure_registered`; the
link can only navigate, see app/main.protocol_view and docs/decisions.md).

Sending (docs/decisions.md «Windows notifications»): no extra Python package is required -
Windows PowerShell 5.1 (part of every Windows 10/11) shows the toast through the WinRT
`ToastNotificationManager` with our AppUserModelID `HCLoader.App`. If the optional pywinrt
packages (`winrt-Windows.UI.Notifications`, `winrt-Windows.Data.Xml.Dom`) are installed they are
used instead (no process start). Anything missing -> notifications are just logged.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import re
import subprocess
import sys
import threading
from collections.abc import Callable, Iterator, Mapping
from contextlib import contextmanager, nullcontext
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, Protocol
from xml.sax.saxutils import escape, quoteattr

from .i18n import tr

log = logging.getLogger(__name__)

APP_ID = "HCLoader.App"  # = app/main.APP_USER_MODEL_ID, installer AppUserModelID
PROTOCOL = "hcloader"
VIEWS = ("inbox", "downloads", "library")
STATE_PENDING = "notify_pending"
STATE_LAST = "notify_last_sent"
MIN_GAP_S = 120  # two toasts at least this far apart (the batch keeps growing meanwhile)
MAX_TITLES = 3
PS_TIMEOUT_S = 20
_lock = threading.RLock()
# XML 1.0 forbids these; a title from YouTube may contain them (review v0.9.0 m4)
_XML_ILLEGAL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\ufffe\uffff]")


@contextmanager
def _shared(db: Any) -> Iterator[None]:
    """Process lock + one `BEGIN IMMEDIATE` transaction: the batch is shared by the GUI and a
    scheduled headless run, so read-modify-write must be atomic across processes (m6)."""
    txn = getattr(db, "transaction", None)
    with _lock, txn(immediate=True) if txn is not None else nullcontext():
        yield


# --------------------------------------------------------------------------- quiet hours


def _minutes(hhmm: str) -> int:
    h, m = str(hhmm or "00:00").split(":")
    return int(h) * 60 + int(m)


def in_quiet_hours(cfg: Any, now: datetime | None = None) -> bool:
    """`cfg` = settings.notifications. From == to means «all day»; from > to spans midnight."""
    if not cfg.quiet_hours:
        return False
    now = now or datetime.now().astimezone()
    cur = now.hour * 60 + now.minute
    start, end = _minutes(cfg.quiet_from), _minutes(cfg.quiet_to)
    if start == end:
        return True
    if start < end:
        return start <= cur < end
    return cur >= start or cur < end


# --------------------------------------------------------------------------- pending batch


def _empty() -> dict[str, Any]:
    return {"new_sets": 0, "downloaded": 0, "failed": 0, "titles": [], "failed_titles": []}


def pending(db: Any) -> dict[str, Any]:
    raw = db.get_state(STATE_PENDING)
    data = _empty()
    if raw:
        try:
            loaded = json.loads(raw)
            if isinstance(loaded, dict):
                for k in ("new_sets", "downloaded", "failed"):
                    data[k] = max(0, int(loaded.get(k) or 0))
                for k in ("titles", "failed_titles"):
                    v = loaded.get(k)
                    data[k] = [str(x) for x in v][-MAX_TITLES:] if isinstance(v, list) else []
        except (ValueError, TypeError):
            log.debug("Pending notifications unreadable - dropped")
    return data


def has_pending(data: Mapping[str, Any]) -> bool:
    return bool(data["new_sets"] or data["downloaded"] or data["failed"])


def add(
    db: Any,
    cfg: Any,
    *,
    new_sets: int = 0,
    downloaded: int = 0,
    failed: int = 0,
    titles: list[str] | tuple[str, ...] = (),
    failed_titles: list[str] | tuple[str, ...] = (),
) -> bool:
    """Collect events for the next toast; kinds switched off are not collected at all.
    Returns True if something was added."""
    if not cfg.enabled:
        return False
    new_sets = int(new_sets) if cfg.new_sets else 0
    downloaded = int(downloaded) if cfg.downloads_done else 0
    failed = int(failed) if cfg.downloads_failed else 0
    if not (new_sets > 0 or downloaded > 0 or failed > 0):
        return False
    with _shared(db):
        data = pending(db)
        data["new_sets"] += max(0, new_sets)
        data["downloaded"] += max(0, downloaded)
        data["failed"] += max(0, failed)
        if downloaded:
            data["titles"] = [*data["titles"], *map(str, titles)][-MAX_TITLES:]
        if failed:
            data["failed_titles"] = [*data["failed_titles"], *map(str, failed_titles)][-MAX_TITLES:]
        db.set_state(STATE_PENDING, json.dumps(data, ensure_ascii=False))
    return True


# --------------------------------------------------------------------------- toast content


@dataclass(frozen=True)
class Toast:
    title: str
    body: str
    view: str


def _short(title: str, limit: int = 60) -> str:
    title = " ".join(_XML_ILLEGAL.sub(" ", str(title)).split())
    return title if len(title) <= limit else title[: limit - 1] + "…"


def build(data: Mapping[str, Any]) -> Toast:
    """One toast for the whole batch (texts from the backend catalogs, active language)."""
    n_new, n_done, n_fail = data["new_sets"], data["downloaded"], data["failed"]
    parts = []
    if n_new:
        parts.append(tr("notify.part_new", n=n_new))
    if n_done:
        parts.append(tr("notify.part_done", n=n_done))
    if n_fail:
        parts.append(tr("notify.part_failed", n=n_fail))
    view = "inbox" if n_new else "downloads" if n_fail else "library"
    if len(parts) == 1:
        if n_new:
            return Toast(tr("notify.part_new", n=n_new), tr("notify.new_body"), view)
        if n_done:
            titles = [_short(t) for t in data["titles"]]
            more = n_done - len(titles)
            body = " · ".join(titles) if titles else tr("notify.done_body")
            if titles and more > 0:
                body += " " + tr("notify.more", n=more)
            return Toast(tr("notify.part_done", n=n_done), body, view)
        titles = [_short(t) for t in data["failed_titles"]]
        body = (" · ".join(titles) + " – " if titles else "") + tr("notify.failed_body")
        return Toast(tr("notify.part_failed", n=n_fail), body, view)
    body = tr("notify.open_inbox") if n_new else tr("notify.open_downloads")
    return Toast(" · ".join(parts), body, view)


def launch_uri(view: str) -> str:
    return f"{PROTOCOL}://open/{view if view in VIEWS else 'inbox'}"


def toast_xml(toast: Toast) -> str:
    """ToastGeneric XML; a click starts `hcloader://open/<view>` (protocol activation)."""
    return (
        f'<toast launch={quoteattr(launch_uri(toast.view))} activationType="protocol">'
        '<visual><binding template="ToastGeneric">'
        f"<text>{escape(toast.title)}</text><text>{escape(toast.body)}</text>"
        "</binding></visual></toast>"
    )


# --------------------------------------------------------------------------- senders


class Sender(Protocol):
    name: str

    def available(self) -> bool: ...

    def show(self, xml: str) -> None: ...


class NullSender:
    name = "none"

    def available(self) -> bool:
        return False

    def show(self, xml: str) -> None:
        raise RuntimeError("no notification backend")


class WinRtSender:  # pragma: no cover - Windows with the optional pywinrt packages only
    """pywinrt (`winrt-Windows.UI.Notifications`, `winrt-Windows.Data.Xml.Dom`), optional."""

    name = "winrt"

    def __init__(self) -> None:
        from winrt.windows.data.xml.dom import XmlDocument  # type: ignore[import-not-found]
        from winrt.windows.ui.notifications import (  # type: ignore[import-not-found]
            ToastNotification,
            ToastNotificationManager,
        )

        self._doc, self._toast, self._mgr = XmlDocument, ToastNotification, ToastNotificationManager

    def available(self) -> bool:
        return True

    def show(self, xml: str) -> None:
        doc = self._doc()
        doc.load_xml(xml)
        make = getattr(self._mgr, "create_toast_notifier_with_id", None)
        notifier = make(APP_ID) if make else self._mgr.create_toast_notifier(APP_ID)
        notifier.show(self._toast(doc))


_WRT = "ContentType = WindowsRuntime"
_PS_SCRIPT = "\n".join(
    [
        "$ErrorActionPreference = 'Stop'",
        "$null = [Windows.UI.Notifications.ToastNotificationManager, "
        f"Windows.UI.Notifications, {_WRT}]",
        f"$null = [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, {_WRT}]",
        "$doc = New-Object Windows.Data.Xml.Dom.XmlDocument",
        "$doc.LoadXml($env:HCLOADER_TOAST_XML)",
        "$toast = New-Object Windows.UI.Notifications.ToastNotification $doc",
        "$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("
        "$env:HCLOADER_TOAST_APPID)",
        "$notifier.Show($toast)",
    ]
)


def powershell_path() -> Path:
    """Windows PowerShell 5.1 (PowerShell 7 has no WinRT projection)."""
    root = os.environ.get("SystemRoot") or r"C:\Windows"
    return Path(root) / "System32" / "WindowsPowerShell" / "v1.0" / "powershell.exe"


class PowerShellSender:
    """Shows the toast through Windows PowerShell 5.1 (hidden, no console window). The XML
    travels in an environment variable, the script as -EncodedCommand: nothing to quote."""

    name = "powershell"

    def __init__(
        self,
        runner: Callable[..., Any] = subprocess.run,
        exe: Path | None = None,
    ) -> None:
        self._run = runner
        self._exe = exe

    def available(self) -> bool:
        return sys.platform == "win32" and (self._exe or powershell_path()).exists()

    def command(self) -> list[str]:
        encoded = base64.b64encode(_PS_SCRIPT.encode("utf-16-le")).decode("ascii")
        return [
            str(self._exe or powershell_path()),
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-WindowStyle",
            "Hidden",
            "-EncodedCommand",
            encoded,
        ]

    def show(self, xml: str) -> None:
        env = {**os.environ, "HCLOADER_TOAST_XML": xml, "HCLOADER_TOAST_APPID": APP_ID}
        flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        res = self._run(
            self.command(),
            env=env,
            capture_output=True,
            timeout=PS_TIMEOUT_S,
            creationflags=flags,
            check=False,
        )
        if getattr(res, "returncode", 1) != 0:
            err = (getattr(res, "stderr", b"") or b"")[:300]
            raise RuntimeError(
                err.decode("utf-8", "replace") if isinstance(err, bytes) else str(err)
            )


_sender: Sender | None = None


def default_sender() -> Sender:
    """pywinrt if installed, else Windows PowerShell, else nothing (logged only)."""
    global _sender
    if _sender is None:
        sender: Sender = NullSender()
        if sys.platform == "win32":
            try:
                sender = WinRtSender()
            except Exception:
                ps = PowerShellSender()
                if ps.available():
                    sender = ps
        _sender = sender
        log.debug("Notification backend: %s", sender.name)
    return _sender


# --------------------------------------------------------------------------- registration


def icon_file(root: Path) -> Path:
    """The app icon (= app/main.icon_path) for the toast and the protocol entry."""
    return root / "ui" / "img" / "hcloader.ico"


def notify_run(
    db: Any,
    settings: Any,
    root: Path,
    *,
    sender: Sender | None = None,
    **counts: Any,
) -> dict[str, Any]:
    """Headless run (scheduled task): collect this run's events and show the batch right away
    (quiet hours / gap: it stays for the GUI or the next run). Never raises."""
    try:
        cfg = settings.notifications
        add(db, cfg, **counts)
        if not has_pending(pending(db)):
            return {"sent": False, "reason": "empty"}
        if cfg.enabled:
            ensure_registered(root, icon_file(root))
        return flush(db, cfg, sender or default_sender())
    except Exception:
        log.debug("Notification after the run failed", exc_info=True)
        return {"sent": False, "reason": "error"}


def pythonw() -> Path:
    exe = Path(sys.executable)
    cand = exe.with_name("pythonw.exe")
    return cand if cand.exists() else exe


PROTOCOL_KEY = rf"Software\Classes\{PROTOCOL}"
PROTOCOL_COMMAND_KEY = rf"{PROTOCOL_KEY}\shell\open\command"


def protocol_command(root: Path, exe: Path | None = None) -> str | None:
    """Command line Windows runs for `hcloader://open/<view>`; None if a path cannot be quoted.

    Review v0.9.0 M1: a dedicated entry `--protocol "%1"` as the LAST and only argument -
    app/main.main() handles it before anything else and refuses any extra argument (a URL with
    a quote that splits into `--smoke ...` does nothing). `-I` (isolated: no current directory,
    no PYTHON* variables, no user site) because the caller's working directory is arbitrary
    (m7); the app root is inserted explicitly."""
    exe = exe or pythonw()
    if any(c in str(root) for c in "'\"%") or any(c in str(exe) for c in '"%'):
        return None
    code = f"import sys; sys.path.insert(0, r'{root}'); from app.main import main; sys.exit(main())"
    return f'"{exe}" -X utf8 -I -c "{code}" --protocol "%1"'


def _toast_logo(icon: Path) -> Path:
    """The toast shows a PNG best; fall back to the ICO if the PNG is missing."""
    png = icon.parent / "icon-192.png"
    return png if png.exists() else icon


def ensure_registered(root: Path, icon: Path, *, reg: Any = None) -> bool:
    """Per-user registration (HKCU, no admin): the AppUserModelID (name + icon in the toast)
    and the `hcloader:` protocol (click -> app at the view). Idempotent; removed by the
    uninstaller. Returns True if everything is in place."""
    if reg is None:
        if sys.platform != "win32":
            return False
        import winreg as reg  # type: ignore[no-redef]
    cmd = protocol_command(root)
    values = [
        (rf"Software\Classes\AppUserModelId\{APP_ID}", "DisplayName", "HCLoader"),
        (rf"Software\Classes\AppUserModelId\{APP_ID}", "IconUri", str(_toast_logo(icon))),
        (PROTOCOL_KEY, "", "URL:HCLoader"),
        (PROTOCOL_KEY, "URL Protocol", ""),
        (rf"{PROTOCOL_KEY}\DefaultIcon", "", f'"{icon}"'),
    ]
    if cmd:
        values.append((PROTOCOL_COMMAND_KEY, "", cmd))
    try:
        for path, name, value in values:
            with reg.CreateKeyEx(reg.HKEY_CURRENT_USER, path, 0, reg.KEY_READ | reg.KEY_WRITE) as k:
                try:
                    cur = reg.QueryValueEx(k, name)[0]
                except OSError:
                    cur = None
                if cur != value:
                    reg.SetValueEx(k, name, 0, reg.REG_SZ, value)
    except OSError as exc:
        log.warning("Notification registration failed: %s", exc)
        return False
    if cmd is None:
        _remove_command(reg)  # never leave an older command line behind
    return cmd is not None


def _remove_command(reg: Any) -> None:
    try:
        reg.DeleteKey(reg.HKEY_CURRENT_USER, PROTOCOL_COMMAND_KEY)
    except OSError:
        pass


def refresh_registration(root: Path, icon: Path, *, reg: Any = None) -> bool:
    """App start: if the `hcloader:` protocol is registered already (e.g. by a v0.9.0 dev build
    with the old `--open "%1"` command), bring it to the current command. Registers nothing
    new (that happens before the first toast). Returns True if the entry was rewritten."""
    if reg is None:
        if sys.platform != "win32":
            return False
        import winreg as reg  # type: ignore[no-redef]
    try:
        with reg.OpenKey(reg.HKEY_CURRENT_USER, PROTOCOL_COMMAND_KEY, 0, reg.KEY_READ) as k:
            cur = reg.QueryValueEx(k, "")[0]
    except OSError:
        return False  # not registered: nothing to update
    if cur == protocol_command(root):
        return False
    log.info("Updating the hcloader: protocol registration")
    ensure_registered(root, icon, reg=reg)
    return True


# --------------------------------------------------------------------------- flush


def _last_sent(db: Any) -> datetime | None:
    raw = db.get_state(STATE_LAST)
    try:
        return datetime.fromisoformat(raw) if raw else None
    except ValueError:
        return None


def flush(
    db: Any,
    cfg: Any,
    sender: Sender,
    *,
    now: datetime | None = None,
    min_gap: float = MIN_GAP_S,
) -> dict[str, Any]:
    """Show the collected batch as one toast. -> {sent, reason?, retry_in?}. Reasons:
    empty, disabled (collected events dropped), quiet (kept for later), gap (kept, retry_in
    seconds), unavailable / error (dropped - logged, never retried in a loop)."""
    now = now or datetime.now().astimezone()
    with _shared(db):
        data = pending(db)
        if not has_pending(data):
            return {"sent": False, "reason": "empty"}
        if not cfg.enabled:
            db.delete_state(STATE_PENDING)
            return {"sent": False, "reason": "disabled"}
        if in_quiet_hours(cfg, now):
            return {"sent": False, "reason": "quiet"}
        last = _last_sent(db)
        if last is not None:
            wait = min_gap - (now - last).total_seconds()
            if 0 < wait <= min_gap:
                return {"sent": False, "reason": "gap", "retry_in": wait}
        toast = build(data)
        db.delete_state(STATE_PENDING)
        db.set_state(STATE_LAST, now.astimezone(UTC).isoformat(timespec="seconds"))
    if not sender.available():
        log.info(tr("notify.log_unavailable", title=toast.title))
        return {"sent": False, "reason": "unavailable", "title": toast.title}
    try:
        sender.show(toast_xml(toast))
    except Exception as exc:
        log.warning(tr("notify.log_failed", error=str(exc)[:200]))
        return {"sent": False, "reason": "error", "title": toast.title}
    log.debug("Notification shown: %s", toast.title)
    return {"sent": True, "title": toast.title, "view": toast.view}


def next_quiet_end(cfg: Any, now: datetime | None = None) -> datetime | None:
    """When the current quiet hours end (None = not in quiet hours / all day)."""
    now = now or datetime.now().astimezone()
    if not in_quiet_hours(cfg, now) or _minutes(cfg.quiet_from) == _minutes(cfg.quiet_to):
        return None
    end = _minutes(cfg.quiet_to)
    cand = now.replace(hour=end // 60, minute=end % 60, second=0, microsecond=0)
    return cand if cand > now else cand + timedelta(days=1)
