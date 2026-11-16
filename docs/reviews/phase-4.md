# Review Phase 4 – Watchlist & Zeitplan

- Umfang: `git diff 00f165c..HEAD` ohne reine Docs/Screenshots (WIP-Snapshots, ba6ccbd, b7189a3, c44b776).
- Geprüft gegen: CLAUDE.md, SPEC §2/§3.2/§5/§9/§11, `docs/decisions.md` (Einträge Phase 4), `docs/bridge-api.md`,
  Review Phase 1 (N3, N5), Phase 2 (n6), Phase 3 Runde 2 (R2-m1, R2-n1..n4), yt-dlp 2026.10.26 im venv
  (`utils/_utils.py` `PlaylistEntries`, `YoutubeDL.__process_playlist`, `extractor/common.py`
  `_request_webpage`, `extractor/youtube/_tab.py`).
- Werkzeuge: `ruff check .` sauber, `ruff format --check .` sauber, `pytest`: 523 passed. Import-Probe:
  `import app.headless` lädt weder `webview` noch `yt_dlp` noch `app.api`. `redact` lokal mit Randfällen
  geprüft. Kein Netzwerkzugriff durch mich. (Beim zweiten pytest-Lauf meldete der Sandbox-Proxy zwei
  abgewiesene Verbindungen zu `android.clients.google.com`. Weder Repo noch venv referenzieren diesen Host,
  die frühere Ausführung blieb ohne Meldung. Das ordne ich der Umgebung zu, nicht den Tests.)

## Ergebnis: ÄNDERUNGEN NÖTIG

Die Phase ist solide gebaut. Der inkrementelle Abbruch, Backoff → Laufabbruch, die prozessübergreifenden
Locks, `newest_last`, das Task-XML und die Behebung der Funde aus früheren Runden stimmen weitgehend.
Ein Major-Fund verhindert die Freigabe: Ein Video, das schon aus einer **Suche** bekannt ist, stoppt die
Kanal- bzw. Playlist-Prüfung. Gerade beim vorgesehenen Ablauf «Kanal zur Watchlist» aus einer Suchkarte
gehen damit Videos dauerhaft verloren. Dazu kommen drei Minor-Funde mit Bezug zum Zeitplan bzw. Headless-Betrieb.

## Status früherer Funde

| ID | Status | Bemerkung |
|---|---|---|
| N3 (P1) | behoben | Mutex `Global\HCLoader.<User>.<Name>`, Rückfall `Local\`, dann Datei-Lock. Aufgabe mit `InteractiveToken` (Sitzung des Users). Die verbleibende Grenze ist in decisions.md beschrieben. |
| N5 (P1) | behoben | `state.last_request`, Suchzähler und `trigger_backoff` laufen unter `_xlock` (Datei-Lock `throttle.lock`). Rest siehe n2. |
| n6 (P2) | behoben | `/XML`, UTF-16 mit BOM, `StartWhenAvailable`, keine Akku-Sperre, `IgnoreNew`, `PT6H`. Pfade mit `xml.sax.saxutils.escape` maskiert (reicht für Elementinhalt: `&`, `<`, `>`). Rest siehe n4. |
| R2-m1 | behoben | `request_spacing()` als erste Zeile unter dem Metadaten-Lock. Der Thread-lokale Slot-Vergleich erkennt fremde Requests aus anderen Threads und Prozessen. Es wird nichts doppelt gezählt. |
| R2-n1 | behoben | `_type` ausser `None`/`video` → `YtClientError` vor `process_ie_result`. |
| R2-n2 | behoben | Metadaten-Lock zusätzlich als Datei-Lock (`metadata.lock`), Timeout → `MetadataBusy`, Abbruch → `WaitCancelled`. |
| R2-n3 | behoben | `http://u:p@ss@proxy` → `http://***@proxy`. `user:pass@host:3128` wird maskiert, E-Mail-Adressen und `youtube.com/@kanal` bleiben unverändert. Rest: ein unkodiertes `/` oder Anführungszeichen im Passwort wird nicht maskiert. So eine URL funktioniert aber als Proxy ohnehin nicht. Kein Handlungsbedarf. |
| R2-n4 | behoben | `api.shutdown()` vor `activation.stop()`. |

## Prüfung `newest_last` (`playlist_items "-1:-N:-1"`)

- **Semantik korrekt:** `parse_playlist_items` → `slice(-1, -N.0, -1)`. In `PlaylistEntries.__getitem__`
  gilt `start = len-1`, `stop = len-N` und danach `stop += -1`. `frange(len-1, len-N-1, -1)` liefert genau
  die letzten **N** Einträge, den letzten zuerst (das Ende ist bei yt-dlp inklusiv, anders als bei Python).
  Bei N=1 kommt genau ein Eintrag. Hat die Playlist weniger als N Einträge, werden negative Indizes
  übersprungen und alle Einträge kommen.
- **Request-Aufwand:** `len(self)` = `tuple(self[:])` erschöpft die `LazyList`, holt also alle Seiten. Die
  `LazyList` cached sie, die anschliessenden Zugriffe kosten keinen weiteren Request. `lazy_playlist` verhindert
  `_match_entry`, und `playlistreverse` wäre wirkungslos. Beides ist in decisions.md richtig beschrieben.
  Zwischen den Seiten greift `sleep_interval_requests` (`common.py:871`, erste Anfrage der Instanz
  ausgenommen). Hinzu kommt bei jeder Playlist der Reload-Request `_reload_with_unavailable_videos`
  (`_tab.py:2399`, schon bisher). Kosten: etwa 2 + ceil(L/100) Requests pro Prüfung.
