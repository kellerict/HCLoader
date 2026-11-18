"""Festivals & series UI (v0.3.0) in a real browser against the mock backend
(Playwright/Chromium, skipped if unavailable): «Group by» switch, festival badge form
(set_festival + retag), suggestions, the settings tab and catalog parity of the new keys."""

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
# Record every mock call of these methods (name + arguments) in window.__calls.
SPY = """
window.__calls = [];
for (const name of ['set_festival', 'reset_festival', 'retag', 'save_series', 'assign_festivals']) {
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


def _library(page, group=None):
    page.click('.nav-item[data-view="library"]')
    page.wait_for_selector("#lib-body tr[data-id]")
    if group:
        page.click(f'#lib-groupby [data-g="{group}"]')


def _calls(page, name):
    return [c[1:] for c in page.evaluate("window.__calls") if c[0] == name]


def test_group_switch_festival_view_and_memory(page):
    _library(page, "festival")
    page.wait_for_selector(".fest-tile")
    names = page.locator(".fest-tile .ft-name").all_inner_texts()
    assert names[0] == "Defqon.1"  # most sets first
    assert {"Qlimax", "Dominator", "Q-dance Radio"} <= set(names)
    assert names[-1] == "Other / unassigned"
    tile = page.locator('.fest-tile:has(.ft-name:text-is("Defqon.1"))')
    assert "20 sets" in tile.inner_text() and "2019–2024" in tile.inner_text()

    # tile -> year timeline (newest edition selected) -> sets grouped by stage
    tile.click()
    page.wait_for_selector(".fest-line")
    years = page.locator(".fest-line button b").all_inner_texts()
    assert years == ["All", "2019", "2020", "2021", "2022", "2023", "2024"]
    assert page.inner_text(".fest-line button.on b") == "2024"
    heads = page.locator("#lib-body tr.grp td").all_inner_texts()
    assert len(heads) == 4
    assert heads[0].startswith("RED") and heads[1].startswith("BLACK")
    assert heads[2].startswith("BLUE")
    assert heads[-1].startswith("No stage")
    assert page.locator("#lib-body tr[data-id]").count() == 8
    assert page.locator('#lib-body tr[data-id] [data-act="play"]').count() == 8

    page.click('.fest-line [data-edition]:has(b:text-is("2019"))')
    assert page.locator("#lib-body tr[data-id]").count() == 3

    # search keeps working inside the festival view
    page.fill("#lib-q", "coone")
    page.wait_for_function("document.querySelectorAll('#lib-body tr[data-id]').length === 1")
    page.fill("#lib-q", "")
    page.dispatch_event("#lib-q", "input")
    page.click("[data-fest-back]")
    page.wait_for_selector(".fest-tile")

    # entries without a festival: own group
    page.click('.fest-tile[data-series="none"]')
    page.wait_for_selector("#lib-body tr[data-id]")
    assert page.locator("#lib-body tr[data-id] .ftag:not(.sugg):not(.add)").count() == 0
    assert page.locator("#lib-body .ftag.sugg").count() == 2

    # artist / year / genre groups; the choice survives a reload
    for group, first in (("artist", "Art of Dance"), ("year", "2026"), ("genre", "Uptempo")):
        page.click(f'#lib-groupby [data-g="{group}"]')
        assert page.locator("#lib-body tr.grp td").first.inner_text().startswith(first)
    page.click('#lib-groupby [data-g="festival"]')
    page.reload()
    page.wait_for_function("document.body.classList.contains('ready')")
    page.click('.nav-item[data-view="library"]')
    page.wait_for_selector(".fest-tile")
    assert page.get_attribute('#lib-groupby [data-g="festival"]', "aria-checked") == "true"


def test_badge_popover_sets_festival_and_retags(page):
    _library(page)
    row = '#lib-body tr[data-id="gGabbClassM"]'
    assert page.locator(f"{row} .ftag:not(.add)").count() == 0
    page.hover(row)
    page.click(f'{row} [data-act="fest"]')
    page.wait_for_selector(".popover.fpop")
    page.fill('.fpop [data-f="q"]', "thunder")
    assert page.locator(".fpop-list [data-sid]").all_inner_texts() == ["Thunderdome"]
    page.keyboard.press("Enter")  # picks the only hit
    page.fill('.fpop [data-f="year"]', "1996")
    page.fill('.fpop [data-f="stage"]', "Mainstage")
    page.select_option('.fpop [data-f="set_type"]', "full_show")
    page.click('.fpop [data-f="ok"]')
    page.wait_for_selector("#toasts .toast.ok")  # the usual «Retagged …» feedback

    ((vid, data),) = _calls(page, "set_festival")
    assert vid == "gGabbClassM"
    series_id = page.evaluate(
        "HC.mock.api.get_series().then(l => l.find(s => s.key === 'thunderdome').id)"
    )
    assert data == {
        "series_id": series_id,
        "event_year": 1996,
        "stage": "Mainstage",
        "set_type": "full_show",
    }
    assert _calls(page, "retag") == [["gGabbClassM"]]
    order = [c[0] for c in page.evaluate("window.__calls")]
    assert order.index("set_festival") < order.index("retag")
    badge = page.locator(f"{row} .ftag")
    assert "Thunderdome 1996" in badge.inner_text() and "Mainstage" in badge.inner_text()
    assert badge.locator(".gm").count() == 1  # marked as set manually
    assert page.locator(".popover").count() == 0

    # back to automatic: reset_festival, then retag again
    page.click(f'{row} [data-act="fest"]')
    page.click('.fpop [data-f="auto"]')
    page.wait_for_function("window.__calls.filter(c => c[0] === 'retag').length === 2")
    assert _calls(page, "reset_festival") == [["gGabbClassM"]]
    page.wait_for_function(
        "!document.querySelector('#lib-body tr[data-id=\"gGabbClassM\"] .ftag:not(.add)')"
    )


def test_invalid_year_keeps_the_form_open(page):
    _library(page)
    page.click('#lib-body tr[data-id="qDq24RedCls"] [data-act="fest"]')
    page.wait_for_selector(".popover.fpop")
    page.fill('.fpop [data-f="year"]', "1900")
    page.click('.fpop [data-f="ok"]')
    page.wait_for_selector(".fpop [data-err]:not([hidden])")
    assert "1900" in page.inner_text(".fpop [data-err]")
    assert _calls(page, "retag") == []
    page.keyboard.press("Escape")
    assert page.locator(".popover").count() == 0


def test_accepting_a_suggestion(page):
    _library(page)
    row = '#lib-body tr[data-id="gThunder98x"]'
    assert "Thunderdome 1998" in page.inner_text(f"{row} .ftag.sugg")
    page.click(f'{row} [data-act="fest-accept"]')
    page.wait_for_selector("#toasts .toast.ok")
    ((vid, data),) = _calls(page, "set_festival")
    assert vid == "gThunder98x" and isinstance(data["edition_id"], int)
    assert _calls(page, "retag") == [["gThunder98x"]]
    assert page.locator(f"{row} .ftag.sugg").count() == 0
    assert "Thunderdome 1998" in page.inner_text(f"{row} .ftag")


def test_settings_add_series_and_assign(page):
    page.evaluate("HC.app.go('settings', 'festivals')")
    page.wait_for_selector(".series-row")
    before = page.locator(".series-row").count()
    page.click('[data-s="add"]')
    page.wait_for_selector(".series-modal")
    page.click(".series-modal [data-act=ok]")  # empty name -> error at the field
    page.wait_for_selector('.series-modal [data-e="name"]:not([hidden])')
    page.fill(".series-modal [data-f=name]", "Bunker Sessions")
    page.click('.series-modal [data-seg=kind] [data-v="podcast"]')
    page.fill(".series-modal [data-chips=aliases] input", "Bunker 303 Sessions")
    page.keyboard.press("Enter")
    page.select_option(".series-modal [data-f=default_genre]", "Hardcore")
    page.click(".series-modal [data-act=ok]")
    page.wait_for_selector('.series-row:has(b:text-is("Bunker Sessions"))')
    saved = _calls(page, "save_series")[-1][0]
    assert saved["name"] == "Bunker Sessions" and saved["kind"] == "podcast"
    assert saved["aliases"] == ["Bunker 303 Sessions"] and saved["default_genre"] == "Hardcore"
    assert "id" not in saved
    row = page.locator('.series-row:has(b:text-is("Bunker Sessions"))')
    assert row.locator(".rtag.own").count() == 1
    assert page.locator(".series-row").count() == before + 1

    # the offline pass picks up the new series and reports progress + result
    assert "39 of 81" in page.inner_text("[data-custom=festStatus] .st-title")
    page.click('[data-fest="assign"]')
    page.wait_for_selector("[data-custom=festStatus] .notice.ok", timeout=10000)
    assert _calls(page, "assign_festivals") == [[{"scope": "library"}]]
    assert "44 of 81" in page.inner_text("[data-custom=festStatus] .st-title")
    page.wait_for_function(
        "document.querySelector('.series-row:has(.rtag.own) ~ *') !== null"
        " && [...document.querySelectorAll('.series-row')].find(r => r.querySelector('b')"
        ".textContent === 'Bunker Sessions').querySelector('.sr-count').textContent === '2'"
    )

    # own series can be deleted again, built-in ones are only hidden
    row.locator('[data-s="del"]').click()
    page.click(".modal [data-act=ok]")
    page.wait_for_function(
        "![...document.querySelectorAll('.series-row b')]"
        ".some(b => b.textContent === 'Bunker Sessions')"
    )


def test_festival_fields_and_placeholders_in_settings(page):
    page.evaluate("HC.app.go('settings', 'festivals')")
    for key in ("festivals.detect", "festivals.min_confidence", "storage.album_from_edition"):
        assert page.locator(f'.field[data-k="{key}"]').count() == 1
    page.click('.stab[data-tab="storage"]')
    shown = page.locator(".ph-list .ph").all_inner_texts()
    assert {"{festival}", "{event_year}", "{stage}"} <= set(shown)
    assert page.locator('.field[data-k="storage.album_from_edition"]').count() == 1


def test_new_keys_translated_everywhere():
    """Every full catalog carries the v0.3.0 keys (variants inherit from their parent)."""
    new = [
        k
        for k in UI_REF
        if k.startswith(("fest.", "set.festivals.", "set.series.", "set.fest_", "dlg.series_"))
        or k in ("tabs.festivals", "library.group_by", "set.storage.album_from_edition.label")
    ]
    assert len(new) > 90
    for path in sorted((ROOT / "ui" / "js" / "locales").glob("*.js")):
        code = path.stem
        if parent_fallback(code):
            continue
        flat = flatten(ui_catalog(code)[1])
        assert [k for k in new if k not in flat] == [], code
