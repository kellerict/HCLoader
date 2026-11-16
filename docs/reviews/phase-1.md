# Review Phase 1 – Gerüst & Kern-Download

- Reviewer: `reviewer` (unabhängig, hat den Code nicht geschrieben)
- Umfang: `git diff 6e1363a..HEAD -- app tests scripts/setup.ps1 scripts/fetch_binaries.ps1 .github pyproject.toml requirements*.txt .gitignore config.example.yaml README.md` (Stand `e3711b0`; `ui/` nicht Teil dieses Reviews)
- Geprüft gegen: CLAUDE.md, SPEC §2, §4–§9, §11 Phase 1, docs/settings-schema.md, yt-dlp 2026.10.26 (`YoutubeDL.py`), bgutil-ytdlp-pot-provider 2.0.2 (`yt_dlp_plugins/extractor/`)
- Werkzeuge: `ruff check .` sauber, `ruff format --check .` sauber, `pytest`: 183 passed. Keine echten Netzwerkzugriffe.

## Ergebnis: ÄNDERUNGEN NÖTIG

1 Blocker, 5 Major, 13 Minor. Die Architektur ist solide (yt-dlp nur in `ytclient.py`, ein zentraler `build_ydl_opts`, Throttle vor jedem `extract_info`, keine yt-dlp-internen Retries, 429/Bot-Check → persistenter Backoff, Tests mocken das Netz). Der Blocker und die Major-Punkte betreffen YouTube-Schonung und Archiv-/DB-Konsistenz und sollten vor dem Merge behoben werden.

---

## Blocker

### B1 – `download()` akzeptiert Playlist-/Kanal-/Such-URLs → Massen-Download am Throttle vorbei
- **Ort:** `app/core/ytclient.py:418-419` (`url = watch_url(vid) if vid else url_or_id.strip()`), `:212` (`noplaylist`)
- **Problem:** Lässt sich keine Video-ID extrahieren, wird die rohe URL mit `download=True` an yt-dlp gegeben. `noplaylist` wirkt nur, wenn die URL Video **und** Playlist enthält (`InfoExtractor._yes_playlist`: ohne `video_id` gibt es `return not video_id` → True). Bei `https://www.youtube.com/playlist?list=…`, `/@kanal`, `/channel/…` oder `ytsearch10:…` lädt yt-dlp deshalb **alle** Einträge nacheinander herunter. Das passiert innerhalb eines einzigen `before_request` und ohne `max_downloads_per_run/day`, ohne Pause zwischen den Downloads und ohne Tagging. Danach findet `_finish` keine Audiodatei (die ID ist die der Playlist) und `_fail` räumt nur `<playlist-id>.*` auf. Die geladenen `<video-id>.mp3` bleiben ungetaggt in `.tmp` liegen. Alle Video-IDs stehen trotzdem im `archive.txt` und werden später für immer als „übersprungen“ behandelt. Erreichbar ist das heute schon über `--smoke <URL>`.
- **Vorschlag:** `download()` nur mit auflösbarer Video-ID zulassen, sonst `YtClientError("Keine Video-URL")` bzw. `DownloadResult(status='failed')` **vor** dem Throttle. Zusätzlich als Absicherung in `_download_opts`: `"max_downloads": 1` und `"playlist_items": "1"` und `info.get("_type") == "playlist"` als Fehler behandeln. Tests für Playlist-, Kanal- und `ytsearch`-URL ergänzen.

---

## Major

### M1 – Migrationen sind nicht atomar (`executescript` committet implizit)
- **Ort:** `app/core/db.py:59-60` (`conn.executescript`), `:115-123` (`BEGIN … commit/rollback`)
- **Problem:** `sqlite3.Connection.executescript()` führt bei Legacy-Transaktionssteuerung zuerst ein `COMMIT` aus. Das `BEGIN` in `migrate()` wird dadurch wirkungslos, und jedes DDL-Statement läuft im Autocommit. Nachgestellt: Schlägt eine Migration nach dem `executescript` fehl, bleiben die Tabellen bestehen und `schema_version` steht auf 0. Beim nächsten Start bricht `migrate()` mit `table videos already exists` ab, die App startet also nicht mehr. Dasselbe Muster würde jede künftige Migration treffen.
- **Vorschlag:** Statements einzeln mit `conn.execute(...)` innerhalb der Transaktion ausführen (DDL ist in SQLite transaktional) oder `BEGIN`, Script und Versions-Update als **ein** `executescript("BEGIN; …; DELETE FROM schema_version; INSERT …; COMMIT;")`. Dazu einen Test mit einer absichtlich fehlschlagenden zweiten Migration, der Rollback und Wiederanlauf prüft.