- **Lange Playlists:** YouTube erlaubt bis 5000 Einträge. Das ergibt ~50 Seiten, bei `sleep_requests=3`
  ≥ 150 s unter dem Metadaten-Lock. Eine GUI-Suche bricht in dieser Zeit nach 60 s mit «beschäftigt» ab.
  Eine Obergrenze ist sinnvoll (siehe m4).

## Funde

### Major

#### M1 – Abbruch an Videos, die nur aus einer Suche (oder einer anderen Quelle) bekannt sind
- **Ort:** `app/core/watchlist.py:249-252` (`db.is_known(vid)` → `break`), `app/core/db.py:269-271`,
  zusammen mit `app/core/discover.py` `store_results` (jeder Suchtreffer wird als `new` gespeichert) und
  `app/api.py:750` `add_channel_source`.
- **Problem:**
  - `is_known` ist für jedes Video in der DB wahr, auch für flach gespeicherte Suchtreffer ohne `source_id`.
  - Der typische Ablauf: Der User sucht, sieht einen Mix und klickt «Kanal zur Watchlist». Der Mix (meist
    eines der neuesten Videos des Kanals) ist schon in der DB.
  - Die **erste** Prüfung des Kanals bricht an genau diesem Video ab. Alle älteren Videos innerhalb von
    `max_entries` werden nie angesehen. Ab der zweiten Prüfung stoppt sie noch früher, nämlich am neuesten
    gespeicherten Video. Diese Videos gehen also dauerhaft verloren und erscheinen nie im Eingang.
  - Dasselbe passiert, wenn ein Video in zwei Quellen vorkommt (Kanal + Playlist) oder zwischen zwei
    Prüfungen in einer Suche auftaucht: Die zweite Quelle bricht dort ab, obwohl dahinter noch unbekannte
    Videos liegen.
  - Das so «bekannte» Video selbst landet ebenfalls nie im Eingang, auch wenn es alle Filter besteht.
- **Vorschlag:**
  - Abbrechen nur an Videos, die **diese Quelle** schon gesehen hat (`source_id == sid`). Alternativ an
    Videos, deren `first_seen` vor `last_checked` der Quelle liegt und die von einer Watchlist-Prüfung
    stammen.
  - Fremd bekannte Videos überspringen. Optional `source_id` (falls leer) setzen und `new` → `inbox`
    heben, wenn die Filter bestehen.
  - Bei der ersten Prüfung (`last_checked is None`) gar nicht abbrechen. `max_entries` begrenzt ohnehin.
  - Tests:
    - Ein Suchtreffer als zweites Listen-Element → die Elemente 3..N werden trotzdem gespeichert.
    - Ein Video in zwei Quellen.
  - SPEC §3.2 bzw. decisions.md präzisieren («bekannt» = von dieser Quelle gesehen).

### Minor

#### m1 – Headless im HTTP-Modus scheitert, solange die GUI offen ist
- **Ort:** `app/headless.py:136-142`, `app/core/binaries.py:317-326`.
- **Problem:**
  - Die GUI betreibt ihren PO-Token-Server auf `po_token_port`. Der Headless-Lauf ruft
    `watchdog.check()` → `PotServer.start()` auf.
  - `start()` erkennt den belegten Port (`ping()` erfolgreich) und gibt `False` zurück, weil der Server
    «fremd oder verwaist» ist. `local_preflight` meldet dann `pot`, und der Lauf endet mit Exit 1, ohne eine
    Quelle zu prüfen.
  - Mit GUI im Hintergrund und HTTP-Modus schlägt die geplante Aufgabe also **jeden Tag** fehl
    (Run-Eintrag «PO-Token …», Fehler). Das ist in decisions.md/bridge-api.md nicht als Einschränkung beschrieben.
- **Vorschlag:**
  - Variante 1: Ist der Single-Instance-Lock fremd gehalten (GUI läuft) und antwortet `/ping` auf dem
    konfigurierten Port, nutzt Headless diesen Server, ohne ihn zu besitzen oder zu stoppen.
  - Variante 2: Headless beendet sich in diesem Fall mit `EXIT_BUSY` und der Notiz «GUI aktiv – In-App-Prüfung
    übernimmt».
  - Test mit gemocktem `ping`.

#### m2 – In-App-Intervall und Aufgabenplanung kollidieren täglich, Toast-Spam
- **Ort:** `app/api.py:858-873` (`_trigger_scheduled_check` / `_do_watchlist`), `app/worker.py`
  `WatchlistScheduler.next_check`, `app/core/watchlist.py:391-392`.
- **Problem:**
  - Der Headless-Lauf setzt `watchlist_last_run` erst am Ende seiner Prüfphase. Die GUI plant danach mit
    `last_run + 24 h`.
  - Bei 24 h Intervall und täglicher Aufgabe liegt der In-App-Termin damit jeden Tag wenige Minuten nach
    dem Start der Aufgabe. Die GUI-Prüfung trifft also regelmässig auf den gehaltenen Watchlist-Lock.
  - `_trigger_scheduled_check` prüft den Lock nicht vorab. `_do_watchlist` zeigt dann einen **Warn-Toast**
    und sendet `watchlist_done`. Weil `last_run` unverändert bleibt, wiederholt sich das alle 30 s
    (Tick), bis der Headless-Lauf seine Prüfung beendet hat.
  - Umgekehrt: Startet die GUI-Prüfung zuerst, endet die Aufgabe mit `EXIT_BUSY` und lädt nichts.
    Die Downloads übernimmt dann die GUI-Queue, aber nur, wenn `auto_download` gesetzt ist.
