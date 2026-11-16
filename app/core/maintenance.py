"""Maintenance: yt-dlp/plugin update (pip in the venv), daily update check, DB backup, versions.

No YouTube access. The update check asks PyPI (JSON API) for the latest versions; it is not
YouTube traffic and therefore does not go through the Throttle (docs/decisions.md).
Subprocess, HTTP fetch and clock are injectable for tests.
"""

from __future__ import annotations

import importlib
import json
import logging
import os
import platform
import re
import sqlite3
import subprocess
import sys
import urllib.request
from collections.abc import Callable
from datetime import datetime
from pathlib import Path
from typing import Any

from . import binaries, config

log = logging.getLogger(__name__)

YTDLP = "yt-dlp"
PLUGIN = "bgutil-ytdlp-pot-provider"
PIP_SPECS = ("yt-dlp[default]", PLUGIN)
PYPI_URL = "https://pypi.org/pypi/{name}/json"
UPDATE_TIMEOUT_S = 600
K_LAST_UPDATE_CHECK = "last_update_check"
K_LAST_BACKUP = "last_backup"
_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)


def app_version() -> str:
    return binaries.package_version("hcloader") or _pyproject_version() or "0.0.0"


def _pyproject_version() -> str | None:
    try:
        text = (binaries.repo_root() / "pyproject.toml").read_text(encoding="utf-8")
    except OSError:
        return None
    m = re.search(r'^version\s*=\s*"([^"]+)"', text, re.M)
    return m.group(1) if m else None


def installed_versions() -> dict[str, str | None]:
    importlib.invalidate_caches()  # dist-info folders change after pip
    return {"ytdlp": binaries.package_version(YTDLP), "plugin": binaries.package_version(PLUGIN)}


# --------------------------------------------------------------------------- pip update


def venv_python(executable: str | None = None) -> Path:
    """python(.exe) of the running venv; pythonw.exe is swapped for python.exe (console tool)."""
    exe = Path(executable or sys.executable)
    if exe.stem.lower() == "pythonw":
        alt = exe.with_name("python" + exe.suffix)
        if alt.exists():
            return alt
    return exe


def update_command(executable: str | None = None) -> list[str]:
    return [str(venv_python(executable)), "-m", "pip", "install", "-U", *PIP_SPECS]


def _default_popen(args: list[str]) -> subprocess.Popen:
    return subprocess.Popen(
        args,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL,
        text=True,
        encoding="utf-8",
        errors="replace",
        creationflags=_NO_WINDOW,
    )


def run_update(
    on_line: Callable[[str], None] | None = None,
    *,
    popen: Callable[[list[str]], Any] = _default_popen,
    executable: str | None = None,
    versions: Callable[[], dict[str, str | None]] = installed_versions,
) -> dict[str, Any]:
    """pip install -U yt-dlp[default] bgutil-ytdlp-pot-provider; streams output lines.

    Returns {ok, ytdlp, plugin, changed, output} or {ok: False, error, output}. The running
    process keeps the old yt-dlp module until restart (noted in the output).
    """
    before = versions()
    cmd = update_command(executable)
    lines = ["> " + " ".join(["pip", *cmd[3:]])]
    if on_line:
        on_line(lines[0])
    try:
        proc = popen(cmd)
    except OSError as exc:
        return {"ok": False, "error": f"pip konnte nicht gestartet werden: {exc}", "output": ""}
    assert proc.stdout is not None
    for raw in proc.stdout:
        line = raw.rstrip()
        if not line:
            continue
        lines.append(line)
        if on_line:
            on_line(line)
    try:
        code = proc.wait(timeout=UPDATE_TIMEOUT_S)
    except subprocess.TimeoutExpired:
        proc.kill()
        code = -1
    binaries.clear_cache()
    after = versions()
    output = "\n".join(lines)
    if code != 0:
        return {"ok": False, "error": f"pip ist mit Code {code} beendet", "output": output}
    changed = after != before
    if changed:
        note = "Neue Version installiert – wirksam nach einem Neustart von HCLoader."
        lines.append(note)
        output += "\n" + note
        if on_line:
            on_line(note)
    return {
        "ok": True,
        "ytdlp": after.get("ytdlp"),
        "plugin": after.get("plugin"),
        "changed": changed,
        "output": output,
    }


# --------------------------------------------------------------------------- update check


def _version_key(v: str | None) -> tuple[int, ...]:
    return tuple(int(x) for x in re.findall(r"\d+", v or ""))


def is_newer(latest: str | None, installed: str | None) -> bool:
    if not latest:
        return False
    if not installed:
        return True
    return _version_key(latest) > _version_key(installed)


