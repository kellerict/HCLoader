"""Festival collector UI (v0.5.0) in a real browser against the mock backend
(Playwright/Chromium, skipped if unavailable): entry points, checklist (stats, filters,
ticks, confirm/reject, inline edit), sources (timetable, playlist, shipped files), the paced
search with estimate/progress, «Download checked», XSS safety and catalog parity."""

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
METHODS = [
    "open_collector_edition",
    "delete_checklist",
    "parse_timetable",
    "import_timetable",
    "import_timetable_file",
    "import_checklist_playlist",
    "add_checklist_row",
    "update_checklist_row",
    "delete_checklist_rows",
    "set_checklist_checked",
    "set_checklist_ignored",
    "confirm_checklist_match",
    "estimate_checklist_matching",
    "start_checklist_matching",
    "cancel_checklist_matching",
    "queue_checklist",
]
# Record every mock call of the collector methods (name + arguments) in window.__calls.
SPY = (
    "window.__calls = []; window.__xss = 0;"
    f"for (const name of {METHODS!r}) {{"
    "  const orig = HC.mock.api[name];"
    "  HC.mock.api[name] = (...args) => { window.__calls.push([name, ...args]);"
    " return orig(...args); };"
    "}"
    "HC.mock.speed.factor = 0.05;"
)
ROWS = "#co-rows tr.co-row"


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


def _edition(page, key="defqon1", year=2024):
    return page.evaluate(f"HC.mock.demo.collectorEdition('{key}', {year})")


def _open(page, key="defqon1", year=2024):
    """Deep link to the checklist of a demo edition."""
    eid = _edition(page, key, year)
    page.evaluate(f"HC.app.go('library', 'collector-{eid}')")
    page.wait_for_selector(ROWS)
    return eid


def _row(page, artist):
    return page.locator(f'{ROWS}:has(.co-dj b:text-is("{artist}"))')


def _stat(page, status):
    return int(page.inner_text(f'.co-stat[data-status="{status}"] .v'))


def test_entry_points_overview_and_navigation(page):
    page.click('.nav-item[data-view="library"]')
    page.click("#lib-collector-btn")
    page.wait_for_selector(".co-card")
    assert page.evaluate("location.hash") == "#library/collector"
    assert page.is_hidden("#lib-scroll") and page.is_visible("#co-new")
    names = page.locator(".co-card .ft-name").all_inner_texts()
    assert names == ["Decibel outdoor 2025", "Defqon.1 2024", "Qlimax 2024"]
    assert "Waiting 3 / 8" in page.inner_text('.co-card:has(.ft-name:text-is("Qlimax 2024"))')

    page.click('.co-card:has(.ft-name:text-is("Defqon.1 2024")) [data-co="open"]')
    page.wait_for_selector(ROWS)
    eid = _edition(page)
    assert page.evaluate("location.hash") == f"#library/collector-{eid}"
    assert page.inner_text(".co-head h2") == "Defqon.1 2024"
    assert page.locator(ROWS).count() == 26
    assert [_stat(page, s) for s in ("found", "queued", "downloaded", "missing", "ignored")] == [
        10,
        2,
        8,
        5,
        1,
    ]
    assert "Find missing sets (4)" in page.inner_text('#co-bar [data-co="find"]')
    assert "Download checked (6)" in page.inner_text('#co-bar [data-co="queue"]')

    # another view and back: the checklist stays; «Library» again closes it
    page.click('.nav-item[data-view="downloads"]')
    page.click('.nav-item[data-view="library"]')
    page.wait_for_selector(ROWS)
    page.click('.nav-item[data-view="library"]')
    page.wait_for_selector("#lib-body tr[data-id]")
    assert page.is_hidden("#lib-collector")
    assert page.evaluate("location.hash") == "#library"

    # festival view: the selected edition offers its checklist
    page.click('#lib-groupby [data-g="festival"]')
    page.click('.fest-tile:has(.ft-name:text-is("Defqon.1"))')
    assert page.inner_text(".fh-collect") == "Checklist 8 / 26"
    page.click('.fest-line [data-edition]:has(b:text-is("2023"))')
    assert page.inner_text(".fh-collect") == "Collect this edition"
    page.click(".fh-collect")
    page.wait_for_selector(".co-empty-actions")
    assert page.inner_text(".co-head h2") == "Defqon.1 2023"
    assert len(_calls(page, "open_collector_edition")) == 1
    # back: overview now lists the new checklist; back again: the library
    page.click('[data-co="back"]')
    page.wait_for_selector(".co-card")
    assert page.locator(".co-card").count() == 4
    page.click('[data-co="back"]')
    page.wait_for_selector(".fest-tile, #lib-body tr[data-id]")
    assert page.is_hidden("#lib-collector")