### M2 – yt-dlp schreibt das Archiv vor dem Taggen/Verschieben → Absturzfenster blockiert ein Video dauerhaft
- **Ort:** `app/core/ytclient.py:262` (`download_archive` an yt-dlp), `:485-487` (`_skip_result` vertraut dem Archiv), `:612-625` (DB `done` erst ganz am Ende)
- **Problem:** yt-dlp ruft `record_download_archive` in `process_video_result` direkt nach `process_info` auf (`YoutubeDL.py:3144`), also nach Download und FFmpeg, aber vor `_finish`. Beendet sich der Prozess in diesem Fenster hart (Fenster geschlossen, Kill, Stromausfall), steht die ID im Archiv, die DB zeigt `downloading` und die Datei liegt in `.tmp` oder ist weg. Beim nächsten Aufruf liefert `_skip_result` „Übersprungen (im Download-Archiv)“, und das Video wird nie mehr geladen. Für normale Exceptions räumt `_fail(archive=True)` korrekt auf, für Abstürze greift das nicht.
- **Vorschlag:** `download_archive` nicht mehr an yt-dlp geben. Die Zeile `youtube <id>` selbst anhängen, und zwar erst nach `set_status(vid, "done")`. Das Archiv bleibt Wahrheit für „bereits geladen“, und es gibt kein Fenster mehr. Alternativ: In `_skip_result` das Archiv ignorieren bzw. bereinigen, wenn die DB-Zeile `downloading`/`failed` ist. Zusätzlich beim Start: hängende `downloading` → `failed` (oder `queued`).

### M3 – Throttle ist nicht thread-sicher
- **Ort:** `app/core/throttle.py:176-194` (`before_request`: `_last_request` lesen → schlafen → schreiben; `search_times` read-modify-write), `:233-239` (`register_download`), `:126-142` (`trigger_backoff`)
- **Problem:** Die DB-Aufrufe sind einzeln gelockt, die zusammengesetzten Operationen aber nicht. Ab Phase 3 laufen Worker-Thread (Download) und pywebview-Thread (Suche/Liste) parallel. Zwei Threads können dann gleichzeitig dieselbe Wartezeit berechnen und praktisch gleichzeitig Requests absetzen (Verletzung von `sleep_requests`), Suchzähler oder Download-Zähler verlieren oder den Backoff doppelt eskalieren. Der Throttle ist laut CLAUDE.md die zentrale Schutzinstanz und muss das selbst garantieren.
- **Vorschlag:** Ein `threading.Lock` in `Throttle`, gehalten über `before_request` einschliesslich Sleep, damit Requests seriell und mit Abstand laufen, über `register_download`, `trigger_backoff`/`handle_error` und `start_run`. Für mehrere Prozesse (siehe m13) DB-seitig `BEGIN IMMEDIATE` um die Zähler-Updates. Dazu ein Test mit zwei Threads und Fake-Clock.

### M4 – Pause zwischen Downloads (`sleep_interval`/`max_sleep_interval`) wird im Download-Pfad nicht erzwungen
- **Ort:** `app/core/ytclient.py:195` (Docstring: „sleep_interval is deliberately not used: the throttle paces downloads“), `:405-477` (`download()` ruft nur `before_request("download")`, das nur `sleep_requests` = 3 s wartet), `app/core/throttle.py:246-251` (`sleep_between_downloads` wird nirgends aufgerufen)
- **Problem:** Laut Docstring übernimmt der Throttle das Pacing, tatsächlich muss es aber jeder Aufrufer selbst machen. Zwei direkt aufeinanderfolgende `download()`-Aufrufe liegen nur 3 s auseinander statt 30–120 s. Ein künftiger Worker oder Headless-Lauf, der den Aufruf vergisst, umgeht die Regel unbemerkt (CLAUDE.md §1: „Neue Features dürfen diese Regeln nie umgehen“).
- **Vorschlag:** Pacing zentral im Throttle: Ende des letzten Downloads in `state` persistieren (`last_download_end`). In `before_request("download")` wird die verbleibende zufällige Pause bis `uniform(sleep_interval, max_sleep_interval)` abgewartet, abbrechbar über ein Event. Alternativ `sleep_interval`/`max_sleep_interval` an yt-dlp übergeben. Das wirkt aber nur innerhalb einer YoutubeDL-Instanz und reicht deshalb hier nicht.

