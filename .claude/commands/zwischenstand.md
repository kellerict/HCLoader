---
description: Kurzer Zwischenstand – erledigt seit dem letzten Mal, läuft, steht an, offen beim User
---

Gib einen **kurzen, knappen Zwischenstand auf Deutsch (de-CH, "ss" statt "ß")**. Keine Einleitung, kein Fazit.

Vorgehen (billig halten, keine Subagents):
1. Letzten Stand lesen: `.claude/zwischenstand.last` (eine Zeile: Commit-SHA und ISO-Zeit). Fehlt die Datei, gilt der letzte Tag als Basis.
2. Erledigt seit dem letzten Mal: `git log --oneline <sha>..HEAD` (nur Titel), dazu Ergebnisse aus dem Gesprächsverlauf seit dem letzten Zwischenstand (fertige Agents, CI-/Build-Läufe, Releases).
3. Läuft gerade: noch nicht zurückgemeldete Hintergrund-Agents, laufende Workflows (nur falls im Verlauf bekannt; höchstens ein `actions_list`-Aufruf).
4. Steht an: nächste Schritte laut `PROGRESS.md` (aktuelle Version) und `docs/ROADMAP.md`.
5. Offen beim User: Fragen, auf die noch eine Antwort fehlt, und Aufgaben, die nur der User erledigen kann.

Ausgabe genau so, leere Abschnitte weglassen:

**Erledigt seit dem letzten Mal**
| Was | Ergebnis |
|---|---|

**Läuft gerade**
| Was | Stand | Restzeit (grob) |
|---|---|---|

**Steht an**
| # | Was | Aufwand (grob) |
|---|---|---|

**Offen bei dir**
- …

Höchstens ~15 Zeilen pro Tabelle, Fachbegriffe nur wenn nötig.

Danach `.claude/zwischenstand.last` mit `git rev-parse --short HEAD` und der aktuellen UTC-Zeit überschreiben, nur diese Datei committen (`git commit -m "chore: Zwischenstand-Marker" -- .claude/zwischenstand.last`) und pushen.