def test_filters_and_ticks(page):
    _open(page)
    page.click('.co-stat[data-status="missing"]')
    assert page.locator(ROWS).count() == 5
    assert page.get_attribute('.co-stat[data-status="missing"]', "aria-pressed") == "true"
    page.click('.co-stat[data-status="missing"]')
    page.select_option('[data-filter="stage"]', "BLACK")
    assert page.locator(ROWS).count() == 6
    page.select_option('[data-filter="day"]', "Sunday")
    assert page.locator(f"{ROWS} .co-dj b").all_inner_texts() == ["Miss K8", "Sefa"]
    assert "2 of 26 rows shown" in page.inner_text("#co-bar")

    # select none / all act on the shown rows only
    page.click('#co-bar [data-co="none"]')
    page.wait_for_function("document.querySelectorAll('#co-rows tr.co-row.off').length === 2")
    ids, checked = _calls(page, "set_checklist_checked")[-1]
    assert len(ids) == 2 and checked is False
    assert page.inner_text("#co-bar .co-count b") == "21"
    page.check("#co-master")
    page.wait_for_function("document.querySelectorAll('#co-rows tr.co-row.off').length === 0")
    assert _calls(page, "set_checklist_checked")[-1] == [ids, True]
    page.click('#co-bar [data-co="clear"]')
    assert page.locator(ROWS).count() == 26

    # one tick, search by DJ, ignore
    _row(page, "Headhunterz").locator('[data-co="chk"]').uncheck()
    page.wait_for_function(
        "document.querySelector('#co-bar [data-co=queue]').textContent.includes('(5)')"
    )
    page.fill('[data-filter="q"]', "kelt")
    page.wait_for_function("document.querySelectorAll('#co-rows tr.co-row').length === 1")
    _row(page, "KELTEK").locator('[data-co="ignore"]').click()
    page.wait_for_function(
        "document.querySelector('.co-stat[data-status=ignored] .v').textContent === '2'"
    )
    assert _stat(page, "missing") == 4
    assert "Find missing sets (3)" in page.inner_text('#co-bar [data-co="find"]')


def test_confirm_reject_and_candidates(page):
    _open(page)
    assert page.locator(f"{ROWS}.ask").count() == 2
    assert "To confirm: 2" in page.text_content("#co-bar")
    page.click('#co-bar [data-co="to-confirm"]')
    assert page.locator(ROWS).count() == 2
    page.click('#co-bar [data-co="to-confirm"]')

    row = _row(page, "Ran-D")
    first = row.locator(".co-mt b").inner_text()
    row.locator('[data-co="candidates"]').click()
    page.click('.menu button[data-k^="cand-"]')
    page.wait_for_function(
        "!document.querySelector('#co-rows tr.co-row.ask .co-dj b[title=\"Ran-D\"]')"
    )
    rid, vid, reject = _calls(page, "confirm_checklist_match")[-1]
    assert vid and reject is False
    assert _row(page, "Ran-D").locator(".co-mt b").inner_text() != first
    assert "Download checked (7)" in page.inner_text('#co-bar [data-co="queue"]')

    row = _row(page, "D-Sturb b2b Act of Rage")
    row.locator('[data-co="reject"]').click()
    page.wait_for_function("!document.querySelector('#co-rows tr.co-row.ask')")
    assert _calls(page, "confirm_checklist_match")[-1][1:] == [None, True]
    assert "Not searched yet" in row.inner_text()
    assert _stat(page, "missing") == 6 and _stat(page, "found") == 9


