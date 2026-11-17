# ruff: noqa: F811  (the `env` fixture comes from test_api)
"""Self-update of HCLoader (app/core/selfupdate.py, Api methods, main.py lock, DB backups).

Everything is mocked: GitHub answers come from a fake opener, the updater process from a fake
Popen. apply_update.ps1 is only checked statically (no PowerShell here)."""

import hashlib
import io
import json
import os
import re
import sqlite3
import time
import types
import urllib.error
import zipfile
from datetime import datetime
from pathlib import Path

import pytest
from test_api import (
    env,  # noqa: F401  (fixture)
    flush,
)

from app import __version__
from app import main as app_main
from app.core import config, maintenance, selfupdate
from app.core import db as dbmod
from app.core.db import Database, SchemaTooNewError
from app.core.selfupdate import Runtime, SelfUpdater, UpdateError

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "apply_update.ps1"
REPO = "kellerict/HCLoader"
LATEST = selfupdate.API_LATEST.format(repo=REPO)
TAGS = selfupdate.API_TAGS.format(repo=REPO)


# --------------------------------------------------------------------------- fakes


class FakeResp(io.BytesIO):
    def __init__(self, body: bytes, headers: dict | None = None):
        super().__init__(body)
        self.headers = headers or {}

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()


class FakeGitHub:
    """url -> bytes | dict/list (JSON) | Exception. Records every request."""

    def __init__(self, routes: dict, *, length: bool = True):
        self.routes = routes
        self.calls: list[tuple[str, float]] = []
        self.length = length

    def __call__(self, req, timeout):
        url = req.full_url
        self.calls.append((url, timeout))
        assert url.startswith("https://"), url
        if url not in self.routes:
            raise urllib.error.HTTPError(url, 404, "Not Found", {}, None)
        body = self.routes[url]
        if isinstance(body, BaseException):
            raise body
        if isinstance(body, (dict, list)):
            body = json.dumps(body).encode()
        headers = {"Content-Length": str(len(body))} if self.length else {}
        return FakeResp(body, headers)


def release(tag="v0.2.0", **kw):
    data = {
        "tag_name": tag,
        "draft": False,
        "prerelease": False,
        "body": "### Added\n- Neues Ding",
        "html_url": f"https://github.com/{REPO}/releases/tag/{tag}",
        "assets": [],
    }
    data.update(kw)
    return data


def source_zip(version="0.2.0", *, prefix=None, requirements=None, fetch="fetch v1", extra=None):
    prefix = f"HCLoader-{version}/" if prefix is None else prefix
    files = {
        "app/__init__.py": f'__version__ = "{version}"\n',
        "app/main.py": "print('new')\n",
        "app/core/__init__.py": "",
        "ui/index.html": "<html>new</html>",
        "scripts/apply_update.ps1": "# staged updater\n",
        "scripts/fetch_binaries.ps1": fetch,
        "scripts/portable/HCLoader.cmd": "@echo off\nstart new\n",
        "scripts/portable/portable.txt": "marker",
        "requirements.txt": requirements if requirements is not None else "yt-dlp\nmutagen\n",
        "pyproject.toml": 'requires-python = ">=3.12"\n',
        "CHANGELOG.md": (
            f"# Changelog\n\n## [{version}] - 2026-11-20\n\n### Fixed\n- Aus dem Changelog\n\n"
            "## [0.1.0]\n- alt\n"
        ),
        "README.md": "neu",
        "tests/test_x.py": "x",
        "docs/x.md": "x",
        "data/config.yaml": "evil: true",
        "portable.txt": "evil",
        ".github/workflows/ci.yml": "x",
    }
    files.update(extra or {})
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for name, text in files.items():
            zf.writestr(prefix + name, text)
    return buf.getvalue()


@pytest.fixture
def root(tmp_path):
    """An installed HCLoader 0.1.0 (venv style) with user data."""
    r = tmp_path / "HCLoader"
    (r / "app" / "core").mkdir(parents=True)
    (r / "app" / "__init__.py").write_text('__version__ = "0.1.0"\n')
    (r / "app" / "main.py").write_text("print('old')\n")
    (r / "ui").mkdir()
    (r / "ui" / "index.html").write_text("<html>old</html>")
    (r / "scripts").mkdir()
    (r / "scripts" / "fetch_binaries.ps1").write_text("fetch v1")
    (r / "scripts" / "apply_update.ps1").write_text(SCRIPT.read_text())
    (r / "requirements.txt").write_text("yt-dlp\nmutagen\n")
    data = r / "data"
    data.mkdir()
    (data / "config.yaml").write_text("mine: 1\n")
    (data / "hcloader.db").write_bytes(b"db")
    return r


