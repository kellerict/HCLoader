"""WebView2 Runtime: detection (app/core/webview2.py), the GUI start message for a missing runtime
(portable ZIP, app/main.py) and the installer part that installs it (installer/HCLoader.iss,
portable.yml; static checks, the real install runs in the Windows CI)."""

from __future__ import annotations

import re
import sys
import types
from pathlib import Path

import pytest

from app import main as app_main
from app.core import i18n, webview2

ROOT = Path(__file__).resolve().parents[1]
ISS = ROOT / "installer" / "HCLoader.iss"
ISS_MESSAGES = ROOT / "installer" / "webview2-messages.isi"
WORKFLOW = ROOT / ".github" / "workflows" / "portable.yml"
RUNTIME_KEY = r"Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"


def reader(values: dict[tuple[str, str], str | None]):
    seen = []

    def read(root, subkey):
        seen.append((root, subkey))
        return values.get((root, subkey))

    read.seen = seen
    return read


# --------------------------------------------------------------------------- detection


def test_documented_registry_locations():
    locs = list(webview2.registry_locations())
    assert locs == [
        ("HKLM", "SOFTWARE\\WOW6432Node\\" + RUNTIME_KEY),
        ("HKLM", "SOFTWARE\\" + RUNTIME_KEY),
        ("HKCU", "Software\\" + RUNTIME_KEY),
    ]


@pytest.mark.parametrize(
    ("pv", "ok"),
    [
        (None, False),
        ("", False),
        ("  ", False),
        ("0.0.0.0", False),
        ("131.0.2903.70", True),
        ("86.0.622.0", True),  # pywebview's minimum
        ("85.0.564.70", False),  # pywebview would fall back to MSHTML
        ("x.1.2.3", False),
    ],
)
def test_valid_version(pv, ok):
    assert webview2.is_valid_version(pv) is ok


@pytest.mark.parametrize(
    "where",
    [
        ("HKLM", "SOFTWARE\\WOW6432Node\\" + RUNTIME_KEY),  # per machine, 64-bit Windows
        ("HKLM", "SOFTWARE\\" + RUNTIME_KEY),  # per machine, 32-bit Windows
        ("HKCU", "Software\\" + RUNTIME_KEY),  # per user (installer without admin rights)
    ],
)
def test_installed_in_any_location(where):
    assert webview2.installed_version(reader({where: " 142.0.3595.53 "})) == "142.0.3595.53"


def test_zero_version_counts_as_missing_but_another_key_wins():
    hklm = ("HKLM", "SOFTWARE\\WOW6432Node\\" + RUNTIME_KEY)
    hkcu = ("HKCU", "Software\\" + RUNTIME_KEY)
    assert webview2.installed_version(reader({hklm: "0.0.0.0"})) is None
    assert webview2.installed_version(reader({hklm: "0.0.0.0", hkcu: "140.0.1.2"})) == "140.0.1.2"


def test_preview_channel_counts_like_pywebview():
    canary = webview2.PREVIEW_CLIENT_IDS[-1]
    key = ("HKCU", rf"Software\Microsoft\EdgeUpdate\Clients\{canary}")
    assert webview2.installed_version(reader({key: "143.0.1.0"})) == "143.0.1.0"


def test_missing_only_on_windows(monkeypatch):
    empty = reader({})
    monkeypatch.setattr(webview2.sys, "platform", "linux")
    assert webview2.missing(empty) is False  # Linux/macOS: no WebView2 involved
    assert empty.seen == []
    monkeypatch.setattr(webview2.sys, "platform", "win32")
    monkeypatch.delenv(webview2.SKIP_ENV, raising=False)
    assert webview2.missing(empty) is True
    hkcu = ("HKCU", "Software\\" + RUNTIME_KEY)
    assert webview2.missing(reader({hkcu: "140.0.1.2"})) is False
    monkeypatch.setenv(webview2.SKIP_ENV, "1")  # escape hatch (e.g. Fixed Version runtime)
    assert webview2.missing(empty) is False