def test_inline_edit_add_row_and_escaping(page):
    _open(page)
    row = _row(page, "Sefa")
    row.locator('[data-co="edit"]').click()
    page.wait_for_selector("tr.co-edit")
    page.fill('.co-edit [data-f="start"]', "25:99")
    page.click('.co-edit [data-co="edit-save"]')
    page.wait_for_selector(".co-edit [data-err]:not([hidden])")
    assert "Invalid time" in page.inner_text(".co-edit [data-err]")
    page.fill('.co-edit [data-f="start"]', "21:30")
    page.fill('.co-edit [data-f="stage"]', "UV")
    page.press('.co-edit [data-f="stage"]', "Enter")
    page.wait_for_selector("tr.co-edit", state="detached")
    rid, patch = _calls(page, "update_checklist_row")[-1]
    assert patch == {"stage": "UV", "start": "21:30"}  # only what changed
    assert "21:30–22:00" in _row(page, "Sefa").inner_text()
    assert _row(page, "Sefa").locator(".gm").count() == 1

    # Escape leaves the form without a call
    _row(page, "Sefa").locator('[data-co="edit"]').click()
    page.press('.co-edit [data-f="artist"]', "Escape")
    assert page.locator("tr.co-edit").count() == 0
    assert len(_calls(page, "update_checklist_row")) == 2  # the rejected one + the saved one

    # add a row: DJ names are untrusted text, never markup
    evil = '<img src=x onerror="window.__xss=1"><b>Evil</b>'
    page.click('.co-tools [data-co="add"]')
    page.click('.co-edit [data-co="edit-save"]')
    assert page.is_visible(".co-edit [data-err]")
    page.fill('.co-edit [data-f="artist"]', evil)
    page.fill('.co-edit [data-f="day"]', "Sunday")
    page.click('.co-edit [data-co="edit-save"]')
    page.wait_for_function("document.querySelectorAll('#co-rows tr.co-row').length === 27")
    assert _calls(page, "add_checklist_row")[-1][1]["artist"] == evil
    new = page.locator(f"{ROWS}:last-child")
    assert new.locator(".co-dj b").inner_text() == evil
    # the only images are the bundled platform logos (local files, no handlers)
    assert page.locator("#lib-collector img:not(.picon), #toasts img").count() == 0
    assert page.evaluate(
        "[...document.querySelectorAll('#lib-collector img.picon')].every((i) =>"
        " /^icons\\/platforms\\/[a-z]+\\.svg$/.test(i.getAttribute('src'))"
        " && !i.hasAttribute('onerror'))"
    )
    assert page.evaluate("window.__xss") == 0
    assert "Added by hand" in new.inner_text()

    # delete it again through the row menu
    new.locator('[data-co="more"]').click()
    page.click('.menu [data-k="del"]')
    page.wait_for_function("document.querySelectorAll('#co-rows tr.co-row').length === 26")
    assert len(_calls(page, "delete_checklist_rows")[-1][0]) == 1
    assert page.evaluate("window.__xss") == 0


def test_paste_timetable_preview_and_import(page):
    eid = _open(page)
    page.click('.co-tools [data-co="paste"]')
    page.wait_for_selector(".modal.co-tt")
    assert page.is_disabled(".co-tt [data-act=ok]")
    page.fill(
        ".co-tt textarea",
        "Friday - RED\n17:00 - 18:00 Sound Rush\n18:00 - 19:00 Phuture Noize (Live)\n"
        "??:??\nSunday - BLACK\n<script>window.__xss=1</script> | 20:00-21:00",
    )
    page.wait_for_function("document.querySelectorAll('.co-tt-prev tbody tr').length === 3")
    assert "Sets: 3 · Days: 2 · Stages: 2" in page.inner_text(".co-tt [data-sum]")
    assert "Lines not understood: 1" in page.inner_text(".co-tt-skip")
    assert page.text_content(".co-tt [data-act=ok]") == "Import (3)"
    assert len(_calls(page, "parse_timetable")) >= 1
    page.click(".co-tt [data-act=ok]")
    page.wait_for_selector(".modal.co-tt", state="detached")
    page.wait_for_function("document.querySelectorAll('#co-rows tr.co-row').length === 28")
    call = _calls(page, "import_timetable")[-1]
    assert call[0] == eid and "Phuture Noize" in call[1]
    assert "new: 2" in page.inner_text("#toasts") and "merged: 1" in page.inner_text("#toasts")
    assert _row(page, "Phuture Noize").count() == 1
    assert page.evaluate("window.__xss") == 0
    assert page.locator("#lib-collector script").count() == 0