### M5 – Fehlgeschlagene Download-Versuche zählen nicht gegen die Limits
- **Ort:** `app/core/ytclient.py:626` (`register_download()` nur in `_finish`), `app/core/throttle.py:233-234` (Docstring „finished (or attempted)“)
- **Problem:** `max_downloads_per_run/day` zählen nur Erfolge. Eine Queue mit 30 Videos, die alle mit 403 scheitern (typisch bei fehlendem PO-Token), erzeugt 30 vollständige Player-/Download-Versuche hintereinander. Genau dieses Muster löst Sperren aus. Code und Docstring widersprechen sich.
- **Vorschlag:** Den Versuch zählen, sobald `before_request("download")` den Request freigegeben hat (unabhängig vom Ausgang, ohne Skips), oder ein separates Limit für Fehlversuche pro Lauf (z. B. Lauf nach 3 Fehlern in Folge abbrechen). Test ergänzen.

---

## Minor

| # | Ort | Problem | Vorschlag |
|---|---|---|---|
| m1 | `app/core/throttle.py:151` / `app/main.py:80-95` | `reset_backoff()` wird nirgends aufgerufen. SPEC §5 verlangt „Reset nach erfolgreichem Lauf“, das Level wächst sonst über Monate. | Im Smoke-Pfad nach `result.ok` aufrufen. Für Phase 3/4 im Worker/Run-Abschluss verankern (Hinweis in PROGRESS.md). |
| m2 | `app/core/ytclient.py:601-610` | Fehler nach `shutil.move` (z. B. `write_cue`, `cover.jpg`, OSError) führen über `_fail` zu DB `failed` und Entfernen aus dem Archiv, obwohl die MP3 schon am Ziel liegt. Der nächste Versuch lädt erneut. | Schritte nach dem Move als nicht-fatal behandeln (Warnung loggen, Status trotzdem `done`). |
| m3 | `app/core/ytclient.py:434`, `:643`, `:264-265` | `.tmp` wird vor jedem Versuch und bei jedem Fehler/Abbruch geleert, damit auch `.part`. `continuedl=True` greift nur innerhalb des einen Netzwerk-Retrys. Ein manueller „Wiederholen“ lädt einen 300-MB-Mix komplett neu. | Bei Netzwerkfehler/Abbruch `.part` behalten und erst bei Erfolg oder 403 aufräumen, so dass der manuelle Retry fortsetzt (schont YouTube). |
| m4 | `app/core/ytclient.py:647-648` | Ein Abbruch landet in der DB als `failed` + „Abgebrochen“. Hängende `downloading`-Zeilen (Absturz) werden nie zurückgesetzt. | Abbruch → `queued` (oder voriger Status). Beim Start `downloading` → `failed`. |
| m5 | `app/core/ytclient.py:160-173`, `:346`, `:472` | Backoff greift nur bei der finalen Exception. yt-dlp meldet 429 oft zuerst als Warnung (Client-Fallback) und versucht weitere Clients/Requests. | In `_YdlLogger.warning` `is_rate_limit_error` prüfen, ein Flag setzen und nach dem Aufruf `trigger_backoff`. Optional den Aufruf abbrechen (Exception aus dem Logger). |
| m6 | `app/core/paths.py:156-157` | Pfadlänge in Python-Codepoints, Windows zählt UTF-16-Einheiten. Emojis/Symbole in Mix-Titeln zählen doppelt, dadurch sind > 260 möglich. `_RESERVED` ohne `CONIN$`/`CONOUT$`. | `len(str(p).encode("utf-16-le")) // 2` verwenden, Test mit Emoji-Titel. Reservierte Namen ergänzen. |
| m7 | `app/core/binaries.py:189-208` | Der HTTP-Provider wird gestartet und sofort benutzt, ohne auf Bereitschaft zu warten. Der erste Request läuft ggf. ohne PO-Token (riskant bzgl. Bot-Check). | Nach `Popen` lokal `GET /ping` bis ca. 10 s abwarten (nur 127.0.0.1, kein YouTube). Bei Timeout Fehler melden. |
| m8 | `app/core/ytclient.py:307-311` | `TOKEN_TTL` wird global in `os.environ` gesetzt. Ob der Script-Modus (`generate_once.ts`) diese Variable auswertet, ist im Repo nicht belegt. Nicht-ganzzahlige Werte (`0.5`) parst der Server vermutlich als `parseInt` → 0. | Gegen die Provider-Doku 2.0.2 verifizieren und im Code-Kommentar belegen. TTL ggf. als ganze Stunden validieren (Schema-Abweichung mit Orchestrator klären). |
| m9 | `scripts/fetch_binaries.ps1:201` | `Move-Item` eines Ordners von `%TEMP%` (C:) in ein Repo auf einem anderen Laufwerk scheitert unter PS 5.1 (nur ZIP-Fallback ohne git). Downloads werden nicht per Prüfsumme verifiziert. | `Copy-Item -Recurse` + Aufräumen. SHA256 für ffmpeg (gyan.dev liefert `.sha256`) und deno (`.sha256sum`) prüfen. |
| m10 | `scripts/setup.ps1:35` | `py -3.12` verlangt exakt 3.12. Mit nur 3.13 installiert schlägt das fehl, danach greift der `python`-Fallback (eventuell falsches Python im PATH). | `py -3` + die vorhandene Versionsprüfung `>= (3,12)`. |
| m11 | `.gitignore` | `.tmp/`, `*.part`, `*.ytdl`, `*.webm`, `*.cue`, `config.yaml.tmp` fehlen (relevant, falls der Zielordner testweise im Repo liegt). | Ergänzen. |
| m12 | SPEC §11 / `README.md:11` | `scripts/ui_screenshots.py` (Phase-1-Lieferobjekt) fehlt. README verweist auf das nicht existierende `docs/screenshots/discover.png`. | Mit dem UI-Teil nachliefern oder den Verweis bis dahin entfernen. |
| m13 | `app/main.py:33-35` | Single-Instance ist ein Platzhalter. GUI und geplanter Headless-Lauf könnten parallel laufen: zwei Throttle-Instanzen, parallele Downloads, Zähler-Races. | Spätestens in Phase 2/4 ein prozessweites Lock (Named Mutex/Lockfile in `%APPDATA%\HCLoader`). Headless bricht ab, wenn die GUI läuft (oder delegiert). |
| m14 | `app/core/tagging.py:172` | CUE als UTF-8 ohne BOM. foobar2000 und einige Player lesen BOM-lose CUEs als ANSI, Umlaute werden zerstört. | `encoding="utf-8-sig"`. |
| m15 | `app/core/config.py:524-527` | Eine unlesbare `config.yaml` wird beim Speichern kommentarlos überschrieben. | Vorher `config.yaml.bak` anlegen. |

