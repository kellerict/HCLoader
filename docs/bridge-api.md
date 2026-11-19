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

- Aktionen liefern `{ok: true, …}` oder `{ok: false, error: "Meldung"}`.
- **Sprache (v0.2.0):** Alle Texte, die das Backend liefert (`error`, `errors`, `blocked_reason`,
  Toasts, `log`-Zeilen, `source.error`, Update-Texte …), sind fertig übersetzt in der aktiven Sprache
  (`general.language`, aufgelöst; Katalog `app/locales/<code>.json`, `app/core/i18n.py`). Die UI zeigt
  sie unverändert an. Wo diese Doku deutsche Beispieltexte nennt, ist das die de-Fassung; der
  Standard ist Englisch. Gespeicherte Texte (Lauf-Notizen, Fehler eines Videos) behalten die Sprache,
  in der sie entstanden. DEBUG-Logzeilen sind immer Englisch. Siehe `docs/TRANSLATING.md`.
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
| `get_settings()` | – | `{values, defaults, language}` – Struktur `docs/settings-schema.md`; `language` = aufgelöste Sprache (`general.language`, «auto» → Windows-Anzeigesprache, sonst `en`) | 2 / 0.2.0 |
| `save_settings(values)` | komplettes Values-Objekt | `{ok:true, values, language}` (normalisiert, `language` wie oben) \| `{ok:false, errors}` | 2 / 0.2.0 |
| `reset_settings(section?)` | Abschnitt oder nichts (= alles) | `{ok:true}` \| `{ok:false, error}` | 2 |

`save_settings` validiert mit pydantic (`config.parse_settings`), speichert `config.yaml`
(Kommentare bleiben), macht die Änderung sofort wirksam und sendet `status`:
Throttle/yt-dlp lesen die Settings live, `general.log_level` setzt das Logging neu,
`network.*` startet/stoppt den HTTP-PO-Token-Server (Watchdog), `appearance.*` wendet die UI selbst
an. Ändert sich `schedule.task_scheduler_enabled` oder (bei aktiver Aufgabe) `schedule.task_time`,
wird die Windows-Aufgabe angelegt/geändert/entfernt; scheitert das (z.B. nicht Windows), wird nichts
gespeichert und der Fehler kommt am Feld zurück. `reset_settings` lässt die beiden
Aufgaben-Felder unverändert (sie spiegeln den Zustand der Windows-Aufgabe).

`general.language` (v0.2.0) wirkt beim Speichern sofort im Backend (neue Meldungen, Validierungs-
fehler, Logzeilen in der neuen Sprache). Die UI baut sich danach selbst neu auf (Seite neu laden,
kein App-Neustart; Warteschlange und Läufe leben im Backend weiter, ein laufender Mini-Player stoppt).
Die Fehler des Speicherns, das die Sprache ändert, kommen noch in der bisherigen Sprache.

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

### App-Update (Selbst-Update von HCLoader)

Prüft GitHub-Releases (`maintenance.update_repo`, Default `kellerict/HCLoader`), lädt das Quell-ZIP
im Hintergrund und spielt es nach dem Beenden über `scripts/apply_update.ps1` ein. Kern:
`app/core/selfupdate.py`; Ablauf und Begründungen: `docs/decisions.md` «Selbst-Update».
Eigener Worker-Thread `hcloader-selfupdate` (blockiert weder Wartung noch Downloads). Kein YouTube,
kein Throttle.

| Methode | Parameter | Rückgabe |
|---|---|---|
| `get_update_status()` | – | `UpdateStatus` |
| `check_update()` | – | `{ok:true, ...UpdateStatus}` \| `{ok:false, error, ...UpdateStatus}` (wartet max. 30 s) |
| `download_update()` | – | `{ok:true, ...UpdateStatus}` (Start im Hintergrund) \| `{ok:false, error, ...UpdateStatus}` |
| `cancel_update()` | – | `{ok:true, ...UpdateStatus}` |
| `apply_update_now()` | – | `{ok:true}` \| `{ok:false, error}` |
| `get_release_notes()` | – | `{current, releases:[{version, date, notes}]}` – alle `## [x.y.z]`-Abschnitte der mit der App ausgelieferten `CHANGELOG.md` (offline, kein Netzwerk), neueste zuerst, ohne `[Unreleased]`; `date` = `YYYY-MM-DD` \| null; fehlt die Datei: `releases: []`. Anzeige: Wartung › «Versionshinweise» |
| `open_url(url)` | `https://…`-Link | `{ok:true}` \| `{ok:false, error}` – öffnet den Link im System-Browser (`webbrowser.open`, unter Windows `os.startfile`); nur `https://` ohne Benutzer/Port auf `github.com` bzw. dem Host des Update-Repos, sonst `error` «Link not allowed: …» |

- **Automatik:** einmal pro GUI-Start (nach `loaded`), nur wenn `maintenance.check_app_updates_on_start`
  an ist. Fehler/offline: nur Log (Info), kein Toast, `error` bleibt leer. Gefunden wird das neueste
  stabile Release (`releases/latest`; Fallback `tags`, höchste SemVer-Version, Pre-Releases `-rc…` nie).
- **Versionsliste:** Ist ein Update verfügbar, holt dieselbe Prüfung mit **einer** weiteren Anfrage
  `GET /repos/<repo>/releases?per_page=20` die Notizen der übersprungenen Versionen (`releases`).
  Entwürfe und Pre-Releases fehlen immer (der Updater bietet keine an). Schlägt die Anfrage fehl
  oder fehlt das angebotene Release darin, enthält `releases` nur das angebotene. Ohne Releases
  (Tags-Fallback) kommen die Einträge aus den Abschnitten der `CHANGELOG.md` des Tags.
- **Links** in den Notizen (`<a target="_blank">`): in der App fängt `bridge.js` den Klick ab und ruft
  `open_url(url)` (WebView2 würde sonst nichts bzw. ein App-Fenster öffnen); im Browser-Mock bleibt
  das normale `target=_blank`. Gilt für jeden `target="_blank"`-Link der UI.
- **Herunterladen** startet nie automatisch, nur über `download_update()` (Klick im Banner / Wartung).
  Refusals (deutsch): Git-Checkout («Git-Checkout – bitte «git pull» …»), nicht Windows, «Kein neueres
  Update bekannt – bitte zuerst prüfen», «… wird bereits heruntergeladen», «… ist schon bereit».
- **Ablauf:** `downloading` (Events `update_progress` mit `phase: download → verify → prepare`) →
  `ready` (Staging unter `<app_home>/update/staging/`, `manifest.json`) bzw. `error`. Ein `ready` aus
  einer früheren Sitzung ist nach dem Start wieder `ready`.
- `cancel_update()`: bricht einen Download ab (Teil-Datei weg, Zustand `idle`) bzw. verwirft ein
  bereitgelegtes Update (wird dann auch beim Beenden nicht eingespielt).
- `apply_update_now()`: nur bei `ready`. Antwortet sofort, schliesst nach 0.3 s das Fenster; danach
  läuft das normale Beenden (`shutdown`: Queue gestoppt, laufender Download abgebrochen und wieder
  `queued`, DB zu), dann startet `main.py` über `Api.finish_update()` den Updater **mit Neustart**.
- **Beim Beenden:** Ist ein Update `ready` und `maintenance.apply_update_on_exit` an, startet
  `finish_update()` den Updater **ohne Neustart**. Sonst bleibt es bereit und wird beim nächsten
  Start wieder angeboten.
- **Nach dem Update** (nächster Start): `<app_home>/update/result.json` → Toast «HCLoader aktualisiert
  auf v…» (ok) bzw. «App-Update fehlgeschlagen: … – die bisherige Version wurde wiederhergestellt» (err).
  Protokoll des Updaters: `<app_home>/logs/update.log`.
- Während der Updater arbeitet, liegt `<app_home>/update/update.lock`; ein Start (GUI oder
  `--headless --run-watchlist`) zeigt «HCLoader wird gerade aktualisiert …» und endet mit Code 4
  (`EXIT_BUSY`). Ein Lock älter als 30 min gilt als verwaist und wird entfernt.

### Entdecken / Eingang

| Methode | Parameter | Rückgabe | Phase |
|---|---|---|---|
| `get_last_search()` | – | `{query, effective_query, genre, year, results:[SearchVideo], hidden_count}` \| `null` – aus der DB, ohne Netzwerk | 3 |
| `search(query, opts)` | Suchtext, `{genre: str\|null, year: int\|null}` | `{ok:true, results:[SearchVideo], effective_query, query, genre, year, hidden_count}` \| `{ok:false, error}` | 3 |
| `get_inbox()` | – | `[Video]` (Status `inbox`, aus DB; gefüllt durch die Watchlist) | 4 |
| `enqueue(ids)` | `[id]` | `{ok:true, ids:[übernommen], skipped?: n, skipped_unloadable?: n}` – Go+-Vorschauen (`preview`) und regionsgesperrte Tracks (`geo_blocked`) werden nie eingereiht (`skipped_unloadable`) | 3/7a |
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
| `estimate_backfill(id)` | Quellen-`id` | `{ok:true, source_id, known_total, entries, cap, requests, seconds, per_hour, page_size, conservative, position, resume, reread, headless_ok}` \| `{ok:false, error}` – ohne Netzwerk | 0.4.0 |
| `start_backfill(id)` | Quellen-`id` | `{ok:true, backfill:Backfill}` \| `{ok:false, error}` + Events `backfill` | 0.4.0 |
| `pause_backfill(id)` | Quellen-`id` | `{ok:true, backfill}` \| `{ok:false, error}` | 0.4.0 |
| `cancel_backfill(id)` | Quellen-`id` | `{ok:true, backfill}` \| `{ok:false, error}` | 0.4.0 |

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

### Alles einlesen (einmalig) (v0.4.0)

Liest die komplette Liste einer Quelle (Kanal, Playlist, SoundCloud-Nutzer/-Set; **nicht** Suchquellen)
einmal seitenweise ein (`app/core/backfill.py`, `YtClient.list_source_paged`, Entscheid in
docs/decisions.md «Alles einlesen»). Treffer gehen immer in den Eingang, nie in die Queue.

- `Source` hat zusätzlich `item_count` (Grösse der Liste laut letzter Prüfung, `null` = unbekannt) und
  `backfill` (`Backfill` | `null`).
- **`Backfill`** `{source_id, state, position, total, target, cap, added, found, requests, note, started,
  updated, finished}`. `state`: `pending` (wartet bzw. unterbrochen – setzt automatisch fort), `running`,
  `paused` (vom User oder nach 3 Fehlern in Folge – wartet auf `start_backfill`), `done`, `cancelled`.
  `position` = gelesene Einträge (Cursor), `total` = bekannte Grösse (`null` = unbekannt), `target` =
  `min(total, cap)` oder `null`, `cap` = `watchlist.backfill_max_entries`, `added` = davon in den Eingang,
  `found` = neu gespeicherte Videos, `requests` = Seitenanfragen bisher, `note` = Grund der letzten
  Unterbrechung (übersetzt, z.B. «Backoff (YouTube) bis 14:30 – geht automatisch weiter»).
- `estimate_backfill`: `known_total` aus `backfills.total` oder `sources.item_count`; `entries` =
  `min(known_total, cap)`, ohne bekannte Grösse `cap` und `conservative:true`. `requests` = Anlaufanfragen
  (YouTube 1, SoundCloud 3) + `ceil(entries / page_size)` (YouTube-Kanal 30, Playlist 100, SoundCloud
  200 bzw. Set 50) – beim Fortsetzen inklusive der erneut abgefragten Seiten. `seconds` = `requests ×
  max(3600 / per_hour, sleep_requests)`. `resume`/`position`: es gibt einen Cursor; `reread` = davon
  erneut abgefragte Seiten (die Plattformen kennen nur «nächste Seite»). `page_size` ist der aus
  früheren Läufen gelernte Wert, sonst der Standard. `headless_ok` = `requests <= per_hour`: ein
  geplanter Lauf kann den Backfill zu Ende lesen; sonst setzt er nur in der App fort (Review v0.4.0
  M2, `docs/decisions.md`).
