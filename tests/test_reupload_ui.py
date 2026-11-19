# ruff: noqa: E501
"""v0.10.0 UI in a real browser against the mock backend (Playwright/Chromium, skipped if
unavailable): Mixcloud/hearthis.at in the platform switch, status bar and settings, the
re-upload mark in the library (menu: keep both / link / delete new), the «Re-uploads» filter,
the downloads notice and the library pass with progress and cancel. Every wait is on explicit
state, never on timing."""

from __future__ import annotations

from test_festivals_ui import (
    browser,  # noqa: F401  (fixture)
    page,  # noqa: F401  (fixture)
)

from tests.test_i18n import UI_REF, flatten, ui_catalog

SPY = """
window.__ru = [];
for (const name of ['search', 'resolve_reupload', 'fingerprint_library', 'cancel_fingerprint_library', 'get_reuploads', 'save_settings']) {
  const orig = HC.mock.api[name];
  HC.mock.api[name] = (...args) => { window.__ru.push([name, ...JSON.parse(JSON.stringify(args))]); return orig(...args); };
}
true;
"""
REUP = "mc:rawstyle_radio_euphoric-yearmix-2026-reupload"
LINKED = "ht:4003"


def _calls(pg, name):
    return [c[1:] for c in pg.evaluate("window.__ru") if c[0] == name]


def _library(pg):
    pg.evaluate(SPY)
    pg.click('.nav-item[data-view="library"]')
    pg.wait_for_selector(f'#lib-body tr[data-id="{REUP}"] .ru-tag')


def test_platform_switch_searches_mixcloud_and_hearthis(page):  # noqa: F811
    page.evaluate(SPY)
    page.click('.nav-item[data-view="discover"]')
    page.wait_for_selector('#plat [data-p="hearthis"]')
    assert page.evaluate(
        "[...document.querySelectorAll('#plat button')].map((b) => b.textContent.trim())"
    ) == [
        "YouTube",
        "SoundCloud",
        "Mixcloud",
        "hearthis.at",
    ]
    for plat, prefix in (("mixcloud", "mc:"), ("hearthis", "ht:")):
        page.click(f'#plat [data-p="{plat}"]')
        page.wait_for_function(
            "p => document.getElementById('v-discover').dataset.platform === p", arg=plat
        )
        assert (
            plat.replace("hearthis", "hearthis.at").lower()
            in page.get_attribute("#q", "placeholder").lower()
        )
        page.fill("#q", "hardcore mix")
        page.click("#btn-search")
        page.wait_for_function(
            "pre => [...document.querySelectorAll('#grid .card[data-id]')].length && [...document.querySelectorAll('#grid .card[data-id]')].every((c) => c.dataset.id.startsWith(pre))",
            arg=prefix,
        )
        assert _calls(page, "search")[-1][1]["platform"] == plat
        badge = page.locator("#grid .card .pbadge").first
        assert badge.inner_text().strip() == {"mixcloud": "MC", "hearthis": "HT"}[plat]
    # a Mixcloud Select upload is never loadable and says why
    page.click('#plat [data-p="mixcloud"]')
    page.uncheck("#f-hide")
    page.wait_for_selector('#grid .card[data-id="mc:DJ_Thera_select-exclusive-mix"] .cnote.prev')
    assert "Subscribers only" in page.inner_text(
        '#grid .card[data-id="mc:DJ_Thera_select-exclusive-mix"] .cnote'
    )
    assert page.is_disabled(
        '#grid .card[data-id="mc:DJ_Thera_select-exclusive-mix"] [data-act="dl"]'
    )


def test_disabled_platform_is_off_in_switch_and_hidden_in_status_bar(page):  # noqa: F811
    page.wait_for_selector("#sb-mc-it:not([hidden])")  # Mixcloud has a download today in the mock
    assert page.is_hidden("#sb-ht-it")  # hearthis.at: no activity today -> no space taken
    page.evaluate(
        "(() => { const v = JSON.parse(JSON.stringify(HC.settings.values)); v.mixcloud.enabled = false;"
        " return HC.mock.api.save_settings(v).then(() => HC.app.settingsSaved(v)); })()"
    )
    page.evaluate("HC.app.refreshStatus()")
    page.wait_for_function("!HC.platform.enabled('mixcloud')")
    page.wait_for_selector("#sb-mc-it[hidden]", state="attached")
    page.click('.nav-item[data-view="discover"]')
    page.wait_for_selector('#plat [data-p="mixcloud"].off[aria-disabled="true"]')
    page.dispatch_event(
        '#plat [data-p="mixcloud"]', "click"
    )  # aria-disabled: Playwright would refuse
    page.wait_for_selector(".toast")
    assert "Mixcloud is turned off" in page.inner_text(".toast")
    assert page.evaluate("document.getElementById('v-discover').dataset.platform") == "youtube"


