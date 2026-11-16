# Entscheide

Kurze Notizen zu Architekturentscheiden (Datum, Entscheid, Grund).

## 2026-11-16 – Download-Archiv schreibt HCLoader, nicht yt-dlp (Review M2)

- **Entscheid:** `download_archive` wird nicht mehr an yt-dlp gegeben. `YtClient` liest `archive.txt`
  selbst (Skip-Prüfung, `in_archive`) und hängt `youtube <id>` erst an, nachdem das Video getaggt,
  verschoben und in der DB als `done` gespeichert ist (`_record_archive`).
- **Grund:** yt-dlp schreibt das Archiv direkt nach dem Download, vor Tagging und Verschieben. Ein harter
  Abbruch in diesem Fenster blockierte ein Video dauerhaft als "bereits geladen". Jetzt gibt es kein
  Fenster mehr. Das Archiv bleibt im yt-dlp-Format (`youtube <id>`), bleibt also mit yt-dlp kompatibel.
- Beim App-Start werden `downloading`-Zeilen (Absturz) auf `failed` mit "Unterbrochen" gesetzt
  (`Database.reset_interrupted_downloads`), aber nur, solange kein Download-Lauf aktiv ist (Lauf-Lock).

## 2026-11-16 – Kein `max_downloads` bei yt-dlp (Review B1)

- **Entscheid:** B1 wird über die Video-ID-Pflicht in `YtClient.download` gelöst (andere URLs werden vor
  dem Throttle abgelehnt, die URL an yt-dlp wird immer aus der ID neu gebaut), dazu `playlist_items: "1"`
  und ein Fehler, falls `info["_type"] == "playlist"`. `max_downloads: 1` wird bewusst **nicht** gesetzt.
- **Grund:** Geprüft gegen `yt_dlp/YoutubeDL.py` 2026.10.26 (`check_max_downloads`, Z. ~3367/3677): Nach dem
  ersten erfolgreichen Download wirft yt-dlp `MaxDownloadsReached` aus `extract_info` und verwirft das Info-Dict.
  Ein normaler Einzel-Download würde dadurch als Fehler enden.

## 2026-11-16 – Pause zwischen Downloads zentral im Throttle (Review M4/M5)

- `Throttle.before_request("download")` erzwingt die zufällige Pause `sleep_interval`..`max_sleep_interval`
  seit dem Ende des letzten Downloads (`state.last_download_end`, überlebt Neustarts). Vor dem Download wird
  gewartet, nicht nach dem letzten. Die Wartezeit ist über `cancel_event` abbrechbar (`WaitCancelled`).
- Ein Download-Versuch zählt gegen Lauf-/Tageslimit, sobald `before_request` ihn freigibt (atomar mit der
  Limitprüfung). Fehlversuche zählen, Skips nie, der eine Netzwerk-Retry nicht doppelt.
- Der Throttle hält einen `RLock` (Zähler, Backoff, Request-Abstand inkl. Sleep) und einen separaten
  Lock für die lange Download-Pause, damit Suchen währenddessen nicht blockieren. Mehrere Prozesse
  schliesst der Lauf-Lock (`app/core/locks.py`) aus; `BEGIN IMMEDIATE` ist deshalb nicht nötig.

## 2026-11-16 – PO-Token-TTL in ganzen Stunden (Review m8)

- **Entscheid:** `TOKEN_TTL` wird als ganze Stunden gesetzt: `max(1, round(po_token_ttl_hours))`. Die
  Schema-Grenze 0.5-48 bleibt; ein Wert wie 0.5 wird auf 1 aufgerundet, 6.6 auf 7.
- **Grund:** Die README von bgutil-ytdlp-pot-provider 2.0.2 dokumentiert `TOKEN_TTL` "in hours, defaults to 6"
  und nennt es für den Script-Modus (Token-Cache in `generate_once`); das yt-dlp-Plugin startet den
  Prozess mit der Umgebung des Elternprozesses. Der Server-Quellcode liegt lokal nicht vor, deshalb wird
  nicht davon ausgegangen, dass Bruchteile korrekt geparst werden. Im HTTP-Modus erbt der Kindprozess
  die Variable beim Start; eine Änderung wirkt dort erst nach Neustart des Servers.
- Offen für den Orchestrator: Schema/GUI-Hinweis "ganze Stunden" (Typ `float`, Grenze 0.5).

## 2026-11-16 – Prozess-Locks (Review m13)

- `app/core/locks.py`: `acquire_single_instance()` (GUI) und `acquire_run_lock()` (ein Download-Lauf, egal ob
  GUI-Worker, Headless oder Smoke). Windows: benannter Mutex `Local\HCLoader.<name>` per ctypes; sonst bzw.
  bei Fehler: OS-Dateilock (`msvcrt.locking`/`fcntl.flock`) unter `<app_home>/locks/`, wird vom OS beim
  Prozessende freigegeben (keine veralteten Lock-Dateien).
- Der Worker (Phase 3) muss `acquire_run_lock()` für die Dauer eines Laufs halten und am Ende
  `Throttle.finish_run(success)` aufrufen (Backoff-Reset nach erfolgreichem Lauf, SPEC §5).

## 2026-11-16 – Bridge-Threads und Events (Phase 2)

- **Entscheid:** Events an die UI laufen über `worker.EventBus`: `emit()` legt nur in eine Queue,
  ein einziger Dispatcher-Thread ruft `window.evaluate_js` auf. Lange Operationen (yt-dlp-Update,
  DB-Backup, PO-Token-Test) laufen in genau einem Hintergrund-Thread (`worker.Worker`, Job-Queue,
  gleiche Jobs werden zusammengelegt); der pywebview-Aufruf-Thread wartet auf das Future.
  Kurze `schtasks`-Aufrufe (Timeout 20 s) laufen direkt im Aufruf-Thread.
- **Grund:** `evaluate_js` blockiert bis der Browser antwortet; im Logging-Handler oder in einem
  yt-dlp-Hook darf das nie passieren. pywebview startet für jeden js_api-Aufruf ohnehin einen eigenen
  Thread – der GUI-Thread ist also nie betroffen; der Worker sorgt dafür, dass Update/Backup/Test
  nicht parallel laufen. Die Download-Queue (Phase 3) bekommt einen eigenen Thread und den Rahmen
  `worker.run_session()` (Lauf-Lock + `Throttle.finish_run(success)`).
- Events vor dem `loaded`-Event des Fensters werden verworfen (die UI fragt den Zustand beim Start
  selbst ab). Logger `pywebview*` und `app.worker*` werden nicht an die UI gestreamt (Rückkopplung).

## 2026-11-16 – Live-Erkennung in bridge.js über `?host=pywebview`

- **Entscheid:** `app/main.py` lädt `ui/index.html?host=pywebview`. Mit diesem Marker wartet
  `bridge.js` bis 30 s auf die API, ohne Marker springt der Mock wie bisher nach 1,2 s ein.
  „Live“ gilt erst, wenn `window.pywebview.api.get_settings` eine Funktion ist.
- **Grund:** pywebview (EdgeChromium) injiziert die API erst nach `NavigationCompleted` in einem
  eigenen Thread und legt `window.pywebview.api` zuerst leer an. Auf langsamen Rechnern hätte die
  App sonst kurz Mock-Daten gezeigt bzw. „api.x fehlt“ geworfen.

## 2026-11-16 – Windows-Aufgabe startet einen Wrapper statt `cmd /c cd … &&`

- **Entscheid:** `/TR "\"<venv>\pythonw.exe\" \"<repo>\scripts\run_watchlist.pyw\""`. Der Wrapper
  setzt Repo-Root auf `sys.path` und als Arbeitsverzeichnis und ruft
  `app.main.main(["--headless", "--run-watchlist"])`.
