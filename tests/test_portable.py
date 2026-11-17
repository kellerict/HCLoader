"""Phase 6 – portable version: data folder order, relative target folder, pip update in the
embedded Python, scheduled task after moving the app. Platform neutral (no Windows needed)."""

from __future__ import annotations

import importlib.util
import io
import re
import subprocess
import sys
from pathlib import Path

import pytest
from test_api import (
    env,  # noqa: F401  (fixture)
    flush,
)
from test_scheduler import FakeSchtasks

from app.core import config, maintenance, portable, scheduler
from app.core.scheduler import TaskScheduler

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def app_dir(tmp_path, monkeypatch):
    """A fake app folder (like the unpacked ZIP) that `config.app_root()` points to."""
    root = tmp_path / "HCLoader"
    (root / "python").mkdir(parents=True)
    monkeypatch.setattr(config, "app_root", lambda: root)
    return root


def make_portable(root: Path) -> None:
    (root / config.PORTABLE_MARKER).write_text("portable\n", encoding="ascii")


# --------------------------------------------------------------------------- app_home order


def test_app_home_env_override_wins_over_portable(app_dir, monkeypatch, tmp_path):
    make_portable(app_dir)
    monkeypatch.setenv("HCLOADER_HOME", str(tmp_path / "override"))
    assert config.app_home() == tmp_path / "override"


def test_app_home_portable_uses_data_next_to_app(app_dir, monkeypatch):
    monkeypatch.delenv("HCLOADER_HOME", raising=False)
    make_portable(app_dir)
    assert config.is_portable()
    assert config.app_home() == app_dir / "data"
    assert config.db_path() == app_dir / "data" / "hcloader.db"
    assert config.config_path() == app_dir / "data" / "config.yaml"
    assert config.logs_dir() == app_dir / "data" / "logs"


def test_app_home_without_marker_is_appdata(app_dir, monkeypatch, tmp_path):
    monkeypatch.delenv("HCLOADER_HOME", raising=False)
    monkeypatch.setenv("APPDATA", str(tmp_path / "Roaming"))
    monkeypatch.setattr(config.Path, "home", lambda: tmp_path / "user")
    assert not config.is_portable()
    expected = (
        tmp_path / "Roaming" / "HCLoader"
        if sys.platform == "win32"
        else tmp_path / "user" / ".config" / "HCLoader"
    )
    assert config.app_home() == expected


def test_marker_must_be_a_file(app_dir, monkeypatch):
    monkeypatch.delenv("HCLOADER_HOME", raising=False)
    (app_dir / config.PORTABLE_MARKER).mkdir()
    assert not config.is_portable()
    assert config.app_home() != app_dir / "data"


def test_repo_has_no_portable_marker():
    """The development checkout must never switch into portable mode by accident."""
    assert not (ROOT / config.PORTABLE_MARKER).exists()
    assert "/portable.txt" in (ROOT / ".gitignore").read_text(encoding="utf-8")


def test_appdata_variable_is_not_the_portable_folder(app_dir, monkeypatch, tmp_path):
    """%APPDATA% in a path means the real roaming folder, also in portable mode."""
    make_portable(app_dir)
    monkeypatch.delenv("APPDATA", raising=False)
    monkeypatch.setattr(config.Path, "home", lambda: tmp_path / "user")
    p = config.expand_path(r"%APPDATA%\x")
    assert app_dir not in p.parents


# --------------------------------------------------------------------------- relative target_dir


def test_relative_target_dir_is_relative_to_app_folder_in_portable_mode(app_dir):
    make_portable(app_dir)
    s = config.defaults()
    s.storage.target_dir = r".\Music"
    assert s.target_dir_path() == app_dir / "Music"
    assert config.expand_path(r"Musik\HC") == app_dir / "Musik" / "HC"
    assert config.expand_path(r"..\Musik") == app_dir / ".." / "Musik"


def test_relative_target_dir_unchanged_without_portable(app_dir):
    p = config.expand_path(r".\Music")
    assert not p.is_absolute()
    assert p == Path("Music")


def test_absolute_and_userprofile_paths_unchanged_in_portable_mode(app_dir, monkeypatch, tmp_path):
    make_portable(app_dir)
    monkeypatch.setenv("USERPROFILE", str(tmp_path / "me"))
    assert config.defaults().target_dir_path() == tmp_path / "me" / "Music" / "HCLoader"
    absolute = tmp_path / "Ziel"
    assert config.expand_path(str(absolute)) == absolute


