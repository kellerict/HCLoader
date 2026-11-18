"""Single-instance activation: a second start brings the running window to the front.

The running GUI listens on 127.0.0.1:<random port> and writes port + random token to
`<app_home>/locks/activation.json`. A second process (which failed to get the single-instance
lock) sends `show <token>` and exits. The token keeps other local processes from poking the
window by guessing the port. v0.9.0: `show <token> <view>` (`--open inbox`, a click on a Windows
notification) also switches the running window to that view.
"""

from __future__ import annotations

import json
import logging
import re
import secrets
import socket
import sys
import threading
from collections.abc import Callable
from pathlib import Path

from .core import config

log = logging.getLogger(__name__)

TIMEOUT_S = 2.0
VIEW_RE = re.compile(r"^[a-z]{2,20}$")


def activation_file() -> Path:
    return config.app_home() / "locks" / "activation.json"


class ActivationServer:
    def __init__(
        self,
        on_show: Callable[[], None],
        *,
        path: Path | None = None,
        on_view: Callable[[str], None] | None = None,
    ) -> None:
        self._on_show = on_show
        self._on_view = on_view
        self._path = path or activation_file()
        self._token = secrets.token_hex(16)
        self._sock: socket.socket | None = None
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()
        self.port: int | None = None

    def start(self) -> bool:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.bind(("127.0.0.1", 0))
            sock.listen(4)
            sock.settimeout(0.5)
        except OSError as exc:
            log.warning("Activation socket not available: %s", exc)
            return False
        self._sock = sock
        self.port = sock.getsockname()[1]
        try:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            tmp = self._path.with_suffix(".tmp")
            tmp.write_text(json.dumps({"port": self.port, "token": self._token}), encoding="utf-8")
            tmp.replace(self._path)
        except OSError as exc:
            log.warning("Activation file not writable: %s", exc)
        self._thread = threading.Thread(target=self._serve, name="hcloader-activate", daemon=True)
        self._thread.start()
        return True

    def _serve(self) -> None:
        assert self._sock is not None
        while not self._stop.is_set():
            try:
                conn, _ = self._sock.accept()
            except TimeoutError:
                continue
            except OSError:
                return
            with conn:
                try:
                    conn.settimeout(TIMEOUT_S)
                    msg = conn.recv(256).decode("ascii", errors="replace").strip()
                except OSError:
                    continue
                parts = msg.split(" ")
                view = parts[2] if len(parts) == 3 else ""
                if len(parts) in (2, 3) and parts[0] == "show" and parts[1] == self._token:
                    try:
                        conn.sendall(b"ok")
                    except OSError:
                        pass
                    try:
                        self._on_show()
                    except Exception:
                        log.debug("Window could not be brought to the front", exc_info=True)
                    if view and VIEW_RE.match(view) and self._on_view is not None:
                        try:
                            self._on_view(view)
                        except Exception:
                            log.debug("View could not be opened", exc_info=True)

    def stop(self) -> None:
        self._stop.set()
        if self._sock is not None:
            try:
                self._sock.close()
            except OSError:
                pass
        if self._thread is not None:
            self._thread.join(timeout=2)
        try:
            data = json.loads(self._path.read_text(encoding="utf-8"))
            if data.get("token") == self._token:
                self._path.unlink()
        except (OSError, ValueError):
            pass


def _allow_foreground() -> None:
    """Windows only allows the foreground process to hand focus to another one."""
    if sys.platform != "win32":
        return
    try:
        import ctypes

        ctypes.windll.user32.AllowSetForegroundWindow(-1)  # type: ignore[attr-defined]  # ASFW_ANY
    except Exception:
        pass


def request_activation(path: Path | None = None, view: str | None = None) -> bool:
    """Ask the running instance to show its window (and `view`). True if it acknowledged."""
    path = path or activation_file()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        port, token = int(data["port"]), str(data["token"])
    except (OSError, ValueError, KeyError, TypeError):
        return False
    _allow_foreground()
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=TIMEOUT_S) as conn:
            suffix = f" {view}" if view and VIEW_RE.match(view) else ""
            conn.sendall(f"show {token}{suffix}".encode("ascii"))
            return conn.recv(8) == b"ok"
    except OSError:
        return False