- **Grund:** schtasks kennt kein Arbeitsverzeichnis; `cmd /c` öffnet um 03:00 ein Konsolenfenster
  und verlängert `/TR` (Limit 261 Zeichen, wird geprüft). `pythonw` + `.pyw` läuft unsichtbar.
  Der Status wird mit `/Query /FO CSV /V` gelesen; die Spalten sind lokalisiert, deshalb nach
  Position (1 = Name, 2 = nächste Laufzeit) mit mehreren Datumsformaten und Fallback auf die
  gespeicherte Uhrzeit. Das Häkchen „Aufgabenplanung nutzen“ im Formular legt die Aufgabe beim
  Speichern an bzw. entfernt sie; scheitert das, wird nichts gespeichert (Fehler am Feld).

## 2026-11-16 – Update-Prüfung über PyPI, nicht über den Throttle

- **Entscheid:** Die tägliche Update-Prüfung beim Start fragt `https://pypi.org/pypi/<paket>/json`
  ab (max. 1× pro Kalendertag, Zustand `state.last_update_check`). Das Update selbst ist
  `<venv-python> -m pip install -U "yt-dlp[default]" bgutil-ytdlp-pot-provider` und wird verweigert,
  solange ein Download-Lauf den Lauf-Lock hält.
- **Grund:** Kein YouTube-Verkehr, also kein Fall für den YouTube-Throttle; `pip index versions` ist
  noch als „experimental“ markiert und langsamer. pip darf yt-dlp nicht ersetzen, während ein
  Download das Modul benutzt; die neue Version wirkt nach einem Neustart.

## 2026-11-16 – PO-Token-Server gehört dem GUI-Prozess (Watchdog)

- **Entscheid:** Im HTTP-Modus startet `worker.PotWatchdog` den bgutil-Server beim App-Start, prüft
  ihn jede Minute (Neustart nach Absturz, max. 3 Fehlversuche bis zur nächsten Einstellungsänderung),
  reagiert sofort auf geänderte Netzwerk-Einstellungen und beendet ihn beim Schliessen.
  Der PO-Token-Test macht nie einen YouTube-Request (Script: `generate_once.ts --version`, HTTP: `/ping`).
- **Folge für Phase 3:** `YtClient` startet heute in `_prepare` einen eigenen `PotServer`. Die Queue
  muss ihm den Server des Watchdogs übergeben (`PotWatchdog.server`), sonst konkurrieren zwei
  Prozesse um denselben Port.

## 2026-11-16 – Single-Instance-Aktivierung über lokalen Socket

- **Entscheid:** Die laufende GUI lauscht auf `127.0.0.1:<zufälliger Port>` und schreibt Port und
  Zufalls-Token nach `<app_home>/locks/activation.json`. Ein zweiter Start (Single-Instance-Lock
  besetzt) sendet `show <token>`, die erste Instanz ruft `window.restore(); window.show()` (plus
  kurz `on_top`, Windows-Fokusregeln; der zweite Prozess ruft `AllowSetForegroundWindow`) und der
  zweite Prozess beendet sich.
- **Grund:** Plattformneutral testbar, keine Named-Pipe-Abhängigkeit (pywin32), Token verhindert,
  dass andere lokale Prozesse das Fenster per Port-Raten hervorholen.

## 2026-11-16 – Download-Warteschlange (Phase 3)

- **Entscheid:** `worker.DownloadQueue` hat einen eigenen Daemon-Thread (nicht der Wartungs-Worker),
  genau ein aktiver Download. Wahrheit ist die DB: Status `queued` + neue Spalte `videos.queue_pos`
  (Migration 2) für die Reihenfolge; `failed` bleibt sichtbar, bis wiederholt oder entfernt.
  „Pausiert“ steht in `state.queue_paused` und überlebt Neustarts.
- **Lauf:** Ein Lauf (`run_session`: Lauf-Lock, Lauf-Zähler, `Throttle.finish_run(success)`,
  `runs`-Eintrag `manual`) dauert, solange ohne Unterbrechung geladen wird; er endet bei leerer
  Queue, Pause, Sperre oder Programmende. Lauf-Limit erreicht → Rest bleibt `queued`, die Queue
  wartet auf eine Nutzeraktion (Fortsetzen = `set_queue_paused(false)` oder neues `enqueue`).
  Tageslimit und Backoff heben sich von selbst auf (Prüfung alle 30 s bzw. sofort nach
  `clear_backoff`/Speichern der Einstellungen). Ein 429 im Lauf löst den Backoff aus (ytclient) und
  beendet den Lauf, kein Retry.
- **Pause zwischen Downloads:** Die Queue wartet sie *vor* `YtClient.download` selbst ab
  (`Throttle.wait_between_downloads`), damit der Eintrag `queued` bleibt (Absturz während der Pause
  ≠ „Unterbrochen“) und Abbrechen/Pausieren die Wartezeit sofort beendet. Die Zufallspause wird pro
  Download-Ende einmal gewürfelt (`Throttle.download_wait()`); so ist der Countdown im
  `progress`-Event `sleep` exakt, und `before_request("download")` findet nichts mehr zu warten.
  Wird der wartende Eintrag abgebrochen, gilt die Restpause für den nächsten (YouTube schonen).
- **Pausieren** lässt einen laufenden Download fertig laden, bricht aber eine laufende Throttle-Pause
  ab. **Abbrechen** eines aktiven Downloads setzt den Eintrag auf `new` (Teildateien bleiben für
  später); beim Programmende wird abgebrochen und der Eintrag bleibt `queued`.
- **Grund:** SPEC §3.3/§5; Downloads dürfen Wartungsaufträge nicht blockieren und umgekehrt.

## 2026-11-16 – Suche: eigener Such-Worker, alle Treffer mit `filter_reason`

- **Entscheid:** `search` läuft in einem zweiten `Worker` (`hcloader-search`); der pywebview-Thread
  wartet (max. 180 s). Eine Suche darf parallel zu einem laufenden Download stattfinden: Beide gehen
  durch denselben thread-sicheren Throttle (Backoff, Suchen/Stunde, `sleep_requests`-Abstand
  zwischen allen Requests); die lange Pause zwischen Downloads blockiert Suchen nicht (eigener Lock).
  Während eines yt-dlp-Updates wird die Suche sofort abgelehnt, umgekehrt verweigert das Update,
  solange eine Suche läuft.
  Präzisiert (Review Phase 3 m4/n2): nicht während der Metadaten-Extraktion eines Downloads
  (Metadaten-Lock) und gegenseitiger Ausschluss mit dem Update über `YtdlpGate`, siehe unten.
- Das Backend liefert **alle** Treffer mit DB-Status und `filter_reason` (leer = besteht die
  gespeicherten Filter, sonst deutscher Grund aus `filters.passes`, Blacklist und Status
  eingeschlossen; `opts.year` ersetzt dabei den gespeicherten Zeitraum) plus `hidden_count`.
  Die UI filtert zusätzlich live clientseitig mit temporären Werten.
- Alle Treffer werden in der DB gespeichert (neu: Status `new`, nie Statusänderung bestehender
  Zeilen) mit Genre: manuell > Keyword > Genre-Chip der Suche > Unsortiert. Ein ungefähres Datum aus
  der flachen Suche überschreibt nie ein exaktes (`date_approx`). Die letzte Suche (Text,
  `effective_query`, Genre, Jahr, IDs) steht in `state.last_search`; `get_last_search` baut sie
  ohne Netzwerk mit aktuellen Status neu auf.