# --------------------------------------------------------------------------- pip update


class FakeProc:
    def __init__(self, lines, code=0):
        self.stdout = io.StringIO("".join(f"{line}\n" for line in lines))
        self.code = code

    def wait(self, timeout=None):
        return self.code


def _embed(app_dir: Path) -> tuple[Path, Path]:
    py = app_dir / "python" / "python.exe"
    pyw = app_dir / "python" / "pythonw.exe"
    py.write_text("")
    pyw.write_text("")
    return py, pyw


def test_is_portable_python_needs_marker_and_location(app_dir, tmp_path):
    py, pyw = _embed(app_dir)
    assert not maintenance.is_portable_python(str(pyw))  # no marker yet
    make_portable(app_dir)
    assert maintenance.is_portable_python(str(pyw))
    assert maintenance.is_portable_python(str(py))
    other = tmp_path / "elsewhere" / "python.exe"
    other.parent.mkdir()
    other.write_text("")
    assert not maintenance.is_portable_python(str(other))
    nested = app_dir / "python" / "Scripts" / "python.exe"
    nested.parent.mkdir()
    nested.write_text("")
    assert not maintenance.is_portable_python(str(nested))


def test_run_update_in_embedded_python(app_dir, monkeypatch):
    """No venv (sys.prefix == sys.base_prefix), but portable marker + python\\pythonw.exe:
    pip runs with python.exe of the embedded Python and the portable flags."""
    py, pyw = _embed(app_dir)
    make_portable(app_dir)
    monkeypatch.setattr(maintenance, "in_venv", lambda: False)
    monkeypatch.setattr(sys, "executable", str(pyw))
    cmds = []
    versions = iter([{"ytdlp": "1", "plugin": "1"}, {"ytdlp": "2", "plugin": "1"}])

    def popen(cmd):
        cmds.append(cmd)
        return FakeProc(["Successfully installed yt-dlp-2"])

    lines = []
    res = maintenance.run_update(lines.append, popen=popen, versions=lambda: next(versions))
    assert res["ok"] and res["changed"] and res["ytdlp"] == "2"
    cmd = cmds[0]
    assert cmd[0] == str(py)  # console python, not pythonw
    assert cmd[1:5] == ["-m", "pip", "install", "-U"]
    for flag in maintenance.PORTABLE_PIP_FLAGS:
        assert flag in cmd
    assert cmd[-2:] == list(maintenance.PIP_SPECS)
    assert lines[0].startswith("> pip install -U --no-warn-script-location")


def test_run_update_refuses_plain_python_without_marker(app_dir, monkeypatch):
    _py, pyw = _embed(app_dir)  # python\ exists, but no portable.txt
    monkeypatch.setattr(maintenance, "in_venv", lambda: False)
    monkeypatch.setattr(sys, "executable", str(pyw))
    called = []
    res = maintenance.run_update(popen=called.append, versions=lambda: {})
    assert res["ok"] is False and "Portable" in res["error"] and "venv" in res["error"]
    assert not called


def test_run_update_other_embedded_interpreter_needs_no_probe(app_dir, monkeypatch):
    _py, pyw = _embed(app_dir)
    make_portable(app_dir)

    def no_probe(exe):
        raise AssertionError("embedded Python must not be probed for a venv")

    monkeypatch.setattr(maintenance, "probe_python", no_probe)
    cmds = []
    same = {"ytdlp": "1", "plugin": "1"}
    res = maintenance.run_update(
        popen=lambda c: cmds.append(c) or FakeProc(["ok"]),
        executable=str(pyw),
        versions=lambda: same,
    )
    assert res["ok"] and not res["changed"]
    assert "--no-build-isolation" in cmds[0]


def test_update_command_in_venv_has_no_portable_flags(tmp_path):
    py = tmp_path / "python.exe"
    py.write_text("")
    cmd = maintenance.update_command(str(py))
    assert not set(maintenance.PORTABLE_PIP_FLAGS) & set(cmd)


def test_versions_info_reports_portable(app_dir, monkeypatch, tmp_path):
    make_portable(app_dir)
    info = maintenance.versions_info(
        db_path=tmp_path / "x.db",
        db_entries=0,
        last_update_check=None,
        status={},
    )
    assert info["portable"] is True and info["app_dir"] == str(app_dir)