def test_settings_more_sources_and_reupload_tabs(page):  # noqa: F811
    page.click('.nav-item[data-view="settings"]')
    page.click('.stab[data-tab="sources"]')
    page.wait_for_selector('.field[data-k="hearthis.backoff_max_hours"]')
    assert page.inner_text('.field[data-k="mixcloud.enabled"] .fl b') == "Use Mixcloud"
    assert "hearthis.at" in page.inner_text('.field[data-k="hearthis.sleep_requests"] .help')
    assert page.locator("[data-custom=backoff]").count() == 2
    page.click('.stab[data-tab="reupload"]')
    page.wait_for_selector('[data-custom=reuploadStatus] [data-fp="new"]')
    assert "files fingerprinted" in page.inner_text("[data-custom=reuploadStatus]").lower()
    for k in (
        "reupload.enabled",
        "reupload.precheck",
        "reupload.head_minutes",
        "reupload.windows",
        "reupload.min_score",
    ):
        assert page.locator(f'.field[data-k="{k}"]').count() == 1
    # the library pass: progress, then cancel
    page.evaluate(SPY)
    page.click('[data-custom=reuploadStatus] [data-fp="new"]')
    page.wait_for_selector('[data-custom=reuploadStatus] [data-fp="cancel"]')
    page.wait_for_selector("[data-custom=reuploadStatus] .progress .bar")
    assert _calls(page, "fingerprint_library") == [[{"scope": "new"}]]
    page.click('[data-custom=reuploadStatus] [data-fp="cancel"]')
    page.wait_for_selector('[data-custom=reuploadStatus] [data-fp="new"]')
    assert _calls(page, "cancel_fingerprint_library") == [[]]
    page.wait_for_selector(".toast")


def test_reupload_mark_keep_link_and_undo(page):  # noqa: F811
    _library(page)
    tag = f'#lib-body tr[data-id="{REUP}"] .ru-tag'
    assert (
        page.inner_text(tag).strip() == "RE-UPLOAD?"
        or page.inner_text(tag).strip().lower() == "re-upload?"
    )
    assert "Euphoric Hardstyle Yearmix 2026" in page.get_attribute(tag, "title")
    assert "linked" in page.get_attribute(f'#lib-body tr[data-id="{LINKED}"] .ru-tag', "class")
    page.click(tag)
    page.wait_for_selector('.menu [data-k="ru-keep"]')
    assert "47 %" in page.inner_text(".menu")
    page.click('.menu [data-k="ru-link"]')
    page.wait_for_selector(f'#lib-body tr[data-id="{REUP}"] .ru-tag.linked')
    assert _calls(page, "resolve_reupload") == [[REUP, "link"]]
    page.click(f'#lib-body tr[data-id="{REUP}"] .ru-tag')
    page.wait_for_selector('.menu [data-k="ru-open"]')
    page.click('.menu [data-k="ru-open"]')
    page.wait_for_selector(f'#lib-body tr[data-id="{REUP}"] .ru-tag:not(.linked)')
    page.click(tag)
    page.click('.menu [data-k="ru-keep"]')
    page.wait_for_function(
        'id => !document.querySelector(`#lib-body tr[data-id="${id}"] .ru-tag`)', arg=REUP
    )
    assert [c[1] for c in _calls(page, "resolve_reupload")] == ["link", "open", "keep"]


