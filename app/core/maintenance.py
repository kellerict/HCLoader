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
import threading
import time
import urllib.request
from collections.abc import Callable, Collection
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
BACKUP_KEEP = 10  # newest backups that are kept (constant, no setting: no schema change)
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


def in_venv() -> bool:
    return sys.prefix != sys.base_prefix


_PROBE = (
    "import importlib.metadata as m, json, sys\n"
    "def v(n):\n"
    "    try: return m.version(n)\n"
    "    except m.PackageNotFoundError: return None\n"
    "print(json.dumps({'venv': sys.prefix != sys.base_prefix,"
    " 'ytdlp': v('yt-dlp'), 'plugin': v('bgutil-ytdlp-pot-provider')}))\n"
)


def probe_python(executable: str | Path) -> dict[str, Any] | None:
    """Ask another interpreter: {venv: bool, ytdlp, plugin} (versions of ITS site-packages).
    None if it cannot be run."""
    try:
        proc = subprocess.run(
            [str(executable), "-I", "-c", _PROBE],
            capture_output=True,
            text=True,
            timeout=60,
            creationflags=_NO_WINDOW,
            check=False,
        )
        data = json.loads(proc.stdout.strip().splitlines()[-1])
    except (OSError, subprocess.SubprocessError, ValueError, IndexError):
        return None
    return data if isinstance(data, dict) else None


def versions_for(executable: str | Path) -> dict[str, str | None]:
    """Like `installed_versions`, but for another venv's interpreter."""
    data = probe_python(executable) or {}
    return {"ytdlp": data.get("ytdlp"), "plugin": data.get("plugin")}


def run_update(
    on_line: Callable[[str], None] | None = None,
    *,
    popen: Callable[[list[str]], Any] = _default_popen,
    executable: str | None = None,
    versions: Callable[[], dict[str, str | None]] | None = None,
    timeout_s: float = UPDATE_TIMEOUT_S,
    venv_check: Callable[[], bool] | None = None,
) -> dict[str, Any]:
    """pip install -U yt-dlp[default] bgutil-ytdlp-pot-provider; streams output lines.

    Returns {ok, ytdlp, plugin, changed, output} or {ok: False, error, output}. The running
    process keeps the old yt-dlp module until restart (noted in the output).
    `executable`: Python of another venv to update (default: the running one). Then versions and
    the venv check refer to that interpreter (acceptance test with a throw-away venv).
    Refuses to run outside a venv (pip would modify the global Python). A timer kills a hanging
    pip after `timeout_s` (the reader loop blocks on the pipe, so a plain `wait(timeout)` after
    it would never trigger).
    """
    if venv_check is None and executable is not None:

        def venv_check() -> bool:
            return bool((probe_python(venv_python(executable)) or {}).get("venv"))

    if versions is None:
        versions = (
            (lambda: versions_for(venv_python(executable)))
            if executable is not None
            else installed_versions
        )
    if not (venv_check or in_venv)():
        msg = "HCLoader läuft nicht in einer virtuellen Umgebung (venv) – Update abgebrochen"
        log.error(msg)
        return {"ok": False, "error": msg, "output": ""}
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
    timed_out = threading.Event()

    def _kill() -> None:
        timed_out.set()
        try:
            proc.kill()
        except Exception:  # process may be gone already
            log.debug("pip kill failed", exc_info=True)

    timer = threading.Timer(timeout_s, _kill)
    timer.daemon = True
    timer.start()
    try:
        for raw in proc.stdout:
            line = raw.rstrip()
            if not line:
                continue
            lines.append(line)
            if on_line:
                on_line(line)
        try:
            code = proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            _kill()
            code = -1
    finally:
        timer.cancel()
    binaries.clear_cache()
    after = versions()
    output = "\n".join(lines)
    if timed_out.is_set():
        msg = f"Zeitüberschreitung nach {int(timeout_s)} s – pip wurde beendet"
        return {"ok": False, "error": msg, "output": output}
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
    """Latest PyPI versions vs. installed -> {ok, available, packages: {ytdlp, plugin}}."""
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


