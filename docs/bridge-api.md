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
- **Lange Operationen** (`update_ytdlp`, `backup_db`, `test_po_token`) laufen im Wartungs-Thread
  `app/worker.Worker` (Job-Queue, gleiche Jobs werden nicht doppelt gestartet). Der
  pywebview-Aufruf-Thread wartet auf das Ergebnis; Fortschritt kommt als `log`-Events. Läuft schon
  ein *anderer* Wartungsauftrag, kommt sofort `{ok:false, error:"Wartung läuft gerade (Update) –
  bitte später erneut"}`; eine Zeitüberschreitung meldet „Zeitüberschreitung – der Auftrag läuft im
  Hintergrund weiter“. Kurze Subprozesse (`schtasks`, Timeout 20 s) laufen direkt im Aufruf-Thread.
- **Suche** läuft im eigenen Such-Thread (`Worker("hcloader-search")`, max. 180 s Warten),
  **Downloads** im Thread der `DownloadQueue` (genau ein aktiver Download). Beide gehen durch
  denselben thread-sicheren Throttle; eine Suche während eines Downloads ist erlaubt
  (Request-Abstand `sleep_requests` gilt über beide), aber nicht während dessen
  Metadaten-Extraktion (YouTube-Metadaten-Lock, max. 60 s Warten, siehe docs/decisions.md).
  Der pywebview-Thread lädt nie selbst.
- yt-dlp wird erst bei der ersten Suche bzw. dem ersten Download-Lauf importiert.
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
| `update_ytdlp()` | – | `{ok, ytdlp, plugin, changed, output, restart_required?}` \| `{ok:false, error, output}` | 3 |
| `backup_db()` | – | `{ok:true, path}` \| `{ok:false, error}` | 2 |
| `open_path(kind)` | `"data"` \| `"target"` \| `"logs"` | `{ok}` | 2 |
| `pick_folder(current?)` | Startordner (`%VAR%` erlaubt) | `{path}` \| `null` (abgebrochen) | 2 |
| `test_po_token()` | – | `{ok, state, detail, ms}` (abgelehnt/Zeitüberschreitung: `{ok:false, state:"error", detail, error, ms:0}`) | 3 |
| `clear_backoff()` | – | `{ok:true}` | 2 |
| `get_task_status()` | – | `{registered, name, next_run, time, error}` – `registered`: `true`/`false`/`null` (= unbekannt, schtasks-Fehler; `error` sagt warum, Config bleibt unverändert) | 3 |
| `create_task(time)` | `"HH:MM"` | `{ok:true, registered, name, next_run, time}` \| `{ok:false, error}` | 2 |
| `remove_task()` | – | `{ok:true, registered:false}` \| `{ok:false, error}` | 2 |
| `get_blacklist()` | – | `[{channel_id, channel_name, added}]` | 2 |
| `unblock_channel(channel_id)` | Kanal-ID | `{ok:true}` | 2 |

- `update_ytdlp`: `<venv-python> -m pip install -U "yt-dlp[default]" bgutil-ytdlp-pot-provider`;
  jede Ausgabezeile als `log`-Event; verweigert, solange ein Download-Lauf den Lauf-Lock hält.
  Danach Versions-Cache leeren, `last_update_check` setzen, `status` senden. War yt-dlp im Prozess
  schon geladen und hat sich etwas geändert, kommt `restart_required: true`, ein `toast` (warn) und
  Warteschlange/Suche sind bis zum Neustart gesperrt (`blocked_code: "restart"`). Verweigert,
  solange eine Suche läuft.
- Update-*Prüfung* beim Start (`maintenance.check_updates_on_start`, max. 1× pro Kalendertag):
  PyPI-JSON (`https://pypi.org/pypi/<paket>/json`), kein YouTube; bei neuer Version `toast` + Log.
- `backup_db`: sqlite3-Backup-API → `<app_home>/backups/hcloader-<JJJJMMTT-HHMMSS>.db`.
- `test_po_token`: Script-Modus führt `deno run … <server>/src/generate_once.ts --version` aus
  (gleicher Aufruf wie die Verfügbarkeitsprüfung des Plugins, Deno ≥ 2.4.3); HTTP-Modus
  `GET http://127.0.0.1:<port>/ping`. **Kein YouTube-Request.** Das Ergebnis bestimmt
  `status.po_token`, bis sich die Netzwerk-Einstellungen ändern.
