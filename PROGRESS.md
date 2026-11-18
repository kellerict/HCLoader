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

## v0.6.0 – Tracklist-Suche «Welche Sets spielen Track X?» (docs/ROADMAP.md)
Tracklisten offline aus Kapiteln, Beschreibungen, ID3-Kapiteln und CUE-Dateien; Suche über alle Sets mit
Sprung zur Stelle im Player. Entscheide: docs/decisions.md «Tracklist search (v0.6.0)», Vertrag
docs/bridge-api.md «Tracklist search».
- [x] 1 Backend + Integration (`integrator`): Migration 10 (`tracklists`, `tracks`, FTS5-Index `tracks_fts`
  mit Triggern, LIKE-Fallback ohne FTS5), `app/core/tracklist.py` (Parser für Beschreibungen mit
  Zeitstempeln/Nummern/«Tracklist:»-Block, Normalisierung feat./x/vs./&, Version, Label, ID-Tracks,
  Quellenwahl, Suche, «Meistgespielt», Status, Durchlauf mit Fortschritt/Abbruch), Einlesen nach jedem
  Download (`YtClient`), 6 Bridge-Methoden + Event `tracklist_index` (Wartungs-Thread wie «Festivals
  zuordnen»), Sidecar behält die ganze Beschreibung (5000 Zeichen), Fix Klammer am Kapitelende
- [x] 2 UI: Unteransicht «Tracks» der Bibliothek (`#library/tracks`, `ui/js/views/tracks.js`): Suche mit
  Hervorhebung, Treffer pro Set mit klickbaren Zeitstempeln (interner Player springt, externer Player +
  Hinweis auf die Zeit), «Meistgespielt» (Top 20), Panel «Trackliste» (auch im Menü ⋯ der Bibliothek),
  einmaliges Einlesen beim ersten Öffnen mit Fortschritt/Abbrechen, Leer-Zustände; `HC.player.playAt`;
  Texte in allen Sprachen; Mock-Daten; Screenshots `library-tracks*` (en/de/ru)
- [x] 3 Tests: `tests/test_tracklist.py` (34 Beschreibungs-Fälle, Migration, FTS/LIKE, Top, Durchlauf,
  API, Download → Trackliste → Suche), `tests/test_tracks_ui.py` (Playwright); Wiki «Tracklist search»,
  CHANGELOG [Unreleased]
- [ ] 4 QA + Review (u.a. echte Sets mit Kapiteln/Beschreibung unter Windows, grosse Bibliothek)
- [ ] 5 Release v0.6.0

## v0.7.0 – Lautheit, Wellenform, Player-Gedächtnis, Schlaf-Timer (docs/ROADMAP.md)
Offline-Analyse mit ffmpeg (EBU R128 + True Peak, Wellenform aus demselben Dekodierlauf), ReplayGain-Tags
ohne Neukodieren, Lautheitsangleichung im Player, Wellenform-Zeitleiste, Positionen pro Set mit
«Weiterhören», Schlaf-Timer. Entscheide: docs/decisions.md «Loudness, waveform, player memory (v0.7.0)»,
Vertrag docs/bridge-api.md «Loudness, waveform, player memory».
- [x] 1 Backend + Integration (`integrator`): Migration 12 (`audio_analysis`, `playback`),
  `app/core/analysis.py` (ebur128-/loudnorm-Parser, Peaks aus PCM, ffmpeg mit niedriger Priorität und
  Abbruch, Tags unter `FS_LOCK`, Durchlauf «new»/«all», Rückstand aus Headless-Läufen beim GUI-Start),
  `app/core/playback.py` (30-s-Ränder, «Weiterhören»), `tagging.write_replaygain/read_replaygain`
  (MP3 TXXX, M4A-Atome, Opus R128), `AnalysisQueue` (eigener Thread: Wellenform des laufenden Sets vor
  Downloads vor Durchlauf), 7 Bridge-Methoden + `get_media`-Felder + Events `audio_analysis`,
  `media_analysed`, `waveform`; Settings `player.normalize/target_lufs/resume/waveform`, `loudness.*`
- [x] 2 UI: Player mit Web-Audio-Gain (nur mit laufendem AudioContext, sonst nur absenken), Wellenform
  (2 Canvas, Kapitel-Linien, Tooltip, Klick/Ziehen, Fallback Balken, reduzierte Effekte), Fortsetzen
  (Fragen/Automatisch/Aus), Positionen speichern, Schlaf-Timer (15/30/45/60/Set-Ende, 10 s Ausblenden),
  Leiste «Weiterhören» in der Bibliothek, neuer Tab «Wiedergabe» mit Analyse-Statusbox; Texte in allen
  Sprachen; Mock; Screenshots (en im Repo, de lokal geprüft)
