# Review Phase 3 – Entdecken & Downloads

- Reviewer: `reviewer` (unabhängig, hat den Code nicht geschrieben)
- Umfang: `git diff 1d22447..e48b7e4` (Commits nach „docs: close phase 2, extend settings schema …“ bis HEAD):
  `app/worker.py` (DownloadQueue, run_session), `app/api.py`, `app/core/{discover,filters,ytclient,db,throttle,
  binaries,maintenance,scheduler,config}.py`, `app/main.py`, `ui/` (index.html/CSP, util, components, discover,
  downloads, settings, bridge), Tests, Doku.
- Geprüft gegen: CLAUDE.md, SPEC §3.1, §3.3, §4–§6, §9, §11, `docs/settings-schema.md` (Phase-3-Entscheid
  Jahr/Zeitraum), `docs/decisions.md`, `docs/bridge-api.md`, `docs/reviews/phase-2.md`,
  yt-dlp `extractor/youtube/_tab.py` / `common.py` und pywebview 6.2.1 `window.py` / `js/api.js` im lokalen venv.
- Werkzeuge: `ruff check .` sauber, `ruff format --check .` sauber, `pytest`: 414 passed. Kein Netzwerkzugriff.

## Ergebnis: ÄNDERUNGEN NÖTIG

0 Blocker, 1 Major, 7 Minor, 7 Nits. Die Architektur stimmt: genau ein aktiver Download, Lauf-Lock,
Limits, Backoff und Pausen laufen sauber über den Throttle. Der Major-Punkt M1 ist ein Korrektheitsfehler
im Kernfluss der Phase (Suche mit Genre-Chip → Download): Das Genre stimmt dann nicht. Die Korrektur ist klein.
Danach kann freigegeben werden.

### Was gut ist

- **YouTube-Schonung:**
  - Jeder yt-dlp-Aufruf geht durch `YtClient._extract`: `check_backoff`, dann `before_request(kind)`.
  - Die Suche zählt gegen `max_searches_per_hour`, und zwar atomar im Throttle-Lock vor dem Request.
  - Für Downloads gilt: `check_download`, dann `_dl_lock` mit der Zufallspause, dann `_request_slot` mit
    Limitprüfung und Zählung im selben Lock. Fehlversuche zählen gegen Lauf- und Tageslimit. Der eine
    Netzwerk-Retry zählt nicht doppelt, und bei 403/429 gibt es keinen Retry.
  - `retries`/`fragment_retries`/`extractor_retries` = 0, `socket_timeout` 30, `sleep_interval_requests`
    gesetzt.
  - Ein 429 bzw. Bot-Check (Exception oder Logger-Warnung) löst den Backoff aus. Die Queue sieht ihn beim
    nächsten Schleifendurchlauf (`_download_block`) und beendet den Lauf. Ein fehlgeschlagener Eintrag
    bleibt `failed` und wird nie automatisch wiederholt.
  - Ich habe keinen Netzwerkzugriff am Throttle vorbei gefunden. Die Thumbnails sind bewusst entschieden
    (decisions.md) und auf `https://*.ytimg.com` beschränkt.
- **DownloadQueue:**
  - Es gibt genau einen Queue-Thread und genau einen aktiven Download.
  - `run_session` hält den prozessweiten Lauf-Lock und ruft immer `finish_run(success)` auf, auch bei
    Ausnahmen.
  - Die Pause zwischen Downloads ist doppelt erzwungen: in der Queue mit Countdown, abbrechbar, Eintrag
    bleibt `queued`, und als Netz in `before_request("download")`. Sie ist persistiert (`last_download_end`)
    und gilt auch nach Fehlversuchen und Abbrüchen.
  - Wird der wartende Eintrag abgebrochen, gilt die Restpause für den nächsten. Pause/Fortsetzen würfelt
    die Pause nicht neu.
  - Abbruch: Bei Benutzerabbruch geht der Eintrag nach `new`, `queue_pos` = NULL, `.part` bleibt. Beim
    Programmende bleibt der Eintrag `queued` (Status-Restore in `YtClient._cancelled`). Hängt ein Eintrag
    in `downloading`, wird er beim Start zu `failed` („Unterbrochen“), aber nur mit Lauf-Lock.
  - Kein Deadlock-Pfad gefunden:
    - Die Queue-Locks werden nie um Throttle-Aufrufe gehalten.
    - `snapshot`/`blocked`/`status()` nehmen den Throttle-Lock nicht.
    - Der einzige längere Halt unter dem Throttle-`_lock` ist der `sleep_requests`-Abstand (≤ 60 s).
    - Die lange Download-Pause liegt unter dem separaten `_dl_lock`.