- **Grund:** Die UI braucht die Treffer auch bei temporär gelockerten Filtern; serverseitige Gründe
  machen ausgeblendete Treffer erklärbar. YouTube-Last ist dieselbe (ein flacher Request).

## 2026-11-16 – yt-dlp erst bei Bedarf laden, „Neustart nötig“ nach Update (Review m2)

- **Entscheid:** `app/main.py`, `app/api.py` und `app/worker.py` importieren `ytclient` nicht auf
  Modulebene (nur `run_smoke`, erste Suche, erster Download-Lauf). Meldet ein Update `changed` und
  ist `yt_dlp` zu diesem Zeitpunkt im Prozess geladen, blockiert die Queue
  (`blocked_code: "restart"`) und die Suche bis zum Neustart; zusätzlich `toast` (warn).
  Wurde yt-dlp noch nicht geladen, wirkt das Update sofort ohne Neustart.
- **Grund:** gemischte Modulstände (lazy Extractor-Importe) und unter Windows gesperrte `.pyd`.

## 2026-11-16 – PO-Token-Server: Host, Job Object, belegter Port (Review m11)

- **Entscheid:** `PotServer` startet `main.ts --host 127.0.0.1 --port N`. Laut README von
  bgutil-ytdlp-pot-provider 2.0.2 (Abschnitt „Server Command Line Options“, lokal in den
  dist-info-METADATA): `-H, --host <HOST>` … „Defaults to localhost only (`127.0.0.1` and `::1`)“.
  Der Server-Quellcode liegt lokal nicht vor; das explizite Argument macht die Bindung unabhängig
  vom Default und identisch mit der Adresse, die wir pingen und yt-dlp geben. `fetch_binaries.ps1`
  klont den Provider in genau der installierten Plugin-Version, die Option ist also vorhanden.
- Unter Windows wird der deno-Kindprozess einem Job Object mit `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`
  zugeordnet (ctypes, best effort): Endet HCLoader hart (Task-Manager, Absturz), schliesst das OS den
  Job-Handle und beendet deno mit. Antwortet vor dem Start schon etwas auf dem Port, wird das als
  „fremder oder verwaister PO-Token-Server“ gemeldet und nicht übernommen.
- In der GUI bekommt `YtClient` den Server des Watchdogs über `worker.WatchdogPotServer` (fragt immer
  den Watchdog, der den Server nach einem Absturz ersetzen kann). `--smoke` startet weiterhin einen
  eigenen Server (kein Watchdog im CLI-Prozess).

## 2026-11-16 – Thumbnails und Content-Security-Policy (Phase 3, Review Phase 2 m10/n1)
- Thumbnails sind der einzige externe Abruf der UI. Sie werden direkt vom YouTube-Bild-CDN geladen, aber
  nur von `https://*.ytimg.com` (`util.safeThumb`, sonst Platzhalter), mit `loading="lazy"` und ohne
  Referrer. Das ist kein Zugriff auf die YouTube-Seiten oder -API und läuft deshalb nicht über den Throttle;
  pro Suche höchstens `results_count` kleine Bilder.
- CSP in `ui/index.html` erlaubt `'unsafe-eval'` in `script-src`: pywebview 6.2.1 spielt Python→JS-Events
  per `eval()` ein und baut die js_api mit `new Function`. Ohne das fielen alle Events still aus.
  Inline-Skripte, Inline-Handler und fremde Skriptquellen bleiben blockiert.
- Im Host-Modus (`?host=pywebview`) gibt es nach 30 s ohne API keinen Mock mehr, sondern einen sichtbaren
  Fehlerzustand mit „Neu laden“ (Review Phase 2 m9).

## 2026-11-16 – Genre-Hint der Suche bleibt bis zur Datei (Review Phase 3 M1)

- **Entscheid:** Kein eigenes DB-Feld für den Chip-Hint. `store_results` speichert ihn wie bisher
  als nicht manuelles `genre`; `YtClient._finish` nimmt dieses gespeicherte Genre als Rückfall, wenn
  die Erkennung (manuell > Quellen-Default > Keyword) «Unsortiert» ergibt. Damit gilt beim Download
  dieselbe Reihenfolge wie in der Suche: manuell > Quelle > Keyword > Chip > Unsortiert. Ein
  gespeichertes Genre, das es in den Einstellungen nicht mehr gibt, fällt auf «Unsortiert».
- Suchen ändern das Genre von Zeilen mit Status `queued`/`downloading`/`done` nicht mehr (Datei,
  TCON, Zielordner und Bibliothek bleiben gleich). Die Suche berücksichtigt den Quellen-Default
  einer Zeile mit `source_id` (Phase 4), damit Suche und Download dasselbe anzeigen.
- **Grund:** Kleinste Änderung ohne Migration; der Zielordner in der Warteschlange
  (`QueueItem.target`) zeigt jetzt genau den Ordner, in dem die Datei landet.

## 2026-11-16 – Lokale Fehler sperren die Warteschlange (Review Phase 3 m2, m3)

- **Entscheid:** PO-Token-Server nicht bereit (`pot`), Zielordner nicht erreichbar/beschreibbar
  (`target`) und ein nicht ladbarer Download-Client (`error`) sind **Sperren**, keine
  Download-Fehler. Die Einträge bleiben `queued`, es entsteht kein `runs`-Eintrag, nichts wird
  gezählt und es gibt keine Pause zwischen Downloads (die gilt nur nach einem echten Request,
  `reached_network` wird erst unmittelbar vor dem ersten Request gesetzt).
- Ablauf: `DownloadQueue.run_pending` prüft zuerst die Throttle-Sperren, dann `error`, dann die
  lokale Vorprüfung (`worker.local_preflight`: Watchdog läuft, Probe-Datei in `<Ziel>/.tmp`),
  erzeugt dann den Client und startet erst danach den Lauf. Im Lauf wird vor jedem weiteren
  Eintrag erneut geprüft; `YtClient.download` prüft dasselbe noch einmal und wirft
  `ytclient.LocalError` (Unterklasse von `YtClientError` und `preflight.LocalError`).
- `pot`/`target` werden bei jedem Tick (30 s), nach dem Speichern der Einstellungen und – bei
  `pot` – sobald der Watchdog den Server meldet (`on_change` weckt die Queue) neu geprüft.
  Beim ersten Start im HTTP-Modus wartet die Queue bis 20 s auf das erste Watchdog-Ergebnis
  (`PotWatchdog.wait_ready`). `error` wird nur nach einer Nutzeraktion neu versucht (`enqueue`,
  `set_queue_paused(false)`, Einstellungen speichern/zurücksetzen), damit ein defektes yt-dlp
  keine Schleife mit Lauf-Einträgen erzeugt.
- **Grund:** Ein getrenntes Laufwerk oder ein noch startender Server soll nicht die ganze
  Warteschlange auf «fehlgeschlagen» setzen (Handarbeit für den User), und YouTube ist dabei
  gar nicht beteiligt.

## 2026-11-16 – YouTube-Metadaten-Lock: Suche ja, aber nicht während einer Download-Extraktion (Review Phase 3 m4)

- **Entscheid:** Eine Suche darf während eines laufenden Downloads stattfinden, aber nie während
  dessen Metadaten-Extraktion. `Throttle.metadata_lock()` (eigener Lock, nie unter dem
  Throttle-`_lock` genommen) halten: `search`, `list_source`, `resolve` für den ganzen Aufruf und
  der Download nur für die Extraktion.
