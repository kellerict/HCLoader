# ruff: noqa: F811  (the `env` fixture comes from test_api via test_selfupdate)
"""Installer (installer/HCLoader.iss, Inno Setup 6): an installed copy is the portable build without
`portable.txt` - embedded Python in `<App>/python/`, data in %APPDATA%\\HCLoader. Checks the install
kind detection (self-update, yt-dlp update button) and the installer/workflow statically (no
Windows, no Inno Setup here; the real install/uninstall runs in portable.yml "Smoke (f)")."""

from __future__ import annotations

import io
import re
import sys
from pathlib import Path

import pytest
from test_selfupdate import LATEST, REPO, FakeGitHub, make_updater, release, source_zip

from app import main as app_main
from app.core import config, maintenance, scheduler, selfupdate
from app.core.selfupdate import Runtime

ROOT = Path(__file__).resolve().parents[1]
ISS = ROOT / "installer" / "HCLoader.iss"
WORKFLOW = ROOT / ".github" / "workflows" / "portable.yml"


@pytest.fixture
def app_dir(tmp_path, monkeypatch):
    """A fake app folder that `config.app_root()` points to (no marker, no venv)."""
    root = tmp_path / "Programs" / "HCLoader"
    (root / "python").mkdir(parents=True)
    monkeypatch.setattr(config, "app_root", lambda: root)
    monkeypatch.setattr(maintenance, "in_venv", lambda: False)
    return root


def _embed(root: Path, *, pth: bool = True) -> tuple[Path, Path]:
    """Embedded Python like build_portable.ps1 leaves it (`python312._pth` replaces sys.path)."""
    py = root / "python" / "python.exe"
    pyw = root / "python" / "pythonw.exe"
    py.write_text("")
    pyw.write_text("")
    if pth:
        (root / "python" / "python312._pth").write_text("python312.zip\n.\n..\nimport site\n")
    return py, pyw


class FakeProc:
    def __init__(self, lines, code=0):
        self.stdout = io.StringIO("".join(f"{line}\n" for line in lines))
        self.code = code

    def wait(self, timeout=None):
        return self.code


# --------------------------------------------------------------------------- detection


def test_installed_copy_is_embedded_but_not_portable(app_dir):
    py, pyw = _embed(app_dir)
    for exe in (py, pyw):
        assert maintenance.is_embedded_python(str(exe))
        assert maintenance.is_installed_python(str(exe))
        assert not maintenance.is_portable_python(str(exe))
    assert selfupdate.is_installed_copy(app_dir)
    assert not config.is_portable()


def test_installed_copy_data_goes_to_appdata(app_dir, monkeypatch, tmp_path):
    _embed(app_dir)
    monkeypatch.delenv("HCLOADER_HOME", raising=False)
    monkeypatch.setenv("APPDATA", str(tmp_path / "Roaming"))
    monkeypatch.setattr(config.sys, "platform", "win32")
    assert config.app_home() == tmp_path / "Roaming" / "HCLoader"
    assert config.db_path() == tmp_path / "Roaming" / "HCLoader" / "hcloader.db"


def test_embedded_needs_pth_and_location(app_dir, tmp_path):
    _py, pyw = _embed(app_dir, pth=False)
    assert not maintenance.is_embedded_python(str(pyw))  # a plain python\ folder is not enough
    assert not selfupdate.is_installed_copy(app_dir)
    (app_dir / "python" / "python312._pth").write_text("..\n")
    assert maintenance.is_embedded_python(str(pyw))
    other = tmp_path / "elsewhere" / "python.exe"
    other.parent.mkdir()
    other.write_text("")
    assert not maintenance.is_embedded_python(str(other))
    nested = app_dir / "python" / "Scripts" / "python.exe"
    nested.parent.mkdir()
    nested.write_text("")
    assert not maintenance.is_embedded_python(str(nested))


def test_portable_marker_wins_over_installed(app_dir):
    _py, pyw = _embed(app_dir)
    (app_dir / config.PORTABLE_MARKER).write_text("portable\n")
    assert maintenance.is_portable_python(str(pyw))
    assert maintenance.is_embedded_python(str(pyw))
    assert not maintenance.is_installed_python(str(pyw))
    assert not selfupdate.is_installed_copy(app_dir)
    assert selfupdate.detect_runtime(app_dir, str(pyw)).mode == "portable"


