# Changelog

Alle relevanten Änderungen werden hier festgehalten.
Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionierung nach [SemVer](https://semver.org/lang/de/).

## [Unreleased]

### Added
- Mehrsprachige Oberfläche (Schritt 1 von v0.2.0): Sprache unter Einstellungen › Allgemein
  (`general.language`, Standard Englisch, «Automatisch» = Windows-Anzeigesprache). Englisch und
  18 Sprachen: Englisch, Deutsch (Schweizer Schreibweise), Chinesisch (vereinfacht), Hindi,
  Spanisch, Französisch, Bengali, Portugiesisch (Brasilien), Russisch, Indonesisch, Niederländisch,
  Schwedisch, Norwegisch (Bokmål), Finnisch, Litauisch, Lettisch, Estnisch und Fränggisch
  (Spass-Dialekt; wird von «Automatisch» nie gewählt, fehlende Texte fallen auf Deutsch zurück).
  Der Wechsel wirkt sofort, ohne App-Neustart. / Multilingual UI: language picker in Settings ›
  General, English default, 18 languages incl. the Fränggisch fun dialect.
- Sprachkataloge können eine Rückfallsprache angeben (`_meta.fallback`, z. B. `de-x-frk` → `de`
  → `en`).
- Datum, Zahlen, Dauer und Dateigrössen im Format der gewählten Sprache (Intl).
- Meldungen des Backends (Validierung, Fehler, Toasts, Protokoll, Kommandozeile) in der gewählten
  Sprache. Leitfaden für Übersetzungen: `docs/TRANSLATING.md`.

### Changed
- Tests lesen Navigationstexte über `textContent` (die Navigation ist per CSS in Grossbuchstaben).
- Standardsprache ist Englisch, auch für bestehende Installationen ohne Spracheinstellung.
  Daten bleiben sprachneutral (Genre «Unsortiert», Ordner, Tags, Datenbank).

### Fixed
- Portable-Version: der bgutil-PO-Token-Provider lief nach dem Verschieben bzw. Entpacken an einem
  anderen Ort nicht mehr (`Could not find package 'lru-cache'`). Der Provider wird jetzt mit dem
  hoisted Linker von Deno ohne Links installiert (`deno install --node-modules-linker=hoisted`, Deno ≥ 2.8) und
  nach jeder Installation geprüft (`scripts/hoisted_node_modules.py`). Bestehende Installationen werden
  bei `fetch_binaries.ps1` bzw. beim Selbst-Update neu aufgebaut; ein `deno.exe` älter als 2.8 wird ersetzt.

## [0.1.0] - 2026-11-17

Erste öffentliche Version. / First public release.

**Highlights**
- Entdecken: YouTube- und SoundCloud-Suche mit Filtern (Dauer, Jahr/Zeitraum, Keywords, Genre, Kanal-Blacklist), Duplikat-Erkennung über Plattformen.
- Watchlist für Kanäle, Playlists (auch rückwärts), SoundCloud-Künstler/-Sets und gespeicherte Suchen; Eingang, Auto-Download, In-App-Intervall und Windows-Aufgabenplanung (headless).
- Downloads: sequenzielle Warteschlange mit Fortschritt, Pausen, Lauf-/Tageslimits und Backoff pro Plattform (YouTube schonen).
- MP3 320 bzw. Original, ID3v2.4-Tags, quadratisches Cover, CUE und ID3-Kapitel; Ordnerstruktur für Plex/Jellyfin.
- Bibliothek mit eingebautem Mini-Player (Kapitel-Sprungmarken, Trackliste) oder Standardplayer, Genre per Klick ändern (Datei wird verschoben), Neu taggen, Löschen.
- Protokoll mit Lauf-Historie, Wartung (yt-dlp-Update, DB-Backups), Selbst-Update mit Rollback.
- Windows-Installer `HCLoader-Setup-0.1.0.exe` (pro Benutzer, ohne Admin-Rechte, Startmenü, Deinstallation) – empfohlen; Portable-ZIP als Alternative. / Windows installer (per user, no admin rights) – recommended; portable ZIP as alternative.
- Portable-Build mit eingebettetem Python, Setup per `setup.ps1`, Dark-Hardcore-UI mit App-Icon.


### Added
- Windows-Installer (Inno Setup 6, `installer/HCLoader.iss`): `HCLoader-Setup-<version>.exe` installiert
  pro Benutzer nach `%LOCALAPPDATA%\Programs\HCLoader` (ohne Admin-Rechte), mit Startmenü-Eintrag,
  optionaler Desktop-Verknüpfung, «HCLoader starten» am Ende und Deinstallation. Inhalt = Portable-Build
  ohne `portable.txt`, Daten daher in `%APPDATA%\HCLoader`. Ein neueres Setup installiert über die
  bestehende Version (schliesst HCLoader, ersetzt die Programmordner). Die Deinstallation entfernt den
  ganzen Programmordner (auch `_previous*`, Caches) und die geplante Aufgabe dieser Kopie, nie
  `%APPDATA%\HCLoader` oder die Musik. Das Selbst-Update erkennt installierte Kopien (Modus `installed`,
  pip im mitgelieferten Python wie bei der Portable-Version). `portable.yml` baut das Setup aus dem
  Portable-ZIP, prüft die Pfadlänge (MAX_PATH), testet Installation, Upgrade und Deinstallation und
  hängt das Setup bei Tags an das Release (inkl. `SHA256SUMS`).
- Selbst-Update von HCLoader über GitHub-Releases: Prüfung einmal pro Start (abschaltbar,
  `maintenance.check_app_updates_on_start`), Banner «Version x verfügbar – Herunterladen / Änderungen /
  Später», Download und Vorbereitung im Hintergrund erst nach Klick (Fortschritt), «Jetzt neu starten» bzw.
  Einspielen beim Beenden (`maintenance.apply_update_on_exit`). Updater `scripts/apply_update.ps1` mit
  Rollback, pip/`fetch_binaries.ps1` nur bei Bedarf, Daten und Musik bleiben unberührt; Git-Checkouts
  werden nur informiert. Abschnitt «App-Update» im Wartung-Tab, Repo als Setting `maintenance.update_repo`.
  Bridge `get_update_status`, `check_update`, `download_update`, `cancel_update`, `apply_update_now`,
  Events `update`, `update_progress`. Release-Ablauf in `docs/RELEASING.md`; `portable.yml` hängt bei Tags
  Portable-ZIP, Source-ZIP und `SHA256SUMS` an das Release.
- Automatische Sicherung vor jeder Datenbank-Migration (`backups/hcloader-premigrate-v<alt>-to-v<neu>-<ts>.db`,
  die 5 neuesten bleiben, eigene Rotation). Eine neuere Datenbank in einer älteren App zeigt eine klare
  Meldung statt eines Absturzes.
- Version zentral in `app/__init__.py` (`__version__`), `pyproject.toml` liest sie dynamisch.
- Phase 8 Player (Backend): Einstellung `player.mode` (`internal`/`external`, Default `internal`), Bridge
  `get_media(id)` (prozentkodierte `file:`-URL, Cover-Cache unter `cache/covers/`, Kapitel aus Sidecar > ID3 CHAP > CUE)
  und `play_external(id)` (Standardplayer). Nur lokale Dateien innerhalb des Zielordners, kein Netzwerk.
- `--smoke` nimmt SoundCloud-Permalinks an (auflösen über den Throttle, dann Download per ID).
- yt-dlp-Cache im Datenordner (`cache/yt-dlp`); `curl-cffi` als Extra von yt-dlp (Impersonation gegen
  SoundCloud-403).
- Phase 7a SoundCloud als zweite Plattform (Backend): Suche `scsearch` (`search(query, {platform})`),
  Watchlist-Quellen `soundcloud.com/<nutzer>` (liest `/tracks`, neueste zuerst, inkrementell),
  `…/sets/<set>` (inkl. «Neueste stehen hinten») und SoundCloud-Suchquellen, Download mit eigenem
  Throttle (Zähler, Backoff, Pausen, Prozess-Locks pro Plattform; ein 429 von SoundCloud sperrt
  YouTube nicht und umgekehrt, die Warteschlange lädt die freie Plattform weiter). DB-Migration 5
  (`platform`, `url`, `channel_url`, `preview`, `sources.platform`, `sources.name_auto`), IDs `sc:<id>`,
  Dateiname `[sc-<id>]`, Archiv `soundcloud <id>`, Tags `TXXX:SOUNDCLOUD_ID` / `SOURCE=SoundCloud`,
  Platzhalter `{platform}`. Go+-Vorschauen werden verworfen («Nur Vorschau (Go+)»). Vermutliche
  Duplikate über Plattformen (`duplicate_of`, Option `filters.hide_cross_platform_duplicates`), nie
  automatisch geladen. Einstellungen `soundcloud.*`, `download.keep_original_soundcloud`.
  `get_status().platforms`, `clear_backoff(platform?)`, `get_queue().platform_blocked`.
  Erweiterte SoundCloud-Extractoren für flache Listen: Metadaten ohne Zusatz-Request, kein
  HEAD-Request pro Treffer.
- Quellen-Namen automatisch vorschlagen: `suggest_source(url_or_query, type_hint?)` (ohne Netzwerk),
  `sources.name_auto`; die nächste Prüfung ersetzt einen unveränderten Vorschlag durch den echten
  Kanal-/Nutzer-/Playlist-Namen aus der flachen Liste (Event `source` mit `name`).
- Phase 6 Portable-Version: `scripts/build_portable.ps1` baut `dist\HCLoader\` (Windows-embeddable-Python
  3.12 amd64 mit pip, Abhängigkeiten, App, `bin\` mit Deno/ffmpeg/bgutil-Provider, Lizenzen) und mit
  `-Zip` `HCLoader-portable-<version>-win64.zip`. Starter `HCLoader.vbs` (ohne Konsole),
  `HCLoader-Konsole.cmd` (Fehlersuche), `Verknuepfung-erstellen.cmd`. Portable-Modus über
  `portable.txt`: Daten in `<App>\data\` (Reihenfolge `HCLOADER_HOME` > Portable > `%APPDATA%`),
  relativer Zielordner relativ zum App-Ordner. Update-Knopf aktualisiert das eingebettete Python.
  Aufgabenplanung erkennt einen verschobenen App-Ordner (`path_mismatch`, Hinweis + «Aufgabe neu
  anlegen», Toast beim Start). Download-Markierung (Mark of the Web) der .NET-DLLs wird beim Start
  entfernt. `get_versions` liefert `app_dir`/`portable`. Workflow `.github/workflows/portable.yml`
  (Tags `v*`, manuell, Arbeitsbranch) mit Rauchtests vor und nach dem Verschieben, ZIP als Artefakt.
  `fetch_binaries.ps1` mit `-BinDir`/`-Python`/`-LicenseDir`.

### Fixed
- Review Phase 7a/8/Selbst-Update: **M1** ein geo-gesperrter SoundCloud-Track (`policy: BLOCK`) bricht
  Suchen, Nutzer-Listen und Sets nicht mehr ab, er erscheint mit Filtergrund «Nicht verfügbar (Region)»
  (`videos.geo_blocked`, DB-Migration 6); **M2** Fähigkeitsprüfung der yt-dlp-SoundCloud-Interna
  (Methoden, Attribute, Signaturen) und Rückfall auf das Originalverhalten bei Laufzeitabweichungen;
  **M3** SoundCloud-403 nach dem client_id-Refresh (Datadome) gilt als Bot-Prüfung → Backoff nur für
  SoundCloud (404/CDN-403 nicht); **M4** Updater prüft vor jeder Änderung per Rename-Probe, ob alle
  Einträge verschiebbar sind, und trägt Einträge vor dem Verschieben ins Rollback-Journal ein.
  **m1** kein Updater-Start beim Abmelden/Herunterfahren; **m2** Journal `in_progress.json` +
  Wiederherstellung (`-Recover`) beim nächsten Start, `_previous` bleibt nach einem nicht sauberen Lauf
  erhalten; **m3** Updater wartet auf einen laufenden Headless-Lauf (Lauf-Lock); **m4** SoundCloud-`resolve`
  ohne Extractor-Retry; **m5** Backoff-Stufe pro Plattform nach erfolgreicher Watchlist-Prüfung
  zurückgesetzt, Headless-Exit-Code ohne abgeschaltete Plattformen; **m6** Download-Adressen nur https auf
  GitHub-Hosts, `SHA256SUMS` fail-closed, Banner «ohne Prüfsumme»; **m7** fremdes `update_repo` im Banner;
  **m8** Neustart mit `-X utf8`; **m9** `fetch_binaries.ps1`/`build_portable.ps1`: Längenprüfung gegen
  Content-Length, relative Pfade gegen `$PWD`. Nits: `wiki.yml` nur `main`, `portable.yml` ohne
  Arbeitsbranch, Manifest im `try`, `update.lock` als Lebenszeichen, lange Pfade beim Löschen von `_previous`.
- Windows-CI: Prozess-Locks (Named Mutex) nie besessen, Freigabe per `CloseHandle` aus jedem Thread,
  zusätzlich prozessintern exklusiv; Tests plattformneutral (Pfadtrenner, `?` in Dateinamen,
  Gross/Klein-Dateisystem, Loopback, Zeitstempel kurz nach 1970).
- QA 7a/8: `enqueue` lehnt Go+-Vorschauen und regionsgesperrte Tracks ab (`skipped_unloadable`);
  Update-Banner als Leiste über dem Inhalt (verdeckt keine Knöpfe mehr); Meldung «neuere Datenbank»
  nur einmal auf stderr.
- Review Phase 5: **M1** Neu-Taggen behält fremde ID3-Frames (BPM, Key, Rating, ReplayGain, Lyrics …);
  **m1** zu langer Pfad beim Neu-Taggen als saubere Fehlermeldung; **m2** nicht erreichbarer Zielordner
  (`get_library_status`, `unknown`, Banner, Timeout-Prüfung); **m3** «Nur Eintrag entfernen» für Dateien
  ausserhalb des Zielordners; Hinweise n1-n7, n12, n13 (gemeinsamer Dateisperre, .cue vor MP3, Gross/Klein-
  Umbenennung, Aufräumen nach fehlgeschlagenem Verschieben, desktop.ini/Thumbs.db, Backup-Namensmuster,
  lesbarer Job-Name, Sidecar-Name mit Hash, CI `HCLOADER_REQUIRE_NETWORK`). UI: Felder «Zielordner»/«Pfadmuster»
  volle Breite, Trefferzeile ohne Umbruch, Bibliothek-Grösse unter 1 MB in KB.

### Added
- Phase 5 Backend: Bibliothek (`core/library.py`: `get_library(filters)` mit Suche/Genre/Kanal/Jahr/
  `missing`, `open_folder` mit Explorer-Markierung, `retag` ohne Netzwerk inkl. Verschieben nach
  aktuellem Pfad-Template, `delete_library_item` mit Pfadprüfung und Aufräumen), Metadaten-Sidecar
  (`<app_home>/meta/<id>.json`), Protokoll (`get_log(filters)`, Log-Historie aus der Logdatei, `Run.duration`,
  Event `run`), gültige CUE-Dateien (Raster, erster Track 0, max. 99 Tracks, Kapitel hinter dem Ende
  verworfen), DB-Backup-Aufbewahrung (letzte 10), `run_update(executable=…)` auf fremdem venv,
  Abnahmetests (CUE-Validator, echtes venv-Update mit Marker `network`). `next_run` der Aufgabe aus
  `schtasks /Query /XML` (Review Phase 2 n7).
- Phase 4 Backend: Watchlist (`core/watchlist.py`: inkrementelle Prüfung bis zum ersten bekannten
  Video, Filter, Eingang bzw. Auto-Download, Backoff bricht den Lauf ab), API `save_source`,
  `check_sources` (Events `source`, `watchlist_done`), `get_inbox`, In-App-Intervall
  (`WatchlistScheduler`, `Status.next_check`), Headless-Lauf `--headless --run-watchlist`
  (`app/headless.py`, Exit-Codes 0/1/2/3/4, ein `headless`-Run-Eintrag, PO-Token-Server selbst
  starten/stoppen, `max_downloads_per_run`), Watchlist-Lock.
- Aufgabenplanung per XML (`StartWhenAvailable`, Akku erlaubt, `IgnoreNew`, 6 h; Review Phase 2 n6).

- Playlist-Option «Neueste stehen hinten» (`Source.newest_last`, DB-Migration 3): liest die letzten
  N Einträge rückwärts (`playlist_items "-1:-N:-1"`), damit neue Videos am Ende langer Playlists
  gefunden werden; kostet ca. 1 Request pro 100 Einträge (siehe `docs/decisions.md`).

### Changed
- Review Phase 1: **N3** Mutex im Namensraum `Global\` (Rückfall `Local\`, dann Datei-Lock);
  **N5** Request-Abstand, Suchzähler und Backoff-Eskalation prozessübergreifend (DB-State unter
  Datei-Lock).
- Review Phase 3 Runde 2: **R2-m1** Request-Abstand nach dem Warten auf den Metadaten-Lock erneut
  erzwungen; **R2-n1** `url`/`url_transparent` werden abgelehnt; **R2-n2** Metadaten-Lock
  prozessübergreifend; **R2-n3** `redact` für `@` im Passwort und Proxys ohne Schema; **R2-n4**
  Shutdown vor `activation.stop()`; n5/n7 zurückgestellt (docs/decisions.md).

### Fixed
- Review Phase 4:
  - **M1** Die Watchlist bricht nur noch bei Videos ab, die **diese Quelle** schon gesehen hat
    (DB-Migration 4 `source_videos`). Aus einer Suche oder einer anderen Quelle bekannte Videos werden
    übersprungen und, falls noch `new` und passend, in den Eingang bzw. die Queue gelegt. Die erste
    Prüfung einer Quelle bricht nie ab.
  - **m1** Headless (HTTP-Modus) benutzt den PO-Token-Server der offenen GUI mit, statt mit Exit 1 abzubrechen.
  - **m2** Die geplante In-App-Prüfung zeigt keinen Toast, wenn die Aufgabe gerade prüft, sondern wartet
    10 min. Der Laufmarker `watchlist_running_since` wird beim Start gesetzt.
  - **m3** `watchlist_last_run` nur nach mindestens einer erfolgreichen Quelle, sonst neuer Versuch nach 1 h.
  - **m4** `newest_last` mit harter Grenze von 2000 Einträgen (Fehler «Playlist zu lang …»).
    Suchquellen max. 100 Einträge. Der Request-Abstand zählt ab dem Ende einer mehrseitigen Liste.
  - **m5** Kanal-URLs nur Root, `/videos`, `/streams`.
  - **n1–n8** Backoff-Reset unter Prozess-Lock, Mutex-`restype`/`get_last_error`, Toast maskiert,
    `StartBoundary` in der Zukunft, Abbruch erreicht laufende Listen und schliesst den Run, Auto-Download
    zuerst im Eingang, `max_entries` leer = Default aus den Einstellungen, Premieren/Livestreams werden
    neu bewertet.
  - QA: Die Headless-Notiz beim Lauf-Limit lautet «Rest wird beim nächsten Lauf geladen».
  - Tests gehen nie mehr ins Netz: Playwright-Chromium läuft offline, und eine autouse-Sperre für
    Nicht-Loopback-Verbindungen gilt ausser bei Tests mit Marker `network`.
- Review Phase 3:
  - **M1** Das Genre aus dem Such-Chip bleibt bis in Datei, TCON, Zielordner und DB erhalten:
    `YtClient._finish` nimmt das gespeicherte, nicht manuelle Genre, wenn die Keywords nichts
    entscheiden (manuell > Quelle > Keyword > Chip > Unsortiert; unbekannte Genres fallen auf
    «Unsortiert»). Suchen ändern das Genre von Einträgen in `queued`/`downloading`/`done` nicht
    mehr; die Suche berücksichtigt den Quellen-Default (Phase 4).
  - **m1** Einstellungen übernehmen das Ergebnis von `get_task_status` (`true`/`false`) in
    Formular, gespeicherten Stand und `HC.settings.values`; eine extern gelöschte Aufgabe wird
    nicht mehr still neu angelegt. `null` ändert nichts, ungespeicherte Eingaben bleiben.
  - **m2** Lokale Fehler blockieren die Warteschlange statt Einträge `failed` zu setzen:
    PO-Token-Server nicht bereit (`blocked_code: "pot"`), Zielordner nicht erreichbar oder nicht
    beschreibbar (`"target"`). Einträge bleiben `queued`, kein Lauf-Eintrag, nichts gezählt, keine
    Pause. Beim Start im HTTP-Modus wartet die Queue bis 20 s auf den ersten Watchdog-Check.
    Die Pause zwischen Downloads gilt nur noch nach einem echten Request. UI: Hinweise mit Link
    zu den passenden Einstellungen.
  - **m3** Der Download-Client wird vor dem Lauf erzeugt; schlägt das fehl (z.B. defektes
    yt-dlp), blockiert die Queue mit `blocked_code: "error"`, ohne Lauf-Eintrag und ohne
    30-s-Schleife. Neuer Versuch nach «Fortsetzen», `enqueue` oder Speichern der Einstellungen.
  - **m4** YouTube-Metadaten-Lock (`Throttle.metadata_lock`): Suche, Quellenliste, Auflösen und
    die Extraktion eines Downloads laufen nie gleichzeitig. Der Download gibt den Lock vor der
    Medienübertragung frei (`extract_info(process=False)` + `process_ie_result`). Eine Suche wartet
    max. 60 s, sonst «Download-Abfrage läuft gerade – bitte gleich erneut versuchen».
  - **m5** Beim Beenden wartet HCLoader bis 60 s auf den Queue-Thread (laufender Download wird
    abgebrochen, Eintrag bleibt `queued`) und schliesst die DB erst danach. Endet der Thread
    nicht (lange Konvertierung), bleibt die DB offen und der Eintrag wird auf `queued` gesetzt.
  - **m6** `video`-Event auch, wenn der Throttle einen Download ablehnt (Karte zurück auf
    «wartend»).
  - **m7** `enqueue` und `move_in_queue` laufen in einer Transaktion (`Database.transaction`).
  - **n1** `Video.is_live` (bool); die UI erkennt Livestreams nicht mehr am Text von
    `filter_reason`.
  - **n2** `YtdlpGate`: Update und Suche sperren sich gegenseitig ohne Prüf-Lücke.
  - **n3** `queue_cancel` meldet `{ok:false, error:"Download bereits fertig"}`, wenn der
    Download schon fertig ist oder seinen letzten Schritt (Verschieben) erreicht hat.
  - **n4** Zugangsdaten in URLs (Proxy `user:pass@`) werden in Fehlertexten und allen Logs
    maskiert (`app/core/redact.py`, `RedactingFormatter`).
  - **n6** `.part`/`.ytdl`-Reste in `<Ziel>/.tmp`, älter als 7 Tage, werden beim Start
    aufgeräumt, ausser sie gehören zu einem Eintrag in der Warteschlange (wartend, aktiv oder
    fehlgeschlagen).

### Added
- Phase 3b Integration Entdecken & Downloads: `search(query, opts)` über einen eigenen
  Such-Worker (Throttle, deutsche Meldungen inkl. «wieder möglich ab …»), Treffer in der DB
  (Status `new`, Genre-Erkennung, `filter_reason`, `hidden_count`), `get_last_search` aus der DB;
  Download-Warteschlange `worker.DownloadQueue` (ein aktiver Download, eigener Thread, Reihenfolge
  persistent über DB-Migration 2 `videos.queue_pos`/`date_approx`, Pausieren persistent,
  Verschieben, Abbrechen auch während der Throttle-Pause, manuelles Wiederholen, Lauf-/Tageslimit
  und Backoff mit `blocked_reason`/`blocked_code`, Lauf-Einträge `manual`); Events `progress`
  (`sleep` mit Countdown, `download`, `convert`, `tag`), `done`, `failed`, `queue`, `video`;
  `enqueue`, `add_channel_source`; `Throttle.download_wait()`/`wait_between_downloads()`/
  `search_available_at()`; Integrationstest Suche → Filter → Queue → Download → Tags → DB.
- Fixes (Review Phase 2): yt-dlp wird in der GUI erst bei Bedarf importiert, nach einem Update
  mit geladenem yt-dlp blockiert «Neustart nötig» Queue und Suche (m2); Wartungsaufträge melden
  sofort «Wartung läuft gerade (…)» bzw. eine Zeitüberschreitung (m3); nur der Event-Dispatcher
  ist im UI-Log stumm, Worker-/Watchdog-/Queue-Meldungen sind sichtbar (m4);
  `get_task_status` speichert bei unbekanntem Status nichts und liefert `error` (m5);
  Speicherfehler der Config werden deutsch gemeldet, die Windows-Aufgabe wird erst nach
  erfolgreichem Speichern angelegt/entfernt, sonst zurückgerollt (m8); PO-Token-Server mit
  `--host 127.0.0.1`, Windows Job Object (Kill-on-close) gegen verwaiste deno-Prozesse,
  belegter Port wird gemeldet statt übernommen (m11); Worker vergisst erledigte Aufträge vor dem
  Auflösen (n3); Startfehler der GUI landen im Log und unter Windows in einer MessageBox (n4).
- Phase 3a Backend Entdecken: Einstellungen `search.append_year`, `filters.upload_period` (`year`, `custom`),
  `upload_year`, `upload_from`, `upload_to` mit Validierung; Jahr-/Zeitraum-Filter (Jahr im Titel,
  ungefähres Datum ±1 Jahr) in `filters.passes`; `ytclient.search(query, n, genre=, year=)` und
  `build_search_query`; `approximate_date` für flache Abfragen (`date_approx` am Video);
  `YtClient(pot_server=...)` für extern verwalteten PO-Token-Server.
- Fixes (Review Phase 2): Update-Timeout greift wirklich (m1), Aufgabenplanung unterscheidet
  «nicht registriert» von «Status unbekannt» (m6), Datumsparsing tag-zuerst (m7), Update nur in
  venv (n5).
- Projektgerüst, Konfiguration (YAML/pydantic), SQLite-Schema mit Migrationen.
- Kernmodule: Pfade, Filter, Genre-Erkennung, Throttle mit Backoff, Logging.
- CI-Workflow (Windows, ruff, pytest).
- Kern-Download: `ytclient` (Suche, Quellenliste, Auflösen, Download-Pipeline mit Archiv, Throttle,
  Backoff, Abbruch), `binaries` (deno/ffmpeg/Provider-Status, HTTP-Provider-Kindprozess),
  `tagging` (ID3v2.4, Cover quadratisch, CUE, CHAP/CTOC; m4a/opus).
- CLI `python -m app.main --smoke <URL>`; Stub für `--headless --run-watchlist`.
- `scripts/setup.ps1` und `scripts/fetch_binaries.ps1` (venv, deno, ffmpeg, bgutil-Provider, Verknüpfung).
- README.
- Phase 2 Integration: `app/api.py` (js_api, Methoden exakt wie `ui/js/bridge.js`), `app/worker.py`
  (EventBus → `window.mv.emit`, Hintergrund-Worker, `run_session` für Download-Läufe,
  PO-Token-Watchdog, Live-Log als `log`-Events), `run_gui()` mit pywebview-Fenster
  (1440×900, min. 1100×700, `#08080a`), Single-Instance-Aktivierung (zweiter Start holt das Fenster
  nach vorne, `app/instance.py`).