def make_updater(root, gh, **kw):
    data = root / "data"
    events, progress = [], []
    up = SelfUpdater(
        current=kw.pop("current", "0.1.0"),
        repo=lambda: REPO,
        update_dir=data / "update",
        root=root,
        data_dir=data,
        logs_dir=data / "logs",
        opener=gh,
        on_change=events.append,
        on_progress=progress.append,
        platform=kw.pop("platform", "win32"),
        runtime=kw.pop(
            "runtime",
            lambda: Runtime("venv", r"C:\v\python.exe", r"C:\v\pythonw.exe", r"C:\v\site"),
        ),
        **kw,
    )
    up.events, up.progress_events = events, progress
    return up


def snapshot(folder: Path) -> dict:
    return {
        str(p.relative_to(folder)): p.read_bytes() for p in sorted(folder.rglob("*")) if p.is_file()
    }


# --------------------------------------------------------------------------- versions


def test_single_version_source():
    assert re.fullmatch(r"\d+\.\d+\.\d+", __version__)
    assert maintenance.app_version() == __version__
    text = (ROOT / "pyproject.toml").read_text()
    assert 'version = {attr = "app.__version__"}' in text
    assert not re.search(r'^version\s*=\s*"', text, re.M)
    assert "app\\__init__.py" in (ROOT / "scripts" / "build_portable.ps1").read_text()


@pytest.mark.parametrize(
    "text,expected",
    [
        ("v0.3.1", (0, 3, 1)),
        ("0.10.0", (0, 10, 0)),
        ("v1.0.0+build5", (1, 0, 0)),
        ("v0.3.0-rc1", None),
        ("v0.3.0-beta.2", None),
        ("0.3", None),
        ("latest", None),
        ("v01.2.3", None),
    ],
)
def test_parse_version(text, expected):
    assert selfupdate.parse_version(text) == expected


def test_version_comparison_is_numeric_and_ignores_prereleases():
    assert selfupdate.is_newer("0.10.0", "0.9.9")
    assert not selfupdate.is_newer("0.2.0", "0.2.0")
    assert not selfupdate.is_newer("0.1.9", "0.2.0")
    assert not selfupdate.is_newer("0.3.0-rc1", "0.2.0")
    assert selfupdate.is_prerelease("v0.3.0-rc1") and not selfupdate.is_prerelease("v0.3.0")


def test_changelog_section_and_requirements_diff():
    text = "## [Unreleased]\n- x\n\n## [0.2.0] - 2026\n### Added\n- A\n\n## [0.1.0]\n- B\n"
    assert selfupdate.changelog_section(text, "0.2.0") == "### Added\n- A"
    assert selfupdate.changelog_section(text, "0.1.0") == "- B"
    assert selfupdate.changelog_section(text, "0.9.0") == ""
    assert not selfupdate.requirements_changed("yt-dlp\n# c\nmutagen", "mutagen \n\nyt-dlp")
    assert not selfupdate.requirements_changed("pydantic >= 2", "pydantic>=2")
    assert selfupdate.requirements_changed("yt-dlp\nmutagen", "yt-dlp\nmutagen\nrequests")
    assert selfupdate.requirements_changed("pydantic>=2", "pydantic>=3")


# --------------------------------------------------------------------------- check


def test_find_latest_uses_release_and_codeload_zip():
    gh = FakeGitHub({LATEST: release("v0.2.0")})
    rel = selfupdate.find_latest(REPO, opener=gh)
    assert rel.version == "0.2.0" and rel.tag == "v0.2.0" and rel.source == "release"
    assert rel.notes == "### Added\n- Neues Ding"
    assert rel.zip_url == f"https://codeload.github.com/{REPO}/zip/refs/tags/v0.2.0"
    assert gh.calls == [(LATEST, 5.0)]  # one unauthenticated request, 5 s timeout


def test_find_latest_prefers_source_asset_and_sums():
    assets = [
        {"name": "SHA256SUMS", "browser_download_url": "https://x/SHA256SUMS"},
        {"name": "HCLoader-0.2.0-source.zip", "browser_download_url": "https://x/src.zip"},
        {"name": "HCLoader-portable-0.2.0-win64.zip", "browser_download_url": "https://x/p.zip"},
    ]
    rel = selfupdate.find_latest(REPO, opener=FakeGitHub({LATEST: release(assets=assets)}))
    assert rel.zip_url == "https://x/src.zip" and rel.zip_name == "HCLoader-0.2.0-source.zip"
    assert rel.sums_url == "https://x/SHA256SUMS"


