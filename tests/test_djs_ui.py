# ruff: noqa: E501
"""DJ pages and playlist export UI (v0.8.0) in a real browser against the mock backend
(Playwright/Chromium, skipped if unavailable): DJ list (search by alias, sort, hidden),
DJ page (aliases, b2b, play all, export, watchlist confirmation, split, merge, edit),
the export dialog (relative/absolute, overwrite question inside the dialog), the export
buttons of the library and «Continue listening», saved playlists in the settings, XSS safety
and catalog parity. Every wait is on explicit state, never on timing."""

from __future__ import annotations

from test_festivals_ui import (
    browser,  # noqa: F401  (fixture)
    page,  # noqa: F401  (fixture)
)

from tests.test_i18n import UI_REF, flatten, parent_fallback, ui_catalog

SPY = """
window.__dj = [];
for (const name of ['preview_playlist', 'export_playlist', 'save_source', 'split_artist', 'merge_artists',
  'save_artist', 'hide_artist', 'set_playlist_sync', 'get_artist_watch']) {
  const orig = HC.mock.api[name];
  HC.mock.api[name] = (...args) => { window.__dj.push([name, ...JSON.parse(JSON.stringify(args))]); return orig(...args); };
}
true;
"""


def _calls(pg, name):
    return [c[1:] for c in pg.evaluate("window.__dj") if c[0] == name]


def _djs(pg):
    pg.click('.nav-item[data-view="library"]')
    pg.wait_for_selector("#lib-body tr[data-id]")
    pg.evaluate(SPY)
    pg.click("#lib-djs-btn")
    pg.wait_for_selector(".dj-card")


def _open(pg, key):
    pg.click(f'.dj-card[data-key="{key}"]')
    pg.wait_for_function(
        "k => location.hash === '#library/dj-' + k && document.querySelector('.dj-set')", arg=key
    )


def _toast(pg, text):
    pg.wait_for_function(
        "t => [...document.querySelectorAll('.toast')].some((x) => x.textContent.includes(t))",
        arg=text,
    )


def test_dj_list_search_sort_and_route(page):  # noqa: F811
    _djs(page)
    assert page.evaluate("location.hash") == "#library/djs"
    assert page.is_hidden("#lib-body")
    names = page.locator(".dj-card b").all_inner_texts()
    assert {"Headhunterz", "Angerfist", "Sub Zero Project", "Miss K8"} <= set(names)
    assert "Kickdrum Collective" not in names  # hidden in the mock
    # mix channels and show names are no DJs
    assert not {"Euphoria Sounds", "Overdrive", "Rise of the Celestials"} & set(names)
    page.fill("#dj-q", "hh")
    page.wait_for_function("document.querySelectorAll('.dj-card').length === 1")
    assert page.inner_text(".dj-card b") == "Headhunterz"
    page.fill("#dj-q", "")
    page.wait_for_function("document.querySelectorAll('.dj-card').length > 5")
    page.click('#dj-sort [data-sort="name"]')
    page.wait_for_function(
        "document.querySelector('#dj-sort [data-sort=name]').classList.contains('on')"
    )
    page.wait_for_function(
        "() => { const n = [...document.querySelectorAll('.dj-card b')].map((b) => b.textContent);"
        " return n.length > 5 && n.every((x, i) => !i || n[i - 1].localeCompare(x, 'en', {sensitivity: 'base'}) <= 0); }"
    )
    # hidden DJs: chip -> list -> show again
    page.click("#dj-hidden")
    page.wait_for_selector('.dj-card[data-key="kickdrumcollective"]')
    page.click('.dj-card[data-key="kickdrumcollective"] [data-unhide]')
    page.wait_for_function("document.querySelector('#dj-hidden').hidden")
    assert _calls(page, "hide_artist") == [["kickdrumcollective", False]]
    page.click("[data-dj=back]")
    page.wait_for_selector("#lib-body tr[data-id]")
    assert not page.evaluate("document.getElementById('v-library').classList.contains('djing')")


