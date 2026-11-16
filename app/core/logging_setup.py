"""Logging: rotating file under app_home()/logs plus a live stream hook for the UI."""

from __future__ import annotations

import logging
import threading
from collections import deque
from collections.abc import Callable
from logging.handlers import RotatingFileHandler
from pathlib import Path

from .config import logs_dir

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

    def emit(self, record: logging.LogRecord) -> None:
        try:
            entry = {
                "ts": record.created,
                "time": self.formatter.formatTime(record, "%H:%M:%S") if self.formatter else "",
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
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


def setup_logging(
    level: str = "INFO", log_dir: Path | None = None, *, console: bool = False
) -> Path:
    """Configure the root logger (idempotent). Returns the log file path."""
    log_dir = log_dir or logs_dir()
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "hcloader.log"
    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    for h in list(root.handlers):
        if getattr(h, _FILE_MARK, False):
            root.removeHandler(h)
            h.close()
    fmt = logging.Formatter(LOG_FORMAT)
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