- [x] 3 Tests: `tests/test_analysis.py` (Tags pro Format mit in Python gebauten MP3/M4A/Opus – ohne
  ffmpeg, Audio-Bytes unverändert; Parser mit ffmpeg-Ausgabe als Text; Peaks; Durchlauf; Worker),
  `tests/test_playback.py` (Ränder, «Weiterhören», API), `tests/test_player_ui.py` (Playwright:
  Wellenform, Gain, Schlaf-Timer mit Fake-Uhr, Fortsetzen, Leiste, Tab); ffmpeg-Tests nur mit ffmpeg
- [x] 4 Doku: CHANGELOG [Unreleased] mit Highlights, Wiki (Library and player, Settings reference),
  bridge-api, settings-schema, decisions
- [ ] 5 QA + Review (u.a. echter Test unter Windows/WebView2: Web Audio mit `file:`-Quelle, gesperrte
  Datei beim Tag-Schreiben während der Wiedergabe, Dauer eines Durchlaufs über eine grosse Bibliothek)
- [ ] 6 Release v0.7.0

## v0.8.0 – Playlist-Export (M3U8) und DJ-Seiten mit Aliassen (docs/ROADMAP.md)
DJ-Seiten mit Aliassen, b2b-Zuordnung, «Alle abspielen», Ein-Klick-Watchlist; M3U8-Export für Festival/Ausgabe,
Genre, DJ, Bibliotheksfilter, Checkliste und «Weiterhören», gespeicherte Playlists mit «Aktuell halten».
Entscheide: docs/decisions.md «DJ pages and playlist export (v0.8.0)», Vertrag docs/bridge-api.md
«DJ pages, playlist export».
- [x] 1 Backend + Integration (`integrator`): Migration 13 (`artists`, `playlists`, Backup automatisch),
  `app/core/artists.py` (Ableitung offline aus Checklisten-Zeile > Titel > eigener Kanal, b2b/vs/x/&, bekannte
  Acts, Alias-Faltung, Startliste `app/data/artists.yaml`, Zusammenführen/Abtrennen/Ausblenden,
  Watchlist-Vorschlag), `app/core/playlists.py` (M3U8, relative Pfade mit Rückfall absolut bei anderem
  Laufwerk/UNC, Dateiname + Pfadlänge, Überschreiben, gespeicherte Playlists, Sync), Sync nach Downloads
  (GUI gebündelt im eigenen Thread, Headless-Lauf), 13 Bridge-Methoden + Event `playlists_synced`,
  Einstellungen `playlists.*`, Texte in 18 Sprachen (nl-BE/de-x-frk erben)
- [x] 2 UI: Unteransicht «DJs» (`#library/djs`, `ui/js/views/djs.js`: Liste mit Suche/Sortierung/Ausgeblendet,
  DJ-Seite mit Initialen-Badge, Kennzahlen, Sets nach Festival/Jahr, b2b-Partner, Meistgespielt, Bearbeiten,
  Zusammenführen, Abtrennen, Watchlist mit Bestätigung, In Entdecken suchen), Export-Dialog
  (`ui/js/playlist.js`, Überschreiben im Dialog), Knöpfe «M3U» in Bibliothek/Checkliste/Weiterhören,
  Warteschlange «Alle abspielen» im Player, Einstellungen › Ablage › Playlists mit Liste; Mock; Screenshots
- [x] 3 Tests: `tests/test_artists_playlists.py` (Titel-/b2b-Parser, Index, Aliasse, Zusammenführen/Abtrennen,
  Watchlist-Vorschlag, Migration 13 aus v12, M3U8-Format, relative Pfade inkl. anderes Laufwerk/UNC mit
  `ntpath`, Dateinamen, alle Export-Arten, Sync, API), `tests/test_djs_ui.py` (Playwright, nur explizite Waits)
- [x] 4 Doku: CHANGELOG [Unreleased] mit Highlights, Wiki «DJ pages and playlists» + Settings reference,
  bridge-api, settings-schema, decisions
- [ ] 5 QA + Review (u.a. echte Bibliothek unter Windows: Qualität der DJ-Erkennung, Playlist in foobar2000/
  VLC/Handy, Laufwerkswechsel D: → E:, langer Pfad)
- [ ] 6 Release v0.8.0

