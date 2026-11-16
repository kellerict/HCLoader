# PROGRESS – HCLoader

Wird vom Orchestrator (`/build-all`) nach jedem Schritt aktualisiert. Ein neuer Lauf setzt beim ersten offenen Punkt fort.

## Betriebsmodus dieses Laufs
Cloud-Session (Linux-Container). Abweichend von `build-all.md`: alle Phasen auf Branch `claude/compassionate-thompson-zgetlu`, ein Commit-Block pro Phase, **keine** PRs/Merges/Tags auf `main` (Repo war leer, Freigabe fehlt). Tags/PR/Merge macht der User. Windows-spezifisches (`setup.ps1`, WebView2-Fenster, `schtasks`) wird nur per Windows-CI bzw. lokal geprüft.

## Vorbedingungen
- [x] git OK, Remote `origin` = github.com/kellerict/HCLoader (Repo war leer; `gh` hier nicht nutzbar → GitHub-Tools)
- [x] Python 3.12+ vorhanden (3.13 im Container, CI: 3.12 auf windows-latest)
- [ ] `MV_SMOKE_URL` gesetzt – **fehlt**, ausserdem ist youtube.com aus dem Container gesperrt → Smoke-Tests lokal unter Windows durch den User

## Phasen
| Phase | Status | Branch | PR | Tag |
|---|---|---|---|---|
| 1 – Gerüst & Kern-Download | in Arbeit | claude/compassionate-thompson-zgetlu | – | – |
| 2 – GUI-Grundgerüst | UI-Teil in Arbeit (parallel) | claude/compassionate-thompson-zgetlu | – | – |
| 3 – Entdecken & Downloads | offen | | | |
| 4 – Watchlist & Zeitplan | offen | | | |
| 5 – Bibliothek, Protokoll, Feinschliff | offen | | | |

## Aktueller Plan
Phase 1
- 1a `backend-dev` (Sonnet): pyproject, .gitignore, config, db, paths, filters, genre, throttle, logging, Tests, CI
- 1b `backend-dev` (Sonnet): ytclient, binaries, tagging, main (`--smoke`), setup.ps1, fetch_binaries.ps1 (nach 1a)
- UI `ui-designer` (Fable, parallel): Prototyp aufteilen, Fonts lokal, Einstellungen komplett, Effekte verfeinern, `scripts/ui_screenshots.py`
- Vertrag Settings: `docs/settings-schema.md`

## Blockiert
- Smoke-Test (echter Download) – siehe Vorbedingungen.

## Log
- 2026-11-16 – Starter-Dateien eingespielt (`chore: add project spec and agent setup`)
- 2026-11-16 – Phase 1a + UI gestartet