- **Migration 2:**
  - Läuft atomar in `BEGIN … COMMIT` mit Rollback (ALTER TABLE ist in SQLite transaktional).
  - Bestandsdaten: `queue_pos` wird für `queued`/`downloading`/`failed` nach `first_seen` dicht nummeriert,
    `date_approx` steht per Default auf 0.
  - Getestet (`test_migration_2_numbers_existing_queue`, Rollback-Tests).
- **Upsert-Logik:** Ein ungefähres Datum überschreibt nie ein exaktes. Ein exaktes Datum setzt
  `date_approx = 0` (im Integrationstest geprüft).
- **`approximate_date`:** Korrekt gegen `_tab.py:156` und `:387` geprüft. Dort steht
  `self._configuration_arg('approximate_date', ie_key=YoutubeTabIE)`. `_configuration_arg` (common.py:4040)
  liest `extractor_args['youtubetab']['approximate_date']` als Liste, und `['']` ist truthy.
  `YoutubeSearchIE` erbt von `YoutubeTabBaseInfoExtractor`, deshalb greift das Argument auch bei `ytsearchN:`.
  Es wird nur für `search`/`list` gesetzt.
- **Jahr-/Zeitraum-Logik:** Entspricht dem Schema-Entscheid: Jahr als eigenes Wort im Titel ODER (ungefähres)
  Jahr ±1, `custom` mit ±365 Tagen bei ungefährem Datum, unbekanntes Datum wird verworfen. Python (`filters.py`)
  und JS (`util.inUploadPeriod`, `titleHasYear`) sind semantisch gleich.
- **`build_search_query`:** Höchstens 2 Genre-Begriffe, keine Duplikate zum Query und kein doppeltes Jahr.
  `clean_options` lässt nur bekannte Genres und plausible Jahre durch.
- **Job Object (m11):**
  - Die ctypes-Strukturen `JOBOBJECT_BASIC_LIMIT_INFORMATION`, `IO_COUNTERS` und
    `JOBOBJECT_EXTENDED_LIMIT_INFORMATION` stimmen in Feldreihenfolge und -typen (LARGE_INTEGER, DWORD,
    SIZE_T/ULONG_PTR).
  - Klasse 9 = `JobObjectExtendedLimitInformation` und `0x2000` = `KILL_ON_JOB_CLOSE` sind korrekt.
  - `argtypes`/`restype` sind gesetzt, Fehler werden best effort behandelt.
  - `--host 127.0.0.1` wird übergeben, und ein belegter Port wird gemeldet statt übernommen.
- **CSP / `'unsafe-eval'`:** Begründet und nötig. pywebview 6.2.1 wickelt `evaluate_js` in `eval("…")` ein
  (`webview/window.py:463/477`), und `js/api.js:75` baut die API mit `new Function`. Inline-Skripte,
  Inline-Handler (`onerror` ersetzt durch Capture-Listener) und fremde Skriptquellen bleiben gesperrt.
- **XSS:** Alle neuen Render-Stellen escapen:
  - `effective_query` (`discover.js:157`), `blocked_reason` (`downloads.js:184`), Fehlertexte der Queue
    (`downloads.js:84`) und `q.target`.
  - `t('phase.' + …)`, `status`-Klassen und Watchlist-Typ (n2 erledigt).
  - Task-Fehler (`settings.js:396`). Toasts escapen selbst.
  - `safeThumb` lässt nur `https:` ohne Userinfo und Port auf `(*.)ytimg.com` zu.
- **Hygiene:** Keine Secrets, Cookies, Binaries oder Userpfade im Diff. Kein „ß“ in neuen UI- und Log-Texten.
- **Konfigurierbarkeit:** Alle 52 Schlüssel aus `Settings().to_dict()` sind in `settings.js` vorhanden
  (maschinell abgeglichen), einschliesslich `search.append_year` und `filters.upload_{period,year,from,to}`.
- **Review-Punkte Phase 2:** Erledigt sind m1, m2, m3, m4, m6, m7, m8, m9, m10, m11, m12 sowie n1, n2, n3,
  n4, n5. **m5 ist nicht erledigt** (siehe m1 unten).

---

## Major

### M1 – Genre aus dem Such-Chip geht beim Download verloren: Datei landet in „Unsortiert“, UI zeigte „Hardcore“
- **Ort:** `app/core/discover.py:79` (Hint wird als nicht-manuelles `genre` gespeichert),
  `app/core/ytclient.py:685-691` (`_finish` ermittelt das Genre neu, nur aus `manual`/`source_default`/Keywords)
  und `:764-775` (upsert überschreibt das DB-Genre), `app/worker.py:898-925` (`_target_folder` zeigt das DB-Genre)
