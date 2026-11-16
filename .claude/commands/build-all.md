---
description: Baut HCLoader vollautomatisch Phase für Phase nach SPEC.md – mit Subagents, QA, Review, PR und Tag pro Phase
---

Du bist der **Orchestrator** für den Bau von HCLoader. Du schreibst selbst möglichst wenig Code, sondern planst, delegierst an die Subagents in `.claude/agents/`, prüfst Ergebnisse und verwaltest Git.

## Start

1. Lies `CLAUDE.md`, `SPEC.md` und `PROGRESS.md`.
2. Setze bei der ersten nicht abgeschlossenen Phase bzw. dem ersten offenen Schritt in `PROGRESS.md` fort. Nie bereits abgeschlossene Phasen wiederholen.
3. Vorbedingungen prüfen (einmalig, Ergebnis in `PROGRESS.md`):
   - `git` und `gh auth status` funktionieren; der Ordner ist ein Clone des bestehenden GitHub-Repos `HCLoader` (`gh repo view` zeigt es an). Ist kein Remote gesetzt: `git remote add origin` mit der URL aus `gh repo view HCLoader --json url`. **Kein neues Repo anlegen.**
   - Liegen die Starter-Dateien noch nicht im Repo: als erster Commit `chore: add project spec and agent setup` auf `main` über einen Branch + PR einspielen.
   - Python 3.12+ vorhanden.
   - `MV_SMOKE_URL` gesetzt (nötig ab Phase 1 für den Smoke-Test).
   Fehlt etwas, das du nicht selbst lösen kannst: in `PROGRESS.md` unter "Blockiert" eintragen und **stoppen**.

## Pro Phase (SPEC.md §11)

1. **Branch:** `git switch -c phase-<n>-<kurzname>` von aktuellem `main`.
2. **Plan:** Zerlege die Phase in Arbeitspakete (je 1 Agent, klar abgegrenzte Dateien). Schreibe den Plan in `PROGRESS.md`.
3. **Delegieren** an den passenden Agenten laut Modellwahl in `CLAUDE.md`:
   - Backend, Daten, Tests, Skripte, CI → `backend-dev`
   - Oberfläche, Theme, Effekte, visuelle Prüfung → `ui-designer`
   - UI↔Python-Verbindung, Events, End-to-End-Fluss, schwierige Bugs → `integrator`
   Gib jedem Auftrag mit: Phase, Ziel, genaue Dateien, relevante SPEC-Abschnitte, Akzeptanzkriterien. Unabhängige Pakete (z.B. Backend und UI) parallel starten, abhängige nacheinander.
4. **Zwischencommit** nach jedem fertigen Paket (Conventional Commits, Attribution gemäss Systemvorgabe).
5. **QA:** `qa-tester` gegen die Akzeptanzkriterien.
   - NICHT BESTANDEN → Mängel an den zuständigen Agenten zurück, dann QA erneut. Maximal 3 Runden; danach eine Modellstufe höher (`backend-dev` → `integrator`) für den Fix. Danach immer noch rot → "Blockiert" eintragen und stoppen.
   - BLOCKIERT → eintragen und stoppen.
6. **Review:** `reviewer`. ÄNDERUNGEN NÖTIG → beheben lassen (zuständiger Agent), QA kurz wiederholen, Review erneut. Maximal 2 Runden.
7. **Abschluss:**
   - `CHANGELOG.md` ergänzen, `PROGRESS.md` aktualisieren.
   - Push, `gh pr create` mit Zusammenfassung, QA- und Review-Bericht verlinkt.
   - Warten bis CI grün (`gh pr checks --watch`), dann `gh pr merge --squash --delete-branch`.
   - `git switch main && git pull`, Tag `v0.<n>.0` setzen und pushen.
8. Nächste Phase.

## Regeln für den Orchestrator

- Halte dich strikt an `CLAUDE.md`, besonders an die YouTube-Schonung: echter YouTube-Zugriff nur über den QA-Smoke-Test, einmal pro Phase.
- Keine Force-Pushes, keine Commits direkt auf `main`, kein Löschen von Dateien ausserhalb des Repos.
- `PROGRESS.md` nach jedem Schritt aktualisieren, damit ein abgebrochener Lauf nahtlos weitermachen kann.
- Am Ende aller Phasen: Zusammenfassung in `PROGRESS.md` (was gebaut wurde, offene Punkte, Vorschläge für "Optional später").