def test_check_errors_never_block_the_start(monkeypatch):
    monkeypatch.setattr(webview2.sys, "platform", "win32")
    monkeypatch.delenv(webview2.SKIP_ENV, raising=False)

    def broken(root, subkey):
        raise RuntimeError("registry")

    assert webview2.missing(broken) is False


# --------------------------------------------------------------------------- GUI start


def test_gui_start_without_webview2_explains_and_offers_the_download(monkeypatch, capsys):
    import ctypes

    created = []
    fake = types.ModuleType("webview")
    fake.create_window = lambda *a, **kw: created.append(a)
    monkeypatch.setitem(sys.modules, "webview", fake)
    monkeypatch.setattr(app_main, "setup_logging", lambda *a, **kw: None)
    monkeypatch.setattr(webview2, "missing", lambda reader=None: True)
    boxes, opened = [], []

    def box(hwnd, text, title, flags):
        boxes.append((text, flags))
        return 6  # IDYES

    monkeypatch.setattr(app_main, "sys", types.SimpleNamespace(platform="win32", stderr=sys.stderr))
    monkeypatch.setattr(
        ctypes,
        "windll",
        types.SimpleNamespace(user32=types.SimpleNamespace(MessageBoxW=box)),
        raising=False,
    )
    monkeypatch.setattr(app_main.os, "startfile", opened.append, raising=False)
    monkeypatch.setattr(app_main, "_dialog_allowed", lambda: True)  # as under pythonw
    i18n.set_language("en")

    assert app_main.run_gui() == app_main.EXIT_FAILED
    assert created == []  # no window: the UI would not work under MSHTML
    err = capsys.readouterr().err
    assert "WebView2 Runtime" in err and webview2.DOWNLOAD_URL in err
    assert len(boxes) == 1
    text, flags = boxes[0]
    assert webview2.DOWNLOAD_URL in text and text.endswith("Open the download page now?")
    assert flags == 0x10 | 0x04  # error icon, Yes/No
    assert opened == [webview2.DOWNLOAD_URL]


def test_fatal_box_without_url_stays_ok_only(monkeypatch):
    import ctypes

    boxes, opened = [], []
    monkeypatch.setattr(app_main, "sys", types.SimpleNamespace(platform="win32", stderr=sys.stderr))
    monkeypatch.setattr(
        ctypes,
        "windll",
        types.SimpleNamespace(
            user32=types.SimpleNamespace(MessageBoxW=lambda h, t, c, f: boxes.append(f) or 1)
        ),
        raising=False,
    )
    monkeypatch.setattr(app_main.os, "startfile", opened.append, raising=False)
    monkeypatch.setattr(app_main, "_dialog_allowed", lambda: True)
    app_main.show_fatal("boom")
    app_main.show_fatal("no", open_url="https://example.invalid/")  # answer 1 = not Yes
    assert boxes == [0x10, 0x14] and opened == []


def test_webview2_message_in_every_backend_language():
    """Portable users meet this text before anything else: every full catalog has it."""
    ref = i18n.translate("main.webview2_missing", "en", url="URL")
    for path in sorted(i18n.LOCALES_DIR.glob("*.json")):
        code = path.stem
        text = i18n.translate("main.webview2_missing", code, url="URL")
        assert "WebView2" in text and text.rstrip().endswith("URL"), code
        if code != "en" and not i18n.is_dialect(code) and code != "nl-BE":
            assert text != ref, f"{code}: not translated"
            assert i18n.translate("main.open_page", code) != i18n.translate(
                "main.open_page", "en"
            ), code


# --------------------------------------------------------------------------- installer


def _iss() -> str:
    return ISS.read_text(encoding="ascii")


def _code() -> str:
    return _iss().split("\n[Code]\n", 1)[1]


def test_iss_bundles_the_bootstrapper_only_for_extraction():
    text = _iss()
    assert '#define WebView2Setup "MicrosoftEdgeWebview2Setup.exe"' in text
    assert "redist\\MicrosoftEdgeWebview2Setup.exe" in text
    assert "#if !FileExists(WebView2Bootstrapper)" in text and "#error" in text
    line = next(
        ln for ln in text.splitlines() if ln.startswith('Source: "{#WebView2Bootstrapper}"')
    )
    # not installed into {app}: extracted to {tmp} only when the runtime is missing
    assert "Flags: dontcopy" in line and 'DestName: "{#WebView2Setup}"' in line
    assert f'#define WebView2Url "{webview2.DOWNLOAD_URL}"' in text
    gitignore = (ROOT / ".gitignore").read_text(encoding="utf-8")
    assert "/installer/redist/" in gitignore