- `start_backfill`: abgelehnt (`{ok:false, error}`) bei Suchquelle, SoundCloud aus, Backoff der Plattform,
  laufendem yt-dlp-Update, «Neustart nötig». Pausiert/unterbrochen → setzt am Cursor fort; fertig/
  abgebrochen/neu → von vorne. Läuft im Thread `hcloader-backfill` (eins nach dem anderen, prozess-
  übergreifender Lock `backfill`); hält ein Headless-Lauf den Lock, kommt ein `toast` (warn) und der
  Backfill bleibt `pending`. Eine Zeile `running`, die nicht dieser Prozess liest, wird nur
  übernommen, wenn der Lock frei ist (sonst `{ok:false, error}`).
- `pause_backfill`: `pending`/`running` → `paused`; der laufende hält vor der nächsten Anfrage an
  (gelesene Seiten sind gespeichert; eine noch nicht gespeicherte Seite wird verworfen und beim
  Fortsetzen neu gelesen). Wirkt auch auf einen Headless-Lauf in einem anderen Prozess: er bemerkt
  die geänderte Zeile vor der nächsten Seite und hört auf. `delete_source` stoppt den Backfill der
  Quelle ebenso. `cancel_backfill`: → `cancelled`, Cursor 0; Treffer bleiben.
  Ohne Backfill-Zeile `{ok:false, error}`.
- **Automatisches Fortsetzen** (`pending`, aktive Quellen): 90 s nach dem App-Start, nach jeder
  Watchlist-Prüfung ohne Backoff und im Headless-Lauf nach den Downloads (dort höchstens
  `watchlist.backfill_requests_per_hour` Anfragen pro Lauf, Notiz im `runs`-Eintrag). Der Headless-Lauf
  gibt vorher Run- und Watchlist-Lock frei (GUI-Queue, In-App-Prüfung und yt-dlp-Update bleiben
  möglich; ein Update beendet den Headless-Backfill vor seiner nächsten Anfrage) und übernimmt nur
  Backfills, die er im Budget fertig lesen kann; die anderen bekommen ohne Anfrage die `note` «Zu
  gross für einen geplanten Lauf …» und laufen in der App weiter. Quellen einer
  Plattform im Backoff werden ohne Anfrage übersprungen (`note` = Backoff-Ende).
- Beim Beenden der App hält der laufende Backfill vor der nächsten Anfrage an und bleibt `pending`.

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
| `get_library(filters?)` | `{search?, genre?, channel?, year?, missing?, platform?}` + v0.3.0 `{series_id?, edition_id?, event_year?, stage?, set_type?, festival?}` | `[LibraryItem]` (Status `done`, neueste Downloads zuerst, aus DB) | 5 |
| `get_library_status()` | | `{target_ok, target}` – Zielordner-Prüfung (Thread mit 3-s-Timeout) des letzten `get_library` | 5 |
| `open_folder(id)` | | `{ok}` \| `{ok:false, error}` – Windows: Explorer mit markierter Datei, sonst Ordner | 5 |
| `get_media(id)` | | `{ok:true, id, src, title, artist, genre, platform, duration, cover, chapters:[{start, title, performer}], loudness, resume, peaks}` \| `{ok:false, error}` – Phase 8, lokal, kein Netz; `loudness`/`resume`/`peaks` ab v0.7.0 (siehe «Loudness, waveform, player memory», je `null` wenn unbekannt) | 8 |
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
  file_path, size_mb, missing, unknown, has_cue, platform, genre_manual, thumbnail, festival,
  festival_suggestion}` (v0.3.0: `festival`/`festival_suggestion` = `Festival|null`, siehe «Festivals & Serien») (`thumbnail`: Bild-URL aus der DB
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

### Festivals & Serien (v0.3.0)

Konzept: `docs/concepts/festivals.md`, Entscheide: `docs/decisions.md` «Festivals & Serien (v0.3.0)».
Alles **offline** (keine Anfrage an YouTube/SoundCloud). Backend: `app/core/festivals.py` (Erkennung,
reine Funktionen), `app/core/series.py` (Katalog in der DB, Zuordnen, Gruppieren, Tags/Pfade).
Gespeicherte Werte sind sprachneutral: Serien-/Bühnennamen sind Eigennamen, `set_type` ist ein **Code**,
den die UI übersetzt (UI-Schlüssel z.B. `fest.set_type.<code>`, Sache der UI-Kataloge).

| Methode | Parameter | Rückgabe |
|---|---|---|
| `get_series(include_hidden=false)` | `true` = auch ausgeblendete mitgelieferte Serien (Feld `hidden`) | `[Series]` sortiert nach Name |
| `save_series(series)` | `Series` ohne `id` = neu; nur `name, kind, aliases, weak_aliases, channels, variants, default_genre, enabled` werden gelesen | `{ok:true, series:Series}` \| `{ok:false, errors:{feld:"Meldung"}}` |
| `set_series_enabled(id, enabled)` | nur an/aus für die Erkennung (seit 0.3.0-Review); eine mitgelieferte Serie bleibt `user_modified:false` und erhält weiter Updates aus `series.yaml` | `{ok:true, series:Series}` \| `{ok:false, error}` |
| `delete_series(id)` | | `{ok:true, hidden, cleared}` \| `{ok:false, error}` |
| `reset_series(id?)` | ohne `id` = alle mitgelieferten | `{ok:true, series:[Series]}` \| `{ok:false, error}` |
| `get_festival_options()` | | `{kinds:["festival","radio","podcast"], set_types:[{code, label}], stages:[Name]}` |
| `get_library_groups(by="festival")` | `festival` \| `year` \| `event_year` \| `artist` \| `genre` \| `stage` \| `set_type` | `festival`: `{ok, by, series:[SeriesGroup], unassigned, suggested, total}`; sonst `{ok, by, groups:[{key, count}]}`; unbekannt → `{ok:false, error}` |
| `set_festival(id, data)` | `data`: `null` = «kein Festival»; sonst `{edition_id}` **oder** `{series_id, event_year?, variant?}`, dazu optional `stage`, `set_type`, `episode` | `{ok:true, festival, festival_suggestion}` \| `{ok:false, errors:{feld:"Meldung"}, error}` |
| `reset_festival(id)` | | `{ok:true, outcome, festival, festival_suggestion}` \| `{ok:false, error}` |
| `detect_festival(title, opts?)` | `opts`: `{channel_name?, upload_date?, description?}` | `{ok:true, detection: Detection\|null, assigned}` (nichts gespeichert) |
| `get_festival_status()` | | `{series, assigned, suggested, unassigned, total, last_pass, running}` |
| `assign_festivals(opts?)` | `opts`: `{scope: "library" (Standard) \| "all"}` | `{ok:true, started:true, scope}` \| `{ok:true, started:false, running:true}` (läuft schon) \| `{ok:false, error}` (andere Wartung läuft) |
| `cancel_assign_festivals()` | | `{ok:true, running}` – der Durchlauf endet nach dem aktuellen Eintrag |

**Datenformen**

- `Series` = `{id, key, name, kind, aliases:[str], weak_aliases:[str], channels:[str],
  variants:[{name, aliases:[str]}], default_genre:str|null, builtin, user_modified, enabled, count}`
  (+ `hidden` nur bei `get_series(true)`). `key`: stabil; mitgeliefert z.B. `defqon1`, eigene `u-<slug>`.
  `count` = Bibliothekseinträge (Status `done`) mit zugeordneter Ausgabe dieser Serie.
  `aliases` = starke Schreibweisen (ein Treffer im Titel reicht), `weak_aliases` = Allerweltswörter
  (Rebirth, Supremacy, Hard Bass …: zählen weniger, ausser direkt gefolgt von einer Jahreszahl). Der Name
  ist immer ein starker Alias, ausser er steht selbst in `weak_aliases`. Vergleich ohne Gross/Klein,
  Akzente und Satzzeichen («Defqon.1» = «Defqon 1» = «DEFQON1»). `channels`: Kanal-ID (`UC…`), Kanal-URL
  oder exakter Kanalname des Veranstalters – nur Bonus, nie allein ausreichend.
  `variants`: Ausgaben-Varianten wie «Australia», «Chile», «at Home».
- `Festival` (an `LibraryItem.festival`, Antworten von `set_festival`/`reset_festival`, Event `video`) =
  `{edition_id, series_id, series_key, series, kind, event_year:int|null, variant:str, edition, festival,
  stage:str|null, set_type:code|null, episode:int|null, manual:bool, confidence:0–1|null}`.
  `edition` = Anzeigename der Ausgabe («Defqon.1 Australia 2019», = Album-Tag), `festival` = Serie +
  Variante («Defqon.1 Australia», = `TXXX:FESTIVAL` und `{festival}`). `confidence` null bei manuellen Werten.
- `festival_suggestion` = gleiche Form ohne `manual`; nur wenn **nichts** zugeordnet ist und die
  Erkennung unter der Schwelle `festivals.min_confidence` lag. Die UI zeigt sie als Vorschlag (z.B.
  gestricheltes Badge); «Übernehmen» = `set_festival(id, {edition_id: s.edition_id, stage: s.stage,
  set_type: s.set_type, episode: s.episode})`.
- `Detection` = `{series_key, series_id, series, kind, year, year_source:"title"|"upload"|null, variant,
  edition, stage, set_type, episode, confidence, alias, reasons:[str]}` (`reasons` = Debug-Codes wie
  `alias`, `year:title`, `stage`, `negative`; nicht übersetzt, nicht anzeigen).
- `SeriesGroup` = `{id, key, name, kind, count, editions:[{id, event_year, variant, edition, festival,
  count, stages:[{stage|null, count}], set_types:[{set_type|null, count}]}]}`. Serien nach `count` absteigend,
  dann Name; Ausgaben neueste zuerst; `stage: null` = ohne Bühne (zuletzt). Gezählt werden nur
  Bibliothekseinträge mit zugeordneter Ausgabe; `unassigned` = ohne Ausgabe (inkl. Vorschläge),
  `suggested` = davon mit Vorschlag, `total` = alle Bibliothekseinträge.
- `groups` (`get_library_groups` ausser `festival`): `[{key, count}]`, `key ""` = unbekannt/keins (immer
  zuletzt). `year` = Upload-Jahr, `event_year` = Jahr der zugeordneten Ausgabe, `artist` = Kanalname,
  `genre`, `stage`/`set_type` (nur zugeordnete Einträge, sonst `""`). Jahre neueste zuerst, sonst nach
  Anzahl absteigend.
- Set-Art-Codes: `live_set`, `closing_ceremony`, `opening`, `endshow`, `full_show` (z.B. «Live
  Registration»), `warm_up`, `anthem`, `episode` (Radio/Podcast mit Folgennummer). `label` aus
  `get_festival_options` ist der sprachneutrale Text für `TXXX:SET_TYPE` (Englisch), nicht für die UI.

**Verhalten**

- **Erkennung** läuft automatisch (wenn `festivals.detect`) auf neuen bzw. aufgefrischten Treffern der
  Suche und der Watchlist (gespeicherte flache Daten: Titel, Kanal, Upload-Datum, Beschreibung falls
  geliefert) und noch einmal nach jedem Download mit Titel + voller Beschreibung. Ab Sicherheit
  `festivals.min_confidence` (Standard 0.65) wird zugeordnet, darunter nur vorgeschlagen. Manuelle Werte
  (`festival.manual`) ändert die Erkennung **nie**. Hat die Serie ein `default_genre` und ist das Genre
  eines noch nicht eingereihten Videos «Unsortiert» (nicht manuell), wird es übernommen.
- Jahr: eigene Jahreszahl im Titel (auch `'19`, `2k19`; bei mehreren die nach dem Namen), sonst das
  Upload-Jahr (`festivals.year_from_upload_date`, zählt weniger). Unbekannt → `event_year: null`.