---

## Geprüft und in Ordnung

- **Modulgrenzen:** `yt_dlp` wird nur in `app/core/ytclient.py` importiert. `core/` hat keinen UI-Bezug (`webview` nur in `app/main.py`). `api.py` gibt es noch nicht.
- **yt-dlp-Optionen gegen `YoutubeDL.py` 2026.10.26:** `js_runtimes` im Format `{runtime: {config}}` (Z. 544, 863 ff.), `remote_components` bleibt ungesetzt, ejs kommt aus `yt-dlp[default]`. `sleep_interval_requests` wird in `extractor/common.py:872` ausgewertet. `retries`/`fragment_retries`/`extractor_retries` = 0, die YouTube-API retryt 403/429 ohnehin nicht. `ratelimit`, `paths`/`outtmpl`, `writethumbnail`, `cookiesfrombrowser` als Tupel, `ffmpeg_location` und `extract_flat="in_playlist"` + `lazy_playlist` sind korrekt.
- **bgutil 2.0.2:** `youtubepot-bgutilscript:server_home` (→ `src/generate_once.ts`, `node_modules`) und `youtubepot-bgutilhttp:base_url` stimmen mit dem Plugin überein. Deno-Pfad kommt über `js_runtimes.deno.path` (Plugin liest `traverse_obj(js_runtimes, ('deno','path'))`). Modus „off“ setzt `youtube:fetch_pot=never`. Das HTTP-Startkommando entspricht der Provider-Doku (`cd server/node_modules; deno run --allow-env --allow-net --allow-ffi=. --allow-read=. ../src/main.ts --port N`).
- **Retry-Regel SPEC §5:** Genau 1 Retry nur bei Netzwerkfehler, keiner bei 403/429/Bot-Check. Der Retry läuft erneut durch `before_request`. Die Bot-Check-Regex deckt den typografischen Apostroph ab. Backoff 6 h → ×2 → max. 48 h wird in `state` persistiert. Kein Eskalieren während eines aktiven Backoffs, manuelles Aufheben behält das Level.
- **Abbruch:** `DownloadCancelled` aus Progress- und Postprocessor-Hook. `.tmp/<id>.*` wird aufgeräumt (inkl. `.part`, `.ytdl`, Thumbnail), ein bereits geschriebener Archiv-Eintrag wird entfernt.
- **Tags:** ID3v2.4 mit TIT2/TPE1/TPE2/TALB/TRCK=1/TCON/TDRC/COMM/TXXX:YOUTUBE_ID/TXXX:SOURCE/APIC(type 3), CHAP/CTOC. Das CUE-Format `MM:SS:FF` mit 75 fps und `FILE … MP3` ist korrekt. Das quadratische Cover entsteht per ffmpeg-Crop.
- **Pfade:** Ungültige Zeichen, Steuerzeichen, Punkt/Leerzeichen am Ende und reservierte Namen werden behandelt. `..` und Laufwerksangaben im Template werden neutralisiert. `{id}` ist Pflicht und wird nie gekürzt. Titel max. 120, Gesamtpfad < 240.
- **Hygiene:** Keine Cookies/Tokens/Binaries/Benutzerpfade im Repo. `bin/`, `.venv/`, `*.db`, `config.yaml`, `archive.txt`, Logs und Medien sind ignoriert. `config.example.yaml` stimmt byte-genau mit `render_yaml(defaults())` überein.
- **PowerShell:** PS-5.1-kompatibel (kein `??`/Ternary, reines ASCII), TLS 1.2 erzwungen. Die URLs für deno (latest, `x86_64-pc-windows-msvc.zip`) und gyan.dev (release essentials) stimmen. Der Provider wird in genau der pip-Plugin-Version geklont, und der Versionsstempel macht das Skript idempotent. `deno install --allow-scripts=npm:canvas --frozen` entspricht der Provider-Doku.
- **Konfigurierbarkeit:** Alle Schlüssel aus `docs/settings-schema.md` (SPEC §4–§8) sind im pydantic-Modell mit Grenzen und deutschen Fehlermeldungen enthalten. Die Erreichbarkeit in der GUI ist Gegenstand von Phase 2 und hier nicht bewertet.
- **CI:** `windows-latest`, Python 3.12, `ruff check`, `ruff format --check` und `pytest` bei Push/PR.