- Umsetzung im Download: `ydl.extract_info(url, download=False, process=False)` unter dem Lock
  (Webseite, Player, API, PO-Token, JS-Challenges), dann Lock frei und
  `ydl.process_ie_result(info, download=True)` (Formatwahl, Medienübertragung, Thumbnail,
  Postprocessing). Geprüft gegen yt-dlp 2026.10.26: `extract_info(process=True)` ruft intern
  genau `process_ie_result(ie_result, download, extra_info)` auf (`__extract_info`); Fehler der
  Extraktion laufen weiter über `_handle_extraction_exceptions` (DownloadError), Fehler beim
  Laden über `process_info`/`report_error`. Die Variante «Lock bis zum ersten
  `downloading`-Hook» wurde verworfen: Die Freigabe hinge an Hook-Semantik und fände bei
  Fehlern vor dem ersten Hook nur über `finally` statt; die Trennung ist deterministisch.
- Der Download nimmt den Lock erst **nach** `before_request` (Pause zwischen Downloads,
  Request-Abstand), damit die lange Pause keine Suche blockiert. Wartet er auf den Lock, ist das
  per `cancel_event` abbrechbar. Eine Suche wartet max. 60 s (`ytclient.METADATA_WAIT_S`), dann
  `MetadataBusy` → «Download-Abfrage läuft gerade – bitte gleich erneut versuchen» (nicht gezählt).
- **Grund:** CLAUDE.md §1 «keine Parallelität»: Zwei gleichzeitige Metadaten-Abfragen an YouTube
  sind ausgeschlossen. Die Medienübertragung (googlevideo) parallel zu einer flachen Suche bleibt
  bewusst erlaubt, sonst wäre die Suche minutenlang gesperrt.

## 2026-11-16 – Beenden während eines Downloads (Review Phase 3 m5, n3)

- **Entscheid:** `Api.shutdown` bricht den laufenden Download ab (`cancel_event`, Eintrag bleibt
  `queued`) und wartet bis 60 s auf den Queue-Thread. Erst danach wird die DB geschlossen. Endet
  der Thread nicht (ffmpeg-Konvertierung hat keinen Abbruch-Hook), bleibt die DB offen bis zum
  Prozessende und `downloading`-Zeilen werden auf `queued` gesetzt (`requeue_downloading`).
  Schreibt der Thread danach doch noch `done`, gewinnt `done`.
- Abbrechen ist bis zum letzten Schritt vor dem Verschieben möglich. Der Punkt ohne Rückkehr ist
  atomar (`on_commit` unter dem Queue-Lock); ein späteres `queue_cancel` meldet
  `{ok:false, error:"Download bereits fertig"}`.
- Offen (optional): ffmpeg-Kindprozesse an das Job Object binden.

## 2026-11-16 – Kleinere Entscheide Review Phase 3 (n2, n4, n6)

- **n2:** `worker.YtdlpGate` (ein Lock, Zähler für Suchen, Flag für Update): Suche registriert
  sich im Such-Thread, das Update im Wartungs-Thread, beide prüfen und setzen unter demselben Lock.
  Eine Suche, die beim Update-Start noch in der Warteschlange des Such-Workers steht, wird bei
  ihrem Start abgelehnt.
- **n4:** Zugangsdaten in URLs werden zentral maskiert (`app/core/redact.py`): Fehlertexte von
  yt-dlp (`_clean_error`), Suchfehler, der Live-Log und alle Log-Handler (`RedactingFormatter`).
- **n6:** Teildateien (`.part`, `.ytdl`, `.part-Frag*`) in `<Ziel>/.tmp`, älter als 7 Tage, werden
  beim Start im Queue-Thread (vor dem ersten Download, kein Wettlauf) gelöscht. Behalten werden
  Dateien von Einträgen mit Status `queued`, `downloading` **und** `failed`: Fehlgeschlagene
  stehen sichtbar in der Warteschlange und sollen beim manuellen Wiederholen fortsetzen
  (Netzwerkfehler behalten `.part` bewusst).

## 2026-11-16 – Watchlist, In-App-Intervall, Headless (Phase 4)

- **Prüfung:** `core/watchlist.py`. Pro Quelle wird die flache Liste (neueste zuerst) bis zum ersten
  bekannten Video gelesen (DB `is_known`, jeder Status; **ersetzt** durch «von dieser Quelle gesehen»,
  siehe Review Phase 4 M1). Kanal-Root geht auf `/videos`
  (`ytclient.normalize_source_url`). **Suchquellen** überspringen Bekanntes nur, ohne Abbruch: die
  Relevanz-Reihenfolge ist nicht chronologisch. Playlists hängen neue Videos meist hinten an: siehe
  «Playlist-Option Neueste stehen hinten» unten.
- Neue Videos: bestehen sie die Filter → `inbox` bzw. (Auto-Download) `DownloadQueue.enqueue(auto=True)`;
  sonst `new`. `auto=True` ist keine Nutzeraktion (hebt das Lauf-Limit und einen Client-Fehler nicht auf).
  `runs.found` = neu gespeicherte Videos (nicht nur die im Eingang).
- **Backoff/Fehler:** `BackoffActive` oder `rate_limited` bricht den ganzen Lauf ab (Notiz beginnt mit
  «Backoff»); `state.watchlist_last_run` wird dann nicht gesetzt, damit nach dem Backoff erneut geprüft wird.
  Ein anderer Fehler (Netz, Quelle gelöscht, Suchlimit) zählt als Fehler der Quelle, der Lauf geht weiter.
- **Watchlist-Lock** (`locks.acquire_watchlist_lock`): ein Check zur Zeit, GUI-Intervall gegen Headless.
  Der Headless-Lauf hält Lauf- **und** Watchlist-Lock; der GUI-Check nur den Watchlist-Lock (Prüfen darf
  parallel zu einem GUI-Download laufen wie eine Suche, der Metadaten-Lock serialisiert die Requests).
  Eigener Thread `hcloader-watchlist`, damit Wartungsaufträge nicht warten.
- **In-App-Intervall:** `worker.WatchlistScheduler` (Tick 30 s). Persistenz `state.watchlist_last_run`
  (GUI und Headless); ohne Lauf 60 s nach App-Start; nie bei Backoff; `Status.next_check` bekommt
  `in_app_next`.
- **Headless:** `app/headless.py`; `DownloadQueue(record_run=False, run_lock=<gehaltener Lock>)` wird
  direkt (`run_pending`) benutzt, ein einziger `headless`-Run-Eintrag. `finish_run` am Ende
  (Erfolg = mindestens eine Quelle geprüft, kein Backoff). Kein PO-Token-Server im HTTP-Modus → Abbruch
  vor dem ersten Request (Exit 1).