- `Video` (Suche, Eingang, Warteschlange) trägt nur die Rohwerte `edition_id, suggested_edition_id, stage,
  set_type, episode, festival_manual, festival_confidence`; Namen über `get_series`/`get_library_groups`
  bzw. (Bibliothek) `LibraryItem.festival`.
- `get_library(filters)` kennt zusätzlich `series_id`, `edition_id`, `event_year`, `stage`, `set_type`
  (zugeordnete Werte) und `festival: "assigned" | "none" | "suggested"`. Die UI darf weiter ohne Filter
  laden und selbst gruppieren (`LibraryItem.festival` reicht dafür).
- `set_festival`: setzt `manual` und ersetzt alle Festivalwerte des Videos (nicht genannte Felder werden
  leer). Mit `series_id` + `event_year` + `variant` wird die Ausgabe bei Bedarf angelegt. Fehler pro Feld:
  `series_id` (unbekannt), `edition_id` (unbekannt), `event_year` (ungültig), `set_type` (unbekannter
  Code), `episode` (keine positive Zahl), `id` (Video unbekannt). Danach Event `video`. **Tags und
  Ablage** der Datei ändern sich erst mit `retag(id)` (wie beim Genre); die UI ruft es bei geladenen,
  vorhandenen Dateien direkt danach auf.
- `reset_festival`: manuell aus, Erkennung läuft sofort neu (`outcome`: `assigned` | `suggested` |
  `none` | `unchanged`). Event `video`.
- `save_series`: Fehler pro Feld `name` (leer / > 80 Zeichen / gehört schon zu einer anderen Serie),
  `kind`, `aliases`/`weak_aliases`/`channels` (Liste, max. 40), `default_genre` (unbekanntes Genre),
  `id` (unbekannt). Ein Alias darf nicht schon zu einer anderen sichtbaren Serie gehören (Meldung nennt
  sie). Eine mitgelieferte Serie bearbeiten setzt `user_modified` – App-Updates der Liste lassen sie dann
  in Ruhe; `reset_series(id)` stellt den Lieferzustand wieder her. `enabled:false` = bleibt in der Liste,
  wird aber nicht mehr erkannt (Zuordnungen bleiben).
- `delete_series`: eigene Serie wird mit ihren Ausgaben gelöscht; mitgelieferte wird ausgeblendet
  (`hidden:true`, kommt mit Updates nicht zurück, `reset_series` holt sie). In beiden Fällen werden alle
  Zuordnungen/Vorschläge zu ihr entfernt (`cleared` = Anzahl Videos), auch manuelle (die werden wieder
  automatisch).
- `assign_festivals`: einmaliger Durchlauf «Festivals zuordnen» im Wartungs-Thread über alle
  Bibliothekseinträge (`scope:"all"`: alle bekannten Videos), auch wenn `festivals.detect` aus ist;
  Beschreibung aus dem Sidecar (bei `festivals.match_description`). Manuelle Einträge werden übersprungen.
  Dateien werden **nicht** neu getaggt oder verschoben (dafür `retag`). Fortschritt über das Event
  `festival_assign`; am Ende Logzeile (ok) und `last_pass` in `get_festival_status`. Läuft schon eine
  andere Wartung (Update, Backup, Neu-Taggen …) → `{ok:false, error:"Wartung läuft gerade (…) …"}`.
- **Tags** (beim Download und bei `retag`): `TXXX:FESTIVAL` (= `festival`), `TXXX:EVENT_YEAR`,
  `TXXX:STAGE`, `TXXX:SET_TYPE` (Label, Englisch), `TXXX:EPISODE`; leere Werte werden nicht geschrieben
  und beim Neu-Taggen entfernt (fremde Frames bleiben). Album = `edition`, wenn
  `storage.album_from_edition` (Standard an) und eine Ausgabe zugeordnet ist, sonst wie bisher der Titel.
  M4A: Freeform-Atome gleichen Namens, Opus: Vorbis-Kommentare `festival`, `event_year` ….
- **Ablage**: Platzhalter `{festival}`, `{event_year}`, `{stage}` im `storage.path_template`. Leer →
  Reste wie « - », «()» werden entfernt, eine Ordnerebene, die nur daraus bestand, entfällt. Das
  Standardmuster bleibt unverändert; bestehende Dateien bewegen sich nur mit `retag`.

### Tracklist search (v0.6.0)

Entscheide: `docs/decisions.md` «Tracklist search (v0.6.0)». Alles **offline**: Tracklisten kommen aus
dem, was schon gespeichert ist oder auf der Platte liegt – nie aus dem Netz. Backend: `app/core/tracklist.py`
(Parser, Normalisierung, Speichern, Suche), Tabellen `tracklists` + `tracks` (+ FTS5-Index `tracks_fts`,
Migration 10; Index `idx_tracks_key_video` für «Meistgespielt», Migration 11). Nur Bibliothekseinträge (Status `done`) werden gefunden.

Quellen, in dieser Reihenfolge geprüft; die reichste gewinnt (Anzahl Tracks + Tracks mit Artist +
Zeitstempel-Bonus, bei Gleichstand die frühere):

1. `chapters` – Kapitel im Metadaten-Sidecar (yt-dlp-Kapitel oder beim Download aus der Beschreibung gelesen),
2. `description` – Beschreibung im Sidecar: Zeilen mit Zeitstempel (`00:00`, `[12:34]`, `(1:02:03)`, auch
   am Zeilenende), nummerierte Zeilen (`1.`, `01)`, `#3`, `4 -`, `Track 01 –`, `Track 1:`) oder ein Block
   unter «Tracklist:»,
3. `id3` – ID3-CHAP-Frames der MP3 (nur ohne Sidecar-Kapitel/-Beschreibung),
4. `cue` – `.cue` neben der Audiodatei (Track-PERFORMER = Set-PERFORMER zählt nicht als Track-Artist).

Normalisierung: `ft.`/`feat`/`featuring` → `feat.` (auch aus dem Titel oder aus Klammern in den Artist),
`X`/`×` → `x`, `VS`/`versus` → `vs.`, `&` mit Leerzeichen; Remix/Edit/VIP/Bootleg … in Klammern,
eckigen Klammern oder als letztes ` - `-Segment → `version`; ein abschliessendes `[Label]` → `label`;
typografische Anführungszeichen/Striche → ASCII. «ID», «???», «Unknown», «TBA» → `is_id` (Titel
«ID»; ganz unbekannt = Artist und Titel «ID»). Gross/Klein bleibt für die Anzeige, verglichen wird
gefaltet (klein, ohne Akzente/Satzzeichen). Zeitstempel-Zeilen müssen streng steigen und innerhalb der
Dauer liegen; Zeitspannen (`12:00 - 13:00 Artist`, Timetables) und Zeilen mit Links/Promo werden
ignoriert; mindestens zwei Tracks, höchstens 300 pro Set.

| Methode | Parameter | Rückgabe |
|---|---|---|
| `search_tracks(query, opts?)` | `query`: Wörter aus Artist/Titel/Version, Reihenfolge egal, Präfix pro Wort, ohne Gross/Klein und Akzente (max. 200 Zeichen) | `{ok:true, query, engine:"fts5"\|"like", sets:[TrackSet], hits, truncated}` \| `{ok:false, error}` |
| `get_tracklist(id)` | Video-ID; noch nie untersucht → wird sofort (offline) gelesen und gespeichert (Zielordner nicht erreichbar → ohne Audio/CUE-Datei) | `{ok:true, video_id, source, extracted, tracks:[Track]}` \| `{ok:false, error}` (unbekannte ID; Datei unlesbar/beschädigt → übersetzte Meldung `tracklist.read_failed`, keine Exception) |
| `get_top_tracks(limit=20)` | 1–100 | `{ok:true, tracks:[{key, artist, title, version, sets}]}` – Tracks in den meisten Sets (mind. 2), häufigste Schreibweise unter den Sets, die noch in der Bibliothek sind |
| `get_tracklist_status()` | | `{total, scanned, sets, tracks, last_pass, engine, running}` |
| `build_tracklists(opts?)` | `opts`: `{scope: "new" (Standard: nie untersucht, seither neu geladen oder Sidecar geändert; Alias `"missing"`) \| "all" (alles neu)}` | `{ok:true, started:true, scope}` \| `{ok:true, started:false, running:true}` \| `{ok:false, error}` (andere Wartung läuft) |
| `cancel_build_tracklists()` | | `{ok:true, running}` – der Durchlauf endet nach dem aktuellen Eintrag |

**Datenformen**

- `Track` = `{position, start, artist, title, version, label, is_id}`; `start` = Sekunden (Zahl) oder
  `null` (nummerierte Liste ohne Zeitstempel), `artist` `""` = nur Titel bekannt (z.B. «Intro»).
- `TrackSet` = `{id, title, artist, duration, thumbnail, genre, platform, upload_date, downloaded_at,
  hits:[Track], more}` – `artist` = Kanal; höchstens 12 Treffer pro Set (`more` = weitere), höchstens
  100 Sets, neueste Downloads zuerst; `truncated` = es gäbe mehr.
- `source` (`get_tracklist`) = `chapters` \| `description` \| `id3` \| `cue` \| `none`.
- `engine` = `fts5` (SQLite-Volltextindex) oder `like` (Fallback, wenn diese SQLite kein FTS5 kennt;
  geprüft beim Öffnen der DB). Beide liefern **dieselben Treffer**: jedes gefaltete Suchwort muss der
  Anfang eines Worts im Track sein (`drag` findet «Dragonborn», `ragon` nicht).
- «ID – ID» (Artist und Titel unbekannt) ist nie ein Suchtreffer und zählt nie für «Meistgespielt»;
  «Artist – ID» wird über den Artist gefunden.

**Ablauf:** nach jedem Download liest `YtClient` die Trackliste aus Sidecar und Datei (nie fatal). Für
die bestehende Bibliothek öffnet die UI beim **ersten** Öffnen der Ansicht «Tracks» einmal
`build_tracklists({scope:"new"})`; danach Knopf «Neue einlesen» = `scope:"new"` (nur neue/geänderte Sets)
und «Alle neu einlesen» = `scope:"all"`. Jeder Durchlauf entfernt zuerst Tracklisten von Einträgen, die
nicht mehr in der Bibliothek sind (Löschen räumt sie ohnehin sofort weg). Der Durchlauf läuft im
Wartungs-Thread (Schlüssel `tracklists`, wie «Festivals zuordnen»); ist der Zielordner nicht erreichbar,
werden Dateien darunter (ID3/CUE) übersprungen statt zu hängen.

Beispiel `search_tracks("dragonborn")`:

```json
{"ok": true, "query": "dragonborn", "engine": "fts5", "hits": 2, "truncated": false,
 "sets": [{"id": "abcdefghijk", "title": "Qlimax 2023 | Headhunterz", "artist": "Q-dance",
   "duration": 3600, "thumbnail": null, "genre": "Hardstyle", "platform": "youtube",
   "upload_date": "20231125", "downloaded_at": "2026-11-12T10:00:00+00:00", "more": 0,
   "hits": [{"position": 4, "start": 754.0, "artist": "Headhunterz", "title": "Dragonborn",
     "version": "Extended Mix", "label": "", "is_id": false}]}]}
```