def test_find_latest_falls_back_to_tags_without_prereleases():
    tags = [{"name": n} for n in ("v0.2.0", "v0.10.0-rc1", "v0.9.1", "nightly", "v0.3.0")]
    changelog = "## [0.9.1]\n- Tag-Notizen\n"
    raw = selfupdate.RAW_CHANGELOG.format(repo=REPO, tag="v0.9.1")
    gh = FakeGitHub({TAGS: tags, raw: changelog.encode()})  # releases/latest -> 404
    rel = selfupdate.find_latest(REPO, opener=gh)
    assert rel.version == "0.9.1" and rel.source == "tags" and rel.notes == "- Tag-Notizen"


def test_prerelease_marked_release_is_ignored():
    gh = FakeGitHub({LATEST: release("v0.5.0", prerelease=True), TAGS: [{"name": "v0.4.0"}]})
    assert selfupdate.find_latest(REPO, opener=gh).version == "0.4.0"


def test_automatic_check_offline_is_silent(root, caplog):
    gh = FakeGitHub({LATEST: urllib.error.URLError("offline")})
    up = make_updater(root, gh)
    with caplog.at_level("INFO"):
        res = up.check()
    assert res["ok"] is False and "keine Verbindung" in res["error"]
    st = up.status()
    assert st["state"] == "idle" and st["error"] is None and st["available"] is False
    assert "Update-Prüfung fehlgeschlagen" in caplog.text
    assert not [r for r in caplog.records if r.levelno >= 30]  # info only, no warning


def test_manual_check_reports_rate_limit(root):
    gh = FakeGitHub({LATEST: urllib.error.HTTPError(LATEST, 403, "rate", {}, None)})
    res = make_updater(root, gh).check(manual=True)
    assert res["ok"] is False and "403" in res["error"]


def test_check_finds_newer_version_and_emits_status(root):
    up = make_updater(root, FakeGitHub({LATEST: release("v0.2.0")}))
    res = up.check()
    assert res["ok"] and res["available"] and res["latest"] == "0.2.0"
    assert [e["state"] for e in up.events] == ["checking", "idle"]
    assert res["checked"] and res["notes"].startswith("### Added")
    up2 = make_updater(root, FakeGitHub({LATEST: release("v0.1.0")}))
    assert up2.check()["available"] is False


def test_custom_repo_setting_is_used(tmp_path):
    gh = FakeGitHub({})
    up = make_updater(tmp_path, gh)
    up._repo = lambda: "someone/fork"
    up.check()
    assert gh.calls[0][0] == "https://api.github.com/repos/someone/fork/releases/latest"


@pytest.mark.parametrize(
    "value,expected",
    [
        ("someone/fork", "someone/fork"),
        ("https://github.com/someone/fork.git", "someone/fork"),
        ("", "kellerict/HCLoader"),
    ],
)
def test_update_repo_setting(value, expected):
    s, errors = config.parse_settings({"maintenance": {"update_repo": value}})
    assert s.maintenance.update_repo == expected, errors


def test_update_repo_setting_rejects_garbage():
    s, errors = config.parse_settings({"maintenance": {"update_repo": "../../etc"}})
    assert s is None and "maintenance.update_repo" in errors


def test_new_maintenance_defaults():
    m = config.Settings().maintenance
    assert m.check_app_updates_on_start is True and m.apply_update_on_exit is True
    assert m.update_repo == "kellerict/HCLoader"


# --------------------------------------------------------------------------- download


def test_download_with_progress(tmp_path):
    body = os.urandom(300_000)
    gh = FakeGitHub({"https://x/a.zip": body})
    seen = []
    out = selfupdate.download(
        "https://x/a.zip",
        tmp_path / "a.zip",
        opener=gh,
        on_progress=lambda d, t: seen.append((d, t)),
    )
    assert out.read_bytes() == body and not (tmp_path / "a.zip.part").exists()
    assert seen[0] == (0, 300_000) and seen[-1] == (300_000, 300_000)
    assert [d for d, _ in seen] == sorted(d for d, _ in seen) and len(seen) > 3


def test_download_without_length_and_cancel(tmp_path):
    import threading

    gh = FakeGitHub({"https://x/a.zip": b"x" * 200_000}, length=False)
    seen = []
    selfupdate.download(
        "https://x/a.zip", tmp_path / "a.zip", opener=gh, on_progress=lambda d, t: seen.append(t)
    )
    assert set(seen) == {0}  # total unknown (codeload)
    stop = threading.Event()
    stop.set()
    with pytest.raises(selfupdate.UpdateCancelled):
        selfupdate.download("https://x/a.zip", tmp_path / "b.zip", opener=gh, cancel=stop)
    assert not (tmp_path / "b.zip").exists() and not (tmp_path / "b.zip.part").exists()