---

## Runde 2

- Umfang: Fix-Commit `653fe76` („fix: address phase 1 review …“) und Folgestand bis `9c044c9`, ohne `ui/`. Begründungen aus `docs/decisions.md`.
- Werkzeuge: `pytest` 238 passed, `ruff check` und `ruff format --check` sauber. Keine Netzwerkzugriffe. Zusätzlich ein lokales Skript gegen `Throttle` (In-Memory-DB), das N1 nachstellt.

### Ergebnis: ÄNDERUNGEN NÖTIG

Alle 21 Funde aus Runde 1 sind behoben bzw. die Abweichung ist begründet. Die Fixes bringen aber zwei neue Major-Funde mit (N1 hebelt den Backoff aus, N2 bricht das Setup auf Windows PowerShell 5.1). Beide lassen sich klein beheben.

### Status der Funde aus Runde 1

| ID | Status | Prüfung |
|---|---|---|
| B1 | behoben | `ytclient.py:462-468`: Ohne Video-ID → `failed` vor Skip-Prüfung und Throttle. Die URL wird immer per `watch_url(vid)` neu gebaut, dazu `playlist_items: "1"` (`:279`) und eine `_type == "playlist"`-Prüfung (`:370`). Tests für Playlist, Kanal und `ytsearch` (`test_download_refuses_non_video_urls_before_throttle`). **Abweichung `max_downloads` akzeptiert:** In `YoutubeDL.py` zählt `process_info` `_num_downloads` hoch (Z. 3357) und ruft am Ende `check_max_downloads()` auf (Z. 3677). `process_video_result` fängt das ab, beendet die Postprozessoren und wirft dann `MaxDownloadsReached` erneut (Z. 3131-3149). `extract_info` liefert damit bei `max_downloads: 1` nach dem ersten erfolgreichen Download kein Info-Dict. Die Begründung stimmt. Da die URL immer aus der ID gebaut wird, ist die Absicherung ausreichend. Die `_type`-Prüfung greift erst nach dem Download und ist nur ein Netz unter dem Netz. |
| M1 | behoben | `db.py:59-89`: einzelne `execute()`, `isolation_level=None`, `BEGIN … commit/rollback`. Tests prüfen Rollback und Wiederanlauf (`test_failing_migration_rolls_back_and_restarts`, `test_failing_first_migration_leaves_clean_db`). |
| M2 | behoben | Kein `download_archive` an yt-dlp. `_record_archive` läuft erst nach `set_status(done)` (`ytclient.py:710-711`). `_skip_result` prüft DB `done` und das eigene Archiv. Das Format `youtube <id>` bleibt yt-dlp-kompatibel. Beim Start wird `downloading` → `failed` gesetzt, aber nur, wenn der Lauf-Lock frei ist (`main.py`). |
| M3 | behoben (prozessintern) | `RLock` über Zähler, Backoff und Request-Abstand inkl. Sleep, separater `_dl_lock` für die lange Pause. Lock-Reihenfolge immer `_dl_lock` → `_lock`, ein umgekehrter Pfad existiert nicht, also kein Deadlock. `trigger_backoff` im `finally` von `_extract` läuft ausserhalb der Throttle-Locks. Thread-Tests vorhanden. Zwischen Prozessen siehe N5. |
| M4 | behoben | `before_request("download")` wartet `uniform(sleep_interval, max_sleep_interval)` ab dem persistierten `last_download_end`, abbrechbar über `cancel_event` (`WaitCancelled`). `mark_download_end` wird im `finally` gesetzt, sobald das Netz erreicht wurde. Suchen blockieren während der Pause nicht. |
| M5 | behoben | Gezählt wird atomar mit der Limitprüfung in `_request_slot`. Fehlversuche zählen, Skips nicht, der Netzwerk-Retry (`retry=True`) zählt nicht doppelt und prüft nur den Backoff. Tests vorhanden. |
| m1 | **teilweise, neuer Fehler** | `finish_run(success)` ist eingeführt und im Smoke-Pfad verdrahtet, setzt aber auch einen **im selben Lauf** ausgelösten Backoff zurück → N1. |
| m2 | behoben | Nach `shutil.move` sind CUE und `cover.jpg` nicht mehr fatal (`ytclient.py:681-695`). Test `test_cue_failure_after_move_still_done`. |
| m3 | behoben | `.part`/`.ytdl` bleiben bei Netzwerkfehler und Abbruch erhalten, bei 403/429 werden sie entfernt. `continuedl` setzt fort. Restrisiko siehe N4. |
| m4 | behoben | Ein Abbruch stellt den vorigen Status wieder her (`downloading` → `queued`). Der Throttle-Refusal ebenso. Hängende `downloading` werden beim Start zurückgesetzt. Kosmetik siehe N7. |
| m5 | behoben | `_YdlLogger._watch` merkt sich 429/Bot-Check aus Warnungen und Fehlern. `_extract` löst im `finally` den Backoff aus, auch bei Metadaten-Aufrufen. Ein Abbruch des laufenden Aufrufs ist weiterhin nicht umgesetzt (war optional). |
| m6 | behoben | `windows_length` (UTF-16-Einheiten), `CONIN$`/`CONOUT$` ergänzt, Test mit Emoji. |
| m7 | behoben | `wait_ready` pollt `/ping` (nur 127.0.0.1, ohne Proxy) bis 10 s, bricht ab, wenn der Prozess stirbt, und stoppt den Server bei Timeout. Tests vorhanden. |
| m8 | behoben | TTL in ganzen Stunden, `max(1, round(x))`, begründet in decisions.md. Offen bleibt der Schema/GUI-Hinweis „ganze Stunden“ beim Orchestrator. |
| m9 | behoben | `Copy-Item -Recurse` statt `Move-Item`. SHA256 für deno und ffmpeg wird geprüft. Ohne Prüfsumme wird nur gewarnt (siehe N6). |
| m10 | **behoben, neuer Fehler** | Versionswahl über `py -3.13/-3.12/-3` mit Versionsprüfung, aber die Probe bricht unter PS 5.1 ab → N2. |
| m11 | behoben | `.gitignore` ergänzt (`.tmp/`, `*.part`, `*.ytdl`, `*.webm`, `*.cue`, `config.yaml.tmp`, `config.yaml.bak-*`). |
| m12 | behoben | `scripts/ui_screenshots.py` ist vorhanden, `docs/screenshots/discover.png` ist versioniert. |
| m13 | behoben (mit Einschränkung) | `app/core/locks.py`: Single-Instance und Lauf-Lock. Smoke und Headless verweigern mit `EXIT_BUSY`. Die Tests decken den Datei-Lock und einen gemockten Mutex ab. Namensraum des Mutex siehe N3. |
| m14 | behoben | `utf-8-sig`. |
| m15 | behoben | `config.yaml.bak-<Zeitstempel>` vor dem Überschreiben einer unlesbaren Datei. Test für den Gegenfall (keine Sicherung bei lesbarer Datei). |