# --------------------------------------------------------------------------- scheduled task


class XmlSchtasks(FakeSchtasks):
    """Like the scheduler test fake, but `/Query /XML` returns the XML of the last /Create."""

    def __call__(self, args):
        args = list(args)
        if args[1] == "/Query" and "/XML" in args and self.registered and self.xml:
            self.calls.append(args)
            text = self.xml[-1].decode("utf-16")
            return subprocess.CompletedProcess(args, 0, text.encode("utf-8"), b"")
        return super().__call__(args)


def _scheduler_at(monkeypatch, root: Path, fake: XmlSchtasks) -> TaskScheduler:
    """A scheduler that sees `root` as its app folder (repo root + embedded Python there)."""
    (root / "python").mkdir(parents=True, exist_ok=True)
    (root / "scripts").mkdir(exist_ok=True)
    (root / "python" / "pythonw.exe").write_text("")
    monkeypatch.setattr(scheduler, "repo_root", lambda: root)
    return TaskScheduler(run=fake, platform="win32", executable=str(root / "python" / "python.exe"))


def test_task_at_current_location_has_no_mismatch(monkeypatch, tmp_path):
    fake = XmlSchtasks()
    sched = _scheduler_at(monkeypatch, tmp_path / "C" / "HCLoader", fake)
    sched.create("03:00")
    st = sched.query("03:00")
    assert st.registered and st.path_mismatch is False
    assert "run_watchlist.pyw" in st.task_command
    assert st.to_dict()["path_mismatch"] is False


def test_task_after_moving_the_app_reports_mismatch_and_create_fixes_it(monkeypatch, tmp_path):
    fake = XmlSchtasks()
    old_root = tmp_path / "E" / "HCLoader"
    _scheduler_at(monkeypatch, old_root, fake).create("03:00")
    new_root = tmp_path / "D" / "moved" / "HCLoader"
    sched = _scheduler_at(monkeypatch, new_root, fake)
    st = sched.query("03:00")
    assert st.registered and st.path_mismatch is True
    assert str(old_root / "python" / "pythonw.exe") in st.task_command
    assert st.next_run and "T03:00:00" in st.next_run
    # «Aufgabe neu anlegen» = create again (schtasks /F replaces the old task)
    sched.create("03:00")
    assert sched.query("03:00").path_mismatch is False


def test_path_mismatch_ignores_case_quotes_and_separators(monkeypatch, tmp_path):
    root = tmp_path / "HC"
    monkeypatch.setattr(scheduler, "repo_root", lambda: root)
    exe = root / "python" / "python.exe"
    exe.parent.mkdir(parents=True)
    (root / "python" / "pythonw.exe").write_text("")
    xml = (
        f"<Task><Exec><Command>{str(root / 'python' / 'pythonw.exe').upper()}</Command>"
        f'<Arguments>"{root}/./scripts/run_watchlist.pyw"</Arguments></Exec></Task>'
    )
    mismatch, shown = scheduler.path_mismatch(xml, str(exe))
    assert mismatch is False and "run_watchlist.pyw" in shown


def test_path_mismatch_unreadable_xml_claims_nothing():
    assert scheduler.path_mismatch("") == (False, None)
    assert scheduler.path_mismatch("<Task><StartBoundary>2026</StartBoundary></Task>") == (
        False,
        None,
    )


def test_path_mismatch_unescapes_xml(monkeypatch, tmp_path):
    root = tmp_path / "R&B"
    monkeypatch.setattr(scheduler, "repo_root", lambda: root)
    exe = root / "python" / "python.exe"
    xml = scheduler.task_xml("03:00", str(exe))
    assert "R&amp;B" in xml
    assert scheduler.path_mismatch(xml, str(exe)) == (
        False,
        f'"{scheduler.pythonw_path(str(exe))}" "{root / "scripts" / "run_watchlist.pyw"}"',
    )


# --------------------------------------------------------------------------- API


def _move_registered_task(env, monkeypatch, tmp_path):  # noqa: F811
    """Register the task from an old folder, then let the app live in a new one."""
    fake = XmlSchtasks()
    env.schtasks = fake
    old_root = tmp_path / "E" / "HCLoader"
    monkeypatch.setattr(scheduler, "repo_root", lambda: old_root)
    TaskScheduler(run=fake, platform="win32").create("03:00")
    monkeypatch.setattr(scheduler, "repo_root", lambda: tmp_path / "D" / "HCLoader")
    return fake


