"""Locations and versions of external tools: deno, ffmpeg, ffprobe, bgutil provider.

No network access. Version queries run a subprocess with a timeout and are cached.
`bin/` lives in the repo root (not in Git). On non-Windows systems a PATH lookup is the fallback.
"""

from __future__ import annotations

import logging
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from importlib import metadata
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

IS_WINDOWS = sys.platform == "win32"
VERSION_TIMEOUT_S = 8
POT_READY_TIMEOUT_S = 10.0
_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)

_version_cache: dict[str, str | None] = {}
_cache_lock = threading.Lock()


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def bin_dir() -> Path:
    """`<repo>/bin`; $HCLOADER_BIN_DIR overrides (tests, portable setups)."""
    override = os.environ.get("HCLOADER_BIN_DIR")
    return Path(override) if override else repo_root() / "bin"


def _exe(name: str) -> str:
    return f"{name}.exe" if IS_WINDOWS else name


def _local_or_path(name: str) -> Path:
    """`bin/<name>(.exe)` if present; on non-Windows fall back to PATH, else the bin/ path."""
    local = bin_dir() / _exe(name)
    if local.exists():
        return local
    if not IS_WINDOWS:
        found = shutil.which(name)
        if found:
            return Path(found)
    return local


def deno_path() -> Path:
    return _local_or_path("deno")


def ffmpeg_path() -> Path:
    return _local_or_path("ffmpeg")


def ffprobe_path() -> Path:
    return _local_or_path("ffprobe")


def provider_server_dir() -> Path:
    """The `server/` folder of the bgutil provider repo (script / HTTP mode)."""
    return bin_dir() / "bgutil-pot-provider" / "server"


def provider_dir_ok() -> bool:
    server = provider_server_dir()
    return (server / "src").is_dir() and (server / "node_modules").is_dir()


def clear_cache() -> None:
    with _cache_lock:
        _version_cache.clear()


