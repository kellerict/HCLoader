"""PO-token provider checks (bgutil-ytdlp-pot-provider) – never a YouTube request.

- `quick_state()`: cheap status for the status bar (files/versions only, no subprocess).
- `probe()`: the "Testen" button. Script mode runs `generate_once.ts --version` with Deno exactly
  like the plugin's own availability check (bgutil 2.0.2, `BgUtilScriptDenoPTP`); HTTP mode
  asks the local server `GET /ping` on 127.0.0.1.
"""

from __future__ import annotations

import os
import re
import subprocess
import time
from collections.abc import Callable, Sequence
from pathlib import Path
from typing import Any

from . import binaries

PLUGIN_DIST = "bgutil-ytdlp-pot-provider"
DENO_MIN = (2, 4, 3)
PROBE_TIMEOUT_S = 15.0
_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)

ACTIVE, INACTIVE, ERROR = "active", "inactive", "error"


def script_path() -> Path:
    return binaries.provider_server_dir() / "src" / "generate_once.ts"


def cache_dir() -> Path:
    """Same rule as the plugin: $XDG_CACHE_HOME or HOME/USERPROFILE + .cache/<name>."""
    xdg = os.environ.get("XDG_CACHE_HOME")
    if xdg is not None:
        return Path(xdg).absolute() / PLUGIN_DIST
    home = os.environ.get("HOME") or os.environ.get("USERPROFILE")
    if home:
        return Path(home).absolute() / ".cache" / PLUGIN_DIST
    return binaries.provider_server_dir()


def _esc(*paths: Path) -> str:
    return ",".join(str(p).replace(",", ",,") for p in paths)


def script_check_command() -> list[str]:
    node_modules = binaries.provider_server_dir() / "node_modules"
    cache = cache_dir()
    return [
        str(binaries.deno_path()),
        "run",
        "--allow-env",
        "--allow-net",
        f"--allow-ffi={_esc(node_modules)}",
        f"--allow-write={_esc(cache)}",
        f"--allow-read={_esc(cache, node_modules)}",
        str(script_path()),
        "--version",
    ]


def _version_tuple(v: str | None) -> tuple[int, ...]:
    return tuple(int(x) for x in re.findall(r"\d+", v or ""))[:3]


def result(ok: bool, state: str, detail: str, ms: int = 0) -> dict[str, Any]:
    return {"ok": ok, "state": state, "detail": detail, "ms": ms}


def quick_state(mode: str, *, http_running: bool = False) -> dict[str, Any]:
    """{state, mode, detail} without running anything."""
    if mode == "off":
        return {"state": INACTIVE, "mode": mode, "detail": "Provider ausgeschaltet"}
    if not binaries.package_version(PLUGIN_DIST):
        return {"state": ERROR, "mode": mode, "detail": "Plugin bgutil-ytdlp-pot-provider fehlt"}
    deno_v = binaries.deno_version()
    if not deno_v:
        return {"state": ERROR, "mode": mode, "detail": "Deno fehlt (bin/deno.exe)"}
    if not binaries.provider_dir_ok():
        return {
            "state": ERROR,
            "mode": mode,
            "detail": "Provider-Verzeichnis fehlt (scripts/setup.ps1 ausführen)",
        }
    if mode == "http":
        if http_running:
            return {"state": ACTIVE, "mode": mode, "detail": "Server läuft auf 127.0.0.1"}
        return {"state": ERROR, "mode": mode, "detail": "PO-Token-Server läuft nicht"}
    if not script_path().is_file():
        return {"state": ERROR, "mode": mode, "detail": f"Script fehlt: {script_path().name}"}
    return {"state": ACTIVE, "mode": mode, "detail": f"Script-Modus bereit (Deno {deno_v})"}


def _default_run(args: Sequence[str]) -> subprocess.CompletedProcess:
    env = os.environ.copy()
    env.update({"DENO_NO_PROMPT": "1", "DENO_NO_UPDATE_CHECK": "1", "FORCE_COLOR": "false"})
    return subprocess.run(
        list(args),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        stdin=subprocess.DEVNULL,
        timeout=PROBE_TIMEOUT_S,
        env=env,
        creationflags=_NO_WINDOW,
        check=False,
    )


def probe(
    mode: str,
    port: int,
    *,
    run: Callable[[Sequence[str]], Any] = _default_run,
    ping: Callable[[int], bool] | None = None,
    clock: Callable[[], float] = time.monotonic,
) -> dict[str, Any]:
    """Provider availability test. -> {ok, state, detail, ms}. No YouTube traffic."""
    if mode == "off":
        return result(False, INACTIVE, "Provider ist ausgeschaltet.")
    plugin = binaries.package_version(PLUGIN_DIST)
    if not plugin:
        return result(False, ERROR, "Plugin bgutil-ytdlp-pot-provider ist nicht installiert.")
    start = clock()

    def ms() -> int:
        return int((clock() - start) * 1000)

    if mode == "http":
        ping = ping or (lambda p: binaries.PotServer(p).ping())
        if ping(port):
            return result(True, ACTIVE, f"Server auf 127.0.0.1:{port} antwortet (/ping).", ms())
        return result(False, ERROR, f"Kein PO-Token-Server auf 127.0.0.1:{port}.", ms())

    deno_v = binaries.deno_version()
    if not deno_v:
        return result(False, ERROR, f"Deno nicht gefunden ({binaries.deno_path()}).")
    if _version_tuple(deno_v) < DENO_MIN:
        need = ".".join(map(str, DENO_MIN))
        return result(False, ERROR, f"Deno {deno_v} ist zu alt (mindestens {need}).")
    if not script_path().is_file() or not binaries.provider_dir_ok():
        return result(
            False, ERROR, "Provider-Verzeichnis unvollständig – scripts/setup.ps1 ausführen."
        )
    try:
        proc = run(script_check_command())
    except subprocess.TimeoutExpired:
        return result(False, ERROR, "Script antwortet nicht (Timeout).", ms())
    except OSError as exc:
        return result(False, ERROR, f"Script nicht startbar: {exc}", ms())
    out = (proc.stdout or "").strip()
    if proc.returncode != 0:
        tail = (out or (proc.stderr or "")).strip().splitlines()[-1:] or [""]
        return result(False, ERROR, f"Script-Fehler (Code {proc.returncode}): {tail[0]}", ms())
    version = out.splitlines()[-1] if out else "?"
    return result(
        True,
        ACTIVE,
        f"Provider bereit: Script {version}, Plugin {plugin}, Deno {deno_v}.",
        ms(),
    )
