"""Discover view in a real browser against the mock backend (Playwright/Chromium, skipped if
unavailable): the collapsible platform selector (mouse + keyboard, remembered choice), «All»
(one platform after another through the normal per-platform search call, never overlapping,
platforms in backoff skipped with a note) and the keyword boxes (clear all with undo toast,
suggestion chips from the saved settings). Every wait is on explicit state, never on timing."""

from __future__ import annotations

from test_festivals_ui import (
    browser,  # noqa: F401  (fixture)
    page,  # noqa: F401  (fixture)
)

# Record start and end of every mock search: ['start'|'end', platform].
SPY = """
window.__s = [];
window.__saved = 0;
{
  const orig = HC.mock.api.search;
  HC.mock.api.search = (q, o) => {
    window.__s.push(['start', o.platform]);
    return orig(q, o).then((r) => { window.__s.push(['end', o.platform]); return r; });
  };
  const save = HC.mock.api.save_settings;
  HC.mock.api.save_settings = (...a) => { window.__saved++; return save(...a); };
}
HC.mock.speed.factor = 0.3;
true;
"""
PLATFORM = "document.getElementById('v-discover').dataset.platform"
FOCUSED = "document.activeElement && document.activeElement.dataset.p"


def _discover(pg):
    pg.evaluate(SPY)
    pg.click('.nav-item[data-view="discover"]')
    pg.wait_for_selector("#grid .card[data-id]")


def _tags(pg, key):
    return pg.evaluate(
        f"[...document.querySelectorAll('#t-{key} .tag > span')].map((x) => x.textContent)"
    )


def _open_keywords(pg):
    """Clean UI: the keyword boxes sit behind the collapsible «Keywords» row."""
    pg.click("#f-kw > summary")
    pg.wait_for_selector("#f-kw[open] #t-inc")


def _suggestions(pg, key):
    return pg.evaluate(
        f"[...document.querySelectorAll('#s-{key} .kw-sugg span')].map((x) => x.textContent)"
    )


def test_platform_selector_opens_selects_and_remembers(page):  # noqa: F811
    _discover(page)
    assert page.is_hidden("#plat-list")
    assert page.get_attribute("#plat-btn", "aria-expanded") == "false"
    assert page.inner_text("#plat-btn .psel-name").strip().lower() == "youtube"
    assert page.get_attribute("#plat-btn", "aria-label") == "Platform: YouTube"
    # every logo is a local file, never a favicon from the web
    assert page.evaluate(
        "[...document.querySelectorAll('#plat img')].every((i) => i.getAttribute('src')"
        ".startsWith('icons/platforms/') && i.complete && i.naturalWidth > 0)"
    )

    page.click("#plat-btn")
    page.wait_for_selector("#plat-list:not([hidden])")
    assert page.get_attribute("#plat-btn", "aria-expanded") == "true"
    assert page.evaluate(
        "[...document.querySelectorAll('#plat-list [data-p]')].map((b) => b.dataset.p)"
    ) == ["all", "youtube", "soundcloud", "mixcloud", "hearthis"]
    assert page.get_attribute('#plat-list [data-p="youtube"]', "aria-selected") == "true"
    page.click('#plat-list [data-p="mixcloud"]')
    page.wait_for_function(f"{PLATFORM} === 'mixcloud'")
    assert page.is_hidden("#plat-list")
    assert page.inner_text("#plat-btn .psel-name").strip().lower() == "mixcloud"

    # a click outside closes without changing the choice
    page.click("#plat-btn")
    page.wait_for_selector("#plat-list:not([hidden])")
    page.click("#grid")
    page.wait_for_selector("#plat-list", state="hidden")
    assert page.evaluate(PLATFORM) == "mixcloud"

    # remembered across a reload
    page.reload()
    page.wait_for_function("document.body.classList.contains('ready')")
    page.click('.nav-item[data-view="discover"]')
    page.wait_for_function(f"{PLATFORM} === 'mixcloud'")
    assert page.inner_text("#plat-btn .psel-name").strip().lower() == "mixcloud"