- **Vorschlag:**
  - Bei einer geplanten (nicht manuellen) Prüfung den Lock-Konflikt still behandeln: nur Debug-Log, kein
    Toast, kein `watchlist_done`. Danach eine Pause (z.B. 10 min) vor dem nächsten Versuch.
  - Oder den Lock schon in `_trigger_scheduled_check` probieren.
  - Optional: Bei aktiver Aufgabenplanung die In-App-Prüfung nur einplanen, wenn der In-App-Termin nicht
    im Fenster der Aufgabe liegt, oder in der UI darauf hinweisen.

#### m3 – Lauf ohne eine einzige erfolgreiche Quelle zählt als «vollständig geprüft»
- **Ort:** `app/core/watchlist.py:391-392`.
- **Problem:** `watchlist_last_run` wird gesetzt, sobald kein Backoff bzw. Abbruch vorliegt, auch wenn
  **alle** Quellen fehlschlugen. Typische Fälle: Netz nach dem Aufwachen noch nicht da, Suchlimit erreicht,
  `MetadataBusy`, weil der andere Prozess gerade eine lange Playlist liest. Das In-App-Intervall wartet
  dann volle 24 h.
- **Vorschlag:** Nur setzen, wenn `result.checked > 0`. Sonst eine kurze Wiederholung einplanen (z.B.
  1 h, eigener State-Schlüssel), nicht im 30-s-Takt. Test dazu.

#### m4 – Request-Umfang pro Quelle nicht begrenzt (`newest_last`, Suchquellen mit 200)
- **Ort:** `app/core/ytclient.py:535-540`, `app/core/watchlist.py:108-117`.
- **Problem:**
  - `newest_last` blättert die ganze Playlist durch, bei 5000 Einträgen ~50 Requests pro Prüfung und
    mehrere Minuten unter dem Metadaten-Lock (siehe oben).
  - `max_entries` erlaubt auch bei Suchquellen 1–200. SPEC §3.1 begrenzt Suchen aber auf 100, und
    `ytsearch200` bedeutet ~10 Seiten-Requests.
  - Ausserdem misst der Request-Abstand ab dem *Start* eines Aufrufs (`last_request` wird beim Reservieren
    gesetzt). Nach einer mehrseitigen Liste kann ein wartender Download-Request also direkt auf die letzte
    Continuation folgen.
- **Vorschlag:**
  - Für `newest_last` in `ytclient` selbst iterieren (`extract_info(process=False)`, `entries`-Generator,
    `deque(maxlen=N)`) mit harter Obergrenze (z.B. 2000 Einträge ≈ 20 Seiten) und deutscher Fehlermeldung.
    Die Grenze in der UI-Hilfe nennen.
  - Suchquellen auf 100 begrenzen (Validierung + UI).
  - Beim Verlassen des Metadaten-Locks `state.last_request` auf «jetzt» setzen.

#### m5 – Kanal-URLs mit `/playlists`, `/releases`, `/featured` werden akzeptiert
- **Ort:** `app/core/watchlist.py:41-44`.
- **Problem:** Diese Tabs liefern flach Playlists bzw. Regale, keine chronologische Videoliste. Die
  Playlist-IDs würden als «Videos» gespeichert (ohne Dauer, also `new`), und der Abbruch beim ersten
  bekannten Eintrag ist dort sinnlos.
- **Vorschlag:** Nur Root, `/videos` und `/streams` zulassen.

### Nits

- **n1** `app/core/throttle.py:205-233`: `reset_backoff`/`finish_run`/`clear_backoff_manual` laufen nur
  unter dem prozesslokalen `_lock`, nicht unter `_xlock`. Ein `trigger_backoff` eines anderen Prozesses
  (GUI-Suche) zwischen `backoff_until() is None` und `reset_backoff()` wird dadurch gelöscht. Das Fenster
  ist winzig, die Korrektur trivial (`with self._xlock():`).
