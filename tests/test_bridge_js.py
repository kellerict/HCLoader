"""bridge.js in a real browser (Playwright/Chromium, skipped if unavailable):
live detection with a late pywebview API and event scripts from worker.event_script."""

import os
from pathlib import Path

import pytest

from app.worker import event_script

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "ui" / "index.html"
CHROMIUM_OFFLINE_ARGS = [
    "--no-proxy-server",
    "--host-resolver-rules=MAP * ~NOTFOUND",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    "--disable-default-apps",
    "--no-first-run",
    "--no-pings",
]


@pytest.fixture(scope="module")
def browser():
    sync_api = pytest.importorskip("playwright.sync_api")
    candidates = []
    if os.environ.get("HCLOADER_CHROMIUM"):
        candidates.append({"executable_path": os.environ["HCLOADER_CHROMIUM"]})
    if Path("/opt/pw-browsers/chromium").exists():
        candidates.append({"executable_path": "/opt/pw-browsers/chromium"})
    candidates += [{}, {"channel": "msedge"}]
    # The page is a local file: Chromium must not reach the network at all. Without these
    # flags it inherits HTTPS_PROXY from the environment and its background services
    # (component updater, GCM/account checks) connect to Google hosts.
    env = {k: v for k, v in os.environ.items() if "proxy" not in k.lower()}
    offline = {"args": CHROMIUM_OFFLINE_ARGS, "env": env}
    with sync_api.sync_playwright() as pw:
        b = None
        for kw in candidates:
            try:
                b = pw.chromium.launch(**kw, **offline)
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


def test_hosted_page_without_api_shows_error_instead_of_mock(browser):
    """Review m9: with ?host=pywebview the UI must never fall back to the mock silently."""
    page = browser.new_page()
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.clock.install()
    page.goto(INDEX.as_uri() + "?host=pywebview")
    page.wait_for_function("window.HC && HC.bridge && HC.app")
    page.clock.run_for(5000)
    assert page.evaluate("document.querySelector('#fatal')") is None  # still waiting
    page.clock.run_for(26000)
    page.wait_for_selector("#fatal", timeout=10000)
    assert page.evaluate("HC.bridge.failed") is True
    assert page.evaluate("HC.bridge.live") is False
    assert page.evaluate("document.body.classList.contains('is-mock')") is False
    assert page.evaluate("document.getElementById('mock-flag').hidden") is True
    assert page.is_visible("#fatal-reload")
    outcome = page.evaluate(
        "HC.bridge.call('save_settings', {}).then(() => 'resolved', () => 'rejected')"
    )
    assert outcome == "rejected"  # nothing is "saved" into the mock
    # the API arriving late still leads to a clean live start
    page.evaluate(
        "window.pywebview = { api: {} };"
        "for (const [name, fn] of Object.entries(HC.mock.api)) window.pywebview.api[name] = fn;"
    )
    page.clock.run_for(3000)
    page.wait_for_function("document.body.classList.contains('ready')", timeout=10000)
    assert page.evaluate("HC.bridge.live") is True
    assert page.evaluate("HC.bridge.failed") is False
    assert page.evaluate("document.querySelector('#fatal')") is None
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


def _schedule_tab(page):
    page.click('.nav-item[data-view="settings"]')
    page.wait_for_selector('.stab[data-tab="schedule"]')
    page.click('.stab[data-tab="schedule"]')
    page.wait_for_selector("[data-custom=task] [data-task]", timeout=10000)
    page.wait_for_function("HC.bridge.pending === 0")


SWITCH = "HC.settings.values.schedule.task_scheduler_enabled"
SAVE_DISABLED = "document.getElementById('btn-save').disabled"


def test_settings_adopt_task_state_from_get_task_status(browser):
    """Review Phase 3 m1: a task deleted outside the app (registered false) switches the form
    off, so the next save does not silently re-create it; `null` (unknown) changes nothing."""
    page, errors = _page(browser, "?mock=1&nosim")
    page.wait_for_function("document.body.classList.contains('ready')", timeout=10000)
    page.evaluate(f"{SWITCH} = true; HC.views.settings.reset(); 0")  # task gone in the mock
    _schedule_tab(page)
    page.wait_for_function(f"{SWITCH} === false", timeout=10000)
    assert page.evaluate(SAVE_DISABLED) is True  # form = saved state, nothing dirty
    label = "document.querySelector('.field[data-k=\"schedule.task_scheduler_enabled\"] [data-tl]')"
    assert page.evaluate(f"{label}.textContent") == page.evaluate("HC.t('common.off')")

    # unknown (schtasks failed): keep the value
    page.click('.nav-item[data-view="discover"]')
    page.evaluate(f"HC.mock.demo.taskUnknown(); {SWITCH} = true; HC.views.settings.reset(); 0")
    _schedule_tab(page)
    page.wait_for_selector("[data-task=refresh]", timeout=10000)
    assert page.evaluate(SWITCH) is True and page.evaluate(SAVE_DISABLED) is True
    assert not errors
    page.close()