- **Problem:**
  - Laut decisions.md gilt für Suchtreffer: „manuell > Keyword > Genre-Chip der Suche > Unsortiert“.
  - Ein Treffer ohne Genre-Keyword im Titel (in der Szene häufig, z.B. „Partyraiser @ Dominator 2024“),
    gefunden mit Chip „Hardcore“, steht in Discover und in der Warteschlange als Hardcore. Das Zielordner-
    Feld zeigt `Hardcore\…`.
  - `_finish` ignoriert das gespeicherte Genre aber, weil `genre_manual` = 0 ist. Die MP3 bekommt deshalb
    `TCON=Unsortiert`, landet in `Unsortiert\…`, und die DB wird auf „Unsortiert“ zurückgesetzt.
  - Kein Test deckt das ab: Im Integrationstest haben alle geladenen Titel ein Keyword.
  - Zweite Seite desselben Problems: `store_results` überschreibt das Genre bestehender Zeilen bei jeder
    Suche, auch bei `done`/`queued`. Eine spätere Suche ohne bzw. mit anderem Chip ändert das DB-Genre einer
    bereits abgelegten Datei. Bibliothek und Dateiablage bzw. TCON laufen dann auseinander.
- **Vorschlag:**
  - In `_finish` das bestehende nicht-manuelle DB-Genre als Fallback nehmen, wenn die Keyword-Erkennung
    `UNSORTED` liefert. Das ergibt die Reihenfolge manuell > Quelle > Keyword > gespeicherter Chip-Hint >
    Unsortiert.
  - Alternativ den Hint in einem eigenen Feld bzw. Flag speichern.
  - In `store_results`/`upsert_video` das Genre von Zeilen mit Status `queued`/`downloading`/`done` nicht
    mehr überschreiben.
  - Integrationstest: Chip-Suche → Titel ohne Keyword → Download → Ordner, TCON und DB = Chip-Genre.

---

## Minor

### m1 – Phase-2-m5 offen: Abgleich der Aufgabenplanung erreicht das Formular weiterhin nicht
- **Ort:** `ui/js/views/settings.js:432` (auch der Refresh-Pfad `:410-413`), `app/api.py:522-526`
- **Problem:**
  - `get_task_status` speichert bei extern gelöschter Aufgabe `task_scheduler_enabled=False` im Backend.
    Das `.then` setzt aber nur `cache.task`, nicht `work`/`saved`/`HC.settings.values`.
  - Speichert der User danach eine andere Einstellung, schickt das Formular `true`. `_sync_task` sieht dann
    `old=False, new=True` und legt die Aufgabe stillschweigend neu an.
  - Der CHANGELOG führt unter „m5“ nur die Teilkorrektur aus m6 (unbekannter Status).
- **Vorschlag:** Bei `typeof s.registered === 'boolean'` `schedule.task_scheduler_enabled` (und `task_time`)
  in `work`, `saved` und `HC.settings.values` übernehmen, wie es der Klick-Handler in Z. 422 schon tut.

### m2 – Lokale Vorbedingungsfehler leeren die ganze Warteschlange als `failed`
- **Ort:** `app/core/ytclient.py:395-396` (`_prepare`, externer PO-Server läuft nicht), `:546`
  (`tmp.mkdir` ausserhalb des `try`), `:639-648` (`reached_network = True` auch bei Fehlern vor dem ersten
  Request), `app/worker.py:772-779`, `app/api.py:158-159`
- **Problem:**
  - Im HTTP-Modus startet `Api.start` den Watchdog und sofort danach die Queue. Der Watchdog trägt
    `_server` erst nach `wait_ready` (bis 10 s) ein.
  - Ein beim Programmstart wartender Eintrag scheitert deshalb sofort mit „PO-Token-Server läuft nicht“.
  - Gibt der Watchdog nach 3 Versuchen auf, oder ist das Zielverzeichnis nicht erreichbar (z.B. getrenntes
    Laufwerk → `OSError` in `tmp.mkdir`), dann wird **jeder** wartende Eintrag nacheinander `failed`.
  - Bei `_prepare`-Fehlern wird zudem `mark_download_end()` gerufen, obwohl kein Request lief. Die nächsten
    Einträge warten so jeweils 30–120 s und scheitern dann ebenfalls.
  - YouTube ist nicht betroffen (kein Request, nicht gezählt). Für den User ist es aber ein „alles kaputt“
    mit Handarbeit (jeden Eintrag einzeln wiederholen).
- **Vorschlag:**
  - Lokale Vorbedingungen (PO-Server bereit, Zielordner beschreibbar) vor dem Download in der Queue prüfen
    und bei Fehlern wie einen Block behandeln: Eintrag bleibt `queued`, `blocked_code` z.B. `pot`/`target`,
    Neuprüfung beim nächsten Tick oder nach `apply()`.
  - `reached_network` erst nach `before_request` setzen.
  - Beim Start im HTTP-Modus auf den ersten Watchdog-Check warten (oder die Queue erst danach wecken).