def test_platform_selector_keyboard(page):  # noqa: F811
    _discover(page)
    page.focus("#plat-btn")
    page.keyboard.press("Enter")
    page.wait_for_selector("#plat-list:not([hidden])")
    assert page.evaluate(FOCUSED) == "youtube"  # focus starts on the current choice
    page.keyboard.press("ArrowUp")
    assert page.evaluate(FOCUSED) == "all"
    page.keyboard.press("ArrowUp")  # wraps around
    assert page.evaluate(FOCUSED) == "hearthis"
    page.keyboard.press("Home")
    assert page.evaluate(FOCUSED) == "all"
    page.keyboard.press("End")
    assert page.evaluate(FOCUSED) == "hearthis"
    page.keyboard.press("Escape")
    page.wait_for_selector("#plat-list", state="hidden")
    assert page.evaluate("document.activeElement.id") == "plat-btn"
    assert page.evaluate(PLATFORM) == "youtube"

    page.keyboard.press("ArrowDown")  # opens as well
    page.wait_for_selector("#plat-list:not([hidden])")
    page.keyboard.press("ArrowDown")
    assert page.evaluate(FOCUSED) == "soundcloud"
    page.keyboard.press("Enter")
    page.wait_for_function(f"{PLATFORM} === 'soundcloud'")
    assert page.is_hidden("#plat-list")
    assert page.evaluate("localStorage.getItem('hcl.discover.platform')") == "soundcloud"

    # reduced effects: logos fall back to monochrome
    page.evaluate("document.body.classList.add('reduced')")
    assert "grayscale" in page.evaluate(
        "getComputedStyle(document.querySelector('#plat-btn .picon')).filter"
    )


def test_all_searches_platforms_one_after_another(page):  # noqa: F811
    _discover(page)
    page.evaluate("HC.mock.demo.backoff(6, 'mixcloud')")
    page.wait_for_function("!!HC.platform.backoff('mixcloud')")
    page.click("#plat-btn")
    page.click('#plat-list [data-p="all"]')
    page.wait_for_function(f"{PLATFORM} === 'all'")
    page.fill("#q", "hardcore mix")
    page.click("#btn-search")
    # progress names the platform that is being searched right now
    page.wait_for_function(
        "document.querySelector('#count').textContent.includes('Searching SoundCloud (2 of 4)')"
    )
    assert page.is_disabled("#plat-btn")
    page.wait_for_function(
        "!document.querySelector('#btn-search').disabled"
        " && document.querySelector('#grid .card[data-id]')"
    )
    # strictly sequential: each call ends before the next starts; Mixcloud (backoff) is never asked
    assert page.evaluate("window.__s") == [
        ["start", "youtube"],
        ["end", "youtube"],
        ["start", "soundcloud"],
        ["end", "soundcloud"],
        ["start", "hearthis"],
        ["end", "hearthis"],
    ]
    note = page.inner_text("#search-info .skipped")
    assert "Skipped: Mixcloud (backoff until" in note
    badges = set(
        page.evaluate(
            "[...document.querySelectorAll('#grid .card .pbadge')].map((b) => b.textContent.trim())"
        )
    )
    assert {"YT", "SC", "HT"} <= badges and "MC" not in badges
    assert page.evaluate(
        "[...document.querySelectorAll('#grid .card .pbadge img')].every((i) => i.naturalWidth > 0)"
    )
    # merged in turns: the first hits come from different platforms
    first = page.evaluate(
        "[...document.querySelectorAll('#grid .card .pbadge')].slice(0, 3)"
        ".map((b) => b.textContent.trim())"
    )
    assert len(set(first)) > 1


def test_keyword_boxes_clear_undo_and_suggestions(page):  # noqa: F811
    _discover(page)
    saved = page.evaluate("HC.settings.values.filters.include_keywords")
    assert len(saved) >= 2 and _tags(page, "inc") == saved
    _open_keywords(page)
    assert page.is_hidden("#s-inc")  # nothing missing -> no suggestions

    # clear all: no modal, the undo toast brings everything back
    page.click("#c-inc")
    page.wait_for_selector(".toast .toast-act")
    assert page.locator(".modal-back").count() == 0
    assert _tags(page, "inc") == []
    assert page.is_hidden("#c-inc")
    assert _suggestions(page, "inc") == saved
    page.click(".toast .toast-act")
    page.wait_for_function("document.querySelectorAll('#t-inc .tag').length > 0")
    assert _tags(page, "inc") == saved
    assert page.is_hidden("#s-inc")

    # a removed saved keyword is offered below the box and comes back on click
    page.click("#t-inc .tag:first-child button")
    page.wait_for_selector("#s-inc .kw-sugg")
    assert _suggestions(page, "inc") == [saved[0]]
    page.click("#s-inc .kw-sugg")
    page.wait_for_selector("#s-inc", state="hidden")
    assert sorted(_tags(page, "inc")) == sorted(saved)

    # «add» keeps working; own keywords never become suggestions
    page.fill("#t-exc input", "My Own Word")
    page.press("#t-exc input", "Enter")
    assert "my own word" in _tags(page, "exc")
    page.click("#c-exc")
    page.wait_for_function("document.querySelectorAll('#t-exc .tag').length === 0")
    assert _suggestions(page, "exc") == page.evaluate("HC.settings.values.filters.exclude_keywords")
    # session filter only: the saved settings were never written
    assert page.evaluate("window.__saved") == 0