### Loudness, waveform, player memory (v0.7.0)

Entscheide: `docs/decisions.md` «Loudness, waveform, player memory (v0.7.0)». Alles **lokal**: ffmpeg
dekodiert die Datei (nie neu kodieren), kein Netz, kein Throttle. Backend: `app/core/analysis.py`
(Messung, Peaks, Durchlauf), `app/core/playback.py` (Positionen), `tagging.write_replaygain/read_replaygain`,
Worker `AnalysisQueue` (`app/worker.py`, ein eigener Thread, eine Datei nach der anderen, ffmpeg mit
`-threads 1` und niedriger Prozesspriorität). Tabellen `audio_analysis` und `playback` (Migration 12).

| Methode | Parameter | Rückgabe |
|---|---|---|
| `get_waveform(id)` | Video-ID (Bibliothekseintrag) | `{ok:true, status:"ready", peaks:[0..255], duration}` \| `{ok:true, status:"pending"}` (Berechnung eingereiht, **vor** Downloads und Durchlauf; Event `waveform` folgt) \| `{ok:false, status:"unavailable", error}` (ffmpeg fehlt) \| `{ok:false, error}` (nicht in der Bibliothek, Datei fehlt) |
| `save_position(id, position, duration?)` | Sekunden (Zahl); `duration` optional (sonst aus der DB) | `{ok:true, stored}` – `stored:false` = in den ersten/letzten 30 s (Eintrag entfernt = «fertig gehört») oder `player.resume == "off"`; `{ok:false, stored:false}` = unbekannte ID / keine Zahl. Schneller DB-Schreibvorgang |
| `forget_position(id)` | | `{ok:true}` – aus «Weiterhören» entfernen |
| `set_now_playing(id)` | Video-ID des im Player geladenen Sets (auch pausiert) \| `null` = nichts geladen | `{ok:true}` – die UI meldet jeden Wechsel (Laden, Schliessen). In die Datei dieses Sets werden **keine** Tags geschrieben; die Messung wird gespeichert (`tagged = 0`), die ReplayGain-Tags folgen, sobald die UI ein anderes Set oder `null` meldet (Review v0.7.0 M1) |
| `get_continue_listening(limit=5)` | 1–20 | `{ok:true, items:[{id, position, duration, updated, title, artist, genre, platform}]}` – zuletzt geänderte, unfertige Sets, die noch in der Bibliothek sind; leer bei `player.resume == "off"` |
| `get_analysis_status()` | | `{total, analysed, tagged, waveforms, failed, pending, last_pass, ffmpeg, running}` – `pending` = Einträge, die der Durchlauf «new» anfassen würde |
| `analyse_library(opts?)` | `{scope: "new" (Standard) \| "all"}` | `{ok:true, started:true, scope}` \| `{ok:true, started:false, running:true}` \| `{ok:false, error}` (ffmpeg fehlt) |
| `cancel_analyse_library()` | | `{ok:true, running}` – beendet auch das laufende ffmpeg (nichts wird geschrieben) |

**Zusatzfelder von `get_media`**

- `loudness` = `{lufs, true_peak, gain, peak, source}` \| `null`: `lufs` = integrierte Lautheit (EBU R128),
  `true_peak` = dBTP, `gain` = ReplayGain-2.0-Verstärkung in dB bezogen auf −18 LUFS (`−18 − lufs`), `peak` =
  linearer True Peak (1.0 = Vollaussteuerung, `null` = unbekannt, z.B. Opus-Tags), `source` = `"analysis"` (DB)
  oder `"tags"` (ReplayGain-Tags eines anderen Programms, nur gelesen).
- `resume` = `{position, duration, updated}` \| `null` (nichts gemerkt, in den Rändern, oder `player.resume == "off"`).
- `peaks` = Wellenform `[0..255]` (1600 Werte, 255 = Vollaussteuerung) \| `null` = noch nicht berechnet
  (die UI ruft dann `get_waveform`).

**Was die UI damit macht:** Verstärkung = `10^((player.target_lufs − lufs)/20)`, höchstens `1/peak`
(kein Übersteuern); ohne `peak` nur absenken. Web Audio (MediaElementSource → Gain → Lautstärke-Gain), nur
wenn der AudioContext läuft; sonst nur absenken über `audio.volume`. Die Gains stehen beim Verbinden schon
auf ihren Zielwerten (kein lauter Moment). Ein Stille-Wächter (AnalyserNode direkt an der Quelle) prüft beim
ersten Abspielen: bleibt das Signal bei laufender, nicht stummer Wiedergabe 1.5 s lang exakt 0 (Quelle als
cross-origin behandelt), wird der Graph verworfen, ein neues Audio-Element spielt an derselben Stelle weiter,
und für die Sitzung gilt nur noch `audio.volume` (Toast `player.norm_fallback`; Anheben braucht Web Audio).
`HC.player.output()` meldet dazu `fallback` und `watching`. `scope`:
`"new"` = nie gemessen, seither neu geladen, Tags noch nicht geschrieben (nur Tag-Schreiben, ohne neue
Messung) oder Wellenform fehlt (bei `loudness.waveforms`); unlesbare Dateien erst nach einem neuen Download
wieder; `"all"` = alles neu messen.

**Tags (nie neu kodieren):** MP3 `TXXX:REPLAYGAIN_TRACK_GAIN` (`"-10.10 dB"`) + `TXXX:REPLAYGAIN_TRACK_PEAK`
(`"1.135011"`); M4A Freeform-Atome `----:com.apple.iTunes:replaygain_track_gain/_peak`; Opus
`R128_TRACK_GAIN` (Q7.8, bezogen auf −23 LUFS, RFC 7845 – Opus-Player ignorieren `REPLAYGAIN_*`). Andere
Container (z.B. `.webm`): nur Messung in der DB. Geschrieben unter `library.FS_LOCK` (nie gleichzeitig mit
Neu-Taggen/Verschieben/Löschen), der Pfad wird im Lock neu gelesen. Atomar: Kopie neben der Datei
(`<name>.hcltmp`), Tags in die Kopie, dann `os.replace` (bei einer Windows-Freigabeverletzung bis zu 5
Versuche mit kurzer Pause). Nie in die Datei, die der Player geladen hat (`set_now_playing`): dann und bei
einer weiterhin gesperrten Datei heisst das Ergebnis `tag_deferred: true` (kein Fehler), `tagged = 0`, und
die Tags werden nach dem Freigeben bzw. im nächsten Durchlauf geschrieben (ohne neue Messung). Schlägt das
Schreiben sonst fehl, bleibt `tagged = 0` mit `error`, der nächste Durchlauf schreibt nur die Tags.

**Wann wird analysiert:** nach jedem Download (`loudness.analyse_after_download`, im Analyse-Thread); beim
ersten Abspielen ohne Wellenform (`get_waveform`, misst die Lautheit im selben Dekodierlauf mit); per
Knopf im Tab «Wiedergabe» (`analyse_library`). Downloads des Headless-Laufs (Aufgabenplanung, analysiert
nicht) reiht die GUI beim nächsten Start ein (nur Downloads seit dem ersten Start mit v0.7.0).

Beispiel `get_waveform("dQw4w9WgXcQ")` → `{"ok": true, "status": "pending"}`, danach Event
`waveform` `{"id": "dQw4w9WgXcQ", "ok": true, "peaks": [0, 12, 180, 255, …], "duration": 3712,
"loudness": {"lufs": -7.9, "true_peak": 1.1, "gain": -10.1, "peak": 1.135011, "source": "analysis"}}`.

### DJ pages, playlist export (v0.8.0)

Entscheide: `docs/decisions.md` «DJ pages and playlist export (v0.8.0)». Alles **lokal** (kein Netz, kein
Throttle). Backend: `app/core/artists.py` (Ableitung, Aliasse, Zusammenführen/Abtrennen, Watchlist-Vorschlag),
`app/core/playlists.py` (M3U8, Pfade, gespeicherte Playlists, Sync). Tabellen `artists` und `playlists`
(Migration 13, automatisches Backup vorher). Index-Aufbau, Export und Sync laufen im Thread
`hcloader-playlists` (`Api._pl_worker`), nie im pywebview-Callback-Thread.

**Wer hat ein Set gespielt?** 1. bestätigte Zeile einer Festival-Checkliste (`checklist_rows.artist`),
2. Titel-Segmente ohne Serie/Jahr/Bühne/Set-Art/Gattungswörter, «… by <DJ>», 3. Kanalname (nicht bei
Veranstalter-Kanälen und zugeordneten Festival-Sets). Getrennt wird an `b2b`, `b3b`, `vs`, `x` und – ausser
bei einem bekannten Act wie «D-Block & S-te-Fan» – an `&`, `+`, `,`. Jeder Artist eines b2b-Sets bekommt das
Set (`role: "b2b"`). Identität = `key` (gefaltet, ohne Leerzeichen: «Sub-Zero Project» = «subzeroproject»).

| Methode | Parameter | Rückgabe |
|---|---|---|
| `get_artists(opts?)` | `{search, sort: "sets" (Standard) \| "recent" \| "name", hidden: bool}` | `{ok:true, artists:[ArtistSummary], hidden}` – `hidden` = Anzahl ausgeblendeter; `hidden:true` listet nur diese |
| `get_artist(key)` | Schlüssel oder Alias/Schreibweise | `{ok:true, artist: ArtistSummary, sets:[LibraryItem + role + with], tracks:[{artist, title, version, sets}]}` \| `{ok:false, error}` – Sets neueste zuerst; `with` = Namen der b2b-Partner; `tracks` = Top 10 aus den Tracklisten (ohne ID-Tracks) |
| `save_artist(data)` | `{key?, name, aliases:[…], channel_url?}` (ohne `key` = neuer DJ/Act) | `{ok:true, key}` \| `{ok:false, errors:{name\|aliases\|channel_url: Meldung}, error}` – Name/Alias eines **anderen gespeicherten** Artists = Fehler (zusammenführen); Alias eines nur abgeleiteten Artists = zusammenführen |
| `merge_artists(keys, into)` | Liste der Quell-Schlüssel, Ziel-Schlüssel | `{ok:true, key}` \| `{ok:false, errors, error}` – Namen, Aliasse, Schreibweisen der Quellen werden Aliasse des Ziels |
| `split_artist(key, alias)` | | `{ok:true, key, split}` \| `{ok:false, errors, error}` – Alias wieder eigener Artist |
| `hide_artist(key, hidden)` | | `{ok:true, key, hidden}` – «kein DJ»; ausgeblendete zählen nirgends mehr als Credit |
| `get_artist_watch(key)` | | `{ok:true, source:{type, name, url_or_query, platform?}, existing: Source\|null}` – speichert **nichts**; eigener Kanal (gespeichertes `channel_url` oder ein Kanal der Sets mit dem Namen des DJs) → `channel`, sonst `search` «<DJ> live set». Die UI bestätigt und ruft `save_source(source)` |
| `preview_playlist(spec)` | Spec (siehe unten) | `{ok:true, spec, name, folder, relative, count, missing, seconds, saved: SavedPlaylist\|null}` \| `{ok:false, error}` |
| `export_playlist(spec, opts?)` | `{name, folder, relative, overwrite, sync}` | `{ok:true, path, count, skipped, absolute_fallback, relative, sync}` \| `{ok:false, exists:true, path}` (fragen, dann mit `overwrite:true`) \| `{ok:false, error}` |
| `get_saved_playlists()` | | `{ok:true, playlists:[SavedPlaylist], sync_enabled}` |
| `set_playlist_sync(id, sync)` | | `{ok:true}` \| `{ok:false, error}` (auch bei ungültiger Id) |
| `forget_playlist(id)` | | `{ok:true}` – nur aus der Liste; die Datei bleibt \| `{ok:false, error}` (unbekannte/ungültige Id) |
| `sync_playlists(ids?)` | ohne `ids`: alle mit `sync` | `{ok:true, synced, failed, gone, paths}` + Event `playlists_synced` \| `{ok:false, error}` (ungültige Id). `gone` = automatischer Sync fand die Datei nicht mehr (im Explorer gelöscht): sie wird nicht neu angelegt, «Aktuell halten» wird ausgeschaltet. Mit `ids` (ausdrücklich «Jetzt schreiben») wird auch eine fehlende Datei geschrieben |