def test_download_truncated_is_an_error(tmp_path):
    class Short(FakeGitHub):
        def __call__(self, req, timeout):
            return FakeResp(b"abc", {"Content-Length": "10"})

    with pytest.raises(UpdateError, match="unvollständig"):
        selfupdate.download("https://x/a.zip", tmp_path / "a.zip", opener=Short({}))


def test_full_download_prepares_staging_only_program_folders(root):
    zbytes = source_zip("0.2.0")
    zurl = f"https://codeload.github.com/{REPO}/zip/refs/tags/v0.2.0"
    up = make_updater(root, FakeGitHub({LATEST: release("v0.2.0"), zurl: zbytes}))
    before = snapshot(root)
    up.check()
    assert up.begin_download() is None
    assert up.begin_download() == "Das Update wird bereits heruntergeladen"
    res = up.download()
    assert res["ok"] and res["state"] == "ready", res
    # nothing outside data/update changed while the app "runs"
    after = {k: v for k, v in snapshot(root).items() if not k.startswith("data/update")}
    assert after == before
    staging = root / "data" / "update" / "staging"
    tops = sorted(p.name for p in staging.iterdir())
    assert tops == [
        "CHANGELOG.md",
        "README.md",
        "app",
        "pyproject.toml",
        "requirements.txt",
        "scripts",
        "ui",
    ]
    assert not (staging / "data").exists() and not (staging / "portable.txt").exists()
    assert not (staging / "tests").exists() and not (staging / ".github").exists()
    m = json.loads((root / "data" / "update" / "manifest.json").read_text())
    assert m["from_version"] == "0.1.0" and m["to_version"] == "0.2.0"
    assert "data" not in m["items"] and "portable.txt" not in m["items"]
    assert set(m["protected"]) >= {"data", "portable.txt", "python", ".venv", "bin", ".git"}
    assert m["requirements_changed"] is False and m["binaries_changed"] is False
    assert m["mode"] == "venv" and m["pythonw"].endswith("pythonw.exe")
    assert m["lock"].endswith("update.lock") and m["result"].endswith("result.json")
    assert m["log"] == str(root / "data" / "logs" / "update.log")
    assert not (root / "data" / "update" / "download.zip").exists()
    phases = [p["phase"] for p in up.progress_events]
    assert phases[0] == "download" and "verify" in phases and phases[-1] == "prepare"
    assert any(p["pct"] == 100.0 for p in up.progress_events)
    assert [e["state"] for e in up.events][-1] == "ready"


def test_requirements_and_binaries_change_detection(root):
    zbytes = source_zip("0.2.0", requirements="yt-dlp\nmutagen\nrequests\n", fetch="fetch v2")
    zurl = f"https://codeload.github.com/{REPO}/zip/refs/tags/v0.2.0"
    up = make_updater(root, FakeGitHub({LATEST: release(), zurl: zbytes}))
    up.check()
    assert up.download()["ok"]
    m = up._s.manifest
    assert m["requirements_changed"] is True and m["binaries_changed"] is True
    assert m["pip_args"][:3] == ["-m", "pip", "install"]
    assert m["pip_args"][-2:] == ["-r", str(root / "requirements.txt")]
    assert "--no-build-isolation" not in m["pip_args"]  # venv


def test_fetch_script_change_alone_triggers_binaries(root):
    zbytes = source_zip("0.2.0", fetch="fetch v2 (deno 3)")
    zurl = f"https://codeload.github.com/{REPO}/zip/refs/tags/v0.2.0"
    up = make_updater(root, FakeGitHub({LATEST: release(), zurl: zbytes}))
    up.check()
    up.download()
    assert up._s.manifest["requirements_changed"] is False
    assert up._s.manifest["binaries_changed"] is True


def test_portable_staging_brings_starters_but_never_the_marker(root):
    (root / "portable.txt").write_text("portable")
    zurl = f"https://codeload.github.com/{REPO}/zip/refs/tags/v0.2.0"
    runtime = Runtime("portable", r"C:\H\python\python.exe", r"C:\H\python\pythonw.exe", "x")
    up = make_updater(
        root, FakeGitHub({LATEST: release(), zurl: source_zip()}), runtime=lambda: runtime
    )
    up.check()
    assert up.download()["ok"]
    m = up._s.manifest
    assert "HCLoader.cmd" in m["items"] and "portable.txt" not in m["items"]
    cmd = (root / "data" / "update" / "staging" / "HCLoader.cmd").read_bytes()
    assert cmd == b"@echo off\r\nstart new\r\n"
    assert m["materialize_links"] is True and "--no-build-isolation" in m["pip_args"]
    assert up.status()["portable"] is True