### m3 – Kaputte Client-Factory: Neuversuch alle 30 s mit Lauf-Eintrag und Traceback
- **Ort:** `app/worker.py:669-676` (`start_run` vor `self._factory()`), `:469-481` (`_loop` fängt alles,
  wartet `idle_interval`)
- **Problem:**
  - Zur Frage „ist das ok?“: YouTube-seitig ja. Die Factory baut nur `YtClient` und importiert yt-dlp, macht
    also keinen Request, und es wird nichts gezählt.
  - Ist der Import dauerhaft kaputt (z.B. ein halb aktualisiertes yt-dlp), läuft aber eine endlose lokale
    Schleife: alle 30 s ein `runs`-Eintrag „manual“ (ca. 2880 pro Tag in der Lauf-Historie), ein
    `log.exception` mit Traceback im UI-Log und ein Griff nach dem Lauf-Lock.
- **Vorschlag:** Den Client vor `start_run`/`run_session` erzeugen. Bei Fehlern `blocked_code: "error"` mit
  deutscher Meldung setzen und erst nach einer Nutzeraktion (`wake()`) oder mit wachsendem Intervall erneut
  versuchen. Es sollte kein Lauf-Eintrag entstehen, solange kein Lauf stattfand.

### m4 – Suche parallel zum Download: zwei gleichzeitige YouTube-Verbindungen
- **Ort:** `app/api.py:583-603`, `app/core/throttle.py:257-282`, docs/decisions.md „Suche: eigener Such-Worker“
- **Problem:**
  - Der Throttle erzwingt den `sleep_requests`-Abstand nur zwischen den *Startpunkten* von
    `before_request`.
  - Ein Download macht danach in yt-dlp mehrere Extraktions-Requests (Webseite, Player, API) und lädt
    minutenlang Daten. Eine Suche in dieser Zeit läuft echt parallel auf YouTube.
  - Das ist bewusst entschieden und kein Parallel-*Download*. CLAUDE.md §1 sagt aber allgemein „keine
    Parallelität“.
- **Vorschlag:** Entweder die Suche während der Extraktionsphase eines Downloads (bis zum ersten
  `downloading`-Hook) zurückhalten, z.B. mit einem „Extraktion läuft“-Lock im Throttle, der vom Download bis
  zum Medienstart gehalten wird. Oder den Entscheid ausdrücklich als Ausnahme zu CLAUDE.md §1 festhalten
  (Orchestrator).

### m5 – Abbruch oder Ende während der Konvertierung: `stop()` wartet nur 10 s, danach wird die DB geschlossen
- **Ort:** `app/worker.py:451-457`, `app/api.py:164-175`
- **Problem:**
  - Abbrechen wird nur in Progress- und Postprocessor-Hooks geprüft. Während ffmpeg einen langen Mix
    umwandelt (Minuten), gibt es keinen Hook.
  - Beim Schliessen läuft `join(10)` deshalb ins Leere, danach schliesst `shutdown` die DB. Der Queue-Thread
    schreibt dann in eine geschlossene Verbindung, ffmpeg läuft verwaist weiter, und der Eintrag bleibt
    `downloading`. Beim nächsten Start wird er `failed` („Unterbrochen“) statt `queued`.
- **Vorschlag:** Beim Shutdown die DB nur schliessen, wenn der Queue-Thread wirklich beendet ist, oder in
  `_session` gegen eine geschlossene DB absichern. Beim Start `downloading` ohne aktiven Lauf wieder auf
  `queued` setzen (der User wollte den Download ja). Die ffmpeg-Kindprozesse lassen sich optional über das
  vorhandene `KillOnCloseJob` an die App binden.

### m6 – UI-Karte bleibt auf „downloading“ stehen, wenn der Download vom Throttle abgelehnt wird
- **Ort:** `app/worker.py:759-771`
- **Problem:** `_process` sendet `video {status: downloading}` schon vor `client.download`. Kommt danach eine
  `ThrottleError` (z.B. Backoff, den eine parallele Suche ausgelöst hat), stellt `YtClient` den DB-Status
  zwar auf `queued` zurück, es geht aber kein `video`-Event raus. Discover und Eingang zeigen den Eintrag
  weiter als „lädt“.
- **Vorschlag:** Im `except ThrottleError` `self._emit_video(vid)` aufrufen.

### m7 – `move_in_queue` nummeriert ohne Transaktion
- **Ort:** `app/core/db.py:340-362`
- **Problem:** Die Verbindung läuft im Autocommit, `self._lock` schützt nur gegen andere Threads. Ein Absturz
  mitten in der Neunummerierung hinterlässt eine teilweise verschobene Reihenfolge, ohne Datenverlust.
  `enqueue` ist ähnlich gebaut.