def test_keywords_are_collapsed_behind_a_counter(page):  # noqa: F811
    """Clean UI: closed by default with «n include · n exclude»; the counter follows the boxes;
    the row opens by mouse and by keyboard and the boxes stay fully usable."""
    _discover(page)
    inc = len(page.evaluate("HC.settings.values.filters.include_keywords"))
    exc = len(page.evaluate("HC.settings.values.filters.exclude_keywords"))
    assert page.get_attribute("#f-kw", "open") is None
    assert page.is_hidden("#t-inc") and page.is_hidden("#t-exc")
    assert page.inner_text("#f-kw > summary span") == "Keywords"
    assert page.text_content("#f-kw-n") == f"{inc} include · {exc} exclude"
    # Review v0.11.0 m8: the active keywords stay visible as one line (first three each, ellipsis)
    inc_l = page.evaluate("HC.settings.values.filters.include_keywords")
    exc_l = page.evaluate("HC.settings.values.filters.exclude_keywords")
    assert page.is_visible("#f-kw-sum")
    assert page.text_content("#f-kw-sum") == (
        f"+ {', '.join(inc_l[:3])} … · − {', '.join(exc_l[:3])} …"
    )
    assert page.get_attribute("#f-kw-sum", "title") == (
        f"Include keywords: {', '.join(inc_l)}\nExclude keywords: {', '.join(exc_l)}"
    )
    assert page.evaluate(
        "(() => { const s = document.querySelector('#f-kw-sum');"
        " return s.scrollHeight <= s.clientHeight + 1"
        " && getComputedStyle(s).whiteSpace === 'nowrap'; })()"
    )
    # the display filters below stay reachable without scrolling the panel
    assert page.is_visible("#f-hide") and page.is_visible("#f-blacklist")
    page.focus("#f-kw > summary")
    page.keyboard.press("Enter")
    page.wait_for_selector("#f-kw[open] #t-inc")
    assert page.is_visible("#t-exc") and page.is_visible(".kw-hint")
    assert page.is_hidden("#f-kw-sum")  # open: the boxes show everything
    page.click("#t-inc .tag:first-child button")
    page.wait_for_function(
        "n => document.querySelector('#f-kw-n').textContent.startsWith(n + ' include')", arg=inc - 1
    )
    page.click("#f-reset")
    page.wait_for_function(
        "n => document.querySelector('#f-kw-n').textContent.startsWith(n + ' include')", arg=inc
    )
    page.click("#f-kw > summary")
    page.wait_for_selector("#t-inc", state="hidden")
    assert page.is_visible("#f-kw-sum")


def test_keyword_suggestions_ignore_case_and_undo_by_keyboard(page):  # noqa: F811
    """Review v0.10.1 m6/m7: «Defqon» (hand-edited config) is no missing «defqon»; clearing
    by keyboard puts the focus on «Undo», so Enter brings the keywords back."""
    page.evaluate("HC.settings.values.filters.include_keywords.push('Defqon')")
    _discover(page)
    page.wait_for_function("document.querySelectorAll('#t-inc .tag').length > 0")
    _open_keywords(page)
    assert page.is_hidden("#s-inc")
    before = _tags(page, "inc")
    page.focus("#c-inc")
    page.keyboard.press("Enter")
    page.wait_for_selector(".toast .toast-act")
    page.wait_for_function("document.activeElement?.classList.contains('toast-act')")
    page.keyboard.press("Enter")
    page.wait_for_function("document.querySelectorAll('#t-inc .tag').length > 0")
    assert _tags(page, "inc") == before
    # by mouse the focus stays where it was (no jump into the toast)
    page.click("#c-inc")
    page.wait_for_selector(".toast .toast-act")
    assert not page.evaluate("document.activeElement?.classList.contains('toast-act')")
