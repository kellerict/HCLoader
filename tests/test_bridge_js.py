"""bridge.js in a real browser (Playwright/Chromium, skipped if unavailable):
live detection with a late pywebview API and event scripts from worker.event_script."""

import os
from pathlib import Path

import pytest

from app.worker import event_script

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "ui" / "index.html"


@pytest.fixture(scope="module")
def browser():
    sync_api = pytest.importorskip("playwright.sync_api")
    candidates = []
    if os.environ.get("HCLOADER_CHROMIUM"):
        candidates.append({"executable_path": os.environ["HCLOADER_CHROMIUM"]})
    if Path("/opt/pw-browsers/chromium").exists():
        candidates.append({"executable_path": "/opt/pw-browsers/chromium"})
    candidates += [{}, {"channel": "msedge"}]
    with sync_api.sync_playwright() as pw:
        b = None
        for kw in candidates:
            try:
                b = pw.chromium.launch(**kw)
                break
            except Exception:
                continue
        if b is None:
            pytest.skip("Kein Chromium für Playwright")
        yield b
        b.close()


def _page(browser, query):
    page = browser.new_page()
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.goto(INDEX.as_uri() + query)
    return page, errors


# Fake pywebview: first an empty api object (as pywebview creates it early), the functions
# only after 2 s (longer than the browser fallback of 1.2 s), backed by the mock.
FAKE_PYWEBVIEW = """
window.pywebview = { api: {} };
setTimeout(() => {
  for (const [name, fn] of Object.entries(HC.mock.api)) window.pywebview.api[name] = fn;
  window.dispatchEvent(new CustomEvent('pywebviewready'));
}, 2000);
"""


def test_hosted_page_waits_for_late_pywebview_api(browser):
    page, errors = _page(browser, "?host=pywebview")
    page.evaluate(FAKE_PYWEBVIEW)
    page.wait_for_function("document.body.classList.contains('ready')", timeout=10000)
    assert page.evaluate("HC.bridge.live") is True
    assert page.evaluate("document.body.classList.contains('is-mock')") is False
    assert page.evaluate("document.getElementById('mock-flag').hidden") is True
    assert not errors
    page.close()


def test_plain_browser_falls_back_to_mock(browser):
    page, errors = _page(browser, "?nosim")
    page.wait_for_function("document.body.classList.contains('ready')", timeout=10000)
    assert page.evaluate("HC.bridge.live") is False
    assert not errors
    page.close()


def test_event_scripts_reach_bridge_handlers(browser):
    page, errors = _page(browser, "?mock=1&nosim")
    page.wait_for_function("document.body.classList.contains('ready')", timeout=10000)
    page.evaluate("window.__got = []; HC.bridge.on('probe_evt', (d) => window.__got.push(d)); 0")
    payloads = [
        {"ts": "2026-11-16T09:00:00+00:00", "level": "warn", "msg": 'A "quote" \\ back'},
        {
            "ts": "x",
            "level": "info",
            "msg": "Zeile\nneu" + chr(0x2028) + "Sep" + chr(0x2029) + " </script> 🎧 Zürich",
        },
        {"ts": "x", "level": "ok", "msg": "${x} `y` ');alert(1);('"},
    ]
    for p in payloads:
        # same path as pywebview: the script is evaluated as a string
        page.evaluate("(s) => eval(s)", event_script("probe_evt", p))
    assert page.evaluate("window.__got") == payloads
    assert not errors
    page.close()