- Aufgabenplanung: `schtasks /Create /TN HCLoader-Watchlist /XML <temp.xml> /F` (XML UTF-16: täglich
  `HH:MM`, `StartWhenAvailable`, kein Akku-Stopp, `IgnoreNew`, 6 h Limit; Aktion
  `<venv>\pythonw.exe "<repo>\scripts\run_watchlist.pyw"`, Arbeitsverzeichnis = Repo); Status über
  `/Query /TN HCLoader-Watchlist /FO CSV /V` (Spalten lokalisiert → nach Position gelesen);
  `/Delete … /F`. Wurde die Aufgabe ausserhalb gelöscht, gleicht `get_task_status` die Einstellung an
  (nur bei sicherem `registered: false`, nie bei `null`).
- `create_task`/`remove_task`/`save_settings`: erst wird `config.yaml` geschrieben, dann die Aufgabe
  angelegt/entfernt; scheitert schtasks, wird die Config zurückgesetzt. Schreibfehler (`OSError`)
  kommen als `{ok:false, error:"Speichern fehlgeschlagen: …"}` (bei `save_settings` unter
  `errors.settings`), auch bei `reset_settings`.

### Entdecken / Eingang

| Methode | Parameter | Rückgabe | Phase |
|---|---|---|---|
| `get_last_search()` | – | `{query, effective_query, genre, year, results:[SearchVideo], hidden_count}` \| `null` – aus der DB, ohne Netzwerk | 3 |
| `search(query, opts)` | Suchtext, `{genre: str\|null, year: int\|null}` | `{ok:true, results:[SearchVideo], effective_query, query, genre, year, hidden_count}` \| `{ok:false, error}` | 3 |
| `get_inbox()` | – | `[Video]` (Status `inbox`, aus DB; gefüllt durch die Watchlist) | 4 |
| `enqueue(ids)` | `[id]` | `{ok:true, ids:[übernommen], skipped?: n}` | 3 |
| `set_video_status(id, status)` | `"ignored"` \| `"new"` | `{ok}` (nicht für queued/downloading/done) | 2 |
| `set_genre(id, genre)` | Genre-Name aus Settings | `{ok}` | 2 |
| `open_video(id)` | Video-ID (11 Zeichen) | `{ok}` – Standardbrowser | 2 |
| `add_channel_source(channel_id, channel_name)` | | `{ok:true, source:Source}` \| `{ok:false, error, source?}` (schon vorhanden) | 3 |
| `block_channel(channel_id, channel_name)` | | `{ok}` | 2 |

- `search`: leerer Text → `{ok:false, error:"Suchbegriff fehlt"}`. Unbekanntes Genre bzw. Jahr
  ausserhalb 2005…nächstes Jahr wird ignoriert (`null`). Das Backend hängt bis zu 2 Genre-Begriffe
  und (bei `search.append_year`) das Jahr an; `effective_query` ist der tatsächlich gesuchte Text.
  Fehlermeldungen (deutsch, fertig zum Anzeigen):
  `Backoff aktiv bis 14:30 – Suche gesperrt`,
  `Limit «Suchen pro Stunde» erreicht (20/20) – wieder möglich ab 14:05`,
  `YouTube blockiert gerade (429/Bot-Prüfung) – Backoff bis …`,
  `Neustart nötig – yt-dlp wurde aktualisiert`, `Wartung läuft gerade (Update) – bitte später erneut`,
  `Download-Abfrage läuft gerade – bitte gleich erneut versuchen` (ein Download extrahiert seit
  60 s, die Suche wurde nicht gezählt), `Suche fehlgeschlagen: …` (Zugangsdaten in URLs, z.B.
  Proxy `user:pass@`, sind als `***@` maskiert). Uhrzeiten lokal, `HH:MM` heute bzw. `TT.MM. HH:MM`.
- Alle Treffer werden zurückgegeben (UI blendet aus). Jeder Treffer wird in der DB gespeichert
  (neu = `new`), Genre: manuell > Quellen-Default > Keyword > Genre-Chip der Suche > „Unsortiert“.
  Dieselbe Reihenfolge gilt beim Download für Datei, TCON und Zielordner (der Chip wird als nicht
  manuelles Genre gespeichert und greift, wenn kein Keyword passt). Das Genre von Einträgen mit
  Status `queued`/`downloading`/`done` ändert eine Suche nie.