def test_sha256sums_mismatch_is_refused(root):
    zbytes = source_zip()
    assets = [{"name": "SHA256SUMS", "browser_download_url": "https://x/SHA256SUMS"}]
    zurl = f"https://codeload.github.com/{REPO}/zip/refs/tags/v0.2.0"
    bad = f"{'0' * 64}  HCLoader-0.2.0.zip\n".encode()
    up = make_updater(
        root,
        FakeGitHub({LATEST: release(assets=assets), zurl: zbytes, "https://x/SHA256SUMS": bad}),
    )
    up.check()
    res = up.download()
    assert res["ok"] is False and res["state"] == "error" and "Prüfsumme" in res["error"]
    assert not (root / "data" / "update" / "staging").exists()
    good = f"{hashlib.sha256(zbytes).hexdigest()} *HCLoader-0.2.0.zip\n".encode()
    up._open = FakeGitHub(
        {LATEST: release(assets=assets), zurl: zbytes, "https://x/SHA256SUMS": good}
    )
    up.check()
    assert up.download()["ok"]


@pytest.mark.parametrize(
    "zbytes,match",
    [
        (b"not a zip", "Kein gültiges ZIP"),
        (source_zip("0.3.0"), "passt nicht"),
        (source_zip(extra={"../evil.txt": "x"}), "Ungültiger Pfad"),
        (source_zip(extra={"pyproject.toml": 'requires-python = ">=3.99"\n'}), "Python 3.99"),
    ],
)
def test_bad_packages_are_refused(root, zbytes, match):
    zurl = f"https://codeload.github.com/{REPO}/zip/refs/tags/v0.2.0"
    up = make_updater(root, FakeGitHub({LATEST: release(), zurl: zbytes}))
    up.check()
    res = up.download()
    assert res["ok"] is False and re.search(match, res["error"]), res["error"]
    assert res["state"] == "error"


def test_new_requirements_without_venv_are_refused(root):
    zurl = f"https://codeload.github.com/{REPO}/zip/refs/tags/v0.2.0"
    up = make_updater(
        root,
        FakeGitHub({LATEST: release(), zurl: source_zip(requirements="other\n")}),
        runtime=lambda: Runtime("other", "py", "pyw", "site"),
    )
    up.check()
    assert "setup.ps1" in up.download()["error"]


def test_git_checkout_is_detected_and_blocked(root):
    (root / ".git").mkdir()
    up = make_updater(root, FakeGitHub({LATEST: release()}))
    st = up.check()
    assert st["git_checkout"] is True and st["available"] is True
    assert "git pull" in st["blocked"] and "setup.ps1" in st["blocked"]
    assert "git pull" in up.begin_download()
    assert up.launch(restart=True)["ok"] is False


def test_repo_checkout_is_a_git_checkout():
    assert selfupdate.is_git_checkout(ROOT) == (ROOT / ".git").exists()


def test_not_on_windows_blocked(root):
    up = make_updater(root, FakeGitHub({LATEST: release()}), platform="linux")
    up.check()
    assert up.begin_download() == selfupdate.WINDOWS_ONLY


def test_cancel_while_ready_discards(root):
    zurl = f"https://codeload.github.com/{REPO}/zip/refs/tags/v0.2.0"
    up = make_updater(root, FakeGitHub({LATEST: release(), zurl: source_zip()}))
    up.check()
    up.download()
    assert up.cancel()["state"] == "idle"
    assert not (root / "data" / "update" / "staging").exists()
    assert not (root / "data" / "update" / "manifest.json").exists()


def test_restore_ready_from_earlier_session(root):
    zurl = f"https://codeload.github.com/{REPO}/zip/refs/tags/v0.2.0"
    up = make_updater(root, FakeGitHub({LATEST: release(), zurl: source_zip()}))
    up.check()
    up.download()
    again = make_updater(root, FakeGitHub({}))
    st = again.restore()
    assert st["state"] == "ready" and st["latest"] == "0.2.0" and st["available"]
    # after the update the same staging is stale and removed
    newer = make_updater(root, FakeGitHub({}), current="0.2.0")
    assert newer.restore()["state"] == "idle"
    assert not (root / "data" / "update" / "staging").exists()


def test_take_result_success_cleans_previous(root):
    upd = root / "data" / "update"
    upd.mkdir(parents=True)
    (root / "_previous" / "app").mkdir(parents=True)
    # PowerShell 5.1 writes UTF-8 (here with BOM to be safe)
    (upd / "result.json").write_bytes(
        b"\xef\xbb\xbf" + json.dumps({"ok": True, "to_version": "0.2.0"}).encode()
    )
    up = make_updater(root, FakeGitHub({}))
    assert up.take_result()["to_version"] == "0.2.0"
    assert not (root / "_previous").exists()
    assert up.take_result() is None  # once
    assert (upd / "result.last.json").exists()