### Neue Funde

#### Major

**N1 – `finish_run(True)` löscht einen Backoff, der im selben Lauf ausgelöst wurde**
- **Ort:** `app/core/throttle.py:172-179`, `app/main.py:92`, Vorgabe für den Phase-3-Worker in `docs/decisions.md` („Prozess-Locks“)
- **Problem:** `finish_run(success=True)` ruft ohne Prüfung `reset_backoff()` auf. Seit m5 löst schon eine yt-dlp-**Warnung** mit 429/Bot-Check den Backoff aus, während der Download über einen anderen Client trotzdem `done` liefern kann. Im Smoke-Pfad wird der Backoff dann unmittelbar wieder gelöscht und das Level auf 0 gesetzt. Nachgestellt: `trigger_backoff("HTTP Error 429")` → `backoff_until` = +6 h, Level 1. Nach `finish_run(True)` ist `backoff_until` `None` und das Level 0. Für den Phase-3/4-Worker ist „Erfolg“ als „mindestens ein Download ging durch“ dokumentiert. Ein Lauf mit 5 Erfolgen und 429 beim sechsten würde den Backoff also am Laufende aufheben, und der nächste Lauf (Intervall, Aufgabenplanung) fragt YouTube sofort wieder an. Das umgeht die Kernregel aus CLAUDE.md §1.
- **Vorschlag:** Nur zurücksetzen, wenn im Lauf kein Backoff ausgelöst wurde. Zum Beispiel `start_run()` merkt sich das Level bzw. den Zeitpunkt, und `finish_run` setzt nur zurück, wenn `backoff_until() is None` und das Level seit `start_run` unverändert ist. Docstring und decisions.md anpassen („erfolgreich“ = ohne Sperre). Tests: Backoff während des Laufs + `finish_run(True)` → Backoff bleibt. Smoke mit Warn-429 und `done` → Backoff bleibt.