- `enqueue`: nimmt Videos mit Status `new`, `inbox`, `failed` (wirkt dann wie Wiederholen); andere
  (unbekannt, `done`, `ignored`, schon in der Queue) werden übersprungen. Sendet `video` (queued)
  je Eintrag, `queue` und `status`. Ein neues `enqueue` beendet die Sperre „Limit pro Lauf“.

### Watchlist

| Methode | Parameter | Rückgabe | Phase |
|---|---|---|---|
| `get_sources()` | – | `[Source]` (aus DB, `new_count` = Eingang je Quelle) | 4 |
| `save_source(source)` | `Source` ohne `id` = neu, mit `id` = ändern (Zusatzfelder wie `last_checked`/`new_count` werden ignoriert) | `{ok:true, source:Source}` \| `{ok:false, errors:{feld:"Meldung"}}` (`{ok:false, error, errors:{}}` wenn die `id` nicht mehr existiert) | 4 |
| `delete_source(id)` | | `{ok}` | 4 |
| `check_sources(ids?)` | `[id]` \| `null` = alle aktiven | `{ok:true, started:n}` (n = Anzahl Quellen; 0 = nichts zu tun) \| `{ok:false, error, started:0}` + Events `source`, `watchlist_done` | 4 |
| `get_inbox()` | – | `[Video]` (Status `inbox`, neueste zuerst) | 4 |

- `save_source`-Feldfehler (deutsch, Schlüssel = Feldname): `name` (Pflicht, max. 120), `url_or_query`
  (Kanal: `youtube.com/@name`, `/channel/ID`, `/c/name`, `/user/name`, optional `/videos`; Playlist: URL mit
  `list=`; Suche: nicht leer; doppelte Quelle gleichen Typs wird abgelehnt), `max_entries` (ganze Zahl
  1–200, leer = `schedule.entries_per_source`), `default_genre` (muss in den Einstellungen existieren,
  «Unsortiert»/leer = keins), `type`.
- `check_sources` läuft im eigenen Watchlist-Thread (`hcloader-watchlist`), nicht im Wartungs-Worker; die
  Quellen werden nacheinander geprüft. Abgelehnt (`ok:false`) bei Backoff («Backoff aktiv bis HH:MM –
  Prüfung gesperrt»), «Neustart nötig» und laufendem Update. Hält ein Headless-Lauf den Watchlist-Lock,
  kommt `watchlist_done {checked:0, found:0}` und ein `toast` (warn).
- Pro Quelle: Beim ersten bereits bekannten Video (DB, jeder Status) wird abgebrochen (Kanal/Playlist;
  Suchquellen überspringen Bekanntes nur). Neue Videos bekommen `source_id` und das Genre
  (Quellen-Default > Keyword > Unsortiert). Besteht ein neues Video alle Filter, landet es im Eingang
  (`inbox`) bzw. bei `auto_download` in der Download-Queue (`queued`; Limits der Queue gelten); sonst
  bleibt es `new` und erscheint nicht im Eingang. Ein Fehler einer Quelle (`source.error`) bricht den Lauf
  nicht ab, ein Backoff (429/Bot-Prüfung) schon (`toast` warn).
- **In-App-Intervall:** solange die App offen ist und `schedule.in_app_check`, prüft ein Zeitgeber alle
  `schedule.watchlist_interval_hours` alle aktiven Quellen. Der Zeitpunkt der letzten vollständigen
  Prüfung (GUI oder Headless) steht in `state.watchlist_last_run`; ohne bisherigen Lauf startet die
  erste Prüfung 60 s nach dem App-Start. Nie während eines Backoffs. `Status.next_check` = Frühestes aus
  Aufgabenplanung und In-App-Prüfung (bei aktivem Backoff frühestens dessen Ende).

### Downloads

| Methode | Parameter | Rückgabe | Phase |
|---|---|---|---|
| `get_queue()` | – | `{paused, items:[QueueItem], blocked_reason, blocked_code}` | 3 |
| `set_queue_paused(paused)` | bool | `{ok:true, paused}` | 3 |
| `queue_move(id, delta)` | `-1` / `+1` | `{ok}` \| `{ok:false, error}` | 3 |
| `queue_cancel(id)` | | `{ok}` \| `{ok:false, error}` – zu spät: `error:"Download bereits fertig"` | 3 |
| `queue_retry(id)` | | `{ok}` \| `{ok:false, error}` | 3 |