## v0.9.0 – Statistik, Windows-Benachrichtigungen, Plex/Jellyfin (docs/ROADMAP.md)
Statistik-Ansicht offline aus der DB, gebündelte Windows-Benachrichtigungen mit Ruhezeit und Klick zum Eingang,
Bibliotheks-Scan von Plex/Jellyfin nach Downloads (Token in der Windows-Anmeldeinformationsverwaltung).
Entscheide: docs/decisions.md «Statistics, notifications, media server (v0.9.0)», Vertrag docs/bridge-api.md
«Statistics, notifications, media server».
- [x] 1 Backend + Integration (`integrator`): Migration 15 (`videos.file_size`, Index `idx_videos_downloaded`),
  `app/core/stats.py` (Summen, Genre, Festival, Jahr, DJ-Top-10 aus dem DJ-Index, Monate lückenlos, Quellen,
  Meistgespielt, Watchlist-Aktivität, Zeitraum, einmaliges Messen alter Dateigrössen), `app/core/notify.py`
  (Stapel in der DB für GUI und Headless, Ruhezeit, 120 s Abstand, Toast-XML, Windows PowerShell 5.1 bzw.
  optional pywinrt, HKCU-Registrierung AppUserModelID + `hcloader:`), `app/core/mediaserver.py` (Plex
  `refresh?path=`, Jellyfin `/Library/Media/Updated`, Pfad-Abbildung NAS/Docker, ohne Proxy/Weiterleitung,
  10 s Timeout), `app/core/credentials.py` (CredWrite/CredRead über ctypes), `worker.NotificationService`,
  `worker.MediaScanQueue` (Timer bündelt), `DownloadQueue(on_session_end)`, Headless: Scan + eine Benachrichtigung
  nach dem Lauf, `--open <view>` / `hcloader://<view>` → Event `navigate` (auch an die laufende Instanz),
  7 Bridge-Methoden + Events `stats_sizes`, `media_scan`, `navigate`, Einstellungen `notifications.*`,
  `media_server.*`, Texte in 17 Sprachen (nl-BE/de-x-frk erben)
- [x] 2 UI: Ansicht «Statistik» (`#stats`, `ui/js/views/stats.js`: Kennzahlen, Downloads pro Monat, Genre,
  Quellen-Ring, Top-Festivals/-DJs, Jahre, Meistgespielt, Watchlist-Aktivität, Zeitraum-Presets + eigener
  Zeitraum, Leer-Zustände, Tastatur/Screenreader, ohne Animation bei «Effekte reduzieren»), Tabs
  «Benachrichtigungen» (Test) und «Medienserver» (Token-Feld, «Verbindung testen», Bibliothek wählen,
  «Jetzt einlesen», letzter Scan); Mock-Daten; Screenshots `stats*`, `settings-notifications*`,
  `settings-mediaserver*` (en/de/ru)
- [x] 3 Tests: `tests/test_stats.py` (synthetische DB, Zeitraum, 10k Sets < 2 s, Dateigrössen, Migration 15),
  `tests/test_notify.py` (Ruhezeit, Bündeln, Abstand, XML, PowerShell-Befehl, Registrierung mit Fake-winreg,
  Queue-/Headless-Haken, `--open`), `tests/test_mediaserver.py` (Validierung, Anfragen, Pfade, Fehler, Transport
  ohne Proxy, Secret nie in config/Log, Stapel, Headless), `tests/test_stats_ui.py` (Playwright, nur explizite
  Waits, Parität)
- [x] 4 Doku: CHANGELOG [Unreleased] mit Highlights, Wiki «Statistics», «Notifications and media servers»,
  Settings reference, Sidebar/Home, bridge-api, settings-schema, decisions, CODE_SIGNING.md (Datenschutz-
  Tabelle: eigener Plex/Jellyfin-Server), Installer (Datenschutzseite, Aufräumen der HKCU-Schlüssel)
- [ ] 5 QA + Review (u.a. unter Windows: Toast über PowerShell in installierter und Portable-Version, Klick
  öffnet den Eingang bei laufender und geschlossener App, geplante Aufgabe zeigt Benachrichtigung, echter
  Plex- und Jellyfin-Server inkl. Docker-Pfad, Anmeldeinformationsverwaltung, Statistik mit grosser Bibliothek)
- [ ] 6 Release v0.9.0

## Geplant für spätere Versionen
- Phase 7b: Mixcloud + hearthis.at (Watchlist); 7c: archive.org (optional)