def _run_version(exe: Path, *args: str) -> str | None:
    """First line of the tool's version output, or None if it cannot be run."""
    try:
        proc = subprocess.run(
            [str(exe), *args],
            capture_output=True,
            text=True,
            timeout=VERSION_TIMEOUT_S,
            creationflags=_NO_WINDOW,
            check=False,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        log.debug("Versionsabfrage fehlgeschlagen (%s): %s", exe, exc)
        return None
    out = (proc.stdout or proc.stderr or "").strip()
    return out.splitlines()[0].strip() if proc.returncode == 0 and out else None


def _cached(key: str, exe: Path, *args: str) -> str | None:
    cache_key = f"{key}:{exe}"
    with _cache_lock:
        if cache_key in _version_cache:
            return _version_cache[cache_key]
    if not exe.exists():
        return None  # not cached: the tool may be installed later
    value = _run_version(exe, *args)
    with _cache_lock:
        _version_cache[cache_key] = value
    return value


def deno_version() -> str | None:
    """'2.4.3' from 'deno 2.4.3 (stable, ...)'."""
    line = _cached("deno", deno_path(), "--version")
    if not line:
        return None
    m = re.match(r"deno\s+(\S+)", line)
    return m.group(1) if m else line


def ffmpeg_version() -> str | None:
    """'7.1' from 'ffmpeg version 7.1-essentials_build ...'."""
    line = _cached("ffmpeg", ffmpeg_path(), "-version")
    if not line:
        return None
    m = re.match(r"ffmpeg version\s+(\S+)", line)
    return m.group(1) if m else line


def package_version(dist: str) -> str | None:
    try:
        return metadata.version(dist)
    except metadata.PackageNotFoundError:
        return None


def status() -> dict[str, Any]:
    """Status for the status bar / settings. Cheap after the first call (cached)."""
    deno_v = deno_version()
    ffmpeg_v = ffmpeg_version()
    return {
        "yt_dlp_version": package_version("yt-dlp"),
        "ejs_version": package_version("yt-dlp-ejs"),
        "bgutil_version": package_version("bgutil-ytdlp-pot-provider"),
        "deno_ok": deno_v is not None,
        "deno_version": deno_v,
        "deno_path": str(deno_path()),
        "ffmpeg_ok": ffmpeg_v is not None and ffprobe_path().exists(),
        "ffmpeg_version": ffmpeg_v,
        "ffmpeg_path": str(ffmpeg_path()),
        "ffprobe_ok": ffprobe_path().exists(),
        "provider_dir": str(provider_server_dir()),
        "provider_dir_ok": provider_dir_ok(),
    }


# --------------------------------------------------------------------------- child processes


class KillOnCloseJob:
    """Windows Job Object with JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE (best effort, ctypes).

    A child assigned to it dies together with HCLoader, even after a hard kill (Task Manager,
    crash): the OS closes the job handle when our process ends. No-op on other systems or if
    any Win32 call fails (the child then simply is not tied to us).
    """

    _KILL_ON_JOB_CLOSE = 0x2000
    _EXTENDED_LIMIT_INFORMATION = 9

    def __init__(self) -> None:
        self.handle: int | None = None
        if not IS_WINDOWS:
            return
        try:
            self.handle = self._create()
        except Exception as exc:  # pragma: no cover - Windows only
            log.debug("Job Object nicht verfügbar: %s", exc)
            self.handle = None

    def _create(self) -> int | None:  # pragma: no cover - Windows only
        import ctypes
        from ctypes import wintypes

        class IoCounters(ctypes.Structure):
            _fields_ = [
                (name, ctypes.c_ulonglong)
                for name in (
                    "ReadOperationCount",
                    "WriteOperationCount",
                    "OtherOperationCount",
                    "ReadTransferCount",
                    "WriteTransferCount",
                    "OtherTransferCount",
                )
            ]

        class BasicLimit(ctypes.Structure):
            _fields_ = [
                ("PerProcessUserTimeLimit", wintypes.LARGE_INTEGER),
                ("PerJobUserTimeLimit", wintypes.LARGE_INTEGER),
                ("LimitFlags", wintypes.DWORD),
                ("MinimumWorkingSetSize", ctypes.c_size_t),
                ("MaximumWorkingSetSize", ctypes.c_size_t),
                ("ActiveProcessLimit", wintypes.DWORD),
                ("Affinity", ctypes.c_size_t),
                ("PriorityClass", wintypes.DWORD),
                ("SchedulingClass", wintypes.DWORD),
            ]

        class ExtendedLimit(ctypes.Structure):
            _fields_ = [
                ("BasicLimitInformation", BasicLimit),
                ("IoInfo", IoCounters),
                ("ProcessMemoryLimit", ctypes.c_size_t),
                ("JobMemoryLimit", ctypes.c_size_t),
                ("PeakProcessMemoryUsed", ctypes.c_size_t),
                ("PeakJobMemoryUsed", ctypes.c_size_t),
            ]

        k32 = ctypes.WinDLL("kernel32", use_last_error=True)
        k32.CreateJobObjectW.restype = wintypes.HANDLE
        k32.CreateJobObjectW.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]
        k32.SetInformationJobObject.argtypes = [
            wintypes.HANDLE,
            ctypes.c_int,
            ctypes.c_void_p,
            wintypes.DWORD,
        ]
        k32.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]
        k32.CloseHandle.argtypes = [wintypes.HANDLE]
        job = k32.CreateJobObjectW(None, None)
        if not job:
            raise OSError(ctypes.get_last_error(), "CreateJobObjectW")
        info = ExtendedLimit()
        info.BasicLimitInformation.LimitFlags = self._KILL_ON_JOB_CLOSE
        if not k32.SetInformationJobObject(
            job, self._EXTENDED_LIMIT_INFORMATION, ctypes.byref(info), ctypes.sizeof(info)
        ):
            err = ctypes.get_last_error()
            k32.CloseHandle(job)
            raise OSError(err, "SetInformationJobObject")
        self._k32 = k32
        return int(job)

    def assign(self, proc: subprocess.Popen) -> bool:
        """Tie `proc` to the job. Returns True on success."""
        if self.handle is None:
            return False
        try:  # pragma: no cover - Windows only
            handle = int(proc._handle)  # type: ignore[attr-defined]
            if self._k32.AssignProcessToJobObject(self.handle, handle):
                return True
            log.debug("AssignProcessToJobObject fehlgeschlagen")
        except Exception as exc:  # pragma: no cover - Windows only
            log.debug("Job Object: %s", exc)
        return False

    def close(self) -> None:
        """Closing the last handle kills every process still in the job."""
        handle, self.handle = self.handle, None
        if handle is not None:  # pragma: no cover - Windows only
            try:
                self._k32.CloseHandle(handle)
            except Exception:
                pass


