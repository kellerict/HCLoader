# Bridge-API (UI ↔ Python)

Vertrag zwischen `ui/js/bridge.js` (Kommentarblock = Quelle der Methodennamen und Datenformen) und
`app/api.py` (`Api`, js_api von pywebview). Ein Test (`tests/test_api.py`) prüft, dass die von
pywebview exponierten Methoden **genau** den in `bridge.js` dokumentierten entsprechen und dass alle
`HC.bridge.call/safe('…')`-Aufrufe der UI existieren.

## Transport und Threads

- **Aufruf UI → Python:** `HC.bridge.call('name', ...args)` → `window.pywebview.api.name(...args)` →
  Promise. pywebview führt jeden Aufruf in einem **eigenen Thread** aus (nie im GUI-Thread) und
  serialisiert den Rückgabewert als JSON. Ausnahmen in Python werden in JS zu einem rejected Promise
  (`HC.bridge.safe` zeigt dann einen Fehler-Toast und liefert `null`).
- **Lange Operationen** (`update_ytdlp`, `backup_db`, `test_po_token`) laufen im einzigen
  Hintergrund-Thread `app/worker.Worker` (Job-Queue, gleiche Jobs werden nicht doppelt gestartet).
  Der pywebview-Aufruf-Thread wartet auf das Ergebnis; Fortschritt kommt als `log`-Events.
  Kurze Subprozesse (`schtasks`, Timeout 20 s) laufen direkt im Aufruf-Thread.
- **Events Python → UI:** `EventBus.emit(type, data)` (thread-sicher, nicht blockierend) → ein
  Dispatcher-Thread ruft `window.evaluate_js('window.mv && window.mv.emit("type", {json})')` auf.
  JSON mit `ensure_ascii=True` ist ein gültiges JS-Literal (keine rohen U+2028/2029, keine
  ausbrechenden Quotes). Events vor dem `loaded`-Event des Fensters werden verworfen – die UI holt
  den Zustand beim Start selbst (`get_settings`, `get_status`, `get_log` …).
- **Live- oder Mock-Modus:** `app/main.py` lädt `ui/index.html?host=pywebview`. Mit diesem Marker
  wartet `bridge.js` bis 30 s auf die echte API (pywebview injiziert sie erst nach dem Laden der
  Seite, `window.pywebview.api` existiert zuerst leer – „live“ gilt erst, wenn
  `api.get_settings` eine Funktion ist). Ohne Marker (Browser, Screenshots) springt der Mock nach
  1,2 s ein; `?mock=1` erzwingt ihn. Kommt pywebview doch noch, lädt die UI neu im Live-Modus.

## Konventionen

- Aktionen liefern `{ok: true, …}` oder `{ok: false, error: "deutsche Meldung"}`.
- Validierungsfehler: `{ok: false, errors: {"section.key": "Meldung"}}`; Genres zusätzlich
  `genres.items.<index>.<feld>` (z.B. `genres.items.2.name` bei doppeltem Namen).
- Zeitstempel ISO-8601 (`2026-11-16T03:00:00+01:00`), Grössen in MB, Dauer in Sekunden.
- Platzhalter für spätere Phasen liefern neutrale Daten (`[]`, `null`, `{paused:false, items:[]}`)
  bzw. `{ok: false, error: "Folgt in Phase N"}` und senden zusätzlich einen `toast` (info).

## Methoden

Phase = ab wann die Methode voll funktioniert. „2“ = jetzt implementiert.

### Einstellungen

| Methode | Parameter | Rückgabe | Phase |
|---|---|---|---|
| `get_settings()` | – | `{values, defaults}` – Struktur `docs/settings-schema.md` | 2 |
| `save_settings(values)` | komplettes Values-Objekt | `{ok:true, values}` (normalisiert) \| `{ok:false, errors}` | 2 |
| `reset_settings(section?)` | Abschnitt oder nichts (= alles) | `{ok:true}` \| `{ok:false, error}` | 2 |

`save_settings` validiert mit pydantic (`config.parse_settings`), speichert `config.yaml`
(Kommentare bleiben), macht die Änderung sofort wirksam und sendet `status`:
Throttle/yt-dlp lesen die Settings live, `general.log_level` setzt das Logging neu,
`network.*` startet/stoppt den HTTP-PO-Token-Server (Watchdog), `appearance.*` wendet die UI selbst
an. Ändert sich `schedule.task_scheduler_enabled` oder (bei aktiver Aufgabe) `schedule.task_time`,
wird die Windows-Aufgabe angelegt/geändert/entfernt; scheitert das (z.B. nicht Windows), wird nichts
gespeichert und der Fehler kommt am Feld zurück. `reset_settings` lässt die beiden
Aufgaben-Felder unverändert (sie spiegeln den Zustand der Windows-Aufgabe).