def test_api_task_status_reports_path_mismatch(env, monkeypatch, tmp_path):  # noqa: F811
    _move_registered_task(env, monkeypatch, tmp_path)
    a = env.make()
    st = a.get_task_status()
    assert st["registered"] is True and st["path_mismatch"] is True
    assert "E" in st["task_command"]
    r = a.create_task(st["time"])
    assert r["ok"] and r["path_mismatch"] is False
    assert a.get_task_status()["path_mismatch"] is False


def test_api_startup_warns_once_when_app_was_moved(env, monkeypatch, tmp_path):  # noqa: F811
    _move_registered_task(env, monkeypatch, tmp_path)
    a = env.make()
    a._persist(task_scheduler_enabled=True, task_time="03:00")
    a._on_loaded()
    a._worker.submit("sync", lambda: None).result(5)
    flush(a)
    toasts = [t["msg"] for t in env.window.events_of("toast")]
    assert any("verschoben" in t for t in toasts)
    n = len(toasts)
    a._on_loaded()  # page reload: no second check
    a._worker.submit("sync2", lambda: None).result(5)
    flush(a)
    assert len(env.window.events_of("toast")) == n


def test_api_startup_no_task_check_when_disabled(env):  # noqa: F811
    a = env.make()
    a._on_loaded()
    a._worker.submit("sync", lambda: None).result(5)
    assert not [c for c in env.schtasks.calls if c[1] == "/Query"]


def test_ui_handles_path_mismatch():
    settings_js = (ROOT / "ui" / "js" / "views" / "settings.js").read_text(encoding="utf-8")
    i18n = (ROOT / "ui" / "js" / "i18n.js").read_text(encoding="utf-8")
    assert "s.path_mismatch" in settings_js and "set.task.recreate" in settings_js
    assert re.search(r"moved: 'App wurde verschoben – Aufgabe neu anlegen'", i18n)


# --------------------------------------------------------------------------- Mark of the Web


def test_unblock_removes_zone_identifier_of_dotnet_dlls(app_dir):
    site = app_dir / "python" / "Lib" / "site-packages"
    dlls = [
        site / "pythonnet" / "runtime" / "Python.Runtime.dll",
        site / "clr_loader" / "ffi" / "dlls" / "amd64" / "ClrLoader.dll",
        site / "webview" / "lib" / "Microsoft.Web.WebView2.Core.dll",
    ]
    for d in dlls:
        d.parent.mkdir(parents=True, exist_ok=True)
        d.write_bytes(b"MZ")
    (site / "yt_dlp").mkdir()
    (site / "yt_dlp" / "other.dll").write_bytes(b"MZ")  # not a .NET package: untouched
    blocked = {str(dlls[0]) + portable.ZONE_STREAM, str(dlls[2]) + portable.ZONE_STREAM}
    removed = []

    def remove(path):
        if path not in blocked:
            raise FileNotFoundError(path)
        removed.append(path)

    assert portable.unblock_dotnet_dlls(remove=remove) == 2
    assert sorted(removed) == sorted(blocked)


def test_prepare_gui_start_only_portable_windows(app_dir, monkeypatch):
    calls = []
    monkeypatch.setattr(portable, "unblock_dotnet_dlls", lambda: calls.append(1) or 3)
    assert portable.prepare_gui_start(platform="win32") == 0  # not portable
    make_portable(app_dir)
    assert portable.prepare_gui_start(platform="linux") == 0
    assert portable.prepare_gui_start(platform="win32") == 3
    assert calls == [1]

    def boom():
        raise RuntimeError("x")

    monkeypatch.setattr(portable, "unblock_dotnet_dlls", boom)
    assert portable.prepare_gui_start(platform="win32") == 0  # never blocks the start


# --------------------------------------------------------------------------- build helpers