- Reihenfolge in `items`: aktiver Eintrag (bzw. der Eintrag in der Pause), dann wartende in
  Queue-Reihenfolge, dann fehlgeschlagene. Persistent in der DB (`queued` + `queue_pos`).
- `blocked_reason` (deutscher Text, `null` wenn nichts blockiert oder nichts wartet) und
  `blocked_code`:
  | `blocked_code` | Beispiel `blocked_reason` | hebt sich auf |
  |---|---|---|
  | `restart` | „Neustart nötig – yt-dlp wurde aktualisiert. Bitte HCLoader neu starten, die Warteschlange bleibt erhalten“ | Neustart |
  | `backoff` | „Backoff aktiv bis 14:30 – Rest bleibt in der Warteschlange“ | selbst bei Ablauf / `clear_backoff` |
  | `day_limit` | „Tageslimit erreicht (25/25) – Rest bleibt in der Warteschlange“ | selbst am nächsten Tag / höheres Limit |
  | `run_limit` | „Limit pro Lauf erreicht (10/10) – Rest bleibt in der Warteschlange; «Fortsetzen» startet einen neuen Lauf“ | `set_queue_paused(false)` oder `enqueue` |
  | `error` | „Download-Modul (yt-dlp) konnte nicht geladen werden: … – neuer Versuch nach «Fortsetzen», neuen Einträgen oder dem Speichern der Einstellungen“ | `set_queue_paused(false)`, `enqueue`, `save_settings`/`reset_settings` |
  | `pot` | „PO-Token-Server nicht bereit – Downloads warten, bis er läuft – Rest bleibt in der Warteschlange“ (nach 3 Fehlstarts: „PO-Token-Server startet nicht (mehrere Versuche) – bitte Deno/Provider und Einstellungen › Netzwerk prüfen – Rest …“) | selbst, sobald der Watchdog den Server meldet / Netzwerk-Einstellungen gespeichert |
  | `target` | „Zielordner nicht erreichbar oder nicht beschreibbar (D:\Musik\HCLoader): … – Rest bleibt in der Warteschlange“ | selbst (Prüfung alle 30 s) / Einstellungen speichern |
  | `busy` | „Ein anderer Download-Lauf ist aktiv (z.B. geplante Prüfung) – wartet“ | selbst |
  „Pausiert“ ist kein `blocked_code` (Feld `paused`). Reihenfolge, wenn mehreres zutrifft:
  `restart`, `backoff`, `day_limit`, `run_limit`, `error`, `pot`/`target`, `busy`.
  `error`/`pot`/`target` sind lokale Probleme: kein YouTube-Request, nichts gezählt, keine
  Pause, kein Lauf-Eintrag; die Einträge bleiben `queued` (nie `failed`).
- `set_queue_paused(true)`: ein laufender Download lädt fertig, eine laufende Throttle-Pause wird
  abgebrochen; der Zustand überlebt Neustarts. `false` setzt auch die Lauf-Limit-Sperre zurück.
- `queue_move`: nur wartende Einträge (`state: "waiting"`), Tausch mit dem wartenden Nachbarn.
- `queue_cancel`: wartend/fehlgeschlagen → Status `new` (raus aus der Queue). Aktiv oder in der
  Pause → Abbruch (Teildateien bleiben), danach ebenfalls `new`; Events `video`, `queue`. Hat der
  aktive Download seinen letzten Schritt (Verschieben in die Bibliothek) schon erreicht oder ist
  er fertig: `{ok:false, error:"Download bereits fertig"}`, der Eintrag wird `done`.
- `queue_retry`: nur `failed` → hinten an die wartenden Einträge (manuell, SPEC §5).

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

- `Video.date_approx`: `true`, wenn `upload_date` aus einer flachen Abfrage stammt (ungefähr);
  ein exaktes Datum (nach Download/Auflösen) wird nie durch ein ungefähres ersetzt.
  `Video.upload_date`: `"YYYYMMDD"` oder `null`.
