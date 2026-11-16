import stat
import sys

import pytest

from app.core import binaries


@pytest.fixture(autouse=True)
def _bin(tmp_path, monkeypatch):
    monkeypatch.setenv("HCLOADER_BIN_DIR", str(tmp_path / "bin"))
    binaries.clear_cache()
    yield
    binaries.clear_cache()


def _fake_tool(path, first_line):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"#!/bin/sh\necho '{first_line}'\n")
    path.chmod(path.stat().st_mode | stat.S_IEXEC)


def test_paths_under_bin(tmp_path):
    suffix = ".exe" if binaries.IS_WINDOWS else ""
    local = tmp_path / "bin"
    _fake_tool(local / f"deno{suffix}", "deno 2.4.3 (stable)")
    assert binaries.deno_path() == local / f"deno{suffix}"
    assert binaries.provider_server_dir() == local / "bgutil-pot-provider" / "server"


@pytest.mark.skipif(sys.platform == "win32", reason="shell script stubs")
def test_versions_parsed_and_cached(tmp_path):
    local = tmp_path / "bin"
    _fake_tool(local / "deno", "deno 2.4.3 (stable, release, x86_64)")
    _fake_tool(local / "ffmpeg", "ffmpeg version 7.1-essentials_build Copyright")
    assert binaries.deno_version() == "2.4.3"
    assert binaries.ffmpeg_version() == "7.1-essentials_build"
    (local / "deno").unlink()  # cached result survives
    assert binaries.deno_version() == "2.4.3"


def test_missing_binary_is_not_ok(monkeypatch):
    monkeypatch.setattr(binaries.shutil, "which", lambda name: None)
    st = binaries.status()
    assert st["deno_ok"] is False and st["deno_version"] is None
    assert st["ffmpeg_ok"] is False
    assert st["provider_dir_ok"] is False
    assert st["yt_dlp_version"]


def test_provider_dir_ok(tmp_path):
    server = tmp_path / "bin" / "bgutil-pot-provider" / "server"
    (server / "src").mkdir(parents=True)
    assert not binaries.provider_dir_ok()
    (server / "node_modules").mkdir()
    assert binaries.provider_dir_ok()


def test_version_timeout_returns_none(tmp_path, monkeypatch):
    exe = tmp_path / "bin" / "deno"
    exe.parent.mkdir(parents=True)
    exe.write_text("x")

    def boom(*a, **k):
        raise binaries.subprocess.TimeoutExpired("deno", 1)

    monkeypatch.setattr(binaries.subprocess, "run", boom)
    assert binaries.deno_version() is None


def test_pot_server_command_and_missing_provider():
    srv = binaries.PotServer(4417)
    cmd = srv.command()
    assert cmd[1] == "run" and "--port" in cmd and cmd[-1] == "4417"
    assert any(a.startswith("--allow-ffi") for a in cmd)
    assert srv.base_url == "http://127.0.0.1:4417"
    assert srv.start() is False  # no deno / provider in the empty bin dir
    srv.stop()