def test_dj_page_b2b_aliases_and_play_all(page):  # noqa: F811
    _djs(page)
    _open(page, "headhunterz")
    assert page.inner_text(".dj-title h2") == "Headhunterz"
    assert page.locator(".dj-alias").all_inner_texts()[0].startswith("HH")
    groups = page.locator(".dj-group .section-label span:not(.mono)").all_inner_texts()
    assert "Defqon.1" in groups and "Reverze" in groups
    # «HH @ Reverze 2023» counts for Headhunterz
    assert any("HH @ Reverze" in t for t in page.locator(".dj-set b").all_inner_texts())
    page.click("[data-dj=playall]")
    page.wait_for_function("HC.player.queue() && HC.player.state().id === HC.player.queue().ids[0]")
    q = page.evaluate("HC.player.queue()")
    assert len(q["ids"]) == page.locator(".dj-set:not(.missing)").count() and q["i"] == 0
    page.wait_for_function("!document.querySelector('#pl-queue').hidden")
    assert page.inner_text("#pl-queue") == f"1/{len(q['ids'])}"
    # the end of a set starts the next one
    page.evaluate("HC.player.audio.dispatchEvent(new Event('ended'))")
    page.wait_for_function(
        "HC.player.queue() && HC.player.queue().i === 1 && HC.player.state().id === HC.player.queue().ids[1]"
    )
    # b2b on Angerfist's page
    page.click("[data-dj=list]")
    page.wait_for_selector(".dj-card")
    _open(page, "angerfist")
    role = page.locator(".dj-role")
    assert role.count() == 1 and "Miss K8" in role.inner_text()
    # choosing another set by hand ends «Play all»
    page.locator(".dj-set [data-play]").first.click()
    page.wait_for_function("HC.player.queue() === null")


def test_export_dialog_overwrite_and_absolute(page):  # noqa: F811
    _djs(page)
    _open(page, "angerfist")
    page.click("[data-dj=export]")
    page.wait_for_selector(".pl-dlg")
    assert page.input_value("#pl-name") == "Angerfist"
    assert page.input_value("#pl-folder").endswith("\\Playlists")
    assert page.get_attribute('#pl-rel [data-rel="1"]', "aria-checked") == "true"
    page.click(".modal [data-act=ok]")
    page.wait_for_selector(".pl-dlg", state="detached")
    _toast(page, "Angerfist.m3u8")
    first = _calls(page, "export_playlist")[0]
    assert first[0] == {"kind": "artist", "key": "angerfist"}
    assert first[1]["relative"] is True and first[1]["overwrite"] is False

    # same file again: the dialog asks itself, a second click overwrites
    page.click("[data-dj=export]")
    page.wait_for_selector(".pl-dlg")
    page.click(".modal [data-act=ok]")
    page.wait_for_selector("#pl-msg .notice")
    assert page.inner_text(".modal [data-act=ok]").lower() == "overwrite"
    page.click('#pl-rel [data-rel="0"]')
    page.click("#pl-sync")
    page.click(".modal [data-act=ok]")
    page.wait_for_selector(".pl-dlg", state="detached")
    last = _calls(page, "export_playlist")[-1][1]
    assert last["overwrite"] is True and last["relative"] is False and last["sync"] is True

    # another drive with relative paths: the toast names the absolute fallback
    page.click("[data-dj=export]")
    page.wait_for_selector(".pl-dlg")
    page.fill("#pl-folder", "E:\\USB\\Lists")
    page.click('#pl-rel [data-rel="1"]')
    page.click(".modal [data-act=ok]")
    page.wait_for_selector(".pl-dlg", state="detached")
    _toast(page, "on another drive")

    # settings: the saved playlists, «Keep up to date» per playlist
    page.click('.nav-item[data-view="settings"]')
    page.click('.stab[data-tab="storage"]')
    page.wait_for_selector(".pl-saved li")
    assert page.locator(".pl-saved li").count() == 2
    page.locator(".pl-saved [data-pls]").first.click()
    page.wait_for_function("window.__dj.some((c) => c[0] === 'set_playlist_sync')")


def test_library_export_specs(page):  # noqa: F811
    page.click('.nav-item[data-view="library"]')
    page.wait_for_selector("#lib-body tr[data-id]")
    page.evaluate(SPY)
    page.select_option("#lib-genre", "Hardcore")
    page.wait_for_function("document.getElementById('lib-clear').hidden === false")
    page.click("#lib-export")
    page.wait_for_selector(".pl-dlg")
    assert _calls(page, "preview_playlist")[-1] == [{"kind": "genre", "genre": "Hardcore"}]
    assert page.input_value("#pl-name") == "Hardcore"
    page.keyboard.press("Escape")
    page.fill("#lib-q", "defqon")
    page.wait_for_function("document.querySelectorAll('#lib-body tr[data-id]').length > 0")
    page.click("#lib-export")
    page.wait_for_selector(".pl-dlg")
    spec = _calls(page, "preview_playlist")[-1][0]
    assert spec["kind"] == "filter" and spec["filters"] == {"search": "defqon", "genre": "Hardcore"}
    page.keyboard.press("Escape")
    # festival view: the selected edition
    page.click("#lib-clear")
    page.click('#lib-groupby [data-g="festival"]')
    page.wait_for_selector(".fest-tile")
    page.locator('.fest-tile:has(.ft-name:text-is("Defqon.1"))').click()
    page.wait_for_selector(".fest-line button.on")
    page.click("#lib-export")
    page.wait_for_selector(".pl-dlg")
    spec = _calls(page, "preview_playlist")[-1][0]
    assert spec["kind"] == "edition" and isinstance(spec["edition_id"], int)
    assert page.input_value("#pl-name") == "Defqon.1 2024"
    page.keyboard.press("Escape")