# --------------------------------------------------------------------------- HTTP provider


class PotServer:
    """bgutil provider in HTTP mode as a child process (`deno run ... main.ts --port N`)."""

    HOST = "127.0.0.1"

    def __init__(self, port: int) -> None:
        self.port = port
        self._proc: subprocess.Popen[bytes] | None = None
        self._job: KillOnCloseJob | None = None

    @property
    def base_url(self) -> str:
        return f"http://127.0.0.1:{self.port}"

    def command(self) -> list[str]:
        return [
            str(deno_path()),
            "run",
            "--allow-env",
            "--allow-net",
            "--allow-ffi=.",
            "--allow-read=.",
            str(Path("..") / "src" / "main.ts"),
            # bgutil 2.x README: -H/--host, default "localhost only (127.0.0.1 and ::1)".
            # Explicit IPv4 loopback = exactly the address we ping and hand to yt-dlp.
            "--host",
            self.HOST,
            "--port",
            str(self.port),
        ]

    def running(self) -> bool:
        return self._proc is not None and self._proc.poll() is None

    def start(self) -> bool:
        if self.running():
            return True
        if not deno_path().exists() or not provider_dir_ok():
            log.warning("PO-Token-Server nicht startbar: Deno oder Provider-Verzeichnis fehlt")
            return False
        if self.ping():
            # Something already answers on our port (an orphaned server of an earlier, hard-
            # killed HCLoader or a foreign one). Our own start would fail on the port while
            # /ping still succeeds, so report it instead of pretending to own it.
            log.error(
                "Port %s ist bereits belegt (fremder oder verwaister PO-Token-Server) – "
                "Prozess beenden oder anderen Port wählen",
                self.port,
            )
            return False
        cwd = provider_server_dir() / "node_modules"
        try:
            self._proc = subprocess.Popen(
                self.command(),
                cwd=cwd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=_NO_WINDOW,
            )
        except OSError as exc:
            log.error("PO-Token-Server konnte nicht gestartet werden: %s", exc)
            return False
        self._job = KillOnCloseJob()
        self._job.assign(self._proc)
        if not self.wait_ready():
            log.error("PO-Token-Server antwortet nicht auf /ping (Port %s)", self.port)
            self.stop()
            return False
        log.info("PO-Token-Server bereit auf %s", self.base_url)
        return True

    def ping(self) -> bool:
        """GET /ping on the local provider (127.0.0.1 only, never YouTube)."""
        try:
            opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))  # no proxy
            with opener.open(f"{self.base_url}/ping", timeout=2) as resp:
                return 200 <= resp.status < 300
        except (OSError, urllib.error.URLError, ValueError):
            return False

    def wait_ready(
        self,
        timeout: float = POT_READY_TIMEOUT_S,
        *,
        interval: float = 0.25,
        sleep=time.sleep,
        clock=time.monotonic,
    ) -> bool:
        """Poll /ping until the server answers, the process dies or `timeout` passes."""
        deadline = clock() + timeout
        while True:
            if not self.running():
                return False
            if self.ping():
                return True
            if clock() >= deadline:
                return False
            sleep(interval)

    def stop(self) -> None:
        proc, self._proc = self._proc, None
        job, self._job = self._job, None
        try:
            if proc is None or proc.poll() is not None:
                return
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
            log.info("PO-Token-Server beendet")
        finally:
            if job is not None:
                job.close()