- **Vorschlag:** `BEGIN`/`COMMIT` um die Schleifen legen (`execute("BEGIN")` … `commit()`/`rollback()`),
  wie in `migrate`.

---

## Nits

- **n1** `ui/js/views/discover.js:96`: Live-Erkennung im UI über den Text `filter_reason === 'Livestream'`.
  Ein deutscher Anzeigetext dient hier als Vertragswert. Besser ein eigenes Feld `is_live` in `video_dict`
  bzw. im Suchergebnis. Ansonsten nutzt die UI `filter_reason`/`hidden_count` nicht. Entweder anzeigen (z.B.
  als Tooltip „ausgeblendet weil …“) oder im Vertrag als optional kennzeichnen.
- **n2** `app/api.py:589` und `:358-364`: Die gegenseitige Sperre Update ↔ Suche prüft `current` ohne Lock
  (TOCTOU). Eine Suche, die nur in der Queue steht, sieht `_do_update` nicht. Das ist selten, aber genau der
  Fall aus m2 der Phase 2. Abhilfe: ein gemeinsames `threading.Lock`/Flag „yt-dlp in Benutzung“.
- **n3** `app/worker.py:617-624`: `cancel()` meldet `ok` für den aktiven Eintrag auch dann, wenn der Download
  gerade fertig wird (Abbruch nach dem letzten `check_cancel`). Der Eintrag ist dann `done`, und die UI
  meldete „abgebrochen“.
- **n4** `app/core/discover.py:161-162`: `Suche fehlgeschlagen: {exc}` gibt den yt-dlp-Fehler ungefiltert
  weiter. Bei Proxy-Fehlern kann darin die Proxy-URL mit Zugangsdaten stehen (`network.proxy` erlaubt
  `user:pass@`). Diese im Fehlertext und im Log maskieren.
- **n5** `ui/index.html:10`: `script-src 'self' file:` erlaubt jede lokale Datei als Skriptquelle.
  Ausnutzbar ist das nur mit einer HTML-Injection, die per `innerHTML` ohnehin keine Skripte ausführt.
  Prüfen, ob `'self'` unter WebView2 bei `file://` allein reicht, und `file:` dann weglassen.
- **n6** Abgebrochene Downloads behalten ihre `.part` in `<Ziel>\.tmp` (gewollt). Wird der Eintrag nie
  wiederholt, bleiben sie liegen. Ein Aufräumen alter Teildateien (Phase 5, Wartung) wäre sinnvoll.
  Zusammen mit Phase-1-N4 erledigen.
- **n7** `app/core/scheduler.py:115-126` (Phase-2-m7): Die Reihenfolge der Datumsformate hängt an
  `locale.getlocale()` (Name `en_US`/`English_United States`). Das schtasks-Format folgt aber den
  Regionseinstellungen des Users, nicht unbedingt dem Prozess-Locale. Die Plausibilitätsprüfung gegen
  `task_time` aus dem Phase-2-Vorschlag wäre robuster. Betrifft nur die Anzeige.

---

## Checkliste reviewer.md

| Punkt | Ergebnis |
|---|---|
| 1 YouTube-Schonung | ok – alle Requests über den Throttle, kein Parallel-Download, keine Retry-Schleifen gegen YouTube (ein Netzwerk-Retry, nicht bei 403/429), Backoff stoppt die Queue sofort. Parallelität Suche/Download bewusst entschieden, aber schärfer fassen (m4). Lokale 30-s-Schleife ohne YouTube-Last (m3). |
| 2 Modulgrenzen | ok – `yt_dlp` nur in `ytclient.py` (lazy importiert), `core/discover.py` ohne yt-dlp/UI, `api.py` delegiert (Queue in `worker.py`, Suche in `core/discover.py`). |
| 3 Sicherheit/Hygiene | ok – keine Secrets, Cookies, Binaries oder Userpfade. CSP mit begründetem `'unsafe-eval'`, kein XSS gefunden. Proxy-Credentials in Fehlertexten maskieren (n4). |
| 4 Korrektheit | **M1** (Genre beim Download). Dazu m1 (Phase-2-m5 offen), m2, m5–m7. Migration 2 atomar und getestet. Abbruch/Resume konsistent bis auf den Shutdown während der Konvertierung (m5). |
| 5 Konfigurierbarkeit | ok – alle 52 Schlüssel in der GUI, neue Phase-3-Felder inkl. Validierung. TTL-Rundungshinweis vorhanden. |

---

## Runde 2

- Umfang: `git diff e48b7e4..00f165c` („fix: address phase 3 review …“). Massgeblich ist der Stand von
  Commit 00f165c. Die parallel laufenden Phase-4-Änderungen im Arbeitsbaum habe ich nicht bewertet.