- **n2** `app/core/locks.py:107-130`:
  - `GetLastError` wird als eigener Foreign-Call gelesen. Mit `use_last_error=True` funktioniert das nur
    über den ctypes-Tausch. `ctypes.get_last_error()` ist eindeutig.
  - `CreateMutexW` hat keine `restype`/`argtypes`, HANDLE wird dadurch auf `c_int` gekürzt. In der Praxis
    sind Handle-Werte klein. Sauber wäre `restype = wintypes.HANDLE`.
  - Hinweis zur Annahme in decisions.md: `Global\` braucht für Mutexe kein `SeCreateGlobalPrivilege`
    (nötig nur für Sections/Symlinks). Der `Local\`-Rückfall greift also praktisch nie, was gut ist.
  - Die msvcrt-Semantik passt: `seek(0)` + `LK_NBLCK` auf Byte 0, Lock jenseits EOF ist erlaubt.
    Windows-Byte-Locks gelten pro Handle, also auch zwischen Threads desselben Prozesses mit zwei Handles.
    Das ist korrekt für `_xlock`, das re-entrant über `_xdepth` arbeitet und keinen zweiten Handle öffnet.
- **n3** `app/api.py:896`: `f"Watchlist-Prüfung fehlgeschlagen: {exc}"` ohne `redact()`. Der Live-Log ist
  zwar maskiert, der Toast-Text aber nicht.
- **n4** `app/core/scheduler.py:112`: `StartBoundary` ist immer «heute HH:MM». Liegt die Uhrzeit schon in
  der Vergangenheit, kann `StartWhenAvailable` je nach Windows-Version sofort einen «verpassten» Lauf
  starten. Bitte unter Windows prüfen oder `StartBoundary` auf den nächsten Termin legen (morgen, falls
  die Zeit vorbei ist).
- **n5** `app/api.py` `shutdown`: `_wl_cancel` wird erst zwischen zwei Quellen ausgewertet. Es wird nicht an
  `list_source`/`search` bzw. den Metadaten-Lock weitergegeben. Beim Beenden mitten in einer langen Liste
  läuft der Thread nach `db.close()` weiter, und der `watchlist`-Run bleibt ohne `finished`. Vorschlag:
  `cancel_event` durchreichen.
- **n6** `app/core/watchlist.py:266-273`: Auto-Download-Videos werden zuerst als `new` gespeichert und erst
  nach der Schleife eingereiht. Endet der Prozess dazwischen, bleiben sie `new` und bekannt, werden also nie
  geladen und erscheinen nicht im Eingang. Mit `inbox` als Startstatus (danach `enqueue`, das `inbox`
  akzeptiert) wäre der Fehlerfall sichtbar.
- **n7** `app/core/watchlist.py:226`: `max_entries` wird beim Anlegen aus `schedule.entries_per_source`
  kopiert. Eine spätere Änderung der Einstellung wirkt auf bestehende Quellen nicht. Das wäre in der
  Hilfe zu erwähnen, oder `NULL` = «Default verwenden» speichern.
- **n8** Premieren/angekündigte Livestreams im `/videos`-Tab: Sie werden beim ersten Sehen `new`
  (gefiltert, Dauer unbekannt) und gelten danach als bekannt. Nach der Ausstrahlung werden sie nicht neu
  bewertet. Ein Mix-Upload als Premiere geht so verloren. Optional: Einträge ohne Dauer nicht speichern
  bzw. bei der nächsten Prüfung erneut bewerten.

## Weitere Prüfpunkte (ohne Befund)

- **Watchlist:**
  - Suchquellen überspringen Bekanntes ohne Abbruch, Kanal/Playlist brechen ab (abgesehen von M1).
  - `max_entries` wird an `playlistend`, `playlist_items` bzw. `ytsearchN` übergeben, zusätzlich
    `entries[:N]`.
  - Keine Auflöse-Requests pro Video, nur flache Metadaten.
  - Backoff (`BackoffActive` oder `rate_limited`) bricht den Lauf ab, setzt `last_run` nicht und schreibt
    eine «Backoff …»-Notiz.
  - `runs` mit `found`/`errors`/`note`, `finish_run` im `finally`.
- **Headless:**
  - Lauf-Lock vor Watchlist-Lock, Freigabe in umgekehrter Reihenfolge im `finally`, Exit 4 bei belegtem Lock.
  - Backoff beim Start → Exit 2 mit Run-Eintrag.
  - `finish_run` hebt keinen aktiven Backoff auf (N1 aus Phase 1 weiterhin korrekt).
  - Ein `headless`-Run-Eintrag (Queue mit `record_run=False`).
  - Pausierte Queue wird respektiert, `max_downloads_per_run` über die normale Queue.
  - Kein GUI-Import.
- **WatchlistScheduler:** Tick 30 s, nie im Backoff (`max(due, until)`), Doppelstart innerhalb der GUI über
  den Worker-Key `watchlist:all`, Ausschluss gegen Headless über den Watchlist-Lock (Folge siehe m2).
- **Locks/Deadlock:**
  - Reihenfolge immer Metadaten (Thread → Datei) → `_lock` → Throttle-Datei-Lock.
  - Kein Pfad hält den Throttle-Lock und wartet auf den Metadaten-Lock.
  - Die lange Download-Pause liegt nur unter `_dl_lock`, nicht unter `_xlock`.
  - Timeouts sind begrenzt (120 s bzw. 60 s bzw. 3600 s).
- **Task-XML:**
  - Schema-1.2-Elemente vollständig, Namespace korrekt, `InteractiveToken` + `LeastPrivilege` ohne `UserId`
    (wird bei `/Create` ohne `/RU` dem aktuellen User zugeordnet).
  - Temp-Datei wird immer gelöscht. Das `/TR`-Limit entfällt.
- **DB:** Migration 3 (`ALTER TABLE … NOT NULL DEFAULT 0`) ist additiv und in SQLite gültig.
  `newest_last` wird für Nicht-Playlists serverseitig erzwungen.
- **UI (XSS):**
  - Quellen-Name, URL/Query, Fehlertexte, Genre, Zähler, Inbox-Chips und Toasts laufen über `esc()`.
  - Feldfehler über `textContent`, Formularfehler `ui.notice('error', esc(text))`.
  - Kein unmaskierter Wert aus der DB oder aus Fehlertexten in `innerHTML` gefunden.
- **Modulgrenzen/Hygiene:** `yt_dlp` nur in `ytclient.py`. `core/watchlist.py` ohne UI-Bezug. Die
  Watchlist-Logik in `api.py` beschränkt sich auf Gate/Lock/Events (vertretbar). Keine Secrets, Binaries
  oder persönlichen Pfade im Diff. `.gitignore` unverändert ausreichend.
- **Konfigurierbarkeit:** `schedule.in_app_check`, `watchlist_interval_hours`, `entries_per_source`,
  `task_scheduler_enabled` und `task_time` sind im Tab «Zeitplan» erreichbar. Die Quellenfelder
  (inkl. `newest_last`) stehen im Dialog.

## Checkliste reviewer.md

| Punkt | Ergebnis |
|---|---|
| 1 YouTube-Schonung | ok mit m4. Alle Requests laufen über den Throttle, sequenziell, Backoff bricht ab, kein Retry. Abstand und Suchzähler gelten prozessübergreifend. |
| 2 Modulgrenzen | ok |
| 3 Sicherheit/Hygiene | ok (n3) |
| 4 Korrektheit | **M1**, m1–m3, m5 |
| 5 Konfigurierbarkeit | ok (n7) |

## Freigabe-Bedingungen

M1 beheben (mit Tests). m1–m3 beheben oder begründet in decisions.md zurückstellen. m4/m5 und die Nits
nach Ermessen. Danach genügt eine kurze Nachprüfung.

## Runde 2

- Umfang: Fixes in `17fafdd..06503c8` (Phase-5-Backend nur auf Rückwirkungen auf Phase-4-Logik geprüft),
  `SPEC.md` §3.2, `docs/decisions.md` («Review Phase 4: Abbruch pro Quelle …»). HEAD steht auf `00cd95a`
  (nur Phase-5-UI). Der Arbeitsbaum enthält zusätzlich nicht committete UI-Änderungen. Diese habe ich nicht bewertet.
- Gegen yt-dlp 2026.10.26 im venv geprüft: `YoutubeDL.extract_info`/`__extract_info` (`process=False`),
  `extractor/common.py::_request_webpage` (`sleep_interval_requests`), `extractor/youtube/_tab.py`
  (`_real_extract`, `_reload_with_unavailable_videos`, `_extract_from_tabs`, `_entries`,
  `_extract_metadata_from_tabs` → `playlist_count`), `_base.py::_extract_response` (RetryManager).
- Werkzeuge: `ruff check .` und `ruff format --check .` sind sauber. `pytest` (ohne Marker `network`) ergibt 600 passed
  und 1 deselected. Lokale Probe ohne Netz: `YoutubeTabIE.suitable` ist für alle zulässigen Playlist-URLs wahr, also gibt es keinen
  `url`-Umweg über `YoutubePlaylistIE`. Ich habe keine Netzwerkzugriffe ausgeführt.

### Ergebnis Runde 2: FREIGEGEBEN

M1 ist mit Migration, Logik und Tests sauber behoben. m1–m5 und n1–n8 sind behoben, n7 als Option «NULL = Default».
Neu gefunden habe ich einen Minor-Fund (R2-m1, stündliche Wiederholung ohne Ende). Er betrifft die Schonung von YouTube,
das Volumen ist aber klein (höchstens ~2 Requests pro Quelle und Stunde, nur in der GUI). Dazu kommen einige Nits. Keiner der
Funde blockiert die Freigabe. R2-m1 bitte in Phase 5/6 erledigen oder begründet zurückstellen.

### Status der Funde aus Runde 1

| ID | Status | Bemerkung |
|---|---|---|
| M1 | behoben | Siehe «Migration 4» und «Abbruchlogik» unten. Tests: Suchtreffer an Position 2, Erstprüfung, zweite Prüfung stoppt am eigenen Video, Video in zwei Quellen, Filter/Nutzerstatus, Auto-Download, Backfill. |
| m1 | behoben | `headless._shared_pot` nutzt `SharedPotWatchdog` nur, wenn die GUI den Single-Instance-Lock hält **und** `/ping` (127.0.0.1) antwortet. `start()`/`stop()`/`check()` fassen den fremden Server nie an. `local_preflight` → `running()` = Ping. Ohne GUI gilt das bisherige Verhalten (Exit 1). Rest: siehe R2-n4. |
| m2 | behoben | `watchlist_running_since` beim Start jedes Volllaufs (GUI und Headless), gelöscht in `_finish_full_run`. Nach 6 h gilt der Marker als verwaist, der Scheduler wartet höchstens bis Start + 10 min. Geplanter GUI-Lauf bei belegtem Lock: `defer()` (+10 min), nur Debug-Log, kein Toast, kein `watchlist_done`. Eine manuelle Prüfung meldet den Konflikt weiter. `_deferred` in der Vergangenheit ist wirkungslos (max). |
| m3 | behoben | `last_run` wird nur bei `checked > 0` gesetzt, sonst `retry_at` = +1 h. Bei Backoff/Abbruch bleiben beide unverändert. `next_check` nimmt `min(retry, last+Intervall)`. Neues Problem: siehe R2-m1. |
| m4 | behoben | Eigenes Blättern, Grenze 2000, Suchquellen ≤ 100 (Validierung + `effective_max_entries`), `mark_request`. Details unten. Der UI-Hinweis auf «max. 2000» steht nur im **nicht committeten** Arbeitsbaum (`ui/js/i18n.js`), weder in `06503c8` noch in `00cd95a` (siehe R2-n6). |
| m5 | behoben | `_CHANNEL_PATH_RE` lässt nur Root, `/videos` und `/streams` zu. Test parametrisiert. |
| n1 | behoben | `reset_backoff`/`finish_run`/`clear_backoff_manual` laufen unter `_xlock`. |
| n2 | behoben | `argtypes`/`restype` (`HANDLE`) für `CreateMutexW`/`ReleaseMutex`/`CloseHandle`, `ctypes.get_last_error()`. |
| n3 | behoben | Toast über `redact()`. |
| n4 | behoben | `StartBoundary` = `next_daily()` (heute, falls noch vor der Uhrzeit, sonst morgen). |
| n5 | behoben | `cancel_event` → `before_request`, `metadata_lock` (Thread- und Datei-Lock) und Blätter-Schleife. `WaitCancelled` ergibt einen Lauf «Abgebrochen» ohne Quellenfehler und ohne `last_run`. `shutdown` wartet 10 s, danach schliesst `close_interrupted` den offenen Run und den Marker. Grenze: Ein laufender HTTP-Request oder die yt-dlp-eigene `sleep_interval_requests`-Pause (`time.sleep`) ist nicht unterbrechbar. Das ist dokumentiert und vertretbar. |
| n6 | behoben | Auto-Download-Zeilen starten als `inbox`, nicht angenommene bleiben im Eingang. |
| n7 | behoben | `max_entries` NULL = `schedule.entries_per_source` zur Prüfzeit. UI zeigt «Standard» und begrenzt auf 100/200. |
| n8 | behoben | `is_upcoming`/`is_live` werden weder gespeichert noch verknüpft und stoppen nicht. Rest: siehe R2-n3. |

### Migration 4 `source_videos`

- **Atomar:** `migrate()` führt jeden Schritt in `BEGIN … COMMIT` aus, Versionseintrag in derselben Transaktion,
  `ROLLBACK` bei Fehler. `CREATE TABLE`, `CREATE INDEX` und `INSERT … SELECT` sind in SQLite transaktional, ein
  `executescript` fehlt (richtig). Ein Abbruch mitten in der Migration hinterlässt also v3 unverändert.
- **Backfill:** `INSERT OR IGNORE … SELECT source_id, id, first_seen FROM videos WHERE source_id IS NOT NULL AND
  source_id IN (SELECT id FROM sources)`. Verwaiste `source_id` (gelöschte Quellen) werden ausgelassen, sonst würde der
  FK (`foreign_keys=ON` vor `migrate`) scheitern. Der PK verhindert Duplikate. Test `test_migration_4_takes_over_existing_source_ids`.
- **Folge für bestehende Quellen:** Bereits geprüfte Quellen bleiben inkrementell, sie stoppen am neuesten eigenen
  Video. Requests kommen nicht hinzu, die Liste wird ohnehin vor der Schleife vollständig geholt. Videos, die vor dem Fix
  durch M1 verloren gingen, werden nicht nachgeholt (R2-n1).
- `delete_source` löscht `source_videos` explizit in einer Transaktion. Das ist richtig für DBs ohne FK. Bei
  `delete_video` greift `ON DELETE CASCADE` (FK ist an).

### Abbruchlogik pro Quelle (`check_source`)

- `incremental = stype != "search" and last_checked`. Bei der Erstprüfung gibt es keinen Abbruch, Grenze ist nur `max_entries`.
  Schlägt die Erstprüfung fehl, bleibt `last_checked` leer, und die nächste Prüfung gilt wieder als erste (richtig).
- Reihenfolge pro Eintrag: Live/Upcoming überspringen → `source_has_seen` (inkrementell `break`, sonst
  `continue`) → unbekannt: speichern und verknüpfen in **einer** Transaktion → fremd bekannt: verknüpfen.
  Hochstufung `new` → `inbox` nur, wenn die Filter bestehen. `inbox`/`queued`/`done`/`failed`/`ignored` bleiben
  unangetastet. `upsert_video` setzt `source_id` nur, wenn es leer ist, und lässt ein manuelles Genre in Ruhe.
- Suchquellen brechen nie ab, überspringen nur selbst Gesehenes und übernehmen fremd bekannte `new`. Das passt zu
  decisions.md.
- **SPEC §3.2 passt zum Code** für Kanal und Playlist (Tabelle `source_videos`, fremd bekannte stoppen nicht, Erstprüfung
  ohne Abbruch). Kleine Lücke: Der Satz gilt sinngemäss «pro Quelle», Suchquellen brechen aber gar nicht ab (R2-n7).

### `newest_last`: eigenes Blättern (gegen `_tab.py` geprüft)

- `extract_info(url, process=False)` ruft `YoutubeTabIE._real_extract` auf. Das sind wie bisher die Webseite und
  `_reload_with_unavailable_videos` (ein zusätzlicher `browse`-Request bei Playlists, `_tab.py:2400`). Das Ergebnis ist
  `playlist_result(self._entries(...), **metadata)` mit einem **rohen Generator**. Continuations werden erst beim
  Iterieren im Handler geholt, der noch unter Metadaten-Lock und im selben `YoutubeDL`-Kontext läuft.
- **Zusätzliche Requests: keine.** Gegenüber `playlist_items "-1:-N:-1"` (holte alle Seiten) fallen bei Playlists > 2000
  mit Kopfzahl alle Continuations weg (nur Webseite + Reload, `pulled == 0` im Test). Ohne Kopfzahl ist bei Eintrag 2001
  Schluss: Webseite + Reload + 20 Continuations ≈ 22 Requests. Bei ≤ 2000 bleibt es bei
  2 + ceil(L/100) wie bisher. `process_ie_result` entfällt, damit gibt es keine Auflöse-Requests pro Eintrag
  (flache `url`-Einträge werden nicht verfolgt).
- **`sleep_interval_requests` greift weiter:** Jede Continuation läuft über `_extract_response` → `_download_json`
  → `_request_webpage` derselben `YoutubeDL`-Instanz (`common.py:871`, nur die erste Anfrage der Instanz ist
  ausgenommen). `extractor_retries: 0` gilt auch für die Continuations (`RetryManager` in `_extract_response`).
  Es gibt also keine versteckte Retry-Schleife.
- **`playlist_count`** stammt aus `_extract_metadata_from_tabs` (`_tab.py:793-795`, «N videos» aus Stats bzw.
  Byline der *ersten* Seite, nach dem Reload). Bei `None` greift die harte Grenze, bei veralteter Zahl ebenso.
- **429 beim Blättern:** Die `ExtractorError` aus dem Generator läuft nicht über `report_error`/Logger, sondern direkt
  in `_metadata_call` → `throttle.handle_error(exc)` → Backoff + `YtClientError(rate_limited=True)` → Laufabbruch.
  Das ist korrekt, aber ungetestet (R2-n5).
- Umleitung (`_type` ≠ playlist/multi_video): `playlistend = N` + `process_ie_result`. Das ist bei
  `…/playlist?list=` praktisch ausgeschlossen (siehe Probe oben).
- Unterschied zum verarbeiteten Pfad: Rohe Einträge laufen nicht durch `_fill_common_fields`. Ohne `upload_date` greift
  `normalize_entry` auf `timestamp` zurück (`date_approx = True`, eher genauer als vorher). `live_status` setzt der
  Extraktor selbst (`_tab.py:121`, `:388`). n8 wirkt also auch hier.
- **`Throttle.mark_request`:** Steht im `finally` *innerhalb* des Metadaten-Locks und nach `before_request`. Ausnahmen
  aus `before_request` (Backoff, Limit, Abbruch) markieren keinen Request. Lock-Reihenfolge Metadaten → `_xlock` wie
  dokumentiert. `_local.slot` wird mitgeführt. Ein wartender Download erkennt den Stempel deshalb als fremd und hält den Abstand
  ab Ende der letzten Seite (R2-m1 aus Phase 3 bleibt intakt). Test vorhanden.

### `tests/conftest.py`: Netzwerksperre

- Gesperrt sind `socket.socket.connect`/`connect_ex` (Klassenattribut, gilt für alle Threads, `ssl.SSLSocket`, urllib3,
  requests, die yt-dlp-Netzwerkschicht und asyncio `sock_connect`), dazu `socket.create_connection` und `socket.getaddrinfo` (Modulattribut zur
  Laufzeit, urllib3 und yt-dlp lösen darüber auf). Loopback und Unix-Sockets sind erlaubt. `curl_cffi` ist im venv nicht
  installiert, es gibt also keinen C-Pfad an Python-Sockets vorbei. Marker `network` hebt die Sperre auf, `addopts` wählt
  ihn ab, CI führt ihn separat aus (das spätere `-m` überschreibt `addopts`, richtig).
- **Lücken (R2-n2):** `socket.gethostbyname`/`gethostbyname_ex`/`gethostbyaddr` sind nicht gesperrt (DNS-Abfragen
  möglich), ebenso UDP `sendto`. Vor allem gilt die Sperre nur **im Testprozess**. Subprozesse sind nicht
  abgedeckt: heute ffmpeg mit `lavfi` (ohne Netz), `probe_python` (`python -I -c`, lokal) und Chromium. Chromium ist mit
  `--no-proxy-server`, `--host-resolver-rules=MAP * ~NOTFOUND`, `--disable-background-networking` und
  `--disable-component-update` sowie ohne Proxy-Variablen ausreichend entschärft. Ein künftiger Test, der
  `python -m app.main --headless` als Subprozess startet, wäre ungeschützt.

### Neue Funde

#### Minor

##### R2-m1 – `watchlist_retry_at` wiederholt dauerhaft scheiternde Quellen stündlich ohne Ende
- **Ort:** `app/core/watchlist.py:472-490` (`_finish_full_run`, `RETRY_AFTER` Z. 44), `app/worker.py`
  `WatchlistScheduler.next_check`.
- **Problem:**
  - Scheitern **alle** aktiven Quellen ohne Backoff, wird alle 60 min neu geprüft, und zwar unbegrenzt.
  - Das betrifft nicht nur vorübergehende Fehler (Netz nach dem Aufwachen), sondern auch dauerhafte:
    - «Playlist zu lang für Rückwärts-Lesen» (kostet jedes Mal Webseite + Reload = 2 Requests)
    - gelöschte oder private Playlist
    - ein nicht existierender Kanal
    - ein 403 bzw. ein «Sign in to confirm …» in einer Formulierung, die `is_rate_limit_error` nicht erkennt
  - Bei einer Watchlist mit einer oder wenigen Quellen sind das 24 Prüfungen pro Tag statt einer. Vor dem Fix war es
    eine pro Tag.
  - Das Volumen ist klein, widerspricht aber dem Grundsatz «so wenig Requests wie möglich» (CLAUDE.md, SPEC §5).
- **Vorschlag:**
  - Wiederholung eskalieren, z.B. 1 h, 2 h, 4 h … bis zum Intervall (Zähler im State, ein Erfolg setzt ihn zurück).
    Oder nur **eine** Wiederholung pro Intervall.
  - Optional zählen nur Netzwerk- und `MetadataBusy`-Fehler als «vorübergehend».
  - Test: zwei Fehlläufe hintereinander → der zweite `retry_at` liegt später als +1 h.

#### Nits
- **R2-n1** Durch M1 verlorene Videos werden nicht nachgeholt. Wer Phase 4 vor dem Fix produktiv genutzt hat, behält die
  Lücke hinter dem ersten eigenen Video. Vorschlag: In der CHANGELOG-Notiz erwähnen, oder `last_checked` beim Upgrade
  auf v4 für alle Quellen leeren (einmalige Vollprüfung bis `max_entries`, ohne Mehr-Requests).
- **R2-n2** Netzwerksperre (`tests/conftest.py:37-75`):
  - Zusätzlich `gethostbyname`, `gethostbyname_ex` und `gethostbyaddr` sperren.
  - Für Python-Subprozesse z.B. per `PYTHONPATH`-`sitecustomize` sperren, oder ein Test, der
    `subprocess.Popen` mit `sys.executable … app.main` ohne Marker `network` verbietet.
  - Mindestens im Docstring festhalten, dass Subprozesse nicht abgedeckt sind.
- **R2-n3** `live_status == "post_live"` (Stream beendet, VOD in Verarbeitung) liefert im Flat-Listing oft keine Dauer.
  Der Eintrag wird `new` (Filter «Dauer unbekannt»), verknüpft und nie neu bewertet. Das ist dieselbe Lücke wie n8 für
  `/streams`-Quellen. Vorschlag: `post_live` in `SKIP_LIVE_STATUS` aufnehmen, oder Einträge ohne Dauer allgemein
  nicht verknüpfen (`watchlist.py:49`).
- **R2-n4** `headless.gui_running()` (`app/headless.py:34`) belegt kurz den Single-Instance-Lock. Startet der User genau
  in diesem Moment die GUI, beendet sie sich mit «läuft bereits» (`main.py:212-218`). Das Fenster ist winzig. Sauberer
  wäre eine reine Abfrage (Mutex `OpenMutexW` bzw. Datei-Lock-Probe).
- **R2-n5** Es fehlt ein Test für einen 429 *während* des `newest_last`-Blätterns: Generator wirft
  `ExtractorError("HTTP Error 429")` → Backoff gesetzt, `rate_limited=True`, Lauf abgebrochen. Der Pfad ist generisch und
  laut Lektüre korrekt.
- **R2-n6** Der UI-Hinweis zur Grenze 2000 (`watchlist.hint_newest_last`) ist nur im Arbeitsbaum geändert, nicht committet.
- **R2-n7** SPEC §3.2, Satz zum Abbruch: «(Kanal/Playlist; Suchquellen brechen nie ab, sie überspringen nur Gesehenes)»
  ergänzen, damit SPEC und decisions.md übereinstimmen.
- **R2-n8** Übernommene Videos (`adopted`) fehlen in `result.found`. Ihr `source_id` zeigt auf die erste Quelle, deshalb
  fehlen sie auch in `new_count` dieser Quelle. Bei «Kanal zur Watchlist» aus einer Suche meldet `watchlist_done` daher
  «0 neu», obwohl Einträge im Eingang landen. Vorschlag: `found += adopted`, oder `new_count` über `source_videos` zählen.
- **R2-n9** Headless prüft nicht, ob gerade erst eine In-App-Prüfung lief. Lag der PC zur Aufgabenzeit im Ruhezustand
  und hat die GUI kurz vorher geprüft, prüft die nachgeholte Aufgabe alle Quellen erneut. Optional:
  `last_run` < 1 h → Prüfphase überspringen und nur die Queue laden.

### Phase-5-Rückwirkungen auf Phase 4
- `finish_run`-Listener: Ausnahmen werden geschluckt, ein Run bricht dadurch nicht ab.
- `sidecar.write` wirft nie. `chapters_from_info` wird jetzt immer aufgerufen (vorher nur mit CUE/CHAP), der Pfad
  war aber schon bisher Standard.
- `mark_removed` → `ignored`: Die Watchlist fasst `ignored` nie an, das Archiv bleibt erhalten.
- Kein Bruch der Phase-4-Logik gefunden.

### Checkliste reviewer.md (Runde 2)

| Punkt | Ergebnis |
|---|---|
| 1 YouTube-Schonung | ok. Keine neuen Requests am Throttle vorbei, `sleep_interval_requests` und `extractor_retries: 0` gelten auch beim eigenen Blättern, harte Grenze 2000, Abstand ab Ende der Liste. Rest: R2-m1. |
| 2 Modulgrenzen | ok. `yt_dlp` nur in `ytclient.py`, `watchlist.py`/`db.py` ohne UI, `api.py` delegiert. |
| 3 Sicherheit/Hygiene | ok. Keine Secrets oder Binaries im Diff. Netzwerksperre in Tests (R2-n2). |
| 4 Korrektheit | ok. Migration atomar, Abbruchlogik pro Quelle, Cancel, Zeitplan-Koordination. Nits R2-n1, n3, n8. |
| 5 Konfigurierbarkeit | ok. `max_entries` leer = Default, Grenzen 100/200 in der UI. |

**Meldung: FREIGEGEBEN.** R2-m1 bitte in der nächsten Phase beheben oder in decisions.md begründen.