def test_iss_detects_the_runtime_like_microsoft_documents_it():
    code = _code()
    assert "'SOFTWARE\\Microsoft\\EdgeUpdate\\Clients\\'" in code
    for root in ("HKLM32", "HKCU", "HKLM64"):
        assert f"WebView2PvAt({root}, Key," in code, root
    assert "'pv'" in code and "'0.0.0.0'" in code
    assert "Log('WebView2 present, skipped (version ' + Version + ')')" in code


def test_iss_detection_matches_the_app_and_pywebview():
    """Review v0.5.1 L2/L3: same channels and the same minimum version as app/core/webview2.py."""
    code = _code()
    ids = [webview2.RUNTIME_CLIENT_ID, *webview2.PREVIEW_CLIENT_IDS]
    for name, client_id in zip(("Stable", "Beta", "Dev", "Canary"), ids, strict=True):
        assert f"WebView2{name} = '{client_id}';" in code, name
        assert f"WebView2ClientFound(WebView2{name}, '{name.lower()}', Version)" in code, name
    assert f"WebView2MinMajor = {webview2.MIN_MAJOR};" in code
    assert "WebView2MajorOk(Value)" in code


def _proc(name: str) -> str:
    match = re.search(rf"(procedure|function) {name}\b.*?\nend;", _code(), re.S)
    assert match, name
    return match.group(0)


def test_iss_runs_the_bootstrapper_silently_and_never_aborts():
    code = _code()
    install = _proc("InstallWebView2")
    assert "ExtractTemporaryFile('{#WebView2Setup}')" in install
    assert "Params := '/silent /install';" in install
    assert "CustomMessage('WebView2Installing'), [IntToStr(WebView2TimeoutSec div 60)]" in install
    assert "WizardForm.StatusLabel.Caption :=" in install
    # failure: a log line always, the hint box only in interactive mode (M2: SuppressibleMsgBox is
    # not suppressed by /SILENT or /VERYSILENT, a box would block an unattended install)
    assert "Log('WebView2 install failed: ' + Failure)" in install
    box = "SuppressibleMsgBox(FmtMessage(CustomMessage('WebView2Failed'), "
    assert box + "[Failure, '{#WebView2Url}']), mbInformation, MB_OK, IDOK)" in install
    guard = install.index("if WizardSilent then")
    assert guard < install.index(box)
    assert install.count("MsgBox(") == 1
    assert "suppressed in silent mode" not in code
    assert "Abort" not in install
    # L1: the installer defaults are written before the bootstrapper step
    step = _proc("CurStepChanged")
    assert step.index("WriteInstallerDefaults()") < step.index("InstallWebView2()")
    # CI dry runs: extract only, or a hanging stand-in with a short deadline
    assert "{param:WEBVIEW2DRYRUN|0}" in install
    dry = "Log('WebView2 dry run: bootstrapper extracted to ' + Setup + ', not started')"
    assert dry in install
    assert "(Mode = 'timeout')" in install and "TimeoutSec := 5;" in install


def test_iss_bootstrapper_runs_with_a_deadline():
    """Review v0.5.1 M1: no unbounded wait; on timeout the tree is killed and Setup goes on."""
    code = _code()
    assert "WebView2TimeoutSec = 600;" in code and "WebView2TimedOut = 1460;" in code
    install = _proc("InstallWebView2")
    # the bootstrapper is never started by an unbounded Exec
    assert "Exec(" not in install
    assert "RunBounded(Exe, Params, TimeoutSec, ResultCode)" in install
    assert "ResultCode = WebView2TimedOut" in install
    assert "Log(Format('WebView2 install timed out after %d s, bootstrapper stopped'" in install
    runner = _proc("RunBounded")
    assert "Start-Process -FilePath" in runner and "-PassThru" in runner
    assert "$null = $p.Handle" in runner  # PS 5.1: keeps ExitCode readable
    assert "$p.WaitForExit(' + IntToStr(TimeoutSec * 1000) + ')" in runner
    assert "taskkill.exe" in runner and "/T /F" in runner and "$k.WaitForExit(30000)" in runner
    assert "'exit ' + IntToStr(WebView2TimedOut)" in runner
    # quotes in paths are escaped for the single-quoted PowerShell strings
    assert runner.count("StringChangeEx(") == 2
    assert '"' not in runner.split("Script :=", 1)[1].split("Result := Exec", 1)[0]


