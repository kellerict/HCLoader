# ruff: noqa: E501
"""Tracklist search UI (v0.6.0) in a real browser against the mock backend
(Playwright/Chromium, skipped if unavailable): Tracks sub-view, search results with timestamps,
jump into the built-in player, external player mode, «Most played», tracklist panel (also from
the library menu), the read pass with progress/cancel, empty states, XSS safety and catalog
parity of the new keys."""

from __future__ import annotations

import pytest
from test_festivals_ui import (
    browser,  # noqa: F401  (fixture)
    page,  # noqa: F401  (fixture)
)

from tests.test_i18n import UI_REF, flatten, parent_fallback, ui_catalog

SPY_PLAYER = """
window.__jumps = [];
const orig = HC.player.playAt;
HC.player.playAt = (item, at) => { window.__jumps.push([item.id, at]); return orig(item, at); };
true;
"""


def _tracks(pg):
    pg.click('.nav-item[data-view="library"]')
    pg.wait_for_selector("#lib-body tr[data-id]")
    pg.click("#lib-tracks-btn")
    pg.wait_for_selector(".tr-top-list li")


def _search(pg, q):
    pg.fill("#tr-q", q)
    pg.wait_for_function(
        "q => document.querySelector('.tr-label') && "
        "document.querySelector('.tr-label').textContent.toLowerCase().includes(q)",
        arg=q.lower(),
    )


def test_tracks_view_search_and_jump(page):  # noqa: F811
    _tracks(page)
    assert page.evaluate("location.hash") == "#library/tracks"
    assert page.is_hidden("#lib-body")  # the library list is out of the way
    top = page.locator(".tr-top-row")
    assert top.count() == 20
    first_sets = [int(x) for x in page.locator(".tr-top-n b").all_inner_texts()[0].split()[:1]]
    assert first_sets[0] >= 2

    _search(page, "kernschmelze")
    cards = page.locator(".tr-set")
    assert cards.count() > 3
    assert page.locator(".tr-set mark").first.inner_text().lower() == "kernschmelze"
    page.evaluate(SPY_PLAYER)
    btn = cards.first.locator("button.tk-time").first
    at = float(btn.get_attribute("data-at"))
    set_id = cards.first.get_attribute("data-set")
    btn.click()
    page.wait_for_function("HC.player.state().id !== null")
    assert page.evaluate("window.__jumps") == [[set_id, at]]
    assert page.evaluate("HC.player.state().id") == set_id

    # «Most played» row -> search for it
    page.fill("#tr-q", "")
    page.wait_for_selector(".tr-top-row")
    page.locator(".tr-top-row").first.click()
    page.wait_for_selector(".tr-set")
    assert page.input_value("#tr-q") != ""

    # back to the library
    page.click("[data-tr=back]")
    page.wait_for_selector("#lib-body tr[data-id]")
    assert not page.evaluate("document.getElementById('v-library').classList.contains('tracking')")


def test_external_player_mode_opens_file_and_names_time(page):  # noqa: F811
    _tracks(page)
    page.evaluate(
        """window.__calls = []; const o = HC.mock.api.play_external;
        HC.mock.api.play_external = (...a) => { window.__calls.push(a); return o(...a); };
        HC.settings.values.player = Object.assign({}, HC.settings.values.player, {mode: 'external'}); true;"""
    )
    _search(page, "kernschmelze")
    btn = page.locator(".tr-set button.tk-time").first
    btn.click()
    page.wait_for_selector(".toast")
    assert len(page.evaluate("window.__calls")) == 1
    assert btn.inner_text().strip() in page.locator(".toast").last.inner_text()
    assert page.evaluate("HC.player.state().id") is None


def test_tracklist_panel_from_results_and_library_menu(page):  # noqa: F811
    _tracks(page)
    _search(page, "kernschmelze")
    page.evaluate(SPY_PLAYER)
    seen_id = False
    for n in range(6):  # «ID – ID» is dimmed (not every set has one)
        page.locator(".tr-set [data-tr=panel]").nth(n).click()
        page.wait_for_selector(".tl-panel .tl-row")
        assert page.locator(".tl-panel .tl-row").count() >= 7
        seen_id = seen_id or page.locator(".tl-panel .tl-row.is-id").count() >= 1
        if n == 0:
            page.locator(".tl-panel button.tk-time").nth(1).click()
            page.wait_for_function("window.__jumps.length === 1")
        page.keyboard.press("Escape")
        assert page.locator(".tl-panel").count() == 0
    assert seen_id

    # from the library: menu (⋯) -> «Tracklist»
    page.click("[data-tr=back]")
    page.wait_for_selector("#lib-body tr[data-id]")
    vid = page.locator("#lib-body tr[data-id]").first.get_attribute("data-id")
    page.click(f'#lib-body tr[data-id="{vid}"] [data-act=more]')
    page.click(".menu [data-k=tracklist]")
    page.wait_for_selector(".tl-panel")
    assert page.locator(".tl-panel .tl-row").count() + page.locator(".tl-empty").count() > 0
    page.locator(".tl-panel [data-tl=close]").first.click()
    assert page.locator(".tl-panel").count() == 0