def test_paste_timetable_preview_rows_can_be_edited_and_removed(page):
    eid = _open(page)
    page.click('.co-tools [data-co="paste"]')
    page.wait_for_selector(".modal.co-tt")
    page.fill(
        ".co-tt textarea",
        "Saturday – RED\n17:00 - 18:00 Solstic Zer\n????? ##\n18:00 - 19:00 Phuture Noize\n"
        "19:00 - 20:00 Typo Act",
    )
    page.wait_for_function("document.querySelectorAll('.co-tt-prev tbody tr').length === 3")
    # garbage is reported, never turned into a stage
    assert "????? ##" in page.inner_text(".co-tt-skip")
    first = page.locator(".co-tt-prev tbody tr").nth(0)
    assert first.locator("[data-k=stage]").input_value() == "RED"
    assert first.locator("[data-k=day]").input_value() == "Saturday"
    first.locator("[data-k=artist]").fill("Solstice Zero")
    first.locator("[data-k=time]").fill("17:05–18:00")
    page.locator(".co-tt-prev tbody tr").nth(2).locator("[data-rm]").click()
    page.wait_for_function("document.querySelectorAll('.co-tt-prev tbody tr').length === 2")
    assert page.text_content(".co-tt [data-act=ok]") == "Import (2)"
    page.click(".co-tt [data-act=ok]")
    page.wait_for_selector(".modal.co-tt", state="detached")
    call = _calls(page, "import_timetable")[-1]
    assert call[0] == eid and isinstance(call[1], list)
    got = [(r["artist"], r["stage"], r["day"], r["start"], r["end"]) for r in call[1]]
    assert got == [
        ("Solstice Zero", "RED", "Saturday", "17:05", "18:00"),
        ("Phuture Noize", "RED", "Saturday", "18:00", "19:00"),
    ]
    page.wait_for_function(
        "[...document.querySelectorAll('#co-rows .co-dj b')]"
        ".some((b) => b.textContent === 'Solstice Zero')"
    )
    assert _row(page, "Solstice Zero").count() == 1
    assert _row(page, "Typo Act").count() == 0


def test_playlist_import_with_progress(page):
    eid = _open(page, "decibel", 2025)
    assert page.locator(ROWS).count() == 12
    page.click('.co-tools [data-co="playlist"]')
    page.wait_for_selector(".modal.co-dlg")
    page.click(".co-dlg [data-act=ok]")
    assert page.is_visible(".co-dlg [data-err]")
    page.fill('.co-dlg [data-f="url"]', "https://example.org/not-a-playlist")
    page.click(".co-dlg [data-act=ok]")
    page.wait_for_function(
        "document.querySelector('.co-dlg [data-err]').textContent.includes('Not a playlist')"
    )
    assert page.locator(".modal.co-dlg").count() == 1
    page.fill('.co-dlg [data-f="url"]', "https://www.youtube.com/watch?v=abc&list=PLdecibel25")
    page.click(".co-dlg [data-act=ok]")
    page.wait_for_selector(".modal.co-dlg", state="detached")
    page.wait_for_selector(".co-strip.run")
    assert "Reading playlist" in page.inner_text(".co-strip")
    assert _calls(page, "import_checklist_playlist")[-1][0] == eid
    page.wait_for_selector(".co-strip", state="detached", timeout=10000)
    page.wait_for_function("document.querySelectorAll('#co-rows tr.co-row').length === 16")
    assert _stat(page, "found") == 9  # 5 timetable rows got their video, 4 new entries
    assert _row(page, "Official Trailer").locator('[data-co="chk"]').is_checked() is False
    assert "Playlist read" in page.inner_text("#toasts")


def test_find_missing_estimate_progress_and_cancel(page):
    eid = _open(page)
    page.click('#co-bar [data-co="find"]')
    page.wait_for_selector(".modal.co-est")
    big = page.locator(".co-est .bf-big b").all_inner_texts()
    assert big[0] == "4" and big[2] == "16"
    assert "10 searches per hour" in page.inner_text(".co-est")
    page.click(".co-est [data-act=ok]")
    page.wait_for_selector(".co-strip")
    assert _calls(page, "start_checklist_matching") == [[eid, {}]]
    assert page.is_disabled('#co-bar [data-co="find"]')
    page.wait_for_selector(".modal.co-est", state="detached")  # no overlay in the way
    page.wait_for_selector(".co-strip.run")
    # the strip is patched in place by progress events: the button node stays the same
    page.locator('.co-strip [data-co="job-cancel"]').click()
    page.wait_for_selector(".co-strip", state="detached")
    assert _calls(page, "cancel_checklist_matching") == [[eid]]
    left = int(page.inner_text('#co-bar [data-co="find"]').split("(")[1].rstrip(")"))
    assert 0 < left < 4

    # continue: runs to the end, uncertain hits wait for a confirmation
    page.click('#co-bar [data-co="find"]')
    page.wait_for_selector(".modal.co-est")
    assert "Continues the interrupted search" in page.inner_text(".co-est")
    page.click(".co-est [data-act=ok]")
    page.wait_for_function(
        "document.querySelector('#toasts').textContent.includes('Search finished')",
        timeout=10000,
    )
    assert page.locator(".co-strip").count() == 0
    assert _stat(page, "found") > 10 and _stat(page, "missing") < 5
    assert "Search again" in page.inner_text('#co-bar [data-co="find"]')

    # a backoff blocks the start in the dialog
    page.evaluate("HC.mock.demo.backoff(6)")
    page.click('#co-bar [data-co="find"]')
    page.wait_for_selector(".modal.co-est")
    assert "Backoff active until" in page.inner_text(".co-est .notice.warn")
    assert page.is_disabled(".co-est [data-act=ok]")