`ArtistSummary` = `{key, name, initials, aliases, spellings, channel_url, edited, hidden, sets, b2b, seconds,
festivals, years:[YYYY], last ("YYYY-MM-DD"|null)}` – `festivals` = verschiedene Serien der Art «festival»,
`years` = Event-Jahr der Ausgabe, sonst Upload-Jahr, `edited` = vom User geändert (nicht nur Startliste).

`SavedPlaylist` = `{id, name, path, kind, relative, sync, count, updated, exists}`.

**Spec** (sprachneutral, wird bei gespeicherten Playlists abgelegt):
`{kind:"edition", edition_id}` · `{kind:"series", series_id}` · `{kind:"genre", genre}` · `{kind:"artist", key}` ·
`{kind:"filter", filters:{search, genre, channel, year, platform, series_id, edition_id}, sort:"newest"|"title"|"channel"|"duration"}` ·
`{kind:"checklist", edition_id}` (nur Zeilen mit Status `downloaded`) · `{kind:"continue"}` (bis 20).

**Datei:** UTF-8 ohne BOM, `\n`, erste Zeile `#EXTM3U`, je Set `#EXTINF:<Sekunden|-1>,<Artist> - <Titel>` und der
Pfad. Artist = gutgeschriebene DJs (b2b mit « b2b » verbunden), sonst Kanal; ein Titel-Segment, das nur den
Artist wiederholt, entfällt. Relativ zum Ordner der Playlist (`os.path.relpath`; unter Windows wirft das bei
einem anderen Laufwerk/UNC-Freigabe → absoluter Pfad, gezählt in `absolute_fallback`). Fehlende Dateien
werden übersprungen (`skipped`). Dateiname: `sanitize_filename` + `.m3u8`, gekürzt bis der Pfad unter
`storage.max_path_length` bleibt; Ordner Standard `playlists.folder` bzw. `<Zielordner>\Playlists`. Atomar
geschrieben (`.tmp` + `os.replace`). Jeder Export landet in `playlists` (eindeutig nach Pfad).

**Sync:** mit `playlists.sync_after_download` schreibt `Api._after_download` die Playlists mit `sync` neu
(gebündelt: läuft schon ein Sync, folgt genau einer); der Headless-Lauf ebenso nach seinen Downloads.

Beispiel `export_playlist({"kind": "artist", "key": "headhunterz"}, {"relative": true})` →
`{"ok": true, "path": "D:\\Musik\\HCLoader\\Playlists\\Headhunterz.m3u8", "count": 4, "skipped": 0,
"absolute_fallback": 0, "relative": true, "sync": false}`; Datei:

```
#EXTM3U
#EXTINF:3660,Headhunterz - Intents Festival 2023 | Mainstage
..\Hardstyle\Q-dance\2023\2023-06-05 - Headhunterz Intents Festival 2023 Mainstage [iInt23Headh].mp3
```

### Statistics, notifications, media server (v0.9.0)

Entscheide: `docs/decisions.md` «Statistics, notifications, media server (v0.9.0)». Backend:
`app/core/stats.py` (Abfragen, Dateigrössen), `app/core/notify.py` (Sammeln, Ruhezeit, Toast-XML,
Senden, Registrierung), `app/core/mediaserver.py` (Anfragen, Pfade, Transport), `app/core/credentials.py`
(Windows-Anmeldeinformationsverwaltung); Dienste `worker.NotificationService`, `worker.MediaScanQueue`,
`worker.run_scan`. Statistik im Thread `hcloader-playlists` (DJ-Index), Dateigrössen im Thread
`hcloader-stats`, Test/Scan/Test-Benachrichtigung im Thread `hcloader-mediaserver` – nie im
pywebview-Callback-Thread.

| Methode | Parameter | Rückgabe |
|---|---|---|
| `get_stats(opts?)` | `{from?, to?}` lokale Tage `YYYY-MM-DD` (inklusiv, beide optional; vertauscht = getauscht) | `{ok:true, range:{from, to}, totals, genres, festivals, years, djs, months, platforms, tracks, watchlist, series_count, measuring}` \| `{ok:false, error}` (ungültiges Datum). `measuring:true` = fehlende Dateigrössen werden im Hintergrund gemessen → Events `stats_sizes` |
| `get_notification_status()` | | `{ok:true, available, backend:"winrt"\|"powershell"\|"none", quiet_now, pending}` |
| `test_notification()` | | `{ok:true, backend}` \| `{ok:false, error, backend?}` – zeigt sofort eine Test-Benachrichtigung (ohne Ruhezeit/Schalter) |
| `get_media_server_status()` | | `{ok:true, type, has_secret:{plex, jellyfin}, persistent, last_scan: MediaScan\|null, pending}` – `persistent:false` = keine Anmeldeinformationsverwaltung (nur Linux/Tests) |
| `test_media_server(data)` | `{type:"plex"\|"jellyfin", url, secret?, verify_tls?}` – Formularwerte, **nicht** gespeichert | `{ok:true, name, version, libraries:[{id, name, type, paths, music}], stored, persistent}` \| `{ok:false, code, error, errors?}`. `secret` leer = gespeicherter; ein eingetippter wird erst **nach** erfolgreichem Test gespeichert (`stored:true`) |
| `forget_media_server_secret(kind?)` | `"plex"` \| `"jellyfin"` (Standard: eingestellter Typ) | `{ok:true}` \| `{ok:false, error}` |
| `scan_media_server()` | | `MediaScan` – ganze Bibliothek jetzt (gespeicherte Einstellungen + gespeichertes Secret); auch Event `media_scan` |

**Datenformen**

- `totals` = `{sets, seconds, bytes, sizes_missing, avg_seconds, first, last, library_sets}` – im Zeitraum;
  `library_sets` = ganze Bibliothek; `first`/`last` = ISO-Zeit des ersten/letzten Downloads.
- `genres` = `[{name, sets, seconds, bytes, color}]` (leeres Genre = `Unsortiert`; `color` aus `genres.items`).
- `festivals` = `{items:[{key, name, sets, seconds, editions}] (Top 10, nur Serien der Art «festival»), other, festivals}`.
- `years` = `[{year, sets, seconds}]` aufsteigend – Event-Jahr der Ausgabe, sonst Upload-Jahr; `year:null` = unbekannt (am Ende).
- `djs` = `[{key, name, initials, sets, seconds}]` Top 10 aus dem DJ-Index (b2b zählt für jeden).
- `months` = `[{month:"YYYY-MM", sets, seconds, bytes}]` lückenlos vom Beginn (Zeitraum oder erster Download)
  bis zum Ende (Zeitraum, sonst letzter Download); Monat = UTC-Monat des Downloads.
- `platforms` = `[{platform, sets, seconds, bytes}]`; `tracks` = `[{key, artist, title, version, sets}]` (Top 10, ≥ 2 Sets).
- `watchlist` = `{checks, scheduled, found, downloaded, last, months:[{month, checks, found}], sources:[{id,
  name, type, platform, found, downloaded, inbox}] (Top 10 nach `found`), source_count, enabled_sources, inbox}` –
  Läufe der Art `watchlist` und `headless` (nach Start), Quellen nach `source_videos.first_seen`.
- `MediaScan` = `{ok, server, files, at, requests?, partial?, error?, code?}` – `files` = neue Dateien des
  Stapels (0 = ganze Bibliothek), `partial` = nur Ordner/Pfade statt ganzer Bibliothek, `code` = `auth`,
  `unreachable`, `timeout`, `tls`, `http`, `bad_response`, `config`, `no_secret`. Zuletzt in `state.media_scan_last`.

**Benachrichtigungen.** `Api` sammelt: Ende eines Queue-Laufs (`DownloadQueue(on_session_end=…)`: geladen,
fehlgeschlagen, Titel) und `watchlist_done.inbox`. `NotificationService` zeigt 15 s nach dem letzten Ereignis
**eine** Benachrichtigung (`notify.flush`), frühestens 120 s nach der letzten; während der Ruhezeit bleibt der
Stapel in `state.notify_pending` und der Status-Ticker (30 s) zeigt ihn danach. Der Headless-Lauf sammelt in
denselben Stapel und zeigt ihn am Ende (`notify.notify_run`). Klick: Protokoll `hcloader://open/<view>` →
`pythonw -I -c "…" --protocol hcloader://open/<view>` (nur genau dieses eine Argument, Allow-List
`inbox|downloads|library|stats`, sonst Abbruch ohne Aktion, siehe `docs/decisions.md`) → läuft die App, `show <token> <view>` an die laufende Instanz
(`instance.ActivationServer(on_view=Api.open_view)`) → Event `navigate`; sonst normaler Start, und der erste
`get_settings()` liefert `open_view` (kein `#view` in der URL: .NET `System.Uri` verliert es bei `file:`-URLs).

**Medienserver.** `Api._after_download` → `MediaScanQueue.add(id)`; der Timer (`media_server.delay_seconds`)
wird bei jedem Download neu gestartet, dann **ein** Stapel (`run_scan`). Pfade: `server_path(lokal, Zielordner,
media_server.server_root)`. Plex: `GET {url}/library/sections/{library}/refresh?path={Ordner}` je neuem Ordner
(> 5 Ordner oder nicht abbildbar: ohne `path`; ohne Bibliothek `sections/all/refresh`), Header `X-Plex-Token`,
`Accept: application/json`. Jellyfin: `POST {url}/Library/Media/Updated` `{"Updates":[{"Path", "UpdateType":
"Created"}]}` (≤ 100 Pfade), sonst `POST /Items/{library}/Refresh?Recursive=true…` bzw. `/Library/Refresh`;
Header `Authorization: MediaBrowser Client="HCLoader", …, Token="…"`. Test: Plex `GET /` + `GET /library/sections`,
Jellyfin `GET /System/Info` + `GET /Library/VirtualFolders`. Transport: urllib ohne Proxy, ohne Weiterleitungen,
Timeout 10 s, Antwort ≤ 2 MB, keine Wiederholung; 401/403 = `auth`. Headless: nach den Downloads ein Stapel.

### Re-upload detection, Mixcloud, hearthis.at (v0.10.0)

Entscheide: `docs/decisions.md` «Re-upload detection (v0.10.0)», «Mixcloud and hearthis.at (v0.10.0)»,
«archive.org (v0.10.0)». Backend: `app/core/fingerprint.py` (Algorithmus, ffmpeg-Fenster, Index, Markierungen,
Durchlauf), `app/core/platforms.py` (IDs, Hosts, Track-Seiten), `app/core/ytclient.py` (Extraktoren);
Dienst `worker.FingerprintQueue` (eigener Thread `hcloader-fingerprint`, eine Datei nach der anderen, wartet,
solange die Lautheitsanalyse dekodiert) – nie im pywebview-Callback-Thread.