# --------------------------------------------------------------------------- launch / API


class FakePopen:
    def __init__(self, fail_breakaway=False):
        self.calls = []
        self.fail_breakaway = fail_breakaway

    def __call__(self, args, **kw):
        if self.fail_breakaway and kw["creationflags"] & selfupdate.CREATE_BREAKAWAY_FROM_JOB:
            raise OSError("access denied")
        self.calls.append((list(args), kw))
        return types.SimpleNamespace(pid=4242)


def ready_updater(root, popen, **kw):
    zurl = f"https://codeload.github.com/{REPO}/zip/refs/tags/v0.2.0"
    up = make_updater(
        root,
        FakeGitHub({LATEST: release(), zurl: source_zip()}),
        popen=popen,
        pid=lambda: 777,
        **kw,
    )
    up.check()
    assert up.download()["ok"]
    return up


def test_launch_starts_hidden_updater_with_right_arguments(root):
    popen = FakePopen(fail_breakaway=True)
    up = ready_updater(root, popen)
    res = up.launch(restart=True)
    assert res["ok"], res
    ((args, kw),) = popen.calls
    upd = root / "data" / "update"
    assert args[0].lower().endswith("powershell.exe")
    assert args[args.index("-File") + 1] == str(upd / "apply_update.ps1")
    assert args[args.index("-Manifest") + 1] == str(upd / "manifest.json")
    assert args[args.index("-WaitPid") + 1] == "777"
    assert args[args.index("-WindowStyle") + 1] == "Hidden"
    assert "-Restart" in args and "-NoProfile" in args
    assert kw["creationflags"] & selfupdate.CREATE_NO_WINDOW
    assert kw["cwd"] == str(upd)  # never inside a folder that is swapped
    # the INSTALLED updater is used (it matches the manifest format of this version)
    assert (upd / "apply_update.ps1").read_text() == SCRIPT.read_text()
    assert json.loads((upd / "update.lock").read_text())["pid"] == 777
    assert up.status()["state"] == "applying"


def make_api(env, root, popen, **settings):

    up = ready_updater(root, popen)
    cfg = config.Settings()
    for k, v in settings.items():
        setattr(cfg.maintenance, k, v)
    config.save(cfg)
    a = env.make(self_updater=up)
    return a, up


def test_apply_update_now_closes_window_then_launches_with_restart(env, root, monkeypatch):
    from app import api as api_mod

    monkeypatch.setattr(api_mod, "APP_UPDATE_CLOSE_DELAY_S", 0)
    popen = FakePopen()
    a, up = make_api(env, root, popen)
    win = types.SimpleNamespace(destroyed=0)
    win.destroy = lambda: setattr(win, "destroyed", win.destroyed + 1)
    a._window = win
    assert a.get_update_status()["state"] == "ready"
    assert a.apply_update_now() == {"ok": True}
    for _ in range(100):
        if win.destroyed:
            break
        time.sleep(0.01)
    assert win.destroyed == 1
    assert not popen.calls  # the updater only starts after shutdown
    a.shutdown()
    res = a.finish_update()
    assert res["ok"] and "-Restart" in popen.calls[0][0]


def test_update_on_exit_without_restart(env, root):
    popen = FakePopen()
    a, _ = make_api(env, root, popen)
    a.shutdown()
    assert a.finish_update()["ok"]
    assert "-Restart" not in popen.calls[0][0]


def test_update_on_exit_disabled_keeps_it_ready(env, root):
    popen = FakePopen()
    a, up = make_api(env, root, popen, apply_update_on_exit=False)
    assert a.get_update_status()["apply_on_exit"] is False
    a.shutdown()
    assert a.finish_update() is None and not popen.calls
    assert up.status()["state"] == "ready"


def test_apply_now_refused_without_ready_update(env, root):
    a = env.make(self_updater=make_updater(root, FakeGitHub({})))
    assert a.apply_update_now()["ok"] is False
    assert a.finish_update() is None


def test_api_download_runs_in_background_with_events(env, root):
    zurl = f"https://codeload.github.com/{REPO}/zip/refs/tags/v0.2.0"
    up = make_updater(root, FakeGitHub({LATEST: release(), zurl: source_zip()}))
    up._on_change = None
    a = env.make(self_updater=up)
    res = a.check_update()
    assert res["ok"] and res["available"] and res["latest"] == "0.2.0"
    assert a.download_update()["ok"]
    for _ in range(300):
        if a.get_update_status()["state"] == "ready":
            break
        time.sleep(0.01)
    assert a.get_update_status()["state"] == "ready"
    flush(a)
    states = [e["state"] for e in env.window.events_of("update")]
    assert states[0] == "checking" and states[-1] == "ready" and "downloading" in states
    prog = env.window.events_of("update_progress")
    assert prog and {"phase", "pct", "bytes", "total"} <= set(prog[0])
    assert a.download_update()["ok"] is False  # already ready
    assert a.cancel_update()["state"] == "idle"


