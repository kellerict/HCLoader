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
    Unix sockets and loopback addresses (local test servers, PO-token ping) stay allowed."""
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