| Methode | Parameter | Rückgabe |
|---|---|---|
| `get_reupload_status()` | | `{total, fingerprinted, failed, pending, open, kept, linked, last_pass, ffmpeg, running, enabled}` – `pending` = Bibliotheks-Einträge ohne (aktuellen) Fingerabdruck |
| `fingerprint_library(opts?)` | `{scope: "new" (Standard) \| "all"}` | `{ok:true, started:true, scope}` \| `{ok:true, started:false, running:true}` \| `{ok:false, error}` (aus, kein ffmpeg). Fortschritt `fingerprint`, Treffer `reupload` (mit `pass:true`) |
| `cancel_fingerprint_library()` | | `{ok:true, running}` – bricht auch das laufende ffmpeg ab (nichts gespeichert) |
| `get_reuploads(opts?)` | `{state: "open" (Standard) \| "all"}` | `{ok:true, items:[{id, title, platform, channel, file_path, downloaded_at, reupload: Reupload}]}` – nur Einträge in der Bibliothek, neueste zuerst |
| `resolve_reupload(id, action)` | `action`: `"keep"` (beide behalten, Markierung weg) \| `"link"` (gleicher Mix, verknüpft) \| `"delete_new"` (diese neuere Datei löschen, Eintrag → `ignored`, wie `delete_library_item`; **nur wenn `of.present = "ok"`**) \| `"adopt"` (Original fehlt: diese Kopie ersetzt es; nur wenn `of.present` `"missing"`/`"gone"`; ein `missing`-Original wird aus der Bibliothek genommen, Event `video` `ignored`) \| `"open"` (Entscheid rückgängig) | `{ok:true, id, state, reupload}` \| `{ok:true, deleted, archive_removed?}` (delete_new) \| `{ok:true, id, removed: id\|null, reupload:null}` (adopt) \| `{ok:false, error, original?}` (nicht markiert, unbekannte Aktion, Original fehlt/unbekannt bzw. noch da) |

**Datenformen**

- `Reupload` = `{of: {id, title, platform, channel, in_library, present}, score (0..1), offset_s, state: "open"|"kept"|"linked"}`
  – `present` (Review v0.10.0 M1, in `get_library`/`get_reuploads`): `"ok"` (Original in der Bibliothek, Datei da
  und lesbar), `"missing"` (Eintrag da, Datei fehlt), `"gone"` (nicht mehr in der Bibliothek), `"unknown"`
  (Zielordner nicht erreichbar). «Neuere Datei löschen» nur bei `"ok"`; sonst bietet die UI `adopt` an.
  Verschwindet das Original trotzdem während des Löschens, wird die Archivzeile der gelöschten Kopie entfernt
  (`archive_removed`), damit sie wieder geladen werden kann.
  – `of` = der ältere Bibliotheks-Eintrag (früherer `downloaded_at`), markiert ist immer der neuere;
  `offset_s` = Zeitversatz des Audios (positiv: der neue beginnt später, z.B. längeres Intro).
- `LibraryItem.reupload`: `Reupload | null`; `get_library({reupload: true})` = nur offene Markierungen.
- `Video.platform` / `Source.platform` / `Status.platforms`: zusätzlich `"mixcloud"`, `"hearthis"`.
  IDs `mc:<nutzer>_<slug>` (= yt-dlp-ID) und `ht:<track-id>`, `channel_id` `mc:<nutzer>` / `ht:<permalink>`.
  `Video.url` ist bei diesen beiden Pflicht für den Download (Track-Seite, wird aus Liste/Suche gespeichert).
  `Video.preview` bei Mixcloud = Select-Upload (nur Abonnenten), `filter_reason` «Subscribers only (Mixcloud Select)».
- `search(query, {platform: "mixcloud"|"hearthis"})`: eigene Such-Extraktoren (`mcsearchN:`, `htsearchN:`),
  Limit «Suchen pro Stunde» je Plattform. `suggest_source` erkennt `mixcloud.com/<nutzer>` (auch `/uploads`) →
  channel, `mixcloud.com/<nutzer>/playlists/<liste>` → playlist, `hearthis.at/<nutzer>` → channel,
  `hearthis.at/<nutzer>/set/<set>` → playlist; einzelne Tracks → `type:""`.
- `clear_backoff(platform?)`: auch `"mixcloud"` / `"hearthis"`.

**Events**

- `fingerprint` = `{phase: "start"|"progress"|"done"|"error", scope, done?, total?, found?, failed?, cancelled?, error?}`.
- `reupload` = `{id, reupload: Reupload | null, deleted?, adopted?, pass?}` – neue Markierung (nach Download oder im Durchlauf,
  dann `pass:true`: die UI zeigt keinen Toast pro Treffer), Entscheid (`keep`/`link`/`open`) oder gelöscht.

**Ablauf.** `Api._after_download(id)` → `FingerprintQueue.request(id)` (mit `reupload.enabled` und
`fingerprint_after_download`). Pro Datei: Fenster aus der gespeicherten Dauer (`head_minutes` ab Anfang +
`windows` × 30 s an festen Zeiten, halb ab Anfang, halb vor dem Ende), je Fenster ein ffmpeg-Aufruf (`-ss` vor
`-i`, mono, 5512 Hz, s16le, `-threads 1`, niedrige Priorität) → Landmark-Hashes → `fingerprints` + Stichprobe in
`fingerprint_index` → Kandidaten über den Index → Vergleich mit den vollständigen Fingerabdrücken →
Ausrichtungs-Check (die Datei wird beim gefundenen Versatz dort erneut dekodiert, wo die Abschnitte des
Kandidaten liegen) → bei Treffer Markierung des neueren Eintrags. Ein Entscheid
(`kept`/`linked`) für dasselbe Paar bleibt auch nach «Alle neu abgleichen». Gelöschte Bibliotheks-Einträge
verlieren Fingerabdruck und Markierungen (`fingerprint.forget`). Der Headless-Lauf dekodiert nicht; die GUI
holt Downloads seit dem ersten v0.10.0-Start beim nächsten Start nach (`fingerprint.since_pending`).
Vor-Prüfung (`reupload.precheck`): Suchtreffer und Watchlist-Einträge bekommen `duplicate_of` auch für einen
Eintrag **derselben** Plattform (Dauer ±5 s, Titel-Jaccard ≥ 0.8) – Auto-Download-Quellen legen sie in den Eingang.

### Festival collector (v0.5.0)

Konzept: `docs/concepts/festivals.md` «v0.5.0 – Collect a whole edition», Entscheide: `docs/decisions.md`
«Festival-Sammler (v0.5.0)». Backend: `app/core/collector.py` (Checkliste, Abgleich, Suchauftrag, Queue),
`app/core/timetable.py` (Parser, mitgelieferte Dateien). Pro **Ausgabe** (`editions`, z.B. «Defqon.1 2024»)
eine Checkliste der erwarteten Sets. Quellen der Zeilen: Playlist des Veranstalters, eingefügter
Timetable (Text/CSV), mitgelieferte Timetable-Datei, von Hand. **Kein Scraping** von Festival-Websites.

| Methode | Parameter | Rückgabe |
|---|---|---|
| `get_collector_editions()` | | `[CollectorEdition]` – Ausgaben mit Checkliste, neuestes Jahr zuerst (offline) |
| `open_collector_edition(data)` | `{edition_id}` **oder** `{series_id, year, variant?}` (Ausgabe wird angelegt; Jahr Pflicht) | `{ok:true, edition:CollectorEdition}` \| `{ok:false, errors:{series_id?\|year?\|edition_id?: "Meldung"}, error}` |
| `delete_checklist(edition_id)` | | `{ok:true, deleted}` – Zeilen + Suchauftrag weg (ein laufender wird gestoppt); Videos/Dateien bleiben |
| `get_checklist(edition_id)` | | `{ok:true, edition:CollectorEdition, rows:[ChecklistRow]}` (Reihenfolge = `position`) \| `{ok:false, errors, error}` |
| `parse_timetable(text)` | eingefügter Text | `{ok:true, rows:[TimetableRow], skipped:[Zeile], days:[str], stages:[str], csv:bool}` – nur Vorschau, nichts gespeichert. `skipped` = jede Zeile, die weder Set noch Überschrift/Kommentar/Trennzeile ist (Originaltext; auch Titel- und Freitextzeilen wie Sätze, URLs, Hashtags, «tickets», «doors open», Schwänze wie «and many more»); `csv` auch bei CSV ohne Kopfzeile |
| `import_timetable(edition_id, data)` | `data` = Text **oder** `[TimetableRow]` (bearbeitete Vorschau: der Dialog schickt die Zeilen, sobald der User eine geändert oder entfernt hat) | `{ok:true, added, merged, invalid, skipped:[Zeile], ids:[Zeilen-id], matched}` + Event `collector_rows` |
| `get_timetable_files()` | | `[TimetableFile]` |
| `import_timetable_file(file)` | `TimetableFile.file` | `{ok:true, edition_id, added, merged, invalid, skipped, ids, matched}` (Checkliste der Ausgabe wird angelegt) \| `{ok:false, errors:{file}, error}` |
| `import_checklist_playlist(edition_id, url)` | YouTube-Playlist (`playlist?list=` oder `watch?…&list=`) oder SoundCloud-Set | `{ok:true, started:true, url}` (normalisiert) \| `{ok:true, started:false, running:true}` \| `{ok:false, errors:{url}, error}` \| `{ok:false, error}` (Backoff, yt-dlp-Update, Neustart nötig) + Events `collector_import`, `collector_rows` |
| `add_checklist_row(edition_id, row)` | `{artist, stage?, day?, start?, end?, set_type?, checked?}` | `{ok:true, row:ChecklistRow}` (`source:"manual"`, sofort gegen die Bibliothek abgeglichen) \| `{ok:false, errors, error}` |
| `update_checklist_row(id, row)` | nur die geänderten Felder von oben | `{ok:true, row, retag}` \| `{ok:false, errors:{artist?\|start?\|end?\|set_type?}, error}` |
| `delete_checklist_rows(ids)` | `[id]` | `{ok:true, deleted}` + Event `collector_rows` (`deleted`) |
| `set_checklist_checked(ids, checked)` | `[id]`, bool – «Alle/keine» = alle (gefilterten) ids | `{ok:true, changed}` |
| `set_checklist_ignored(ids, ignored)` | `[id]`, bool | `{ok:true, changed}` |
| `confirm_checklist_match(id, video_id?, reject?)` | `video_id` = aktueller Treffer **oder** ein Kandidat; `null` = Treffer verwerfen; `reject:true` = dieses Video nie wieder für die Zeile vorschlagen | `{ok:true, row}` \| `{ok:false, errors:{video_id}, error}` |
| `estimate_checklist_matching(edition_id, opts?)` | `opts {restart?}` | `{ok:true, edition_id, rows, requests, per_hour, seconds, searches_left_hour, available_at, backoff_until, matched_offline, resume}` (ohne Netzwerk) |
| `start_checklist_matching(edition_id, opts?)` | `opts {restart?}` | `{ok:true, job:CollectorJob}` \| `{ok:true, job, nothing:true}` (nichts zu suchen) \| `{ok:false, error}` + Events `collector_job`, `collector_rows` |
| `cancel_checklist_matching(edition_id)` | | `{ok:true, job}` – hält vor der nächsten Suche an |
| `queue_checklist(edition_id, ids?)` | ohne `ids` = alle Zeilen | `{ok:true, queued:[video_id], retag, skipped:{unchecked, unconfirmed, missing, other}}` |

**Datenformen**

- `CollectorEdition` = `{edition_id, series_id, series_key, series, kind, year, variant, edition,
  playlist_url, stats:ChecklistStats, job:CollectorJob|null, library, created, updated}`; `edition` =
  Anzeigename («Defqon.1 Australia 2024»), `library` = Bibliothekseinträge (Status `done`) dieser Ausgabe.