- Geprüft gegen: Runde 1 oben, `docs/decisions.md` (Einträge vom 2026-11-16) und yt-dlp 2026.10.26 im
  venv (`YoutubeDL.py` `extract_info`/`__extract_info`/`_handle_extraction_exceptions`/`process_ie_result`/
  `_check_formats`, `extractor/youtube/_video.py` PO-Token- und Format-Pfad).
- Werkzeuge: Separater Worktree auf 00f165c. `ruff check .` sauber, `ruff format --check .` sauber,
  `pytest`: 455 passed. Eine lokale Simulation des Throttle (ohne Netz) zu R2-m1. Kein Netzwerkzugriff.

### Ergebnis Runde 2: ÄNDERUNGEN NÖTIG (klein)

Alle Funde aus Runde 1 sind behoben oder begründet zurückgestellt, ausser n5 und n7 (offen, nicht
dokumentiert). Der Metadaten-Lock bringt aber eine neue Lücke in der Garantie zum Request-Abstand
(R2-m1). Sie ist klein, betrifft aber direkt die YouTube-Schonung, und die Korrektur ist ein Zweizeiler.
Danach kann ohne weitere Runde freigegeben werden.

### Status je Fund

| ID | Status | Bemerkung |
|---|---|---|
| M1 | behoben | `_finish` greift auf das gespeicherte, nicht manuelle Genre zurück, aber nur wenn es in den Einstellungen existiert. `store_results` lässt das Genre bei `queued`/`downloading`/`done` unverändert, die Quelle hat Vorrang. `upsert_video` ohne `genre`-Key lässt das Feld unverändert. Abgedeckt durch den Integrationstest Chip → Datei/TCON/DB und den Folgesuch-Test. |
| m1 | behoben | `adoptTask` übernimmt `true`/`false` in `work`/`saved`/`HC.settings.values`. Eine ungespeicherte Eingabe des Users bleibt erhalten, `null` ändert nichts. Kein Render-Loop, weil die Funktion bei Gleichstand früh zurückkehrt. |
| m2 | behoben | `pot`/`target` sind Sperren. Der Eintrag bleibt `queued`, es entsteht kein `runs`-Eintrag und keine Pause. `reached_network` wird erst unmittelbar vor dem ersten Request gesetzt. Beim Start wartet die Queue bis 20 s auf den Watchdog. Die Probe-Datei (`paths.check_writable_dir`) ist korrekt: `mkdir`, schreiben, löschen, `OSError` → Text. Geschrieben wird sie nur, wenn Einträge warten. |
| m3 | behoben | Der Client wird vor `run_session` erzeugt. `error` blockiert ohne Lauf-Eintrag, ein neuer Versuch kommt nur nach einer Nutzeraktion. |
| m4 | behoben, siehe R2-m1 | Die Trennung `extract_info(process=False)`/`process_ie_result(download=True)` entspricht der yt-dlp-Semantik (Details unten). Keine Deadlock-Pfade. |
| m5 | behoben | Die DB bleibt offen, solange der Queue-Thread lebt. `requeue_downloading` läuft danach. `on_commit` verhindert, dass nach einem Abbruch noch verschoben wird. Siehe R2-n4. |
| m6 | behoben | `_emit_video` bei `ThrottleError` und `LocalError`. |
| m7 | behoben | `Database.transaction` arbeitet mit RLock und Autocommit-Verbindung (`isolation_level=None`). `BEGIN`/`COMMIT`/`ROLLBACK` sind korrekt. |
| n1 | behoben | `is_live` steht im Vertrag, die UI wertet `filter_reason` nicht mehr aus. |
| n2 | behoben | `YtdlpGate`: Prüfen und Registrieren laufen unter einem Lock. Eine Suche, die beim Update-Start in der Such-Warteschlange steht, wird bei ihrem Start abgelehnt. |
| n3 | behoben | `committed` wird atomar unter dem Queue-Lock gesetzt. `"late"` für aktive und für `done`-Einträge. |
| n4 | behoben, siehe R2-n3 | `redact` ist in `_clean_error`, im Suchfehler, im Live-Log und in allen Handlern (Datei, Konsole, Live) eingebaut. |
| n5 | **offen** | `script-src 'self' file:` ist unverändert und weder im CHANGELOG noch in decisions.md erwähnt. Bitte zurückstellen und das dokumentieren (z.B. „Phase 6, WebView2-Test“). |
| n6 | behoben | `cleanup_stale_partials` arbeitet einmal pro Start im Queue-Thread vor dem ersten Download. Grenze 7 Tage, `queued`/`downloading`/`failed` bleiben. Die ID-Ableitung `name.split(".", 1)[0]` passt zu `outtmpl` `%(id)s.%(ext)s`, auch für `.part-Frag*`. Ein unerreichbarer Ordner führt zu `0` statt zu einem Fehler. Laufende Downloads anderer Prozesse sind sicher, weil sie `downloading` und eine frische mtime haben. |
| n7 | **offen** | Die Locale-Abhängigkeit in `scheduler.py` ist unverändert und nicht dokumentiert. Betrifft nur die Anzeige; bitte als zurückgestellt notieren. |