- **N3:** Mutex `Global\HCLoader.<User>.<Name>`, Rückfall `Local\`, dann Datei-Lock. Bekannte Grenze:
  fällt nur einer von zwei Prozessen auf `Local\` zurück, schliessen sie sich über den Mutex nicht aus.
- **N5/R2-n2:** `locks.cross_process_lock` (blockierender OS-Datei-Lock mit Timeout, 120 s; danach weiter
  ohne Schutz + Warnung). Request-Abstand (`state.last_request`), Suchzähler und Backoff-Eskalation
  laufen darunter (`Throttle._xlock`, re-entrant). Der Metadaten-Lock ist zusätzlich ein Datei-Lock
  (`locks/metadata.lock`), damit eine GUI-Suche und ein Headless-Lauf nie gleichzeitig Metadaten laden.
- **R2-m1:** `Throttle.request_spacing()` wird im Download direkt nach dem Metadaten-Lock aufgerufen: Hat
  seit der Slot-Reservierung ein anderer Thread/Prozess angefragt, wird `sleep_requests` nochmals
  abgewartet (ohne zu zählen), sonst nichts.
- **R2-n1:** Nach der Extraktion nur `_type` fehlend/`video`; `url`/`url_transparent` → Fehler
  «Kein direktes Video …».
- **R2-n3:** `redact` maskiert bis zum letzten `@` vor dem Host und Proxys ohne Schema mit `user:pass@`.
- **R2-n4 (Entscheid):** `Api.shutdown()` zuerst, danach `activation.stop()`. Ein zweiter Start in dieser
  Zeit findet den Single-Instance-Lock und beendet sich still; das Fenster ist zu diesem Zeitpunkt schon
  geschlossen, ein «Fenster nach vorne» wäre wirkungslos.
- **Zurückgestellt:** *n5* (CSP `script-src … file:`): braucht einen WebView2-Test unter Windows, geplant
  Phase 6. *n7* (Datumsanzeige von `schtasks` je Locale, `scheduler._date_formats`): betrifft nur die
  Anzeige von `next_run`, es gibt den Rückfall auf die gespeicherte Uhrzeit.

## 2026-11-16 – Aufgabenplanung per XML (Review Phase 2 n6)

- **Entscheid:** `schtasks /Create /TN HCLoader-Watchlist /XML <datei> /F`, Datei UTF-16 (mit BOM) in
  einem Temp-Verzeichnis, danach gelöscht. Einstellungen: `StartWhenAvailable=true` (verpasster Lauf
  wird nachgeholt), `DisallowStartIfOnBatteries=false`, `StopIfGoingOnBatteries=false`,
  `MultipleInstancesPolicy=IgnoreNew`, `ExecutionTimeLimit=PT6H`, Trigger täglich `task_time`,
  `InteractiveToken` (nur bei angemeldetem User, kein Passwort). Aktion: `pythonw.exe` + Wrapper, mit
  `WorkingDirectory`. Das 261-Zeichen-Limit von `/TR` entfällt.
- **Grund:** Diese Bedingungen sind per `schtasks`-Parameter nicht setzbar. «Unabhängig von der Anmeldung»
  bräuchte ein Passwort und wird bewusst nicht angeboten; der `Global\`-Mutex deckt es trotzdem ab.

## 2026-11-16 – Playlist-Option «Neueste stehen hinten» (`sources.newest_last`)

- **Problem:** Playlists hängen neue Videos hinten an; `list_source` las die ersten `max_entries` und brach
  beim ersten bekannten Video ab, neue Videos in langen Playlists wurden nie gesehen.
- **Lösung:** DB-Migration 3 (`sources.newest_last INTEGER NOT NULL DEFAULT 0`), nur für Typ `playlist`
  (sonst erzwingt `validate_source` `false`). `YtClient.list_source(..., newest_last=True)` setzt
  `playlist_items = "-1:-N:-1"` (die letzten N, letztes zuerst; **seit Review Phase 4 m4 eigenes
  Blättern mit Grenze 2000**, siehe unten) statt `playlistend`; damit stimmt der
  Abbruch beim ersten bekannten Video wieder. Default bleibt `false`.
- **Gewählte Option (yt-dlp 2026.10.26):** `PlaylistEntries.__getitem__` (`yt_dlp/utils/_utils.py`)
  löst negative Indizes über `len(self)` auf, das ganze Playlist durchläuft (`LazyList`, Seite für Seite);
  eine negative Schrittweite liefert die Einträge rückwärts. `playlistreverse` ist mit `lazy_playlist`
  (von uns für flache Listen gesetzt) wirkungslos (`YoutubeDL.py`: «not supported with lazy_playlist»)
  und hätte ohnehin alle Einträge geladen; `"-N:"` + Reverse bringt nichts Besseres. Der YouTube-Tab-
  Extractor (`_tab.py`) hat keine Sonderbehandlung von `playlist_items`, es gibt also keinen Weg, die
  letzte Seite direkt zu holen. `-N` nur bei Playlists mit weniger als N Einträgen ist unkritisch
  (negative Indizes werden übersprungen, es kommen alle).
- **Request-Aufwand:** eine Seite ≈ 100 Einträge pro Request (Browse-Request + Continuations).
  Normale Prüfung: 1 Request. `newest_last`: `ceil(Länge/100)` Requests, also 500er-Playlist ≈ 5,
  2000er ≈ 20. Zwischen den Seiten greift `sleep_interval_requests` (`settings.throttle.sleep_requests`,
  in `build_ydl_opts` gesetzt; `extractor/common.py::_request_webpage`, gilt auch für Continuations;
  die erste Anfrage einer Instanz ist ausgenommen). Der Throttle zählt das weiterhin als einen
  `list`-Aufruf. Empfehlung: Option nur für lange Playlists einschalten.

## 2026-11-16 – Phase 5: Bibliothek, Sidecar, Protokoll, Wartung

- **Sidecar statt DB-Spalte:** `<app_home>/meta/<id>.json` (`core/sidecar.py`), geschrieben nach jedem
  erfolgreichen Download (Titel, Kanal, Upload-Datum, Dauer, **aufgelöste** Kapitel, Beschreibung auf 2000
  Zeichen gekürzt, Thumbnail-URL, Genre, Quelle, URL). Keine Cookies/Header/Tokens (Whitelist beim
  Bauen). Grund: gross, nie abgefragt, darf verloren gehen (Rückfall: DB-Zeile + ID3-CHAP der Datei),
  keine Schema-Migration neben den Phase-4-Fixes. Die Kapitel werden immer aufgelöst (auch bei
  ausgeschaltetem CUE/CHAP), damit ein späteres Neu-Taggen mit eingeschalteter Option funktioniert.
- **Löschen = `ignored` + Archiv behalten:** `delete_library_item` setzt den DB-Eintrag auf `ignored`
  (`file_path` leer) und lässt `archive.txt` unberührt. Damit lädt weder Suche noch Watchlist das Video
  je wieder; ein Löschen der Zeile würde es beim nächsten Fund erneut einreihen. Folge: erneutes Laden
  geht nur, wenn die Archivzeile von Hand entfernt wird (bewusst kein UI-Weg).
- **Pfadsicherheit:** `library.within(path, root)` (aufgelöst, Symlinks/`..`, Ordner selbst ausgeschlossen).
  Löschen verweigert Dateien ausserhalb des Zielordners vollständig; Neu-Taggen taggt sie, verschiebt
  sie aber nie. `cover.jpg` wird nur gelöscht, wenn nichts anderes mehr im Ordner liegt (mehrere Mixes
  desselben Künstlers/Jahres teilen den Ordner); leere Ordner werden bis ausschliesslich zum Zielordner
  entfernt (`.tmp` wird nicht angefasst, weil nie ein Elternordner einer Bibliotheksdatei).
- **Neu-Taggen:** Genre nach derselben Rangfolge wie der Download (manuell > Quelle > Keyword >
  gespeichertes Genre); die Datei geht in den vom **aktuellen** Template ergebenen Pfad; Reihenfolge:
  erst Tags in die Datei, dann verschieben, dann DB. Schlägt das Taggen fehl, ändert sich nichts; ein
  Ausfall beim Verschieben lässt die (neu getaggte) Datei am alten Ort und die DB unverändert. Existiert
  der Zielpfad, Abbruch ohne Änderung. Läuft im Wartungs-Worker (`retag:<id>` als Job-Schlüssel).
- **CUE-Gültigkeit** (`tagging.cue_chapters`, Abnahmetest `tests/test_cue_acceptance.py`): sortiert,
  streng steigende Zeiten auf dem 1/75-s-Raster (Duplikate fallen weg), erster Track immer `00:00:00`
  (ein erster Zeitstempel > 0 wird auf 0 gezogen = Intro gehört zu Track 01), höchstens 99 Tracks
  (Format), Minuten dürfen > 99 sein (`101:40:00`). `chapters_from_info` verwirft zusätzlich yt-dlp-
  Kapitel ab dem Medienende und doppelte/ungeordnete Starts. Anführungszeichen werden zu `'`.