def test_iss_webview2_texts_in_every_installer_language():
    raw = ISS_MESSAGES.read_bytes()
    assert raw.startswith(b"\xef\xbb\xbf")  # UTF-8 with BOM (ISPP #include; Cyrillic texts)
    text = raw.decode("utf-8-sig")
    iss = _iss()
    assert '#include "webview2-messages.isi"' in iss
    langs = re.findall(r'^Name: "(\w+)"; MessagesFile', iss, re.M)
    assert {"en", "de", "ru", "sv"} <= set(langs)
    for name in ("WebView2Installing", "WebView2Failed"):
        assert re.search(rf"^{name}=\S", text, re.M), name
        for lang in langs:
            if lang == "en":
                continue
            assert re.search(rf"^{lang}\.{name}=\S", text, re.M), (lang, name)
    for line in re.findall(r"^(?:\w+\.)?WebView2Failed=(.*)$", text, re.M):
        assert "%1" in line and "%2" in line, line
    installing = re.findall(r"^(?:\w+\.)?WebView2Installing=(.*)$", text, re.M)
    assert len(installing) == len(langs)
    for line in installing:
        assert "%1" in line and "%2" not in line, line  # %1 = deadline in minutes
    # sv only exists with Swedish.isl: the same guard as in [Languages]
    assert '#if FileExists(AddBackslash(CompilerPath) + "Languages/Swedish.isl")' in text
    assert "ß" not in text


# --------------------------------------------------------------------------- CI


def test_workflow_fetches_and_verifies_the_bootstrapper():
    from ruamel.yaml import YAML

    data = YAML(typ="safe").load(WORKFLOW.read_text(encoding="utf-8"))
    steps = data["jobs"]["portable"]["steps"]
    names = [s.get("name", "") for s in steps]
    fetch_i = next(i for i, n in enumerate(names) if "WebView2 bootstrapper" in n)
    compile_i = next(i for i, n in enumerate(names) if n.startswith("Installer: compile"))
    assert fetch_i < compile_i
    run = steps[fetch_i]["run"]
    assert "https://go.microsoft.com/fwlink/p/?LinkId=2124703" in run
    assert "installer\\redist" in run and "MicrosoftEdgeWebview2Setup.exe" in run
    assert "Get-AuthenticodeSignature" in run and "-ne 'Valid'" in run
    assert "O=Microsoft Corporation" in run
    # L4: chain pinned to a Microsoft root, intermediates from the signature itself
    assert "X509Chain" in run and "ExtraStore.AddRange($embedded)" in run
    assert "Microsoft (Root Certificate Authority 201[01]|" in run
    smoke = "\n".join(s.get("run", "") for s in data["jobs"]["installer-smoke"]["steps"])
    assert "WebView2 present, skipped" in smoke
    assert "'/WEBVIEW2DRYRUN=1'" in smoke and "WebView2 dry run: bootstrapper extracted" in smoke
    # M1/M2: hanging bootstrapper stand-in, silent Setup without /SUPPRESSMSGBOXES must finish
    assert "'/WEBVIEW2DRYRUN=timeout') -WithMsgBoxes" in smoke
    for needle in (
        "WebView2 install timed out after 5 s",
        "WebView2: silent install, no message box",
        "-n 600 127",
    ):
        assert needle in smoke, needle
    helper = (ROOT / ".github" / "scripts" / "installer_smoke.ps1").read_text(encoding="ascii")
    assert "[switch]$WithMsgBoxes" in helper
    assert "Where-Object { $_ -ne '/SUPPRESSMSGBOXES' }" in helper