### Status / Wartung

| Methode | Parameter | Rückgabe | Phase |
|---|---|---|---|
| `get_status()` | – | `Status` (siehe unten) | 2 |
| `get_versions()` | – | `{app, ytdlp, plugin, deno, ffmpeg, python, data_dir, db_path, db_entries, db_size_mb, last_backup, last_update_check}` | 2 |
| `update_ytdlp()` | – | `{ok, ytdlp, plugin, changed, output}` \| `{ok:false, error, output}` | 2 |
| `backup_db()` | – | `{ok:true, path}` \| `{ok:false, error}` | 2 |
| `open_path(kind)` | `"data"` \| `"target"` \| `"logs"` | `{ok}` | 2 |
| `pick_folder(current?)` | Startordner (`%VAR%` erlaubt) | `{path}` \| `null` (abgebrochen) | 2 |
| `test_po_token()` | – | `{ok, state, detail, ms}` | 2 |
| `clear_backoff()` | – | `{ok:true}` | 2 |
| `get_task_status()` | – | `{registered, name, next_run, time}` (+ `error` ausserhalb Windows) | 2 |
| `create_task(time)` | `"HH:MM"` | `{ok:true, registered, name, next_run, time}` \| `{ok:false, error}` | 2 |
| `remove_task()` | – | `{ok:true, registered:false}` \| `{ok:false, error}` | 2 |
| `get_blacklist()` | – | `[{channel_id, channel_name, added}]` | 2 |
| `unblock_channel(channel_id)` | Kanal-ID | `{ok:true}` | 2 |

- `update_ytdlp`: `<venv-python> -m pip install -U "yt-dlp[default]" bgutil-ytdlp-pot-provider`;
  jede Ausgabezeile als `log`-Event; verweigert, solange ein Download-Lauf den Lauf-Lock hält.
  Danach Versions-Cache leeren, `last_update_check` setzen, `status` senden. Neue yt-dlp-Version
  wirkt im laufenden Prozess erst nach einem Neustart (steht in `output`).
- Update-*Prüfung* beim Start (`maintenance.check_updates_on_start`, max. 1× pro Kalendertag):
  PyPI-JSON (`https://pypi.org/pypi/<paket>/json`), kein YouTube; bei neuer Version `toast` + Log.
- `backup_db`: sqlite3-Backup-API → `<app_home>/backups/hcloader-<JJJJMMTT-HHMMSS>.db`.
- `test_po_token`: Script-Modus führt `deno run … <server>/src/generate_once.ts --version` aus
  (gleicher Aufruf wie die Verfügbarkeitsprüfung des Plugins, Deno ≥ 2.4.3); HTTP-Modus
  `GET http://127.0.0.1:<port>/ping`. **Kein YouTube-Request.** Das Ergebnis bestimmt
  `status.po_token`, bis sich die Netzwerk-Einstellungen ändern.
- Aufgabenplanung: `schtasks /Create /SC DAILY /ST HH:MM /TN HCLoader-Watchlist
  /TR "\"<venv>\pythonw.exe\" \"<repo>\scripts\run_watchlist.pyw\"" /F`; Status über
  `/Query /TN HCLoader-Watchlist /FO CSV /V` (Spalten lokalisiert → nach Position gelesen);
  `/Delete … /F`. Wurde die Aufgabe ausserhalb gelöscht, gleicht `get_task_status` die Einstellung an.

### Entdecken / Eingang

| Methode | Parameter | Rückgabe | Phase |
|---|---|---|---|
| `get_last_search()` | – | `{query, results:[Video]}` \| `null` | 3 (jetzt `null`) |
| `search(query)` | Suchtext | `{ok:true, results:[Video]}` \| `{ok:false, error}` | 3 |
| `get_inbox()` | – | `[Video]` (Status `inbox`, aus DB) | 2 (lesend) / 4 |
| `enqueue(ids)` | `[id]` | `{ok, ids}` | 3 |
| `set_video_status(id, status)` | `"ignored"` \| `"new"` | `{ok}` (nicht für queued/downloading/done) | 2 |
| `set_genre(id, genre)` | Genre-Name aus Settings | `{ok}` | 2 |
| `open_video(id)` | Video-ID (11 Zeichen) | `{ok}` – Standardbrowser | 2 |
| `add_channel_source(channel_id, channel_name)` | | `{ok, source}` | 4 |
| `block_channel(channel_id, channel_name)` | | `{ok}` | 2 |

### Watchlist

