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
from collections.abc import Callable, Iterator
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
METADATA_LOCK = "metadata"
MUTEX_NAMESPACES = ("Global\\", "Local\\")


def _user_tag() -> str:
    """Per-user part of the Global mutex name (the Global namespace is machine-wide)."""
    raw = os.environ.get("USERNAME") or os.environ.get("USER") or "user"
    return re.sub(r"[^0-9A-Za-z_.-]", "_", raw)[:40]


def _home_tag() -> str:
    """Short hash of the data folder: an installed and a portable copy (or tests with their own
    HCLOADER_HOME) have separate data and must not block each other - two processes on the
    same data folder (GUI + scheduled task) still share the lock."""
    import hashlib

    from app.core.config import app_home

    try:
        home = os.path.normcase(os.path.abspath(str(app_home())))
    except Exception:
        home = ""
    return hashlib.sha1(home.encode("utf-8", "replace")).hexdigest()[:10]


def _mutex_base(name: str) -> str:
    return f"HCLoader.{_user_tag()}.{_home_tag()}.{name}"


def mutex_names(name: str) -> list[str]:
    """Names of the Windows mutex of lock `name`, in the order they are tried (the updater
    script waits for the run lock with the same names, Review m3)."""
    return [f"{prefix}{_mutex_base(name)}" for prefix in MUTEX_NAMESPACES]


def _kernel32() -> Any:
    import ctypes
    from ctypes import wintypes

    kernel = ctypes.WinDLL("kernel32", use_last_error=True)  # type: ignore[attr-defined]
    # n2: HANDLE is pointer-sized; without restype ctypes would truncate it to a C int
    kernel.CreateMutexW.argtypes = (ctypes.c_void_p, wintypes.BOOL, wintypes.LPCWSTR)
    kernel.CreateMutexW.restype = wintypes.HANDLE
    kernel.ReleaseMutex.argtypes = (wintypes.HANDLE,)
    kernel.ReleaseMutex.restype = wintypes.BOOL
    kernel.CloseHandle.argtypes = (wintypes.HANDLE,)
    kernel.CloseHandle.restype = wintypes.BOOL
    return kernel


def _last_error() -> int:
    """n2: the error ctypes saved right after the last foreign call (`use_last_error=True`);
    a separate `GetLastError()` call could see a value changed in between."""
    import ctypes

    return int(ctypes.get_last_error())  # type: ignore[attr-defined]


def _clear_last_error() -> None:
    try:
        import ctypes

        ctypes.set_last_error(0)  # type: ignore[attr-defined]
    except Exception:
        pass


# Names held by any ProcessLock of this process (safety net: a lock is exclusive inside the
# process as well, whatever the OS primitive does for the same process/thread).
_HELD: set[str] = set()
_HELD_LOCK = threading.Lock()


class ProcessLock:
    """Exclusive named lock across processes *and* inside this process.

    Windows: classic single-instance pattern - `CreateMutexW(bInitialOwner=FALSE)` without any
    wait; `ERROR_ALREADY_EXISTS` means another handle is open = taken. The mutex is never
    owned (owned named mutexes are recursive for the owning thread and `ReleaseMutex` only
    works in that thread), so `release()` = `CloseHandle` works from any thread. The handle
    keeps the name alive; as long as it is open every further `CreateMutexW` (other process,
    same process, any thread) sees ALREADY_EXISTS. apply_update.ps1 uses the same semantics.
    """

    def __init__(self, name: str, *, path: Path | None = None) -> None:
        self.name = name
        self.path = path or (config.app_home() / "locks" / f"{name}.lock")
        self._handle: Any = None  # mutex handle (Windows)
        self._fh: Any = None  # open lock file
        self._kernel: Any = None
        self._key: str | None = None

    @property
    def held(self) -> bool:
        return self._handle is not None or self._fh is not None

    def acquire(self) -> bool:
        """True if the lock was obtained (or is already held by this object)."""
        if self.held:
            return True
        # per data folder, like the mutex name: separate data folders never share a lock
        key = str(self.path) if not IS_WINDOWS else _mutex_base(self.name)
        with _HELD_LOCK:
            if key in _HELD:
                return False
            _HELD.add(key)
        ok = False
        try:
            if IS_WINDOWS:
                result = self._acquire_mutex()
                if result is not None:
                    ok = result
                    return result
            ok = self._acquire_file()
            return ok
        finally:
            if ok:
                self._key = key
            else:
                with _HELD_LOCK:
                    _HELD.discard(key)

    def release(self) -> None:
        if self._handle is not None and self._kernel is not None:
            handle, self._handle = self._handle, None
            try:
                self._kernel.CloseHandle(handle)  # never owned: no ReleaseMutex
            except Exception:
                log.debug("Mutex could not be released", exc_info=True)
        self._handle = None
        if self._fh is not None:
            fh, self._fh = self._fh, None
            try:
                _unlock_file(fh)
            finally:
                fh.close()
        key, self._key = self._key, None
        if key is not None:
            with _HELD_LOCK:
                _HELD.discard(key)

    def __del__(self) -> None:
        # a lock object dropped without release() must not block the name until process end
        try:
            if self.held:
                self.release()
        except Exception:
            pass

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
                _clear_last_error()  # never read a stale ALREADY_EXISTS of an earlier call
                handle = kernel.CreateMutexW(None, False, f"{prefix}{_mutex_base(self.name)}")
                if handle:
                    # n2: with use_last_error=True ctypes saves the error right after the call
                    already = _last_error() == ERROR_ALREADY_EXISTS
                    break
                log.debug("Mutex in namespace %s not allowed", prefix)
            if not handle:
                return None
        except Exception:
            log.debug("Named mutex not available, file lock as fallback", exc_info=True)
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
            log.warning("Lock file not available (%s): %s", self.path, exc)
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
    on_timeout: Callable[[], BaseException] | None = None,
) -> Iterator[bool]:
    """Blocking OS file lock for short critical sections shared by all HCLoader processes.

    Always a file lock (never the mutex): it can be waited for and is released by the OS if the
    process dies. Yields True if the lock is held. After `timeout` seconds (or if the lock file
    is unusable) it yields False instead of blocking the user forever - callers then continue
    without cross-process protection (logged). `cancel` aborts the wait (yields False).
    With `on_timeout`, a timeout or cancel raises `on_timeout()` instead (an unusable lock
    file still yields False).
    """
    lock_path = path or (config.app_home() / "locks" / f"{name}.lock")
    fh: Any = None
    try:
        lock_path.parent.mkdir(parents=True, exist_ok=True)
        fh = lock_path.open("a+b")
    except OSError as exc:
        log.warning("Lock file not available (%s): %s", lock_path, exc)
    held = False
    if fh is not None:
        deadline = time.monotonic() + max(0.0, timeout)
        while True:
            if _try_lock_file(fh):
                held = True
                break
            if (cancel is not None and cancel.is_set()) or time.monotonic() >= deadline:
                if on_timeout is not None:
                    fh.close()
                    raise on_timeout()
                log.warning("Process lock “%s” not acquired – continuing without", name)
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
