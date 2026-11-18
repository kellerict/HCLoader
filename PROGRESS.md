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
| 8 – Player in der Bibliothek (User-Wunsch) | geplant nach 7a-Backend, zusammen mit 7a-UI: eingebauter Mini-Player (Default) + Standardplayer, Setting `player.mode` |
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

## v0.2.0 – Mehrsprachigkeit (User-Wunsch: «in allen 10 Top-Weltsprachen erstmal») – BEREIT FÜR RELEASE
Sprachen (19): en (Referenz + Standard), de (de-CH), zh-CN, hi, es, fr, bn, pt (pt-BR), ru, id, nl,
nl-BE (Vlaams, Teil-Katalog, Rückfall nl → en), sv, nb, fi, lt, lv, et, de-x-frk (Fränggisch,
Spass-Dialekt: nie per `auto`, Rückfall de → en). ar durch nl ersetzt.
Leitfaden `docs/TRANSLATING.md`, Entscheide `docs/decisions.md` «Mehrsprachigkeit».
- [x] 1 Architektur + Extraktion + de/en (`integrator`): UI-Engine `ui/js/i18n.js`, Kataloge
  `ui/js/locales/<code>.js` (912 Schlüssel), Backend `app/core/i18n.py` + `app/locales/<code>.json`
  (399 Schlüssel), Setting `general.language` (Standard `en`, `auto`), Sprachwahl unter Einstellungen ›
  Allgemein, Intl-Formate, Plurale, Tests `tests/test_i18n.py`, Screenshots `--lang`; Stubs für 9 Sprachen
- [x] 2 Übersetzungen aller 16 weiteren Sprachen (UI + Backend vollständig) und Registrierung
  überall (SUPPORTED, `general.language`, Mock, Screenshots, Doku); Meta `fallback` für Dialekte
- [x] 3 Schriften/Layout je Schrift (d94ead3; RTL entfällt, kein RTL-Katalog mehr)
- [x] Installer: Datenschutz-Seite mit Abwahl der Update-Prüfung (SignPath-Bedingung),
  `installer-defaults.json` nur für neue `config.yaml`
- [x] Release-Automatik: Push auf `main` mit neuer Version + CHANGELOG-Abschnitt → Tag + Release (`portable.yml`, `docs/RELEASING.md`)
- [x] 4 QA BESTANDEN (`docs/qa/v0.2.0.md`), Review FREIGEGEBEN (`docs/reviews/v0.2.0.md`); Minor 1/2/4 behoben,
  Rest akzeptiert (Nachtrag im Review); nl-BE ergänzt; `__version__` 0.2.0, CHANGELOG `[0.2.0]`
- [ ] Release: Merge nach `main` → Release-Automatik erstellt Tag `v0.2.0` + Release (nicht manuell taggen)

## v0.3.0 – Festivals & Serien (Konzept `docs/concepts/festivals.md`, User-Entscheide: Album = Ausgabe, Standard an, abschaltbar; Standard-Ablagemuster unverändert; Radio/Podcasts sind auch «Serien»)
- [x] 1 Backend (`integrator`): Migration 7 (`series`, `editions`, Spalten am Video, Backup vor Migration),
  mitgelieferte Liste `app/data/series.yaml` (35 Serien, Bühnen, Set-Arten), Sync ohne User-Änderungen zu
  überschreiben, Erkennung `app/core/festivals.py` (Punkte, Schwelle 0.65), Speichern/Zuordnen/Gruppieren
  `app/core/series.py`, Erkennung bei Suche/Watchlist/Download, Durchlauf «Festivals zuordnen» im
  Wartungs-Worker (Event `festival_assign`), Tags `TXXX:FESTIVAL/EVENT_YEAR/STAGE/SET_TYPE/EPISODE`,
  Album = Ausgabe (`storage.album_from_edition`), Platzhalter `{festival}` `{event_year}` `{stage}`,
  Settings `festivals.*`, 12 Bridge-Methoden (Vertrag `docs/bridge-api.md` «Festivals & Serien»),
  Backend-Texte in 18 Katalogen (nl-BE erbt von nl), Tests `tests/test_festivals.py` (75 Titel)