def test_watchlist_confirmation_split_merge_and_edit(page):  # noqa: F811
    _djs(page)
    _open(page, "headhunterz")
    page.click("[data-dj=watch]")
    page.wait_for_selector(".modal .dj-target")
    assert page.inner_text(".modal .dj-target") == "Headhunterz live set"
    page.click(".modal [data-act=ok]")
    _toast(page, "Added to the watchlist")
    saved = _calls(page, "save_source")[0][0]
    assert saved["type"] == "search" and saved["url_or_query"] == "Headhunterz live set"
    assert saved["auto_download"] is False
    page.click("[data-dj=watch]")
    _toast(page, "Already in the watchlist")
    assert len(_calls(page, "save_source")) == 1

    # split the alias «HH»: the set «HH @ Reverze 2023» is its own DJ again
    page.click('.dj-alias [data-split="HH"]')
    page.click(".modal [data-act=ok]")
    page.wait_for_function("!document.querySelector('.dj-alias')")
    assert _calls(page, "split_artist") == [["headhunterz", "HH"]]
    page.click("[data-dj=list]")
    page.wait_for_selector('.dj-card[data-key="hh"]')
    # merge it back
    _open(page, "hh")
    page.click("[data-dj=more]")
    page.click('.menu [data-k="merge"]')
    page.wait_for_selector("#dj-merge")
    page.select_option("#dj-merge", "headhunterz")
    page.click(".modal [data-act=ok]")
    page.wait_for_function(
        "location.hash === '#library/dj-headhunterz' && document.querySelector('.dj-alias')"
    )
    assert _calls(page, "merge_artists") == [[["hh"], "headhunterz"]]

    # edit: add an alias, an alias of another saved DJ is refused inside the dialog
    page.click("[data-dj=more]")
    page.click('.menu [data-k="edit"]')
    page.wait_for_selector("#dj-f-aliases input")
    page.fill("#dj-f-aliases input", "Miss K8")
    page.keyboard.press("Enter")
    page.click(".modal [data-act=ok]")
    page.wait_for_selector("#dj-f-msg .notice")
    assert "Miss K8" in page.inner_text("#dj-f-msg")
    page.keyboard.press("Escape")


def test_new_act_is_escaped(page):  # noqa: F811
    _djs(page)
    evil = '<img src=x onerror="window.__xss=1">'
    page.click("[data-dj=add]")
    page.wait_for_selector("#dj-f-name")
    page.fill("#dj-f-name", evil)
    page.click(".modal [data-act=ok]")
    page.wait_for_selector("#dj-f-name", state="detached")
    _toast(page, "Saved")
    assert page.evaluate("window.__xss") is None
    assert page.locator(".dj-grid img").count() == 0


def test_continue_listening_export(page):  # noqa: F811
    page.click('.nav-item[data-view="library"]')
    page.wait_for_selector("#lib-continue [data-cl]")
    page.evaluate(SPY)
    page.click("#lib-continue [data-cl-export]")
    page.wait_for_selector(".pl-dlg")
    assert _calls(page, "preview_playlist")[-1] == [{"kind": "continue"}]
    page.keyboard.press("Escape")


def test_new_keys_in_every_catalog():
    from app.core import i18n

    new = [
        k
        for k in UI_REF
        if k.startswith(
            (
                "djs.",
                "pl.",
                "set.playlists",
                "set.h.playlists",
                "library.export",
                "collector.export",
                "player.queue",
            )
        )
    ]
    assert len(new) > 100
    for code in i18n.SUPPORTED:
        if parent_fallback(code):
            continue
        flat = flatten(ui_catalog(code)[1])
        missing = [k for k in new if k not in flat and not any(x.startswith(k + ".") for x in flat)]
        assert not missing, (code, missing[:5])
