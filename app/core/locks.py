"""Process-wide locks: single GUI instance and the exclusive download run (m13).

Two independent locks:
- `acquire_single_instance()`: only one HCLoader GUI per user.
- `acquire_run_lock()`: only one download run at a time, no matter whether it is started by the
  GUI worker, `--headless --run-watchlist` or `--smoke`. This keeps the throttle's persisted
  counters and pacing consistent across processes.

On Windows a named mutex (ctypes, kernel32) is used. Everywhere else, and as a fallback if the
mutex cannot be created, an OS-level file lock (`msvcrt.locking` / `fcntl.flock`) on a file in
`<app_home>/locks/` is used; the OS releases it automatically when the process dies, so there
are no stale locks.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Any

from . import config

log = logging.getLogger(__name__)

IS_WINDOWS = sys.platform == "win32"
ERROR_ALREADY_EXISTS = 183

SINGLE_INSTANCE = "single-instance"
RUN_LOCK = "run"


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
        """Named mutex; None if it cannot be used (-> file fallback)."""
        try:
            kernel = self._kernel or _kernel32()
            handle = kernel.CreateMutexW(None, False, f"Local\\HCLoader.{self.name}")
            if not handle:
                return None
            already = kernel.GetLastError() == ERROR_ALREADY_EXISTS
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
