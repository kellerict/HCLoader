"""v0.9.0: secrets (Plex token, Jellyfin API key) in the Windows Credential Manager.

Never in config.yaml, the database, the log or the repository: `CredWriteW`/`CredReadW`/
`CredDeleteW` (advapi32, via ctypes - no extra package, works in the embedded Python) with a
generic credential per server type, target `HCLoader/media_server/<type>`, persisted for the
local machine (per Windows user; visible in «Credential Manager › Windows Credentials»).

Elsewhere (Linux CI, development) there is no persistent store: `MemoryStore` keeps a secret for
the running process only and reports `persistent = False` (the UI says so).
"""

from __future__ import annotations

import ctypes
import logging
import sys
import threading
from typing import Any, Protocol

log = logging.getLogger(__name__)

TARGET_PREFIX = "HCLoader/media_server/"
MAX_SECRET = 512  # Plex tokens are ~20 chars, Jellyfin API keys 32; CRED_MAX_CREDENTIAL_BLOB 2560

CRED_TYPE_GENERIC = 1
CRED_PERSIST_LOCAL_MACHINE = 2
ERROR_NOT_FOUND = 1168


class CredentialError(RuntimeError):
    pass


class SecretStore(Protocol):
    persistent: bool

    def get(self, name: str) -> str | None: ...

    def set(self, name: str, secret: str) -> None: ...

    def delete(self, name: str) -> None: ...


def target(name: str) -> str:
    return TARGET_PREFIX + name


def clean_secret(value: Any) -> str:
    """Token as typed/pasted: no surrounding whitespace, no control characters."""
    s = str(value or "").strip()
    if not s or len(s) > MAX_SECRET or any(ord(c) < 32 or ord(c) == 127 for c in s):
        raise CredentialError("invalid")
    return s


class MemoryStore:
    """Process-local store (non-Windows, tests)."""

    persistent = False

    def __init__(self) -> None:
        self._data: dict[str, str] = {}
        self._lock = threading.Lock()

    def get(self, name: str) -> str | None:
        with self._lock:
            return self._data.get(name)

    def set(self, name: str, secret: str) -> None:
        with self._lock:
            self._data[name] = secret

    def delete(self, name: str) -> None:
        with self._lock:
            self._data.pop(name, None)


if sys.platform == "win32":  # pragma: no cover - exercised on Windows only
    from ctypes import wintypes

    class _FILETIME(ctypes.Structure):
        _fields_ = [("dwLowDateTime", wintypes.DWORD), ("dwHighDateTime", wintypes.DWORD)]

    class _CREDENTIALW(ctypes.Structure):
        _fields_ = [
            ("Flags", wintypes.DWORD),
            ("Type", wintypes.DWORD),
            ("TargetName", wintypes.LPWSTR),
            ("Comment", wintypes.LPWSTR),
            ("LastWritten", _FILETIME),
            ("CredentialBlobSize", wintypes.DWORD),
            ("CredentialBlob", ctypes.POINTER(ctypes.c_ubyte)),
            ("Persist", wintypes.DWORD),
            ("AttributeCount", wintypes.DWORD),
            ("Attributes", ctypes.c_void_p),
            ("TargetAlias", wintypes.LPWSTR),
            ("UserName", wintypes.LPWSTR),
        ]


class WindowsCredentialStore:  # pragma: no cover - exercised on Windows only
    """Generic credentials of the current Windows user (Credential Manager)."""

    persistent = True

    def __init__(self) -> None:
        adv = ctypes.WinDLL("advapi32", use_last_error=True)  # type: ignore[attr-defined]
        self._write = adv.CredWriteW
        self._write.argtypes = [ctypes.POINTER(_CREDENTIALW), wintypes.DWORD]
        self._write.restype = wintypes.BOOL
        self._read = adv.CredReadW
        self._read.argtypes = [
            wintypes.LPCWSTR,
            wintypes.DWORD,
            wintypes.DWORD,
            ctypes.POINTER(ctypes.POINTER(_CREDENTIALW)),
        ]
        self._read.restype = wintypes.BOOL
        self._delete = adv.CredDeleteW
        self._delete.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD]
        self._delete.restype = wintypes.BOOL
        self._free = adv.CredFree
        self._free.argtypes = [ctypes.c_void_p]
        self._free.restype = None

    def get(self, name: str) -> str | None:
        ptr = ctypes.POINTER(_CREDENTIALW)()
        if not self._read(target(name), CRED_TYPE_GENERIC, 0, ctypes.byref(ptr)):
            err = ctypes.get_last_error()  # type: ignore[attr-defined]
            if err == ERROR_NOT_FOUND:
                return None
            raise CredentialError(f"CredReadW failed ({err})")
        try:
            cred = ptr.contents
            raw = ctypes.string_at(cred.CredentialBlob, cred.CredentialBlobSize)
            return raw.decode("utf-16-le")
        finally:
            self._free(ptr)

    def set(self, name: str, secret: str) -> None:
        blob = secret.encode("utf-16-le")
        buf = (ctypes.c_ubyte * len(blob)).from_buffer_copy(blob)
        cred = _CREDENTIALW()
        cred.Type = CRED_TYPE_GENERIC
        cred.TargetName = target(name)
        cred.Comment = "HCLoader – media server token"
        cred.CredentialBlobSize = len(blob)
        cred.CredentialBlob = ctypes.cast(buf, ctypes.POINTER(ctypes.c_ubyte))
        cred.Persist = CRED_PERSIST_LOCAL_MACHINE
        cred.UserName = "HCLoader"
        if not self._write(ctypes.byref(cred), 0):
            raise CredentialError(f"CredWriteW failed ({ctypes.get_last_error()})")  # type: ignore[attr-defined]

    def delete(self, name: str) -> None:
        if not self._delete(target(name), CRED_TYPE_GENERIC, 0):
            err = ctypes.get_last_error()  # type: ignore[attr-defined]
            if err != ERROR_NOT_FOUND:
                raise CredentialError(f"CredDeleteW failed ({err})")


_default: SecretStore | None = None
_default_lock = threading.Lock()


def default_store() -> SecretStore:
    """Credential Manager on Windows, otherwise a process-local store."""
    global _default
    with _default_lock:
        if _default is None:
            if sys.platform == "win32":
                try:
                    _default = WindowsCredentialStore()
                except Exception:  # advapi32 not loadable (should not happen)
                    log.warning("Windows Credential Manager not available", exc_info=True)
                    _default = MemoryStore()
            else:
                _default = MemoryStore()
        return _default
