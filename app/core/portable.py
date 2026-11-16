"""Portable version helpers (docs/decisions.md "Portable-Version").

Mark of the Web: Windows Explorer copies the `Zone.Identifier` stream of a downloaded ZIP onto
every extracted file. The .NET Framework refuses to load assemblies marked like that
(`Assembly.LoadFrom` -> "load an assembly from a network location"), so pywebview's
pythonnet/WebView2 DLLs would fail and the window would not open. Before `import webview` the
GUI removes the stream from the few DLLs pywebview loads. Only in portable mode on Windows;
no network, no admin rights; failures are ignored (the start error then shows as usual).
"""

from __future__ import annotations

import logging
import os
import sys
from collections.abc import Callable
from pathlib import Path

from . import config

log = logging.getLogger(__name__)

ZONE_STREAM = ":Zone.Identifier"
# site-packages folders whose DLLs are loaded through .NET (pythonnet, clr_loader, pywebview)
DOTNET_PACKAGES = ("pythonnet", "clr_loader", "webview")


def site_packages(root: Path | None = None) -> Path:
    return (root or config.app_root()) / "python" / "Lib" / "site-packages"


def dotnet_dlls(root: Path | None = None) -> list[Path]:
    base = site_packages(root)
    out: list[Path] = []
    for name in DOTNET_PACKAGES:
        folder = base / name
        if folder.is_dir():
            out.extend(p for p in folder.rglob("*") if p.suffix.lower() == ".dll" and p.is_file())
    return out


def unblock_dotnet_dlls(
    root: Path | None = None,
    *,
    remove: Callable[[str], None] = os.remove,
) -> int:
    """Delete `<dll>:Zone.Identifier` of every .NET DLL; returns how many were unblocked."""
    count = 0
    for dll in dotnet_dlls(root):
        try:
            remove(str(dll) + ZONE_STREAM)
            count += 1
        except FileNotFoundError:
            continue  # not blocked
        except OSError as exc:
            log.debug("Zone.Identifier nicht entfernbar (%s): %s", dll, exc)
    if count:
        log.info("Portable: %d DLLs entsperrt (Download-Markierung entfernt)", count)
    return count


def prepare_gui_start(*, platform: str | None = None) -> int:
    """Called by the GUI start before `import webview`. No-op outside portable/Windows."""
    if (platform or sys.platform) != "win32" or not config.is_portable():
        return 0
    try:
        return unblock_dotnet_dlls()
    except Exception:  # never block the start
        log.debug("Entsperren fehlgeschlagen", exc_info=True)
        return 0
