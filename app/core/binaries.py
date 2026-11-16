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
from importlib import metadata
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

IS_WINDOWS = sys.platform == "win32"
VERSION_TIMEOUT_S = 8
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


# --------------------------------------------------------------------------- HTTP provider


class PotServer:
    """bgutil provider in HTTP mode as a child process (`deno run ... main.ts --port N`)."""

    def __init__(self, port: int) -> None:
        self.port = port
        self._proc: subprocess.Popen[bytes] | None = None

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
        log.info("PO-Token-Server gestartet auf %s", self.base_url)
        return True

    def stop(self) -> None:
        proc, self._proc = self._proc, None
        if proc is None or proc.poll() is not None:
            return
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
        log.info("PO-Token-Server beendet")
