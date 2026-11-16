"""Logging: rotating file under app_home()/logs plus a live stream hook for the UI."""

from __future__ import annotations

import logging
import re
import threading
from datetime import datetime
from collections import deque
from collections.abc import Callable
from logging.handlers import RotatingFileHandler
from pathlib import Path

from .config import logs_dir
from .redact import RedactingFormatter, redact

LOG_FORMAT = "%(asctime)s %(levelname)-7s %(name)s: %(message)s"
_FILE_MARK = "_hcloader_file"


class CallbackHandler(logging.Handler):
    """Forwards formatted records to listeners (UI live log) and keeps a short backlog."""

    def __init__(self, backlog: int = 500) -> None:
        super().__init__()
        self._listeners: list[Callable[[dict], None]] = []
        self._lock = threading.Lock()
        self.backlog: deque[dict] = deque(maxlen=backlog)

    def add_listener(self, fn: Callable[[dict], None]) -> None:
        with self._lock:
            if fn not in self._listeners:
                self._listeners.append(fn)

    def remove_listener(self, fn: Callable[[dict], None]) -> None:
        with self._lock:
            if fn in self._listeners:
                self._listeners.remove(fn)

    def seed(self, entries: list[dict]) -> None:
        """Put older entries (history from the log file) in front of the current backlog."""
        with self._lock:
            current = list(self.backlog)
            self.backlog.clear()
            self.backlog.extend([*entries, *current])

    def emit(self, record: logging.LogRecord) -> None:
        try:
            entry = {
                "ts": record.created,
                "time": self.formatter.formatTime(record, "%H:%M:%S") if self.formatter else "",
                "level": record.levelname,
                "logger": record.name,
                "message": redact(record.getMessage()),
                # optional UI level, e.g. log.info(..., extra={"ui_level": "ok"})
                "ui_level": getattr(record, "ui_level", None),
            }
        except Exception:
            self.handleError(record)
            return
        with self._lock:
            self.backlog.append(entry)
            listeners = list(self._listeners)
        for fn in listeners:
            try:
                fn(entry)
            except Exception:  # a broken UI listener must never break logging
                pass


_live_handler = CallbackHandler()
_live_handler._hcloader_live = True  # type: ignore[attr-defined]


def live_handler() -> CallbackHandler:
    """Handler to subscribe UI listeners to (`add_listener`) and to read the backlog from."""
    return _live_handler


_LINE_RE = re.compile(
    r"^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),\d{3} (\w+)\s+([\w.\-]+): (.*)$"
)
_HISTORY_BYTES = 512 * 1024
_history_loaded = False


def read_history(log_file: Path, max_lines: int = 500) -> list[dict]:
    """Last `max_lines` records of the log file in the shape of `CallbackHandler.backlog`.
    Continuation lines (tracebacks) are skipped; the file was written through the redacting
    formatter. Missing/unreadable file -> []."""
    try:
        with log_file.open("rb") as fh:
            fh.seek(0, 2)
            size = fh.tell()
            fh.seek(max(0, size - _HISTORY_BYTES))
            raw = fh.read()
    except OSError:
        return []
    out: list[dict] = []
    for line in raw.decode("utf-8", "replace").splitlines():
        m = _LINE_RE.match(line)
        if not m:
            continue
        try:
            when = datetime.strptime(m.group(1), "%Y-%m-%d %H:%M:%S")
        except ValueError:
            continue
        out.append(
            {
                "ts": when.timestamp(),  # written in local time
                "time": when.strftime("%H:%M:%S"),
                "level": m.group(2),
                "logger": m.group(3),
                "message": redact(m.group(4)),
                "ui_level": None,
            }
        )
    return out[-max_lines:]


def setup_logging(
    level: str = "INFO",
    log_dir: Path | None = None,
    *,
    console: bool = False,
    history: int = 0,
) -> Path:
    """Configure the root logger (idempotent). Returns the log file path.

    `history` > 0: once per process, the last N lines of the existing log file are put into the
    live backlog (before anything new is written) so the log view survives a restart."""
    global _history_loaded
    log_dir = log_dir or logs_dir()
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "hcloader.log"
    if history > 0 and not _history_loaded:
        _history_loaded = True
        _live_handler.seed(read_history(log_file, history))
    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    for h in list(root.handlers):
        if getattr(h, _FILE_MARK, False):
            root.removeHandler(h)
            h.close()
    fmt = RedactingFormatter(LOG_FORMAT)  # proxy credentials never reach a log (n4)
    fh = RotatingFileHandler(log_file, maxBytes=1_000_000, backupCount=5, encoding="utf-8")
    fh.setFormatter(fmt)
    setattr(fh, _FILE_MARK, True)
    root.addHandler(fh)
    if _live_handler not in root.handlers:
        _live_handler.setFormatter(fmt)
        root.addHandler(_live_handler)
    if console:
        # Replace an existing console handler so it always writes to the current sys.stderr.
        for h in [h for h in root.handlers if getattr(h, "_hcloader_console", False)]:
            root.removeHandler(h)
        ch = logging.StreamHandler()
        ch.setFormatter(fmt)
        ch._hcloader_console = True  # type: ignore[attr-defined]
        root.addHandler(ch)
    return log_file
