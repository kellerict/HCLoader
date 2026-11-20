"""Screenshots of every UI view in mock mode.

Opens ``ui/index.html`` via Playwright (file://, no pywebview, mock backend),
walks through all views and settings tabs and writes PNGs to
``docs/screenshots/`` (``--reduced``: ``docs/screenshots/reduced/``).

The script fails (exit code 1) on JavaScript errors, ``console.error`` output
or any request that leaves the local file system – the UI must work offline.

Usage:
    python scripts/ui_screenshots.py [--lang CODE] [--reduced] [--out DIR] [--only NAME ...]
                                     [--viewport 1100x700]

``--lang`` (default ``en``) sets the UI language via ``?lang=`` in mock mode; other languages
than English go to ``docs/screenshots/<lang>/`` unless ``--out`` is given. Mock data and the
mock's simulated backend messages stay English (docs/TRANSLATING.md).

Chromium: set ``HCLOADER_CHROMIUM`` to an executable, otherwise a bundled
Playwright Chromium (``playwright install chromium``) or Microsoft Edge is used.
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import sys
from pathlib import Path

from playwright.sync_api import Browser, Error, Page, Playwright, sync_playwright

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "ui" / "index.html"
DEFAULT_OUT = ROOT / "docs" / "screenshots"
VIEWPORT = {"width": 1440, "height": 900}
# Fixed "now" so relative dates in the mock data are stable between runs.
FIXED_NOW = dt.datetime(2026, 11, 16, 8, 15, 0, tzinfo=dt.UTC)  # 09:15 in Zürich
SYSTEM_CHROMIUM = Path("/opt/pw-browsers/chromium")
# Same offline flags as tests/test_bridge_js.py: the UI must never reach the network, and Chromium
# itself (proxy from the environment, background services) must not either.
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

# app/core/i18n.SUPPORTED (not imported: the script runs without the app package on sys.path)
LANGUAGES = [
    *("en", "de", "zh-CN", "hi", "es", "fr", "bn", "pt", "ru", "id", "nl", "nl-BE"),
    *("sv", "nb", "fi", "lt", "lv", "et", "de-x-frk"),
]
# browser locale = Intl formatting of the mock page (dates, numbers) and the fatal screen
BROWSER_LOCALE = {
    "en": "en-US",
    "de": "de-CH",
    "pt": "pt-BR",
    "nl-BE": "nl-BE",
    "de-x-frk": "de-DE",
}

VIEWS = ["discover", "inbox", "watchlist", "downloads", "library", "stats", "log", "settings"]
SETTINGS_TABS = [
    "general",
    "playback",
    "filters",
    "genres",
    "festivals",
    "download",
    "storage",
    "throttle",
    "soundcloud",
    "sources",
    "reupload",
    "network",
    "schedule",
    "notifications",
    "mediaserver",
    "appearance",
    "maintenance",
]


def launch(pw: Playwright) -> Browser:
    """Start Chromium from the first location that works."""
    env = os.environ.get("HCLOADER_CHROMIUM")
    attempts: list[dict] = []
    if env:
        attempts.append({"executable_path": env})
    if SYSTEM_CHROMIUM.exists():
        attempts.append({"executable_path": str(SYSTEM_CHROMIUM)})
    attempts += [{}, {"channel": "msedge"}, {"channel": "chrome"}]
    last: Exception | None = None
    offline_env = {k: v for k, v in os.environ.items() if "proxy" not in k.lower()}
    for kwargs in attempts:
        try:
            return pw.chromium.launch(**kwargs, args=CHROMIUM_OFFLINE_ARGS, env=offline_env)
        except Error as exc:  # try the next candidate
            last = exc
    raise SystemExit(f"Kein Chromium gefunden: {last}")


class Shooter:
    def __init__(
        self, page: Page, out: Path, reduced: bool, only: set[str], lang: str = "en"
    ) -> None:
        self.lang = lang
        self.page = page
        self.out = out
        self.reduced = reduced
        self.only = only
        self.written: list[Path] = []

    # -- helpers -----------------------------------------------------------
    def settle(self, extra_ms: int = 0) -> None:
        """Wait until bridge calls are done and entry animations have finished."""
        page = self.page
        page.wait_for_function("window.HC && HC.bridge.pending === 0")
        page.evaluate("() => document.fonts.ready.then(() => true)")
        page.wait_for_timeout((80 if self.reduced else 750) + extra_ms)
        page.wait_for_function("HC.bridge.pending === 0")

    def shot(self, name: str) -> None:
        if self.only and name not in self.only:
            return
        path = self.out / f"{name}.png"
        # keep hover effects out of the picture
        self.page.mouse.move(self.page.viewport_size["width"] - 260, 4)
        self.page.screenshot(path=str(path), animations="disabled")
        self.written.append(path)
        print(f"  {path.relative_to(ROOT) if path.is_relative_to(ROOT) else path}")

    def clear_toasts(self) -> None:
        self.page.evaluate("document.querySelector('#toasts').replaceChildren()")

    def go(self, view: str) -> None:
        self.clear_toasts()
        self.page.click(f'.nav-item[data-view="{view}"]')
        self.settle()

    def tab(self, tab: str) -> None:
        self.clear_toasts()
        self.page.click(f'.stab[data-tab="{tab}"]')
        self.settle()

    def shot_scrolled(self, name: str, scroller: str) -> None:
        """Extra screenshots while the given scroll container has more content."""
        page = self.page
        height, visible = page.evaluate(
            "(sel) => { const e = document.querySelector(sel);"
            " return [e.scrollHeight, e.clientHeight]; }",
            scroller,
        )
        max_scroll = height - visible
        if max_scroll <= 8:
            return
        step = visible - 80
        tops = [*range(step, max_scroll, step), max_scroll]
        if len(tops) >= 2 and tops[-1] - tops[-2] < 200:
            del tops[-2]  # the last two pictures would be nearly identical
        for part, top in enumerate(tops[:5], start=2):
            page.evaluate(
                "([sel, y]) => { document.querySelector(sel).scrollTop = y; }",
                [scroller, top],
            )
            page.wait_for_timeout(60)
            self.shot(f"{name}-{part}")
        page.evaluate("(sel) => { document.querySelector(sel).scrollTop = 0; }", scroller)

    def row_menu(self, row: str, key: str) -> None:
        """Bibliothek: Menü (⋯) eines Eintrags öffnen und einen Punkt wählen."""
        self.page.click(f'{row} [data-act="more"]')
        self.page.click(f'.menu [data-k="{key}"]')

    def wl_menu(self, source_id: int, key: str | None = None) -> None:
        """Watchlist: open the row menu (⋯) of a source and optionally pick an entry
        ("bf" read everything, "edit", "del")."""
        self.page.click(f'#wl-body tr[data-id="{source_id}"] [data-act="more"]')
        self.page.wait_for_selector(".menu")
        if key:
            self.page.click(f'.menu [data-k="{key}"]')

    def keywords(self, open_: bool) -> None:
        """Discover: open/close the collapsible «Keywords» block of the filter panel."""
        self.page.evaluate("(o) => { document.querySelector('#f-kw').open = o; }", open_)

    def pick_platform(self, plat: str) -> None:
        """Discover: open the platform selector and choose an entry ("all" or a platform)."""
        self.page.click("#plat-btn")
        self.page.click(f'#plat-list [data-p="{plat}"]')
        self.page.wait_for_function(
            "p => document.querySelector('#v-discover').dataset.platform === p", arg=plat
        )

    def discover_platform_scenes(self) -> None:
        """Platform selector (collapsed/open), «All» (sequential search, skipped platform, badges)
        and the keyword boxes (clear all with undo toast, suggestion chips)."""
        page = self.page
        page.evaluate("HC.mock.api.clear_backoff(); HC.mock.demo.local(null)")
        if self.reduced:  # earlier scenes re-apply the saved appearance
            page.evaluate("document.body.classList.add('reduced')")
        self.go("discover")
        page.click("#f-reset")
        page.click("#plat-btn")
        page.wait_for_selector("#plat-list:not([hidden])")
        self.settle()
        self.shot("discover-platform-menu")
        page.keyboard.press("Escape")
        # «All»: Mixcloud is in backoff -> skipped with a note; the others one after another
        page.evaluate("HC.mock.demo.backoff(6, 'mixcloud')")
        self.pick_platform("all")
        page.fill("#q", "hardcore mix")
        page.click("#btn-search")
        page.wait_for_function(
            "(document.querySelector('#count').textContent || '').includes('SoundCloud')"
        )
        self.shot("discover-all-searching")
        page.wait_for_selector("#grid .card:not(.skeleton)")
        self.settle()
        # keyword boxes: one removed keyword comes back as a suggestion chip
        self.keywords(True)
        page.click("#t-inc .tag:nth-child(2) button")
        page.click("#t-exc .tag:nth-child(1) button")
        page.evaluate("document.activeElement.blur()")
        self.settle()
        self.shot("discover-all")
        page.click("#plat-btn")
        page.wait_for_selector("#plat-list:not([hidden])")
        self.settle()
        self.shot("discover-all-menu")
        page.keyboard.press("Escape")
        page.click("#c-exc")
        page.wait_for_selector(".toast .toast-act")
        self.settle()
        self.shot("discover-keywords-cleared")
        page.click(".toast .toast-act")
        self.keywords(False)
        page.evaluate("HC.mock.api.clear_backoff()")
        page.click("#f-reset")
        self.pick_platform("youtube")
        self.settle()

    def soundcloud_scenes(self) -> None:
        """Phase 7a: SoundCloud-Suche, Namensvorschlag im Quellen-Dialog, Backoff pro Plattform."""
        page = self.page
        page.evaluate("HC.mock.api.clear_backoff(); HC.mock.demo.local(null)")
        self.go("discover")
        page.click("#f-reset")
        self.pick_platform("soundcloud")
        self.settle()
        self.shot("discover-soundcloud-empty")
        page.fill("#q", "hardcore mix")
        page.click("#btn-search")
        page.wait_for_selector("#grid .card:not(.skeleton)")
        self.settle()
        self.shot("discover-soundcloud")
        # ohne «Geladene & ignorierte ausblenden»: auch Go+-Vorschauen und Geladenes, mit Hinweis
        page.uncheck("#f-hide")
        self.settle()
        self.shot("discover-soundcloud-all")
        page.check("#f-hide")
        self.pick_platform("youtube")

        # Quelle anlegen: URL tippen -> Typ, Plattform und Name kommen als Vorschlag
        self.go("watchlist")
        page.click("#wl-add")
        page.wait_for_selector(".modal")
        page.fill(".modal [data-f=url_or_query]", "https://soundcloud.com/kernschmelze")
        page.wait_for_function(
            "document.querySelector('.modal [data-f=name]').value === 'Kernschmelze'"
        )
        self.settle()
        self.shot("watchlist-suggest")
        # kein guter Name aus der URL -> «Name kommt bei der ersten Prüfung»
        page.fill(".modal [data-f=url_or_query]", "https://www.youtube.com/channel/UCkick0001")
        page.wait_for_selector(".modal [data-h=name]:not([hidden])")
        page.wait_for_function("document.querySelector('.modal [data-f=name]').value === ''")
        self.settle()
        self.shot("watchlist-suggest-later")
        page.keyboard.press("Escape")

        # SoundCloud im Backoff: seine Einträge stehen, YouTube lädt weiter
        page.evaluate("HC.mock.demo.scQueue(); HC.mock.demo.backoff(6, 'soundcloud')")
        self.go("downloads")
        self.settle(300)
        self.shot("downloads-soundcloud-backoff")
        self.go("watchlist")
        self.shot("watchlist-soundcloud-backoff")
        self.go("settings")
        self.tab("soundcloud")
        self.shot("settings-soundcloud-backoff")
        page.evaluate("HC.mock.api.clear_backoff('soundcloud')")
        self.settle()

    def player_scenes(self) -> None:
        """Phase 8: Mini-Player mit Kapiteln, Markierung in der Bibliothek, Genre per Klick."""
        page = self.page
        self.go("library")
        page.click('#lib-body tr[data-id="eEuph0ric26"] [data-act="play"]')
        page.wait_for_selector("#player:not([hidden])")
        page.wait_for_function("HC.player.state().playing")
        # Wiedergabe anhalten, ohne zu pausieren: feste Position für ein stabiles Bild
        page.evaluate("HC.player.audio.playbackRate = 0; HC.player.seek(7.9)")
        self.settle()
        self.shot("library-player")
        page.click("#player [data-p=list]")
        self.settle()
        self.shot("player-chapters-open")
        page.hover("#pl-seek", position={"x": 150, "y": 8})
        self.settle()
        if not self.only or "player-seek-tooltip" in self.only:
            path = self.out / "player-seek-tooltip.png"
            page.screenshot(path=str(path), animations="disabled")
            self.written.append(path)
            print(f"  {path.relative_to(ROOT) if path.is_relative_to(ROOT) else path}")
        page.click("#player [data-p=list]")
        page.click('#lib-view [data-v="grid"]')
        self.settle()
        self.shot("library-player-grid")
        page.click('#lib-view [data-v="list"]')
        self.settle()
        # Genre per Klick auf das Badge: Auswahl, danach set_genre + retag (Datei wird verschoben)
        page.click('#lib-body tr[data-id="gGabbClassM"] [data-act="genre"]')
        page.wait_for_selector(".menu")
        self.settle()
        self.shot("library-genre-popover")
        page.click('.menu [data-k="genre-Uptempo"]')
        page.wait_for_selector("#toasts .toast.ok")
        self.settle()
        self.shot("library-genre-moved")
        page.evaluate("HC.player.close()")
        self.go("discover")

    def playback_scenes(self) -> None:
        """v0.7.0: Wellenform mit Kapiteln, Fortsetzen (fragen/automatisch), Schlaf-Timer,
        «Weiterhören» in der Bibliothek, Analyse-Durchlauf im Tab «Wiedergabe»."""
        page = self.page
        self.go("library")
        page.evaluate("document.getElementById('lib-scroll').scrollTop = 0")
        self.settle()
        self.shot("library-continue")
        # gemerkte Position: der Player fragt, bevor er startet
        page.click('#lib-body tr[data-id="kRawNation4"] [data-act="play"]')
        page.wait_for_selector("#pl-resume:not([hidden]) [data-r=resume]")
        self.settle()
        self.shot("player-resume-ask")
        page.click("#pl-resume [data-r=resume]")
        page.wait_for_function("HC.player.state().playing")
        page.evaluate("HC.player.audio.playbackRate = 0")
        page.evaluate("HC.player.seek(5.2)")
        self.settle()
        box = page.locator("#pl-seek").bounding_box()
        page.mouse.move(box["x"] + box["width"] * 0.66, box["y"] + box["height"] / 2)
        page.wait_for_selector("#pl-tip:not([hidden])")
        self.settle(100)
        if not self.only or "player-waveform-hover" in self.only:
            path = self.out / "player-waveform-hover.png"
            page.screenshot(path=str(path), animations="disabled")
            self.written.append(path)
            print(f"  {path.relative_to(ROOT) if path.is_relative_to(ROOT) else path}")
        page.click("#player [data-p=sleep]")
        page.wait_for_selector(".menu")
        self.settle()
        self.shot("player-sleep-menu")
        page.click('.menu [data-k="sleep-30"]')
        self.settle()
        self.shot("player-sleep-on")
        page.evaluate("HC.player.sleep(null); HC.player.close()")
        # automatisch fortsetzen: kurzer Hinweis mit «Von vorn»
        page.evaluate(
            "Object.assign(HC.settings.values.player, {resume: 'auto'});"
            "HC.bridge.emit('settings_changed', {})"
        )
        page.click('#lib-body tr[data-id="zZrhPod0006"] [data-act="play"]')
        page.wait_for_selector("#pl-resume:not([hidden])")
        page.evaluate("HC.player.audio.playbackRate = 0")
        self.settle()
        self.shot("player-resume-auto")
        page.evaluate(
            "HC.player.close(); Object.assign(HC.settings.values.player, {resume: 'ask'});"
            "HC.bridge.emit('settings_changed', {})"
        )
        # Analyse-Durchlauf im Tab «Wiedergabe»
        self.go("settings")
        self.tab("playback")
        page.evaluate(
            "document.querySelector('[data-custom=analysis]').scrollIntoView({block: 'center'})"
        )
        page.click('[data-custom=analysis] [data-an="new"]')
        page.wait_for_selector("[data-custom=analysis] .fest-prog")
        self.settle(300)
        self.shot("settings-playback-analysing")
        page.wait_for_selector("#toasts .toast.ok", timeout=15000)
        self.settle()
        self.clear_toasts()
        page.evaluate("HC.views.settings.reset()")
        self.go("discover")

    def backfill_scenes(self) -> None:
        """v0.4.0 «Alles einlesen (einmalig)»: Bestätigung mit Schätzung, Fortschritt an der
        Quelle (liest / angehalten / wartet nach Backoff), «fertig» unter dem Namen."""
        page = self.page
        page.evaluate("HC.mock.api.clear_backoff(); HC.mock.api.clear_backoff('soundcloud')")
        self.go("watchlist")
        self.wl_menu(2)
        self.settle()
        self.shot("watchlist-row-menu")
        page.click('.menu [data-k="bf"]')
        page.wait_for_selector(".modal.bf-dlg")
        self.settle()
        self.shot("watchlist-backfill-dialog")
        page.keyboard.press("Escape")
        self.wl_menu(1, "bf")
        page.wait_for_selector(".modal.bf-dlg")
        self.settle()
        self.shot("watchlist-backfill-dialog-unknown")
        page.keyboard.press("Escape")
        page.evaluate(
            "HC.mock.demo.backfill(2, {state: 'running', position: 240, added: 37, requests: 9});"
            " HC.mock.demo.backfill(8, {state: 'paused', position: 400, total: null, added: 52,"
            " requests: 3});"
            " HC.mock.demo.backfill(9, {state: 'pending', position: 50, added: 6, requests: 2,"
            " note: 'Backoff (SoundCloud) until 14:30 – continues automatically'});"
            " HC.mock.demo.backfill(6, {state: 'done', position: 312, added: 64,"
            " finished: new Date(Date.now() - 2 * 86400000).toISOString()})"
        )
        page.evaluate("document.activeElement && document.activeElement.blur()")
        self.settle(300)
        self.shot("watchlist-backfill-progress")

    def watchlist_scenes(self) -> None:
        """Phase 4: laufende Prüfung, Backoff-Sperre, Eingang mit Auswahl, Zeitplan mit Aufgabe.

        Läuft nach den Grundbildern, weil die Prüfung den Mock-Zustand verändert.
        """
        page = self.page
        page.evaluate("HC.mock.demo.local(null); HC.mock.api.clear_backoff()")
        self.go("watchlist")
        # Quelle 1 findet etwas, Quelle 2 schlägt fehl, Quelle 3 bleibt im Zustand «prüft …»
        page.evaluate(
            "HC.mock.demo.sourceError(2, 'Channel not found (HTTP 404) – check the URL');"
            " HC.mock.demo.checkHold(3)"
        )
        page.click("#wl-check")
        page.wait_for_selector('#wl-body tr[data-id="3"].checking')
        self.settle(300)
        self.shot("watchlist-checking")
        page.evaluate("HC.mock.demo.checkRelease()")
        page.wait_for_function("!document.querySelector('#wl-check').classList.contains('busy')")
        self.settle(300)
        self.shot("watchlist-done")

        page.evaluate("HC.mock.demo.backoff(6)")
        self.settle(300)
        self.shot("watchlist-backoff")
        page.evaluate("HC.mock.api.clear_backoff()")

        # Eingang: neue Treffer der Prüfung, Mehrfachauswahl, Quelle-Filter
        self.go("inbox")
        for i in (1, 3, 4):
            page.click(f"#grid-inbox .card:nth-child({i}) .selbox", force=True)
        self.settle()
        self.shot("inbox-selected")
        page.click("#inbox-selall")
        page.click("#inbox-selall")
        page.click('#inbox-bar .chip[data-src="4"]')
        self.settle()
        self.shot("inbox-source-filter")
        page.click('#inbox-bar .chip[data-src=""]')

        # Zeitplan: In-App-Prüfung und Windows-Aufgabe aktiv -> die Aufgabe ist der frühere Termin
        self.go("settings")
        self.tab("schedule")
        page.wait_for_selector("[data-task=create]")
        page.click("[data-task=create]")
        page.wait_for_selector("[data-task=remove]")
        page.evaluate("document.querySelector('#spane-scroll').scrollTop = 0")
        self.settle()
        self.shot("settings-schedule-task")
        page.evaluate("document.querySelector('[data-task=remove]').click()")
        page.wait_for_selector("[data-task=create]")
        self.settle()

    def library_scenes(self) -> None:
        """Phase 5: Liste/Kacheln, Gruppierung, fehlende Dateien, Löschdialog, neu taggen, leer."""
        page = self.page
        self.go("library")
        self.shot("library")
        self.shot("library-list")
        page.click('#lib-view [data-v="grid"]')
        self.settle()
        self.shot("library-grid")
        page.click('#lib-groupby [data-g="genre"]')
        self.settle()
        self.shot("library-grid-grouped")
        page.click('#lib-view [data-v="list"]')
        self.settle()
        self.shot("library-list-grouped")
        page.click('#lib-groupby [data-g="none"]')
        page.click("#lib-missing")
        self.settle()
        self.shot("library-missing")
        self.row_menu("#lib-body tr.missing", "del")
        page.wait_for_selector(".modal")
        self.settle()
        self.shot("library-remove-dialog")
        page.keyboard.press("Escape")
        page.click("#lib-missing")
        page.fill("#lib-q", "gabber")
        self.settle()
        self.shot("library-search")
        page.fill("#lib-q", "")
        page.dispatch_event("#lib-q", "input")
        self.settle()
        self.row_menu('#lib-body tr[data-id="gGabbClassM"]', "del")
        page.wait_for_selector(".modal")
        self.settle()
        self.shot("library-delete-dialog")
        page.keyboard.press("Escape")
        # neu taggen: das Ablage-Muster verschiebt die Datei -> Hinweis mit dem neuen Ort
        self.row_menu('#lib-body tr[data-id="cIndVol016"]', "retag")
        page.wait_for_selector("#lib-body tr.working")
        self.shot("library-retag-running")
        page.wait_for_selector("#toasts .toast.info")
        self.settle()
        self.shot("library-retag-moved")
        # leere Bibliothek
        page.evaluate("HC.mock.demo.libraryEmpty()")
        self.go("discover")
        self.go("library")
        self.shot("library-empty")
        page.evaluate("HC.mock.demo.libraryEmpty(false)")
        self.go("discover")

    def festival_scenes(self) -> None:
        """v0.3.0: group by festival/series (tiles, year timeline, stages), badge form, settings."""
        page = self.page
        self.go("library")
        page.click('#lib-groupby [data-g="festival"]')
        page.wait_for_selector(".fest-tile")
        self.settle()
        self.shot("library-festivals")
        page.click('.fest-tile:has(.ft-name:text-is("Defqon.1"))')
        page.wait_for_selector(".fest-line")
        self.settle()
        self.shot("library-festival-series")
        page.click('#lib-view [data-v="grid"]')
        self.settle()
        self.shot("library-festival-series-grid")
        page.click('#lib-view [data-v="list"]')
        page.click('.fest-line [data-edition="all"]')
        self.settle()
        self.shot("library-festival-all-years")
        # badge -> form: series (searchable), year, variant, stage, set type
        page.click(".fest-line button:last-child")
        page.click('#lib-body tr[data-id="qDq24PwrHr1"] [data-act="fest"]')
        page.wait_for_selector(".popover.fpop")
        self.settle()
        self.shot("library-festival-popover")
        page.fill('.fpop [data-f="stage"]', "BLUE")
        page.click('.fpop [data-f="ok"]')
        page.wait_for_selector("#toasts .toast")
        self.settle()
        self.shot("library-festival-set")
        # unassigned entries: uncertain detections as dashed suggestions with "accept"
        page.click("[data-fest-back]")
        page.click('.fest-tile[data-series="none"]')
        page.fill("#lib-q", "th")
        self.settle()
        self.shot("library-festival-other")
        page.fill("#lib-q", "")
        page.dispatch_event("#lib-q", "input")
        page.click("[data-fest-back]")
        page.click('#lib-groupby [data-g="artist"]')
        self.settle()
        self.shot("library-group-artist")
        page.click('#lib-groupby [data-g="year"]')
        self.settle()
        self.shot("library-group-year")
        page.click('#lib-groupby [data-g="none"]')

        # settings: running pass (progress + cancel), result, series dialog, title test
        self.go("settings")
        self.tab("festivals")
        page.wait_for_selector(".series-row")
        page.evaluate(
            "window.mv.emit('festival_assign', {phase: 'start', scope: 'library'});"
            " window.mv.emit('festival_assign', {phase: 'progress', scope: 'library',"
            " done: 50, total: 77, assigned: 2, suggested: 0, none: 0, manual: 1, unchanged: 47})"
        )
        self.settle()
        self.shot("settings-festivals-assigning")
        page.evaluate(
            "window.mv.emit('festival_assign', {phase: 'done', scope: 'library', ok: true,"
            " cancelled: false, done: 77, total: 77, assigned: 3, suggested: 0, none: 0,"
            " manual: 1, unchanged: 73})"
        )
        self.clear_toasts()
        page.fill("[data-custom=festTest] [data-title]", "Qlimax 2019 | Symphony of Shadows")
        page.wait_for_selector(".fest-test:not([hidden])")
        page.click("[data-custom=festTypes] [data-add]")
        page.fill("[data-custom=festTypes] [data-kw]", "liveregistratie")
        page.evaluate(
            "document.querySelector('[data-custom=festTypes]').scrollIntoView({block: 'center'})"
        )
        self.settle()
        self.shot("settings-festivals-test")
        page.click("#btn-discard")
        page.click('.series-row:has(b:text-is("Defqon.1")) [data-s="edit"]')
        page.wait_for_selector(".series-modal")
        self.settle()
        self.shot("settings-festivals-series-dialog")
        page.keyboard.press("Escape")
        page.evaluate("HC.views.settings.reset()")  # forget the simulated pass
        self.go("discover")

    def collector_scenes(self) -> None:
        """v0.5.0 «Festival collector»: overview, checklist (stats, sources, table, action bar),
        filter, inline edit, timetable/playlist/files dialogs, estimate, running search."""
        page = self.page
        self.go("library")
        page.click("#lib-collector-btn")
        page.wait_for_selector(".co-card")
        self.settle()
        self.shot("library-collector")
        page.click('.co-card:has(.ft-name:text-is("Defqon.1 2024")) [data-co="open"]')
        page.wait_for_selector("#co-rows tr.co-row")
        self.settle()
        self.shot("library-collector-checklist")
        self.shot_scrolled("library-collector-checklist", "#co-scroll")
        page.click('.co-stat[data-status="missing"]')
        self.settle()
        self.shot("library-collector-filter")
        page.click('.co-stat[data-status="missing"]')
        page.click('#co-rows tr:has(b:text-is("Ran-D")) [data-co="edit"]')
        page.wait_for_selector("tr.co-edit")
        self.settle()
        self.shot("library-collector-edit")
        page.keyboard.press("Escape")
        # paste a timetable: live preview of the parsed rows, skipped lines
        page.click('.co-tools [data-co="paste"]')
        page.wait_for_selector(".modal.co-tt")
        self.settle()
        self.shot("library-collector-timetable-empty")
        page.fill(
            ".co-tt textarea",
            "Defqon.1 2024 timetable\n\nFriday - RED\n17:00 - 18:00 Sound Rush\n"
            "18:00 - 19:00 Phuture Noize (Live)\n19:00 - 20:00 Brennan Heart\n\n"
            "Saturday - BLUE\nAct of Rage | 19:00-20:00\nRooler | 20:00-21:00\n"
            "22.00 - 23.00 D-Sturb b2b Act of Rage\n??:??\n\nSunday - BLACK\n"
            "Partyraiser 21:00-22:00\nSefa 22:00-23:00 (Live)\n- The Endshow",
        )
        page.wait_for_selector(".co-tt-prev table")
        self.settle()
        self.shot("library-collector-timetable")
        page.keyboard.press("Escape")
        page.click('.co-tools [data-co="playlist"]')
        page.wait_for_selector(".modal.co-dlg")
        self.settle()
        self.shot("library-collector-playlist")
        page.keyboard.press("Escape")
        # shipped timetables: none in v0.5.0 (format + how to contribute), then demo files
        page.click('.co-tools [data-co="files"]')
        page.wait_for_selector(".modal.co-files")
        self.settle()
        self.shot("library-collector-files-empty")
        page.keyboard.press("Escape")
        page.evaluate("HC.mock.demo.timetableFiles()")
        page.click('.co-tools [data-co="files"]')
        page.wait_for_selector(".co-file")
        self.settle()
        self.shot("library-collector-files")
        page.keyboard.press("Escape")
        page.evaluate("HC.mock.demo.timetableFiles(false)")
        # find missing sets: estimate, then the paced search with progress
        page.click('#co-bar [data-co="find"]')
        page.wait_for_selector(".modal.co-est")
        self.settle()
        self.shot("library-collector-estimate")
        page.keyboard.press("Escape")
        page.evaluate(
            "HC.mock.demo.collectorJob(HC.mock.demo.collectorEdition('defqon1', 2024),"
            " {state: 'running', total: 4, done: 1, searches: 1, hits: 1,"
            " note: 'Next search at 09:21'})"
        )
        self.settle(200)
        self.shot("library-collector-searching")
        page.evaluate(
            "HC.mock.demo.collectorJob(HC.mock.demo.collectorEdition('defqon1', 2024),"
            " {state: 'done', total: 4, done: 4, searches: 4, hits: 1})"
        )
        self.clear_toasts()
        # a fresh checklist: empty state with the four sources
        page.click('[data-co="back"]')
        page.wait_for_selector("#co-new")
        page.select_option("#co-series", label="Dominator")
        page.fill("#co-year", "2025")
        page.click('[data-co="create"]')
        page.wait_for_selector(".co-empty-actions")
        self.settle()
        self.shot("library-collector-empty")
        page.click(".co-head [data-co=menu]")
        page.click('.menu [data-k="del"]')
        page.click(".modal [data-act=ok]")
        page.wait_for_selector("#co-new")
        self.clear_toasts()
        page.click('[data-co="back"]')
        self.settle()

    def tracks_scenes(self) -> None:
        """v0.6.0 «Tracklist search»: most played, results with timestamps, tracklist panel,
        no results, first read with progress, never-read empty state, menu entry in the library."""
        page = self.page
        self.go("library")
        page.click("#lib-tracks-btn")
        page.wait_for_selector(".tr-top-list li")
        self.settle()
        self.shot("library-tracks")
        page.fill("#tr-q", "kernschmelze")
        page.wait_for_selector(".tr-set")
        self.settle()
        self.shot("library-tracks-results")
        page.locator(".tr-set [data-tr=panel]").first.click()
        page.wait_for_selector(".tl-panel .tl-row")
        self.settle()
        self.shot("library-tracks-panel")
        page.keyboard.press("Escape")
        page.fill("#tr-q", "dragonborn")
        page.wait_for_selector(".tr-empty")
        self.settle()
        self.shot("library-tracks-no-results")
        page.fill("#tr-q", "")
        page.click("[data-tr=back]")
        self.settle()
        # first open: reads the tracklists once (progress + cancel), then the explained empty state
        page.evaluate("HC.tracks.reset(); HC.mock.demo.tracksFresh(); HC.mock.speed.factor = 4")
        page.click("#lib-tracks-btn")
        page.wait_for_function(
            "document.querySelector('.tr-prog .unit') &&"
            " /[1-9]/.test(document.querySelector('.tr-prog .unit').textContent)"
        )
        page.wait_for_timeout(400)
        self.shot("library-tracks-reading")
        page.click("[data-tr=cancel]")
        page.wait_for_selector(".tr-status [data-tr=scan]")
        page.evaluate("HC.mock.demo.tracksFresh(); HC.mock.speed.factor = 1")
        page.click("[data-tr=back]")
        self.settle()
        page.click("#lib-tracks-btn")
        page.wait_for_selector(".tr-empty [data-tr=scan]")
        self.clear_toasts()
        self.settle()
        self.shot("library-tracks-fresh")
        page.evaluate("HC.mock.demo.tracksFresh(false)")
        page.click("[data-tr=back]")
        self.settle()
        self.row_menu("#lib-body tr[data-id]:nth-child(1)", "tracklist")
        page.wait_for_selector(".tl-panel")
        self.settle()
        self.shot("library-tracklist-menu")
        page.keyboard.press("Escape")
        self.clear_toasts()

    def sources_scenes(self) -> None:
        """v0.10.0: Mixcloud/hearthis.at search, re-upload marks in library and downloads, the
        library pass with progress."""
        page = self.page
        page.evaluate("HC.mock.api.clear_backoff(); HC.mock.demo.local(null)")
        self.go("discover")
        page.click("#f-reset")
        for plat in ("mixcloud", "hearthis"):
            self.pick_platform(plat)
            self.settle()
            page.fill("#q", "hardcore mix")
            page.click("#btn-search")
            page.wait_for_function(
                "document.querySelector('#grid .card:not(.skeleton)')"
                f" && document.querySelector('#v-discover').dataset.platform"
                f" === '{plat}'"
            )
            page.wait_for_selector("#grid .card:not(.skeleton)")
            self.settle()
            self.shot(f"discover-{plat}")
        self.pick_platform("youtube")
        self.settle()

        self.go("library")
        page.wait_for_selector("#lib-body .ru-tag")
        self.settle()
        self.shot("library-reupload")
        page.click("#lib-body .ru-tag:not(.linked)")
        page.wait_for_selector('.menu [data-k="ru-keep"]')
        self.settle()
        self.shot("library-reupload-menu")
        page.keyboard.press("Escape")
        page.click("#lib-reup")
        page.wait_for_selector("#lib-reup.on")
        self.settle()
        self.shot("library-reuploads")
        page.click("#lib-reup")

        self.go("downloads")
        page.wait_for_selector("#q-reup:not([hidden])")
        self.settle()
        self.shot("downloads-reupload")

        self.go("settings")
        self.tab("reupload")
        page.click('[data-fp="new"]')
        page.wait_for_selector('[data-fp="cancel"]')
        page.wait_for_selector("[data-custom=reuploadStatus] .progress .bar")
        self.settle(700)
        self.shot("settings-reupload-running")
        page.click('[data-fp="cancel"]')
        page.wait_for_selector('[data-fp="new"]')
        self.settle()

    def stats_scenes(self) -> None:
        """v0.9.0 statistics view (all time, 12 months, custom range without downloads, empty
        library), notifications and media server settings (test result, stored token)."""
        page = self.page
        self.go("stats")
        page.click('#st-preset [data-p="all"]')
        page.wait_for_selector("#st-months .st-col")
        self.settle()
        self.shot("stats")
        self.shot_scrolled("stats", "#st-scroll")
        page.click('#st-preset [data-p="12m"]')
        page.wait_for_function(
            "HC.views.stats.state().loaded && HC.views.stats.state().range.preset === '12m'"
        )
        self.settle()
        self.shot("stats-12m")
        page.click('#st-preset [data-p="custom"]')
        page.fill("#st-from", "2019-01-01")
        page.fill("#st-to", "2019-12-31")
        page.dispatch_event("#st-to", "change")
        page.wait_for_selector("#st-zero")
        self.settle()
        self.shot("stats-range-empty")
        page.click('#st-preset [data-p="all"]')
        page.wait_for_selector("#st-months .st-col")
        page.evaluate("HC.mock.demo.libraryEmpty()")
        self.go("discover")
        self.go("stats")
        page.wait_for_selector("#st-empty")
        self.settle()
        self.shot("stats-empty")
        page.evaluate("HC.mock.demo.libraryEmpty(false)")

        self.go("settings")
        self.tab("notifications")
        page.click("[data-ntest]")
        page.wait_for_selector("[data-custom=notifyStatus] .notice")
        self.settle()
        self.shot("settings-notifications-test")
        self.tab("mediaserver")
        page.click('.field[data-k="media_server.type"] [data-v="plex"]')
        page.fill('.field[data-k="media_server.url"] [data-c]', "http://192.168.1.10:32400")
        page.fill("#ms-secret", "xYz-plex-token")
        page.click("[data-mstest]")
        page.wait_for_selector("[data-custom=msConnect] .notice.ok")
        page.evaluate(
            "document.querySelector('[data-custom=msConnect]').scrollIntoView({block: 'center'})"
        )
        self.settle()
        self.shot("settings-mediaserver-test")
        page.evaluate("document.querySelector('#spane-scroll').scrollTop = 0")
        page.click("#btn-save")
        page.wait_for_function("document.querySelector('#btn-save').disabled")
        page.wait_for_selector("[data-custom=msStatus] [data-msscan]:not([disabled])")
        page.click("[data-msscan]")
        page.wait_for_selector("[data-custom=msStatus] .notice.ok")
        self.clear_toasts()
        self.settle()
        self.shot("settings-mediaserver")
        page.evaluate("HC.mock.api.reset_settings('media_server')")

    def djs_scenes(self) -> None:
        """v0.8.0 DJ pages + playlist export: DJ list, a DJ page (aliases, b2b, festivals, most
        played tracks), «Add to watchlist» confirmation, edit dialog, export dialog (also the
        overwrite question), saved playlists in Settings › Storage."""
        page = self.page
        self.go("library")
        page.click("#lib-djs-btn")
        page.wait_for_selector(".dj-card")
        self.settle()
        self.shot("library-djs")
        page.click('.dj-card[data-key="headhunterz"]')
        page.wait_for_selector(".dj-set")
        self.settle()
        self.shot("library-dj-page")
        page.click("[data-dj=watch]")
        page.wait_for_selector(".modal .pathbox")
        self.settle()
        self.shot("library-dj-watch")
        page.keyboard.press("Escape")
        page.click("[data-dj=list]")
        page.wait_for_selector(".dj-card")
        page.click('.dj-card[data-key="angerfist"]')
        page.wait_for_selector(".dj-role")
        self.settle()
        self.shot("library-dj-b2b")
        page.click("[data-dj=more]")
        page.click('.menu [data-k="edit"]')
        page.wait_for_selector("#dj-f-aliases input")
        self.settle()
        self.shot("library-dj-edit")
        page.keyboard.press("Escape")
        page.click("[data-dj=export]")
        page.wait_for_selector(".pl-dlg")
        self.settle()
        self.shot("library-playlist-export")
        page.click(".modal [data-act=ok]")
        page.wait_for_selector(".modal", state="detached")
        self.clear_toasts()
        page.click("[data-dj=export]")
        page.wait_for_selector(".pl-dlg")
        page.click(".modal [data-act=ok]")
        page.wait_for_selector("#pl-msg .notice")
        self.settle()
        self.shot("library-playlist-exists")
        page.keyboard.press("Escape")
        page.click("[data-dj=list]")
        page.wait_for_selector(".dj-card")
        page.click("[data-dj=back]")
        self.settle()
        self.clear_toasts()
        self.go("settings")
        self.tab("storage")
        page.evaluate(
            "document.querySelector('[data-custom=playlists]').scrollIntoView({block: 'center'})"
        )
        page.wait_for_selector(".pl-saved li")
        self.settle()
        self.shot("settings-playlists")

    def log_scenes(self) -> None:
        """Phase 5: Live-Log (Filter, Suche, Pause beim Hochscrollen), Lauf-Historie als Tabelle."""
        page = self.page
        self.go("log")
        self.shot("log")
        page.click('#log-levels [data-lvl="debug"]')
        page.fill("#log-q", "throttle")
        self.settle()
        self.shot("log-search")
        page.fill("#log-q", "")
        page.dispatch_event("#log-q", "input")
        self.settle()
        # hochscrollen pausiert das Mitlaufen; neue Zeilen werden gezählt
        page.wait_for_function("document.querySelectorAll('#logbox .log-line').length > 20")
        page.evaluate("document.querySelector('#logbox').scrollTop = 0")
        page.wait_for_selector("#log-jump:not([hidden])")
        page.evaluate(
            "HC.mock.demo.log('info', 'Suche «uptempo mix» · 30 Treffer (flach)');"
            " HC.mock.demo.log('warn', 'Throttle: 19/20 Suchen diese Stunde');"
            " HC.mock.demo.log('ok', 'PO-Token erneuert')"
        )
        self.settle()
        self.shot("log-paused")
        page.click("#log-jump")
        page.click('#log-levels [data-lvl="debug"]')
        # ein Lauf endet -> Event «run» trägt ihn live nach
        page.evaluate(
            "HC.mock.demo.run({kind: 'headless', found: 4, downloaded: 2,"
            " note: 'Run limit reached (2/2) – the rest stays in the queue'})"
        )
        page.click('#runs-view [data-v="table"]')
        self.settle()
        self.shot("log-runs")
        page.click('#runs-kind [data-kind="headless"]')
        self.settle()
        self.shot("log-runs-headless")
        page.click('#runs-kind [data-kind=""]')
        page.click('#runs-view [data-v="timeline"]')
        self.settle()

    def maintenance_scenes(self) -> None:
        """Phase 5: Update mit Live-Ausgabe, «Neustart nötig», Backup-Liste."""
        page = self.page
        self.go("settings")
        self.tab("maintenance")
        page.click("[data-update]")
        page.wait_for_selector(".console-wrap.live .cl")
        page.wait_for_timeout(700)
        self.shot("settings-maintenance-updating")
        page.wait_for_selector(".console-wrap.done", timeout=15000)
        page.click('[data-db="backup"]')
        page.wait_for_selector(".bk.fresh")
        self.clear_toasts()
        page.evaluate("document.querySelector('#spane-scroll').scrollTop = 0")
        self.settle()
        self.shot("settings-maintenance-updated")
        self.shot_scrolled("settings-maintenance-updated", "#spane-scroll")

    # -- scenes ------------------------------------------------------------
    def run(self) -> None:
        page = self.page
        page.goto(INDEX.as_uri() + f"?mock=1&nosim=1&lang={self.lang}")
        page.wait_for_function("document.body.classList.contains('ready')")
        if self.reduced:
            page.evaluate(
                "HC.app.applyAppearance({reduce_effects: true, scanlines: true, pulse_bpm: 200})"
            )
        self.settle()

        # Entdecken: Ergebnisse, Skeleton während der Suche, Auswahl + Menü
        self.go("discover")
        self.shot("discover")
        # Clean UI: keyword boxes behind «Keywords · n include · n exclude»
        self.keywords(True)
        self.settle()
        self.shot("discover-keywords")
        self.keywords(False)
        # status bar: «System OK» with the single values in a popover; a missing tool shows them inline
        page.click("#sb-sys")
        page.wait_for_selector(".sb-pop")
        self.settle()
        self.shot("statusbar-system")
        page.keyboard.press("Escape")
        page.evaluate("HC.mock.demo.tools({deno_ok: false})")
        page.wait_for_selector("#sb-deno-it:not([hidden])")
        self.settle()
        self.shot("statusbar-problem")
        page.evaluate("HC.mock.demo.tools()")
        page.wait_for_selector("#sb-sys:not([hidden])")
        page.click("#btn-search")
        page.wait_for_selector("#grid .card.skeleton")
        page.wait_for_timeout(250)
        self.shot("discover-loading")
        page.wait_for_selector("#grid .card:not(.skeleton)")
        self.settle()
        for i in (1, 2, 4):
            page.click(f"#grid .card:nth-child({i}) .selbox", force=True)
        page.click("#grid .card:nth-child(3) [data-act=more]")
        page.wait_for_selector(".menu")
        self.settle()
        self.shot("discover-selected")
        page.keyboard.press("Escape")
        page.click("#f-toggle")
        self.settle()
        self.shot("discover-no-filters")
        page.click("#f-toggle")
        # App-Update-Banner als Leiste über dem Inhalt: verdeckt weder «Suchen» noch Sortierung
        page.evaluate("HC.bridge.safe('check_update')")
        page.wait_for_selector(".upd-banner")
        self.settle()
        self.shot("discover-update-banner")
        # Release-Notizen: Highlights, alle Änderungen (Tabelle, Zitat), übersprungene Versionen
        page.click(".upd-banner [data-upd=notes]")
        page.wait_for_selector(".upd-notes")
        self.settle()
        self.shot("update-notes")
        page.click("[data-upd-toggle]")
        self.settle()
        self.shot("update-notes-all")
        page.evaluate("document.querySelector('.upd-notes').scrollTo(0, 1e6)")
        self.shot("update-notes-all-2")
        page.keyboard.press("Escape")
        page.evaluate("HC.mock.demo.update('idle', null, true)")
        page.click(".upd-banner [data-upd=notes]")
        page.wait_for_selector(".upd-notes.multi")
        self.settle()
        self.shot("update-notes-versions")
        page.keyboard.press("Escape")
        page.evaluate("HC.mock.demo.update('idle')")
        page.click(".upd-banner [data-upd=later]")
        self.settle()

        self.go("inbox")
        self.shot("inbox")

        self.go("watchlist")
        self.shot("watchlist")
        page.click("#wl-add")
        page.wait_for_selector(".modal")
        self.settle()
        self.shot("watchlist-dialog")
        # Feldfehler aus save_source ({ok:false, errors:{feld: msg}})
        page.click('.modal [data-seg=type] [data-v="playlist"]')
        page.check(".modal [data-f=newest_last]")  # nur bei Playlists sichtbar
        self.settle()
        self.shot("watchlist-dialog-playlist")
        page.fill(".modal [data-f=name]", "Gabber Vault")
        page.fill(".modal [data-f=url_or_query]", "https://www.youtube.com/@gabbervault")
        page.fill(".modal [data-f=max_entries]", "500")
        page.click(".modal [data-act=ok]")
        page.wait_for_selector(".modal .field-error:not([hidden])")
        self.settle(300)
        self.shot("watchlist-edit-errors")
        page.keyboard.press("Escape")

        # Downloads: Simulation von Hand ein paar Schritte weiterdrehen
        self.go("downloads")
        page.evaluate("HC.mock.sim.tick(4)")
        self.settle(500)
        self.shot("downloads")

        self.library_scenes()
        self.festival_scenes()
        self.log_scenes()

        # Einstellungen: jeder Tab, lange Tabs zusätzlich gescrollt
        self.go("settings")
        self.shot("settings")
        for tab in SETTINGS_TABS:
            self.tab(tab)
            self.shot(f"settings-{tab}")
            self.shot_scrolled(f"settings-{tab}", "#spane-scroll")

        # Zustände: Validierungsfehler, Backoff aktiv, Warn-Dialog
        self.tab("throttle")
        fields = {
            "throttle.sleep_requests": "99",
            "throttle.max_sleep_interval": "10",
            "throttle.max_downloads_per_run": "",
        }
        for key, value in fields.items():
            page.fill(f'.field[data-k="{key}"] [data-c]', value)
        page.click("#btn-save")
        page.wait_for_selector(".field.has-error")
        self.settle(300)
        self.shot("settings-validation")
        page.click("#btn-discard")

        page.evaluate("HC.mock.demo.backoff(6)")
        self.tab("throttle")
        self.shot("settings-throttle-backoff")
        page.click("[data-clear]")
        page.wait_for_selector(".modal")
        self.settle()
        self.shot("dialog-backoff")
        page.keyboard.press("Escape")

        self.tab("network")
        page.select_option('.field[data-k="network.cookies_from_browser"] select', "firefox")
        page.click("[data-test]")
        page.wait_for_selector(".statebox .notice.ok")
        self.settle()
        self.shot("settings-network-cookies")
        page.click("#btn-discard")

        # Phase 3: Jahr-Filter (Einstellungen + Entdecken), Pause/Limit in den Downloads.
        # Am Schluss, damit die Bilder davor unverändert bleiben.
        self.tab("filters")
        page.select_option('.field[data-k="filters.upload_period"] select', "year")
        page.fill('.field[data-k="filters.upload_year"] [data-c]', "2013")
        page.evaluate(
            "document.querySelector('.field[data-k=\"filters.upload_period\"]')"
            ".scrollIntoView({block: 'start'})"
        )
        self.settle()
        self.shot("settings-filters-year")
        page.click("#btn-discard")
        page.evaluate("HC.mock.api.clear_backoff()")

        self.go("discover")
        page.select_option("#f-date", "year")
        page.fill("#f-year", "2013")
        page.dblclick('#genre-chips .chip[data-genre="Hardcore"]')
        page.fill("#q", "hardcore liveset")
        page.click("#btn-search")
        page.wait_for_selector("#grid .card:not(.skeleton)")
        self.settle()
        self.shot("discover-year-filter")
        page.click("#f-year-inc")  # Jahr geändert -> Hinweis «neu suchen»
        self.settle()
        self.shot("discover-year-stale")
        page.select_option("#f-date", "custom")
        page.fill("#f-from", "2012-01-01")
        page.fill("#f-to", "2014-12-31")
        page.dispatch_event("#f-from", "change")
        page.dispatch_event("#f-to", "change")
        self.settle()
        self.shot("discover-custom-filter")

        self.go("downloads")
        page.evaluate("HC.mock.demo.sleep(47, 74)")
        self.settle(500)
        self.shot("downloads-sleep")
        page.evaluate("HC.mock.demo.limit('run')")
        self.settle(300)
        self.shot("downloads-limit")
        page.evaluate("HC.mock.demo.backoff(6)")
        self.settle(300)
        self.shot("downloads-backoff")
        # Review Phase 3 m2: lokale Sperre (Zielordner weg) – Einträge bleiben wartend
        page.evaluate("HC.mock.api.clear_backoff().then(() => HC.mock.demo.local('target'))")
        self.settle(300)
        self.shot("downloads-target")
        page.evaluate("HC.mock.demo.local(null)")

        self.watchlist_scenes()

        # Aufgabenplanung antwortet nicht -> Zustand «unbekannt», Schalter bleibt
        page.evaluate("HC.mock.api.clear_backoff(); HC.mock.demo.taskUnknown()")
        self.go("settings")
        page.evaluate("HC.views.settings.reset()")
        self.go("settings")
        self.tab("schedule")
        page.wait_for_selector("[data-task=refresh]")
        page.evaluate(
            "document.querySelector('[data-task=refresh]').scrollIntoView({block: 'center'})"
        )
        self.settle()
        self.shot("settings-schedule-unknown")
        page.evaluate("HC.mock.demo.taskUnknown(false)")

        self.maintenance_scenes()
        self.soundcloud_scenes()
        self.player_scenes()
        self.playback_scenes()
        self.backfill_scenes()
        self.collector_scenes()
        self.tracks_scenes()
        self.djs_scenes()
        self.sources_scenes()
        self.stats_scenes()
        self.discover_platform_scenes()

        # m9: in pywebview gestartet, Backend antwortet nicht -> Fehlerzustand statt Mock
        page.clock.install(time=FIXED_NOW)
        page.goto(INDEX.as_uri() + "?host=pywebview")
        page.wait_for_function("window.HC && HC.bridge && HC.bridge.ready")
        page.clock.run_for(31000)
        page.wait_for_selector("#fatal")
        if self.reduced:
            page.evaluate("document.body.classList.add('reduced')")
        page.clock.run_for(600)
        self.shot("error-backend")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument(
        "--reduced", action="store_true", help="mit reduzierten Effekten (body.reduced)"
    )
    parser.add_argument("--out", type=Path, default=None, help="Zielordner")
    parser.add_argument(
        "--lang",
        default="en",
        choices=LANGUAGES,
        help="UI-Sprache (Standard en; andere unter docs/screenshots/<lang>/)",
    )
    parser.add_argument("--only", nargs="*", default=[], help="nur diese Namen speichern")
    parser.add_argument(
        "--viewport",
        default="",
        metavar="BxH",
        help="Fenstergrösse, z.B. 1100x700 (Mindestfenster); Standard 1440x900",
    )
    args = parser.parse_args()

    viewport = dict(VIEWPORT)
    if args.viewport:
        try:
            width, height = (int(x) for x in args.viewport.lower().split("x"))
        except ValueError:
            parser.error("--viewport erwartet BxH, z.B. 1100x700")
        viewport = {"width": width, "height": height}
        if not args.out:
            parser.error("--viewport nur zusammen mit --out (docs/screenshots bleibt 1440x900)")
    base = DEFAULT_OUT if args.lang == "en" else DEFAULT_OUT / args.lang
    out = args.out or (base / "reduced" if args.reduced else base)
    out.mkdir(parents=True, exist_ok=True)
    problems: list[str] = []

    with sync_playwright() as pw:
        browser = launch(pw)
        context = browser.new_context(
            viewport=viewport,
            device_scale_factor=1,
            locale=BROWSER_LOCALE.get(args.lang, args.lang),
            timezone_id="Europe/Zurich",
            reduced_motion="reduce" if args.reduced else "no-preference",
        )
        page = context.new_page()
        page.clock.set_fixed_time(FIXED_NOW)

        def on_console(msg) -> None:
            if msg.type == "error":
                problems.append(f"console.error: {msg.text}")

        def on_route(route) -> None:
            url = route.request.url
            if url.startswith(("file:", "data:", "about:", "blob:")):
                route.continue_()
            else:
                problems.append(f"externer Request: {url}")
                route.abort()

        page.on("console", on_console)
        page.on("pageerror", lambda exc: problems.append(f"pageerror: {exc}"))
        page.on(
            "requestfailed",
            lambda req: problems.append(f"request failed: {req.url}"),
        )
        page.route("**/*", on_route)

        print(f"Screenshots -> {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}")
        shooter = Shooter(page, out, args.reduced, set(args.only), args.lang)
        try:
            shooter.run()
        except Error as exc:
            problems.append(f"playwright: {exc}")
        finally:
            browser.close()

    print(f"{len(shooter.written)} Screenshots geschrieben.")
    if problems:
        print(f"\n{len(problems)} Problem(e):", file=sys.stderr)
        for line in dict.fromkeys(problems):
            print(f"  - {line}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