def _default_fetch(url: str) -> dict[str, Any]:
    req = urllib.request.Request(url, headers={"User-Agent": "HCLoader-update-check"})
    with urllib.request.urlopen(req, timeout=15) as resp:  # noqa: S310 (fixed https URL)
        return json.loads(resp.read().decode("utf-8"))


def check_updates(
    *,
    fetch: Callable[[str], dict[str, Any]] = _default_fetch,
    installed: dict[str, str | None] | None = None,
) -> dict[str, Any]:
    """Latest PyPI versions vs. installed. -> {ok, available, packages:{ytdlp:{...}, plugin:{...}}}"""
    installed = installed or installed_versions()
    packages: dict[str, dict[str, Any]] = {}
    try:
        for key, dist in (("ytdlp", YTDLP), ("plugin", PLUGIN)):
            latest = str(fetch(PYPI_URL.format(name=dist))["info"]["version"])
            packages[key] = {
                "installed": installed.get(key),
                "latest": latest,
                "newer": is_newer(latest, installed.get(key)),
            }
    except Exception as exc:  # network/parse error: never fatal
        return {"ok": False, "error": f"Update-Prüfung fehlgeschlagen: {exc}", "packages": packages}
    return {
        "ok": True,
        "available": any(p["newer"] for p in packages.values()),
        "packages": packages,
    }


def update_check_due(last_iso: str | None, now: datetime | None = None) -> bool:
    """At most once per (local) calendar day."""
    if not last_iso:
        return True
    try:
        last = datetime.fromisoformat(last_iso).astimezone()
    except ValueError:
        return True
    now = (now or datetime.now().astimezone()).astimezone()
    return last.date() != now.date()


# --------------------------------------------------------------------------- DB backup


def backups_dir() -> Path:
    return config.app_home() / "backups"


def backup_database(
    db_path: Path, dest_dir: Path | None = None, *, now: datetime | None = None
) -> Path:
    """Consistent copy via the sqlite3 backup API -> `<dest>/hcloader-<YYYYmmdd-HHMMSS>.db`."""
    dest_dir = dest_dir or backups_dir()
    dest_dir.mkdir(parents=True, exist_ok=True)
    stamp = (now or datetime.now()).strftime("%Y%m%d-%H%M%S")
    target = dest_dir / f"hcloader-{stamp}.db"
    n = 1
    while target.exists():
        target = dest_dir / f"hcloader-{stamp}-{n}.db"
        n += 1
    tmp = target.with_suffix(".db.tmp")
    src = sqlite3.connect(str(db_path))
    try:
        dst = sqlite3.connect(str(tmp))
        try:
            src.backup(dst)
        finally:
            dst.close()
    finally:
        src.close()
    tmp.replace(target)
    return target


def last_backup(dest_dir: Path | None = None) -> str | None:
    dest_dir = dest_dir or backups_dir()
    try:
        files = [p for p in dest_dir.glob("hcloader-*.db") if p.is_file()]
    except OSError:
        return None
    if not files:
        return None
    newest = max(files, key=lambda p: p.stat().st_mtime)
    return datetime.fromtimestamp(newest.stat().st_mtime).astimezone().isoformat(timespec="seconds")


def db_size_mb(db_path: Path) -> float:
    total = 0
    for suffix in ("", "-wal", "-shm"):
        p = Path(str(db_path) + suffix)
        try:
            total += p.stat().st_size
        except OSError:
            pass
    return round(total / (1024 * 1024), 2)


def versions_info(
    *,
    db_path: Path,
    db_entries: int,
    last_update_check: str | None,
    status: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Shape of `get_versions()` (ui/js/bridge.js)."""
    st = status or binaries.status()
    return {
        "app": app_version(),
        "ytdlp": st.get("yt_dlp_version"),
        "plugin": st.get("bgutil_version"),
        "deno": st.get("deno_version"),
        "ffmpeg": st.get("ffmpeg_version"),
        "python": platform.python_version(),
        "data_dir": str(config.app_home()),
        "db_path": str(db_path),
        "db_entries": db_entries,
        "db_size_mb": db_size_mb(db_path),
        "last_backup": last_backup(),
        "last_update_check": last_update_check,
    }


def open_in_shell(path: Path) -> None:
    """Open a folder/file with the OS (Explorer on Windows)."""
    if sys.platform == "win32":
        os.startfile(str(path))  # type: ignore[attr-defined]  # noqa: S606
    elif sys.platform == "darwin":
        subprocess.Popen(["open", str(path)])  # noqa: S603, S607
    else:
        subprocess.Popen(["xdg-open", str(path)])  # noqa: S603, S607