def test_startup_check_respects_setting(env, root):
    gh = FakeGitHub({LATEST: release()})
    cfg = config.Settings()
    cfg.maintenance.check_app_updates_on_start = False
    config.save(cfg)
    a = env.make(self_updater=make_updater(root, gh))
    a._startup_app_update()
    a._update_worker.stop()
    assert gh.calls == []
    cfg.maintenance.check_app_updates_on_start = True
    config.save(cfg)
    b = env.make(self_updater=make_updater(root, gh))
    b._startup_app_update()
    for _ in range(200):
        if gh.calls:
            break
        time.sleep(0.01)
    assert gh.calls and gh.calls[0][0] == LATEST


def test_result_toast_after_update(env, root):
    upd = root / "data" / "update"
    upd.mkdir(parents=True)
    (upd / "result.json").write_text(
        json.dumps({"ok": False, "error": "pip install fehlgeschlagen", "rolled_back": True})
    )
    cfg = config.Settings()
    cfg.maintenance.check_app_updates_on_start = False
    config.save(cfg)
    a = env.make(self_updater=make_updater(root, FakeGitHub({})))
    a.start()
    a._startup_app_update()
    flush(a)
    toasts = env.window.events_of("toast")
    assert any(
        "fehlgeschlagen" in t["msg"] and "wiederhergestellt" in t["msg"] and t["kind"] == "err"
        for t in toasts
    )


# --------------------------------------------------------------------------- lock / main


def test_main_refuses_start_while_update_runs(monkeypatch, capsys):
    upd = config.app_home() / "update"
    upd.mkdir(parents=True)
    (upd / "update.lock").write_text("{}")
    shown = []
    monkeypatch.setattr(app_main, "show_fatal", shown.append)
    monkeypatch.setattr(app_main, "run_gui", lambda: pytest.fail("GUI must not start"))
    assert app_main.main([]) == app_main.EXIT_BUSY
    assert "aktualisiert" in shown[0]
    assert app_main.main(["--headless", "--run-watchlist"]) == app_main.EXIT_BUSY
    assert "aktualisiert" in capsys.readouterr().err


def test_stale_update_lock_is_ignored(monkeypatch):
    upd = config.app_home() / "update"
    upd.mkdir(parents=True)
    lock = upd / "update.lock"
    lock.write_text("{}")
    old = time.time() - selfupdate.LOCK_STALE_S - 10
    os.utime(lock, (old, old))
    monkeypatch.setattr(app_main, "run_gui", lambda: 0)
    assert app_main.main([]) == 0
    assert not lock.exists()


# --------------------------------------------------------------------------- DB migrations


def _old_db(path: Path, version: int) -> None:
    conn = sqlite3.connect(path)
    dbmod.migrate(conn, dbmod.MIGRATIONS[:version])
    conn.execute(
        "INSERT INTO videos(id, title, status, first_seen) VALUES ('abc', 'Mein Mix', 'done', 'x')"
    )
    conn.execute("INSERT INTO state(key, value) VALUES ('backoff_level', '2')")
    conn.commit()
    conn.close()


def test_premigration_backup_keeps_data(tmp_path):
    path = tmp_path / "hcloader.db"
    old = len(dbmod.MIGRATIONS) - 1
    _old_db(path, old)
    with Database(path) as d:
        assert d.schema_version() == len(dbmod.MIGRATIONS)
        assert d.get_video("abc")["title"] == "Mein Mix"
        assert d.get_state("backoff_level") == "2"
    backups = list((tmp_path / "backups").glob("hcloader-premigrate-*.db"))
    assert len(backups) == 1
    name = backups[0].name
    assert name.startswith(f"hcloader-premigrate-v{old}-to-v{len(dbmod.MIGRATIONS)}-")
    conn = sqlite3.connect(backups[0])
    assert conn.execute("SELECT MAX(version) FROM schema_version").fetchone()[0] == old
    assert conn.execute("SELECT title FROM videos WHERE id='abc'").fetchone()[0] == "Mein Mix"
    conn.close()
    # no second backup when nothing is migrated, none for a fresh DB
    Database(path).close()
    Database(tmp_path / "fresh.db").close()
    assert len(list((tmp_path / "backups").glob("*.db"))) == 1
    kinds = {b["name"]: b["kind"] for b in maintenance.list_backups(tmp_path / "backups")}
    assert kinds == {name: "premigrate"}