- **Log-Historie:** `setup_logging(history=500)` (nur GUI-Start) lädt die letzten Zeilen aus
  `hcloader.log` (letzte 512 KB) in den Live-Backlog, einmal pro Prozess. Keine Mehrfach-Zeilen
  (Tracebacks) und kein `ok`-Level aus der Datei.
- **Event `run`:** `Database.add_run_listener` ruft nach `finish_run` die Listener auf; `Api` sendet daraus
  `run` (Form wie `Run`). So bleiben Worker/Watchlist/Headless unverändert.
- **Backups:** `maintenance.BACKUP_KEEP = 10` als Konstante (kein Setting, keine Schema-Änderung);
  `backup_database(keep=…)`, `0` = unbegrenzt. Falls es ein Setting werden soll: `maintenance.backup_keep`
  in `config.py` ergänzen.
- **Update-Abnahmetest:** `run_update(executable=…)` wirkt jetzt vollständig auf den angegebenen
  Interpreter (Versionen und venv-Prüfung über `probe_python`, ein `python -I -c`-Aufruf in dessen
  site-packages). Test `tests/test_update_real_venv.py` (Marker `network`, überspringt sich ohne PyPI):
  echtes `python -m venv`, `yt-dlp==2025.1.15`, `run_update`, Version danach höher, Plugin installiert.
- **n7 erledigt:** `next_run` der Aufgabe kommt aus `schtasks /Query /XML` (Trigger-Uhrzeit, ISO,
  Locale-unabhängig), die CSV-Spalte ist nur Rückfall. Annahme: täglicher Trigger (so legt die App ihn
  an); eine deaktivierte Aufgabe zeigt weiterhin die nächste Trigger-Zeit. Ungetestet auf echtem Windows
  (Ausgabe von `/XML` wird nur per Regex nach `<StartBoundary>` gelesen).
- **Explorer:** `explorer /select,"<pfad>"` als ein String (eine Liste würde als Ganzes gequotet);
  der Exit-Code 1 von Explorer wird ignoriert.

## 2026-11-16 – Review Phase 5: Fixes

- **M1:** Neu-Taggen (`write_tags(..., keep_existing=True)`) lädt den vorhandenen ID3-Tag und ersetzt nur
  die eigenen Frames; fremde Frames bleiben. Der Erst-Download startet weiterhin mit leerem Tag. Ohne
  Kapitel (z.B. `write_id3_chapters` aus) werden alte CHAP/CTOC entfernt, ein altes Cover bleibt ohne neues.
- **m1:** `PathTooLongError`/`ValueError`/`OSError` beim Pfadbau in `retag` -> `{ok:false, error}` (Deutsch), nichts geändert.
- **m2 – eigene Methode statt neuem Rückgabetyp:** `get_library` bleibt `[LibraryItem]` (kein Bruch für
  Mock, Tests, Bridge); neu `get_library_status() -> {target_ok, target}` und pro Eintrag `unknown`.
  Die Prüfung (`library.target_reachable`, Thread + `join(3 s)`) läuft einmal pro `get_library`;
  Einträge unter dem Zielordner werden dann nicht per `stat` geprüft (kein Hängen auf toter SMB-Freigabe),
  `missing=false, unknown=true`. `delete_item` verweigert in dem Zustand (`unreachable`), die UI sperrt
  «Neu taggen»/«Eintrag entfernen» und zeigt das Banner. Folge: Wurde der Zielordner bewusst gelöscht,
  lassen sich Einträge erst nach Neuanlegen oder Ändern von `storage.target_dir` entfernen.
- **m3:** Alte Dateien bleiben nach einer Änderung des Zielordners liegen und werden nie automatisch
  verschoben oder gelöscht. Löschen ausserhalb verweigert (`outside:true`), die UI bietet «Nur Eintrag
  entfernen» (`delete_file=false`); Neu-Taggen taggt sie an Ort und Stelle.
- **n1:** `library.FS_LOCK` (RLock) um letztes Verschieben im Downloader (`ytclient`), `retag`, `delete_item`, `prune_empty_dirs`.
- **n2:** Löschen: erst `.cue`, dann MP3; scheitert etwas, bleibt die DB `done`.
- **n3/n4:** `_same_file` über `os.path.samefile`; reine Gross/Kleinschreibung läuft über einen Zwischennamen
  (`*.hcl-rename`); nach gescheitertem `shutil.move` wird die Kopie am Ziel entfernt.
- **n5:** `desktop.ini`/`Thumbs.db`/`cover.jpg` zählen beim Aufräumen als leer und werden mitgelöscht.
- **n6:** Backups nur mit Muster `hcloader-\d{8}-\d{6}(-\d+)?\.db`; `stat`-Fehler werden übersprungen.
- **n7:** Meldung «Wartung läuft gerade (Neu taggen)».
- **n12:** Sidecar heisst `<id>.<sha1(id)[:8]>.json`; alte `<id>.json` werden gelesen (nur wenn `id` passt),
  beim Schreiben migriert, beim Löschen mitentfernt.
- **n13:** `HCLOADER_REQUIRE_NETWORK=1` (im CI-Network-Schritt) macht aus dem PyPI-Skip einen Fehler; Docstring: Netzsperre gilt nur für Python.
- **Offen (bewusst):** n8 (get_library bei jedem `done`), n9, n10 (Log-Rotation mit zwei Prozessen), n11, n14.

## 2026-11-16 – Review Phase 4: Abbruch pro Quelle, Zeitplan-Kollision, Grenzen

- **M1 – «bekannt» = von dieser Quelle gesehen.** Neue Tabelle `source_videos(source_id, video_id,
  first_seen)` (DB-Migration 4, PK beider Spalten, `ON DELETE CASCADE`; Übernahme aus
  `videos.source_id`). Die Watchlist bricht nur bei einem Video ab, das diese Quelle schon gelistet hat,
  und bei der ersten Prüfung einer Quelle (`last_checked` leer) gar nicht. Fremd bekannte Videos (Suche,
  andere Quelle) werden verknüpft und übersprungen. Sind sie noch `new` und bestehen sie die Filter,
  kommen sie in den Eingang bzw. in die Queue. `source_id` wird nur gesetzt, wenn es leer ist, ein
  manuelles Genre bleibt. Status `inbox`/`done`/`ignored`/… wird nie angefasst.
  **Grund gegen `source_id == sid`:** Ein Video kann in mehreren Quellen stehen (Kanal + Playlist).
  `videos.source_id` hält nur die erste. Die zweite Quelle würde dieses Video nie als «eigenes» erkennen
  und es bei jeder Prüfung neu bewerten. Die Zuordnungstabelle ist eindeutig und kostet wenig.
- **n8:** Einträge mit `live_status` `is_upcoming`/`is_live` werden weder gespeichert noch verknüpft.
  Sie werden bei der nächsten Prüfung neu bewertet (dann mit Dauer) und stoppen den Abbruch nicht.
- **n6:** Neue Auto-Download-Videos werden als `inbox` gespeichert und am Ende der Quelle eingereiht
  (`enqueue` akzeptiert `inbox`). Endet der Prozess dazwischen, stehen sie sichtbar im Eingang.
- **n7:** `sources.max_entries` NULL = `schedule.entries_per_source` zum Prüfzeitpunkt. Neue Quellen ohne
  Wert und `add_channel_source` speichern NULL. Bestehende Zahlen werden nicht migriert.
