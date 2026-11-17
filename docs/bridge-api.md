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
| `get_versions()` | – | `{app, ytdlp, plugin, deno, ffmpeg, python, data_dir, app_dir, portable, db_path, db_entries, db_size_mb, last_backup, last_update_check, backups:[{name, path, size_mb, created}], restart_required}` (backups neueste zuerst, max. 10; `portable`: `portable.txt` im App-Ordner `app_dir`, dann ist `data_dir` = `<app_dir>\data`, seit Phase 6) | 2 |
| `update_ytdlp()` | – | `{ok, ytdlp, plugin, changed, output, restart_required?}` \| `{ok:false, error, output}` | 3 |
| `backup_db()` | – | `{ok:true, path}` \| `{ok:false, error}` | 2 |
| `open_path(kind)` | `"data"` \| `"target"` \| `"logs"` | `{ok}` | 2 |
| `pick_folder(current?)` | Startordner (`%VAR%` erlaubt) | `{path}` \| `null` (abgebrochen) | 2 |
| `test_po_token()` | – | `{ok, state, detail, ms}` (abgelehnt/Zeitüberschreitung: `{ok:false, state:"error", detail, error, ms:0}`) | 3 |
| `clear_backoff(platform?)` | `"youtube"` \| `"soundcloud"`; ohne = alle Plattformen | `{ok:true}` \| `{ok:false, error}` (unbekannte Plattform) | 2/7a |
| `get_task_status()` | – | `{registered, name, next_run, time, error, path_mismatch, task_command}` – `registered`: `true`/`false`/`null` (= unbekannt, schtasks-Fehler; `error` sagt warum, Config bleibt unverändert); `path_mismatch` (Phase 6): die Aufgabe startet einen anderen App-Ordner, `task_command` = eingetragene Befehlszeile oder `null` | 3/6 |
| `create_task(time)` | `"HH:MM"` | `{ok:true, registered, name, next_run, time, path_mismatch, task_command}` \| `{ok:false, error}` | 2 |
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
- `backup_db`: sqlite3-Backup-API → `<app_home>/backups/hcloader-<JJJJMMTT-HHMMSS>.db`. Danach bleiben nur
  die neuesten `maintenance.BACKUP_KEEP` (10) Sicherungen, ältere `hcloader-*.db` werden gelöscht (die
  neue nie).