def prune_backups(dest_dir: Path, keep: int, *, protect: Path | None = None) -> list[Path]:
    """Delete all but the newest `keep` `hcloader-*.db` files (by modification time, then name).
    `protect` (the backup just made) is always kept. `keep <= 0` disables pruning."""
    if keep <= 0:
        return []
    try:
        files = [p for p in dest_dir.glob("hcloader-*.db") if p.is_file()]
    except OSError:
        return []
    others = sorted(
        (p for p in files if protect is None or p != protect),
        key=lambda p: (p.stat().st_mtime_ns, p.name),
        reverse=True,
    )
    room = keep - (1 if protect is not None else 0)
    removed: list[Path] = []
    for old in others[max(room, 0) :]:
        try:
            old.unlink()
            removed.append(old)
        except OSError:
            log.warning("Altes Backup nicht löschbar: %s", old)
    return removed


def backup_database(
    db_path: Path,
    dest_dir: Path | None = None,
    *,
    now: datetime | None = None,
    keep: int = BACKUP_KEEP,
) -> Path:
    """Consistent copy via the sqlite3 backup API -> `<dest>/hcloader-<YYYYmmdd-HHMMSS>.db`.
    Afterwards only the newest `keep` backups stay (default `BACKUP_KEEP`)."""
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
    for old in prune_backups(dest_dir, keep, protect=target):
        log.info("Altes Backup gelöscht: %s", old.name)
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


def list_backups(dest_dir: Path | None = None) -> list[dict[str, Any]]:
    """Backups for the maintenance tab, newest first: {name, path, size_mb, created (ISO)}."""
    dest_dir = dest_dir or backups_dir()
    try:
        files = [p for p in dest_dir.glob("hcloader-*.db") if p.is_file()]
    except OSError:
        return []
    out = []
    for p in sorted(files, key=lambda f: f.stat().st_mtime, reverse=True):
        st = p.stat()
        out.append(
            {
                "name": p.name,
                "path": str(p),
                "size_mb": round(st.st_size / 1_048_576, 2),
                "created": datetime.fromtimestamp(st.st_mtime)
                .astimezone()
                .isoformat(timespec="seconds"),
            }
        )
    return out


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


# --------------------------------------------------------------------------- stale partial files

PARTIAL_MAX_AGE_DAYS = 7


def _is_partial_name(name: str) -> bool:
    return name.endswith((".part", ".ytdl")) or ".part-Frag" in name


def cleanup_stale_partials(
    tmp_dir: Path,
    keep_ids: Collection[str],
    *,
    max_age_days: float = PARTIAL_MAX_AGE_DAYS,
    now: float | None = None,
) -> int:
    """Delete `.part`/`.ytdl` leftovers in `<target>/.tmp` older than `max_age_days`
    (Review Phase 3 n6). Files of videos in `keep_ids` (still in the queue) stay: a later
    download resumes them. The video id is the file name up to the first dot
    (`<id>.f251.webm.part`).
    Returns the number of deleted files; a missing/unreachable folder deletes nothing."""
    try:
        if not tmp_dir.is_dir():
            return 0
        files = list(tmp_dir.iterdir())
    except OSError:
        return 0
    limit = (time.time() if now is None else now) - max_age_days * 86400
    keep = set(keep_ids)
    removed = 0
    for f in files:
        name = f.name
        if not _is_partial_name(name) or name.split(".", 1)[0] in keep:
            continue
        try:
            if f.is_file() and f.stat().st_mtime < limit:
                f.unlink()
                removed += 1
        except OSError:
            log.debug("Teildatei nicht löschbar: %s", f)
    if removed:
        log.info(
            "%d alte Teildateien (älter als %d Tage) aus %s entfernt",
            removed,
            int(max_age_days),
            tmp_dir,
        )
    return removed