| Methode | Parameter | Rückgabe | Phase |
|---|---|---|---|
| `get_sources()` | – | `[Source]` (aus DB, `new_count` = Eingang je Quelle) | 2 (lesend) / 4 |
| `save_source(source)` | `Source` ohne `id` = neu | `{ok, source}` \| `{ok:false, errors:{feld}}` | 4 |
| `delete_source(id)` | | `{ok}` | 2 |
| `check_sources(ids?)` | `[id]` \| `null` = alle | `{ok, started}` + Events `source`, `watchlist_done` | 4 |

### Downloads

| Methode | Parameter | Rückgabe | Phase |
|---|---|---|---|
| `get_queue()` | – | `{paused, items:[QueueItem]}` | 3 (jetzt leer) |
| `set_queue_paused(paused)` | bool | `{ok, paused}` | 3 |
| `queue_move(id, delta)` | `-1` / `+1` | `{ok}` | 3 |
| `queue_cancel(id)` | | `{ok}` | 3 |
| `queue_retry(id)` | | `{ok}` | 3 |

### Bibliothek / Protokoll

| Methode | Parameter | Rückgabe | Phase |
|---|---|---|---|
| `get_library()` | – | `[LibraryItem]` (Status `done`, aus DB) | 2 (lesend) / 5 |
| `open_folder(id)` | | `{ok}` – Ordner der Datei | 2 |
| `retag(id)` | | `{ok}` | 5 |
| `delete_library_item(id)` | | `{ok}` | 5 |
| `get_log()` | – | `{lines:[LogLine], runs:[Run]}` – Backlog (500 Zeilen) + letzte 50 Läufe | 2 |

## Datenformen

Siehe Kommentarblock in `ui/js/bridge.js` (Video, Source, QueueItem, LibraryItem, LogLine, Run,
Status). Ergänzungen der Python-Seite:

- `Status.po_token.state`: `inactive` (Modus aus), `error` (Plugin/Deno/Provider-Verzeichnis fehlt,
  HTTP-Server läuft nicht, letzter Test fehlgeschlagen), sonst `active`.
- `Status.next_check`: nächste Ausführung der Windows-Aufgabe (falls aktiv); ab Phase 4 zusätzlich
  die In-App-Prüfung (das Früheste gewinnt). `null` = nichts geplant.
- `Status.queue_length`: Videos mit Status `queued`/`downloading`; `inbox_count`: Status `inbox`.
- `Status.counters`: aus dem Throttle (`downloads_run`, `downloads_day`, `searches_hour`).
- `Run.kind`: unbekannte Arten aus der DB werden als `manual` gemeldet.
- `LogLine.level`: `DEBUG→debug`, `INFO→info`, `WARNING→warn`, `ERROR/CRITICAL→error`;
  `ok` für Erfolgsmeldungen (`log.info(..., extra={"ui_level": "ok"})`, Helfer `worker.log_ok`).

## Events (Python → UI)

| Event | Daten | Sender | Phase |
|---|---|---|---|
| `status` | `Status` | nach `save/reset_settings`, `update_ytdlp`, `test_po_token`, `clear_backoff`, `create/remove_task`, `set_video_status`, Start/Stopp des PO-Token-Servers, sonst alle 30 s | 2 |
| `log` | `LogLine` | jede Logzeile (ausser Logger `pywebview*`, `app.worker*`) | 2 |
| `toast` | `{msg, kind?}` (`ok`/`info`/`warn`/`err`) | Update verfügbar, Platzhalter „Folgt in Phase N“ | 2 |
| `video` | `{id, status, genre?}` | `set_video_status`, `set_genre` | 2 |
| `progress` | `{id, phase, pct, speed, eta}` | Download-Queue (ca. 2×/s) | 3 |
| `done` | `{id, title}` | Download fertig | 3 |
| `failed` | `{id, title, error}` | Download fehlgeschlagen | 3 |
| `queue` | `{}` | Warteschlange geändert → UI ruft `get_queue()` | 3 |
| `source` | `{id, checking, last_checked?, new_count?, error?}` | Watchlist-Prüfung | 4 |
| `watchlist_done` | `{checked, found}` | Watchlist-Lauf beendet | 4 |

## Erweiterung Phase 3 (Download-Queue)

`app/worker.py` stellt `run_session(throttle)` bereit: hält `locks.acquire_run_lock()` für den
ganzen Lauf, setzt den Lauf-Zähler zurück und ruft am Ende immer
`Throttle.finish_run(run.success)`. Die Queue bekommt einen eigenen Thread (Downloads dürfen den
Wartungs-Worker nicht blockieren); der laufende `PotServer` des Watchdogs (`PotWatchdog.server`) wird
an `YtClient` übergeben, damit nicht ein zweiter Server auf demselben Port startet.