def test_git_checkout_is_never_an_installed_copy(app_dir):
    _embed(app_dir)
    (app_dir / ".git").mkdir()
    assert not selfupdate.is_installed_copy(app_dir)


@pytest.mark.parametrize("which", ["python.exe", "pythonw.exe"])
def test_detect_runtime_installed(app_dir, which):
    _embed(app_dir)
    rt = selfupdate.detect_runtime(app_dir, str(app_dir / "python" / which))
    assert rt.mode == "installed"
    assert rt.python == str(app_dir / "python" / "python.exe")
    assert rt.pythonw == str(app_dir / "python" / "pythonw.exe")
    assert rt.site_packages == str(app_dir / "python" / "Lib" / "site-packages")
    args = selfupdate.pip_args(rt, app_dir)
    for flag in maintenance.PORTABLE_PIP_FLAGS:
        assert flag in args
    assert args[-2:] == ["-r", str(app_dir / "requirements.txt")]


def test_detect_runtime_without_pth_stays_other(app_dir):
    _py, pyw = _embed(app_dir, pth=False)
    assert selfupdate.detect_runtime(app_dir, str(pyw)).mode == "other"


def test_yt_dlp_update_runs_in_installed_python(app_dir, monkeypatch):
    """The update button: no venv, no marker, but HCLoader's own embedded Python -> pip with the
    portable flags (instead of «weder venv noch Portable»)."""
    py, pyw = _embed(app_dir)
    monkeypatch.setattr(sys, "executable", str(pyw))
    cmds = []
    versions = iter([{"ytdlp": "1", "plugin": "1"}, {"ytdlp": "2", "plugin": "1"}])

    def popen(cmd):
        cmds.append(cmd)
        return FakeProc(["Successfully installed yt-dlp-2"])

    res = maintenance.run_update(popen=popen, versions=lambda: next(versions))
    assert res["ok"] and res["changed"]
    assert cmds[0][0] == str(py)
    for flag in maintenance.PORTABLE_PIP_FLAGS:
        assert flag in cmds[0]
    assert maintenance.update_command(str(pyw))[0] == str(py)


# --------------------------------------------------------------------------- staging (self-update)


@pytest.fixture
def installed_root(tmp_path):
    """Like test_selfupdate's `root`, but an installed copy: python\\python312._pth, no data\\ in
    the app folder (data in %APPDATA%), no portable.txt."""
    r = tmp_path / "Programs" / "HCLoader"
    (r / "app" / "core").mkdir(parents=True)
    (r / "app" / "__init__.py").write_text('__version__ = "0.1.0"\n')
    (r / "app" / "main.py").write_text("print('old')\n")
    (r / "ui").mkdir()
    (r / "ui" / "index.html").write_text("<html>old</html>")
    (r / "scripts").mkdir()
    (r / "scripts" / "fetch_binaries.ps1").write_text("fetch v1")
    (r / "scripts" / "apply_update.ps1").write_text("# updater\n")
    (r / "requirements.txt").write_text("yt-dlp\nmutagen\n")
    (r / "python").mkdir()
    (r / "python" / "python312._pth").write_text("..\n")
    (r / "data").mkdir()  # make_updater keeps update/ and logs here; stands in for %APPDATA%
    return r


def _installed_runtime(root: Path) -> Runtime:
    py = root / "python"
    return Runtime(
        "installed",
        str(py / "python.exe"),
        str(py / "pythonw.exe"),
        str(py / "Lib" / "site-packages"),
    )


def test_installed_staging_like_portable_without_marker(installed_root):
    zurl = f"https://codeload.github.com/{REPO}/zip/refs/tags/v0.2.0"
    gh = FakeGitHub({LATEST: release(), zurl: source_zip(requirements="yt-dlp\nmutagen\nnew\n")})
    rt = _installed_runtime(installed_root)
    up = make_updater(installed_root, gh, runtime=lambda: rt)
    up.check()
    assert up.download()["ok"]
    m = up._s.manifest
    assert m["mode"] == "installed"
    assert "HCLoader.cmd" in m["items"] and "portable.txt" not in m["items"]
    assert "python" not in m["items"] and "python" in m["protected"]
    assert m["requirements_changed"] is True  # allowed (mode "other" would refuse)
    assert "--no-build-isolation" in m["pip_args"] and m["materialize_links"] is True
    assert m["python"].endswith("python.exe") and m["pythonw"].endswith("pythonw.exe")
    st = up.status()
    assert st["installed"] is True and st["portable"] is False and st["blocked"] is None