### Prüfung der Extraktions-Trennung gegen yt-dlp 2026.10.26

- **Gleichwertigkeit:** `extract_info(url, download=False, process=False)` durchläuft dieselben Schritte wie
  zuvor bis zu `__extract_info`: Archiv-Vorprüfung, `_apply_header_cookies`, `ie.extract`,
  `add_default_extra_info`. Bei `process=False` gibt die Funktion `ie_result` zurück, ohne `process_ie_result`
  aufzurufen. Der bisherige Pfad rief genau `process_ie_result(ie_result, download, extra_info={})` auf
  (`YoutubeDL.py` ab Z. 1859). `_wait_for_video` fällt dabei weg, ist ohne `wait_for_video` aber ohnehin
  ein No-op.
- **Keine zusätzlichen YouTube-Requests:**
  - Webseite, Player-API, Player-PO-Token, die GVS-PO-Tokens je Client (`gvs_pots`, `_video.py`
    Z. ~3500–3750), der Subs-PO-Token (Z. 4278) und die Bulk-Lösung der n/sig-Challenges laufen alle in
    `_real_extract`, also unter dem Lock.
  - `process_ie_result` übernimmt nur die Formatwahl auf schon signierten URLs mit PO-Token, die
    Medienübertragung (googlevideo), das Thumbnail (ytimg) und das Postprocessing.
  - `_check_formats` testet `__needs_testing`-Formate, nämlich HLS bei Uploads der letzten 2 Tage. Diese
    Medien-Requests gab es vorher genauso.
  - Die Format-Auswahl und die PO-Token-Bindung bleiben damit korrekt.
- **Geändertes Fehlerverhalten (unkritisch):**
  - `_handle_extraction_exceptions` umschliesst nur noch die Extraktion. Ein `ExtractorError` aus der
    Format-Wahl („Requested format is not available“) kommt jetzt roh statt als `DownloadError` an.
    `_download_with_retry` und `_clean_error` behandeln das gleich, die Meldung ist dieselbe.
  - Ein `ReExtractInfo` aus dem Download (nur `dash.py:34`, Live) löst keine stille Neu-Extraktion mehr
    aus. Für die Schonung ist das eher eine Verbesserung.
- **Lock-Reihenfolge:**
  - Die Suche nimmt den Metadaten-Lock und danach `_lock`. Ein Logger-Callback unter dem Metadaten-Lock
    (`trigger_backoff`) nimmt ebenfalls `_lock`.
  - Der Download nimmt `_dl_lock` → `_lock`, gibt beide frei und nimmt erst dann den Metadaten-Lock.
    `YtClient._lock` (`_prepare`) wird vorher freigegeben, der Queue-Lock (`on_commit`) erst nach der
    Freigabe genommen.
  - Kein Pfad nimmt den Metadaten-Lock, während er `_lock` oder `_dl_lock` hält. Es gibt also keinen
    Zyklus und keinen Deadlock.
  - Das Warten auf den Lock ist abbrechbar (`cancel_event`, Shutdown). Bei der Suche ist es nach 60 s
    begrenzt, die Suche wird dann nicht gezählt.

---

### Neue Funde

#### R2-m1 (Minor) – Download reserviert den Request-Slot vor dem Warten auf den Metadaten-Lock: Abstand zur Suche kann unterschritten werden
- **Ort:** `app/core/ytclient.py:458-462` (erst `before_request`, dann `metadata_lock`),
  `app/core/throttle.py:270` ff. (`_request_slot` setzt `_last_request` beim Reservieren)
- **Problem:**
  - Ablauf: Die Suche hält den Metadaten-Lock und steht vor ihrem `before_request`. Der Download bekommt
    zuerst `_lock`, setzt `_last_request = T1` und wartet dann auf den Metadaten-Lock.
  - Die Suche hält den Abstand korrekt ein: Sie startet bei T1 + `sleep_requests`.
  - Der Download startet seinen ersten Request aber, sobald die Suche den Lock freigibt, also nur „Dauer
    der Suche“ später, ohne erneute Abstandsprüfung.
  - Lokal nachgestellt mit `sleep_requests=3` und einer Suchdauer von 0,5 s: Der Abstand zwischen
    Such-Request und Download-Request betrug **0,5 s statt 3 s**.
  - Das ist keine echte Parallelität mehr, aber die Abstandsgarantie aus SPEC §5 / CLAUDE.md gilt in
    diesem Fall nicht. Die Lücke entsteht neu durch den m4-Fix.