def test_reupload_filter_show_original_and_delete_new(page):  # noqa: F811
    _library(page)
    page.wait_for_selector("#lib-reup:not([hidden])")
    assert page.inner_text("#lib-reup").strip().upper() == "RE-UPLOADS (1)"
    page.click("#lib-reup")
    page.wait_for_function("document.querySelectorAll('#lib-body tr[data-id]').length === 1")
    page.click("#lib-reup")
    page.wait_for_function("document.querySelectorAll('#lib-body tr[data-id]').length > 10")
    # show the original: search for its title, the original row is there
    page.click(f'#lib-body tr[data-id="{REUP}"] .ru-tag')
    page.click('.menu [data-k="ru-show"]')
    page.wait_for_selector('#lib-body tr[data-id="eEuph0ric26"]')
    assert page.input_value("#lib-q") == "Euphoric Hardstyle Yearmix 2026"
    # delete the newer file: confirmation, then gone; the original stays
    page.click(f'#lib-body tr[data-id="{REUP}"] .ru-tag')
    page.click('.menu [data-k="ru-del"]')
    page.wait_for_selector(".modal")
    assert "Euphoric Hardstyle Yearmix 2026" in page.inner_text(".modal")
    page.click(".modal [data-act=ok]")
    page.wait_for_function(
        'id => !document.querySelector(`#lib-body tr[data-id="${id}"]`)', arg=REUP
    )
    assert _calls(page, "resolve_reupload")[-1] == [REUP, "delete_new"]
    assert page.locator('#lib-body tr[data-id="eEuph0ric26"]').count() == 1
    page.wait_for_selector("#lib-reup[hidden]", state="attached")


def test_reupload_original_missing_blocks_delete_and_offers_adopt(page):  # noqa: F811
    """M1: with the original file missing «Delete this newer file» is disabled; the menu
    explains why and offers «keep this copy» (adopt), which drops the missing original."""
    page.evaluate(f"HC.mock.demo.reuploadOriginal({REUP!r}, 'missing')")
    _library(page)
    page.click(f'#lib-body tr[data-id="{REUP}"] .ru-tag')
    page.wait_for_selector('.menu [data-k="ru-adopt"]')
    assert page.is_disabled('.menu [data-k="ru-del"]')
    assert "original file is missing" in page.inner_text(".menu").lower()
    page.click('.menu [data-k="ru-adopt"]')
    page.wait_for_function(
        'id => !document.querySelector(`#lib-body tr[data-id="${id}"] .ru-tag`)', arg=REUP
    )
    assert _calls(page, "resolve_reupload") == [[REUP, "adopt"]]
    page.wait_for_function("!document.querySelector('#lib-body tr[data-id=\"eEuph0ric26\"]')")
    page.evaluate(f"HC.mock.demo.reuploadOriginal({REUP!r}, 'unknown')")  # no mark left: no-op


def test_downloads_notice_links_to_library_filter(page):  # noqa: F811
    page.evaluate(SPY)
    page.click('.nav-item[data-view="downloads"]')
    page.wait_for_selector("#q-reup:not([hidden])")
    assert "(1)" in page.inner_text("#q-reup")
    page.click('#q-reup [data-goto="library/reuploads"]')
    page.wait_for_selector("#lib-reup.on")
    page.wait_for_function("document.querySelectorAll('#lib-body tr[data-id]').length === 1")


def test_new_keys_exist_in_every_complete_catalog():
    keys = [
        k
        for k in UI_REF
        if k.startswith(("reupload.", "set.reupload.", "set.platform.", "dlg.reupload_del."))
    ]
    assert len(keys) > 50
    for code in ("de", "fr", "ru", "zh-CN", "fi", "et"):
        flat = flatten(ui_catalog(code)[1])
        assert [k for k in keys if k not in flat] == [], code


def test_generic_platform_fields_have_label_and_help():
    """Mixcloud/hearthis.at settings use generic texts (`lk: platform.<field>`, {p} = name)."""
    import re
    from pathlib import Path

    src = (Path(__file__).parent.parent / "ui" / "js" / "views" / "settings.js").read_text(
        encoding="utf-8"
    )
    fields = set(re.findall(r"\bf\('([a-z_]+)'", src))
    assert {"enabled", "sleep_requests", "backoff_max_hours"} <= fields
    missing = [
        f"set.platform.{k}.{part}"
        for k in fields
        for part in ("label", "help")
        if f"set.platform.{k}.{part}" not in UI_REF
    ]
    assert missing == []