- [ ] 2 UI (`ui-designer`): Tab «Festivals & Serien» (Serienliste, Bearbeiten-Dialog, Schalter, Test,
  «Festivals zuordnen» mit Fortschritt), Bibliothek «Gruppieren nach» Genre/Festival/Künstler/Jahr,
  Festival-Ansicht (Kacheln → Jahre → Bühnen), Festival-Badge mit Popover (`set_festival`/`reset_festival`
  + `retag`), Vorschlag übernehmen, Filter-Chips; Mock-Daten + UI-Kataloge (Set-Art-Codes übersetzen);
  `storage.album_from_edition` im Tab «Ablage & Tags»; ca. 3–4 Std.
- [ ] 3 QA + Review
- [ ] 4 Release v0.3.0 (Version, CHANGELOG `[0.3.0]`, Merge nach `main` → Release-Automatik)

## v0.4.0 – «Alles einlesen (einmalig)» pro Watchlist-Quelle (User-Wunsch)
Kanal/Playlist/SoundCloud-Nutzer/-Set einmal seitenweise vollständig lesen; Suchquellen bleiben bei 100.
Entscheide: docs/decisions.md «Alles einlesen», Vertrag docs/bridge-api.md «Alles einlesen (einmalig)».
- [x] 1 Backend + UI (`integrator`): Migration 8 (`backfills`, `sources.item_count`),
  `YtClient.list_source_paged` (jede Seitenanfrage über `Throttle.backfill_slot`: Backoff, Tempo
  `watchlist.backfill_requests_per_hour` = Standard 120/h, `sleep_requests`; Metadaten-Lock pro Anfrage),
  Kern `app/core/backfill.py` (Cursor nach jeder Seite, Obergrenze `watchlist.backfill_max_entries` =
  Standard 2000, immer Eingang, Dedup/Filter/Festivals über gemeinsames `watchlist.Ingest`, Zustände
  pending/running/paused/done/cancelled, 3 Fehler → pausiert), eigener Thread `hcloader-backfill` + Lock
  `backfill`, automatisches Fortsetzen (App-Start +90 s, nach jeder Prüfung, Headless mit Budget pro
  Lauf), 4 Bridge-Methoden + Event `backfill`, UI: Knopf pro Quelle, Bestätigungsdialog mit Schätzung,
  Fortschrittszeile mit Anhalten/Fortsetzen/Abbrechen, «Alles eingelesen <Datum> · +N», Einstellungen im
  Tab «Zeitplan», Texte in allen 19 Sprachen, Mock + Screenshots (`watchlist-backfill-*`), Tests
  `tests/test_backfill.py`, `tests/test_backfill_ui.py`, Wiki «Watchlist and Inbox», CHANGELOG
  [Unreleased]
- [ ] 2 QA + Review (u.a. echter Backfill unter Windows: YouTube-Kanal, Playlist, SoundCloud-Set;
  Prüfen, dass yt-dlp jede Seite über `YoutubeDL.urlopen` holt – yt-dlp 2026.10.26 geprüft)
- [ ] 3 Release v0.4.0 (Version, CHANGELOG `[0.4.0]`, Merge nach `main` → Release-Automatik)

## v0.5.0 – Festival-Sammler «Eine ganze Ausgabe sammeln» (Konzept `docs/concepts/festivals.md`)
Checkliste pro Ausgabe (Playlist des Veranstalters, Timetable einfügen, mitgelieferte Datei, von Hand),
Abgleich mit der Bibliothek, gedrosselte Einzelsuche, nur Angehaktes + Bestätigtes in die Queue.
Entscheide: docs/decisions.md «Festival-Sammler (v0.5.0)», Vertrag docs/bridge-api.md «Festival collector».
- [x] 1 Backend (`integrator`): Migration 9 (`checklists`, `checklist_rows`), `app/core/timetable.py`
  (Parser Text/CSV/TSV/Markdown, Tages-/Bühnen-Überschriften, Datei-Format 1 unter
  `app/data/timetables/`, keine Dateien ausgeliefert), `app/core/collector.py` (Zeilen, Zusammenführen,
  Bewertung, Gratis-Abgleich, Playlist-Import über das Seiten-Tor, fortsetzbarer Suchauftrag mit
  eigenem Tempo `festivals.collector_searches_per_hour`, Queue mit manuellen Festival-Werten + Retag),
  19 Bridge-Methoden + Events `collector_rows`/`collector_job`/`collector_import`, 3 Einstellungen,
  Texte in 18 Sprachen (nl-BE erbt von nl), Tests `tests/test_collector.py` (36 Parser-Fälle)
