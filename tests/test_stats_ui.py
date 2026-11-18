# ruff: noqa: E501
"""v0.9.0 UI in a real browser against the mock backend (Playwright/Chromium, skipped if
unavailable): statistics view (KPIs, charts with text alternatives, range presets and custom
range, empty states, DJ link, reduced effects), settings tabs «Notifications» and «Media server»
(test, token never sent back, library choice, scan), the `navigate` event and catalog parity.
Every wait is on explicit state, never on timing."""

from __future__ import annotations

from test_festivals_ui import (
    browser,  # noqa: F401  (fixture)
    page,  # noqa: F401  (fixture)
)

from tests.test_i18n import UI_REF, flatten, parent_fallback, ui_catalog

SPY = """
window.__st = [];
for (const name of ['get_stats', 'test_media_server', 'scan_media_server', 'test_notification', 'forget_media_server_secret', 'save_settings']) {
  const orig = HC.mock.api[name];
  HC.mock.api[name] = (...args) => { window.__st.push([name, ...JSON.parse(JSON.stringify(args))]); return orig(...args); };
}
true;
"""
LOADED = (
    "n => HC.views.stats.state().loaded && +document.getElementById('v-stats').dataset.loaded >= n"
)


def _calls(pg, name):
    return [c[1:] for c in pg.evaluate("window.__st") if c[0] == name]


def _stats(pg):
    pg.evaluate("localStorage.removeItem('hc.stats')")
    pg.evaluate(SPY)
    pg.click('.nav-item[data-view="stats"]')
    pg.wait_for_selector("#st-months .st-col")


def _seq(pg):
    return int(pg.evaluate("+document.getElementById('v-stats').dataset.loaded || 0"))


def test_stats_view_kpis_charts_and_accessibility(page):  # noqa: F811
    _stats(page)
    assert page.evaluate("location.hash") == "#stats"
    sets = page.evaluate("HC.views.stats.state().data.totals.sets")
    assert sets > 500 and page.inner_text("#st-kpi-sets .st-kv") == f"{sets:,}"
    assert "GB" in page.inner_text("#st-kpi-size .st-kv")
    cols = page.locator("#st-months .st-col")
    assert cols.count() == 22
    # every bar has a text alternative and is reachable by keyboard; a table for screen readers
    labels = page.evaluate(
        "[...document.querySelectorAll('#st-months .st-col')].map((c) => [c.getAttribute('aria-label'), c.tabIndex])"
    )
    assert all(lbl and " sets · " in lbl and tab == 0 for lbl, tab in labels)
    assert page.locator("#st-months table.sr-only tr").count() == 22
    assert page.get_attribute("#st-sources svg", "role") == "img"
    assert "YouTube" in page.get_attribute("#st-sources svg", "aria-label")
    genres = page.locator("#st-genres .st-lt").all_inner_texts()
    assert genres[:3] == ["Hardstyle", "Hardcore", "Uptempo"]
    assert page.locator("#st-festivals li").count() == 10
    assert "other festivals" in page.inner_text("#st-festivals .st-foot")
    assert page.locator("#st-djs li[data-dj]").count() == 10
    assert page.locator("#st-tracks li").count() == 10
    assert page.locator("#st-watchlist tbody tr").count() >= 5
    # focus shows the value tooltip (no hover needed)
    page.focus("#st-months .st-col:nth-child(5)")
    page.wait_for_function(
        "getComputedStyle(document.activeElement.querySelector('.st-tip')).opacity === '1'"
    )
    assert [m for m in page.messages if m[0] in ("error", "pageerror")] == []


def test_range_presets_and_custom_range(page):  # noqa: F811
    _stats(page)
    n = _seq(page)
    page.click('#st-preset [data-p="12m"]')
    page.wait_for_function(LOADED, arg=n + 1)
    call = _calls(page, "get_stats")[-1][0]
    assert call["from"] and call["to"] is None
    assert page.evaluate("JSON.parse(localStorage.getItem('hc.stats')).preset") == "12m"
    twelve = page.locator("#st-months .st-col").count()
    assert 12 <= twelve <= 13
    page.click('#st-preset [data-p="custom"]')
    page.wait_for_function(LOADED, arg=n + 2)
    page.fill("#st-from", "2019-01-01")
    page.fill("#st-to", "2019-12-31")
    page.dispatch_event("#st-to", "change")
    page.wait_for_selector("#st-zero")
    assert _calls(page, "get_stats")[-1][0] == {"from": "2019-01-01", "to": "2019-12-31"}
    assert page.inner_text("#st-kpi-sets .st-kv") == "0"
    assert page.locator("#st-months").count() == 0  # no empty chart cards, only the watchlist
    assert page.locator("#st-watchlist").count() == 1
    assert page.evaluate("document.getElementById('v-stats').classList.contains('st-custom-on')")
    m = _seq(page)
    page.click('#st-preset [data-p="all"]')
    page.wait_for_function(LOADED, arg=m + 1)
    assert page.is_hidden("#st-custom")
    assert _calls(page, "get_stats")[-1][0] == {"from": None, "to": None}


def test_empty_library_and_dj_link(page):  # noqa: F811
    _stats(page)
    page.click('#st-djs li[data-dj="headhunterz"]')
    page.wait_for_function(
        "location.hash === '#library/dj-headhunterz' && document.querySelector('.dj-title h2')"
    )
    page.evaluate("HC.mock.demo.libraryEmpty()")
    page.click('.nav-item[data-view="stats"]')
    page.wait_for_selector("#st-empty")
    page.click("#st-empty [data-go=discover]")
    page.wait_for_function("document.body.dataset.view === 'discover'")


