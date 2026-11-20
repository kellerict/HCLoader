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


def _menu(page, source_id, key=None):
    """Open the row menu (⋯) of a source; with a key also pick that entry."""
    page.click(f'#wl-body tr[data-id="{source_id}"] [data-act="more"]')
    page.wait_for_selector(".menu[role=menu]")
    if key:
        page.click(f'.menu [data-k="{key}"]')


def test_dialog_estimate_start_progress_and_done(page):
    _watchlist(page)
    # Gabber Vault (id 2): size known from the last check (486 entries)
    _menu(page, 2, "bf")
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
    _menu(page, 1, "bf")
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
    _menu(page, 3)
    assert page.is_disabled('.menu [data-k="bf"]')  # already running
    page.wait_for_selector(".menu[data-armed]")
    page.keyboard.press("Escape")
    page.wait_for_selector(".menu", state="detached")
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
    _menu(page, 5)
    item = '.menu [data-k="bf"]'
    assert page.is_disabled(item)
    assert "100 results" in page.get_attribute(item, "title")


def test_row_menu_holds_the_moved_actions(page):
    """Clean UI: a row shows «Check» and «⋯»; read everything, edit and delete live in the menu."""
    _watchlist(page)
    row = '#wl-body tr[data-id="2"]'
    assert page.locator(f"{row} td.act > *").count() == 2
    assert page.locator(f'{row} [data-act="check"]').count() == 1
    more = page.locator(f'{row} [data-act="more"]')
    assert more.get_attribute("aria-haspopup") == "menu"
    assert more.get_attribute("aria-label") == "More actions"
    _menu(page, 2)
    keys = page.eval_on_selector_all(".menu [role=menuitem]", "els => els.map(e => e.dataset.k)")
    assert keys == ["bf", "edit", "del"]
    assert "Read everything (once)" in page.inner_text(".menu")
    page.click('.menu [data-k="edit"]')
    page.wait_for_selector(".modal")
    assert page.input_value(".modal [data-f=name]") == "Gabber Vault"
    page.keyboard.press("Escape")
    page.wait_for_selector(".modal", state="detached")
    _menu(page, 2, "del")
    page.wait_for_selector(".modal")
    assert "Gabber Vault" in page.inner_text(".modal")
    page.click(".modal [data-act=ok]")
    page.wait_for_selector(row, state="detached")


def test_row_menu_by_keyboard(page):
    """Enter opens the menu with the first entry focused; arrows move, Escape returns to «⋯»."""
    _watchlist(page)
    page.focus('#wl-body tr[data-id="2"] [data-act="check"]')
    page.keyboard.press("Tab")
    assert page.evaluate("document.activeElement.dataset.act") == "more"
    page.keyboard.press("Enter")
    page.wait_for_selector(".menu")
    assert page.evaluate("document.activeElement.dataset.k") == "bf"
    page.keyboard.press("ArrowDown")
    assert page.evaluate("document.activeElement.dataset.k") == "edit"
    page.keyboard.press("End")
    assert page.evaluate("document.activeElement.dataset.k") == "del"
    page.keyboard.press("ArrowDown")  # wraps around
    assert page.evaluate("document.activeElement.dataset.k") == "bf"
    page.wait_for_selector(".menu[data-armed]")
    page.keyboard.press("Escape")
    page.wait_for_selector(".menu", state="detached")
    assert page.evaluate("document.activeElement.dataset.act") == "more"
    page.keyboard.press("Enter")
    page.wait_for_selector(".menu")
    page.keyboard.press("ArrowDown")
    page.keyboard.press("Enter")
    page.wait_for_selector(".modal")
    assert page.input_value(".modal [data-f=name]") == "Gabber Vault"


def test_row_menu_toggles_and_takes_arrows_after_a_mouse_click(page):
    """Review v0.11.0 m2/m5: a second click on «⋯» closes its menu (shared ui.menu, no special
    case); a mouse-opened menu still answers the arrow keys."""
    _watchlist(page)
    more = '#wl-body tr[data-id="2"] [data-act="more"]'
    page.click(more)
    page.wait_for_selector(".menu[data-armed]")
    page.click(more)
    page.wait_for_selector(".menu", state="detached")
    page.click(more)
    page.wait_for_selector(".menu[data-armed]")
    assert page.evaluate("document.activeElement.dataset.act") == "more"
    page.keyboard.press("ArrowDown")
    assert page.evaluate("document.activeElement.dataset.k") == "bf"
    page.keyboard.press("ArrowUp")
    assert page.evaluate("document.activeElement.dataset.k") == "del"
    page.keyboard.press("Escape")
    page.wait_for_selector(".menu", state="detached")
    assert page.evaluate("document.activeElement.dataset.act") == "more"
    # another anchor replaces the menu instead of toggling it
    page.click(more)
    page.wait_for_selector(".menu[data-armed]")
    page.click('#wl-body tr[data-id="1"] [data-act="more"]')
    page.wait_for_function(
        "() => { const m = document.querySelectorAll('.menu');"
        " return m.length === 1 && m[0]._anchor.closest('tr').dataset.id === '1'; }"
    )


def test_row_menu_closes_when_its_row_rerenders(page):
    """Review v0.11.0 m1: a re-render (check/backfill event) closes the open row menu – no menu on
    a detached anchor acting on a stale source – and focus lands on the new row's «⋯», not body."""
    _watchlist(page)
    more = '#wl-body tr[data-id="2"] [data-act="more"]'
    # mouse: menu goes away, nothing steals the focus
    page.click(more)
    page.wait_for_selector(".menu[data-armed]")
    page.evaluate("window.mv.emit('source', {id: 2, checking: false})")
    page.wait_for_selector(".menu", state="detached")
    assert page.evaluate("HC.ui._menu") is None
    # keyboard: focus inside the menu moves to «⋯» of the same source in the new table
    page.focus(more)
    page.keyboard.press("Enter")
    page.wait_for_selector(".menu[data-armed]")
    assert page.evaluate("document.activeElement.dataset.k") == "bf"
    old = page.evaluate_handle(f"document.querySelector('{more}')")
    page.evaluate("window.mv.emit('source', {id: 2, checking: false})")
    page.wait_for_selector(".menu", state="detached")
    assert page.evaluate("b => b.isConnected", old) is False
    assert page.evaluate(
        "[document.activeElement.dataset.act, document.activeElement.closest('tr').dataset.id]"
    ) == ["more", "2"]
    # single-row update of a backfill event: same rule
    page.keyboard.press("Enter")
    page.wait_for_selector(".menu[data-armed]")
    page.evaluate("window.mv.emit('backfill', {source_id: 2, state: 'none'})")
    page.wait_for_selector(".menu", state="detached")
    assert page.evaluate(
        "[document.activeElement.dataset.act, document.activeElement.closest('tr').dataset.id]"
    ) == ["more", "2"]


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