def test_download_checked_queues_and_follows_the_queue(page):
    eid = _open(page)
    before = page.evaluate("HC.status.queue_length")
    page.click('#co-bar [data-co="queue"]')
    page.wait_for_function(
        "document.querySelector('.co-stat[data-status=queued] .v').textContent === '8'"
    )
    assert _calls(page, "queue_checklist") == [[eid]]
    toast = page.inner_text("#toasts")
    assert "6 mixes added to the queue" in toast and "unconfirmed: 2" in toast
    assert _stat(page, "found") == 4  # 2 uncertain, 2 unchecked
    assert page.is_disabled('#co-bar [data-co="queue"]')
    page.wait_for_function(f"HC.status.queue_length === {before + 6}")

    # live update: the queue finishes a set -> the row turns «downloaded»
    page.evaluate("HC.mock.speed.factor = 1; HC.mock.sim.tick(400)")
    page.wait_for_function(
        "+document.querySelector('.co-stat[data-status=downloaded] .v').textContent > 8"
    )


def test_shipped_files_new_checklist_and_delete(page):
    page.evaluate("HC.app.go('library', 'collector')")
    page.wait_for_selector(".co-card")
    page.click('.co-head [data-co="files"]')
    page.wait_for_selector(".modal.co-files")
    assert page.is_visible(".co-files-empty") and page.is_visible(".co-files-how")
    assert "app/data/timetables/<series>/<year>.json" in page.inner_text(".co-files-how")
    page.keyboard.press("Escape")

    page.evaluate("HC.mock.demo.timetableFiles()")
    page.click('.co-head [data-co="files"]')
    page.wait_for_selector(".co-file")
    assert page.locator(".co-file").count() == 5
    assert page.locator(".co-file.bad [data-file-import]:disabled").count() == 2
    page.click('.co-file[data-file="dominator/2025.json"] [data-file-import]')
    page.wait_for_selector(".modal.co-files", state="detached")
    page.wait_for_selector(ROWS)
    assert page.inner_text(".co-head h2") == "Dominator 2025"
    assert page.locator(ROWS).count() == 24
    assert _calls(page, "import_timetable_file") == [["dominator/2025.json"]]

    # delete through the menu of the checklist
    page.click(".co-head [data-co=menu]")
    page.click('.menu [data-k="del"]')
    page.click(".modal [data-act=ok]")
    page.wait_for_selector("#co-new")
    assert len(_calls(page, "delete_checklist")) == 1
    assert "Dominator 2025" not in page.locator(".co-card .ft-name").all_inner_texts()

    # new checklist: validation, variant select, empty state with the four sources
    page.click('#co-new [data-co="create"]')
    assert "Choose a festival" in page.inner_text("#co-new-err")
    page.select_option("#co-series", label="Defqon.1")
    assert page.is_visible("#co-variant-f")
    page.click('#co-new [data-co="create"]')
    assert "year" in page.inner_text("#co-new-err")
    page.fill("#co-year", "1492")
    page.click('#co-new [data-co="create"]')
    page.wait_for_function(
        "document.querySelector('#co-new-err').textContent.includes('year is required')"
    )
    page.fill("#co-year", "2025")
    page.select_option("#co-variant", "Australia")
    page.press("#co-year", "Enter")
    page.wait_for_selector(".co-empty-actions")
    assert page.inner_text(".co-head h2") == "Defqon.1 Australia 2025"
    assert page.locator(".co-empty-actions [data-co]").count() == 4
    assert page.is_hidden(".co-stats")
    assert _calls(page, "open_collector_edition")[-1] == [
        {"series_id": 1, "year": 2025, "variant": "Australia"}
    ]


def test_collector_settings_fields(page):
    page.evaluate("HC.app.go('settings', 'festivals')")
    for key in (
        "festivals.collector_searches_per_hour",
        "festivals.collector_results_per_search",
        "festivals.collector_auto_confirm",
    ):
        assert page.locator(f'.field[data-k="{key}"]').count() == 1


def test_new_keys_translated_everywhere():
    """Every full catalog carries the v0.5.0 keys (variants inherit from their parent)."""
    new = [
        k
        for k in UI_REF
        if k.startswith(("collector.", "set.festivals.collector_")) or k == "set.h.collector"
    ]
    assert len(new) > 170
    for path in sorted((ROOT / "ui" / "js" / "locales").glob("*.js")):
        code = path.stem
        if parent_fallback(code):
            continue
        flat = flatten(ui_catalog(code)[1])
        assert [k for k in new if k not in flat] == [], code