- **m4:** Suchquellen max. 100 Einträge (SPEC §3.1, Validierung + Kappung bei der Prüfung).
  `newest_last` liest die Playlist selbst (`extract_info(process=False)`, Generator, `deque(maxlen=N)`)
  statt mit `playlist_items "-1:-N:-1"`. `playlist_count` ist nach der ersten Seite bekannt
  (`_tab.py::_extract_from_tabs` liest «N Videos» aus dem Header, yt-dlp 2026.10.26). Ist er > 2000,
  kommt der Fehler «Playlist zu lang für Rückwärts-Lesen (n Einträge, max. 2000)», noch vor der ersten
  Continuation. Fehlt die Zahl, wird nach 2000 Einträgen hart abgebrochen (≈ 20 Seiten). Bei
  Umleitungen (`_type` ≠ playlist) verarbeitet yt-dlp nur die ersten N. `Throttle.mark_request()` setzt
  `state.last_request` beim Verlassen des Metadaten-Locks: Der Abstand zählt ab der letzten Seite.
- **m5:** Kanal-URLs nur Root, `/videos`, `/streams` (andere Tabs liefern Playlists/Regale).
- **m1:** Headless im HTTP-Modus: Hält die GUI den Single-Instance-Lock und antwortet `/ping` auf
  `po_token_port`, benutzt der Lauf diesen Server (`headless.SharedPotWatchdog`). Er startet und stoppt
  ihn nie. Ohne GUI bleibt es beim bisherigen Verhalten: eigener Server, sonst Exit 1. Ein verwaister
  Server ohne GUI wird bewusst nicht übernommen.
- **m2:** Jeder vollständige Lauf (GUI und Headless) setzt beim Start `state.watchlist_running_since`
  und löscht ihn am Ende. Ein Marker, der älter als 6 h ist, gilt als verwaist. Der GUI-Scheduler
  wartet bis 10 min nach diesem Start. Findet eine **geplante** GUI-Prüfung den Watchlist-Lock belegt,
  gibt es keinen Toast und kein `watchlist_done`, nur Debug-Log und `WatchlistScheduler.defer()`
  (+10 min, dann neu bewerten). Eine manuelle Prüfung meldet den Konflikt weiterhin. Umgekehrt endet
  Headless mit `EXIT_BUSY` und einer Log-Notiz, wenn die GUI-Prüfung läuft. Das ist gewollt, die GUI
  übernimmt (Auto-Download-Quellen laden über die GUI-Queue).
- **m3:** `watchlist_last_run` nur bei `checked > 0`. Scheitern alle Quellen ohne Backoff, gilt
  `state.watchlist_retry_at` = jetzt + 1 h. Ein Erfolg löscht ihn. Bei Backoff/Abbruch bleibt beides
  unverändert.
- **n5:** `cancel_event` geht an `search`/`list_source` → Throttle-Wartezeiten, Metadaten-Lock,
  `newest_last`-Blättern (`WaitCancelled` = Lauf «Abgebrochen», kein Quellenfehler). `shutdown` wartet
  bis 10 s auf den Watchlist-Thread. Hängt er noch in einem Request, schliesst
  `watchlist.close_interrupted` den offenen `watchlist`-Run («Abgebrochen (App beendet)») und löscht
  den Laufmarker.
- **n1/n2/n3/n4:** `reset_backoff`/`finish_run`/`clear_backoff_manual` unter `_xlock`.
  `ctypes.get_last_error()` sowie `argtypes`/`restype` (`HANDLE`) für `CreateMutexW`, `ReleaseMutex`
  und `CloseHandle`. Toast-Text über `redact()`. `StartBoundary` = nächster zukünftiger Termin.
- **Tests ohne Netz:** Die vom Proxy gemeldeten Verbindungen kamen vom Playwright-Chromium in
  `tests/test_bridge_js.py`. Er übernahm `HTTPS_PROXY` aus der Umgebung, und seine Hintergrunddienste
  (Component-Updater, Google-Konto/GCM) bauten CONNECTs zu Google-Hosts auf. Die Prüfung mit `strace`
  zeigte `accounts.google.com` und `update.googleapis.com`. Kein Test erzeugt eine echte
  yt-dlp-Extraktion. Chromium startet jetzt ohne Proxy-Variablen und mit `--no-proxy-server`,
  `--host-resolver-rules=MAP * ~NOTFOUND`, `--disable-background-networking` und
  `--disable-component-update`. Zusätzlich blockiert eine autouse-Fixture in `tests/conftest.py`
  `socket.connect`/`connect_ex`/`create_connection`/`getaddrinfo` für alle Nicht-Loopback-Ziele,
  ausser bei Tests mit Marker `network`.

## 2026-11-16 – Watchlist-Retry eskaliert (Review Phase 4, Runde 2, R2-m1)
- Scheitern bei einer Prüfung alle Quellen (ohne Backoff), wird nicht stündlich endlos wiederholt, sondern mit
  wachsendem Abstand: 1 h, 2 h, 4 h, 8 h, 16 h, dann höchstens 24 h (`watchlist.retry_delay`, Zähler
  `state.watchlist_retry_count`). Eine erfolgreiche Prüfung setzt Zähler und Retry zurück. So kostet ein
  dauerhafter Fehler (gelöschte Playlist, unerkannte Sperre) wenige Abfragen pro Tag statt 24.

## 2026-11-16 – Portable-Version (Phase 6, Variante 2: eingebettetes Python)