**N2 – `setup.ps1`: Python-Probe mit `2>$null` bricht unter Windows PowerShell 5.1 ab**
- **Ort:** `scripts/setup.ps1:16` (`$ErrorActionPreference = 'Stop'`), `:37-38` (`& py $sel -c $versionCheck 2>$null`)
- **Problem:** In Windows PowerShell 5.1 werden stderr-Zeilen eines nativen Befehls bei Umleitung (`2>$null`, `2>&1`) zu ErrorRecords. Mit `ErrorActionPreference = 'Stop'` wird daraus ein abbrechender Fehler (`NativeCommandError`). Erst PS 7.2+ wendet die Preference nicht mehr auf stderr an. Ist Python 3.13 nicht installiert, schreibt der `py`-Launcher „No suitable Python runtime found …“ auf stderr. Das Setup bricht dann beim ersten Kandidaten ab, statt mit `-3.12` weiterzumachen. Betroffen ist genau der Standardfall „nur 3.12 installiert“. Der alte Code (`& py -3.12 -m venv` ohne Umleitung) hatte das Problem nicht. Bitte auf einem echten PS 5.1 bestätigen, CI testet die Skripte nicht.
- **Vorschlag:** Die Probe in einem Block mit lokal `$ErrorActionPreference = 'Continue'` ausführen (danach zurücksetzen), oder ohne Umleitung über `cmd /c "py $sel -c ""…"" 2>nul"`. Alternativ die installierten Versionen per `py -0p` ermitteln. Prüfen, ob es weitere `2>`-Umleitungen bei nativen Befehlen gibt (derzeit nur diese Stelle).

#### Minor

