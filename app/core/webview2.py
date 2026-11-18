"""Microsoft Edge WebView2 Runtime detection (Windows).

pywebview silently falls back to MSHTML (Internet Explorer) when the runtime is missing, and the
HCLoader UI does not work there. The installer installs the runtime if needed
(installer/HCLoader.iss); the portable ZIP cannot, so the GUI start checks it and tells the user
where to get it (app/main.py).

Detection as documented by Microsoft ("Distribute your app and the WebView2 Runtime", Detect if a
WebView2 Runtime is already installed): value `pv` (REG_SZ) of the EdgeUpdate client key, per
machine (64-bit Windows: under WOW6432Node) or per user; installed = non-empty and not 0.0.0.0.
pywebview also accepts the Beta/Dev/Canary channels and needs major version >= 86, so the same
applies here and in the installer. The per-machine key without WOW6432Node counts as an extra hit
(pywebview does not read it on x64; Microsoft never writes it there per machine, see
docs/decisions.md). Registry reads only, no network, no subprocess.
"""

from __future__ import annotations

import os
import sys
from collections.abc import Callable, Iterator

RUNTIME_CLIENT_ID = "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
# Beta, Dev, Canary (pywebview platforms/winforms.py uses them as well)
PREVIEW_CLIENT_IDS = (
    "{2CD8A007-E189-409D-A2C8-9AF4EF3C72AA}",
    "{0D50BFEC-CD6A-4F9A-964C-C7416E3ACB10}",
    "{65C35B14-6C1D-4122-AC46-7148CC9D6497}",
)
# pywebview (platforms/winforms.py _is_chromium) uses WebView2 from 86.0.622.0 and compares only
# the major part; installer/HCLoader.iss WebView2MinMajor uses the same rule
MIN_MAJOR = 86
# end-user download page of the Evergreen runtime (Microsoft)
DOWNLOAD_URL = "https://developer.microsoft.com/microsoft-edge/webview2/consumer/"
# escape hatch for setups the registry check cannot see (e.g. a Fixed Version runtime)
SKIP_ENV = "HCLOADER_SKIP_WEBVIEW2_CHECK"

# (root, subkey) -> pv or None; replaced in tests
Reader = Callable[[str, str], "str | None"]


def registry_locations(client_id: str = RUNTIME_CLIENT_ID) -> Iterator[tuple[str, str]]:
    """The documented keys: per machine (64-bit and 32-bit Windows) and per user."""
    yield "HKLM", rf"SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{client_id}"
    yield "HKLM", rf"SOFTWARE\Microsoft\EdgeUpdate\Clients\{client_id}"
    yield "HKCU", rf"Software\Microsoft\EdgeUpdate\Clients\{client_id}"


def _read_pv(root: str, subkey: str) -> str | None:
    import winreg

    hive = winreg.HKEY_LOCAL_MACHINE if root == "HKLM" else winreg.HKEY_CURRENT_USER
    try:
        with winreg.OpenKey(hive, subkey) as key:
            value, _ = winreg.QueryValueEx(key, "pv")
    except OSError:
        return None
    return value if isinstance(value, str) else None


def is_valid_version(pv: str | None) -> bool:
    """Microsoft: missing, null, empty or 0.0.0.0 means not installed. Like pywebview, a runtime
    older than major version MIN_MAJOR does not count either (pywebview would use MSHTML)."""
    value = (pv or "").strip()
    if not value or value == "0.0.0.0":
        return False
    major = value.split(".", 1)[0]
    return major.isdigit() and int(major) >= MIN_MAJOR


def installed_version(reader: Reader | None = None) -> str | None:
    """Version of the installed runtime (or a preview channel), None if there is none."""
    read = reader or _read_pv
    for client_id in (RUNTIME_CLIENT_ID, *PREVIEW_CLIENT_IDS):
        for root, subkey in registry_locations(client_id):
            pv = read(root, subkey)
            if is_valid_version(pv):
                return pv.strip()  # type: ignore[union-attr]
    return None


def missing(reader: Reader | None = None) -> bool:
    """True only on Windows when no runtime is registered (and the check is not switched off)."""
    if sys.platform != "win32" or os.environ.get(SKIP_ENV):
        return False
    try:
        return installed_version(reader) is None
    except Exception:  # never block the start because of the check itself
        return False