- **Datenordner-Reihenfolge:** `HCLOADER_HOME` > Portable (`portable.txt` im App-Ordner →
  `<App>\data\`) > `%APPDATA%\HCLoader`. `HCLOADER_HOME` bleibt vorne, weil Tests und Sonderfälle
  (Daten bewusst woanders) es brauchen. `portable.txt` muss eine Datei sein (Ordner zählt nicht).
  Der App-Ordner ist `config.app_root()` (= Elternordner von `app\`). Im Entwicklungs-Checkout ist
  `/portable.txt` per `.gitignore` gesperrt.
- **Relative Pfade:** `config.expand_path` löst einen nach `%VAR%`/`~` noch relativen Pfad nur im
  Portable-Modus gegen den App-Ordner auf (`.\Music` → `<App>\Music`, `\Music` → Laufwerk des
  App-Ordners). Ohne Portable bleibt er wie bisher relativ zum Arbeitsverzeichnis. Default-Zielordner
  bleibt `%USERPROFILE%\Music\HCLoader`. `%APPDATA%` ohne Umgebungsvariable zeigt jetzt immer auf den
  echten Roaming-Ordner (früher `app_home().parent`, im Portable-Modus wäre das der App-Ordner).
- **Update im eingebetteten Python:** `in_venv()` greift dort nicht (`sys.prefix == sys.base_prefix`).
  `maintenance.is_portable_python()` = `portable.txt` im App-Ordner **und** `sys.executable` liegt direkt
  in `<App>\python\`. Nur dann (oder im venv) läuft `pip install -U`, mit zusätzlich
  `--no-warn-script-location --prefer-binary --no-build-isolation`. Ein globales Python bleibt gesperrt.
- **Aufgabenplanung nach dem Verschieben:** Die Aufgabe enthält absolute Pfade. `get_task_status`
  vergleicht `<Command>`/`<Arguments>` aus `schtasks /Query /XML` mit dem aktuellen Ort →
  `path_mismatch`. Die UI bietet «Aufgabe neu anlegen» (= `create_task`, `/F`). Beim GUI-Start einmal
  derselbe Vergleich im Wartungs-Worker, bei Abweichung Toast + Log. Kein automatisches Neuanlegen:
  Liegen zwei Kopien (z.B. USB-Stick und Festplatte) vor, entscheidet der User, welche geplant läuft.
- **Build:** `scripts/build_portable.ps1` (PS 5.1, ASCII). Python-Version `3.12` = neueste 3.12.x mit
  `python-3.12.N-embed-amd64.zip` auf python.org. Seit 3.12 im Security-Modus ist, haben neue
  Patch-Releases **keine Windows-Binaries** mehr. Das Skript probiert absteigend per HEAD und nimmt die
  erste vorhandene (Stand Recherche: 3.12.10). python.org veröffentlicht keine `.sha256`-Datei; die
  Prüfsumme wird ausgegeben, `-PythonSha256` erzwingt sie. Aus dem Container ist python.org nicht
  erreichbar, die Auflösung wurde nicht live getestet (CI prüft sie).
- **`._pth`:** `python312.zip`, `.`, `Lib\site-packages`, `..`, `import site`. Laut CPython
  `Modules/getpath.py` (3.12) bewirkt eine `._pth`-Datei `isolated=1`, `use_environment=0`,
  `safe_path=1`. Folgen: `PYTHON*`-Variablen wirken nicht (Konsole-Starter nutzt `-X utf8` statt
  `PYTHONUTF8`), kein User-site, Skript-/Arbeitsordner nicht auf `sys.path`. Darum steht `..`
  (App-Ordner) in der `._pth`, damit `python -m app.main` geht; `run_watchlist.pyw` setzt den Pfad wie
  bisher selbst.
- **pip-Build-Isolation:** pip baut sdists standardmässig mit «virtual»-Isolation. Dabei übergibt es die
  Build-Werkzeuge per `PYTHONPATH` + `sitecustomize` (pip 26.3, `build_env/virtual.py`), und genau das
  ignoriert der `._pth`-Modus. `proxy_tools` (Abhängigkeit von pywebview) gibt es nur als sdist (PyPI,
  0.1.0) → der Build würde scheitern. Lösung: `setuptools`/`wheel` ins eingebettete Python, dann
  `pip install --prefer-binary --no-build-isolation -r requirements.txt`.
- **Deno/`node_modules`:** `deno install` verlinkt npm-Pakete (`node_modules\<pkg>` →
  `.deno\<pkg>@<v>\...`). Unter Windows sind das Symlinks/Junctions mit **absoluten** Zielen, die nach
  dem Verschieben ins Leere zeigen würden (und in ZIPs nicht vorkommen). `scripts/materialize_links.py`
  ersetzt jeden Link durch eine Kopie des Ziels. Das kostet Platz (Pakete mehrfach), dafür ist der
  Ordner verschiebbar. bgutil 2.0.2 hat nur npm-Abhängigkeiten (`package.json`, `deno.json` nur
  `allowScripts`), also braucht `deno run` keinen globalen `DENO_DIR`-Cache. CI prüft das nach dem
  Verschieben mit leerem `DENO_DIR`.
- **Recherche pywebview + embeddable Python** (PyPI-Metadaten, pywebview-Doku
  `docs/guide/installation.md`, Quelltext pywebview 6.2.1 / pythonnet 3.2.1 / clr_loader 0.3.1):
  - pywebview braucht unter Windows nur `pythonnet` (→ `clr_loader` → `cffi`), dazu `proxy_tools`,
    `bottle` und `typing_extensions`. Kein `tkinter`, kein `venv`. Ausser `proxy_tools` gibt es für
    alles Wheels für cp312/win_amd64 bzw. py3-none-any.
  - pythonnet lädt per clr_loader standardmässig die .NET Framework 4.x Runtime (`netfx`). Scheitert
    das, schaltet pywebview (`platforms/winforms.py`) auf `PYTHONNET_RUNTIME=coreclr` (.NET 6+
    Desktop Runtime). `Python.Runtime.dll` wird im laufenden Prozess initialisiert und nutzt die schon
    geladene `python312.dll`. Nichts davon setzt ein venv oder eine Registry-Installation voraus.
  - WebView2: pywebview wählt Edge Chromium, wenn die WebView2-Runtime in der Registry steht, sonst
    MSHTML (IE) mit Warnung. Die HCLoader-UI läuft unter MSHTML nicht. Auf Windows 10/11 ist
    WebView2 meist vorinstalliert, sonst muss der User den Evergreen-Installer von Microsoft
    ausführen (README).
  - WebView2-Benutzerdaten: `private_mode` ist Standard (HCLoader setzt nichts), also ein
    Temp-Ordner. Auf dem Host bleibt nichts unter `%APPDATA%\pywebview`.
  - **Mark of the Web:** Entpackt man das ZIP mit dem Explorer, bekommt jede Datei den Stream
    `Zone.Identifier`. Das .NET Framework lädt so markierte Assemblies per `LoadFrom` nicht. Davon
    wären `Python.Runtime.dll`, `ClrLoader.dll` und die WebView2-DLLs betroffen. Den Effekt habe ich
    hier nicht reproduziert (kein Windows), er ist aber bekanntes .NET-Verhalten.
    Gegenmassnahme: `app/core/portable.py` entfernt vor `import webview` den Stream dieser DLLs, nur
    im Portable-Modus unter Windows. Zusätzlich steht im README: vor dem Entpacken ZIP →
    Eigenschaften → «Zulassen».
  - Hinweis aus der Python-Doku («Using pip … is not supported with this distribution, though with
    some care it may be possible»): pip im embeddable Python ist offiziell nicht unterstützt. Der
    Update-Knopf ist darum ein bewusst eingegangenes Risiko, abgesichert durch den CI-Rauchtest
    (pytest im eingebetteten Python).
- **Lizenzen:** `THIRD_PARTY_LICENSES.txt` (Kopf `scripts/portable/THIRD_PARTY_LICENSES.header.txt` +
  generierte Paketliste aus den Metadaten) und `licenses\` mit Python-LICENSE, ffmpeg-LICENSE +
  `BUILDINFO.txt` (Konfigurationszeile), Deno-`LICENSE.md` (Tag der gebauten Version), bgutil-LICENSE,
  OFL der Schriften und den Lizenzdateien aller pip-Pakete. ffmpeg von gyan.dev «release essentials»
  ist mit `--enable-gpl --enable-version3` gebaut, also GPL-3.0-or-later, nicht LGPL.
  `BUILDINFO.txt` belegt das pro Build. Geprüfte Angaben (PyPI/Repos, 2026-11-16): yt-dlp Unlicense,
  yt-dlp-ejs «Unlicense AND MIT AND ISC», bgutil-ytdlp-pot-provider GPLv3 (Server-`package.json`:
  GPL-3.0-only), mutagen GPL-2.0-or-later, pywebview BSD-3-Clause, pythonnet MIT, clr_loader MIT,
  cffi MIT-0, pydantic MIT, ruamel.yaml MIT, certifi MPL-2.0, requests Apache-2.0, Deno MIT.
  Keine Rechtsberatung, nur das Beilegen der Texte.
- **CI:** eigener Workflow `.github/workflows/portable.yml` (Tags `v*`, `workflow_dispatch`, Push auf den
  Arbeitsbranch), `windows-latest`, `shell: powershell` (5.1), `timeout-minutes` für Job und Schritte,
  pytest mit `--timeout=120 --timeout-method=thread`. Rauchtests: Importe + Portable-Erkennung +
  pythonnet/WinForms-Import (zeigt den Renderer), `--help`, pytest im eingebetteten Python (Dev-Pakete
  erst **nach** dem ZIP), dann ZIP auf ein anderes Laufwerk entpacken (Workspace auf `D:` → `C:\moved`)
  und Build-Ordner löschen, (a)+(b) dort wiederholen, prüfen dass `pytest` nicht im ZIP steckt, Deno +
  `generate_once.ts --version` mit leerem `DENO_DIR` sowie `potoken.probe('script')`. Erst dann wird
  das Artefakt hochgeladen. Es gibt keinen Release-Upload.