def _load_script(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.mark.skipif(sys.platform == "win32", reason="symlinks need privileges on Windows")
def test_materialize_links_replaces_links_with_copies(tmp_path):
    ml = _load_script("materialize_links")
    nm = tmp_path / "bin" / "server" / "node_modules"
    real_a = nm / ".deno" / "a@1.0.0" / "node_modules" / "a"
    real_b = nm / ".deno" / "b@2.0.0" / "node_modules" / "b"
    for d in (real_a, real_b):
        (d / "lib").mkdir(parents=True)
        (d / "index.js").write_text(d.name)
        (d / "lib" / "x.js").write_text("x")
    (nm / ".deno" / "a@1.0.0" / "node_modules" / "b").symlink_to(real_b)  # dependency link
    (nm / "a").symlink_to(real_a)  # top-level links (absolute targets)
    (nm / "b").symlink_to(real_b)
    (nm / ".bin").mkdir()
    (nm / ".bin" / "tool").symlink_to(real_a / "index.js")
    assert ml.materialize(tmp_path / "bin") == 4
    for p in (tmp_path / "bin").rglob("*"):
        assert not p.is_symlink(), p
    # moving the folder (old place gone) keeps everything readable
    moved = tmp_path / "moved"
    (tmp_path / "bin").rename(moved)
    mnm = moved / "server" / "node_modules"
    assert (mnm / "a" / "index.js").read_text() == "a"
    assert (mnm / ".deno" / "a@1.0.0" / "node_modules" / "b" / "lib" / "x.js").read_text() == "x"
    assert (mnm / ".bin" / "tool").read_text() == "a"


@pytest.mark.skipif(sys.platform == "win32", reason="symlinks need privileges on Windows")
def test_materialize_links_rejects_dangling_and_parent_links(tmp_path):
    ml = _load_script("materialize_links")
    d = tmp_path / "x"
    d.mkdir()
    (d / "loop").symlink_to(tmp_path)
    with pytest.raises(RuntimeError, match="Elternordner"):
        ml.materialize(d)
    (d / "loop").unlink()
    (d / "gone").symlink_to(tmp_path / "missing")
    with pytest.raises(RuntimeError, match="ohne Ziel"):
        ml.materialize(d)
    assert ml.main([]) == 2


def test_collect_licenses_copies_files_and_lists_packages(tmp_path):
    cl = _load_script("collect_licenses")
    site = tmp_path / "site-packages"
    for name, version, meta, files in [
        ("demo_pkg", "1.2", "License-Expression: MIT\n", {"LICENSE": "MIT text"}),
        (
            "other",
            "0.1",
            "Classifier: License :: OSI Approved :: BSD License\n",
            {"licenses/COPYING.txt": "bsd"},
        ),
        ("bare", "3", "", {}),
    ]:
        info = site / f"{name}-{version}.dist-info"
        info.mkdir(parents=True)
        (info / "METADATA").write_text(
            f"Metadata-Version: 2.4\nName: {name}\nVersion: {version}\n{meta}", encoding="utf-8"
        )
        record = [f"{name}-{version}.dist-info/METADATA,,"]
        for rel, text in files.items():
            (info / rel).parent.mkdir(parents=True, exist_ok=True)
            (info / rel).write_text(text)
            record.append(f"{name}-{version}.dist-info/{rel},,")
        (info / "RECORD").write_text("\n".join(record) + "\n")
    header = tmp_path / "header.txt"
    header.write_text("KOPF\n")
    out = tmp_path / "THIRD_PARTY_LICENSES.txt"
    lic = tmp_path / "licenses"
    assert cl.main([str(site), str(lic), str(header), str(out)]) == 0
    text = out.read_text(encoding="utf-8")
    assert text.startswith("KOPF")
    assert "demo_pkg 1.2: MIT" in text and "other 0.1: BSD License" in text
    assert "bare 3: unbekannt" in text and "keine Lizenzdatei" in text
    assert (lic / "python-packages" / "demo_pkg-1.2" / "LICENSE").read_text() == "MIT text"
    assert (lic / "python-packages" / "other-0.1" / "COPYING.txt").read_text() == "bsd"


# --------------------------------------------------------------------------- scripts / CI (static)


def _text(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def test_portable_scripts_are_ascii_and_ps51_safe():
    for rel in (
        "scripts/build_portable.ps1",
        "scripts/fetch_binaries.ps1",
        "scripts/portable/HCLoader.vbs",
        "scripts/portable/HCLoader-Konsole.cmd",
        "scripts/portable/Verknuepfung-erstellen.cmd",
        "scripts/portable/portable.txt",
        "scripts/portable/THIRD_PARTY_LICENSES.header.txt",
    ):
        raw = (ROOT / rel).read_bytes()
        raw.decode("ascii")  # PS 5.1 reads BOM-less files as ANSI; WSH/cmd as OEM/ANSI
    ps = _text("scripts/build_portable.ps1")
    assert "&&" not in ps and "||" not in ps  # PowerShell 7 only
    assert not re.search(r'"[^"\n]*\$[A-Za-z]+:[ \\]', ps)  # "$v: ..." = scope syntax error
    assert "'import site'" in ps and "'..'" in ps and "'Lib\\site-packages'" in ps
    assert "--no-build-isolation" in ps and "setuptools" in ps
    assert "materialize_links.py" in ps and "collect_licenses.py" in ps
    for starter in ("HCLoader.vbs", "HCLoader-Konsole.cmd", "Verknuepfung-erstellen.cmd"):
        assert starter in ps and (ROOT / "scripts" / "portable" / starter).is_file()
    vbs = _text("scripts/portable/HCLoader.vbs")
    assert "python\\pythonw.exe" in vbs and "-m app.main" in vbs and "CurrentDirectory" in vbs
    cmd = _text("scripts/portable/HCLoader-Konsole.cmd")
    assert 'cd /d "%~dp0"' in cmd and "python\\python.exe" in cmd and "pause" in cmd


def test_portable_workflow_contract():
    wf = _text(".github/workflows/portable.yml")
    assert "windows-latest" in wf and "timeout-minutes" in wf
    assert "workflow_dispatch" in wf and '"v*"' in wf
    assert "build_portable.ps1 -Zip" in wf
    assert "--timeout=120 --timeout-method=thread" in wf
    assert "actions/upload-artifact@v4" in wf
    assert "generate_once.ts" in wf and "--version" in wf
    assert "-m app.main --help" in wf
    # release upload (self-update, docs/RELEASING.md, approved by the user): only in the job
    # `release`, only for tags, and only that job may write
    from ruamel.yaml import YAML

    data = YAML(typ="safe").load(wf)
    assert data["permissions"] == {"contents": "read"}
    assert "permissions" not in data["jobs"]["portable"]
    rel = data["jobs"]["release"]
    assert rel["if"] == "startsWith(github.ref, 'refs/tags/v')" and rel["needs"] == "portable"
    assert rel["permissions"] == {"contents": "write"}
    assert wf.count("contents: write") == 1
    portable_job = wf[wf.index("  portable:") : wf.index("  release:")]
    assert "gh release" not in portable_job and "action-gh-release" not in portable_job
    steps = "\n".join(s.get("run", "") for s in rel["steps"])
    assert "gh release upload" in steps and "SHA256SUMS" in steps and "git archive" in steps
    assert "-source.zip" in steps and "__version__" in steps


# --------------------------------------------------------------------------- hoisted node_modules
# bgutil provider (docs/decisions.md "bgutil-Provider: hoisted node_modules"): real folders in
# npm's hoisted layout, checked against deno.lock with Node's walk-up algorithm.

# lock like bgutil 2.0.2: proxy-agent needs lru-cache 7, everything else lru-cache 11
_LOCK = {
    "version": "5",
    "specifiers": {
        "npm:proxy-agent@^8.0.2": "8.0.2",
        "npm:jsdom@^29.1.1": "29.1.1",
        "npm:canvas@^3.2.3": "3.2.3",
        "npm:@eslint/js@^10.0.1": "10.0.1_eslint@10.11.0",
        "npm:eslint@^10.11.0": "10.11.0",
    },
    "npm": {
        "proxy-agent@8.0.2": {"dependencies": ["agent-base", "lru-cache@7.18.3"]},
        "agent-base@9.0.0": {},
        "lru-cache@7.18.3": {},
        "lru-cache@11.5.3": {},
        "jsdom@29.1.1": {
            "dependencies": ["lru-cache@11.5.3", "@asamuzakjp/css-color"],
            "optionalDependencies": ["fsevents"],
        },
        "@asamuzakjp/css-color@5.1.11": {"dependencies": ["lru-cache@11.5.3"]},
        "canvas@3.2.3": {},
        "fsevents@2.3.3": {"os": ["darwin"]},
        "@eslint/js@10.0.1_eslint@10.11.0": {
            "dependencies": ["eslint"],
            "optionalPeers": ["eslint"],
        },
        "eslint@10.11.0": {},
    },
    "workspace": {
        "packageJson": {
            "dependencies": [
                "npm:proxy-agent@^8.0.2",
                "npm:jsdom@^29.1.1",
                "npm:canvas@^3.2.3",
                "npm:@eslint/js@^10.0.1",
                "npm:eslint@^10.11.0",
            ]
        }
    },
}

# hoisted: the most used lru-cache (11) on top, 7 nested under proxy-agent
_HOISTED = {
    "proxy-agent": "8.0.2",
    "proxy-agent/node_modules/lru-cache": "7.18.3",
    "agent-base": "9.0.0",
    "lru-cache": "11.5.3",
    "jsdom": "29.1.1",
    "@asamuzakjp/css-color": "5.1.11",
    "canvas": "3.2.3",
    "@eslint/js": "10.0.1",
    "eslint": "10.11.0",
}


def _pkg(folder: Path, name: str, version: str) -> None:
    import json

    folder.mkdir(parents=True, exist_ok=True)
    (folder / "package.json").write_text(json.dumps({"name": name, "version": version}))
    (folder / "index.js").write_text(f"// {name}@{version}")


def _server(tmp_path, layout=_HOISTED, native=True):
    import json

    server = tmp_path / "bin" / "bgutil-pot-provider" / "server"
    nm = server / "node_modules"
    for rel, version in layout.items():
        _pkg(nm / rel, rel.rsplit("node_modules/", 1)[-1], version)
    if native and (nm / "canvas").is_dir():
        (nm / "canvas" / "build" / "Release").mkdir(parents=True)
        (nm / "canvas" / "build" / "Release" / "canvas.node").write_bytes(b"MZ")
    (server / "deno.lock").write_text(json.dumps(_LOCK))
    (server / "deno.json").write_text('{\n  "allowScripts": ["npm:canvas@3.2.3"]\n}\n')
    return server


def test_hoisted_check_accepts_layout_with_nested_version_conflict_after_move(tmp_path):
    hn = _load_script("hoisted_node_modules")
    server = _server(tmp_path)
    problems, count = hn.check(server, ("canvas",))
    assert problems == [] and count == len(_HOISTED)
    # resolution like Node: proxy-agent gets its nested 7.x, jsdom the hoisted 11.x
    nm = server / "node_modules"
    assert hn.resolve("lru-cache", nm / "proxy-agent", server) == nm / "proxy-agent" / (
        "node_modules/lru-cache"
    )
    assert hn.resolve("lru-cache", nm / "jsdom", server) == nm / "lru-cache"
    assert hn.resolve("lru-cache", nm / "@asamuzakjp" / "css-color", server) == nm / "lru-cache"
    # move the whole folder (old place gone): nothing points back, still fine
    moved = tmp_path / "elsewhere" / "HCLoader-bin"
    moved.parent.mkdir()
    (tmp_path / "bin").rename(moved)
    assert hn.check(moved / "bgutil-pot-provider" / "server", ("canvas",))[0] == []
    assert hn.main(["check", str(moved / "bgutil-pot-provider" / "server")]) == 0


def test_hoisted_check_rejects_wrongly_hoisted_conflict(tmp_path):
    hn = _load_script("hoisted_node_modules")
    layout = {k: v for k, v in _HOISTED.items() if "/node_modules/" not in k}
    problems, _ = hn.check(_server(tmp_path, layout), ())
    assert problems == ["node_modules/proxy-agent: lru-cache 11.5.3 statt 7.18.3"]


def test_hoisted_check_rejects_materialized_isolated_layout(tmp_path):
    """The CI bug: deno's isolated layout with the top-level links replaced by copies. The copy
    of proxy-agent sits outside .deno, its sibling dependencies are no longer reachable."""
    hn = _load_script("hoisted_node_modules")
    isolated = {}
    for rel, version in _HOISTED.items():
        if "/node_modules/" in rel:
            continue
        isolated[rel] = version  # materialized top-level copy
        key = f"{rel.replace('/', '+')}@{version}"
        isolated[f".deno/{key}/node_modules/{rel}"] = version
    isolated[".deno/proxy-agent@8.0.2/node_modules/lru-cache"] = "7.18.3"  # sibling copy
    isolated[".deno/proxy-agent@8.0.2/node_modules/agent-base"] = "9.0.0"
    isolated.pop("lru-cache")  # not a direct dependency -> not on top
    isolated.pop("agent-base")
    isolated.pop("@asamuzakjp/css-color")
    problems, _ = hn.check(_server(tmp_path, isolated), ())
    assert "node_modules/proxy-agent: findet lru-cache nicht" in problems
    assert "node_modules/proxy-agent: findet agent-base nicht" in problems
    assert "node_modules/jsdom: findet @asamuzakjp/css-color nicht" in problems
    assert hn.main(["check", str(tmp_path / "bin" / "bgutil-pot-provider" / "server")]) == 1


def test_hoisted_check_root_deps_optional_and_native(tmp_path):
    hn = _load_script("hoisted_node_modules")
    layout = dict(_HOISTED)
    layout["eslint"] = "9.0.0"  # wrong direct version; also wrong for @eslint/js (optional peer)
    layout.pop("jsdom")
    problems, _ = hn.check(_server(tmp_path, layout, native=False), ("canvas",))
    assert problems == [
        "eslint: Version 9.0.0 statt 10.11.0",
        "Direkte Abhaengigkeit fehlt: jsdom",
        "node_modules/@eslint/js: eslint 9.0.0 statt 10.11.0",
        "Native Erweiterung fehlt: canvas/build/Release/*.node",
    ]
    # fsevents (optional, other OS) is not installed: no problem
    assert "fsevents" not in " ".join(problems)


@pytest.mark.skipif(sys.platform == "win32", reason="symlinks need privileges on Windows")
def test_hoisted_check_reports_links(tmp_path):
    hn = _load_script("hoisted_node_modules")
    server = _server(tmp_path)
    nm = server / "node_modules"
    (nm / ".bin").mkdir()
    (nm / ".bin" / "tool").symlink_to(nm / "jsdom" / "index.js")
    problems, _ = hn.check(server, ("canvas",))
    assert problems == [f"Link (nicht verschiebbar): {nm / '.bin' / 'tool'}"]


def test_hoisted_configure_sets_manual_and_hoisted(tmp_path):
    import json

    hn = _load_script("hoisted_node_modules")
    server = _server(tmp_path)
    assert hn.configure(server) is True
    data = json.loads((server / "deno.json").read_text())
    assert data == {
        "allowScripts": ["npm:canvas@3.2.3"],
        "nodeModulesDir": "manual",
        "nodeModulesLinker": "hoisted",
    }
    assert hn.configure(server) is False  # idempotent
    (server / "deno.json").unlink()
    assert hn.main(["configure", str(server)]) == 0
    assert json.loads((server / "deno.json").read_text())["nodeModulesLinker"] == "hoisted"
    assert hn.main(["check", str(tmp_path / "missing")]) == 2
    assert hn.main([]) == 2


def test_hoisted_lock_keys():
    hn = _load_script("hoisted_node_modules")
    assert hn.split_key("@scope/name@1.2.3_peer@4.0.0") == ("@scope/name", "1.2.3")
    assert hn.split_key("lru-cache@7.18.3") == ("lru-cache", "7.18.3")
    assert hn.split_key("debug") == ("debug", None)
    assert hn.split_key("@types/node") == ("@types/node", None)
    lock = hn.Lock(_LOCK)
    assert lock.roots["@eslint/js"] == {"10.0.1"}
    assert lock.deps[("jsdom", "29.1.1")]["fsevents"] == ({"2.3.3"}, True)
    assert lock.deps[("@eslint/js", "10.0.1")]["eslint"] == ({"10.11.0"}, True)
    assert lock.deps[("proxy-agent", "8.0.2")]["lru-cache"] == ({"7.18.3"}, False)


def test_fetch_binaries_installs_provider_hoisted_and_checks_it():
    ps = _text("scripts/fetch_binaries.ps1")
    assert "'--node-modules-dir=manual', '--node-modules-linker=hoisted'" in ps
    assert "$DenoMinVersion = [version]'2.8.0'" in ps  # hoisted linker: Deno 2.8+
    assert "'configure', $ServerDir" in ps and "'check', $ServerDir, '--native', 'canvas'" in ps
    # old installs (marker = plain plugin version, isolated layout) are rebuilt
    assert '$Marker = "$Version $ProviderLayout"' in ps and "($installed -eq $Marker)" in ps
    build = _text("scripts/build_portable.ps1")
    assert "'hoisted_node_modules.py'" in build
    smoke = _text(".github/workflows/portable.yml")
    assert "scripts\\hoisted_node_modules.py') check $server --native canvas" in smoke
