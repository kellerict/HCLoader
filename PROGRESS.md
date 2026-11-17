# PROGRESS – HCLoader

Wird vom Orchestrator (`/build-all`) nach jedem Schritt aktualisiert. Ein neuer Lauf setzt beim ersten offenen Punkt fort.

## Betriebsmodus dieses Laufs
Cloud-Session (Linux-Container). Abweichend von `build-all.md`: alle Phasen auf Branch `claude/compassionate-thompson-zgetlu`, ein Commit-Block pro Phase, **keine** PRs/Merges/Tags auf `main` (Repo war leer, Freigabe fehlt). Tags/PR/Merge macht der User. Windows-spezifisches (`setup.ps1`, WebView2-Fenster, `schtasks`) wird nur per Windows-CI bzw. lokal geprüft.

## Vorbedingungen
- [x] git OK, Remote `origin` = github.com/kellerict/HCLoader (Repo war leer; `gh` hier nicht nutzbar → GitHub-Tools)
- [x] Python 3.12+ vorhanden (3.13 im Container, CI: 3.12 auf windows-latest)
- [~] `MV_SMOKE_URL` vom User geliefert: `https://www.youtube.com/watch?v=QeD-amb0vA0` – aber ist youtube.com aus dem Container gesperrt (Proxy 403; Audio-Streams kommen von wechselnden `*.googlevideo.com`-Hosts, die sich nicht als exakte Hosts freigeben lassen) → Smoke-Tests lokal unter Windows durch den User

## Phasen
| Phase | Status | Branch | PR | Tag |
|---|---|---|---|---|
| 1 – Gerüst & Kern-Download | **abgeschlossen** (QA bestanden bis auf extern blockierten Smoke; Review Runde 2: N1/N2 behoben) | claude/compassionate-thompson-zgetlu | – | – |
| 2 – GUI-Grundgerüst | **abgeschlossen** (QA bestanden, Review freigegeben, 12 Minor → Phase 3) | claude/compassionate-thompson-zgetlu | – | – |
| 3 – Entdecken & Downloads | **abgeschlossen** (QA bestanden; Review R1 behoben 00f165c, R2 behoben ba6ccbd) | | | |
| 4 – Watchlist & Zeitplan | **abgeschlossen** (QA bestanden; Review R1 behoben 06503c8, R2 freigegeben, R2-m1 behoben) | | | |
| 5 – Bibliothek, Protokoll, Feinschliff | **abgeschlossen** (QA bestanden; Review R1 behoben ea1e9aa, R2 freigegeben, R2-m1 behoben) |
| 7 – Weitere Quellen (User-Wunsch) | 7a SoundCloud in Arbeit (Backend); 7b Mixcloud + hearthis.at, 7c archive.org geplant |
| 6 – Portable (User-Wunsch) | gebaut (6ba6448); Windows-Build nie gelaufen (Actions blockiert); QA/Review offen | | | |

## Aktueller Plan
Phase 1
- 1a `backend-dev` (Sonnet): pyproject, .gitignore, config, db, paths, filters, genre, throttle, logging, Tests, CI
- 1b `backend-dev` (Sonnet): ytclient, binaries, tagging, main (`--smoke`), setup.ps1, fetch_binaries.ps1 (nach 1a)
- UI `ui-designer` (Fable, parallel): Prototyp aufteilen, Fonts lokal, Einstellungen komplett, Effekte verfeinern, `scripts/ui_screenshots.py`
- Vertrag Settings: `docs/settings-schema.md`

Phase 2
- UI `ui-designer` (Fable): fertig (a7b359c) – Bridge-Vertrag im Kopf von `ui/js/bridge.js`
- Integration `integrator` (Opus): worker.py (EventBus), api.py, main.run_gui, Single-Instance, scheduler.py, docs/bridge-api.md

Hinweise für Phase 3
- Worker hält Lauf-Lock (`acquire_run_lock`) für die Dauer eines Laufs und ruft am Ende `Throttle.finish_run(success)`.
- Genre-Chips sollen laut SPEC §3.1 Begriffe an die Suche anhängen (UI filtert derzeit nur).
- Upload-Zeitraum erweitern (User-Wunsch + SPEC §3.1): Werte `year` (Feld `upload_year`) und `custom` (`upload_from`/`upload_to`) in Schema, Filter-Panel und Settings. Flache Suche liefert Datum nur mit `extractor_args youtubetab:approximate_date` (ungefähr, aus "vor X Jahren") → in build_ydl_opts für search/list setzen. Jahr-Filter besteht bei Jahreszahl im Titel ODER ungefährem Upload-Jahr (±1 an Grenzen tolerant); Option "Jahr an Suchbegriff anhängen" (Default an).
- `po_token_ttl_hours` wird auf ganze Stunden gerundet → Hinweis in GUI.

