import ipaddress
import socket

import pytest

from app.core.db import Database

_LOCAL_NAMES = {"localhost", "localhost.localdomain", "ip6-localhost", ""}


def _is_loopback(host) -> bool:
    if host is None:
        return True
    if isinstance(host, bytes):
        host = host.decode(errors="replace")
    host = str(host).strip("[]").lower()
    if host in _LOCAL_NAMES:
        return True
    try:
        return ipaddress.ip_address(host.split("%", 1)[0]).is_loopback
    except ValueError:
        return False  # a host name: resolving it would already hit the network


class NetworkBlocked(RuntimeError):
    pass


def _refuse(target) -> None:
    raise NetworkBlocked(
        f"Test versucht eine Netzwerkverbindung nach {target!r} - Tests dürfen nie ins Netz "
        "(CLAUDE.md). Mocken oder den Test mit @pytest.mark.network markieren."
    )


@pytest.fixture(autouse=True)
def _block_network(request, monkeypatch):
    """Blocks every non-loopback connection from Python (socket.connect/connect_ex,
    create_connection, getaddrinfo of a non-local host), except for tests marked `network`.
    Only the Python process is covered: subprocesses started by tests (ffmpeg, pip, Chromium)
    are not blocked. Unix sockets and loopback addresses (local test servers, PO-token ping)
    stay allowed."""
    if request.node.get_closest_marker("network"):
        yield
        return
    real_connect = socket.socket.connect
    real_connect_ex = socket.socket.connect_ex
    real_create = socket.create_connection
    real_getaddrinfo = socket.getaddrinfo

    def check(sock, address) -> None:
        if sock.family in (socket.AF_INET, socket.AF_INET6) and isinstance(address, tuple):
            if not _is_loopback(address[0]):
                _refuse(address)

    def connect(self, address):
        check(self, address)
        return real_connect(self, address)

    def connect_ex(self, address):
        check(self, address)
        return real_connect_ex(self, address)

    def create_connection(address, *args, **kwargs):
        if not _is_loopback(address[0]):
            _refuse(address)
        return real_create(address, *args, **kwargs)

    def getaddrinfo(host, *args, **kwargs):
        if not _is_loopback(host):
            _refuse(host)
        return real_getaddrinfo(host, *args, **kwargs)

    monkeypatch.setattr(socket.socket, "connect", connect)
    monkeypatch.setattr(socket.socket, "connect_ex", connect_ex)
    monkeypatch.setattr(socket, "create_connection", create_connection)
    monkeypatch.setattr(socket, "getaddrinfo", getaddrinfo)
    yield


@pytest.fixture(autouse=True)
def _home(tmp_path, monkeypatch):
    monkeypatch.setenv("HCLOADER_HOME", str(tmp_path / "home"))
    # default target %USERPROFILE%\Music\HCLoader: the queue preflight writes a probe file
    monkeypatch.setenv("USERPROFILE", str(tmp_path / "profile"))
    # never open a modal Windows MessageBox in tests (it blocked the Windows CI for hours)
    monkeypatch.setenv("HCLOADER_NO_DIALOG", "1")


@pytest.fixture
def db(tmp_path):
    d = Database(tmp_path / "test.db")
    yield d
    d.close()


@pytest.fixture(autouse=True)
def _drop_console_log_handlers():
    """Remove console handlers added by setup_logging(console=True); capsys closes their stream."""
    import logging

    yield
    root = logging.getLogger()
    for h in [h for h in root.handlers if getattr(h, "_hcloader_console", False)]:
        root.removeHandler(h)


@pytest.fixture(autouse=True)
def _no_leaked_process_locks():
    """A test that forgets lock.release() must not block the next tests (Windows CI)."""
    yield
    from app.core import locks

    with locks._HELD_LOCK:
        locks._HELD.clear()


@pytest.fixture(autouse=True)
def _english_messages():
    """Backend messages in the reference language (en) for every test; tests that check
    another language switch explicitly. Resets the global language afterwards (no leakage)."""
    from app.core import i18n

    i18n.set_language(i18n.REFERENCE)
    yield
    i18n.set_language(i18n.REFERENCE)


@pytest.fixture
def german_messages(monkeypatch):
    """Backend messages fixed to German (de-CH catalog). The behaviour tests written before
    v0.2.0 assert the German texts; with this fixture they keep doing so and thereby pin the
    German catalog to the original wording. `set_language` (Api start, saving settings) keeps
    resolving but does not switch away from German."""
    from app.core import i18n

    monkeypatch.setattr(i18n, "_active", "de")
    monkeypatch.setattr(i18n, "set_language", lambda setting: i18n.resolve(setting))


@pytest.fixture(autouse=True)
def _no_os_notifications(monkeypatch):
    """v0.9.0: never show a real Windows toast, never write HKCU or the Credential Manager in
    tests (Windows CI runs the same code paths). Tests that check a backend inject their own."""
    from app.core import credentials, notify

    monkeypatch.setattr(notify, "_sender", notify.NullSender())
    monkeypatch.setattr(notify, "ensure_registered", lambda *a, **k: False)
    monkeypatch.setattr(credentials, "_default", credentials.MemoryStore())