- `ChecklistStats` = `{total, missing, found, queued, downloaded, ignored, checked, to_confirm, ready,
  to_search}`. `checked` = angehakt und nicht ignoriert; davon `to_confirm` = Treffer ohne Bestätigung,
  `ready` = bestätigt + `found` (das lädt `queue_checklist`), `to_search` = ohne Treffer und noch nicht
  gesucht (das kostet der nächste Suchauftrag).
- `ChecklistRow` = `{id, edition_id, artist, stage, day, start, end, set_type, source, status, video_id,
  video:CollectorVideo|null, confidence, candidates:[{confidence, video:CollectorVideo}], confirmed,
  needs_confirmation, checked, ignored, edited, searched, position}`.
  - `source`: `playlist` | `timetable` | `file` | `manual`. `edited` = von Hand geändert → diese Werte
    gelten (ein späterer Import füllt nur leere Felder nicht editierter Zeilen).
  - `status` (abgeleitet, immer aktuell): `ignored` (Flag `ignored`), sonst `missing` (kein Treffer),
    `queued` (Video `queued`/`downloading`), `downloaded` (Video `done`), sonst `found`.
  - `start`/`end` `"HH:MM"` oder `null`; `day`/`stage` freier Text (wie eingegeben, z.B. «Samstag, 28.06.»);
    `set_type` Code (`festivals.SET_TYPES`) oder `null`.
  - `confidence` 0–1 des Treffers; `needs_confirmation` = Treffer, aber nicht `confirmed` → die UI zeigt
    «Bestätigen / anderer Kandidat / verwerfen». `searched` = ISO-Zeit der letzten Suche (`null` = noch
    nicht gesucht). Playlist-Zeilen sind immer `confirmed` (Veranstalter-Playlist), Bibliotheks-/Such-
    treffer nur, wenn sie sicher sind (s.u.).
- `CollectorVideo` = `{id, title, status, duration, channel_name, upload_date, thumbnail, url, platform}`.
- `CollectorJob` = `{edition_id, state, total, done, searches, hits, note, started, updated, finished}`;
  `state`: `pending` (wartet/unterbrochen – geht beim nächsten App-Start automatisch weiter), `running`,
  `paused` (3 Fehler in Folge), `done`, `cancelled` (vom User; «Start» setzt fort). `total`/`done` =
  Zeilen dieses Auftrags, `searches` = Suchanfragen, `hits` = Zeilen mit Treffer, `note` = übersetzter
  Grund (z.B. «Nächste Suche um 14:30 …», «Backoff bis …», «Fehler: …»).
- `TimetableRow` = `{artist, stage, day, start, end, set_type}` (Parser-Ergebnis, bearbeitbar).
- `TimetableFile` = `{file, series_key, series_id, series, edition, year, variant, source, updated, sets}`
  oder `{file, error, series_key?: …}` bei einer kaputten Datei (`series` `null` = Serie hier unbekannt
  oder ausgeblendet → Import nicht möglich).

**Regeln**

- **Parser** (`timetable.parse`): Zeilen wie `18:00 - 19:00 Headhunterz`, `Headhunterz 18:00–19:00`,
  `Headhunterz | 18:00–19:00 | RED` (Zellen mit `|` oder Tab, beliebige Reihenfolge), `18.00`, `18h00`,
  `1800-1900`, `6pm`; Bühne in Klammern/nach `@`/` - ` (nur bekannte Bühnen), `(Live)` → `live_set`,
  Set-Art-Begriffe (Endshow, Warm-up …). Überschriften: Tag (`Saturday`, `Samstag, 28.06.`, `Zaterdag`,
  `Day 2`, auch `## …`) setzt den Tag und löscht die Bühne; Bühne (bekannte Bühne, `Stage: X`, `[X]`,
  `X:`, Zeile mit «Stage/Bühne/Area/Arena/Tent/Hall/Floor», `== X ==`); `Saturday – RED` setzt beides.
  Titelzeilen mit «Timetable/Line-up/Schedule/Zeitplan» werden übergangen. Eine Zeile ohne Zeit, die keine
  Überschrift ist, ist ein Set ohne Zeit (reine Line-up-Liste, Aufzählungszeichen werden entfernt).
  **CSV/TSV/`;`/Markdown-Tabelle** mit Kopfzeile: Spalten artist/dj/act/name/Künstler/artiest, stage/
  Bühne/area, day/Tag/dag/date, start/from/von, end/to/bis, time (Bereich), type/set type. Doppelte
  (Artist + Bühne + Tag + Start) fallen weg; höchstens 2000 Zeilen.
- **Import/Zusammenführen:** gleiche Zeile (Artist + Bühne + Tag, ohne Gross/Klein/Akzente) wird nicht
  doppelt angelegt; eine Playlist-Zeile desselben Artists ohne Tag bekommt Tag/Zeiten aus dem Timetable.
  Eine Timetable-Zeile ohne Treffer bekommt beim Playlist-Import den Eintrag als Treffer. Höchstens 1000
  Zeilen pro Ausgabe.
- **Playlist** (`import_checklist_playlist`): eine flache Liste, seitenweise wie «Alles einlesen» (jede
  Seitenanfrage über den Throttle, Tempo `watchlist.backfill_requests_per_hour`, höchstens
  `watchlist.backfill_max_entries` Einträge), Thread `hcloader-collector-import`. Jeder Eintrag = Zeile mit
  `video_id` = Eintrag, `confirmed:true`, Artist aus dem Titel (Segmente mit Serienname, Jahr, Bühne,
  Set-Art fallen weg), Bühne/Set-Art aus dem Titel. Zu kurz (`filters.min_duration`) oder
  Aftermovie/Trailer (negative Begriffe) → Zeile `checked:false`; Livestreams/Premieren werden übergangen. Einträge werden wie Suchtreffer
  gespeichert (Status `new`, Genre, Festival-Erkennung) – nie Eingang, nie Queue.
- **Abgleich** (kostenlos, offline): vor jeder Suche und nach jedem Import gegen gespeicherte Videos
  (Bibliothek, Eingang, frühere Treffer; nicht `ignored`, keine Previews). Bewertung `score`: alle Namen
  der Zeile im Titel +0.45 (bei «A b2b B» nur einer: +0.30; keiner = kein Treffer), Serienname +0.25
  (schwacher Alias wie «Supremacy» nur mit dem Jahr direkt dahinter, sonst +0.10 `series:weak`),
  Jahr der Ausgabe +0.20 (nur andere Jahre −0.30; kein Jahr, Upload im Jahr/Folgejahr +0.10), Bühne
  +0.05, Set-Art +0.05, andere Variante («Australia» bei Defqon.1) −0.30 bzw. fehlende Variante −0.15,
  negative Begriffe −0.40, Dauer unbekannt −0.05; zu kurz/Livestream/Preview = kein Treffer. Treffer ab
  0.50; **sicher** (ohne Bestätigung) nur mit Artist + Serie + Jahr im Titel, ≥
  `festivals.collector_auto_confirm` (Standard 0.85) und **ohne Widerspruch** im Titel: weitere Artists
  neben dem DJ (b2b, vs, &, x, feat., with …), andere Bühne oder Set-Art als die Zeile, ein weiteres
  Jahr, eine andere Serie, falsche/fehlende Variante, negative Begriffe (`collector.BLOCKS_CERTAIN`).
  Gleiche Sicherheit → das schon geladene Video gewinnt (nie doppelt). Ein Video ist pro Ausgabe nur
  einer Zeile zugeordnet; `confirm_checklist_match` lehnt ein Video ab, das eine andere Zeile hält
  (`errors.video_id`).
- **Suchauftrag** (`start_checklist_matching`, Thread `hcloader-collector`, einer nach dem anderen): nur
  angehakte, nicht ignorierte Zeilen ohne Treffer, die noch nicht gesucht wurden. Pro Zeile eine flache
  Suche `<Artist> <Serie [Variante]> <Jahr>` über `YtClient.search` (YouTube; Throttle: Backoff,
  `sleep_requests`, `max_searches_per_hour` wird gezählt), `festivals.collector_results_per_search`
  Treffer. Abstand zwischen zwei Suchen = `3600 / min(festivals.collector_searches_per_hour,
  throttle.max_searches_per_hour)` s (Standard 10/h = alle 6 Min.), persistent; ist das Stundenlimit
  durch andere Suchen erschöpft, wartet der Auftrag bis zur freien Stelle. `estimate…`: `seconds` =
  `(rows − 1) × Abstand`, `searches_left_hour` = freie Suchen dieser Stunde, `matched_offline` = Zeilen,
  die der Gratis-Abgleich vorher gefunden hat. Gefundene Videos werden wie Suchtreffer gespeichert.
  Backoff/429 → `pending` mit `note`, keine weitere Anfrage; 3 Fehler → `paused`; `cancel` / App-Ende →
  vor der nächsten Suche (ein Ergebnis, das noch nicht gespeichert war, wird verworfen und die Zeile
  später neu gesucht). `start` nach `done` oder mit `restart:true` sucht alle Zeilen ohne Treffer erneut,
  sonst geht es beim Cursor weiter. Abgelehnt bei Backoff (YouTube), yt-dlp-Update, «Neustart nötig».
  Unterbrochene Aufträge (`pending`) setzen 90 s nach dem App-Start fort. Headless-Läufe suchen nicht.
- **Queue** (`queue_checklist`): nur angehakt + nicht ignoriert + `confirmed` + Video ladbar
  (`new`/`inbox`/`failed`, keine Preview/Geo-Sperre); normale Warteschlange (eins nach dem anderen,
  alle Limits). Vorher bekommt das Video die Werte der Zeile als **manuelle** Festival-Werte
  (`set_festival`-Semantik: Ausgabe, Bühne, Set-Art; die Erkennung überschreibt sie nie): editierte
  Zeilen exakt, sonst füllt die eigene Erkennung des Videos leere Felder. Schon geladene Videos bekommen
  die Werte ebenso und werden im Wartungs-Thread neu getaggt (`retag` = Anzahl). Ändert
  `update_checklist_row` eine bestätigte, wartende/geladene Zeile, gilt dasselbe.
- **Mitgelieferte Timetable-Dateien** `app/data/timetables/<series-key>/<year>[-<variant>].json`
  (Beschreibung: `app/data/timetables/README.md`). Es wird nur ausgeliefert, was nachweislich stimmt
  (Quelle `source` Pflicht in Beiträgen); v0.5.0 liefert **keine** Dateien aus. Format:

  ```json
  {
    "format": 1,
    "series": "defqon1",
    "year": 2024,
    "variant": "",
    "source": "https://… (official timetable)",
    "updated": "2024-06-20",
    "sets": [
      {"artist": "…", "stage": "RED", "day": "Saturday", "start": "18:00", "end": "19:00",
       "set_type": null}
    ]
  }
  ```
  `series` = Ordnername = `Series.key`; `year` 1990–2100; `sets` nicht leer, `artist` Pflicht, Zeiten
  `HH:MM`, `set_type` Code oder `null`. Import → `source:"file"`.

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

### UpdateStatus (App-Update)

```
{current, latest, available, state, notes, url, published, releases, progress, error, checked,
 portable, git_checkout, installed, blocked, apply_on_exit, verified, repo, foreign_repo}
```
- `current`: installierte Version (`app.__version__`); `latest`: neueste gefundene (null = noch nicht
  geprüft); `available` = `latest` > `current` (SemVer, numerisch).
- `state`: `idle` | `checking` | `downloading` | `ready` | `applying` | `error`.
- `notes`: Release-Text bzw. Abschnitt aus `CHANGELOG.md` (Markdown; die UI rendert ihn mit
  `HC.md` aus `ui/js/markdown.js` – alles escaped, nur `https://`-Links); `url`: Release-Seite.