Offene Review-Punkte (docs/reviews/phase-1.md, Runde 2)
- Phase 4: N3 (Mutex `Global\` statt `Local\`, damit geplante Aufgabe in Sitzung 0 ausgeschlossen wird), N5 (Request-Abstand/Suchzähler prozessübergreifend).
- Nach Ermessen: N4 (.part-Fortsetzen über anderes Format, alte .part aufräumen), N6 (fehlende Prüfsumme nur Warnung), N7, N8, N9 (Video-ID-Validierung).

Phase 6 – Portable (User-Wunsch, Variante 2: komplett portable)
- Eingebettetes Python (Windows embeddable package, amd64, 3.12/3.13) im App-Ordner `python\`, `._pth` mit `import site` + App-Root, pip via get-pip.
- Portable-Modus: Benutzerdaten im App-Ordner (`data\`), sobald `portable.txt` existiert (Portable-Build legt sie an); sonst wie bisher %APPDATA%.
- Starter ohne Konsolenfenster mit relativen Pfaden (z.B. `HCLoader.vbs` → `python\pythonw.exe -m app.main`), optionale Desktop-Verknüpfung.
- Update-Knopf (pip -U) muss mit dem eingebetteten Python funktionieren; pywebview/pythonnet im Embed-Python prüfen.
- Aufgabenplanung: Pfad ändert sich beim Verschieben → App erkennt veränderten Pfad und bietet an, die Aufgabe neu anzulegen.
- `scripts/build_portable.ps1` + GitHub-Actions-Job (windows-latest), der ein fertiges Portable-ZIP als Artefakt baut (deno, ffmpeg, bgutil inklusive; Lizenzen beilegen).

## Blockiert
- **GitHub Actions**: seit 16:16 starten alle Jobs nicht (Abbruch nach ~2 s, ohne Log) – vermutlich Actions-Minuten aufgebraucht (privates Repo, Windows ×2; ~20 Läufe hingen je ~1 h wegen MessageBox-Hänger). User prüft Settings → Billing. Danach: CI-Lauf auswerten (ein Windows-Test war rot, Name unbekannt; CI jetzt mit `pytest -v`), Portable-Workflow per workflow_dispatch starten, Artefakt prüfen.
- Smoke-Test (echter Download) – siehe Vorbedingungen.

## Log
- 2026-11-16 – Starter-Dateien eingespielt (`chore: add project spec and agent setup`)
- 2026-11-16 – Phase 1a + UI gestartet
- 2026-11-16 – 1a Fundament fertig (1fc49c8), 1b Kern-Download fertig (26a24c2)
- 2026-11-16 – Review Phase 1: ÄNDERUNGEN NÖTIG (1 Blocker, 5 Major) → behoben
- 2026-11-16 – UI aufgeteilt + Feinschliff fertig (a7b359c)
- 2026-11-16 – QA Phase 1 + Nach-Review gestartet; Phase-2-Integration gestartet
- 2026-11-16 – QA Phase 1 BESTANDEN (Smoke extern blockiert); Review Runde 2 → N1/N2 behoben → Phase 1 abgeschlossen
- 2026-11-16 – Phase 2: Integration (86de529), QA BESTANDEN, Review FREIGEGEBEN → abgeschlossen; Phase 3 gestartet
- 2026-11-16 – Phase 3: 3a (66f3f8f), 3b (e205214), UI (561dae2/e48b7e4); QA BESTANDEN; Review ÄNDERUNGEN NÖTIG (M1) → behoben (00f165c); Nach-Review läuft
- 2026-11-16 – Phase 4 gestartet: backend-dev (watchlist, headless, N3/N5/n6), ui-designer (Watchlist/Eingang/Zeitplan)
- 2026-11-16 – Phase 3 abgeschlossen (R2-Funde in ba6ccbd). Phase-4-Backend fertig (ba6ccbd); UI läuft
- Offen (Phase 4/5 klären): Playlists hängen neue Videos hinten an → Abbruch beim ersten bekannten Video + max_entries passt schlecht (decisions.md)
- 2026-11-16 – User wählt Portable-Variante 2 (eingebettetes Python) → als Phase 6 nach Phase 5 eingeplant
- 2026-11-16 – Phase 4: QA BESTANDEN, Review R1 ÄNDERUNGEN NÖTIG (M1) → behoben (06503c8), Runde 2 FREIGEGEBEN; R2-m1 (eskalierender Retry) behoben → abgeschlossen. Tests laufen offline (Netzwerksperre); Marker `network` nur gezielt/CI.
- 2026-11-16 – Phase-5-Backend fertig (06503c8); UI läuft
- 2026-11-16 – Phase 5: QA BESTANDEN, Review R1 ÄNDERUNGEN NÖTIG (M1 Neu-Taggen löscht fremde Tags) → behoben (ea1e9aa), R2 FREIGEGEBEN, R2-m1 (Bilder beim Neu-Taggen) behoben → abgeschlossen
- 2026-11-16 – **Windows-CI hing seit e205214 (Phase 3b)**: pytest hängt auf windows-latest. CI mit Job-/Test-Timeouts + Stack-Dump + concurrency versehen (c134358), 31 hängende/wartende Läufe abgebrochen. Ursache wird ermittelt.
- 2026-11-16 – Phase 6 (Portable) gestartet
- 2026-11-16 – Hänger-Ursache: modale MessageBox in test_run_gui_without_pywebview → behoben (0aa4709). Phase 6 Portable committet (6ba6448). Actions danach blockiert (Billing vermutet).
- 2026-11-17 – Portable-Build beim User lauffähig (Fixes: Expand-Archive/PS7-Modulpfade, MAX_PATH, file-URL-Query, relativer Starter HCLoader.cmd, Download-Fortschritt). App-Icon (Fable) und Phase 7a SoundCloud-Backend (Opus) gestartet.
