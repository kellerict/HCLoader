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
| 2 – GUI-Grundgerüst | UI fertig; Integration (api.py, Fenster) in Arbeit | claude/compassionate-thompson-zgetlu | – | – |
| 3 – Entdecken & Downloads | offen | | | |
| 4 – Watchlist & Zeitplan | offen | | | |
| 5 – Bibliothek, Protokoll, Feinschliff | offen | | | |

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
- Upload-Zeitraum "benutzerdefiniert" (SPEC §3.1) fehlt noch – als temporärer Filter im Panel ergänzen.
- `po_token_ttl_hours` wird auf ganze Stunden gerundet → Hinweis in GUI.

Offene Review-Punkte (docs/reviews/phase-1.md, Runde 2)
- Phase 4: N3 (Mutex `Global\` statt `Local\`, damit geplante Aufgabe in Sitzung 0 ausgeschlossen wird), N5 (Request-Abstand/Suchzähler prozessübergreifend).
- Nach Ermessen: N4 (.part-Fortsetzen über anderes Format, alte .part aufräumen), N6 (fehlende Prüfsumme nur Warnung), N7, N8, N9 (Video-ID-Validierung).

## Blockiert
- Smoke-Test (echter Download) – siehe Vorbedingungen.

## Log
- 2026-11-16 – Starter-Dateien eingespielt (`chore: add project spec and agent setup`)
- 2026-11-16 – Phase 1a + UI gestartet
- 2026-11-16 – 1a Fundament fertig (1fc49c8), 1b Kern-Download fertig (26a24c2)
- 2026-11-16 – Review Phase 1: ÄNDERUNGEN NÖTIG (1 Blocker, 5 Major) → behoben
- 2026-11-16 – UI aufgeteilt + Feinschliff fertig (a7b359c)
- 2026-11-16 – QA Phase 1 + Nach-Review gestartet; Phase-2-Integration gestartet
- 2026-11-16 – QA Phase 1 BESTANDEN (Smoke extern blockiert); Review Runde 2 → N1/N2 behoben → Phase 1 abgeschlossen