def test_reduced_effects_switch_off_the_animation(page):  # noqa: F811
    page.evaluate(
        "HC.app.applyAppearance({reduce_effects: true, scanlines: false, pulse_bpm: 200})"
    )
    _stats(page)
    assert not page.evaluate("document.getElementById('v-stats').classList.contains('st-anim')")
    assert (
        page.evaluate("getComputedStyle(document.querySelector('#st-months .st-bar')).transform")
        == "none"
    )


def test_navigate_event_and_shortcut(page):  # noqa: F811
    page.evaluate("window.mv.emit('navigate', {view: 'inbox'})")
    page.wait_for_function("document.body.dataset.view === 'inbox'")
    page.evaluate("window.mv.emit('navigate', {view: 'nope'})")
    page.keyboard.press("Control+6")
    page.wait_for_function("document.body.dataset.view === 'stats'")
    page.keyboard.press("Control+7")
    page.wait_for_function("document.body.dataset.view === 'log'")


def test_notification_settings_tab(page):  # noqa: F811
    page.evaluate(SPY)
    page.click('.nav-item[data-view="settings"]')
    page.click('.stab[data-tab="notifications"]')
    page.wait_for_selector("[data-custom=notifyStatus] [data-ntest]")
    assert page.is_disabled('.field[data-k="notifications.quiet_from"] [data-c]')
    page.click('.field[data-k="notifications.quiet_hours"] [data-c]')
    page.wait_for_function(
        "!document.querySelector('.field[data-k=\"notifications.quiet_from\"] [data-c]').disabled"
    )
    page.fill('.field[data-k="notifications.quiet_to"] [data-c]', "7:00")
    page.click("#btn-save")
    page.wait_for_selector('.field[data-k="notifications.quiet_to"].has-error')
    page.fill('.field[data-k="notifications.quiet_to"] [data-c]', "06:30")
    page.click("#btn-save")
    page.wait_for_function("document.querySelector('#btn-save').disabled")
    assert _calls(page, "save_settings")[-1][0]["notifications"]["quiet_to"] == "06:30"
    page.click("[data-ntest]")
    page.wait_for_selector("[data-custom=notifyStatus] .notice.ok")
    page.evaluate("HC.mock.demo.notifyAvailable(false)")
    page.click('.stab[data-tab="general"]')
    page.click('.stab[data-tab="notifications"]')
    page.wait_for_selector("[data-custom=notifyStatus] .statebox.warn")


def test_media_server_settings_flow(page):  # noqa: F811
    page.evaluate(SPY)
    page.click('.nav-item[data-view="settings"]')
    page.click('.stab[data-tab="mediaserver"]')
    page.wait_for_selector("[data-custom=msStatus] .statebox.off")
    assert page.is_hidden('.field[data-k="media_server.url"]')
    assert page.is_hidden("[data-custom=msConnect]")
    page.click('.field[data-k="media_server.type"] [data-v="jellyfin"]')
    page.wait_for_selector("#ms-secret")
    assert page.inner_text("[data-custom=msConnect]").startswith("Jellyfin API key")
    # wrong token: error, nothing stored
    page.fill('.field[data-k="media_server.url"] [data-c]', "http://nas:8096")
    page.fill("#ms-secret", "wrong-key")
    page.click("[data-mstest]")
    page.wait_for_selector("[data-custom=msConnect] .notice.error")
    page.fill("#ms-secret", "a1b2c3")
    page.click("[data-mstest]")
    page.wait_for_selector("[data-custom=msConnect] .notice.ok")
    call = _calls(page, "test_media_server")[-1][0]
    assert call == {
        "type": "jellyfin",
        "url": "http://nas:8096",
        "secret": "a1b2c3",
        "verify_tls": True,
    }
    # the typed key is cleared after storing; the music library is preselected
    page.wait_for_selector("[data-custom=msConnect] .ok-tag")
    assert page.input_value("#ms-secret") == ""
    assert page.input_value("#ms-lib") == "f137a2dd21bbc1b99aa5c0f6bf02a805"
    page.select_option("#ms-lib", "")
    page.click("#btn-save")
    page.wait_for_function("document.querySelector('#btn-save').disabled")
    saved = _calls(page, "save_settings")[-1][0]["media_server"]
    assert (
        saved["type"] == "jellyfin"
        and saved["library"] == ""
        and "secret" not in str(saved).lower()
    )
    page.wait_for_selector("[data-custom=msStatus] [data-msscan]:not([disabled])")
    page.click("[data-msscan]")
    page.wait_for_selector("[data-custom=msStatus] .notice.ok")
    assert len(_calls(page, "scan_media_server")) == 1
    page.click("[data-msforget]")
    page.wait_for_function("!document.querySelector('[data-custom=msConnect] .ok-tag')")
    assert _calls(page, "forget_media_server_secret") == [["jellyfin"]]


def test_catalog_parity_of_new_keys():
    new = [
        k
        for k in UI_REF
        if k.startswith(
            (
                "stats.",
                "set.ms.",
                "set.notify.",
                "set.notifications.",
                "set.media_server.",
                "opt.media_server.",
            )
        )
    ]
    new += [
        "nav.stats",
        "tabs.notifications",
        "tabs.mediaserver",
        "tabs_hint.notifications",
        "tabs_hint.mediaserver",
    ]
    assert len(new) > 100
    from app.core import i18n

    for code in i18n.SUPPORTED:
        if code == "en" or parent_fallback(code):
            continue
        flat = flatten(ui_catalog(code)[1])
        missing = [k for k in new if k not in flat]
        assert missing == [], f"{code}: {missing[:5]}"
