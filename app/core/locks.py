"""Process-wide locks: single GUI instance and the exclusive download run (m13).

Two independent locks:
- `acquire_single_instance()`: only one HCLoader GUI per user.
- `acquire_run_lock()`: only one download run at a time, no matter whether it is started by the
  GUI worker, `--headless --run-watchlist` or `--smoke`. This keeps the throttle's persisted
  counters and pacing consistent across processes.

On Windows a named mutex (ctypes, kernel32) is used, preferably in the `Global\\` namespace (N3):
a scheduled task that runs independently of the logon lives in session 0 and would never see a
`Local\\` mutex of the GUI session. If `Global\\` is not allowed, `Local\\` is used. Everywhere
else, and as a fallback if no mutex can be created, an OS-level file lock (`msvcrt.locking` /
`fcntl.flock`) on a file in `<app_home>/locks/` is used; the OS releases it automatically when the
process dies, so there are no stale locks.

Further:
- `acquire_watchlist_lock()`: only one watchlist check at a time (GUI interval check vs. headless).
- `cross_process_lock(name)`: blocking, short-lived critical section (N5: request spacing and
  search counters of the throttle across processes).
"""

from __future__ import annotations

import logging
import os
import re
import sys
import threading
import time
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from . import config

log = logging.getLogger(__name__)

IS_WINDOWS = sys.platform == "win32"
ERROR_ALREADY_EXISTS = 183

SINGLE_INSTANCE = "single-instance"
RUN_LOCK = "run"
WATCHLIST_LOCK = "watchlist"
THROTTLE_LOCK = "throttle"
MUTEX_NAMESPACES = ("Global\\", "Local\\")


def _user_tag() -> str:
    """Per-user part of the Global mutex name (the Global namespace is machine-wide)."""
    raw = os.environ.get("USERNAME") or os.environ.get("USER") or "user"
    return re.sub(r"[^0-9A-Za-z_.-]", "_", raw)[:40]


def _kernel32() -> Any:
    import ctypes

    return ctypes.WinDLL("kernel32", use_last_error=True)  # type: ignore[attr-defined]


class ProcessLock:
    def __init__(self, name: str, *, path: Path | None = None) -> None:
        self.name = name
        self.path = path or (config.app_home() / "locks" / f"{name}.lock")
        self._handle: Any = None  # mutex handle (Windows)
        self._fh: Any = None  # open lock file
        self._kernel: Any = None

    @property
    def held(self) -> bool:
        return self._handle is not None or self._fh is not None

    def acquire(self) -> bool:
        """True if the lock was obtained (or is already held by this object)."""
        if self.held:
            return True
        if IS_WINDOWS:
            result = self._acquire_mutex()
            if result is not None:
                return result
        return self._acquire_file()

    def release(self) -> None:
        if self._handle is not None and self._kernel is not None:
            try:
                self._kernel.ReleaseMutex(self._handle)
                self._kernel.CloseHandle(self._handle)
            except Exception:
                log.debug("Mutex konnte nicht freigegeben werden", exc_info=True)
            self._handle = None
        if self._fh is not None:
            fh, self._fh = self._fh, None
            try:
                _unlock_file(fh)
            finally:
                fh.close()

    def __enter__(self) -> ProcessLock:
        return self

    def __exit__(self, *exc: object) -> None:
        self.release()

    # -- strategies

    def _acquire_mutex(self) -> bool | None:
        """Named mutex (`Global\\` first, then `Local\\`); None if none can be used (-> file)."""
        try:
            kernel = self._kernel or _kernel32()
            handle = None
            already = False
            for prefix in MUTEX_NAMESPACES:
                handle = kernel.CreateMutexW(
                    None, False, f"{prefix}HCLoader.{_user_tag()}.{self.name}"
                )
                if handle:
                    already = kernel.GetLastError() == ERROR_ALREADY_EXISTS
                    break
                log.debug("Mutex im Namensraum %s nicht erlaubt", prefix)
            if not handle:
                return None
        except Exception:
            log.debug("Named Mutex nicht verfügbar, Datei-Lock als Fallback", exc_info=True)
            return None
        if already:
            kernel.CloseHandle(handle)
            return False
        self._kernel, self._handle = kernel, handle
        return True

    def _acquire_file(self) -> bool:
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            fh = self.path.open("a+b")
        except OSError as exc:
            log.warning("Lock-Datei nicht verfügbar (%s): %s", self.path, exc)
            return True  # cannot lock at all: do not block the user
        if _try_lock_file(fh):
            self._fh = fh
            return True
        fh.close()
        return False


def _try_lock_file(fh: Any) -> bool:
    try:
        if IS_WINDOWS:
            import msvcrt

            fh.seek(0)
            msvcrt.locking(fh.fileno(), msvcrt.LK_NBLCK, 1)  # type: ignore[attr-defined]
        else:
            import fcntl

            fcntl.flock(fh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        return True
    except OSError:
        return False


def _unlock_file(fh: Any) -> None:
    try:
        if IS_WINDOWS:
            import msvcrt

            fh.seek(0)
            msvcrt.locking(fh.fileno(), msvcrt.LK_UNLCK, 1)  # type: ignore[attr-defined]
        else:
            import fcntl

            fcntl.flock(fh.fileno(), fcntl.LOCK_UN)
    except OSError:
        pass


def acquire_single_instance() -> ProcessLock | None:
    """Lock for the GUI process; None if another instance is already running."""
    lock = ProcessLock(SINGLE_INSTANCE)
    return lock if lock.acquire() else None


def acquire_run_lock() -> ProcessLock | None:
    """Exclusive download-run lock; None if another run (GUI or headless) is active.

    Use as `lock = acquire_run_lock(); ...; lock.release()` or in a `with` block.
    """
    lock = ProcessLock(RUN_LOCK)
    return lock if lock.acquire() else None


def acquire_watchlist_lock() -> ProcessLock | None:
    """Exclusive watchlist-check lock; None if another check (GUI interval or headless) runs."""
    lock = ProcessLock(WATCHLIST_LOCK)
    return lock if lock.acquire() else None


@contextmanager
def cross_process_lock(
    name: str,
    *,
    timeout: float = 120.0,
    poll: float = 0.05,
    cancel: threading.Event | None = None,
    path: Path | None = None,
) -> Iterator[bool]:
    """Blocking OS file lock for short critical sections shared by all HCLoader processes.

    Always a file lock (never the mutex): it can be waited for and is released by the OS if the
    process dies. Yields True if the lock is held. After `timeout` seconds (or if the lock file
    is unusable) it yields False instead of blocking the user forever - callers then continue
    without cross-process protection (logged). `cancel` aborts the wait (yields False).
    """
    lock_path = path or (config.app_home() / "locks" / f"{name}.lock")
    fh: Any = None
    try:
        lock_path.parent.mkdir(parents=True, exist_ok=True)
        fh = lock_path.open("a+b")
    except OSError as exc:
        log.warning("Lock-Datei nicht verfügbar (%s): %s", lock_path, exc)
    held = False
    if fh is not None:
        deadline = time.monotonic() + max(0.0, timeout)
        while True:
            if _try_lock_file(fh):
                held = True
                break
            if (cancel is not None and cancel.is_set()) or time.monotonic() >= deadline:
                log.warning("Prozess-Lock «%s» nicht erhalten – fahre ohne fort", name)
                break
            time.sleep(poll)
    try:
        yield held
    finally:
        if fh is not None:
            try:
                if held:
                    _unlock_file(fh)
            finally:
                fh.close()