def test_installed_newer_python_asks_for_the_new_setup(installed_root):
    zurl = f"https://codeload.github.com/{REPO}/zip/refs/tags/v0.2.0"
    zbytes = source_zip(extra={"pyproject.toml": 'requires-python = ">=3.99"\n'})
    rt = _installed_runtime(installed_root)
    up = make_updater(
        installed_root, FakeGitHub({LATEST: release(), zurl: zbytes}), runtime=lambda: rt
    )
    up.check()
    res = up.download()
    assert res["ok"] is False
    assert "HCLoader-Setup-0.2.0.exe" in up.status()["error"]


def test_venv_root_is_not_installed(tmp_path):
    r = tmp_path / "HCLoader"
    (r / ".venv").mkdir(parents=True)
    assert not selfupdate.is_installed_copy(r)


# --------------------------------------------------------------------------- installer (static)


def _iss() -> str:
    return ISS.read_text(encoding="ascii")  # ISCC reads BOM-less files as ANSI: ASCII only


def _section(text: str, name: str) -> str:
    m = re.search(rf"^\[{re.escape(name)}\]\s*$(.*?)(?=^\[[A-Za-z]+\]\s*$|\Z)", text, re.M | re.S)
    assert m, name
    return m.group(1)


def test_iss_setup_contract():
    text = _iss()
    setup = _section(text, "Setup")
    assert re.search(
        r"^AppId=\{\{[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}\}$", setup, re.M
    )
    assert "AppId={{363DD978-CFF7-4D2A-B9B1-F9D6073903A4}" in setup  # never change it
    assert re.search(r"^PrivilegesRequired=lowest$", setup, re.M)
    assert "PrivilegesRequiredOverridesAllowed" not in setup
    assert re.search(r"^DefaultDirName=\{localappdata\}\\Programs\\\{#AppName\}$", setup, re.M)
    assert re.search(r"^AppVersion=\{#AppVersion\}$", setup, re.M)
    assert re.search(r"^OutputBaseFilename=HCLoader-Setup-\{#AppVersion\}$", setup, re.M)
    assert re.search(r"^CloseApplications=yes$", setup, re.M)
    assert "#error" in text and "#ifndef AppVersion" in text
    icon = re.search(r"^SetupIconFile=(.+)$", setup, re.M).group(1).replace("\\", "/")
    assert (ISS.parent / icon).resolve() == (ROOT / "ui" / "img" / "hcloader.ico").resolve()
    assert (ROOT / "ui" / "img" / "hcloader.ico").is_file()
    langs = _section(text, "Languages")
    assert "compiler:Default.isl" in langs and "compiler:Languages\\German.isl" in langs


def test_iss_names_match_the_app():
    text = _iss()
    assert f'#define AppUserModelID "{app_main.APP_USER_MODEL_ID}"' in text
    assert f'#define TaskName "{scheduler.TASK_NAME}"' in text
    assert f'#define AppName "{config.APP_NAME}"' in text
    assert f"/{config.DEFAULT_UPDATE_REPO}" in text


def test_iss_files_drop_marker_and_data():
    files = _section(_iss(), "Files")
    lines = [ln for ln in files.splitlines() if ln.startswith("Source:")]
    assert len(lines) == 1
    line = lines[0]
    assert 'Source: "{#SourceDir}\\*"' in line and 'DestDir: "{app}"' in line
    excludes = re.search(r'Excludes: "([^"]+)"', line).group(1).split(",")
    assert "\\portable.txt" in excludes and "\\data" in excludes and "\\data\\*" in excludes
    assert "recursesubdirs" in line and "createallsubdirs" in line


def test_iss_shortcuts_start_embedded_pythonw():
    icons = [ln for ln in _section(_iss(), "Icons").splitlines() if ln.startswith("Name:")]
    assert len(icons) == 2
    for ln in icons:
        assert 'Filename: "{app}\\python\\pythonw.exe"' in ln
        assert 'Parameters: "-X utf8 -m app.main"' in ln
        assert 'WorkingDir: "{app}"' in ln
        assert 'IconFilename: "{app}\\ui\\img\\hcloader.ico"' in ln
        assert 'AppUserModelID: "{#AppUserModelID}"' in ln
    assert icons[0].startswith('Name: "{autoprograms}\\')
    assert icons[1].startswith('Name: "{autodesktop}\\') and "Tasks: desktopicon" in icons[1]
    tasks = _section(_iss(), "Tasks")
    assert 'Name: "desktopicon"' in tasks and "Flags: unchecked" in tasks
    run = _section(_iss(), "Run")
    assert "postinstall" in run and "skipifsilent" in run and "nowait" in run


