"""Screenshots of every UI view in mock mode.

Opens ``ui/index.html`` via Playwright (file://, no pywebview, mock backend),
walks through all views and settings tabs and writes PNGs to
``docs/screenshots/`` (``--reduced``: ``docs/screenshots/reduced/``).

The script fails (exit code 1) on JavaScript errors, ``console.error`` output
or any request that leaves the local file system – the UI must work offline.

Usage:
    python scripts/ui_screenshots.py [--reduced] [--out DIR] [--only NAME ...]

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

VIEWS = ["discover", "inbox", "watchlist", "downloads", "library", "log", "settings"]
SETTINGS_TABS = [
    "general",
    "filters",
    "genres",
    "download",
    "storage",
    "throttle",
    "network",
    "schedule",
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
    for kwargs in attempts:
        try:
            return pw.chromium.launch(**kwargs)
        except Error as exc:  # try the next candidate
            last = exc
    raise SystemExit(f"Kein Chromium gefunden: {last}")


class Shooter:
    def __init__(self, page: Page, out: Path, reduced: bool, only: set[str]) -> None:
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
        self.page.mouse.move(1180, 4)  # keep hover effects out of the picture
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

    def watchlist_scenes(self) -> None:
        """Phase 4: laufende Prüfung, Backoff-Sperre, Eingang mit Auswahl, Zeitplan mit Aufgabe.

        Läuft nach den Grundbildern, weil die Prüfung den Mock-Zustand verändert.
        """
        page = self.page
        page.evaluate("HC.mock.demo.local(null); HC.mock.api.clear_backoff()")
        self.go("watchlist")
        # Quelle 1 findet etwas, Quelle 2 schlägt fehl, Quelle 3 bleibt im Zustand «prüft …»
        page.evaluate(
            "HC.mock.demo.sourceError(2, 'Kanal nicht gefunden (HTTP 404) – URL prüfen');"
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

    # -- scenes ------------------------------------------------------------
    def run(self) -> None:
        page = self.page
        page.goto(INDEX.as_uri() + "?mock=1&nosim=1")
        page.wait_for_function("document.body.classList.contains('ready')")
        if self.reduced:
            page.evaluate(
                "HC.app.applyAppearance({reduce_effects: true, scanlines: true, pulse_bpm: 200})"
            )
        self.settle()

        # Entdecken: Ergebnisse, Skeleton während der Suche, Auswahl + Menü
        self.go("discover")
        self.shot("discover")
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

        self.go("library")
        self.shot("library")

        self.go("log")
        self.shot("log")

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
    parser.add_argument("--only", nargs="*", default=[], help="nur diese Namen speichern")
    args = parser.parse_args()

    out = args.out or (DEFAULT_OUT / "reduced" if args.reduced else DEFAULT_OUT)
    out.mkdir(parents=True, exist_ok=True)
    problems: list[str] = []

    with sync_playwright() as pw:
        browser = launch(pw)
        context = browser.new_context(
            viewport=VIEWPORT,
            device_scale_factor=1,
            locale="de-CH",
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
        shooter = Shooter(page, out, args.reduced, set(args.only))
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