- `published`: Datum des neuesten Releases (`YYYY-MM-DD`, aus `published_at` bzw. der
  CHANGELOG-Überschrift `## [x.y.z] - YYYY-MM-DD`) oder null.
- `releases`: `[{version, published, notes, url}]` für alle Versionen > `current` bis `latest`,
  neueste zuerst (höchstens 20; ohne Update `[]`) – der Dialog zeigt die Highlights jeder
  übersprungenen Version. `url` kann `""` sein (Abschnitt aus der CHANGELOG des Downloads). Bleibt
  über einen Neustart erhalten (`manifest.json`). Leer → der Dialog zeigt nur `notes`.
- `progress`: `{phase: "download"|"verify"|"prepare", pct (0–100 | null = Grösse unbekannt), bytes,
  total}` oder null.
- `error`: deutscher Text (nur bei `state: "error"` oder nach manueller Prüfung); `checked`: ISO der
  letzten erfolgreichen Prüfung.
- `portable`: Portable-Version; `git_checkout`: App-Ordner enthält `.git` → kein Selbst-Update.
- `installed`: Kopie aus dem Setup (`HCLoader-Setup-<version>.exe`): mitgeliefertes Python unter
  `<App>\python\`, kein `portable.txt`, Daten in `%APPDATA%\HCLoader`. Aktualisiert sich selbst wie die
  Portable-Version (pip mit denselben Flags, Starter-Dateien).
- `blocked`: Grund, warum sich diese Installation nicht selbst aktualisiert (Git-Checkout, nicht
  Windows) oder null.
- `apply_on_exit`: Setting `maintenance.apply_update_on_exit` (Beschriftung «Beim Beenden» / «Später»).
- `verified` (Review m6): `true` = `SHA256SUMS` des Releases geprüft, `false` = Release ohne
  `SHA256SUMS` (nur ZIP-Integrität; Banner «ohne Prüfsumme»), `null` = noch nichts geladen. Hat ein
  Release `SHA256SUMS`, fehlt aber der Eintrag oder passt der Hash nicht, bricht der Download ab.
- `repo` / `foreign_repo` (Review m7): konfiguriertes `maintenance.update_repo`; `foreign_repo` =
  nicht das offizielle Repo → Banner und Notizen-Dialog zeigen «aus <repo>».

`get_versions().backups[]` hat zusätzlich `kind`: `"manual"` (Knopf/`backup_db`) oder `"premigrate"`
(automatisch vor einer DB-Migration, `hcloader-premigrate-v<alt>-to-v<neu>-<ts>.db`).

## Events (Python → UI)

| Event | Daten | Sender | Phase |
|---|---|---|---|
| `status` | `Status` | nach `save/reset_settings`, `update_ytdlp`, `test_po_token`, `clear_backoff`, `create/remove_task`, `set_video_status`, `search`, jeder Queue-Änderung, Start/Stopp des PO-Token-Servers, sonst alle 30 s | 2/3 |
| `log` | `LogLine` | jede Logzeile (ausser Logger `pywebview*`, `app.worker.events`, `urllib3*`) | 2/3 |
| `toast` | `{msg, kind?}` (`ok`/`info`/`warn`/`err`) | Ergebnis des letzten App-Updates (ok/err), Update verfügbar, „yt-dlp aktualisiert – bitte HCLoader neu starten“ (warn), „HCLoader wurde verschoben – …“ (warn, Phase 6), Platzhalter „Folgt in Phase N“ | 2/3 |
| `video` | `{id, status, genre}` (+ `festival`, `festival_suggestion` nach `set_festival`/`reset_festival`, v0.3.0) | `set_video_status`, `set_genre`, `set_festival`, `reset_festival`, `enqueue`, Start/Ende/Abbruch eines Downloads, Download vom Throttle abgelehnt oder lokal gesperrt (zurück auf `queued`) | 2/3 |
| `progress` | `{id, phase, pct, speed, eta}` (+ `sleep_total` bei `sleep`) | Download-Queue: `sleep` einmal zu Beginn der Pause, `download` höchstens ca. 2×/s (Phasenwechsel und 100 % immer), `convert`, `tag` | 3 |
| `done` | `{id, title}` | Download fertig getaggt und verschoben | 3 |
| `failed` | `{id, title, error}` | Download fehlgeschlagen (bei 429 zusätzlich Backoff → `status`) | 3 |
| `queue` | `{}` | Warteschlange geändert (auch Sperre/Freigabe) → UI ruft `get_queue()` | 3 |
| `source` | `{id, checking, name?, last_checked?, new_count?, error?}` | `checking:true` vor, `checking:false` nach der Prüfung einer Quelle; `new_count` = Eingang dieser Quelle, `error` = deutscher Text; `name` (7a) = aktueller Name (bei `name_auto` evtl. ersetzt). Übersprungene Quellen (Plattform im Backoff, SoundCloud aus) nur `{id, checking:false, error}` | 4/7a |
| `run` | `Run` (inkl. `duration`) | ein Lauf ist zu Ende (`DB.finish_run`: GUI-Watchlist-Prüfung, Download-Lauf der Warteschlange; Headless-Läufe sind ein anderer Prozess und senden nichts) | 5 |
| `update` | `UpdateStatus` | jeder Zustandswechsel des App-Updates (Prüfung Start/Ende, Download, bereit, Fehler, Abbruch, Updater gestartet) | Selbst-Update |
| `update_progress` | `{phase, pct, bytes, total}` | Download (höchstens ca. 4×/s, 100 % immer), dann einmal `verify`, einmal `prepare` | Selbst-Update |
| `backfill` | `Backfill` \| `{source_id, state:"none"}` | «Alles einlesen»: bei Start/Fortsetzen (`pending`), Beginn (`running`), nach jeder gespeicherten Seite, Pause, Abbruch, Unterbrechung (`pending` + `note`) und Ende (`done`); `none` = Zeile gibt es nicht (mehr). Die UI aktualisiert nur die Fortschrittszeile der Quelle | 0.4.0 |
| `watchlist_done` | `{checked, found, inbox?}` | Watchlist-Lauf beendet; `checked` = bearbeitete Quellen (auch fehlerhafte), `found` = neu gespeicherte Videos, `inbox` (v0.9.0) = davon neu im Eingang | 4 |
| `festival_assign` | `{phase, scope, done?, total?, assigned?, suggested?, none?, manual?, unchanged?, cancelled?, ok?, error?}` | «Festivals zuordnen»: `phase` `start` (einmal), `progress` (alle 25 Einträge und am Ende), `done` (Ergebnis wie `assign_pass`: `{ok, cancelled, total, done, assigned, suggested, none, manual, unchanged}`) oder `error` (`{ok:false, error}`). Danach lädt die UI Bibliothek/Gruppen neu | 0.3.0 |
| `tracklist_index` | `{phase, scope, done?, total?, sets?, tracks?, cancelled?, ok?, error?}` | «Tracklisten einlesen»: `phase` `start`, `progress` (alle 10 Einträge und am Ende), `done` (`{ok, cancelled, total, done, sets, tracks}`) oder `error` (`{ok:false, error}`). Danach lädt die UI Status, «Meistgespielt» und die Suche neu | 0.6.0 |
| `audio_analysis` | `{phase, scope, done?, total?, analysed?, failed?, cancelled?, ok?, error?}` | «Lautheit & Wellenform analysieren»: `phase` `start`, `progress` (nach jeder Datei), `done` (`{ok, cancelled, total, done, analysed, failed}`) oder `error` (`{ok:false, error}`, z.B. ffmpeg fehlt) | 0.7.0 |
| `media_analysed` | `{id, ok, loudness?, peaks, tagged, tag_deferred?, error?}` | eine Datei analysiert (nach Download oder im Durchlauf); der Player übernimmt `loudness` des laufenden Sets sofort | 0.7.0 |
| `waveform` | `{id, ok, peaks?, duration?, loudness?, error?}` | angeforderte Wellenform (`get_waveform` → `pending`) ist fertig oder fehlgeschlagen | 0.7.0 |
| `collector_rows` | `{edition_id, rows:[ChecklistRow], deleted:[id], reload, stats:ChecklistStats}` | Festival-Sammler: Zeilen geändert (Import, Bearbeiten, Haken, Bestätigen, Treffer des Suchauftrags, Status-Wechsel durch die Queue: `queued` → `downloaded`). `reload:true` (leere `rows`, keine `deleted`) = mehrere Zeilen geändert → `get_checklist` neu holen | 0.5.0 |
| `collector_job` | `CollectorJob` + `{stats}` \| `{edition_id, state:"none", stats}` | Suchauftrag: Start (`pending`), Beginn (`running`), nach jeder Zeile, beim Warten (`note` = nächste Suche), Abbruch, Unterbrechung, Ende | 0.5.0 |
| `collector_import` | `{phase, kind:"playlist", edition_id, entries, added, merged, unchecked, requests, cancelled, error}` | Playlist-Import: `phase` `start`, `progress` (nach jeder Seite), `done` oder `error` (`error` = übersetzter Text) | 0.5.0 |
| `stats_sizes` | `{phase:"progress"\|"done", done, total, missing?, offline?}` (`offline` = Laufwerk/Freigabe nicht erreichbar, bleibt ungemessen) | v0.9.0: fehlende Dateigrössen werden gemessen (nach `get_stats`); `progress` nach je 200 Dateien, danach lädt die UI die Statistik neu | 0.9.0 |
| `media_scan` | `MediaScan` | v0.9.0: ein Plex-/Jellyfin-Scan wurde angefragt (nach Downloads oder `scan_media_server`); bei Fehler zusätzlich `toast` (warn) | 0.9.0 |
| `navigate` | `{view}` | v0.9.0: zweiter Start mit `--open <view>` / Klick auf eine Windows-Benachrichtigung → die UI wechselt die Ansicht | 0.9.0 |
| `playlists_synced` | `{synced, failed}` | gespeicherte Playlists mit «Aktuell halten» wurden neu geschrieben (nach Downloads mit `playlists.sync_after_download` oder per `sync_playlists`); nur gesendet, wenn mindestens eine geschrieben wurde oder fehlschlug. Die UI zeigt einen leisen Toast und lädt die Liste in den Einstellungen neu | 0.8.0 |

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
v0.4.0: nach den Downloads (ohne Backoff) setzt der Lauf offene «Alles einlesen» fort, höchstens
`watchlist.backfill_requests_per_hour` Anfragen (Lock `backfill`; hält ihn die GUI, wird übersprungen);
neue Videos zählen in `found`, Notiz «Alles einlesen: n Quelle(n) fortgesetzt · …».
Exit-Codes (`app/exitcodes.py`): 0 ok · 1 Fehler (Quelle/Download/PO-Token/unerwartet) · 2 Backoff (beim
Start aktiv oder im Lauf ausgelöst) · 3 falsche Argumente · 4 anderer Lauf aktiv (Lauf- oder Watchlist-Lock).

## SoundCloud (Phase 7a)

Plattform = Merkmal jedes Videos/Tracks und jeder Quelle: `platform: "youtube" | "soundcloud"`. Seit v0.10.0 auch `"mixcloud"` und `"hearthis"` (siehe «Re-upload detection, Mixcloud, hearthis.at»).

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
- `Video.geo_blocked` (bool, Review M1): SoundCloud-Track mit API-`policy: BLOCK` (in dieser Region
  gesperrt). Er bleibt in Suche/Liste sichtbar statt die ganze Abfrage abzubrechen; `filter_reason`
  «Nicht verfügbar (Region)» (vor «Nur Vorschau (Go+)»). DB-Spalte `videos.geo_blocked` (Migration 6).
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