- `Video.is_live`: `true` nur bei Suchtreffern, die ein Livestream sind (auch in
  `get_last_search`), sonst `false`. Die UI blendet Livestreams darüber aus, nicht über den Text
  von `filter_reason`.
- `SearchVideo` = `Video` + `filter_reason` (`""` = besteht die gespeicherten Filter; sonst z.B.
  „Zu kurz“, „Dauer unbekannt“, „Livestream“, „Kein Include-Keyword“, „Exclude-Keyword: tutorial“,
  „Kanal blockiert“, „Bereits geladen“, „Ignoriert“, „Ausserhalb des Zeitraums“,
  „Upload-Datum unbekannt“). Mit `opts.year` gilt für den Grund der Zeitraum „Jahr“ = `year`.
- `QueueItem`: `{id, video:Video, state, phase, pct, speed, eta, error, target}`, in der Pause
  zusätzlich `sleep_total` (s). `state`: `waiting` (auch während `phase:"sleep"`), `active`
  (`download`/`convert`/`tag`), `failed` (`phase:"download"`, `error` gesetzt). `speed` MB/s,
  `eta` s (in der Pause: Restsekunden), `pct` 0–100 (bei `convert`/`tag` 100). `target`: relativer
  Zielordner nach `storage.path_template`, z.B. `Hardcore/Partyraiser/2026/` (Trenner des OS).
- `Run.kind`: `watchlist` (GUI-Prüfung: `found` = neue Videos, `downloaded` 0, `note` z.B.
  «Backoff bis 14:30», «2 Quelle(n) mit Fehler»), `headless` (geplanter Lauf: Prüfung **und** Downloads in
  einem Eintrag; `note` z.B. «Limit pro Lauf erreicht …», «Backoff aktiv bis …»), `manual` (Queue).
- `Run.kind` der Warteschlange: `manual` (ein Eintrag pro Lauf, `note` = Grund des Abbruchs, z.B.
  Limit/Backoff).
- `Status.po_token.state`: `inactive` (Modus aus), `error` (Plugin/Deno/Provider-Verzeichnis fehlt,
  HTTP-Server läuft nicht, letzter Test fehlgeschlagen), sonst `active`.
- `Status.next_check`: nächste Ausführung der Windows-Aufgabe (falls aktiv) bzw. der In-App-Prüfung
  (das Früheste gewinnt). `null` = nichts geplant (auch ohne aktive Quelle).
- `Status.queue_length`: Videos mit Status `queued`/`downloading`; `inbox_count`: Status `inbox`.
- `Status.counters`: aus dem Throttle (`downloads_run`, `downloads_day`, `searches_hour`).
- `Run.kind`: unbekannte Arten aus der DB werden als `manual` gemeldet.
- `LogLine.level`: `DEBUG→debug`, `INFO→info`, `WARNING→warn`, `ERROR/CRITICAL→error`;
  `ok` für Erfolgsmeldungen (`log.info(..., extra={"ui_level": "ok"})`, Helfer `worker.log_ok`).

## Events (Python → UI)

| Event | Daten | Sender | Phase |
|---|---|---|---|
| `status` | `Status` | nach `save/reset_settings`, `update_ytdlp`, `test_po_token`, `clear_backoff`, `create/remove_task`, `set_video_status`, `search`, jeder Queue-Änderung, Start/Stopp des PO-Token-Servers, sonst alle 30 s | 2/3 |
| `log` | `LogLine` | jede Logzeile (ausser Logger `pywebview*`, `app.worker.events`, `urllib3*`) | 2/3 |
| `toast` | `{msg, kind?}` (`ok`/`info`/`warn`/`err`) | Update verfügbar, „yt-dlp aktualisiert – bitte HCLoader neu starten“ (warn), Platzhalter „Folgt in Phase N“ | 2/3 |
| `video` | `{id, status, genre}` | `set_video_status`, `set_genre`, `enqueue`, Start/Ende/Abbruch eines Downloads, Download vom Throttle abgelehnt oder lokal gesperrt (zurück auf `queued`) | 2/3 |
| `progress` | `{id, phase, pct, speed, eta}` (+ `sleep_total` bei `sleep`) | Download-Queue: `sleep` einmal zu Beginn der Pause, `download` höchstens ca. 2×/s (Phasenwechsel und 100 % immer), `convert`, `tag` | 3 |
| `done` | `{id, title}` | Download fertig getaggt und verschoben | 3 |
| `failed` | `{id, title, error}` | Download fehlgeschlagen (bei 429 zusätzlich Backoff → `status`) | 3 |
| `queue` | `{}` | Warteschlange geändert (auch Sperre/Freigabe) → UI ruft `get_queue()` | 3 |
| `source` | `{id, checking, last_checked?, new_count?, error?}` | `checking:true` vor, `checking:false` nach der Prüfung einer Quelle; `new_count` = Eingang dieser Quelle, `error` = deutscher Text | 4 |
| `watchlist_done` | `{checked, found}` | Watchlist-Lauf beendet; `checked` = bearbeitete Quellen (auch fehlerhafte), `found` = neu gespeicherte Videos | 4 |