- Einstellungen speichern/zurücksetzen mit deutschen Feldmeldungen (`section.key`,
  `genres.items.<i>.<feld>`), sofort wirksam (Throttle, Log-Stufe, PO-Token-Server).
- Statusleiste mit echten Werten (Versionen, Deno/ffmpeg, PO-Token-Status, Backoff, Zähler, Queue,
  Eingang, nächste geplante Prüfung).
- Wartung: yt-dlp & Plugin per pip aktualisieren, tägliche Update-Prüfung (PyPI), DB-Sicherung
  (`backups/hcloader-<Zeit>.db`), PO-Token-Test ohne YouTube-Request (`app/core/maintenance.py`,
  `app/core/potoken.py`, `app/core/status.py`).
- Windows-Aufgabenplanung anlegen/prüfen/entfernen (`app/core/scheduler.py`,
  `scripts/run_watchlist.pyw`).
- `docs/bridge-api.md`: Methoden, Rückgaben, Events, Phase-Status.

### Fixed
- Review Phase 1: `download()` akzeptiert nur Einzelvideos (Playlist-/Kanal-/Such-URLs werden vor dem Throttle abgelehnt).
- Migrationen atomar (kein `executescript`), Rollback-Test.
- Download-Archiv wird erst nach `done` von HCLoader geschrieben; hängende `downloading`-Zeilen werden beim Start auf `failed` ("Unterbrochen") gesetzt.
- Throttle thread-sicher; Pause zwischen Downloads zentral erzwungen (persistiert, abbrechbar); Fehlversuche zählen gegen Lauf-/Tageslimit; `finish_run(success)` setzt den Backoff zurück.
- 429/Bot-Check als yt-dlp-Warnung löst den Backoff aus; Abbruch setzt den vorherigen Status zurück ("Abgebrochen"); `.part` bleibt für Wiederholungen erhalten; Schritte nach dem Verschieben sind nicht mehr fatal.
- Pfadlänge in UTF-16-Einheiten, `CONIN$`/`CONOUT$` reserviert; CUE mit UTF-8-BOM; unlesbare `config.yaml` wird als `.bak-<Zeitstempel>` gesichert.
- HTTP-PO-Token-Server: Warten auf `/ping` (10 s); TOKEN_TTL in ganzen Stunden.
- Echte Single-Instance und Lauf-Lock (`app/core/locks.py`); `setup.ps1` wählt Python 3.13/3.12/`py -3` (>= 3.12); `fetch_binaries.ps1` prüft SHA256 und kopiert statt zu verschieben; `.gitignore` ergänzt.

### Changed
- `yt-dlp[default]` (enthält yt-dlp-ejs) in den Abhängigkeiten.
- `bridge.js`: Live-Modus erst, wenn die pywebview-API-Funktionen existieren; mit `?host=pywebview`
  kein Mock-Fallback nach 1,2 s (Wartezeit 30 s).
- Validierung: Maximaldauer muss ≥ Mindestdauer sein (0 = unbegrenzt); doppelte Genre-Namen werden
  zusätzlich an der Zeile gemeldet. Live-Log-Einträge tragen optional `ui_level` (z.B. `ok`).
