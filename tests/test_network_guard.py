"""The autouse guard in conftest.py: no test may reach the network (CLAUDE.md)."""

import socket
import urllib.request

import pytest


def test_external_connect_is_blocked():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        with pytest.raises(RuntimeError, match="nie ins Netz"):
            s.connect(("142.250.1.1", 443))
    finally:
        s.close()


def test_hostname_lookup_and_urlopen_are_blocked():
    with pytest.raises(RuntimeError, match="nie ins Netz"):
        socket.create_connection(("android.clients.google.com", 443), timeout=1)
    with pytest.raises(RuntimeError, match="nie ins Netz"):
        urllib.request.urlopen("http://example.invalid/", timeout=1)


def test_loopback_is_allowed():
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.bind(("127.0.0.1", 0))
    srv.listen(1)
    try:
        conn = socket.create_connection(srv.getsockname(), timeout=2)
        conn.close()
        conn = socket.create_connection(("localhost", srv.getsockname()[1]), timeout=2)
        conn.close()
    finally:
        srv.close()