def test_no_results_and_xss_safe(page):  # noqa: F811
    _tracks(page)
    evil = '<img src=x onerror="window.__xss=1">'
    page.fill("#tr-q", evil)
    page.wait_for_selector(".tr-empty")
    page.wait_for_timeout(200)
    assert page.evaluate("window.__xss") is None
    assert page.locator(".tr-empty img").count() == 0
    assert "<img" in page.locator(".tr-empty h4").inner_text()
    # data from the backend (track titles) is escaped too
    page.evaluate(
        """HC.mock.api.search_tracks = async (q) => ({ok: true, query: q, engine: 'fts5', hits: 1, truncated: false,
          sets: [{id: 'eEuph0ric26', title: '<b>Set</b>', artist: 'A', duration: 60, thumbnail: null, genre: 'Hardstyle',
                  platform: 'youtube', hits: [{position: 1, start: 30, artist: '<i>x</i>', title: '<script>window.__xss=2</script>',
                  version: '', label: '', is_id: false}], more: 0}]}); true;"""
    )
    page.fill("#tr-q", "x y")
    page.wait_for_selector(".tr-set")
    assert page.evaluate("window.__xss") is None
    assert page.locator(".tr-hits i, .tr-hits script, .tr-set-t b b").count() == 0
    assert "<script>" in page.locator(".tr-hits").inner_text()


def test_first_open_reads_tracklists_with_progress_and_cancel(page):  # noqa: F811
    page.evaluate(
        """window.__calls = []; HC.mock.demo.tracksFresh(); HC.mock.speed.factor = 1;
        for (const n of ['build_tracklists', 'cancel_build_tracklists']) { const o = HC.mock.api[n];
          HC.mock.api[n] = (...a) => { window.__calls.push([n, ...a]); return o(...a); }; } true;"""
    )
    page.click('.nav-item[data-view="library"]')
    page.wait_for_selector("#lib-body tr[data-id]")
    page.click("#lib-tracks-btn")
    page.wait_for_selector(".tr-prog")  # started automatically, once
    assert page.evaluate("window.__calls")[0] == ["build_tracklists", {"scope": "missing"}]
    page.wait_for_function("document.querySelector('.tr-prog .unit').textContent.includes('/')")
    page.click("[data-tr=cancel]")
    page.wait_for_selector("[data-tr=scan]")
    assert ["cancel_build_tracklists"] in page.evaluate("window.__calls")
    assert page.locator(".tr-empty").count() == 1  # still no tracklists: explained
    # by hand: «Read tracklists» -> done -> most played appears
    page.evaluate("HC.mock.speed.factor = 0.05")
    page.click(".tr-empty [data-tr=scan], .tr-status [data-tr=scan] >> nth=0")
    page.wait_for_selector(".tr-top-list li", timeout=10000)
    assert page.locator(".toast").last.inner_text()


def test_empty_library(page):  # noqa: F811
    page.evaluate("HC.mock.demo.libraryEmpty()")
    page.click('.nav-item[data-view="library"]')
    page.evaluate("HC.app.go('library', 'tracks')")
    page.wait_for_selector(".tr-empty [data-tr=discover]")
    assert page.locator(".tr-status [data-tr=scan]").is_disabled()
    page.evaluate("HC.mock.demo.libraryEmpty(false)")


def test_new_keys_in_every_complete_catalog():
    keys = [k for k in UI_REF if k.startswith("tracks.")]
    assert len(keys) >= 40
    for code in ("de", "fr", "ru", "zh-CN", "lv", "lt"):
        if parent_fallback(code):
            continue
        flat = flatten(ui_catalog(code)[1])
        assert not [k for k in keys if k not in flat], code
    de = flatten(ui_catalog("de")[1])
    assert "ß" not in "".join(str(de[k]) for k in keys)


@pytest.mark.parametrize("lang", ["de", "ru"])
def test_view_in_other_languages_has_no_missing_keys(browser, lang):  # noqa: F811
    context = browser.new_context(viewport={"width": 1100, "height": 700}, locale="en-US")
    p = context.new_page()
    msgs = []
    p.on("console", lambda m: msgs.append(m.text))
    p.on("pageerror", lambda e: msgs.append(str(e)))
    from test_festivals_ui import INDEX

    p.goto(INDEX.as_uri() + f"?mock=1&nosim=1&lang={lang}")
    p.wait_for_function("document.body.classList.contains('ready')")
    _tracks(p)
    _search(p, "stahlwerk")
    p.locator(".tr-set [data-tr=panel]").first.click()
    p.wait_for_selector(".tl-panel")
    # no horizontal overflow of the head at the minimum window size
    assert p.evaluate(
        "document.querySelector('.tr-top').scrollWidth <= document.querySelector('.tr-top').clientWidth + 1"
    )
    context.close()
    assert [m for m in msgs if "[i18n] missing" in m or "Error" in m] == []