- [ ] 2 UI (`ui-designer`): Ansicht «Festival-Sammler» (Ausgabe wählen/anlegen, Checkliste mit Haken,
  Alle/keine, Filter Bühne/Tag/Status, Bestätigen/Kandidat/verwerfen, Timetable-Dialog mit Vorschau,
  Playlist-Import, Schätzungsdialog + Fortschritt, «In die Queue»), Einstellungen, Mock, UI-Kataloge,
  Screenshots; ca. 4–5 Std.
- [ ] 3 QA + Review (u.a. echte Veranstalter-Playlist und eine echte Einzelsuche unter Windows)
- [ ] 4 Release v0.5.0

## Geplant für spätere Versionen
- Phase 7b: Mixcloud + hearthis.at (Watchlist); 7c: archive.org (optional)

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
- 2026-11-17 – Windows-CI erstmals komplett grün (85c1b27; Ursachen: modale MessageBox, rekursive Windows-Mutexe, Lock-Schlüssel ohne Datenordner). QA 7a/8/Update BESTANDEN, Review-Funde behoben. → main angelegt, Tag v0.1.0.
- 2026-11-17 – v0.2.0 Mehrsprachigkeit Schritt 1 (Architektur, de/en) fertig; Backfill/7b/7c → v0.3.0
- 2026-11-17 – v0.2.0: 18 Sprachen registriert (inkl. sv/nb/fi/lt/lv/et/de-x-frk), Installer-Datenschutzseite, Release-Automatik; offen: QA + Review, Windows-CI (Inno-Compile, Release-Job)
- 2026-11-17 – v0.2.0: QA BESTANDEN, Review FREIGEGEBEN; Review-Minors 1/2/4 behoben, nl-BE (Vlaams) als 19. Sprache, Version 0.2.0 + CHANGELOG → bereit für Release (Merge nach main)
- 2026-11-17 – Release v0.2.0 automatisch erstellt (19 Sprachen, Installer-Datenschutzseite, Release-Automatik). SignPath-Foundation-Antrag vom User eingereicht; nach Zusage: API-Token als GitHub-Secret, Signierschritt in portable.yml, CODE_SIGNING.md-Status anpassen.
- 2026-11-17 – v0.2.1 vorbereitet: Release-Notizen mit übersprungenen Versionen (`releases`, `published`; eine Zusatzanfrage an die Release-Liste, Fallback CHANGELOG), Bridge-Methode `open_url` (Links im System-Browser, nur github.com), Version 0.2.1 + CHANGELOG (englisch), Versionshinweise im Wartung-Tab (`get_release_notes`, aus der mitgelieferten CHANGELOG.md, blätterbar)
- 2026-11-17 – v0.3.0 Schritt 1 Backend Festivals & Serien fertig (Migration 7, Erkennung, Zuordnen, Tags, Bridge-Vertrag); UI als Nächstes
- 2026-11-18 – v0.3.0 Festivals & Serien: Backend, UI, Review (M1 behoben), QA BESTANDEN → Release vorbereitet.
- 2026-11-18 – v0.4.0 «Alles einlesen (einmalig)» gebaut (Backend, UI, 19 Sprachen, Tests, Screenshots, Doku); offen: QA, Review, echter Test unter Windows, Release (ca. 1–2 Std.)
- 2026-11-18 – v0.4.0 «Alles einlesen»: Review M1–M3 behoben, QA BESTANDEN → Release vorbereitet (nach v0.3.0).