def test_premigration_backup_failure_stops_migration(tmp_path, monkeypatch):
    path = tmp_path / "hcloader.db"
    _old_db(path, 1)

    def boom(*a, **kw):
        raise OSError("Datenträger voll")

    monkeypatch.setattr(maintenance, "backup_before_migration", boom)
    with pytest.raises(dbmod.MigrationBackupError, match="unverändert"):
        Database(path)
    conn = sqlite3.connect(path)
    assert conn.execute("SELECT MAX(version) FROM schema_version").fetchone()[0] == 1
    conn.close()


def test_premigration_backups_have_own_retention(tmp_path):
    src = tmp_path / "src.db"
    sqlite3.connect(src).close()
    dest = tmp_path / "bk"
    for i in range(3):  # normal backups, many
        maintenance.backup_database(src, dest, now=datetime(2026, 1, 1, 0, 0, i), keep=2)
    for i in range(7):
        maintenance.backup_before_migration(src, 4, 5, dest, now=datetime(2026, 1, 2, 0, 0, i))
        os.utime(dest / f"hcloader-premigrate-v4-to-v5-20260102-00000{i}.db", (1000 + i,) * 2)
    pre = sorted(p.name for p in dest.glob("hcloader-premigrate-*.db"))
    assert len(pre) == 5 and pre[0].endswith("000002.db")
    normal = [p for p in dest.glob("hcloader-2*.db")]
    assert len(normal) == 2
    maintenance.backup_database(src, dest, now=datetime(2026, 1, 3), keep=1)  # normal rotation
    assert len(list(dest.glob("hcloader-premigrate-*.db"))) == 5  # untouched


def test_newer_db_gives_clear_message(tmp_path, monkeypatch):
    path = config.db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    dbmod.migrate(conn)
    conn.execute("UPDATE schema_version SET version=99")
    conn.commit()
    conn.close()
    with pytest.raises(SchemaTooNewError) as ei:
        Database(path)
    assert isinstance(ei.value, RuntimeError)  # old callers keep working
    msg = app_main.db_error_message(ei.value)
    assert "neueren HCLoader-Version" in msg and "v99" in msg and "Traceback" not in msg
    shown = []
    monkeypatch.setattr(app_main, "show_fatal", shown.append)
    monkeypatch.setattr(app_main, "_run_gui", lambda: Database(path))
    assert app_main.main([]) == app_main.EXIT_FAILED
    assert shown and "neueren HCLoader-Version" in shown[0]
    assert "hcloader-premigrate" in shown[0]


def test_headless_with_newer_db_exits_cleanly(capsys):
    from app.headless import run_watchlist

    path = config.db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    dbmod.migrate(conn)
    conn.execute("UPDATE schema_version SET version=99")
    conn.commit()
    conn.close()
    assert run_watchlist(configure_logging=False) == app_main.EXIT_FAILED
    assert "neueren HCLoader-Version" in capsys.readouterr().err


# --------------------------------------------------------------------------- PowerShell (static)


def test_apply_update_script_is_ascii_and_ps51_safe():
    raw = SCRIPT.read_bytes()
    assert all(b < 128 for b in raw), "nur ASCII (PS 5.1 liest ohne BOM als ANSI)"
    text = raw.decode()
    code = "\n".join(line for line in text.splitlines() if not line.lstrip().startswith("#"))
    assert "&&" not in code and "||" not in code
    assert "$env:PSModulePath" in text  # same guard as the other scripts
    assert "\\\\?\\" in text and "function Remove-Tree" in text
    assert "rmdir /s /q" in text
    for needle in ("WaitForExit", "_previous", "result", "Rollback", "Start-Process", "robocopy"):
        assert needle in text
    # protected entries come from the manifest and are re-checked in the script
    assert "$protected -contains $name" in text and "'.git'" in text


def test_apply_update_script_parameters_match_python():
    text = SCRIPT.read_text()
    params = set(
        re.findall(r"\[(?:string|int|switch)\]\$(\w+)", text.split("$ErrorActionPreference")[0])
    )
    assert {"Manifest", "WaitPid", "Restart"} <= params
    args = selfupdate.updater_command(Path("u.ps1"), Path("m.json"), 1, restart=True)
    used = {a[1:] for a in args if a.startswith("-") and a[1:] in params}
    assert used == {"Manifest", "WaitPid", "Restart"}


def test_portable_build_ships_the_updater():
    text = (ROOT / "scripts" / "build_portable.ps1").read_text()
    assert "'apply_update.ps1'" in text and "'fetch_binaries.ps1'" in text
    assert "'materialize_links.py'" in text
