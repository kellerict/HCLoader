"""«Cleaner» UI (docs/design/clean-ui.md) in a real browser against the mock backend
(Playwright/Chromium, skipped if unavailable): collapsed status bar with its popover, library
sections next to the title, calm genre cell, grouped settings tabs, quiet reset buttons.
Nothing was removed, only moved – these tests pin where everything went.

Row menus of the watchlist: tests/test_backfill_ui.py · keyword block: tests/test_discover_ui.py."""

import os
from pathlib import Path

import pytest

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
GROUPS = [
    ("App", ["general", "appearance", "playback", "notifications"]),
    ("Find & sort", ["filters", "genres", "festivals", "reupload"]),
    ("Download", ["download", "storage", "throttle", "network", "schedule"]),
    ("Sources & servers", ["soundcloud", "sources", "mediaserver"]),
    ("System", ["maintenance"]),
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


def _open(browser, query="?mock=1&nosim=1&lang=en", width=1440, height=900):
    context = browser.new_context(viewport={"width": width, "height": height}, locale="en-US")
    p = context.new_page()
    p.messages = []
    p.on("console", lambda m: p.messages.append((m.type, m.text)))
    p.on("pageerror", lambda exc: p.messages.append(("pageerror", str(exc))))
    p.goto(INDEX.as_uri() + query)
    p.wait_for_function("document.body.classList.contains('ready')")
    p.wait_for_function("HC.bridge.pending === 0")
    return context, p


@pytest.fixture
def page(browser):
    context, p = _open(browser)
    yield p
    bad = [m for m in p.messages if m[0] in ("error", "pageerror") or "[i18n] missing" in m[1]]
    context.close()
    assert bad == []


def _go(page, view):
    page.click(f'.nav-item[data-view="{view}"]')
    page.wait_for_selector(f"#v-{view}.active")
    page.wait_for_function("HC.bridge.pending === 0")


# --------------------------------------------------------------------------- status bar


def test_status_bar_collapses_tools_into_system_ok(page):
    page.wait_for_selector("#sb-sys:not([hidden])")
    assert page.inner_text("#sb-sys").split() == ["System", "OK"]
    for tool in ("deno", "ffmpeg", "pot"):
        assert page.is_hidden(f"#sb-{tool}-it")
    assert page.is_hidden("#sb-backoff-it")  # «Backoff none» is no information
    assert page.is_visible("#sb-ytdlp-it")  # the version stays in the bar
    # the single values are one hover away …
    title = page.get_attribute("#sb-sys", "title")
    assert "Deno OK" in title and "ffmpeg OK" in title and "PO token active" in title
    # … and what the sidebar used to repeat lives only here now
    assert page.locator("#nf-today, #nf-next").count() == 0
    assert page.is_visible("#sb-day-it") and page.is_visible("#sb-next")


def test_system_popover_by_mouse_and_keyboard(page):
    page.wait_for_selector("#sb-sys:not([hidden])")
    assert page.get_attribute("#sb-sys", "aria-expanded") == "false"
    page.click("#sb-sys")
    page.wait_for_selector(".sb-pop")
    assert page.get_attribute("#sb-sys", "aria-expanded") == "true"
    rows = page.eval_on_selector_all(".sb-pop .sb-row .k", "els => els.map(e => e.textContent)")
    assert rows == ["yt-dlp", "Deno", "ffmpeg", "PO token", "Backoff"]
    assert page.locator(".sb-pop .sb-row .led.err").count() == 0
    assert "none" in page.inner_text(".sb-pop .sb-row:last-child")
    # the popover opens upwards and stays inside the window
    box = page.evaluate(
        "(() => { const r = document.querySelector('.sb-pop').getBoundingClientRect();"
        " const f = document.querySelector('footer').getBoundingClientRect();"
        " return [r.left, r.bottom, f.top]; })()"
    )
    assert box[0] >= 0 and box[1] <= box[2]
    page.click("#sb-sys")  # the same button closes it again
    page.wait_for_selector(".sb-pop", state="detached")
    assert page.get_attribute("#sb-sys", "aria-expanded") == "false"
    page.focus("#sb-sys")
    page.keyboard.press("Enter")
    page.wait_for_selector(".sb-pop[data-armed]")  # Escape is handled from here on
    page.keyboard.press("Escape")
    page.wait_for_selector(".sb-pop", state="detached")
    assert page.evaluate("document.activeElement.id") == "sb-sys"


def test_status_bar_expands_when_a_tool_is_missing(page):
    page.wait_for_selector("#sb-sys:not([hidden])")
    page.click("#sb-sys")
    page.wait_for_selector(".sb-pop")
    page.evaluate("HC.mock.demo.tools({deno_ok: false})")
    page.wait_for_selector("#sb-deno-it:not([hidden])")
    assert page.is_hidden("#sb-sys")
    assert page.locator(".sb-pop").count() == 0  # the details are in the bar now
    assert page.is_visible("#sb-ffmpeg-it") and page.is_visible("#sb-pot-it")
    assert "missing" in page.inner_text("#sb-deno-it")
    assert "bad" in page.get_attribute("#sb-deno-it", "class")
    assert "bad" not in page.get_attribute("#sb-ffmpeg-it", "class")
    page.evaluate("HC.mock.demo.tools()")
    page.wait_for_selector("#sb-sys:not([hidden])")
    assert page.is_hidden("#sb-deno-it")


def test_backoff_only_shows_while_one_is_active(page):
    page.wait_for_selector("#sb-sys:not([hidden])")
    assert page.is_hidden("#sb-backoff-it")
    page.evaluate("HC.mock.demo.backoff(6)")
    page.wait_for_selector("#sb-backoff-it.alert:not([hidden])")
    assert "left" in page.inner_text("#sb-backoff-it")
    assert page.is_visible("#sb-sys")  # a backoff is no broken tool
    page.click("#sb-sys")
    page.wait_for_selector(".sb-pop[data-armed] .sb-row .led.warn")
    page.keyboard.press("Escape")
    page.evaluate("HC.mock.api.clear_backoff()")
    page.wait_for_selector("#sb-backoff-it", state="hidden")


# --------------------------------------------------------------------------- library


def test_library_sections_sit_next_to_the_title(page):
    _go(page, "library")
    page.wait_for_selector("#lib-body tr[data-id]")
    ids = page.eval_on_selector_all(".view-head .lib-tabs > button", "els => els.map(e => e.id)")
    assert ids == ["lib-tracks-btn", "lib-djs-btn", "lib-collector-btn"]
    assert page.get_attribute(".lib-tabs", "aria-label") == "Library sections"
    # left of search and view switch, in one line with the title
    pos = page.evaluate(
        "(() => { const x = (s) => document.querySelector(s).getBoundingClientRect();"
        " return [x('#v-library .view-head h2').right, x('.lib-tabs').left, x('.lib-tabs').right,"
        " x('#lib-tools').left]; })()"
    )
    assert pos[0] < pos[1] < pos[2] < pos[3]
    for btn, marker, back in (
        ("#lib-tracks-btn", "#tr-q", "[data-tr=back]"),
        ("#lib-djs-btn", ".dj-card", "[data-dj=back]"),
        ("#lib-collector-btn", ".co-card", "[data-co=back]"),
    ):
        page.focus(btn)
        page.keyboard.press("Enter")
        page.wait_for_selector(marker)
        page.click(back)
        page.wait_for_selector("#lib-body tr[data-id]")
        page.wait_for_selector(btn, state="visible")


def test_library_stats_are_one_line_and_genre_is_dot_plus_text(page):
    _go(page, "library")
    page.wait_for_selector("#lib-body tr[data-id]")
    tops = page.eval_on_selector_all(
        ".lib-stats > .stat", "els => els.map(e => Math.round(e.getBoundingClientRect().bottom))"
    )
    assert len(tops) == 4 and max(tops) - min(tops) <= 6
    assert page.evaluate("document.querySelector('.lib-stats').getBoundingClientRect().height") < 40
    assert page.inner_text("#ls-count").strip().isdigit()
    assert page.locator("#ls-genres .gstat").count() >= 3  # legend still filters by genre
    # genre cell: coloured dot + plain text, still the button that changes the genre
    tag = page.locator("#lib-body tr[data-id] td .gtag").first
    assert "plain" in tag.get_attribute("class")
    assert tag.evaluate("e => getComputedStyle(e).backgroundColor") == "rgba(0, 0, 0, 0)"
    assert (
        tag.evaluate("e => getComputedStyle(e, '::before').backgroundColor") != "rgba(0, 0, 0, 0)"
    )
    tag.focus()
    page.keyboard.press("Enter")
    page.wait_for_selector(".menu[data-armed] [data-k^='genre-']")
    page.keyboard.press("Escape")
    # the path left the row but stays in the tooltip and in the search
    small = page.locator("#lib-body tr[data-id] .cell-title small").first
    path = small.get_attribute("title")
    assert path and path not in small.inner_text()
    folder = [p for p in path.replace("/", "\\").split("\\") if p][-2]
    page.fill("#lib-q", folder)
    page.wait_for_function("document.querySelectorAll('#lib-body tr[data-id]').length > 0")
    # grid view keeps the coloured badge on the cover
    page.fill("#lib-q", "")
    page.click('#lib-view [data-v="grid"]')
    page.wait_for_selector("#lib-body .lib-card")
    assert page.locator("#lib-body .lib-card .gtag.plain").count() == 0
    page.click('#lib-view [data-v="list"]')
    page.wait_for_selector("#lib-body tr[data-id]")


# --------------------------------------------------------------------------- inbox / settings


def test_inbox_cards_drop_the_repeated_status(page):
    _go(page, "inbox")
    page.wait_for_selector("#grid-inbox .card[data-id]")
    assert page.locator("#grid-inbox .card .status.st-inbox").count() == 0
    assert page.locator("#grid-inbox .card [data-act=dl]").count() > 0
    _go(page, "discover")
    page.wait_for_selector("#grid .card[data-id]")
    assert page.locator("#grid .card .status").count() > 0  # there it tells cards apart


def test_settings_tabs_are_grouped_and_complete(page):
    _go(page, "settings")
    page.wait_for_selector("#stabs .stab")
    seen = page.eval_on_selector_all(
        "#stabs > *",
        "els => els.map(e => e.matches('.stab-group') ? '#' + e.textContent : e.dataset.tab)",
    )
    want = [x for name, tabs in GROUPS for x in ("#" + name, *tabs)]
    assert seen == want
    assert len([x for x in seen if not x.startswith("#")]) == 17
    # headings are no tabs: not focusable, not clickable targets
    assert page.locator("#stabs .stab-group[tabindex]").count() == 0
    page.focus('.stab[data-tab="download"]')
    page.keyboard.press("Enter")
    page.wait_for_selector('.stab.active[data-tab="download"]')
    assert page.evaluate("document.activeElement.dataset.tab") == "download"
    assert page.get_attribute('.stab[data-tab="download"]', "aria-selected") == "true"


def test_reset_only_shows_when_a_value_differs(page):
    _go(page, "settings")
    page.wait_for_selector("#spane-body .field .reset")
    field = page.locator("#spane-body .field", has=page.locator("select")).first
    reset = field.locator(".reset")
    assert reset.is_disabled()
    assert reset.evaluate("e => getComputedStyle(e).opacity") == "0"
    field.locator("select").select_option(index=2)
    page.wait_for_selector("#spane-body .field.dirty .reset:not(:disabled)")
    live = page.locator("#spane-body .field.dirty .reset")
    assert live.evaluate("e => getComputedStyle(e).opacity") == "1"
    live.click()
    page.wait_for_function("!document.querySelector('#spane-body .field.dirty')")


# --------------------------------------------------------------------------- languages / sizes


@pytest.mark.parametrize("lang", ["de", "fr", "ru", "fi", "zh-CN", "nl-BE", "de-x-frk"])
def test_new_texts_are_translated_and_fit(browser, lang):
    """The new labels come from the catalogs (variants fall back to their parent) and the status
    bar still fits the minimum window."""
    context, p = _open(browser, f"?mock=1&nosim=1&lang={lang}", 1100, 700)
    try:
        p.wait_for_selector("#sb-sys:not([hidden])")
        assert p.evaluate("document.querySelector('footer').scrollWidth <= innerWidth")
        assert p.evaluate(
            "[...document.querySelectorAll('footer .it:not([hidden])')].every((e) =>"
            " e.getBoundingClientRect().right <= innerWidth)"
        )
        _go(p, "settings")
        p.wait_for_selector("#stabs .stab-group")
        heads = p.eval_on_selector_all("#stabs .stab-group", "els => els.map(e => e.textContent)")
        assert len(heads) == 5 and all(h.strip() for h in heads)
        if lang in ("fr", "ru", "zh-CN"):
            assert heads[1] != "Find & sort"
        _go(p, "discover")
        p.wait_for_selector("#f-kw-n")
        # the counter is never cut off («12 include · 13 exclude» in a 270 px panel)
        assert p.evaluate(
            "(() => { const m = document.querySelector('#f-kw-n');"
            " return m.textContent.length > 0 && m.scrollWidth <= m.clientWidth; })()"
        )
        bad = [m for m in p.messages if m[0] in ("error", "pageerror") or "[i18n] missing" in m[1]]
        assert bad == []
    finally:
        context.close()


def test_reduced_effects_still_apply(browser):
    context, p = _open(browser)
    try:
        p.evaluate(
            "HC.app.applyAppearance({reduce_effects: true, scanlines: true, pulse_bpm: 200})"
        )
        p.wait_for_selector("body.reduced")
        _go(p, "watchlist")
        p.wait_for_selector("#wl-body tr[data-id]")
        for sel in ("#wl-body td.act .iconbtn", "#sb-sys", "#f-kw > summary"):
            assert p.eval_on_selector(sel, "e => getComputedStyle(e).transitionDuration") == "0s"
        p.click('#wl-body tr[data-id="2"] [data-act="more"]')
        p.wait_for_selector(".menu")
        assert p.eval_on_selector(".menu", "e => getComputedStyle(e).animationName") == "none"
    finally:
        context.close()