| # | Ort | Problem | Vorschlag |
|---|---|---|---|
| N3 | `app/core/locks.py:88` | Der Mutex liegt in `Local\`, also pro Anmeldesitzung. Eine geplante Aufgabe mit „Unabhängig von der Benutzeranmeldung ausführen“ läuft in Sitzung 0. GUI und Headless-Lauf sehen dann verschiedene Mutexe, und der Lauf-Lock schliesst sie nicht gegenseitig aus. Relevant ab Phase 4 (`schtasks`). | `Global\HCLoader.<User-SID>.<name>` verwenden, oder auf Windows zusätzlich immer den Datei-Lock unter `%APPDATA%\HCLoader\locks` nehmen (sitzungsübergreifend, Freigabe beim Prozessende durch das OS). Alternativ die Aufgabe in Phase 4 nur mit „Nur ausführen, wenn Benutzer angemeldet ist“ anlegen und das dokumentieren. |
| N4 | `app/core/ytclient.py:281` | Mit `outtmpl` `%(id)s.%(ext)s` und behaltenen `.part`-Dateien hängt `continuedl` (Range ab Dateigrösse, `downloader/http.py:59-85`) an eine Teildatei an, auch wenn der neue Versuch ein anderes Format mit gleicher Endung wählt (z. B. itag 251/250, beide `webm`, etwa nach einem Client-Fallback). Das Ergebnis wäre eine korrupte Datei. Ausserdem bleiben `.part` von nie wiederholten Videos unbegrenzt in `.tmp`. | Die Format-ID in den Temp-Namen aufnehmen (`%(id)s.f%(format_id)s.%(ext)s`, `_find_audio`/`_cleanup_tmp` arbeiten schon mit dem Präfix `<id>.`) und beim Start `.part`/`.ytdl` älter als N Tage in `.tmp` löschen. |
| N5 | `app/core/throttle.py:98`, `:252-257` | Der Request-Abstand (`_last_request`) ist prozesslokal, `search_times` wird ohne `BEGIN IMMEDIATE` gelesen und geschrieben. Der Lauf-Lock schützt nur Downloads. Suchen/Auflösen in der GUI und Listen-Requests eines Headless-Laufs (Phase 4) laufen über verschiedene Prozesse ohne gemeinsamen Abstand, und ein paralleler `trigger_backoff` kann doppelt eskalieren. | Für Phase 4: `last_request` in `state` persistieren und die Zähler-Updates in `BEGIN IMMEDIATE` fassen, oder Headless delegiert an die laufende GUI. Bis dahin die Annahme in decisions.md präzisieren („nur Downloads prozessübergreifend exklusiv“). |
| N6 | `scripts/fetch_binaries.ps1:51-60` | Ist die Prüfsumme nicht abrufbar, wird nur gewarnt, und die unverifizierte Binary wird installiert (fail-open). | Ohne Prüfsumme abbrechen, mit Schalter `-SkipChecksum` für den Notfall. |
| N7 | `app/core/ytclient.py:720` | Ein Abbruch setzt den vorigen Status (z. B. `queued`) zurück, schreibt aber `error="Abgebrochen"`. Je nach UI-Logik erscheint ein wartendes Video mit Fehlertext. | Bei Rückfall auf `queued`/`new`/`inbox` `error=None` oder den vorigen Fehler setzen. |
| N8 | `app/core/throttle.py:104`, `:232` | Das Warten auf `_dl_lock` ist nicht abbrechbar. Ein zweiter Download-Thread im selben Prozess hängt bis zu `max_sleep_interval` (+ Request-Abstand), ohne dass `cancel_event` wirkt. Mit einem einzigen Worker (geplant) unkritisch. | Im Phase-3-Worker genau einen Download-Thread garantieren (Kommentar/Assertion), oder `_dl_lock.acquire(timeout=…)` in einer Schleife mit Prüfung des `cancel_event`. |
| N9 | `app/core/ytclient.py:92-93` | `extract_video_id` akzeptiert jeden 11-Zeichen-String aus `[0-9A-Za-z_-]` als ID (z. B. `hardcoremix`). Ein Tippfehler im Smoke/CLI erzeugt einen gezählten Download-Versuch auf ein nicht existierendes Video. Harmlos, aber unnötig. | Nur dokumentieren, oder in der GUI ausschliesslich IDs aus Suchergebnissen/DB verwenden. |

### Freigabe-Bedingungen

N1 und N2 beheben (jeweils mit Test bzw. manueller Prüfung unter PS 5.1). N3 und N5 spätestens in Phase 4 lösen, N4 und N6–N9 nach Ermessen.
