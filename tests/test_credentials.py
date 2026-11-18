"""WindowsCredentialStore (core/credentials.py) against a fake advapi32: real ctypes callbacks
with the CredWriteW/CredReadW/CredDeleteW/CredFree signatures, so pointers, the CREDENTIALW
layout and the UTF-16 blob are exercised on every platform. Nothing touches the real
Credential Manager."""

from __future__ import annotations

import ctypes
from ctypes import wintypes

import pytest

from app.core import credentials
from app.core.credentials import (
    _CREDENTIALW,
    CRED_PERSIST_LOCAL_MACHINE,
    CRED_TYPE_GENERIC,
    ERROR_NOT_FOUND,
    CredentialError,
    WindowsCredentialStore,
)

PCRED = ctypes.POINTER(_CREDENTIALW)


class FakeAdvapi:
    """In-memory Credential Manager behind ctypes function pointers."""

    def __init__(self):
        self.store: dict[str, bytes] = {}
        self.meta: dict[str, tuple[int, int, str]] = {}
        self.error = 0
        self.freed = 0
        self.live: list = []  # keeps returned structures alive until CredFree
        self.write_fails = False

        @ctypes.CFUNCTYPE(wintypes.BOOL, PCRED, wintypes.DWORD)
        def write(pcred, flags):
            if self.write_fails:
                self.error = 5
                return 0
            c = pcred.contents
            self.store[c.TargetName] = ctypes.string_at(c.CredentialBlob, c.CredentialBlobSize)
            self.meta[c.TargetName] = (c.Type, c.Persist, c.UserName)
            return 1

        @ctypes.CFUNCTYPE(
            wintypes.BOOL, wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, ctypes.POINTER(PCRED)
        )
        def read(name, kind, flags, out):
            if name not in self.store or kind != CRED_TYPE_GENERIC:
                self.error = ERROR_NOT_FOUND
                return 0
            blob = self.store[name]
            buf = (ctypes.c_ubyte * max(1, len(blob))).from_buffer_copy(blob or b"\0")
            cred = _CREDENTIALW()
            cred.Type = CRED_TYPE_GENERIC
            cred.CredentialBlobSize = len(blob)
            cred.CredentialBlob = ctypes.cast(buf, ctypes.POINTER(ctypes.c_ubyte))
            self.live.append((buf, cred))
            out[0] = ctypes.pointer(cred)
            return 1

        @ctypes.CFUNCTYPE(wintypes.BOOL, wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD)
        def delete(name, kind, flags):
            if self.store.pop(name, None) is None:
                self.error = ERROR_NOT_FOUND
                return 0
            return 1

        @ctypes.CFUNCTYPE(None, ctypes.c_void_p)
        def free(ptr):
            self.freed += 1

        self.CredWriteW, self.CredReadW, self.CredDeleteW, self.CredFree = write, read, delete, free


@pytest.fixture
def adv():
    return FakeAdvapi()


@pytest.fixture
def store(adv):
    return WindowsCredentialStore(adv=adv, last_error=lambda: adv.error)


def test_roundtrip_unicode_and_layout(store, adv):
    secret = "Tök€n-😀-" + "x" * 40
    store.set("plex", secret)
    tgt = credentials.target("plex")
    assert adv.store[tgt] == secret.encode("utf-16-le")  # size in bytes, not characters
    assert adv.meta[tgt] == (CRED_TYPE_GENERIC, CRED_PERSIST_LOCAL_MACHINE, "HCLoader")
    assert store.get("plex") == secret
    assert adv.freed == 1  # CredFree after every successful read


def test_missing_credential_is_none(store, adv):
    assert store.get("jellyfin") is None
    assert adv.freed == 0  # nothing to free when CredReadW failed
    store.delete("jellyfin")  # ERROR_NOT_FOUND is fine


def test_read_error_other_than_not_found_raises(store, adv):
    store.set("plex", "abc")
    adv.store.clear()
    adv.error = ERROR_NOT_FOUND
    assert store.get("plex") is None
    store._read = lambda *a: 0  # noqa: SLF001 - simulate access denied
    adv.error = 5
    with pytest.raises(CredentialError, match="CredReadW failed \\(5\\)"):
        store.get("plex")


def test_odd_length_blob_from_another_tool(store, adv):
    """Review v0.9.0 m3: not UTF-16 -> CredentialError (handled by the API), still freed."""
    adv.store[credentials.target("plex")] = b"abc"
    with pytest.raises(CredentialError):
        store.get("plex")
    assert adv.freed == 1


def test_empty_blob_and_max_secret(store, adv):
    adv.store[credentials.target("plex")] = b""
    assert store.get("plex") == ""
    big = "y" * credentials.MAX_SECRET
    store.set("plex", big)
    assert len(adv.store[credentials.target("plex")]) == 2 * credentials.MAX_SECRET
    assert store.get("plex") == big


def test_write_and_delete_errors(store, adv):
    adv.write_fails = True
    with pytest.raises(CredentialError, match="CredWriteW failed \\(5\\)"):
        store.set("plex", "abc")
    adv.write_fails = False
    store.set("plex", "abc")
    store.delete("plex")
    assert store.get("plex") is None
    store._delete = lambda *a: 0  # noqa: SLF001
    adv.error = 5
    with pytest.raises(CredentialError, match="CredDeleteW failed"):
        store.delete("plex")
