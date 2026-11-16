# Changelog

Alle relevanten Änderungen werden hier festgehalten.
Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionierung nach [SemVer](https://semver.org/lang/de/).

## [Unreleased]

### Added
- Phase 4 Backend: Watchlist (`core/watchlist.py`: inkrementelle Prüfung bis zum ersten bekannten
  Video, Filter, Eingang bzw. Auto-Download, Backoff bricht den Lauf ab), API `save_source`,
  `check_sources` (Events `source`, `watchlist_done`), `get_inbox`, In-App-Intervall
  (`WatchlistScheduler`, `Status.next_check`), Headless-Lauf `--headless --run-watchlist`
  (`app/headless.py`, Exit-Codes 0/1/2/3/4, ein `headless`-Run-Eintrag, PO-Token-Server selbst
  starten/stoppen, `max_downloads_per_run`), Watchlist-Lock.
- Aufgabenplanung per XML (`StartWhenAvailable`, Akku erlaubt, `IgnoreNew`, 6 h; Review Phase 2 n6).

### Changed
- Review Phase 1: **N3** Mutex im Namensraum `Global\` (Rückfall `Local\`, dann Datei-Lock);
  **N5** Request-Abstand, Suchzähler und Backoff-Eskalation prozessübergreifend (DB-State unter
  Datei-Lock).
- Review Phase 3 Runde 2: **R2-m1** Request-Abstand nach dem Warten auf den Metadaten-Lock erneut
  erzwungen; **R2-n1** `url`/`url_transparent` werden abgelehnt; **R2-n2** Metadaten-Lock
  prozessübergreifend; **R2-n3** `redact` für `@` im Passwort und Proxys ohne Schema; **R2-n4**
  Shutdown vor `activation.stop()`; n5/n7 zurückgestellt (docs/decisions.md).

### Fixed
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