## Download-Queue (Phase 3)

`app/worker.DownloadQueue` (eigener Thread `hcloader-queue`) startet einen Lauf mit
`run_session(throttle)` (Lauf-Lock, Lauf-Zähler, am Ende `Throttle.finish_run(success)`, `runs`-Eintrag
`manual`), sobald Einträge warten und nichts sperrt. Vor dem Lauf (ohne Lauf-Eintrag):
Throttle-Sperren, `error`, lokale Vorprüfung (`worker.local_preflight`: im HTTP-Modus läuft der
PO-Token-Server – beim ersten Start wird bis 20 s auf den Watchdog gewartet –, `<Ziel>/.tmp` ist
beschreibbar), dann wird der Client erzeugt. Beim Start des Threads werden alte Teildateien
(> 7 Tage, nicht in der Warteschlange) aus `<Ziel>/.tmp` gelöscht. Pro Eintrag:

1. Sperre prüfen (`Throttle.download_block()`; Lauf-Limit → `run_limit`; ab dem zweiten Eintrag
   auch die lokale Vorprüfung).
2. Restpause seit dem letzten Download (`Throttle.download_wait()`) ≥ 1 s → Event `progress`
   `{id, phase:"sleep", pct:0, speed:0, eta:<s>, sleep_total:<s>}`, `queue`; Warten abbrechbar.
   Danach wird der nächste Eintrag neu gelesen (Reihenfolge kann sich geändert haben).
3. `YtClient.download(id, on_progress, cancel_event, on_commit)` → `video` (downloading), `progress`
   `download` … `convert` → `tag` → `video` (done) + `done`, bzw. `failed`. `ThrottleError` oder
   `LocalError` → `video` (queued), Lauf endet mit Sperre (kein `failed`).

Beenden: `Api.shutdown` bricht den aktiven Download ab (Eintrag bleibt `queued`), wartet bis
60 s auf den Thread und schliesst die DB erst danach; endet er nicht, bleibt die DB bis zum
Prozessende offen und `downloading` wird `queued`.

Typische Event-Folge für zwei Einträge A, B:
`queue` · `video{A,downloading}` · `progress{A,download}`… · `progress{A,convert}` ·
`progress{A,tag}` · `video{A,done}` · `done{A}` · `queue` · `progress{B,sleep,eta:30}` · `queue` ·
… · `done{B}` · `queue` · `status`.

`YtClient` bekommt in der GUI `worker.WatchdogPotServer(watchdog)` als `pot_server` (extern
verwaltet, kein zweiter Server auf demselben Port).

## Headless-Lauf (Phase 4)

`python -m app.main --headless --run-watchlist` (= `scripts/run_watchlist.pyw`, Aufgabenplanung):
Lauf-Lock + Watchlist-Lock, PO-Token-Server (HTTP-Modus) selbst starten/stoppen, alle aktiven Quellen
prüfen, danach die Queue (Auto-Download und bereits Wartende, `max_downloads_per_run`) sequenziell laden,
ein `runs`-Eintrag `headless`. Ist die Queue in der GUI pausiert, wird nichts geladen (Notiz).
Exit-Codes (`app/exitcodes.py`): 0 ok · 1 Fehler (Quelle/Download/PO-Token/unerwartet) · 2 Backoff (beim
Start aktiv oder im Lauf ausgelöst) · 3 falsche Argumente · 4 anderer Lauf aktiv (Lauf- oder Watchlist-Lock).
