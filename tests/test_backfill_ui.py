"""«Read everything (once)» UI (v0.4.0) in a real browser against the mock backend
(Playwright/Chromium, skipped if unavailable): confirmation dialog with the estimate, progress
at the source, pause / resume / cancel, search sources, settings fields and catalog parity."""

import os
from pathlib import Path

import pytest

from tests.test_i18n import UI_REF, flatten, parent_fallback, ui_catalog

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
SPY = """
window.__calls = [];
for (const name of ['estimate_backfill', 'start_backfill', 'pause_backfill', 'cancel_backfill']) {
  const orig = HC.mock.api[name];
  HC.mock.api[name] = (...args) => { window.__calls.push([name, ...args]); return orig(...args); };
}
HC.mock.speed.factor = 0.05;
"""


@pytest.fixture(scope="module")
def browser():
    sync_api = pytest.importorskip("playwright.sync_api")
    candidates = []
    if os.environ.get("HCLOADER_CHROMIUM"):
        candidates.append({"executable_path": os.environ["HCLOADER_CHROMIUM"]})
    if Path("/opt/pw-browsers/chromium").exists():
        candidates.append({"executable_path": "/opt/pw-browsers/chromium"})
    candidates += [{}, {"channel": "msedge"}]
    env = {k: v for k, v in os.environ.items() if "proxy" not in k.lower()}
    with sync_api.sync_playwright() as pw:
        b = None
        for kw in candidates:
            try:
                b = pw.chromium.launch(**kw, args=CHROMIUM_OFFLINE_ARGS, env=env)
                break
            except Exception:
                continue
        if b is None:
            pytest.skip("Kein Chromium für Playwright")
        yield b
        b.close()


@pytest.fixture
def page(browser):
    context = browser.new_context(viewport={"width": 1440, "height": 900}, locale="en-US")
    p = context.new_page()
    p.messages = []
    p.on("console", lambda m: p.messages.append((m.type, m.text)))
    p.on("pageerror", lambda exc: p.messages.append(("pageerror", str(exc))))
    p.goto(INDEX.as_uri() + "?mock=1&nosim=1&lang=en")
    p.wait_for_function("document.body.classList.contains('ready')")
    p.evaluate(SPY)
    yield p
    bad = [m for m in p.messages if m[0] in ("error", "pageerror") or "[i18n] missing" in m[1]]
    context.close()
    assert bad == []


def _calls(page, name):
    return [c[1:] for c in page.evaluate("window.__calls") if c[0] == name]


def _watchlist(page):
    page.click('.nav-item[data-view="watchlist"]')
    page.wait_for_selector("#wl-body tr[data-id]")


def test_dialog_estimate_start_progress_and_done(page):
    _watchlist(page)
    # Gabber Vault (id 2): size known from the last check (486 entries)
    page.click('#wl-body tr[data-id="2"] [data-act="bf"]')
    page.wait_for_selector(".modal.bf-dlg")
    text = page.inner_text(".modal.bf-dlg")
    assert "Read everything from “Gabber Vault”?" in text
    assert "486" in text and "inbox" in text
    assert "~18" in text  # 1 + ceil(486 / 30) requests
    assert _calls(page, "estimate_backfill") == [[2]]
    page.click(".modal [data-act=ok]")
    page.wait_for_selector('#wl-body tr[data-bf-id="2"] .wl-bf')
    assert _calls(page, "start_backfill") == [[2]]
    page.wait_for_selector('#wl-body tr[data-bf-id="2"] .wl-bf.bf-running')
    line = page.inner_text('#wl-body tr[data-bf-id="2"] .wl-bf')
    assert "Reading" in line and "/ ~486" in line
    page.wait_for_selector('#wl-body tr[data-id="2"] .wl-bf.done', timeout=15000)
    assert "All read" in page.inner_text('#wl-body tr[data-id="2"] .wl-bf.done')
    assert page.locator('#wl-body tr[data-bf-id="2"]').count() == 0
    page.wait_for_selector("#toasts .toast.ok")
    assert "read completely" in page.inner_text("#toasts")


def test_unknown_size_is_conservative(page):
    _watchlist(page)
    page.click('#wl-body tr[data-id="1"] [data-act="bf"]')
    page.wait_for_selector(".modal.bf-dlg")
    text = page.inner_text(".modal.bf-dlg")
    assert "size is unknown" in text and "≤ 2,000" in text
    page.keyboard.press("Escape")
    assert _calls(page, "start_backfill") == []


def test_pause_resume_cancel(page):
    _watchlist(page)
    page.evaluate(
        "HC.mock.demo.backfill(3, {state: 'running', position: 240, total: 500, added: 37})"
    )
    sub = '#wl-body tr[data-bf-id="3"]'
    page.wait_for_selector(f"{sub} .wl-bf.bf-running")
    text = page.inner_text(f"{sub} .wl-bf")
    assert "Reading" in text and "240 / ~500" in text and "+37 in the inbox" in text
    assert page.get_attribute('#wl-body tr[data-id="3"] [data-act="bf"]', "disabled") is not None
    page.click(f'{sub} [data-bf="pause"]')
    page.wait_for_selector(f"{sub} .wl-bf.bf-paused")
    assert _calls(page, "pause_backfill") == [[3]]
    page.click(f'{sub} [data-bf="resume"]')
    page.wait_for_selector(f"{sub} .wl-bf:not(.bf-paused)")
    assert _calls(page, "start_backfill") == [[3]]
    page.click(f'{sub} [data-bf="pause"]')  # stable row for the cancel button
    page.wait_for_selector(f"{sub} .wl-bf.bf-paused")
    page.click(f'{sub} [data-bf="cancel"]')
    page.wait_for_selector(".modal")
    assert "Hits already in the inbox stay" in page.inner_text(".modal")
    page.click(".modal [data-act=ok]")
    page.wait_for_function(f"!document.querySelector('{sub}')")
    assert _calls(page, "cancel_backfill") == [[3]]


def test_search_sources_have_no_backfill(page):
    _watchlist(page)
    btn = '#wl-body tr[data-id="5"] [data-act="bf"]'
    assert page.get_attribute(btn, "disabled") is not None
    assert "100 results" in page.get_attribute(btn, "title")


def test_settings_fields(page):
    page.evaluate("HC.app.go('settings', 'schedule')")
    page.wait_for_selector('.field[data-k="watchlist.backfill_max_entries"]')
    assert page.locator('.field[data-k="watchlist.backfill_requests_per_hour"]').count() == 1
    assert "2000" in page.inner_text('.field[data-k="watchlist.backfill_max_entries"]')


def test_new_keys_translated_everywhere():
    """Every full catalog carries the v0.4.0 keys (variants inherit from their parent)."""
    new = [
        k
        for k in UI_REF
        if k.startswith(("backfill.", "set.watchlist.")) or k in ("set.h.backfill", "unit.req_h")
    ]
    assert len(new) >= 40
    for path in sorted((ROOT / "ui" / "js" / "locales").glob("*.js")):
        code = path.stem
        if parent_fallback(code) and code != "de-x-frk":
            continue
        flat = flatten(ui_catalog(code)[1])
        assert [k for k in new if k not in flat] == [], code
