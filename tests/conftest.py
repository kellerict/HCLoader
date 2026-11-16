import pytest

from app.core.db import Database


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