- **Vorschlag:**
  - Nach dem Erwerb des Metadaten-Locks den Abstand erneut erzwingen, ohne nochmals zu zählen und ohne die
    Pause zwischen Downloads, z.B. `self.throttle.before_request("download", cancel_event=…, retry=True)`
    (bzw. ein `request_spacing()`) als erste Zeile im `with metadata_lock`.
  - Die Pause zwischen Downloads und das Zählen bleiben vor dem Lock, damit die lange Pause weiterhin
    keine Suche blockiert.
  - Test: Simulation wie oben, Abstand ≥ `sleep_requests`.
  - Ein Nebenaspekt, der gleich mit erledigt wäre: Wird das Warten auf den Lock abgebrochen, ist der
    Versuch schon gezählt, obwohl kein Request lief. Das ist konservativ und unschädlich.

### Nits (neu)

- **R2-n1** `app/core/ytclient.py:468`: Nur `_type == "playlist"` wird abgelehnt. `YoutubeIE` kann für
  YPC-Videos `url_result(trailer_id)` liefern (`_video.py:3945`, `_type: "url"`). Dann startet
  `process_ie_result` eine **zweite Extraktion ausserhalb des Metadaten-Locks** und lädt unter der
  angefragten ID einen anderen Clip (den Trailer). Das ist selten, war vorher genauso möglich, liegt aber
  jetzt am Lock vorbei. Vorschlag: nur `ie_result.get("_type", "video") == "video"` zulassen, sonst
  `YtClientError("Kein einzelnes Video …")`.
- **R2-n2** Phase 4: `metadata_lock` ist prozesslokal. Ein Watchlist- oder Headless-Lauf in einem
  zweiten Prozess (Aufgabenplanung), der neben einer GUI-Suche läuft, ist dadurch nicht ausgeschlossen.
  Bitte beim Phase-4-Entwurf berücksichtigen, z.B. GUI-Suche sperren, solange der prozessweite
  Lauf-Lock fremd gehalten wird, oder den Fall als Ausnahme dokumentieren.
- **R2-n3** `app/core/redact.py:14`:
  - Ein unkodiertes `@` im Passwort (`http://user:p@ss@proxy`) wird nur bis zum ersten `@` maskiert.
    Ergebnis: `http://***@ss@proxy`, der Rest des Passworts bleibt sichtbar.
  - Ein Proxy ohne Schema (`user:pass@host:3128`; `network.proxy` erzwingt kein Schema) wird gar nicht
    maskiert.
  - Vorschlag: Userinfo gierig bis zum letzten `@` vor `/` bzw. Leerraum maskieren. Zusätzlich den
    konfigurierten Proxy-String bzw. sein Passwort literal ersetzen oder beim Speichern ein Schema
    verlangen.
- **R2-n4** `app/main.py:142-143`:
  - `activation.stop()` läuft vor `api.shutdown()`. Das kann bis 60 s dauern (Konvertierung). In dieser
    Zeit läuft der Prozess ohne Fenster und ohne Single-Instance-Schutz weiter.
  - Ein zweiter Start ist dann möglich. Er ist durch den Lauf-Lock harmlos (die neue Queue ist `busy`,
    kein „Unterbrochen“), für den User aber unklar.
  - Vorschlag: `activation.stop()` nach `shutdown()` aufrufen und für die Wartezeit einen Log- bzw.
    Statushinweis ausgeben. Die Bindung von ffmpeg an das Job Object bleibt optional offen
    (decisions.md).

### Checkliste reviewer.md (Runde 2)

| Punkt | Ergebnis |
|---|---|
| 1 YouTube-Schonung | ok bis auf **R2-m1** (Request-Abstand Suche → Download im Wettlauf). Keine zusätzlichen Requests durch die Extraktions-Trennung, keine Parallelität bei Metadaten, kein Retry ohne Netzkontakt, lokale Fehler zählen nicht und lösen keine Pause aus. |
| 2 Modulgrenzen | ok – `yt_dlp` nur in `ytclient.py`. `preflight.py`/`redact.py` in `core/` ohne UI-Bezug. `api.py` delegiert (Gate/Preflight in `worker.py`). |
| 3 Sicherheit/Hygiene | ok – Credentials werden in Logs und Fehlertexten maskiert (Randfälle R2-n3). Keine Secrets oder Binaries im Diff. |
| 4 Korrektheit | ok – Shutdown hält die DB offen, solange der Thread lebt. Transaktionen sind korrekt. Die Probe-Datei und das Aufräumen der Teildateien sind robust gegen nicht erreichbare Ordner. |
| 5 Konfigurierbarkeit | unverändert ok, keine neuen Settings-Schlüssel. Die neuen Sperren `pot`/`target`/`error` verlinken in der UI auf den passenden Einstellungs-Tab. |