def test_iss_uninstall_removes_app_folder_but_never_user_data():
    text = _iss()
    uninst = _section(text, "UninstallDelete")
    assert 'Type: filesandordirs; Name: "{app}"' in uninst
    install_delete = _section(text, "InstallDelete")
    for folder in ("python", "app", "ui", "scripts", "bin", "licenses", "_previous", "_previous-*"):
        assert f'Name: "{{app}}\\{folder}"' in install_delete
    # never the data folder: every delete entry lies inside {app}
    for sec in (uninst, install_delete):
        names = re.findall(r'^Type: \w+; Name: "([^"]+)"', sec, re.M)
        assert names and all(n == "{app}" or n.startswith("{app}\\") for n in names), names
    code = _section(text, "Code")
    assert "{userappdata}" not in code and "DelTree" not in code
    # the scheduled task is only removed when it starts this copy
    assert "Get-ScheduledTask -TaskName ''{#TaskName}''" in code
    assert "Unregister-ScheduledTask" in code and "WorkingDirectory" in code
    assert "CurUninstallStepChanged" in code and "usUninstall" in code
    # target folder checks (MAX_PATH, portable copy, foreign files) for wizard and silent mode
    assert "MaxRelPath = {#MaxRelPath};" in code and "MaxPathLen = 259;" in code
    assert "PrepareToInstall" in code and "wpSelectDir" in code
    assert "portable.txt" in code


def test_iss_code_has_no_brace_comments():
    """Pascal brace comments end at the first `}` - `{app}` inside one breaks the compile."""
    code = _section(_iss(), "Code")
    for line in code.splitlines():
        stripped = line.strip()
        assert not stripped.startswith("{ "), line
        assert not stripped.startswith("(*"), line


# --------------------------------------------------------------------------- workflow (static)


def test_workflow_builds_smokes_and_releases_the_installer():
    wf = WORKFLOW.read_text(encoding="utf-8")
    from ruamel.yaml import YAML

    data = YAML(typ="safe").load(wf)
    steps = data["jobs"]["portable"]["steps"]
    names = [s.get("name", "") for s in steps]
    compile_i = next(i for i, n in enumerate(names) if n.startswith("Installer: compile"))
    assert names.index("Build (dist\\HCLoader + ZIP)") < compile_i
    compile_step = steps[compile_i]
    assert compile_step["id"] == "installer"
    run = compile_step["run"]
    assert "Expand-Archive" in run and "steps.build.outputs.zip" in run
    assert "portable_tools.py') longest" in run and "-gt 259" in run
    assert "Inno Setup 6\\ISCC.exe" in run and "choco install innosetup" in run
    assert (
        "/DMaxRelPath=$rel" in run
        and "/DAppVersion=$ver" in run
        and "installer\\HCLoader.iss" in run
    )
    assert '"exe=$exe"' in run
    smoke = next(s for s in steps if s.get("name", "").startswith("Smoke (f)"))["run"]
    for needle in (
        "/VERYSILENT",
        "/SUPPRESSMSGBOXES",
        "/CURRENTUSER",
        "/DIR=",
        "portable.txt",
        "is_installed_python()",
        "rt.mode == 'installed'",
        "os.environ['APPDATA']",
        "unins000.exe",
        "keep-me.txt",
        "Register-ScheduledTask",
        "potoken.probe",
        "HCLOADER_HOME",
    ):
        assert needle in smoke, needle
    uploads = [s for s in steps if s.get("uses", "").startswith("actions/upload-artifact")]
    assert any("steps.installer.outputs.exe" in str(s.get("with", {}).get("path")) for s in uploads)
    rel = "\n".join(s.get("run", "") for s in data["jobs"]["release"]["steps"])
    assert "-name '*.exe'" in rel
    assert "sha256sum *.zip *.exe > SHA256SUMS" in rel
    assert 'gh release upload "$TAG" out/*.zip out/*.exe out/SHA256SUMS --clobber' in rel
    assert "HCLoader-Setup-$ver.exe" in rel