## Offen für den User (Nacht 17./18.11.)
- **v0.5.0 Festival-Sammler NICHT veröffentlicht.** Backend, UI, Review (M1 b2b-Fehlbestätigung behoben) und Windows-Build sind ok. Die QA scheitert aber zum 4. Mal knapp am Timetable-Parser (Text einfügen): 18/22 frische Beispiele, Schwelle 20. Kein stiller Datenverlust mehr (unlesbare Zeilen werden angezeigt), die Vorschau erlaubt Bearbeiten/Entfernen vor dem Import. Restfehler: Werbe-/UI-Zeilen wie «Swipe for more» als Artist, «Bühne: Zeit Artist, …» inline, Bühnenname als Zeilenpräfix, «UNDERGROUND» als Artist in Line-ups ohne Zeiten.
- Windows-Build (Portable + Installer-Smoke) auf c069c1c grün, CI grün. Version noch 0.4.0 – Release-Vorbereitung nach Entscheid (~10 Min) + Release (~25 Min).
- Entscheid nötig: (A) v0.5.0 so veröffentlichen, Text-Import als «Beta» kennzeichnen (Vorschau korrigierbar), Parser in v0.5.x verbessern – Empfehlung; (B) weitere Parser-Runde vor dem Release; (C) Text-Import vorerst ausblenden, nur Playlist/Datei/manuell.

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
- 2026-11-18 – v0.3.0 und v0.4.0 veröffentlicht (automatisch). Installer-Smoke hing sporadisch (Runner wurde vermutlich vom Restart Manager getroffen) → eigener Job installer-smoke, /NOCLOSEAPPLICATIONS, Uninstall-Aufräumen max. 60 s. v0.5.0 Festival-Sammler: Backend fertig, UI läuft.
- 2026-11-18 – Nacht: v0.3.0 und v0.4.0 veröffentlicht; v0.5.0 fertig, Release zurückgehalten (Parser-QA 4× knapp nicht bestanden) → Entscheid User.
- 2026-11-18 – User-Entscheid A: v0.5.0 mit Text-Import als «Beta» veröffentlicht; Parser-Verbesserung in v0.5.x.
- 2026-11-18 – SignPath-Antrag abgelehnt (zu wenig Reputation). Neuer Antrag, sobald Downloads/Stars/Erwähnungen vorhanden (ca. 3–6 Monate). Alternativen notiert: Certum Open-Source-Zertifikat, Azure Artifact Signing (Verfügbarkeit CH prüfen).
- 2026-11-18 – v0.6.0 Tracklist-Suche gebaut (Backend, UI, 19 Sprachen, Tests, Screenshots, Doku); offen: QA, Review, Release (ca. 1–2 Std.)
- 2026-11-18 – v0.6.0 Tracklist-Suche: Review FREIGEGEBEN, QA BESTANDEN; Minors behoben (Panel-Fehler abgefangen, FTS5-Prüfung beim Start, FTS/LIKE gleiche Treffer, gelöschte Sets räumen auf, «Neue einlesen» inkrementell, Migration 11 für «Meistgespielt», «Track 01 –»-Präfix, Screenshots 5,8 → ca. 1 MB); Version 0.6.0 + CHANGELOG → bereit für Release (ca. 15 Min. bis Merge/Tag durch Orchestrator).
- 2026-11-18 – v0.7.0 Lautheit, Wellenform, Player-Gedächtnis, Schlaf-Timer gebaut (Backend, UI, 19 Sprachen, Tests, Screenshots, Doku); offen: QA, Review, Test unter Windows, Release (ca. 1–2 Std.)
- 2026-11-18 – v0.7.0: QA BESTANDEN; Review M1 (keine Tags in die Datei im Player, atomares Tag-Schreiben) und M2 (Web-Audio-Rückfall bei Stille, ALLOW_FILE_URLS explizit) behoben, Minors m1–m5/m7/m9, Migration-12-Test, ru-Kürzungen; Version 0.7.0 + CHANGELOG → bereit für Release (ca. 15 Min. bis Merge/Tag durch Orchestrator; echter WebView2-Test im Smoke offen).
- 2026-11-18 – v0.8.0 Playlist-Export und DJ-Seiten gebaut (Backend, UI, 19 Sprachen, Tests, Screenshots, Doku); offen: QA, Review, Test unter Windows, Release (ca. 1–2 Std.)
- 2026-11-18 – v0.8.0: QA BESTANDEN; Review M1 (bekannte Namen vor dem Zerlegen, «Mark With a K») und M2 (DJ-Index-Cache per DB-Trigger/Migration 14, inkrementell) behoben, Minors m1–m10 und QA-Defekt «#»-Pfade; Version 0.8.0 + CHANGELOG → bereit für Release (ca. 15 Min. bis Merge/Tag durch Orchestrator).
- 2026-11-18 – v0.9.0 Statistik, Windows-Benachrichtigungen und Plex/Jellyfin-Scan gebaut (Backend, UI, 19 Sprachen, Tests, Screenshots, Doku); offen: QA, Review, Test unter Windows, Release (ca. 1–2 Std.)
- 2026-11-18 – v0.9.0: QA BESTANDEN; Review M1 behoben (`hcloader:`-Link nur noch Navigation: eigener Einstieg `--protocol`, strikte Allow-List, `--open` nicht mit anderen Aktionen, `-I`, alte Registrierung wird beim Start umgeschrieben), Minors m1–m7 und Nits, QA-Punkte (Credential-Store-Tests, Steuerzeichen in Toasts, Monate in Lokalzeit); Version 0.9.0 + CHANGELOG → bereit für Release (ca. 15 Min. bis Merge/Tag durch Orchestrator; echter Toast-/Protokoll-Test unter Windows offen).
