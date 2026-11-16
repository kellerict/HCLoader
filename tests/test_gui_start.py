"""run_gui() wiring with a fake pywebview module (no window, no GUI backend needed)."""

import sys
import types

from app import main as app_main
from app.api import Api
from app.instance import activation_file, request_activation


class FakeEvent:
    def __init__(self):
        self.handlers = []

    def __iadd__(self, fn):
        self.handlers.append(fn)
        return self

    def fire(self):
        for fn in self.handlers:
            fn()


class FakeWindow:
    def __init__(self):
        self.events = types.SimpleNamespace(loaded=FakeEvent(), closed=FakeEvent())
        self.scripts = []
        self.actions = []
        self.on_top = False

    def evaluate_js(self, script):
        self.scripts.append(script)

    def restore(self):
        self.actions.append("restore")

    def show(self):
        self.actions.append("show")


def test_run_gui_creates_window_and_wires_api(monkeypatch):
    created = {}
    seen = {}

    def create_window(title, **kw):
        created.update(kw, title=title)
        created["window"] = FakeWindow()
        return created["window"]

    def start(*a, **kw):
        seen["user_agent"] = kw.get("user_agent", "")
        win = created["window"]
        win.events.loaded.fire()
        # a second start while the window is open brings it to the front
        seen["activation_file"] = activation_file().exists()
        seen["activated"] = request_activation()
        win.events.closed.fire()

    fake = types.ModuleType("webview")
    fake.create_window = create_window
    fake.start = start
    monkeypatch.setitem(sys.modules, "webview", fake)
    monkeypatch.setattr(Api, "_startup_update_check", lambda self: None)
    monkeypatch.setattr(app_main, "setup_logging", lambda *a, **kw: None)  # keep root logger

    assert app_main.run_gui() == app_main.EXIT_OK
    assert created["title"] == "HCLoader"
    assert (created["width"], created["height"]) == (1440, 900)
    assert created["min_size"] == (1100, 700)
    assert created["background_color"] == "#08080a"
    assert created["url"].startswith("file://") and created["url"].endswith("ui/index.html")
    assert "HCLoader-App/" in seen["user_agent"]
    assert isinstance(created["js_api"], Api)
    assert seen["activation_file"] is True and seen["activated"] is True
    assert created["window"].actions == ["restore", "show"]
    assert not activation_file().exists()  # cleaned up on exit


def test_run_gui_without_pywebview(monkeypatch, capsys):
    monkeypatch.setitem(sys.modules, "webview", None)  # import fails
    assert app_main.run_gui() == app_main.EXIT_FAILED
    assert "pywebview" in capsys.readouterr().err


def test_run_gui_start_error_is_visible(monkeypatch, capsys):
    """n4: under pythonw there is no console -> log + MessageBox (Windows)."""
    import ctypes

    boxes = []
    fake = types.ModuleType("webview")
    monkeypatch.setitem(sys.modules, "webview", fake)
    monkeypatch.setattr(app_main, "setup_logging", lambda *a, **kw: None)

    def broken(*a, **kw):
        raise RuntimeError("database is locked")

    import app.api

    monkeypatch.setattr(app.api, "Api", broken)
    monkeypatch.setattr(app_main, "sys", types.SimpleNamespace(platform="win32", stderr=sys.stderr))
    user32 = types.SimpleNamespace(MessageBoxW=lambda hwnd, text, title, flags: boxes.append(text))
    monkeypatch.setattr(ctypes, "windll", types.SimpleNamespace(user32=user32), raising=False)
    monkeypatch.setattr(app_main, "_dialog_allowed", lambda: True)  # as under pythonw

    assert app_main.run_gui() == app_main.EXIT_FAILED
    assert "database is locked" in capsys.readouterr().err
    assert len(boxes) == 1 and "HCLoader konnte nicht gestartet werden" in boxes[0]


def test_fatal_dialog_only_without_console(monkeypatch):
    """A modal MessageBox only under pythonw (no console) and never with HCLOADER_NO_DIALOG."""
    import sys

    assert app_main._dialog_allowed() is False  # conftest sets HCLOADER_NO_DIALOG
    monkeypatch.delenv("HCLOADER_NO_DIALOG")
    monkeypatch.setattr(sys, "executable", r"C:\App\python\python.exe")
    monkeypatch.setattr(sys, "stderr", object())
    assert app_main._dialog_allowed() is False  # console run: stderr is enough
    monkeypatch.setattr(sys, "executable", r"C:\App\python\pythonw.exe")
    assert app_main._dialog_allowed() is True