- `get_task_status().next_run`: seit Phase 5 aus dem Trigger der Aufgabe (`schtasks /Query /XML`,
  `StartBoundary`-Uhrzeit → nächstes Auftreten, ISO mit Offset) statt aus dem lokalisierten Datum der
  CSV-Ausgabe; die CSV ist nur noch der Rückfall.
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
- **App verschoben (Phase 6):** `get_task_status` liest `<Command>`/`<Arguments>` aus
  `schtasks /Query /XML` und vergleicht sie (Gross/Klein, `/` vs. `\`, Anführungszeichen egal) mit dem,
  was `create_task` jetzt eintragen würde (`<app>\python\pythonw.exe` bzw. `<venv>\Scripts\pythonw.exe`
  und `<app>\scripts\run_watchlist.pyw`). Abweichung → `path_mismatch: true`; die Einstellungen zeigen
  «App wurde verschoben – Aufgabe neu anlegen» mit Knopf (= `create_task`, `/F` ersetzt die alte
  Aufgabe). Ist das XML nicht lesbar oder fehlt `<Command>`, gilt `path_mismatch: false`. Einmal pro
  GUI-Start (nach `loaded`, nur wenn `schedule.task_scheduler_enabled`) prüft der Wartungs-Worker
  (Job `task_check`) dasselbe und sendet bei Abweichung einen `toast` (warn) + Log-Warnung.
- `update_ytdlp` in der Portable-Version: kein venv, aber `portable.txt` im App-Ordner und
  `sys.executable` direkt in `<app>\python\` → Update erlaubt, Befehl
  `<app>\python\python.exe -m pip install -U --no-warn-script-location --prefer-binary --no-build-isolation …`.
  Sonst (weder venv noch Portable-Python) `{ok:false, error:"HCLoader läuft weder in einer virtuellen Umgebung (venv) noch im Python der Portable-Version – Update abgebrochen"}`.
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
| `open_video(id)` | Video-ID (11 Zeichen) oder `sc:<id>` | `{ok}` – Standardbrowser (SoundCloud: gespeicherte Trackseite `Video.url`, nur `https://soundcloud.com/…`) | 2/7a |
| `add_channel_source(channel_id, channel_name)` | YouTube-Kanal-ID oder `sc:<nutzer-id>` | `{ok:true, source:Source}` \| `{ok:false, error, source?}` (schon vorhanden / SoundCloud-Nutzer ohne bekannte Profil-URL); `name_auto:false` | 3/7a |
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
| `suggest_source(url_or_query, type_hint?)` | Text aus dem Feld URL/Suchbegriff; `type_hint` `"search"` erzwingt Suche | `{type, platform, name, url_normalized}` ohne Netzwerk (siehe «SoundCloud (Phase 7a)») | 7a |
| `save_source(source)` | `Source` ohne `id` = neu, mit `id` = ändern (Zusatzfelder wie `last_checked`/`new_count` werden ignoriert) | `{ok:true, source:Source}` \| `{ok:false, errors:{feld:"Meldung"}}` (`{ok:false, error, errors:{}}` wenn die `id` nicht mehr existiert) | 4 |
| `delete_source(id)` | | `{ok}` | 4 |
| `check_sources(ids?)` | `[id]` \| `null` = alle aktiven | `{ok:true, started:n}` (n = Anzahl Quellen; 0 = nichts zu tun) \| `{ok:false, error, started:0}` + Events `source`, `watchlist_done` | 4 |
| `get_inbox()` | – | `[Video]` (Status `inbox`, neueste zuerst) | 4 |

- `save_source`-Feldfehler (deutsch, Schlüssel = Feldname): `name` (Pflicht, max. 120), `url_or_query`
  (Kanal: `youtube.com/@name`, `/channel/ID`, `/c/name`, `/user/name`, optional **nur** `/videos` oder
  `/streams` – `/playlists`, `/releases`, `/featured` usw. werden abgelehnt; Playlist: URL mit `list=`;
  Suche: nicht leer; doppelte Quelle gleichen Typs wird abgelehnt), `max_entries` (ganze Zahl 1–200, bei
  **Suchquellen 1–100**), `default_genre` (muss in den Einstellungen existieren, «Unsortiert»/leer =
  keins), `type`.
- `Source.max_entries`: `number | null`. **`null` (Feld leer) = Default** `schedule.entries_per_source`
  zum Zeitpunkt der Prüfung; eine spätere Änderung der Einstellung wirkt also auf diese Quellen.
  Bestehende Quellen mit Zahl behalten ihren Wert. `add_channel_source` legt neue Kanäle mit `null` an.
  Bei der Prüfung wird auf 200 (Suche: 100) begrenzt.
- `Source.newest_last` (bool, Default `false`): nur für Typ `playlist` («Neueste stehen hinten»); bei
  Kanal/Suche erzwingt `save_source` `false`. Die Prüfung liest dann die **letzten** `max_entries` Einträge
  (neuester zuerst). Dafür muss die ganze Playlist durchgeblättert werden (~100 Einträge pro Request,
  500er-Playlist ≈ 5 Requests statt 1, mit `sleep_requests` Pause dazwischen) – Hinweis in der UI-Hilfe.
  **Grenze 2000 Einträge:** Längere Playlists ergeben den Quellenfehler «Playlist zu lang für
  Rückwärts-Lesen (n Einträge, max. 2000)» (`source.error`); die Länge steht meist schon nach der
  ersten Seite fest, sonst wird nach 2000 Einträgen abgebrochen.
- `check_sources` läuft im eigenen Watchlist-Thread (`hcloader-watchlist`), nicht im Wartungs-Worker; die
  Quellen werden nacheinander geprüft. Abgelehnt (`ok:false`) bei Backoff («Backoff aktiv bis HH:MM –
  Prüfung gesperrt»), «Neustart nötig» und laufendem Update. Hält ein Headless-Lauf den Watchlist-Lock,
  kommt bei einer **manuellen** Prüfung `watchlist_done {checked:0, found:0}` und ein `toast` (warn); eine
  **geplante** In-App-Prüfung sendet dann nichts (kein Toast, kein `watchlist_done`) und versucht es nach
  10 min erneut (`Status.next_check` zeigt diesen Zeitpunkt).
- Pro Quelle (Review Phase 4 M1): Abgebrochen wird beim ersten Video, das **diese Quelle** schon gesehen
  hat (Tabelle `source_videos`; Kanal/Playlist; Suchquellen überspringen nur). Bei der **ersten** Prüfung
  einer Quelle (`last_checked` leer) wird nie abgebrochen. Videos, die nur aus einer Suche oder einer
  anderen Quelle bekannt sind, werden übersprungen, ohne abzubrechen; sind sie noch `new` und bestehen
  die Filter, kommen sie für diese Quelle in den Eingang bzw. die Queue (zählen nicht in `found`).
  Neue Videos bekommen `source_id` (bei bekannten nur, wenn leer) und das Genre (Quellen-Default >
  Keyword > Unsortiert). Besteht ein neues Video alle Filter, landet es im Eingang (`inbox`) bzw. bei
  `auto_download` erst im Eingang und gleich danach in der Download-Queue (`queued`; Limits der Queue
  gelten); sonst bleibt es `new` und erscheint nicht im Eingang. Angekündigte Premieren und laufende
  Livestreams (`is_upcoming`/`is_live`) werden nicht gespeichert und bei der nächsten Prüfung neu
  bewertet. Ein Fehler einer Quelle (`source.error`) bricht den Lauf nicht ab, ein Backoff
  (429/Bot-Prüfung) schon (`toast` warn).
- **In-App-Intervall:** solange die App offen ist und `schedule.in_app_check`, prüft ein Zeitgeber alle
  `schedule.watchlist_interval_hours` alle aktiven Quellen. Der Zeitpunkt der letzten vollständigen
  Prüfung (GUI oder Headless) steht in `state.watchlist_last_run` – nur gesetzt, wenn mindestens eine
  Quelle erfolgreich geprüft wurde; scheitern alle, wird nach 1 h erneut geprüft
  (`state.watchlist_retry_at`). Ein laufender vollständiger Lauf (auch Headless) setzt beim Start
  `state.watchlist_running_since`; die In-App-Prüfung wartet dann 10 min ab dessen Start. Ohne bisherigen
  Lauf startet die erste Prüfung 60 s nach dem App-Start. Nie während eines Backoffs. `Status.next_check` = Frühestes aus
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
| `get_library(filters?)` | `{search?, genre?, channel?, year?, missing?}` | `[LibraryItem]` (Status `done`, neueste Downloads zuerst, aus DB) | 5 |
| `get_library_status()` | | `{target_ok, target}` – Zielordner-Prüfung (Thread mit 3-s-Timeout) des letzten `get_library` | 5 |
| `open_folder(id)` | | `{ok}` \| `{ok:false, error}` – Windows: Explorer mit markierter Datei, sonst Ordner | 5 |
| `get_media(id)` | | `{ok:true, id, src, title, artist, genre, platform, duration, cover, chapters:[{start, title, performer}]}` \| `{ok:false, error}` – Phase 8, lokal, kein Netz | 8 |
| `play_external(id)` | | `{ok}` \| `{ok:false, error}` – Standardplayer des Systems | 8 |
| `retag(id)` | | `{ok:true, path, moved, genre, cue, sidecar}` \| `{ok:false, error}` | 5 |
| `delete_library_item(id, delete_file=true)` | | `{ok:true, deleted:[Dateinamen]}` \| `{ok:false, error}` | 5 |
| `get_log(filters?)` | `{level?, levels?, search?, limit?, kind?, runs_limit?}` | `{lines:[LogLine], runs:[Run]}` | 5 |

- `get_library` Filter (alle optional, UND-verknüpft): `search` (Titel/Kanal/Genre, gross/klein- und
  umlautunabhängig), `genre` (Name), `channel` (Kanal-ID **oder** Kanalname), `year` (Zahl oder `"2026"`,
  aus `upload_date`), `missing` (`true` = nur Einträge mit fehlender Datei, `false` = nur vorhandene).
  Kein Filter / kein Objekt = alles. Die UI leitet die Auswahllisten (Genres, Kanäle, Jahre) aus der
  Gesamtliste ab.
- `LibraryItem` = `{id, title, artist, channel_id, genre, duration, upload_date, year, downloaded_at,
  file_path, size_mb, missing, unknown, has_cue, platform, genre_manual, thumbnail}` (`thumbnail`: Bild-URL aus der DB
  wie bei Suchtreffern, nur über `safeThumb` anzeigen). `missing: true`: die Datei existiert nicht mehr (`size_mb` 0).
  `unknown: true`: der Zielordner ist nicht erreichbar (Laufwerk/Freigabe weg oder hängt >3 s); für
  Dateien darunter wird nichts geprüft, `missing` bleibt `false`. `get_library` bleibt eine Liste, damit
  bestehende Aufrufer nicht brechen; die UI holt Pfad/Zustand mit `get_library_status()` und zeigt das
  Banner «Zielordner nicht erreichbar: <Pfad>». Auch `delete_library_item` verweigert dann
  (`{ok:false, error:"Zielordner nicht erreichbar: …", unreachable:true}`).
  `duration` aus der DB, sonst aus der Datei gelesen (`null` wenn unlesbar). `artist` = Kanalname
  (Anzeige); der ID3-Artist kann bei `storage.artist_from_title` abweichen.
- `open_folder`: Windows `explorer /select,"<Datei>"` (Datei markiert); existiert die Datei nicht, bzw.
  auf anderen Systemen, wird der Ordner geöffnet. Fehlt der Ordner: `{ok:false, error:"Ordner fehlt: …"}`.
- `get_media(id)` (Phase 8): nur Einträge mit Status `done`, deren Datei innerhalb des Zielordners liegt und existiert
  (Fehler: «Datei fehlt», «Datei liegt ausserhalb des Zielordners», «Eintrag ist nicht in der Bibliothek»).
  `src`/`cover` sind per `Path.as_uri()` prozentkodierte `file:`-URLs (nur für `<audio>`/`<img>`; .NET `System.Uri`
  würde rohes `?`/`#` als Query/Fragment lesen). `cover`: eingebettetes Bild als Datei in
  `<app_home>/cache/covers/<id>.<hash>.jpg` (gleicher Name wie der Sidecar ohne `.json`), einmal erzeugt und
  wiederverwendet (neu erzeugt, wenn die Audiodatei neuer ist); `null` ohne Bild. `chapters` in Sekunden (float),
  sortiert; Quelle der Reihenfolge nach Sidecar, ID3 CHAP, `.cue`; `performer` = Interpret des Kapitels (Titel
  «A - B» wird wie in der CUE-Datei geteilt), sonst der Kanal; `[]` ohne Kapitel. `duration` Sekunden (DB, sonst mutagen).
- `play_external(id)`: gleiche Prüfungen; Windows `os.startfile`, sonst `xdg-open`/`open`. Einstellung `player.mode`
  (`internal`/`external`) entscheidet nur die UI, die Bridge bietet beide Aufrufe immer an.
- `retag(id)` (Wartungs-Worker, kein Netzwerk): schreibt Tags, Cover (aus der vorhandenen Datei
  übernommen), CUE und ID3-CHAP aus dem Sidecar (`<app_home>/meta/<id>.json`) und den **aktuellen**
  Einstellungen neu (Titelbereinigung, `artist_from_title`, Genre-Keywords, `write_cue`,
  `write_id3_chapters`, `write_cover_jpg`). Genre: manuell > Quellen-Default > Keyword > bisher
  gespeichertes Genre. Liegt die Datei im Zielordner und ergibt `storage.path_template` einen anderen
  Pfad, wird sie verschoben (CUE geht mit, `file_path` in der DB wird angepasst, leere alte Ordner
  verschwinden); `archive.txt` enthält nur IDs und bleibt gleich. Existiert der neue Pfad schon:
  `{ok:false, error:"Zieldatei existiert bereits: …"}`, nichts wird verändert. Dateien ausserhalb des
  Zielordners werden an Ort und Stelle getaggt, nie verschoben (`moved:false`). Ohne Sidecar (ältere
  Downloads): Titel/Kanal/Datum aus der DB, Kapitel aus den ID3-CHAP-Frames der Datei (`sidecar:false`).
  Fehlt die Datei: `{ok:false, error:"Datei fehlt: …"}`. Ist der neue Pfad zu lang: `{ok:false, error:"Neuer Ablagepfad ist zu lang …"}`, nichts geändert. MP3: vorhandene ID3-Frames, die die App nicht selbst schreibt (BPM, Key, POPM, ReplayGain, USLT …), bleiben erhalten; ersetzt werden nur die eigenen Frames (Titel/Künstler/Album/Track/Genre/Datum, App-Kommentar, `YOUTUBE_ID`, `SOURCE`, CHAP/CTOC, APIC nur mit neuem Cover). Event `video {id, status:"done", genre}`.
- `delete_library_item(id, delete_file=true)`: löscht Datei + `.cue` (nur innerhalb des Zielordners!;
  liegt die Datei draussen, kommt `{ok:false, error:"Datei liegt ausserhalb des Zielordners (…) – nicht
  gelöscht", outside:true}` und nichts ändert sich; die UI bietet dann «Nur Eintrag entfernen» = `delete_file=false`), `cover.jpg` nur wenn der Ordner sonst leer ist, danach leere Ordner
  bis (ohne) Zielordner, entfernt den Sidecar und setzt den DB-Eintrag auf `ignored` (ohne `file_path`).
  `archive.txt` bleibt unverändert, das Video wird also nie wieder automatisch geladen. Mit
  `delete_file=false` bleibt die Datei liegen (nur der Eintrag verschwindet). Nicht löschbare Datei
  (z.B. im Player geöffnet): `{ok:false, error:"Datei konnte nicht gelöscht werden (in Benutzung?) …"}`,
  DB unverändert. Event `video {id, status:"ignored", genre:null}` + `status`. Die Bestätigung macht die UI.
  Wieder laden: `set_video_status(id,"new")` reicht wegen des Archivs nicht; die Zeile in `archive.txt`
  müsste entfernt werden (bewusst kein UI-Weg).
- `get_log(filters?)`: `lines` = Live-Backlog (500 Zeilen). Beim App-Start (`app/main.py`:
  `setup_logging(history=500)`) werden die letzten 500 Zeilen aus `logs/hcloader.log` vorgeladen, damit
  nach einem Neustart die Historie da ist (Zeitstempel der Datei = lokale Zeit; Erfolgsmeldungen heissen
  dort `info`, `ok` gibt es nur live; Traceback-Zeilen fehlen). Filter: `level` (Mindeststufe
  `debug` < `info`/`ok` < `warn` < `error`), `levels` (genaue Liste, hat Vorrang), `search` (Teilstring,
  ohne Gross/Klein), `limit` (die letzten N, max. 5000). `runs` = letzte `runs_limit` (Default 50, max.
  500) Läufe, neueste zuerst; `kind` filtert sie.

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
- `Run`: `{id, kind, started, finished, duration, found, downloaded, errors, note}`; `duration` in
  Sekunden (`null` solange der Lauf läuft). `Run.kind`: unbekannte Arten aus der DB werden als `manual`
  gemeldet.
- `LogLine.level`: `DEBUG→debug`, `INFO→info`, `WARNING→warn`, `ERROR/CRITICAL→error`;
  `ok` für Erfolgsmeldungen (`log.info(..., extra={"ui_level": "ok"})`, Helfer `worker.log_ok`).

## Events (Python → UI)

| Event | Daten | Sender | Phase |
|---|---|---|---|
| `status` | `Status` | nach `save/reset_settings`, `update_ytdlp`, `test_po_token`, `clear_backoff`, `create/remove_task`, `set_video_status`, `search`, jeder Queue-Änderung, Start/Stopp des PO-Token-Servers, sonst alle 30 s | 2/3 |
| `log` | `LogLine` | jede Logzeile (ausser Logger `pywebview*`, `app.worker.events`, `urllib3*`) | 2/3 |
| `toast` | `{msg, kind?}` (`ok`/`info`/`warn`/`err`) | Update verfügbar, „yt-dlp aktualisiert – bitte HCLoader neu starten“ (warn), „HCLoader wurde verschoben – …“ (warn, Phase 6), Platzhalter „Folgt in Phase N“ | 2/3 |
| `video` | `{id, status, genre}` | `set_video_status`, `set_genre`, `enqueue`, Start/Ende/Abbruch eines Downloads, Download vom Throttle abgelehnt oder lokal gesperrt (zurück auf `queued`) | 2/3 |
| `progress` | `{id, phase, pct, speed, eta}` (+ `sleep_total` bei `sleep`) | Download-Queue: `sleep` einmal zu Beginn der Pause, `download` höchstens ca. 2×/s (Phasenwechsel und 100 % immer), `convert`, `tag` | 3 |
| `done` | `{id, title}` | Download fertig getaggt und verschoben | 3 |
| `failed` | `{id, title, error}` | Download fehlgeschlagen (bei 429 zusätzlich Backoff → `status`) | 3 |
| `queue` | `{}` | Warteschlange geändert (auch Sperre/Freigabe) → UI ruft `get_queue()` | 3 |
| `source` | `{id, checking, name?, last_checked?, new_count?, error?}` | `checking:true` vor, `checking:false` nach der Prüfung einer Quelle; `new_count` = Eingang dieser Quelle, `error` = deutscher Text; `name` (7a) = aktueller Name (bei `name_auto` evtl. ersetzt). Übersprungene Quellen (Plattform im Backoff, SoundCloud aus) nur `{id, checking:false, error}` | 4/7a |
| `run` | `Run` (inkl. `duration`) | ein Lauf ist zu Ende (`DB.finish_run`: GUI-Watchlist-Prüfung, Download-Lauf der Warteschlange; Headless-Läufe sind ein anderer Prozess und senden nichts) | 5 |
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
Ist die GUI offen und antwortet ihr PO-Token-Server auf `/ping` am konfigurierten Port, wird dieser
mitbenutzt (nicht gestartet, nicht gestoppt); sonst ohne PO-Token-Server Exit 1 wie bisher. Läuft gerade
die In-App-Prüfung der GUI, endet der Lauf mit Exit 4 (Notiz im Log; die GUI-Prüfung übernimmt).
Erreicht der Lauf `max_downloads_per_run`, lautet die Notiz «… – Rest wird beim nächsten Lauf geladen».
Exit-Codes (`app/exitcodes.py`): 0 ok · 1 Fehler (Quelle/Download/PO-Token/unerwartet) · 2 Backoff (beim
Start aktiv oder im Lauf ausgelöst) · 3 falsche Argumente · 4 anderer Lauf aktiv (Lauf- oder Watchlist-Lock).

## SoundCloud (Phase 7a)

Plattform = Merkmal jedes Videos/Tracks und jeder Quelle: `platform: "youtube" | "soundcloud"`.

**IDs.** YouTube unverändert (11 Zeichen). SoundCloud: `sc:<numerische Track-ID>` überall, wo die UI
eine `id` schickt oder bekommt (Video, QueueItem, LibraryItem, Events). `channel_id` von SoundCloud:
`sc:<Nutzer-ID>` (Blacklist und `add_channel_source` funktionieren damit gleich). Im Dateinamen steht
`[sc-<id>]`.

**Methoden (neu/erweitert)**

- `search(query, {genre?, year?, platform?})`: `platform` Standard `"youtube"`. Antwort zusätzlich
  `platform`; `get_last_search()` ebenso. Fehler: `{ok:false, error}` bei SoundCloud aus
  («SoundCloud ist ausgeschaltet (Einstellungen › SoundCloud)»), unbekannter Plattform, SoundCloud-Backoff
  («Backoff (SoundCloud) aktiv bis … – Suche gesperrt»), Limit «Suchen pro Stunde» (pro Plattform).
- `suggest_source(url_or_query, type_hint?)` → `{type, platform, name, url_normalized}`; `type` `""` =
  nicht erkannt (Meldung erst beim Speichern), `name` `""` = kein guter Name aus der URL.
  | Eingabe | type | name |
  |---|---|---|
  | `youtube.com/@Handle` | channel | `Handle` |
  | `youtube.com/channel/UC…` | channel | `""` |
  | `youtube.com/c/Name`, `/user/Name` | channel | `Name` |
  | `youtube.com/playlist?list=…` (auch `watch?…&list=`) | playlist | `""` |
  | `soundcloud.com/dj-thera` (auch `/tracks`) | channel | `Dj Thera` (nur kleingeschrieben → Titel-Case) |
  | `soundcloud.com/dj-x/sets/hc-sessions` | playlist | `Dj X – Hc Sessions` |
  | anderer Text / `type_hint:"search"` | search | der Text |
- `save_source(source)`: zusätzlich `name_auto` (bool) und bei `type:"search"` `platform`. Bei URLs
  erkennt das Backend die Plattform. Neue Feldfehler: `url_or_query` «Nicht unterstützte URL – erwartet
  wird eine YouTube-URL … oder eine SoundCloud-URL …», «Nicht unterstützte SoundCloud-URL …», «Für ein
  Set den Typ «Playlist» wählen …», «SoundCloud-Playlist-URL erwartet …», «SoundCloud ist ausgeschaltet …»;
  `platform` «Plattform muss YouTube oder SoundCloud sein.». `newest_last` gilt auch für SoundCloud-Sets.
- `clear_backoff(platform?)`, `open_video(id)`, `add_channel_source(...)`: siehe Tabellen oben.
- `get_library(filters?)`: zusätzlicher Filter `platform`.

**Datenformen (neu)**

- `Video`: `platform`, `url` (Seite des Videos/Tracks oder `null`), `preview` (Go+-Vorschau, nie ladbar).
  Suchtreffer und `get_inbox()` zusätzlich `duplicate_of: {id, platform, title} | null` – vermutlich
  dieselbe Aufnahme schon von der anderen Plattform geladen oder eingereiht (Status done/queued/
  downloading; Dauer ±5 s, normalisierter Titel Token-Jaccard ≥ 0.8). Ausgeblendet wird nur mit
  `filters.hide_cross_platform_duplicates` (`filter_reason` «Vermutlich bereits geladen (YouTube)» bzw.
  «(SoundCloud)»). `filter_reason` neu: «Nur Vorschau (Go+)».
- `Source`: `platform`, `name_auto`.
- `LibraryItem`: `platform`.
- `get_queue()`: zusätzlich `platform_blocked: {<platform>: {code, reason}}` – Plattformen mit wartenden,
  aber gesperrten Einträgen, während die andere weiterlädt (Texte bei SoundCloud mit «SoundCloud: »
  davor). `blocked_code`/`blocked_reason` nur, wenn **alle** wartenden Einträge stehen.
- `Status.platforms`: `{youtube: P, soundcloud: P}`, `P = {enabled, backoff: {active, until, level,
  remaining_s, reason}, counters: {downloads_run, downloads_day, searches_hour}, limits: {downloads_run,
  downloads_day, searches_hour}}`. `Status.backoff`/`Status.counters` bleiben = YouTube.
- Thumbnails von SoundCloud kommen von `https://i1.sndcdn.com/…` (`*.sndcdn.com`; CSP/`safeThumb`).

**Watchlist.** Die Prüfung einer Plattform im Backoff überspringt deren übrige Quellen (Event `source`
mit `error`), Quellen der anderen Plattform laufen weiter; `check_sources` wird nur abgelehnt, wenn
**jede** Plattform mit aktiver Quelle im Backoff ist. Treffer mit `duplicate_of` landen auch bei
Auto-Download-Quellen im Eingang, nie direkt in der Warteschlange.
