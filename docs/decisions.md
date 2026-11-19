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
  Ordner verschiebbar. **Überholt (2026-11-17):** Kopien der oberen Links brechen die Auflösung
  transitiver Abhängigkeiten, siehe «bgutil-Provider: hoisted `node_modules`» unten. bgutil 2.0.2 hat nur npm-Abhängigkeiten (`package.json`, `deno.json` nur
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

## 2026-11-17 – SoundCloud: IDs (Phase 7a)

- **Entscheid:** DB-Primärschlüssel bleibt eine einzige Textspalte. YouTube unverändert, SoundCloud
  `sc:<numerische Track-ID>`; zusätzlich `videos.platform` (Migration 5, Bestand = `youtube`).
  Dateiname/Temp-Datei/Sidecar `sc-<id>`, Archivzeile `soundcloud <id>` (yt-dlp-Format), `channel_id`
  `sc:<Nutzer-ID>`. Hilfsfunktionen in `app/core/platforms.py` (rein, ohne yt-dlp).
- **Grund:** Der Doppelpunkt kommt in YouTube-IDs (`[0-9A-Za-z_-]{11}`) nie vor; damit sind die
  ID-Räume sicher getrennt, ohne zusammengesetzten Schlüssel. Verworfen: `(platform, id)` als PK –
  hätte `videos`, `source_videos`, Queue, Bridge (jede Methode mit `id`), Events und Sidecars umgebaut.
  Verworfen: reine numerische SoundCloud-ID – eine Zahl ist zwar kein gültiges 11-Zeichen-YouTube-Muster
  bei < 11 Stellen, aber genau 11 Ziffern wären eines. Das Präfix macht die Plattform auch ohne DB-Zeile
  erkennbar (Download, Archiv, Sidecar). Der Sidecar-Name hängt den Hash der **DB-ID** an, damit eine
  YouTube-ID `sc-12345678` und der SoundCloud-Track `sc:12345678` nie dieselbe Datei teilen. In `.tmp`
  könnte eine solche YouTube-ID theoretisch mit einer 8-stelligen SoundCloud-ID kollidieren; aktuelle
  SoundCloud-IDs haben 9–10 Stellen, Downloads laufen sequenziell.
- Download-URL wird aus der ID neu gebaut: `https://api.soundcloud.com/tracks/<id>` (SoundcloudIE
  ruft dann direkt `tracks/<id>` auf, kein `resolve`), damit gilt die Einzel-Track-Garantie wie bei
  YouTube. Die Webseite (`videos.url`, Permalink) wird gespeichert, weil sie sich nicht aus der ID
  ableiten lässt (`open_video`, COMM-Tag); `videos.channel_url` für «Nutzer zur Watchlist».

## 2026-11-17 – SoundCloud: yt-dlp-Extractor (geprüft gegen yt-dlp 2026.10.26)

Quelle: `yt_dlp/extractor/soundcloud.py`.

- **client_id:** `SoundcloudBaseIE._initialize_pre_login` lädt sie aus dem yt-dlp-Cache
  (`cache.load('soundcloud','client_id')`, Standard-Cacheordner). Fehlt sie: Startseite
  `soundcloud.com` + rückwärts die `<script>`-Assets, bis eine `client_id` gefunden ist (typisch 2–4,
  im schlechtesten Fall ~10 Requests), dann gecacht. Bei 401/403 einer API-Antwort wird sie einmal neu
  geholt (gleiche Kosten) und der Aufruf wiederholt. Ein Datadome-403 kostet damit zusätzlich diese Requests.
- **Suche `scsearchN:`:** `api-v2…/search/tracks?limit=N` (max. 200 pro Seite, Standard 50) → **1
  API-Request** für N ≤ 200. Flache Einträge kommen aus `_extract_info_dict(item, extract_flat=True)`:
  Titel, Dauer (ms → s, float), `timestamp` = `created_at` (exakt, nicht ungefähr), Uploader (Name,
  ID, URL), `playback_count`, Beschreibung, Genre/Tags, `webpage_url` (Permalink). **Aber:**
  `_extract_thumbnails` macht pro Eintrag einen HEAD-Request auf das «original»-Artwork
  (`i1.sndcdn.com`), jeweils nach `sleep_interval_requests` → 30 Treffer = 30 zusätzliche Requests
  und bei 3 s Abstand ~90 s.
- **Nutzer** (`soundcloud.com/<user>`): `resolve` + `stream/users/<id>` (= «All», **inkl. Reposts
  fremder Tracks**); `/tracks`: `users/<id>/tracks`, Seiten à 200 (`linked_partitioning`), neueste
  zuerst (API-Reihenfolge nach `created_at`; nur mit echtem SoundCloud bestätigbar). Kosten: **2
  Requests** pro Prüfung (bis 200 Einträge). yt-dlp reduziert die Einträge aber auf
  `url_result(permalink, id, title)`: **keine Dauer, kein Datum, kein Uploader**, obwohl die API sie
  liefert. Die Seitenabfrage nutzt `impersonate` (Chrome ≥ 116 gegen Datadome); ohne `curl_cffi`
  (im venv nicht installiert) fällt yt-dlp mit Warnung auf normale Requests zurück.
- **Sets** (`/<user>/sets/<set>`): ein `resolve`; nur die ersten ~5 Tracks sind vollständig, der Rest
  sind Stubs (nur `id`). yt-dlp holt die vollen Daten nur bei privaten Sets (Token) über
  `tracks?ids=…`. Einträge sind `url_transparent` ohne Metadaten.
- **Formate:** `media.transcodings` (progressive/HLS × MP3 128 / Opus 64 / AAC 160, Go+ «hq» AAC 256).
  Für **jede** angefragte Transcodierung ein API-Request (`_call_api(format_url)`); Auswahl über
  `extractor_args soundcloud:formats` (Standard 6 Muster). Dazu optional `tracks/<id>/download`
  (Original, bei `downloadable`), 1 HEAD für das Original-Artwork. Ein Download kostet so 1 (Info) +
  1 je Format + 1 HEAD (+ Medien-Segmente auf dem CDN).
- **Go+-Vorschauen:** Feld `policy: "SNIP"` im Track-Objekt; Transcodierungen haben `snipped: true`
  bzw. URL `/preview/` → yt-dlp hängt `_preview` an `format_id` und setzt `preference -10`. In flachen
  Einträgen fehlt beides. `policy: "BLOCK"` → Geo-Sperre.
- **Rate-Limit:** yt-dlp nennt «~600 requests per 10 minutes»; 429 erscheint als `HTTP Error 429`
  (wird von `is_rate_limit_error` erkannt). Unsere Optionen setzen `extractor_retries: 0`, also keine
  RetryManager-Wiederholung.

**Entscheide daraus:**

- `ytclient._sc_flat_extractor_classes()`: Unterklassen von `SoundcloudSearchIE`, `SoundcloudUserIE`,
  `SoundcloudSetIE` mit gleichem `ie_key()` (Klassenname), nur für flache Abfragen pro
  YoutubeDL-Instanz registriert (`add_info_extractor` ersetzt den Eintrag an derselben Stelle).
  (1) kein HEAD für das Artwork (`t500x500` direkt), (2) `_call_api` merkt sich die vollen
  Track-Objekte, `url_result` fügt deren Metadaten in die Einträge ein (kein Zusatz-Request), (3) bei
  Sets werden nur die Stubs **im benötigten Fenster** (erste bzw. letzte N, `newest_last`) in
  50er-Blöcken nachgeladen, (4) `sc_policy` in jedem flachen Eintrag. Kosten danach: Suche **1**,
  Nutzer **2**, Set **1 + ⌈Stubs/50⌉**. Ändert yt-dlp die internen Namen, greift die Erweiterung nicht
  mehr (Original-Verhalten, Dauer fehlt → Filter «Dauer unbekannt»); ein Test mit echtem yt-dlp und
  gemockter HTTP-Schicht (`tests/test_soundcloud.py`) fällt dann auf.
- Watchlist liest bei einem Nutzer immer `/tracks` (`normalize_source_url`), nicht den Stream mit
  Reposts. `/<user>/likes`, `/reposts`, `/albums` usw. werden abgelehnt.
- `soundcloud:formats = http_aac, hls_aac, http_mp3, hls_mp3` (ohne Opus 64: nie besser, kostet je
  einen Request). Format `bestaudio` ohne WAV/AIFF/FLAC (Original-Downloads sind riesig und nicht
  taggbar). Mit `download.keep_original_soundcloud` (Standard) keine MP3-Umwandlung (AAC 160 → `.m4a`).
- Download: Liefert die Extraktion nur `…_preview`-Formate, bricht `YtClient` **vor** der
  Medienübertragung ab («Nur Vorschau (Go+) – …»), markiert `videos.preview`. Filter: `preview` oder
  SoundCloud-Dauer 29–31 s → «Nur Vorschau (Go+)».
- Für SoundCloud gelten weder PO-Token, Deno (`js_runtimes`), `youtubetab:approximate_date` noch
  `cookiesfrombrowser` (die Cookie-Notlösung ist für YouTube gedacht).

## 2026-11-17 – Throttle, Warteschlange und Watchlist pro Plattform (Phase 7a)

- **Throttle:** Das App-Objekt `Throttle` ist der YouTube-Throttle (State-Schlüssel und Lock-Namen
  unverändert, keine Migration). `throttle.platform("soundcloud")` liefert einen Geschwister-Throttle
  mit eigenen Grenzen (`settings.soundcloud`), State-Präfix `soundcloud.` (Backoff, Stufe, Suchzeiten,
  Tages-/Laufzähler, letzter Request, Ende des letzten Downloads), eigenem Prozess-Lock
  `throttle-soundcloud` und Metadaten-Lock (`metadata-soundcloud`, Datei-Lock + Thread-Lock). Eine
  SoundCloud-Suche darf also parallel zur YouTube-Extraktion laufen – es sind verschiedene Server,
  pro Plattform bleibt alles seriell. `start_run()` setzt die Laufzähler aller Plattformen zurück
  (ein Lauf umfasst beide), `finish_run(success, platforms=…)` setzt die Backoff-Stufe nur der
  Plattformen zurück, die im Lauf erfolgreich luden. Der Lauf-Lock (ein Download-Lauf) bleibt global:
  weiterhin genau ein aktiver Download.
- **Warteschlange:** Eine Sperre (Backoff, Tageslimit, Lauflimit) gilt pro Plattform. Der Lauf nimmt
  den ersten wartenden Eintrag einer **freien** Plattform (`next_queued(exclude_platforms=…)`); die
  Reihenfolge innerhalb einer Plattform bleibt. `blocked_code` nur, wenn alle wartenden Plattformen
  gesperrt sind, sonst `platform_blocked`. Lokale Sperren (PO-Token-Server im HTTP-Modus, Zielordner)
  gelten weiterhin für die ganze Warteschlange (siehe offene Punkte).
- **Watchlist:** Ein 429/Backoff bei einer Quelle überspringt die restlichen Quellen **dieser**
  Plattform (Event `source` mit Fehler, nicht als Fehler gezählt), die andere Plattform wird weiter
  geprüft. `result.backoff` bleibt `true` → `watchlist_last_run` wird nicht gesetzt (nach dem Backoff
  erneut prüfen, wie bisher). Abgelehnt/verschoben (`check_sources`, In-App-Intervall, Headless-Start)
  wird nur, wenn **jede** Plattform mit aktiver Quelle im Backoff ist (`watchlist.blocked_until`).
  SoundCloud-Quellen werden bei `soundcloud.enabled = false` übersprungen.
- **Status:** `get_status().platforms` (pro Plattform Backoff, Zähler, Grenzen); `backoff`/`counters`
  oben bleiben YouTube (UI kompatibel). `clear_backoff(platform?)`, ohne Argument alle.

## 2026-11-17 – Duplikate über Plattformen (Phase 7a)

- Gleiche Dauer ±5 s **und** normalisierter Titel (Kleinbuchstaben, Akzente, Satzzeichen weg,
  Füllwörter wie «official/audio/hq/ft» weg) mit Token-Jaccard ≥ 0.8 gegen Zeilen der **anderen**
  Plattform mit Status done/queued/downloading (`app/core/duplicates.py`, Index
  `videos(platform, duration)`). Ergebnis `duplicate_of {id, platform, title}` bei Suchtreffern und im
  Eingang. Nicht automatisch ausgeblendet; `filters.hide_cross_platform_duplicates` setzt den
  Filtergrund «Vermutlich bereits geladen (…)». Watchlist: nie automatisch in die Warteschlange (auch bei
  Auto-Download → Eingang); mit der Option gar nicht in den Eingang.
- **Grund:** Mixes werden oft auf beiden Plattformen hochgeladen; Titel unterscheiden sich in
  Zusätzen («(Official Audio)», «[HQ]»). Eine reine Titelgleichheit wäre zu streng, die Dauer allein
  zu lose. Bewusst nur «vermutlich»: Der User entscheidet.

## 2026-11-17 – Quellen-Namen vorschlagen (`name_auto`)

- `watchlist.suggest_source(url_or_query, type_hint)` (rein, ohne Netzwerk) und Bridge
  `suggest_source`. `sources.name_auto` (Migration 5). Die Prüfung ersetzt einen automatischen Namen
  durch den Namen aus der flachen Liste (`YtClient.list_source` gibt eine `SourceListing` mit
  `source_name` zurück): YouTube-Kanal `channel`/`uploader` (der `title` ist «<Kanal> - Videos»),
  Playlist `title`, SoundCloud-Nutzer `title` ohne « (Tracks)», Set «<uploader> – <title>». Kein
  Zusatz-Request; Suchquellen behalten ihre Query. `name_auto` bleibt `true`, bis der User den Namen
  ändert (die UI schickt dann `false`). `add_channel_source` aus der Suche setzt den bekannten
  Kanalnamen mit `name_auto=false`.

## 2026-11-17 – Player (Phase 8, Backend)

- **Einstellung** `player.mode` ∈ {`internal`, `external`}, Default `internal` (Tab «Allgemein»). Beide Aufrufe
  `get_media` / `play_external` stehen immer bereit; die Einstellung wählt nur die UI (Menü bietet pro Eintrag die
  andere Variante).
- **Logik** in `app/core/player.py`, `api.py` delegiert nur. Kein Netzwerk, kein Throttle.
- **`file:`-URL:** `Path.resolve().as_uri()`. pywebview/.NET `System.Uri` behandelt `?` und `#` in `file:`-URLs als
  Teil von Query/Fragment, deshalb sind Leerzeichen, `#`, `%`, `?`, `[`, `]`, Umlaute prozentkodiert (getestet:
  die URL führt zurück auf dieselbe Datei). Die URL wird nur für `<audio>`/`<img>` erzeugt, nie als Pfad gespeichert.
- **Pfadregel (Orchestrator-Entscheid):** Status `done` und eine Audiodatei (Endung `.mp3/.m4a/.opus/.ogg/.webm/
  .flac/.aac/.wav`). Abspielen ist reines Lesen: Mixes aus einem früheren Zielordner bleiben abspielbar, nachdem der
  User den Zielordner geändert hat. Der Pfad stammt nur aus der eigenen DB (vom Download geschrieben), nie aus der UI.
  Die Endungsprüfung verhindert, dass `play_external`/`os.startfile` je etwas anderes als Audio startet.
  Löschen/Verschieben bleibt auf den aktuellen Zielordner beschränkt (library.py).
- **Cover-Cache:** `<app_home>/cache/covers/<Sidecar-Name>.jpg` (Name = `<file-id>.<hash>` des Sidecars, damit
  `sc:…`/Gross-Kleinschreibung nie kollidieren). Neu erzeugt nur, wenn die Audiodatei neuer ist als der Cache.
- **Kapitel:** Sidecar, sonst ID3 CHAP, sonst `.cue`. Die Reihenfolge entspricht dem Neu-taggen (Sidecar ist die
  aufgelöste Wahrheit; CUE ist der letzte Notnagel, z.B. bei von Hand kopierten Dateien).
- **CSP:** Der UI-Agent ergänzt `media-src 'self' file:` (und `img-src … file:` für das Cover) in `ui/index.html`;
  hier nur dokumentiert.

## 2026-11-17 – SoundCloud-Nacharbeiten (Phase 8)

- **`--smoke` mit SoundCloud-Permalink** (`https://soundcloud.com/<user>/<track>`): `ytclient.soundcloud_track_url`
  erkennt ihn (Nutzer-Root, `/tracks`, `/sets/…`, reservierte Pfade nicht). `YtClient.resolve` akzeptiert den
  Permalink (Plattform SoundCloud, URL ohne Query/Fragment, Throttle wie jeder Metadaten-Request), liefert die
  `sc:<id>`, danach lädt `download` per ID wie sonst. Der Smoke-Throttle kennt jetzt auch die SoundCloud-Limits
  (`platform_settings`), vorher galten dort die YouTube-Werte.
- **yt-dlp-Cache:** `build_ydl_opts` setzt `cachedir` = `<app_home>/cache/yt-dlp` (SoundCloud-`client_id`, Signatur-
  Caches); im Portable-Modus bleibt damit alles im Datenordner statt in `%LOCALAPPDATA%`/`~/.cache`.
- **`curl_cffi`:** yt-dlp 2026.10.26 hat das Extra `curl-cffi` (`curl-cffi>=0.5.10,<0.18`, ohne 0.6–0.9), im
  `METADATA` geprüft. Es erlaubt Browser-Impersonation, die SoundCloud/Datadome bei 403 verlangt. PyPI-Wheel
  `curl_cffi-0.17.0-cp310-abi3-win_amd64.whl` existiert (abi3, passt für Python 3.12). Darum `yt-dlp[default,curl-cffi]`
  in `requirements.txt`, `pyproject.toml` und im Update-Knopf (`maintenance.PIP_SPECS`). Im dev-venv installiert.

## 2026-11-17 – Selbst-Update von HCLoader (GitHub-Releases)

- **Entscheid – Version:** eine Quelle der Wahrheit `app/__init__.py` `__version__` (SemVer `0.x.y`).
  `pyproject.toml` liest sie (`dynamic = ["version"]`, `[tool.setuptools.dynamic]`), `build_portable.ps1`
  per Regex, `maintenance.app_version()` per Import. Ein Release ist der Git-Tag `v<__version__>`; der
  Workflow `portable.yml` bricht ab, wenn Tag und `__version__` nicht übereinstimmen.
  **Grund:** `binaries.package_version("hcloader")` lieferte im nicht installierten Checkout/Portable nichts.
- **Entscheid – Prüfung:** `GET https://api.github.com/repos/<repo>/releases/latest`, bei 404 (noch kein
  Release) `…/tags?per_page=100` mit der höchsten SemVer-Version. Pre-Releases (`-rc1`, Flag `prerelease`)
  und Drafts zählen nie. Unauthentifiziert (60 Anfragen/h pro IP reichen für 1×/Start), Timeout 5 s,
  einmal pro GUI-Start im eigenen Worker `hcloader-selfupdate`, abschaltbar
  (`maintenance.check_app_updates_on_start`). Repo als Setting `maintenance.update_repo` (Forks).
  **Grund:** GitHub, nicht YouTube → kein Throttle (wie die PyPI-Prüfung). Fehler/offline nur ins Log
  (Info), damit ein Offline-Start keine Meldung bringt; die manuelle Prüfung zeigt den Fehler.
- **Entscheid – Download nur nach Klick:** Die UI zeigt «Version x verfügbar – Herunterladen / Änderungen /
  Später»; erst der Klick lädt (Hintergrund). **Grund:** User-Wunsch, Kontrolle über Datenverkehr.
- **Entscheid – Paket und Prüfsumme:** Quell-ZIP des Tags. Bevorzugt das Release-Asset
  `HCLoader-<v>-source.zip` (von `portable.yml` per `git archive` gebaut), sonst
  `https://codeload.github.com/<repo>/zip/refs/tags/v<x>`. GitHub veröffentlicht für Quell-ZIPs keine
  Prüfsumme und die Bytes sind nicht garantiert stabil; darum hängt der Workflow `SHA256SUMS` (über
  Source- und Portable-ZIP) an. Steht die geladene Datei darin, muss der Hash stimmen; ohne `SHA256SUMS`
  bzw. ohne Eintrag wird nur die ZIP-Integrität geprüft (CRC aller Einträge, keine `..`/absoluten Pfade,
  keine Symlinks, `app/__init__.py` + `app/main.py` vorhanden, Version im Paket = Tag, Grössenlimits).
  Ist `requires-python` der neuen Version höher als der laufende Interpreter: Abbruch mit Hinweis
  «Portable-ZIP neu herunterladen» bzw. «Python installieren, setup.ps1» (kein automatischer Python-Wechsel).
- **Entscheid – Staging statt Austausch im Betrieb:** Entpackt werden nur `app/`, `ui/`, `scripts/` und
  `config.example.yaml`, `README.md`, `LICENSE`, `CHANGELOG.md`, `requirements.txt`, `pyproject.toml` nach
  `<app_home>/update/staging/` (+ `manifest.json`). In der Portable-Version zusätzlich die Starter aus
  `scripts/portable/` (CRLF/ASCII wie im Build), nie `portable.txt`. Nie angefasst: `data\` (Settings,
  DB, Archiv, Logs, Cache), `portable.txt`, `python\`, `.venv\`, `bin\` (ausser dem Provider, s.u.),
  `licenses\`, `.git\` und die Musik im Zielordner. Die Liste `PROTECTED` steht im Manifest und wird im
  PowerShell-Skript nochmals geprüft.
- **Entscheid – pip/Binaries im Updater nach App-Ende, mit Rollback:** Ändert sich `requirements.txt`
  (normalisierter Vergleich), läuft `pip install -r requirements.txt` erst im Updater, wenn HCLoader beendet
  ist. **Grund:** `.pyd`-Dateien (pydantic-core, curl_cffi, pythonnet) sind im laufenden Prozess gesperrt,
  und ein `--target`-Staging liesse sich im `._pth`-Python und im venv nicht sauber tauschen. Vorher kopiert
  der Updater `site-packages` nach `_previous\site-packages` (robocopy, lange Pfade) und stellt es bei einem
  Fehler wieder her. Portable mit `--no-build-isolation --prefer-binary` (wie der Update-Knopf).
  `fetch_binaries.ps1 -BinDir … -Python …` läuft nur, wenn sich das Skript selbst oder die requirements
  geändert haben (es ist idempotent: Deno/ffmpeg werden nur bei Fehlen geholt, der Provider bei anderer
  Plugin-Version); vorher Kopie von `bin\bgutil-pot-provider`, im Portable danach `materialize_links.py`.
- **Entscheid – Updater `scripts/apply_update.ps1`:** PowerShell 5.1, ASCII, PSModulePath-Schutz,
  `\\?\`-Pfade, `Remove-Tree` wie die anderen Skripte. Die App kopiert das **installierte** Skript (passt zum
  Manifest-Format dieser Version; Fallback das gestagte) nach `<app_home>/update/`, schreibt
  `update.lock` und startet `powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File …
  -Manifest … -WaitPid <pid> [-Restart]` mit `CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP` und, falls
  erlaubt, `CREATE_BREAKAWAY_FROM_JOB` (überlebt das Ende der App); Arbeitsordner = Update-Ordner (kein
  Handle auf getauschte Ordner). Ablauf: warten aufs Prozessende (180 s, sonst Abbruch ohne Änderung) →
  betroffene Einträge per Umbenennen nach `<App>\_previous\` (gleiches Laufwerk, schnell) → Staging an ihre
  Stelle kopieren → ggf. pip/fetch → `result.json` → Lock weg → Neustart (`python\pythonw.exe -m app.main`
  bzw. venv-`pythonw`, Arbeitsordner = App-Ordner). Bei Fehlern Rollback aus `_previous\`, Log
  `<app_home>/logs/update.log`, Neustart der alten Version. `_previous\` bleibt bis zum nächsten
  erfolgreichen Start (dann gelöscht).
- **Entscheid – Neustart vs. Beenden:** «Jetzt neu starten» schliesst das Fenster; das normale Beenden
  (`Api.shutdown`: Queue gestoppt, Download abgebrochen und wieder `queued`) läuft zuerst, danach startet
  `main.py` den Updater (`Api.finish_update`). «Beim Beenden»/«Später»: Setting
  `maintenance.apply_update_on_exit` (Default an) spielt beim nächsten Schliessen ohne Neustart ein; aus =
  das bereitgelegte Update wird beim nächsten Start wieder angeboten.
- **Entscheid – Single-Instance während des Updates:** `<app_home>/update/update.lock`. `main.py` (GUI und
  Headless) startet nicht, solange es jünger als 30 min ist («HCLoader wird gerade aktualisiert …»,
  Exit 4); älter = verwaist, wird entfernt.
- **Entscheid – Git-Checkout:** Liegt `.git` im App-Ordner, wird nur geprüft und angezeigt, nie geladen oder
  überschrieben: «Git-Checkout – bitte «git pull» und danach «scripts\setup.ps1» ausführen». Eine
  venv-Installation per ZIP (ohne `.git`) aktualisiert sich wie die Portable-Version, pip läuft dann mit
  dem venv-Python. Ohne venv/Portable-Python und mit geänderten requirements: Abbruch mit Hinweis setup.ps1.
- **Entscheid – DB-Migration ohne Datenverlust:** `db.migrate(before=…)` ruft vor dem ersten fälligen Schritt
  einer bestehenden DB (Version ≥ 1) `maintenance.backup_before_migration` auf →
  `<db-Ordner>/backups/hcloader-premigrate-v<alt>-to-v<neu>-<ts>.db` (sqlite3-Backup-API). Eigene
  Aufbewahrung: die 5 neuesten; das Muster der normalen Backups (`hcloader-\d{8}-…`) erfasst sie nicht,
  die normale Rotation löscht sie also nie. Scheitert das Backup, wird nicht migriert
  (`MigrationBackupError`, «Daten unverändert»). Die Migration selbst bleibt pro Schritt atomar.
  `get_versions().backups` listet beide Arten (`kind`).
- **Entscheid – neuere DB in älterer App:** `SchemaTooNewError` (Unterklasse von `RuntimeError`, alte
  Aufrufer bleiben gültig). `main.py` zeigt statt eines Tracebacks: «Die Datenbank stammt von einer neueren
  HCLoader-Version (Schema vX) … bitte aktualisieren … oder eine Sicherung hcloader-premigrate-… zurückkopieren»
  (MessageBox unter pythonw), Headless schreibt dasselbe nach stderr/Log, Exit 1. Nichts wird verändert.
- **Nicht live getestet (kein Windows im Container):** `apply_update.ps1` nur statisch (ASCII, keine `&&`,
  Parameter = Python-Aufruf), Prozessstart per Mock, GitHub per Fake-HTTP.

## 2026-11-17 – Review-Funde Phase 7a/8/Selbst-Update (Integrator)

- **Geo-Sperre SoundCloud (M1):** Für flache Einträge wird `policy` vor `super()._extract_info_dict`
  neutralisiert (ohne Formate würde yt-dlp bei `BLOCK` immer `GeoRestrictedError` werfen) und danach als
  `sc_policy` gesetzt; `url_result` fängt `ExtractorError` pro Eintrag ab. Neue Spalte `videos.geo_blocked`
  (Migration 6, statt Wiederverwendung von `preview`: andere Bedeutung, anderer Filtergrund), Filtergrund
  «Nicht verfügbar (Region)» vor «Nur Vorschau (Go+)». `enqueue` lehnt `preview`/`geo_blocked` ab.
- **yt-dlp-Drift (M2):** `_sc_check_capabilities` prüft Klassen, Methoden, `_API_V2_BASE`/`_HEADERS` und
  die Signaturen (`_extract_info_dict(self, info, …, extract_flat)`, `_extract_set(self, playlist,
  token=None)`, `url_result(url, ie, video_id, …)`). Bei Abweichung keine Unterklassen (Warnung einmal).
  Zur Laufzeit fangen die Overrides nur `AttributeError/TypeError/KeyError/IndexError/ValueError` und
  fallen auf das Original zurück; `ExtractorError` (429/403 von SoundCloud) geht immer durch zum Throttle.
- **SoundCloud-Bot-Prüfung (M3):** `is_rate_limit_error(msg, platform)`: für SoundCloud zusätzlich
  `[soundcloud…] … HTTP Error 403` und Datadome-Merkmale. yt-dlp holt bei 401/403 in `_call_api` selbst
  einmal eine neue `client_id` und wiederholt; ein 403, der uns erreicht, ist also der zweite in Folge
  (= «zwei aufeinanderfolgende 403»). Bewusst nicht: 404, 401, 403 des Medien-CDN (ohne Extractor-Präfix).
- **Updater (M4, m2, m3):** Rename-Probe aller Einträge vor jeder Änderung (gesperrt → `unchanged`,
  Update bleibt bereit, alte Version startet). Journal `<update>\in_progress.json` vor jeder Änderung,
  Einträge vor dem Umbenennen eingetragen; im Austausch nur Umbenennen (kein Kopieren+Löschen).
  Wiederherstellung per `apply_update.ps1 -Recover` aus `HCLoader.cmd`/`.vbs` und `app.main` (nicht während
  der schreibende Updater noch lebt). `_previous` wird nur nach `ok`/`rolled_back` gelöscht, sonst
  `_previous-<Zeit>`. Lauf-Lock: `launch()` prüft ihn nach dem Schreiben von `update.lock`; das Skript hält
  während des Austauschs selbst einen Handle auf den Run-Mutex (Namen im Manifest).
- **Prozess-Locks (Windows-CI):** Named Mutex nie besitzen (`bInitialOwner=FALSE`, kein Wait):
  `ERROR_ALREADY_EXISTS` = belegt, Freigabe = `CloseHandle` (thread-unabhängig; `ReleaseMutex` ginge nur
  im besitzenden Thread, und besessene Mutexe sind für diesen Thread rekursiv). Dazu ein prozessinternes
  Set gehaltener Namen und `__del__` als Netz. Ursache der CI-Kaskade war ein autouse-Fake von
  `GetLastError` in `test_locks.py`, der auf Windows `ALREADY_EXISTS` verdeckte und Run-Lock-Handles
  liegen liess.
- **Session-Ende (m1):** `GetSystemMetrics(SM_SHUTTINGDOWN)` (gesetzt, sobald `WM_QUERYENDSESSION`
  verschickt wurde) in `finish_update`; ein eigener WndProc-Hook im pywebview-Fenster wäre fragil.
- **Update-Vertrauen (m6/m7):** nur https + GitHub-Hosts (auch nach Redirects), `SHA256SUMS` fail-closed
  wenn vorhanden, sonst Hinweis «ohne Prüfsumme»; fremdes `update_repo` sichtbar. Voraussetzungen (2FA,
  Tag-Ruleset `v*`, immutable releases) in `docs/RELEASING.md`.
- **Update-Banner:** Leiste als erstes Kind von `<main>` statt `position:fixed` oben rechts (QA: verdeckte
  «Suchen»/Sortierung).

## 2026-11-17 – bgutil-Provider: hoisted `node_modules` (Portable verschiebbar, offline)

- **Fehler:** Portable-CI Smoke (e), nach dem Verschieben mit leerem `DENO_DIR`: `Could not find package
  'lru-cache' from referrer '…/server/node_modules/proxy-agent/dist/index.js'`. Lokal unter Linux
  reproduziert (Deno 2.9.6, bgutil 2.0.2): alle Links per `materialize_links.py` kopiert, Ordner verschoben.
- **Ursache:** Mit `package.json` läuft `deno run` im Modus `manual` (BYONM, Deno-Doku «Manual mode is the
  default mode for projects using a package.json») und löst npm-Pakete wie Node auf: vom echten Pfad des
  importierenden Moduls aufwärts `…/node_modules/<name>`. `deno install` legt standardmässig das
  pnpm-artige «isolated»-Layout an: `node_modules/<pkg>` → `.deno/<pkg>@<v>/node_modules/<pkg>`, die
  Abhängigkeiten sind Geschwister-Links in `.deno/<pkg>@<v>/node_modules/`. Über den Link liegt der echte
  Pfad in `.deno`, die Geschwister werden gefunden. Als Kopie liegt `node_modules/proxy-agent` ausserhalb
  von `.deno`, und oben liegen nur direkte Abhängigkeiten (`lru-cache` gibt es in 7 und 11).
- **Entscheid – Option C: Deno-eigener hoisted Linker** (Deno ≥ 2.8, denoland/deno#32788; Doku
  `runtime/fundamentals/node.md` «Pick a layout: isolated vs hoisted»; Quelltext v2.9.6
  `libs/npm_installer/hoisted.rs`): `deno install --frozen --allow-scripts=npm:canvas
  --node-modules-dir=manual --node-modules-linker=hoisted`, dazu in `server/deno.json`
  `"nodeModulesDir": "manual", "nodeModulesLinker": "hoisted"` (`scripts/hoisted_node_modules.py configure`).
  Ergebnis wie npm: echte Ordner (Klon/Hardlink/Kopie aus dem Cache, keine Symlinks/Junctions ausser für
  Workspace-Pakete, die bgutil nicht hat), die meistgebrauchte Version oben, Konflikte verschachtelt unter
  dem abhängigen Paket (`proxy-agent/node_modules/lru-cache` 7.x), Lifecycle-Skripte (canvas) laufen im
  endgültigen Ordner. `.bin` (Shims der Dev-Werkzeuge) wird gelöscht. `deno.lock` bleibt unverändert
  (`--frozen`).
- **Verworfen – A (eigener Hoister aus `.deno`):** wäre derselbe Algorithmus, nur selbst gepflegt
  (Peer-Varianten, optionale/OS-spezifische Pakete, Zyklen, verschachtelte Konflikte). Deno macht genau das
  seit 2.8 selbst und testet es.
- **Verworfen – B (Junctions beim Start neu anlegen):** Junctions/Symlinks gehen auf FAT32/exFAT nicht –
  genau dort liegt eine Portable-Version oft (USB-Stick). Ausserdem Schreibzugriff und ein Start-Schritt bei
  jedem Ortswechsel, Marker-Logik, und Deno könnte bei abweichendem `.deno`-Zustand neu installieren wollen
  (Netz).
- **Prüfung statt Hoffnung:** `scripts/hoisted_node_modules.py check <server> --native canvas` (nur
  Standardbibliothek, läuft im eingebetteten Python) prüft nach jeder Installation: kein Link unter
  `node_modules`, jede direkte Abhängigkeit oben in der gesperrten Version, für jedes installierte Paket
  jede Abhängigkeit aus `deno.lock` per Node-Walk-up in genau der gesperrten Version auffindbar (optionale
  und optionale Peers dürfen fehlen), `canvas/build/Release/*.node` vorhanden. Am materialisierten
  isolated-Layout meldet die Prüfung genau den CI-Fehler (`node_modules/proxy-agent: findet lru-cache
  nicht`). Läuft in `fetch_binaries.ps1`, in `build_portable.ps1` und in Smoke (e) am neuen Ort, dort
  zusätzlich ein echter `require('canvas')` aus `jsdom` heraus (jsdom lädt canvas erst bei Bedarf,
  `--version` deckt es nicht ab).
- **Bestehende Installationen:** `.hcloader-version` enthält jetzt `<Plugin-Version> hoisted-1`; alte
  Marker (nur Version) → `fetch_binaries.ps1` installiert den Provider neu. Die Portable-Version bekommt das
  über das Selbst-Update (geändertes `fetch_binaries.ps1` ⇒ `binaries_changed`). Ein `deno.exe` älter als
  2.8 wird neu geladen. `materialize_links.py` bleibt als Sicherheitsnetz im Build/Updater (erwartet: 0 Links).
- **Linux-Nachweis (Scratch, Deno 2.9.6 aus npm `deno`):** frischer Klon bgutil 2.0.2 → `configure` →
  hoisted `deno install` → `check` (315 Pakete ok) → `materialize_links` (0 Links) → Build-`DENO_DIR`
  gelöscht, Ordner verschoben → `generate_once.ts --version` mit leerem `DENO_DIR` und toter Proxy-Adresse
  (kein Netz) = `2.0.2`, `require('canvas')` ok, HTTP-Modus `main.ts` antwortet auf `/ping`. Gegenprobe
  isolated + materialisiert: derselbe `lru-cache`-Fehler wie in der Windows-CI.
- **Offen:** `deno install --prod` (ohne devDependencies, ZIP deutlich kleiner) wirkte mit `--frozen` +
  hoisted in Deno 2.9.6 nicht (alle 315 Pakete installiert); später erneut prüfen.

## 2026-11-17 – Installer (Inno Setup 6) neben dem Portable-ZIP

- **Entscheid – Inhalt = Portable-Build ohne Marker:** `installer/HCLoader.iss` packt die Dateien des
  Portable-ZIPs (CI entpackt das ZIP in einen sauberen Ordner, damit keine Testartefakte wie
  `__pycache__`, `data\` oder pytest hineinkommen), aber ohne `portable.txt` und `data\`. Ergebnis: dasselbe
  eingebettete Python, `app_home()` fällt auf `%APPDATA%\HCLoader` zurück (wie beim venv-Install).
  **Grund:** ein Build, zwei Verpackungen; keine zweite Python-Umgebung, die eigens gepflegt werden muss.
  Daten im Roaming-Profil überleben Deinstallation und Neuinstallation.
- **Entscheid – pro Benutzer:** `PrivilegesRequired=lowest`, Standardordner
  `{localappdata}\Programs\HCLoader`, fester `AppId` `{363DD978-CFF7-4D2A-B9B1-F9D6073903A4}`.
  **Grund:** kein UAC; der Ordner muss für Selbst-Update und den yt-dlp-Knopf (pip) beschreibbar sein.
- **Entscheid – Selbst-Update erkennt installierte Kopien:** `maintenance.is_embedded_python()` = Interpreter
  direkt in `<App>\python\` und dort `python3xx._pth` (oder Portable-Modus); `is_portable_python()` bleibt
  «eingebettet + `portable.txt`». `selfupdate.detect_runtime()` liefert den Modus `installed`, der wie
  `portable` behandelt wird (`BUNDLED_MODES`: pip mit `--no-build-isolation --prefer-binary`, Starter,
  Links auflösen); der yt-dlp-Update-Knopf akzeptiert das eingebettete Python. `get_update_status()`
  meldet `installed`. **Grund:** ohne Marker fiel die installierte Kopie bisher in den Modus `other` –
  pip ohne die nötigen Flags bzw. «weder venv noch Portable» beim yt-dlp-Update und Abbruch bei
  geänderter `requirements.txt`.
- **Entscheid – Upgrade ersetzt die Programmordner:** `[InstallDelete]` löscht `python\`, `app\`, `ui\`,
  `scripts\`, `bin\`, `licenses\`, `_previous*` vor dem Kopieren; `CloseApplications` (Restart Manager,
  Filter inkl. `*.pyd`) schliesst eine laufende App. **Grund:** keine veralteten Module/Pakete-Metadaten
  der alten Version neben den neuen.
- **Entscheid – Deinstallation:** `[UninstallDelete] {app}` komplett (auch `_previous*`, `__pycache__`, per
  pip aktualisierte Pakete). Vorher beendet ein verstecktes PowerShell HCLoader-Prozesse aus `{app}` und
  löscht die Aufgabe `HCLoader-Watchlist` nur, wenn ihr Programm bzw. Arbeitsordner in `{app}` liegt (eine
  Portable-Kopie kann eine gleichnamige Aufgabe besitzen). `%APPDATA%\HCLoader` und die Musik werden nie
  angefasst. Damit das Löschen von `{app}` sicher ist, verweigert das Setup Zielordner, die nicht leer sind
  und keine HCLoader-Installation enthalten, sowie Ordner mit `portable.txt`/`data\`.
- **Entscheid – MAX_PATH:** CI misst den längsten relativen Pfad (`portable_tools.py longest`), bricht ab,
  wenn `%LOCALAPPDATA%\Programs\HCLoader` + Pfad > 259 Zeichen, und warnt, wenn Benutzernamen mit 20
  Zeichen nicht mehr passen. Der Wert geht als `/DMaxRelPath` ins Setup, das zu lange Zielordner ablehnt
  (auch bei `/DIR=` im Silent-Modus). **Grund:** Inno Setup und Teile von Windows sind nicht durchgehend
  long-path-fähig; tiefe `node_modules`-Pfade des bgutil-Providers.
- **Offen:** nicht signiert (SmartScreen «Weitere Informationen › Trotzdem ausführen»); nach einem
  Selbst-Update zeigt «Apps & Features» weiter die Version des letzten Setups (kosmetisch).

## 2026-11-17 – Mehrsprachigkeit (v0.2.0, Schritt 1: Architektur + de/en)

- **Entscheid – Englisch ist Referenz und Standard:** `general.language` = `en` als Standard (auch für
  bestehende `config.yaml` ohne den Schlüssel), `auto` als Option (Windows-Anzeigesprache über
  `GetUserDefaultUILanguage`, im Browser `navigator.languages`; nicht unterstützt → `en`). Jeder Schlüssel
  entsteht zuerst in `en`; Rückfall fehlender Schlüssel: aktive Sprache → `en` → Schlüssel (einmal
  `console.warn` bzw. Log-Warnung). Deutsch (de-CH, «ss») ist der zweite vollständige Katalog.
  **Grund:** User-Wunsch; Englisch als Brücke für die übrigen neun Sprachen.
- **Entscheid – UI-Kataloge als JS-Dateien:** `ui/js/locales/<code>.js` ruft
  `HC.i18n.register(meta, dict)` auf; alle elf Dateien per `<script>`-Tag (~70 KB je Sprache). Beide
  Argumente sind striktes JSON, damit die Tests sie mit Python prüfen. **Grund:** kein `fetch` unter
  `file://` in WebView2, kein Build-Step, Sprachwechsel ohne Nachladen.
- **Entscheid – Sprachwechsel = UI neu laden:** Nach dem Speichern einer anderen Sprache lädt die Seite
  neu (`location.reload()`); das Backend übernimmt die Sprache sofort. Ein Neuaufbau der Ansichten im
  laufenden Betrieb wäre fehleranfällig (Ansichten registrieren Event-Listener in `init`). Kein
  App-Neustart; Warteschlange, Läufe und Downloads laufen im Backend weiter, nur ein laufender
  Mini-Player stoppt. Im Mock hält `sessionStorage` die Sprache über das Neuladen.
- **Entscheid – Plurale und Formate über Intl:** Pluralschlüssel sind Objekte mit CLDR-Kategorien
  (`one`/`other`, Arabisch bis `zero`…`many`), Auswahl über `params.count`, sonst `params.n`
  (`Intl.PluralRules`; im Backend eigene Regeln für die elf Sprachen in `i18n.plural_category`).
  Zahlen, Datum, Uhrzeit, relative Zeiten, Dauer und Dateigrössen formatiert `Intl` mit dem `intl`-Locale
  des Katalogs (de-CH: 1’234’567, 14.11.2026). Zahlen als Parameter ohne Tausendertrennung (Jahre).
- **Entscheid – Backend übersetzt selbst und sendet fertigen Text:** `app/core/i18n.tr(key, **params)`
  mit Katalogen `app/locales/<code>.json`; die Meldungen entstehen tief in `core/` (pydantic-Validatoren,
  yt-dlp-Fehler, Queue-Gründe), UI und Backend folgen derselben Einstellung. Schlüssel+Parameter in jedem
  Event hätten den Bridge-Vertrag überall geändert. Module-Konstanten speichern den Schlüssel und
  übersetzen erst beim Gebrauch (sonst wäre die Sprache beim Import eingefroren).
- **Entscheid – Log-Datei:** INFO/WARNING/ERROR-Zeilen werden beim Schreiben in der aktiven Sprache
  formuliert – Datei und Live-Log sind identisch. DEBUG-Zeilen und Programmierfehler (ungültige
  Argumente, interne Signaturprüfungen) sind fest Englisch und nicht im Katalog. **Grund:** ein Logger,
  ein Text; Support-Logs mit DEBUG sind sprachunabhängig lesbar.
- **Entscheid – Daten sind sprachneutral:** Genre «Unsortiert» und die Standard-Genres, DB-Werte
  (Status, Plattform, Lauf-Art), Ordner- und Dateinamen (`{genre}`, Fallback-Artist), Tags, Archiv
  und `config.yaml`-Schlüssel bleiben unverändert; übersetzt werden nur Anzeigetexte eingebauter
  UI-Begriffe (Status «Downloaded», Lauf-Art «Manual» …). Der Name des Fallback-Genres wird nicht
  übersetzt angezeigt, weil er auch Ordnername auf der Platte ist. Freitexte, die mit einem Datensatz
  gespeichert werden (Lauf-Notiz, Fehler eines Videos), behalten die Sprache ihrer Entstehung.
  **Grund:** ein Sprachwechsel darf weder Ordner verschieben noch Duplikate erzeugen.
- **Entscheid – Mock bleibt Englisch:** simulierte Backend-Meldungen und Mock-Daten in `ui/js/mock.js`
  sind Englisch (kein Katalog), Screenshots `--lang xx` zeigen also UI-Texte in xx, Mock-Logzeilen
  englisch. **Grund:** der Mock ist ein Entwicklerwerkzeug; doppelte Kataloge nur für den Mock lohnen nicht.
- **Entscheid – Tests:** `tests/test_i18n.py` prüft Schlüssel-, Platzhalter-, HTML-Tag- und
  Plural-Parität (en/de vollständig, die neun anderen als `xfail` mit Anzahl fehlender Schlüssel),
  einen Lint gegen deutsch aussehende Strings in `ui/` (ausser Kommentaren und Katalogen), alle
  literal verwendeten Schlüssel, Fallback, Plural-Regeln und `general.language`. Die Verhaltens-Tests
  vor v0.2.0 laufen mit der Fixture `german_messages` und halten so den deutschen Katalog am
  bisherigen Wortlaut fest.
- **Offen:** `config.yaml`-Kommentare (`config.COMMENTS`) und die Beschreibung der Windows-Aufgabe
  bleiben deutsch; `CLAUDE.md` nennt noch «nur de-CH in `ui/js/i18n.js`» (Änderung durch den User).

## 2026-11-17 – Dialekte als Sprache (de-x-frk, v0.2.0)

- **Entscheid:** Private-Use-Codes mit `-x-` (zurzeit nur `de-x-frk`, «Fränggisch») sind wählbare
  Sprachen, werden aber nie von `auto` gewählt und nie über die Basissprache getroffen (`de-DE` → `de`).
  Meldet das System selbst `de-x-frk`, wird `de` verwendet. Das Katalog-Meta `fallback` (`"de"`) schiebt
  eine Stufe vor Englisch ein: Dialekt → `de` → `en` → Schlüssel; gleich in `ui/js/i18n.js` und
  `app/core/i18n.py`. **Grund:** ein Spass-Dialekt darf niemandem ungefragt erscheinen; fehlende
  Dialekt-Texte sollen deutsch statt englisch erscheinen.

## 2026-11-17 – Installer-Vorgaben (Datenschutzseite, SignPath)

- **Entscheid:** Der Installer zeigt nach der Ordnerwahl eine Seite «Privacy and network access» mit
  der Checkbox «Check for updates at startup» (Standard an; still: `/UPDATECHECK=0`; bei Upgrades
  gilt die frühere Wahl). Er schreibt `{app}\installer-defaults.json`
  (`{"maintenance": {"check_app_updates_on_start": …, "check_updates_on_start": …}}`).
  `config.load_with_warnings` legt diese Werte nur über die eingebauten Standards, **solange keine
  `config.yaml` existiert**; mit dem ersten Speichern landen sie in `config.yaml`. Vorrang:
  vorhandene `config.yaml` (auch leer/defekt) > `installer-defaults.json` > Standardwerte. Ungültige
  Werte in der Datei fallen still (DEBUG) auf den Standard zurück.
  **Grund:** SignPath-Foundation-Bedingung (Netzwerkzugriffe ohne User-Auftrag beschreiben, bei der
  Installation zeigen, abschaltbar); ein Upgrade oder eine Neuinstallation darf eine bestehende
  User-Konfiguration nie überschreiben. Keine Registry, damit `core/` plattformneutral bleibt.

## 2026-11-17 – Release-Automatik aus `main`

- **Entscheid:** `portable.yml` bekommt einen Job `plan` (nur lesend): Bei einem Push auf `main`, dessen
  `__version__` noch keinen Tag `v<version>` hat und dessen `CHANGELOG.md` einen Abschnitt
  `## [<version>]` enthält, erstellt der Job `release` nach grünem Build + Smoke den Tag (REST-API, auf
  `GITHUB_SHA`) und das Release im selben Lauf. Tag-Push und `workflow_dispatch` auf einem Tag bleiben;
  `workflow_dispatch` auf einem Branch released nie. `contents: write` nur im Job `release`.
  **Grund:** Mit `GITHUB_TOKEN` erstellte Tags lösen keinen weiteren Workflow aus; der CHANGELOG-Abschnitt
  ist das bewusste Freigabesignal, damit gewöhnliche Pushes auf `main` nie ein Release erzeugen.

## 2026-11-17 – Review v0.2.0: Nachträge (Plural, Backoff-Dedup, Installer-Upgrade, nl-BE)

- **Entscheid:** (1) Die Plural-Kategorie richtet sich in UI und Backend nach dem Katalog, aus dem der
  Text tatsächlich stammt (Fallback `nl`/`de`/`en`), nicht nach der aktiven Sprache. (2) Der Headless-Lauf
  erkennt einen bereits notierten Backoff über den stabilen Block-Code (`DownloadQueue.blocked()[0]`,
  `last_session["note_code"]`, `WatchlistResult.backoff`), nie über den übersetzten Text. (3) Existiert
  `{userappdata}\HCLoader\config.yaml`, blendet der Installer die Update-Checkbox aus und zeigt stattdessen
  einen Hinweis (en/de; übrige Installer-Sprachen erben den englischen Text).
  **Grund:** (1)/(2) sprachunabhängiges Verhalten; (3) die Checkbox wäre wirkungslos, weil `config.yaml`
  immer Vorrang hat – Ausblenden ist einfacher und robuster als eine zweite Wahrheit.
- **Entscheid:** `nl-BE` («Vlaams (België)») ist eine regionale Variante mit `meta.fallback: "nl"` und
  enthält nur Schlüssel, deren belgischer Wortlaut abweicht (u-Form, «enkel», «bewaren», «bv.» …).
  Anders als `-x-`-Dialekte wählt `auto` sie: `nl-BE`/`nl-Latn-BE`/`Dutch_Belgium` → `nl-BE`, übrige
  `nl-*` → `nl`. Paritätstests erlauben unvollständige Kataloge für Sprachen mit `meta.fallback`.
  **Grund:** echte Landesvariante statt Spass-Dialekt; Teil-Katalog vermeidet 900 Duplikate.
- **Entscheid:** Zahl-Parameter formatiert nur die UI lokal (`Intl`, z. B. bengalische Ziffern in `bn`);
  Backend-Meldungen setzen Zahlen unformatiert (lateinische Ziffern) ein. **Grund:** funktional
  harmlos; eine zweite Zahlenformatierung in Python (ohne ICU) wäre Aufwand ohne Nutzen (Review v0.2.0 m10).

## 2026-11-17 – Release-Notizen: übersprungene Versionen und externe Links (v0.2.1)

- **Entscheid:** Die Update-Prüfung bleibt bei `releases/latest` (bzw. Tags); nur wenn ein Update
  verfügbar ist, folgt **eine** Anfrage `releases?per_page=20` für die Notizen der übersprungenen
  Versionen (`UpdateStatus.releases`). Fehler dort sind still: dann nur das angebotene Release.
  Entwürfe/Pre-Releases bleiben draussen (es gibt keinen Pre-Release-Kanal). Tags-Fallback:
  Abschnitte der `CHANGELOG.md` des Tags. **Grund:** bestehendes, getestetes Verhalten für «latest»
  unverändert; höchstens eine Zusatzanfrage pro Prüfung und nur, wenn der Dialog sie braucht.
- **Entscheid:** Externe Links (`<a target="_blank">`) gehen in der App über die Bridge-Methode
  `open_url` → `selfupdate.open_link` → `webbrowser.open`; erlaubt nur `https://` auf `github.com`
  bzw. dem Host des Update-Repos. `bridge.js` fängt die Klicks global ab (nur live); der Mock behält
  `target=_blank`. **Grund:** WebView2 öffnet `_blank` je nach pywebview-Version gar nicht oder in
  einem App-Fenster; die Host-Prüfung im Backend verhindert, dass Release-Text beliebige Ziele startet.
- **Entscheid:** Wartung › «Versionshinweise» liest die mitgelieferte `CHANGELOG.md` (`get_release_notes`,
  offline) statt GitHub. **Grund:** funktioniert ohne Netz und ohne Rate-Limit, passt immer zur
  installierten Version; die Datei liegt schon im Portable-Build, im Installer und im Selbst-Update.

## 2026-11-17 – Festivals & Serien (v0.3.0, Backend)

- **Entscheid:** Serien in der DB (`series`, Migration 7), nicht in `config.yaml`. Aliase, schwache
  Aliase, Kanäle und Varianten sind JSON-Spalten statt eigener Tabellen (`series_alias` aus dem
  Konzept entfällt). `editions` = Serie + Jahr (0 = unbekannt) + Variante ('' = keine), eindeutig.
  Pro Video: `edition_id`, `suggested_edition_id`, `stage`, `set_type` (Code), `episode`,
  `festival_confidence`, `festival_manual`. **Grund:** Aliase werden nur als Ganzes gelesen (Erkennung
  in Python), JSON hält Migration und Bearbeiten einfach; die Liste ist Nutzerdaten, keine Einstellung.
- **Entscheid:** Mitgelieferte Liste `app/data/series.yaml` (35 Einträge: 29 Festivals, 6 Radio/Podcast,
  Bühnen, Set-Arten, Negativwörter). `sync_builtin` läuft billig (nur bei geändertem Datei-Hash):
  fügt neue Schlüssel ein, aktualisiert nur unveränderte; vom User bearbeitete (`user_modified`) oder
  gelöschte (`hidden`) mitgelieferte Serien bleiben unberührt, `reset_series` stellt sie wieder her.
  Aus der Datei entfernte Einträge werden zu eigenen Serien (keine Daten gehen verloren).
  **Grund:** User-Wunsch «Updates überschreiben nie meine Änderungen».
- **Entscheid:** Erkennung = Punktesystem (`app/core/festivals.py`): Alias im Titel 0.5 (schwacher
  Alias 0.3, direkt mit Jahreszahl 0.5; nur Beschreibung 0.25), Veranstalter-Kanal +0.15, Jahr im
  Titel +0.3 (Upload-Jahr +0.1), Folgennummer (Radio/Podcast) +0.3, Bühne +0.1, Set-Art +0.1
  (nicht Anthem/Episode), Negativwort (Remake, Aftermovie, Tickets …) −0.4. Schwelle Standard 0.65.
  Schwache Aliase für Allerweltswörter (Rebirth, Supremacy, Loudness, Hard Bass, Syndicate,
  Ground Zero, Decibel, Intents, Unleashed, MOH). Bühne nur als eigenes Titelsegment, «<Name> stage»
  oder Grossbuchstaben-Wort (sonst Fehltreffer wie «Red Bull», «Black Mirror»). **Grund:** nach
  ~75 realen Titeln: «Defqon.1 2019 | RED» → 0.9, «Defqon.1 anthem remake» → 0.2,
  «Hard Bass mix 2020» (Russian Hardbass) → 0.6 = nur Vorschlag.
- **Entscheid:** Standard-Genre einer Serie nur bei klar einspartigen Serien (Masters of Hardcore,
  Thunderdome, Hardstyle-Podcasts …), nicht bei Defqon.1, Q-BASE, Decibel usw. Angewendet nur, wenn das
  Genre sonst «Unsortiert» wäre und das Video noch nicht eingereiht/geladen ist.
  **Grund:** gemischte Festivals (Hardstyle + Hardcore-Bühnen) würden sonst falsch einsortiert; Ablage
  und TCON geladener Dateien dürfen sich nicht still ändern (Review Phase 3 M1).
- **Entscheid:** `TXXX:FESTIVAL` = Serie + Variante («Defqon.1 Australia»), `TXXX:SET_TYPE` = englisches
  Label aus der Datendatei («Closing Ceremony»), zusätzlich `TXXX:EPISODE`. Album = Ausgabe bei
  `storage.album_from_edition` (Standard an, User-Entscheid 1). Leere Platzhalter `{festival}`,
  `{event_year}`, `{stage}` werden aufgeräumt, nur Ordnerebenen mit diesen Platzhaltern können
  entfallen; Muster ohne sie ergeben byte-gleiche Pfade wie bisher. **Grund:** sprachneutrale, stabile
  Tags für Plex/Jellyfin; Standardmuster unverändert (User-Entscheid 2).
- **Entscheid:** Der Zuordnungs-Durchlauf läuft im Wartungs-Worker (`Worker`, Job `festivals`), nicht im
  Download- oder Such-Thread, sendet `festival_assign` alle 25 Einträge und ist abbrechbar. Er taggt
  keine Dateien neu. **Grund:** rein lokal (DB + Sidecar), kollidiert so nicht mit Update/Backup;
  Dateien bewegen sich nur auf ausdrücklichen Wunsch (Konzept «Out of scope»).
- **2026-11-17 – Entscheid (Review v0.3.0 M1):** Erkennung aus flachen Quellen (Suche, Watchlist,
  `detect_and_store(..., flat=True)`) überspringt Einträge mit Status queued/downloading/done und ersetzt
  eine bestehende Zuordnung/Vorschlag nie durch ein schwächeres oder leeres Ergebnis. **Grund:** flache
  Listen liefern fast nie die Beschreibung; Zuordnungen aus Download und «Festivals zuordnen» sind
  stärker, DB und Datei-Tags dürfen nicht auseinanderlaufen.
- **2026-11-17 – Entscheid (Review v0.3.0 m1/m2/m5):** An/Aus einer Serie läuft über eigene Methode
  `set_series_enabled` und ist keine Inhaltsänderung (mitgelieferte Serien erhalten weiter Updates);
  `save_series` vergleicht normalisiert. Der Durchlauf schreibt in Transaktionen à 200 Zeilen, lädt den
  Katalog pro Block neu und behandelt eine inzwischen gelöschte/ausgeblendete Serie als «keine
  Erkennung». **Grund:** kein Einfrieren durch blosses Umschalten, kein Abbruch durch FK-Fehler, weniger
  fsyncs auf HDD/NAS.

## 2026-11-17 – «Alles einlesen (einmalig)» pro Watchlist-Quelle (v0.4.0)
- **Entscheid:** Seitenweises Lesen über einen Wrapper um `YoutubeDL.urlopen` (`ytclient._PagedGate`),
  nicht über mehrere Aufrufe mit `playlist_items`/`playliststart`. Vor **jeder** Anfrage an die Plattform
  werden die bis dahin empfangenen Einträge an den Kern übergeben (DB + Cursor), dann wartet die Anfrage
  auf `Throttle.backfill_slot` (Backoff-Prüfung, Tempo pro Stunde, `sleep_requests`) unter dem
  Metadaten-Lock – **nur für diese eine Anfrage**. Lokale Anfragen (PO-Token-Provider, 127.0.0.1) laufen
  ungebremst durch. `sleep_interval_requests` ist dafür 0. **Grund:** yt-dlp kennt bei YouTube/SoundCloud
  nur «nächste Seite»-Tokens; ein Start bei Eintrag N muss alle Seiten davor erneut holen. Mit Aufrufen
  pro Abschnitt würden die Kosten quadratisch wachsen (2000 Einträge Kanal ≈ 335 statt 67 Anfragen). Der
  Wrapper drosselt jede einzelne Seitenanfrage (auch Client-ID-Suche von SoundCloud), hält den
  Metadaten-Lock nie über die ganze (lange) Liste und lässt Suchen/Downloads dazwischen.
- **Entscheid:** Fortsetzen nach Unterbrechung ab `backfills.position`; die Seiten davor werden erneut
  (flach) abgefragt und übersprungen. Das ist in der Schätzung enthalten. **Grund:** Fortsetzungs-Tokens
  von yt-dlp sind intern und nicht stabil speicherbar.
- **Entscheid:** Tempo statt hartem Stundenbudget: `watchlist.backfill_requests_per_hour` (Standard 120 =
  alle 30 s, persistiert in `state.backfill_last_request`, prozessübergreifend) verteilt die Anfragen
  gleichmässig. Im Headless-Lauf gilt derselbe Wert als Budget pro Lauf (`RequestBudgetSpent` → bleibt
  `pending`). **Grund:** Ein hartes Stundenbudget kleiner als die Seitenzahl bis zum Cursor käme nach
  einer Unterbrechung nie voran; gleichmässiges Tempo ist für YouTube schonender als Schübe.
- **Entscheid:** Treffer gehen **immer** in den Eingang (auch bei `auto_download`); gleiche Verarbeitung
  wie die normale Prüfung über die gemeinsame Klasse `watchlist.Ingest` (Filter, Dedup über
  `source_videos` und Video-Status, Cross-Plattform-Duplikate, Festival-Erkennung). `last_checked` wird
  nicht gesetzt. **Grund:** User-Vorgabe; Hunderte Downloads auf einen Schlag wären weder gewollt noch
  schonend; eine Logik statt zwei.
- **Entscheid:** Zustände `pending` (wartet/unterbrochen, setzt automatisch fort), `running`, `paused`
  (vom User – kein automatisches Fortsetzen; oder nach 3 Fehlern in Folge), `done`, `cancelled` (Cursor
  verworfen, Treffer bleiben). Automatisches Fortsetzen: 90 s nach dem App-Start, nach jeder
  Watchlist-Prüfung (Intervall oder von Hand, ohne Backoff) und im Headless-Lauf nach den Downloads.
  Quellen einer Plattform im Backoff werden ohne Anfrage übersprungen, deaktivierte Quellen nur bei
  ausdrücklichem Start gelesen. **Grund:** Unterbrechungen sollen nichts kosten; eine Pause des Users
  ist ein bewusster Entscheid und wird nicht übergangen.
- **Entscheid:** Eigener Thread `hcloader-backfill` (nicht der Watchlist-Thread) und eigener
  prozessübergreifender Lock `backfill` (GUI vs. Headless), immer nur ein Backfill gleichzeitig.
  **Grund:** Ein Backfill dauert bis zu einer Stunde und darf Watchlist-Prüfungen nicht blockieren; die
  Anfragen selbst laufen trotzdem nie parallel (Throttle + Metadaten-Lock pro Anfrage). Während eines
  Backfills ist das yt-dlp-Update gesperrt (`YtdlpGate.search`).
- **Entscheid:** Migration 8: Tabelle `backfills` (eine Zeile pro Quelle, `ON DELETE CASCADE`) und
  `sources.item_count` (Grösse aus `playlist_count` der letzten Prüfung, ohne Zusatzanfrage). Die
  Schätzung im Bestätigungsdialog braucht so kein Netzwerk; ohne bekannte Grösse wird vorsichtig mit dem
  Maximum gerechnet.

## 2026-11-17 – Review v0.4.0: Tempo ohne Lock, Ökonomie des Fortsetzens, Headless ohne Run-Lock
- **Entscheid (M1):** Die Tempo-Wartezeit eines Backfills (`Throttle.backfill_pace`, `3600 /
  backfill_requests_per_hour`) läuft **ohne jeden Lock**; erst danach nimmt die Seitenanfrage den
  Metadaten-Lock und darin nur `Throttle.backfill_request` (Backoff-Prüfung, `sleep_requests`, Stempel).
  `backfill_slot` bleibt als Kombination ohne Lock. **Grund:** Bei bis zu 360 s Wartezeit (10/h) liefen
  Suchen, In-App-Prüfungen (Timeout 60 s → `MetadataBusy` → Quellenfehler) und Download-Extraktion
  sonst in den Lock; auch die GUI während eines Headless-Backfills (prozessübergreifender Lock).
- **Entscheid (M2):** Ökonomie des Fortsetzens explizit: Ein Fortsetzen holt alle Seiten vor dem Cursor
  erneut (nur «nächste Seite»-Tokens). Innerhalb eines Laufs gibt es genau **einen** seitenweisen
  Generator – keine Seite wird in einem Lauf zweimal gelesen. Die GUI hat kein Budget und kommt immer
  durch. Ein **Headless-Lauf übernimmt einen Backfill nur, wenn er ihn im verbleibenden Budget fertig
  lesen kann** (`backfill.cost`: Anlauf + erneut gelesene Seiten + restliche Seiten). Passt er nicht
  einmal ins ganze Budget, gibt es keine Anfrage, sondern die Notiz «Zu gross für einen geplanten Lauf
  (N Anfragen …)» (mit dem nötigen Wert, falls ≤ 600/h) und er läuft in der App weiter; passt er nur
  nicht mehr in den Rest dieses Laufs, kommt er im nächsten Lauf. Die Seitengrösse wird pro Quelle aus
  früheren Läufen gelernt (`state.backfill_page_size:<id>`, konservativ); ein Lauf, der sein Budget nur
  mit erneutem Lesen verbraucht hat, speichert eine obere Schranke, sodass der nächste Lauf sicher
  zurückstellt. Der Bestätigungsdialog warnt (`headless_ok`). **Grund:** Vorher konnte jeder geplante Lauf
  sein ganzes Budget mit denselben Seiten verbrauchen (Kanal, Cap 5000, 120/h: täglich ~120 nutzlose
  Anfragen ohne Fortschritt) – gegen Prinzip 1. Ein Teil-Lauf im Headless spart auch nichts: das nächste
  Fortsetzen müsste seine Seiten ohnehin erneut holen. «Mindestens eine neue Seite» als Regel hätte
  immer noch fast das ganze Budget für Wiederholungen ausgegeben. Fortsetzungs-Tokens speichern bleibt
  verworfen (yt-dlp-intern, nicht stabil).
- **Entscheid (M3):** Der Headless-Lauf gibt Run- und Watchlist-Lock **vor** der Backfill-Phase frei;
  Exklusivität kommt vom eigenen `backfill`-Lock und dem Metadaten-Lock pro Anfrage. Ein yt-dlp-Update
  der GUI setzt `state.ytdlp_update_started`; ein Backfill eines anderen Prozesses prüft das vor jeder
  Anfrage und hört auf (bleibt `pending`, geht später mit dem neuen yt-dlp weiter). **Grund:** Sonst
  waren GUI-Queue, In-App-Prüfungen und Update rund eine Stunde blockiert; ein Update mitten unter einem
  laufenden Prozess soll diesen nicht mit gemischten yt-dlp-Dateien weiterlaufen lassen.
- **Entscheid (m1/m3):** Vor dem Speichern jeder Seite prüft der Backfill seine Zeile: nicht mehr
  `running` (Pause/Abbruch auch aus einem anderen Prozess, Quelle gelöscht) oder Stop-Event gesetzt →
  er hört auf, **ohne** die Seite zu speichern (sie wird beim Fortsetzen neu gelesen). `start_backfill`
  übernimmt eine fremde `running`-Zeile nur, wenn der Backfill-Lock frei ist. **Grund:** Zähler und
  Eingang stimmen immer überein; kein Prozess liest ungebremst weiter, nachdem der User pausiert hat.
- **Entscheid (m4, m7):** Ein Weiterleitungs-Ergebnis (`url`/`url_transparent`) wird erneut mit
  `process=False` aufgelöst (Cursor pro Seite bleibt erhalten). Skript-Downloads der SoundCloud-
  Client-ID-Suche (`*.sndcdn.com`) werden gezählt und gespaced, aber nicht getaktet.
- **Akzeptiert (m5, m6):** Der Backfill legt auch neue Uploads einer Auto-Download-Quelle in den Eingang
  (nicht in die Queue) – dokumentiert, «Prüfen» vorher lädt sie automatisch. Der Cursor ist ein Index:
  gelöschte/private Videos vor dem Cursor können beim Fortsetzen ebenso viele Einträge überspringen –
  für ein einmaliges Einlesen hinnehmbar, dokumentiert im Wiki.

## 2026-11-17 – Installer-Smoke ohne Haenger (CI, portable.yml «Smoke (f)»)

- **Befund:** Der Schritt hing zweimal > 20–35 Min., ohne dass `timeout-minutes` griff und ohne Log.
  Der Schritt startete Setup und Deinstallation mit `Start-Process -Wait` (PS 5.1 wartet auf den ganzen
  Prozessbaum, beim Uninstaller also auch auf die zweite Phase `%TEMP%\_iu*.tmp` und deren PowerShell)
  und die Python-Prüfungen mit `& $py` – alles ohne eigene Zeitgrenze. Im Uninstaller wartet `Exec`
  (`ewWaitUntilTerminated`) unbegrenzt auf ein PowerShell, das `Get-ScheduledTask`/`Unregister-ScheduledTask`
  (CIM/Aufgabenplanung) aufruft – der wahrscheinlichste Hänger. Zudem stand in `NextButtonClick` ein
  `MsgBox`, das `/SUPPRESSMSGBOXES` nicht unterdrückt (wird auch im Silent-Modus aufgerufen).
- **Entscheid:** Im Smoke läuft jeder externe Prozess über `Invoke-Bounded` (`Start-Process -PassThru`,
  `WaitForExit(ms)`, stdout/stderr in Dateien); bei Zeitüberschreitung Prozessliste (Name, Pfad,
  Eltern-PID, Kommandozeile), Inno-`/LOG`-Enden, `taskkill /T /F`, klare Fehlermeldung. Setup und
  Uninstaller bekommen immer `/LOG=`; auf die zweite Uninstaller-Phase (`_iu*`) und das Verschwinden des
  Ordners wird begrenzt (5 Min.) gewartet. Im `.iss` läuft der Aufgaben-Teil der Aufräum-PowerShell in
  einem Job, der nach 60 s gestoppt wird; `MsgBox` → `SuppressibleMsgBox`. **Grund:** ein Hänger muss
  in Minuten mit Diagnose scheitern statt den Runner zu blockieren; die Deinstallation beim User darf
  nie an der Aufgabenplanung hängen bleiben.

## 2026-11-18 – Installer-Smoke als eigener Job (CI, portable.yml `installer-smoke`)

- **Befund:** Trotz `Invoke-Bounded` (1e04ebe) hing «Smoke (f)» weiter > 19 Min.; weder die 300-s-Grenzen
  noch `timeout-minutes: 20` griffen, das Job-Log fehlte (404). Muster: der Runner-Prozess selbst wird
  beendet oder friert ein. Verdacht: Inno-Restart-Manager (`CloseApplications=yes`, Filter
  `*.exe,*.dll,*.pyd`) schliesst Prozesse mit offenen Dateien, oder ein Neustart/Abmelden.
- **Entscheid:** (1) Setup und Uninstaller im CI mit `/NOCLOSEAPPLICATIONS /NORESTART`. (2) Im `.iss`
  bleibt `CloseApplications=yes` für den User, der Filter prüft aber nur noch `python.exe,pythonw.exe,
  deno.exe` (Dateinamen der in `{app}` installierten Dateien, die in Gebrauch sind) – RM trifft so nur
  Prozesse, die die Programme dieser Kopie ausführen. (3) Installationsordner `C:\hcl-smoke\HCLoader`,
  ausserhalb der Runner-Ordner (`_work`, `_temp`); cwd nie darin, Kinder bekommen leeres stdin; nach jedem
  Aufruf und vor Upgrade/Deinstallation werden Prozesse aus dem Ordner (nach Pfad) beendet. (4) Eigener
  Job `installer-smoke` (`needs: portable`, lädt ZIP + Installer als Artefakte, 15 Min.), Phasen als
  eigene Schritte f1–f4 mit eigenem `timeout-minutes`, Zeitstempel-Markern und `::group::`, plus
  `if: always()`-Aufräumschritt; `release` hängt davon ab. Helfer in `.github/scripts/installer_smoke.ps1`.
- **Grund:** ein Hänger darf Build und Artefakte nicht mitreissen, und ein Teil-Log muss zeigen, wo es
  stehen blieb; der Restart Manager darf auf dem Runner nichts schliessen.

## 2026-11-18 – Festival-Sammler (v0.5.0, Backend)

- **Datenmodell:** Migration 9 mit zwei Tabellen statt Spalten an `editions`: `checklists` (eine Zeile pro
  Ausgabe mit Checkliste: Playlist-URL + Zustand des Suchauftrags) und `checklist_rows` (ein erwartetes
  Set). `status` wird gespeichert (Statistik per SQL), ist aber **abgeleitet** (`collector.sync`: Flag
  `ignored`, sonst aus dem Status des Treffer-Videos) und wird bei jedem Lesen und bei jedem `video`/
  `done`/`failed`-Event nachgeführt – so braucht die Download-Queue keinen Sammler-Code. Ein Video ist pro
  Ausgabe höchstens einer Zeile zugeordnet; abgelehnte Kandidaten (`rejected`) kommen nie wieder.
  **Grund:** eine Quelle der Wahrheit (Videostatus), keine zweite Statusmaschine in `worker.py`.
- **Abgleich zuerst offline:** vor jeder Suche und nach jedem Import gegen gespeicherte Videos (kostet
  nichts). Bewertung additiv wie die Festival-Erkennung (Gewichte in `collector.py`, Doku in
  docs/bridge-api.md); «sicher» (ohne Klick) nur mit Artist + Serie + Jahr im Titel und
  `festivals.collector_auto_confirm` (0.85). Alles andere ab 0.50 braucht eine Bestätigung.
  **Grund:** Konzept «uncertain hits need a click»; ein falsches Set zu laden kostet einen Download.
- **Suchauftrag:** eine flache Suche pro Zeile über `YtClient.search` (Throttle zählt sie gegen
  `max_searches_per_hour`) und zusätzlich gleichmässig verteilt mit eigenem Tempo
  `festivals.collector_searches_per_hour` (Standard 10/h, nie über dem globalen Limit, letzter Zeitpunkt
  persistent). Cursor = `searched` pro Zeile (nicht ein Index wie beim Backfill: Zeilen ändern sich
  während des Auftrags). Unterbrochen (`pending`) → 90 s nach dem App-Start weiter; `cancelled` →
  «Start» setzt fort; `done`/`restart` → alle Zeilen ohne Treffer neu. Kein eigener prozessübergreifender
  Lock, weil Headless-Läufe nicht suchen (eine 50-Zeilen-Checkliste braucht ~5 h – das passt in kein
  Stundenbudget). Eigene Threads `hcloader-collector` (lang) und `hcloader-collector-import` (kurz),
  damit ein stundenlanger Suchauftrag den Playlist-Import nicht blockiert; beide gehen durch denselben
  Throttle. **Grund:** YouTube schonen ohne den User stundenlang warten zu lassen, wo es nicht nötig ist.
- **Playlist des Veranstalters:** über `list_source_paged` (dasselbe Seiten-Tor wie «Alles einlesen»,
  Tempo `backfill_requests_per_hour`, Obergrenze `backfill_max_entries`) – ein Lauf, nicht fortsetzbar
  (Festival-Playlists haben 1–3 Seiten). Einträge = bestätigte Zeilen; Trailer/Aftermovies/zu kurze
  bleiben als Zeile, aber nicht angehakt. Gespeichert wie Suchtreffer (Status `new`), nie Eingang/Queue.
- **Queue und Tags («manual = authoritative»):** vor dem Einreihen bekommt das Video Ausgabe, Bühne und
  Set-Art der Zeile als manuelle Festival-Werte (`series.set_manual`), damit Download, Tags, Album und
  Pfad sie ohne neuen Code übernehmen und keine Erkennung sie später ändert. Von Hand bearbeitete Zeilen
  gelten exakt (auch ein geleertes Feld), sonst füllt die eigene Erkennung des Videos leere Felder.
  Schon geladene Treffer werden neu getaggt (`library.retag`, Wartungs-Thread). Eine schon vorhandene
  manuelle Zuordnung des Videos wird dabei überschrieben – der User hat die Zeile ausdrücklich
  eingereiht. **Grund:** die Checkliste ist die bewusstere Angabe als eine frühere Einzelzuordnung.
- **Timetable-Dateien:** Format 1 unter `app/data/timetables/<series-key>/<year>[-<variant>].json`.
  v0.5.0 liefert **keine** Datei aus: ohne geprüfte Quelle wäre jede Zeile geraten. Beiträge nur mit
  `source` (offizieller Timetable), ein Test prüft jede mitgelieferte Datei.
- **Parser:** heuristisch, aber deterministisch (keine Netzwerk-/Website-Daten); Zeitangaben brauchen
  Minuten (`18:00`, `18.00`, `18h00`, `1800-1900`) oder am/pm, damit Zahlen in Artistnamen nie als Zeit
  gelesen werden. Tage/Bühnen werden als Text übernommen, wie der User sie eingibt (keine Übersetzung,
  keine Normalisierung von «Samstag» zu «Saturday»).

### 2026-11-18 – Festival-Sammler: Auto-Bestätigung konservativ, Parser linear (Review/QA v0.5.0)

- **Entscheid:** «sicher» (ohne Bestätigung, wird eingereiht) verlangt zusätzlich, dass der Titel
  **nichts Widersprechendes** nennt: weitere Artists neben dem DJ der Zeile (b2b, vs, &, x, feat.,
  with …, `artist:more`), eine andere Bühne (`stage:other`) oder Set-Art (`set_type:other`) als die
  Zeile, neben dem Ausgabejahr ein weiteres Jahr (`year:more`), eine andere Serie (`series:other`)
  oder die falsche/fehlende Variante. Ein schwacher Serien-Alias («Supremacy», «Rebirth») zählt nur
  mit dem Jahr direkt dahinter als Serie, sonst `series:weak` (+0.10). Solche Treffer bleiben
  Kandidaten zur Bestätigung (`collector.BLOCKS_CERTAIN`). Eine Bestätigung eines Videos, das schon
  eine andere Zeile hält, wird abgelehnt. **Grund:** eine falsche Auto-Bestätigung wird direkt ein
  falscher Download mit falschen Tags; eine Bestätigung zu viel kostet nur einen Klick.
- **Entscheid:** der Timetable-Parser fasst Leerzeichen-Folgen pro Zeile zusammen und kürzt Zeilen
  (500 Zeichen) und Text (512 KB) **vor** jeder Regex; Gruppen-/Bühnen-Regexes ohne führendes `\s*`.
  **Grund:** quadratisches Backtracking bei langen Leerräumen (PDF-Paste) blockierte Bridge-Threads.
- **Entscheid:** `festivals.collector_results_per_search` höchstens 20. **Grund:** mehr Treffer holt
  yt-dlp über Folgeseiten ohne Throttle-Abstand – eine Suche bleibt so genau eine Anfrage.

### 2026-11-18 – Timetable-Parser: Müll melden statt raten, Vorschau bearbeitbar (QA-Nachprüfung v0.5.0)
- **Entscheid:** eine Zeile ohne Buchstaben/Ziffer wird nie Bühne oder Set: reine Trennzeilen
  (`=====`, `|---|`, nur Emoji) werden still übergangen, alles andere (`????? ##`) landet in
  `skipped`. Jede Zeile, die weder Set noch Überschrift, Titel, Kommentar oder Trennzeile ist, steht in
  `skipped` und wird im Einfüge-Dialog angezeigt. **Grund:** eine erfundene Bühne ist stiller
  Datenfehler, eine gemeldete Zeile kostet den User einen Blick.
- **Entscheid:** CSV ohne Kopfzeile wird erkannt, wenn die meisten Zeilen dieselbe Zellenzahl (≥ 3)
  mit einer reinen Zeitspalte haben; Spalten werden nach Inhalt zugeordnet (Zeit, Wochentag,
  Set-Art, Bühne = bekannt/Grossbuchstaben/Bühnenwort/wenige Werte, Rest = Artist). Emoji/Symbole
  und `**fett**` werden vor dem Parsen entfernt; beidseitige Deko macht eine Zeile zur Überschrift,
  nur führende ist ein Aufzählungszeichen. **Grund:** reale Pastes aus Apps/Social Media.
- **Entscheid:** die Vorschau im Einfüge-Dialog ist bearbeitbar (Artist, Bühne, Tag, Zeit, Zeile
  entfernen); nach einer Bearbeitung importiert `import_timetable` die Zeilen statt des Texts, eine
  Textänderung liest neu ein und verwirft die Bearbeitungen. **Grund:** der Parser rät nie perfekt;
  Korrigieren vor dem Speichern ist billiger als danach in der Checkliste.

### 2026-11-18 – Timetable-Parser: Zeilen bewerten statt Einzelfälle flicken (QA-Nachprüfung 2 v0.5.0)
- **Entscheid:** jede eingefügte Zeile wird der Reihe nach bewertet: Überschrift (Tag, Datum,
  Tag + Bühne – vor der Zeitsuche, damit `12.07.` ein Datum und nicht 12:07 ist), beschriftete
  Liste (`FRIDAY: A, B`, `MAINSTAGE: A`, `Line-up: A, B`), Freitext (URL, `r/…`, Hashtags,
  `Edit:`, Ankündigungswörter wie tickets/doors/Einlass/uitverkocht, Satzzeichen am Ende,
  Funktionswörter-Dichte, sehr lange Zeilen), Titel, Tabellenzellen, Bühnen-Überschrift
  (Bühnenwort, Farbe, Katalog, kurze Grossbuchstaben-Zeile vor einem Block oder zwischen
  gemischt geschriebenen Namen), Zeit-only-Zeile (App-Karte: Zeit zur Zeile darüber oder
  darunter), sonst Artist. Freitext und Titelzeilen landen in `skipped` (vorher wurden Titel
  still übergangen). **Grund:** jede QA-Runde bringt neue echte Pastes; Regeln nach Zeilenart
  verallgemeinern, Einzelfälle nicht. Korpus mit > 70 Pastes in `tests/test_timetable_corpus.py`.
- **Entscheid:** eine Kopfzeile wird in den ersten 5 Zeilen gesucht (Titel darüber → `skipped`),
  Tages-Überschriften zwischen Tabellenzeilen setzen den Tag; in Tab-/Pipe-Zeilen ohne Katalog
  gewinnt die Zelle mit Farbe/Bühnenwort als Bühne. Listen haben höchstens 60 Namen pro Zeile
  (Laufzeit-Schutz). **Grund:** QA-Befunde Tab-Tabelle und Tag in Tabellen, ohne Raten.

## 2026-11-18 – WebView2 Runtime: Installer installiert sie, App prüft beim Start
- **Entscheid:** Der Installer liefert Microsofts **Evergreen Bootstrapper**
  (`MicrosoftEdgeWebview2Setup.exe`, ca. 2 MB) mit (`Flags: dontcopy`) und startet ihn nach dem
  Kopieren der Dateien mit `/silent /install`, aber nur, wenn die Runtime fehlt. **Grund:** von
  Microsoft für Online-Clients empfohlener Weg («Distribute your app and the WebView2 Runtime»,
  Bootstrapper mitliefern ist ausdrücklich vorgesehen); der Standalone-Installer (> 100 MB) würde den
  Installer vervielfachen, ein Download des Bootstrappers zur Installationszeit bräuchte eigenen
  HTTP-Code im Installer.
- **Entscheid:** Erkennung wie dokumentiert: Wert `pv` unter
  `…\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}` in HKLM (WOW6432Node), HKCU und
  HKLM ohne WOW6432Node; vorhanden = nicht leer und nicht `0.0.0.0`. Die App
  (`app/core/webview2.py`) zählt zusätzlich Beta/Dev/Canary, wie pywebview. **Grund:** Installer und
  App sollen dieselbe Wahrheit sehen; pywebview würde mit einem Preview-Kanal starten.
- **Entscheid:** Ohne Adminrechte (`PrivilegesRequired=lowest`) installiert der Bootstrapper pro
  Benutzer; scheitert er (offline, Proxy, Exitcode ≠ 0), bricht Setup **nicht** ab:
  Hinweis mit Download-Seite (nur interaktiv, siehe Nachtrag unten), Log-Zeile
  `WebView2 install failed: …`. **Grund:** HCLoader
  selbst ist installiert, die Runtime lässt sich nachholen; ein Abbruch würde nichts retten.
- **Entscheid:** CI lädt den Bootstrapper bei jedem Build über den offiziellen fwlink und bricht ab,
  wenn die Authenticode-Signatur nicht `Valid` ist oder nicht auf `O=Microsoft Corporation` lautet.
  Nicht im Git (`/installer/redist/`), nicht neu signiert. **Grund:** immer die aktuelle Version,
  keine Binärdatei im Repo, keine manipulierte Datei im Installer.
- **Entscheid:** Die App prüft beim GUI-Start vor dem Fenster die Registry; fehlt die Runtime, kommt
  eine lokalisierte Meldung mit Link und «Download-Seite jetzt öffnen?» (Ja = Browser), dann Ende.
  `HCLOADER_SKIP_WEBVIEW2_CHECK=1` schaltet die Prüfung ab, Fehler der Prüfung selbst blockieren nie.
  **Grund:** die Portable-ZIP kann nichts installieren, und pywebview fällt sonst still auf MSHTML
  zurück, wo die UI nicht läuft (leeres/kaputtes Fenster ohne Hinweis).
- **Entscheid:** Installer-Texte für diesen Schritt stehen in `installer/webview2-messages.isi`
  (UTF-8 mit BOM, per `#include`), in allen zehn Installer-Sprachen. **Grund:** `HCLoader.iss` bleibt
  ASCII (ISCC liest es als ANSI), Russisch braucht Unicode; ISPP liest Include-Dateien als UTF-8.

## 2026-11-18 – WebView2-Bootstrapper mit Frist, Silent ohne Meldung (Review v0.5.1)
- **Entscheid:** Der Bootstrapper läuft über `RunBounded` (PowerShell: `Start-Process -PassThru`,
  `WaitForExit(600 s)`, danach `taskkill /T /F`, selbst auf 30 s begrenzt, Exitcode 1460 =
  `ERROR_TIMEOUT`). Bei Zeitüberschreitung: Log `WebView2 install timed out …`, Hinweis wie bei
  einem Fehler, Setup läuft weiter. Die Statuszeile nennt die Frist («höchstens 10 Minuten»).
  **Grund:** `Exec` wartet ohne Obergrenze; hinter einem hängenden Proxy oder blockiertem
  EdgeUpdate stand Setup sonst still. PowerShell-Begrenzung wie beim Deinstallations-Cleanup statt
  `CreateProcessW`/`WaitForSingleObject` per DLL-Import (Strukturen in Pascal Script fehleranfällig);
  `ewNoWait` liefert keine PID, der Prozess liesse sich nicht beenden.
- **Entscheid:** Fehler-/Timeout-Hinweis nur bei `not WizardSilent`; silent nur Log-Zeile.
  **Grund:** `SuppressibleMsgBox` wird nur von `/SUPPRESSMSGBOXES` unterdrückt, nicht von
  `/SILENT`/`/VERYSILENT` – ein unbeaufsichtigter Install hätte offline auf einen Klick gewartet.
- **Entscheid:** `installer-defaults.json` wird vor dem Bootstrapper geschrieben. **Grund:** ein
  abgebrochener Bootstrapper-Schritt darf die Datenschutz-Wahl nicht verlieren.
- **Entscheid:** Installer und App erkennen gleich wie pywebview: Stable + Beta/Dev/Canary, HKLM
  (WOW6432Node) und HKCU, leer/`0.0.0.0` = fehlt, Hauptversion ≥ 86 (pywebview vergleicht nur die
  Hauptversion gegen 86.0.622.0). HKLM ohne WOW6432Node bleibt ein zusätzlicher Treffer.
  **Grund:** kein «vorhanden» in der App bei MSHTML-Fallback in pywebview, kein unnötiger
  Stable-Download, wenn nur ein Preview-Kanal da ist. Der 64-bit-Schlüssel wird von Microsoft
  per machine nicht beschrieben; ihn zu ignorieren brächte nur ein Risiko für falsches «fehlt».
  Die .NET-≥-4.6.2-Prüfung von pywebview wird nicht nachgebaut (ab Windows 10 1607 immer erfüllt).
- **Entscheid:** CI prüft zusätzlich, dass die Signaturkette bei einer Microsoft-Root endet
  (Root Certificate Authority 2010/2011 oder Identity Verification Root CA 2020; Zwischen-CAs aus
  der Signatur). Kein Pin auf die Zwischen-CA. **Grund:** die ausstellende CA wechselt über die
  Jahre (Code Signing PCA 2011/2024, ID Verified CS), die Roots nicht – robust und trotzdem härter
  als nur der Subject-Regex.
- **Entscheid:** CI-Smoke mit `/WEBVIEW2DRYRUN=timeout` (hängender `ping`-Stellvertreter, Frist 5 s)
  ohne `/SUPPRESSMSGBOXES`. **Grund:** prüft Frist, Kill und «silent ohne Meldung» real unter Windows.

## 2026-11-18 – Tracklist search (v0.6.0)

- **Nur offline:** Tracklisten kommen aus Sidecar (Kapitel, Beschreibung), ID3-CHAP und `.cue` – nie
  aus einer Anfrage. Kein Nachladen von Beschreibungen für alte Downloads (wäre eine Anfrage pro Set).
  **Grund:** «YouTube schonen» und «billig vor teuer»; was beim Download nicht gespeichert wurde, fehlt eben.
- **Sidecar behält die ganze Beschreibung** (`DESCRIPTION_MAX` 2000 → 5000 Zeichen = YouTube-Maximum).
  Tracklisten stehen oft am Ende langer Beschreibungen. Gilt für neue Downloads; alte Sidecars bleiben.
- **Eigene Tabellen statt JSON-Spalte:** `tracklists` (was untersucht wurde, Quelle, Anzahl; `none` =
  «nichts gefunden», damit «nur fehlende» sie überspringt) und `tracks` (ein Track pro Zeile, `key` für
  «Meistgespielt», `search` = gefalteter Text). Migration 10, Backup vor der Migration wie gehabt.
- **FTS5 mit LIKE-Fallback:** `tracks_fts` (unicode61, Diakritika entfernt) über `tracks.search`, per
  Trigger synchron (auch bei `ON DELETE CASCADE`). Suche = alle Wörter als Präfix (`"wort"*`), Wörter
  vorher auf Buchstaben/Ziffern gefaltet – keine FTS-Syntax vom User. Fehlt FTS5 (die Migration prüft es
  mit einer temporären Tabelle), wird der Index nicht angelegt und die Suche nimmt `LIKE` mit Escape.
  **Grund:** schnelle Suche über tausende Sets ohne neue Abhängigkeit; Python-Builds ohne FTS5 laufen trotzdem.
- **Quelle wählen statt mischen:** pro Set gewinnt die reichste Quelle (Tracks + Tracks mit Artist +
  Bonus für Zeitstempel); bei Gleichstand Kapitel vor Beschreibung. Generische Kapitel («Track 01»,
  «<Untitled Chapter 1>») zählen nicht. **Grund:** Mischen erzeugt Dubletten mit verschiedenen Zeiten.
- **Normalisieren für den Vergleich, nicht für die Anzeige:** Anzeige behält die Schreibweise (nur
  Verbinder `feat.`/`x`/`vs.`/`&`, Versions-Klammern, Label, Unicode-Striche/-Anführungszeichen werden
  vereinheitlicht); Suche und «Meistgespielt» vergleichen gefaltet. «Original/Extended Mix» zählt als
  derselbe Track, ein Remix/VIP als anderer; Artists in beliebiger Reihenfolge (`A x B` = `B & A`).
- **Wann wird gelesen:** nach jedem Download (in `YtClient`, nie fatal) und für den Bestand einmal beim
  ersten Öffnen der Ansicht «Tracks» (Wartungs-Thread wie «Festivals zuordnen», Fortschritt, Abbrechen);
  danach «Neu einlesen» von Hand. Kein automatischer Lauf beim App-Start: er würde andere Wartungsjobs
  blockieren, ohne dass der User weiss, warum.
- **Abspielen ab Zeitstempel:** interner Player springt (`HC.player.playAt`), Modus «extern» öffnet die
  Datei im Standardplayer und nennt die Zeit im Toast (ein Sprung lässt sich dort nicht steuern).
- **Nebenbei behoben:** `tagging.parse_timestamps` schnitt eine schliessende Klammer am Kapitelende ab
  («Title (X Remix» in Kapiteln, CUE und CHAP).

## 2026-11-18 – Tracklist search: follow-ups to review/QA v0.6.0

- **FTS5 beim Öffnen prüfen, nicht nur die Tabelle:** `db.ensure_tracks_fts` probt FTS5 bei jedem Start
  (temporäre Tabelle). Index da, Modul fehlt → Sync-Trigger weg (sonst scheitert jedes Schreiben in
  `tracks`, auch `ON DELETE CASCADE`), Suche per LIKE. Modul da, Index/Trigger fehlen → anlegen und aus
  `tracks` neu füllen. **Grund:** dieselbe DB kann mit verschiedenen Python/SQLite-Builds geöffnet werden.
- **Gleiche Treffer in beiden Engines:** LIKE sucht jetzt wie FTS5 nur am Wortanfang
  (`' ' || search LIKE '% wort%'`, Text ist gefaltet mit einfachen Leerzeichen). Die UI markiert ebenfalls
  nur Wortanfänge. Ein Test vergleicht beide Engines auf denselben Daten. **Grund:** ohne FTS5 gab es
  sonst mehr (Teilwort-)Treffer als mit.
- **Gelöschte Sets hinterlassen nichts:** `db.mark_removed` löscht Tracks und Tracklisten-Zeile mit;
  jeder Einlese-Durchlauf räumt Altlasten (Status ≠ `done`) zuerst weg; die «Meistgespielt»-Schreibweise
  zählt nur Sets mit Status `done`.
- **«Meistgespielt» schneller:** Migration 11 ersetzt `idx_tracks_key` durch den abdeckenden Index
  `(key, video_id)`. Gibt es keine Tracks ausserhalb der Bibliothek (Normalfall), zählt die Abfrage nur
  über den Index ohne Join auf `videos` (Messung 150k Tracks: ~4× schneller); sonst die exakte Join-Abfrage.
  Kein Cache und keine Zähltabelle. **Grund:** billig, immer korrekt, keine Invalidierung.
- **Inkrementell einlesen:** Scope `new` (Standard, Alias `missing`) = nie untersucht, seither neu geladen
  (`downloaded_at` > `extracted`) oder Sidecar jünger als `extracted` (nur lokale `stat`, keine
  Zielordner-Zugriffe). Knopf «Neue einlesen», daneben «Alle neu einlesen» (`all`).
- **Panel liest robust:** `get_tracklist` prüft vorher den Zielordner (wie der Durchlauf) und meldet
  eine beschädigte Datei als übersetzte Meldung statt einer Exception.

## 2026-11-18 – Loudness, waveform, player memory (v0.7.0)

- **Messen mit `ebur128`, nicht `loudnorm`:** `-af ebur128=peak=true:framelog=verbose` liefert integrierte
  Lautheit, LRA und True Peak in der Zusammenfassung auf stderr; `loudnorm` misst dasselbe, resampelt aber
  intern auf 192 kHz (langsamer). Der Parser versteht trotzdem auch den JSON-Block von `loudnorm`.
  `framelog=verbose` hält die Zeile pro 100 ms aus stderr (bei `-v info`). Stille (≤ −70 LUFS) = keine Messung.
- **Ein Dekodierlauf für beides:** `ebur128` reicht das Audio unverändert weiter; dahinter
  `aresample=2000,aformat=s16:mono` und PCM nach stdout → Blockmaxima (0,1 s) → 1600 Punkte (0..255,
  bezogen auf Vollaussteuerung). **Grund:** ein 2-h-Set wird nur einmal dekodiert; 2 kHz reichen für eine
  Hüllkurve. stderr wird in einem eigenen Thread geleert (volle Pipe würde ffmpeg blockieren).
- **Nie neu kodieren:** ffmpeg schreibt nur in eine Pipe bzw. `-f null`; die Datei ändert ausschliesslich
  mutagen (Tag-Block). Tests prüfen, dass Audio-Bytes (MP3-Frames, MP4-`mdat`) gleich bleiben.
- **Tags:** ReplayGain 2.0 bezogen auf −18 LUFS (`gain = −18 − I`, `peak = 10^(TP/20)`). MP3 `TXXX` (vorhandene
  Varianten in anderer Schreibweise werden ersetzt, nicht verdoppelt; Neu-Taggen behält sie, weil sie nicht
  zu den eigenen Frames gehören), M4A Freeform-Atome in Kleinschrift (foobar2000/iTunes-Konvention, Lesen
  ohne Gross/Klein), Opus `R128_TRACK_GAIN` (RFC 7845: Opus-Player ignorieren `REPLAYGAIN_*`; kein Peak-Tag).
  Andere Container: nur DB. Lesen auch fremder Tags (Opus R128 → +5 dB auf −18 LUFS).
- **Ziel-Lautheit nur im Player:** Tags bleiben standardkonform; der Player rechnet
  `target − I` und begrenzt mit `1/peak` (ohne bekannten Peak nur absenken). **Grund:** andere Player lesen
  die Tags mit ihrer eigenen Referenz.
- **Web Audio nur mit laufendem AudioContext:** `createMediaElementSource` ist unumkehrbar und ein
  hängender (suspended) Context würde das Element stumm schalten. Der Graph wird erst gebaut, wenn
  `ctx.resume()` innerhalb von 400 ms `running` liefert (Nutzergeste beim Abspielen); sonst bleibt es bei
  `audio.volume` (nur absenken – bei Hardstyle/Hardcore mit −6…−9 LUFS der Normalfall). pywebview startet
  WebView2 mit `--allow-file-access-from-files` (Standard `ALLOW_FILE_URLS`), daher ist die `file:`-Quelle
  für Web Audio nicht «cross-origin». Offener Punkt: echter Test unter Windows/WebView2.
- **Eigener Analyse-Thread (`AnalysisQueue`) statt Wartungs-Worker:** ein Durchlauf über eine grosse
  Bibliothek dauert Stunden und darf weder «Neu taggen» noch andere Wartung blockieren; umgekehrt muss die
  Wellenform des gerade gespielten Sets vorgehen. Reihenfolge: dringende Wellenform → Dateien nach Download →
  Durchlauf; zwischen zwei Dateien des Durchlaufs werden die beiden ersten bedient. Gegen gleichzeitiges
  Neu-Taggen/Verschieben schützt `library.FS_LOCK` beim Tag-Schreiben (Pfad im Lock neu gelesen).
- **Schonend:** eine Datei nach der anderen, ffmpeg mit `-threads 1`, Windows `BELOW_NORMAL_PRIORITY_CLASS`,
  sonst `nice 10`; harte Grenze 45 Min. pro Datei; Abbruch beendet ffmpeg sofort (eigener Watch-Thread, auch
  wenn stdout nichts liefert).
- **Fehler:** unlesbare Datei = `analysed` gesetzt + `error` → kein neuer Versuch bis zu einem neuen Download
  (oder «Alle neu analysieren»). ffmpeg fehlt / Datei nicht erreichbar = kein Vermerk, nächster Durchlauf
  versucht es wieder. Gesperrte Datei beim Tag-Schreiben = nur Tag-Schreiben wird wiederholt (ohne neue Messung).
- **Headless-Läufe analysieren nicht** (sie sollen schnell fertig sein); die GUI reiht beim Start Downloads
  seit dem ersten Start mit v0.7.0 ein, die nie analysiert wurden (`analysis.since` im State). **Grund:**
  keine Überraschung mit einem Durchlauf über die ganze alte Bibliothek ohne Klick.
- **Wellenform-Cache als Datei** (`<app_home>/cache/peaks/<sidecar-name>.json`, ca. 6 KB) statt DB-Spalte:
  wie der Cover-Cache, DB bleibt klein; veraltet, wenn `downloaded_at` nicht mehr passt (neuer Download).
- **Player-Gedächtnis:** Tabelle `playback` (Position, Dauer, Zeitpunkt). Erste/letzte 30 s werden nicht
  gemerkt (Zeile entfernt = fertig). Gespeichert wird alle 15 s während der Wiedergabe sowie bei Pause,
  Schliessen, Wechsel des Sets, Ende und wenn das Fenster verborgen wird. «Fragen» lädt das Set pausiert und
  zeigt eine Leiste über dem Player; ▶/Leertaste statt Antwort = von vorn. Sprünge aus der Tracklist,
  «Weiterhören» und das Neuladen nach dem Taggen fragen nie. «Weiterhören» = die letzten 5 unfertigen Sets
  (nur ohne Filter/Suche, nicht in der Festival-Kachelansicht, nicht bei `resume: off`/Standardplayer).
- **Schlaf-Timer ohne Einstellung:** Minuten laufen nach Uhr (auch in der Pause), «Ende des Sets» nach
  Medienzeit; die letzten 10 s werden über den Lautstärke-Gain ausgeblendet, danach Pause und Lautstärke
  wieder voll.

## 2026-11-18 – Review v0.7.0: kein Tag-Schreiben unter dem Player, Web-Audio-Rückfall

- **Entscheid (M1):** Die UI meldet das geladene Set (`set_now_playing`, auch pausiert). `analysis._write_tags`
  schreibt nie in dessen Datei, sondern gibt «aufgeschoben» zurück (`tagged = 0`, kein Fehler);
  `AnalysisQueue.set_playing` reiht das Tag-Schreiben ein, sobald ein anderes Set oder nichts gemeldet wird.
  Jedes ReplayGain-Schreiben läuft über eine Kopie + `os.replace` (5 Versuche bei Freigabeverletzung, dann
  ebenfalls aufgeschoben). **Grund:** mutagen verschiebt bei zu kleinem Padding (MP3) bzw. `moov` vorne (M4A)
  die ganzen Audiodaten in place – der Player liest dann von falschen Offsets, ein Absturz hinterlässt eine
  kaputte Datei. Aufschieben statt suspend/resume: kein hörbarer Aussetzer, und die Tags haben keine Eile.
  Kosten der Kopie: einmal Dateigrösse an Plattenzugriff pro Datei, nur beim ersten Taggen.
- **Entscheid (M2):** `webview.settings['ALLOW_FILE_URLS'] = True` wird in `main.py` ausdrücklich gesetzt
  (pywebview hängt dann unter WebView2 `--allow-file-access-from-files` an). Zusätzlich ein Stille-Wächter im
  Player: AnalyserNode an der Quelle; 1.5 s exakt 0 bei laufender, nicht stummer, fortschreitender Wiedergabe
  → Graph verwerfen, neues Audio-Element an derselben Position, nur noch `audio.volume` (Anheben entfällt),
  Toast. Einmal Signal gesehen = Graph für dieses Element bestätigt, kein weiterer Wächter. **Grund:** ein
  «tainted» MediaElementSource liefert ohne Fehler nur Nullen und lässt sich nicht rückgängig machen; ohne
  Rückfall bliebe der Player bis zum Neustart stumm. Restrisiko: ein Set, das mit > 1.5 s digitaler Stille
  beginnt, löst beim ersten Abspielen der Sitzung den Rückfall aus (nur Anheben geht verloren).
- **Kleinere Punkte:** Timeout und während des Starts verschwundene Datei gelten nicht mehr als dauerhafter
  Fehler; ffmpeg wird auch bei einer Ausnahme in der Leseschleife beendet; verwaiste Wellenform-Dateien
  räumt `analysis.prune_peaks` beim GUI-Start im Hintergrund weg.

## 2026-11-18 – DJ pages and playlist export (v0.8.0)

- **Artists werden abgeleitet, nicht gespeichert.** Wer ein Set gespielt hat, rechnet `core/artists.py` bei
  Bedarf aus vorhandenen Daten (bestätigte Checklisten-Zeile > Titel-Segmente > Kanalname) und hält das
  Ergebnis im Speicher, bis sich Bibliothek, Artist-Tabelle, Checklisten oder Serien ändern (Signatur aus
  Zählern/Zeitstempeln). Die Tabelle `artists` (Migration 13) enthält nur, was der User gesagt hat
  (Anzeigename, Aliasse, eigener Kanal, «kein DJ») plus eine kleine Startliste (`app/data/artists.yaml`,
  einmal übernommen). **Grund:** keine zweite Wahrheit neben Titel/Checkliste, die bei jedem Download,
  Neu-Taggen oder Festival-Zuordnen nachgeführt werden müsste; Heuristik-Verbesserungen wirken sofort auf
  die ganze Bibliothek. Kosten: ein Durchlauf über die Titel (Regex) nach jeder Änderung – bei 10 000 Sets
  deutlich unter einer Sekunde, im eigenen Thread.
- **Keine Track-Artists, nur Set-Artists.** Tracklisten liefern nur «Meistgespielt in seinen Sets» (Top 10,
  eine Abfrage), keine DJ-Einträge für produzierende Artists. **Grund:** wer einen Track produziert hat, hat
  das Set nicht gespielt; die DJ-Liste würde sonst von Track-Artists überschwemmt.
- **Identität = gefalteter Name ohne Leerzeichen** («Sub-Zero Project» = «SubZero Project»). Aliasse sind
  eine Liste am Ziel-Artist; Zusammenführen hängt Namen/Schreibweisen der Quelle an, Abtrennen entfernt einen
  Alias wieder. Ein Alias, der nur abgeleitet existiert, ist erlaubt (= zusammenführen); einer, der einem
  anderen gespeicherten Artist gehört, wird abgelehnt (sonst zwei Besitzer).
- **b2b:** Starke Trenner (`b2b`, `b3b`, `vs`, `x`) trennen immer; `&`, `+`, `,` nur, wenn das Ganze kein
  bekannter Act ist (Name/Alias eines gespeicherten Artists, z.B. «D-Block & S-te-Fan») und alle Teile wie
  Namen aussehen. Jeder Beteiligte bekommt das Set (`role: b2b`). MC-Credits (`feat.`, `ft.`, `w/`) zählen
  nicht. Ein «Act» anzulegen ist bewusst dasselbe wie einen DJ mit diesem Namen anzulegen.
- **Kein Mix-Kanal als DJ:** Segmente/Kanäle mit Gattungswörtern («Mix», «Podcast», Genre-Namen …) und
  Veranstalter-Kanäle der Serien zählen nicht; was trotzdem durchrutscht, blendet der User aus («kein DJ»).
- **«Zur Watchlist» ohne neue Netzwerkzugriffe:** der Vorschlag (eigener Kanal, sonst Suche «<DJ> live set»)
  kommt aus gespeicherten Daten; nach der Bestätigung läuft er durch den normalen `save_source`-Weg
  (Validierung, Duplikat-Prüfung). Nichts wird automatisch geladen. Die Suchanfrage bleibt englisch (sie geht
  an YouTube, nicht an den User).
- **Playlists:** M3U8 (UTF-8 ohne BOM, `\n`), relativ zum Ort der Playlist als Standard. Unter Windows ist ein
  relativer Pfad über Laufwerke/UNC-Freigaben hinweg unmöglich (`relpath` wirft) → dieser Eintrag absolut, der
  Dialog meldet die Anzahl. Jeder Export wird gemerkt (eindeutig nach Pfad); «Aktuell halten» pro Playlist +
  globaler Schalter `playlists.sync_after_download` (aus). Sync nach Downloads gebündelt im
  Playlist-Thread (läuft einer, folgt genau ein weiterer), auch im Headless-Lauf. Überschreiben fragt der
  Dialog in sich selbst (kein zweites Modal). «Auf Ordner/USB kopieren» ist ausdrücklich nicht Teil von v0.8.0.
- **«Alle abspielen»** ist eine Warteschlange nur im eingebauten Player (UI-Zustand, nicht persistiert): am
  Ende eines Sets folgt das nächste; ein von Hand gewähltes anderes Set beendet sie. Mit dem Standardplayer
  gibt es stattdessen den Hinweis bzw. die exportierte Playlist.

## 2026-11-18 – Review v0.8.0: bekannte Namen zuerst, eine Cache-Version für den DJ-Index

- **Bekannte Namen vor dem Zerlegen (M1):** `split_credit` ersetzt zuerst jede bekannte Schreibweise (Startliste
  + eigene Artists/Aliasse, längster Treffer zuerst) durch einen Platzhalter; erst danach werden «feat./presents/
  pres./w/» abgeschnitten und an «&/+/,/and» bzw. b2b/vs/x getrennt. Grund: eine eigene Angabe muss immer gewinnen
  («Mark With a K»), und ein bekanntes Duo («D-Block & S-te-Fan») bleibt ein Act. «with» trennt nur noch vor «MC …»
  (Feature, abgeschnitten) oder zwischen zwei bekannten Namen (b2b); ein MC neben einem DJ fällt weg, ein MC allein
  («MC Nolz») bleibt.
- **Eine Cache-Version per DB-Trigger (M2, Migration 14):** statt `invalidate()` in jedem Schreibpfad zählen
  Trigger zwei Zähler in `state` hoch: `artists_rev_rows` (Bibliothekszeile mit Status done in einer vom Index
  gelesenen Spalte geändert, Set gelöscht, bestätigte Sammler-Zeile geändert) und `artists_rev_names` (Tabellen
  `artists`/`series`). Grund: Festival-Zuordnung, Sammler, Retag, Löschen, Merge/Split und ein Headless-Lauf in
  einem anderen Prozess werden ohne Mitdenken erfasst; Download-Fortschritt (queued/downloading) zählt nicht.
- **Inkrementeller Neuaufbau (m1):** ändern sich nur Zeilen, werden nur Sets mit geänderten Eingaben (Sammler-Credit,
  Titel, Kanal, Ausgabe ja/nein) neu geparst; bei Änderung der Artists/Serien voller Neuaufbau. Dazu `norm()`
  gecacht und ein Regex über alle Serien-Aliasse pro Katalog: 10 000 Sets ca. 1,3 s statt 3,8 s voll, ca. 0,07 s
  nach einem Download.
- **Gelöschte Playlists (m3):** der automatische Sync legt eine fehlende Datei nicht neu an, sondern schaltet
  «Aktuell halten» aus (Liste zeigt «nicht mehr vorhanden»); «Jetzt schreiben» für diese Playlist schreibt sie
  ausdrücklich wieder.


## 2026-11-18 – Statistics, notifications, media server (v0.9.0)

- **Statistik nur aus der DB.** Gruppierte Abfragen über `videos` (Status `done` = Bibliothek) plus der
  gecachte DJ-Index (`artists.index`, Top-DJs mit Zeitraum in Python über `idx.rows`). Zeitraum = lokale Tage,
  in UTC-Grenzen umgerechnet und gegen `downloaded_at` (ISO UTC, Stringvergleich) geprüft; Monate = UTC-Monat
  (Randabweichung um Mitternacht in Kauf genommen). Neuer Index `idx_videos_downloaded(status, downloaded_at)`.
  Grund: 10k Sets < 1 s ohne Zusatztabellen; keine Netzwerkanfrage.
- **Dateigrösse in der DB** (`videos.file_size`, Migration 15), geschrieben zusammen mit `file_path`
  (`set_status`/`set_file_path`), gelöscht mit `mark_removed`. Alte Bibliotheken: einmaliges Messen im
  Hintergrund (Thread `hcloader-stats`, Stapel à 200, fehlende Datei = 0, damit nie erneut gemessen). Grund:
  `stat` von 10k Dateien bei jedem Öffnen wäre auf NAS-Laufwerken langsam; die Statistik muss DB-only bleiben.
- **Diagramme ohne Bibliothek**: Balken als HTML/CSS (scharf in jeder Grösse, Text nativ, fokussierbar), nur der
  Quellen-Ring als SVG (`stroke-dasharray`). Je Grafik `aria-label` bzw. eine `sr-only`-Tabelle; Animation nur
  ohne `body.reduced` und mit `prefers-reduced-motion: no-preference`.
- **Toasts über Windows PowerShell 5.1** statt einer Pflicht-Abhängigkeit. Geprüft: `windows-toasts`/pywinrt
  (`winrt-Windows.UI.Notifications`, MIT, Wheels für cp312 win_amd64) funktionieren, bringen aber vier Pakete
  in das eingebettete Python und müssen bei jedem Python-Update mitziehen; `win10toast`/BurntToast sind veraltet
  bzw. ein PowerShell-Modul. PowerShell 5.1 ist auf jedem Windows 10/11 vorhanden, lädt die WinRT-Typen selbst
  (`[… , ContentType = WindowsRuntime]`) und läuft versteckt (`CREATE_NO_WINDOW`, `-EncodedCommand`, XML über
  eine Umgebungsvariable – nichts zu quoten). Ist pywinrt installiert, wird es bevorzugt (kein Prozessstart).
  Fehlt beides oder blockiert eine Richtlinie PowerShell: nur Log. Grund: robust im Embedded-Python, keine neue
  Laufzeitabhängigkeit, Benachrichtigungen sind selten (Sekundenbruchteile Startzeit egal).
- **AppUserModelID per Registry statt COM-Aktivator.** `HKCU\Software\Classes\AppUserModelId\HCLoader.App`
  (Name, Icon) reicht für Toasts unverpackter Apps; der Klick nutzt `activationType="protocol"` mit
  `hcloader://<view>` (`HKCU\Software\Classes\hcloader`, Befehl `pythonw -X utf8 -c "…sys.path.insert(0,
  r'<App-Ordner>')…" --open "%1"`, funktioniert für venv, Installer und Portable). Läuft die App, leitet der
  zweite Start `show <token> <view>` an die Aktivierung weiter → Event `navigate`. Grund: kein COM-Server im
  Python-Prozess, kein Hintergrundprozess, der auf Klicks wartet; gleicher Weg für GUI und geplante Aufgabe.
  Registriert wird nur bei eingeschalteten Benachrichtigungen (vor dem ersten Toast), der Uninstaller räumt auf.
- **Keine Benachrichtigungs-Flut**: ein Stapel in `state.notify_pending` (GUI und Headless teilen ihn),
  Downloads einmal pro Queue-Lauf (`DownloadQueue.on_session_end`), 15 s Sammelzeit in der GUI, mindestens 120 s
  zwischen zwei Toasts, Ruhezeit hält den Stapel zurück (Zusammenfassung danach). Fehler beim Anzeigen werden
  verworfen, nie in einer Schleife wiederholt.
- **Plex/Jellyfin ausserhalb des Throttle, aber begrenzt**: das ist der eigene Server des Users, keine Plattform
  (CLAUDE.md-Prinzip 1 gilt für YouTube/SoundCloud). Grenzen: ein Stapel pro Wartezeit
  (`media_server.delay_seconds`, Standard 120 s, Timer bei jedem Download neu), höchstens 5 Anfragen pro Stapel
  (Plex: ein `refresh?path=` je Ordner, sonst ganze Bibliothek; Jellyfin: ein `POST /Library/Media/Updated`),
  10 s Timeout, keine Wiederholung, Antwort ≤ 2 MB. Ohne Proxy (das Token soll nicht über einen Internet-Proxy
  laufen) und ohne Weiterleitungen (die Header gingen sonst an das Ziel der Weiterleitung). Nur die vom User
  eingetragene Adresse; keine Erkennung/Suche im Netz.
- **Pfad-Abbildung** `media_server.server_root`: Zielordner aus Sicht des Servers (NAS/Docker). Nicht
  abbildbare Pfade → Scan der ganzen Bibliothek statt eines falschen Pfads.
- **Token in der Windows-Anmeldeinformationsverwaltung** (`CredWriteW`/`CredReadW`/`CredDeleteW` über ctypes,
  `CRED_TYPE_GENERIC`, `CRED_PERSIST_LOCAL_MACHINE`, Ziel `HCLoader/media_server/<type>`) statt DPAPI-Datei:
  der User sieht und löscht es in der Systemsteuerung, es landet nicht in Backups des Datenordners. Gespeichert
  erst nach erfolgreichem «Verbindung testen». Ausserhalb von Windows nur im Speicher (Tests).

## 2026-11-18 – `hcloader:`-Link nur zur Navigation (Review v0.9.0 M1)

- **Entscheid:** Der Protokoll-Eintrag ruft einen eigenen Einstieg auf:
  `"<pythonw>" -X utf8 -I -c "…sys.path.insert(0, r'<App-Ordner>')…" --protocol "%1"`. `main()` prüft
  `--protocol` **vor** jedem anderen Argument: erlaubt ist nur genau `["--protocol", <url>]`, die URL muss
  `hcloader://open/<view>` (oder die v0.9.0-Form `hcloader://<view>`) mit `<view>` aus `inbox|downloads|library|stats`
  sein (nur `A-Za-z:/`, max. 64 Zeichen, kein Prozent-Dekodieren). Sonst Ende mit `EXIT_USAGE`, ohne etwas zu tun.
  Ein gültiger Link leitet die Ansicht an die laufende Instanz weiter oder startet die GUI dort – nie Smoke,
  Watchlist, Headless oder Download, auch keine Update-Wiederherstellung. `--open` zusammen mit `--smoke`,
  `--headless` oder `--run-watchlist` wird abgelehnt; der Parser erlaubt keine Abkürzungen mehr (`allow_abbrev=False`).
  `-I` statt `-c` allein: das Arbeitsverzeichnis des Aufrufers kommt nicht auf `sys.path` (m7).
  Beim GUI-Start schreibt `notify.refresh_registration` einen vorhandenen HKCU-Eintrag (z.B. `--open "%1"` aus
  einem v0.9.0-Entwicklungsstand) auf den neuen Befehl um; neu registriert wird weiterhin erst vor dem ersten
  Toast. Der Uninstaller löscht `HKCU\Software\Classes\hcloader` (`uninsdeletekey`).
- **Grund:** `%1` ist eine fremde Zeichenkette. Ein Aufrufer, der Anführungszeichen nicht kodiert, könnte sonst
  über `hcloader://x" --smoke "<url>` einen Download oder einen Watchlist-Lauf auslösen (Muster wie
  CVE-2018-1000006). Der Schutz darf nicht vom Browser abhängen.

## 2026-11-19 – Re-upload detection (v0.10.0)

- **Entscheid:** Eigener, leichter Fingerabdruck in reinem Python (`app/core/fingerprint.py`) statt Chromaprint/
  `fpcalc`. ffmpeg dekodiert nur Ausschnitte (Kopf `reupload.head_minutes` + `reupload.windows` × 30 s, mono,
  5512 Hz); pro Frame (FFT 512, Schritt 256 = 46 ms) die stärksten Spitzen in 6 Frequenzbändern (max. 7 pro
  Sekunde), gepaart zu 24-Bit-Hashes (f1, f2, Δt) mit Zeitpunkt. Vergleich über ein Histogramm des Zeitversatzes;
  Treffer = Anteil im besten Versatz ≥ `reupload.min_score` (Standard 15 %), ≥ 20 Treffer **und** Treffer in ≥ 2
  Abschnitten (sonst würden zwei verschiedene Sets mit demselben Intro-Track als gleich gelten). Schneller Index:
  jedes vierte Hash (`hash % 4 == 0`) in `fingerprint_index` (SQLite, indiziert), nur die 8 besten Kandidaten
  werden vollständig verglichen. Markiert wird immer der später geladene Eintrag; nichts wird automatisch gelöscht.
  Eigener Thread `FingerprintQueue`, der wartet, solange die Lautheitsanalyse dekodiert (höchstens ein ffmpeg).
  Kalibrierung mit synthetischem Audio (Tests): Re-Upload mit 2,4 s Versatz, Rauschen, Pegel und Tiefpass ≈ 26 %,
  gleiche Datei neu kodiert ≈ 32 %, fremdes Audio < 1 %, gleiches Intro / anderer Rest: Kopf 87 %, aber nur 1 Abschnitt.
- **Grund:** Chromaprint wäre lizenzrechtlich möglich (LGPL-2.1+ ist mit GPL-3.0-or-later vereinbar; `fpcalc`
  ist ein eigenständiges Programm, das wie ffmpeg mitgeliefert werden könnte), aber es wäre ein weiteres Binary,
  das `fetch_binaries.ps1`/Portable-Build holen, prüfen (Prüfsumme) und aktualisieren müssten, ohne das die
  Funktion still ausfällt, und das in der CI (Windows ohne ffmpeg/fpcalc) nicht testbar ist. Der eigene Abdruck
  braucht nur das vorhandene ffmpeg, ist mit Arrays testbar und für den Zweck (gleiche Aufnahme, anders kodiert
  oder mit anderem Intro) genau genug. Grenzen: ein stark gekürzter Re-Upload (> 1–2 Min. anderes Intro bei
  vielen Fenstern) wird evtl. nicht erkannt; Tempo-/Tonhöhen-Änderungen (Nightcore, Pitch) werden nie erkannt.
- **Vor-Prüfung** (`reupload.precheck`, Standard aus): die Phase-7a-Duplikatprüfung (Dauer ±5 s, Titel) gilt dann
  auch auf derselben Plattform, ohne Request; der Fingerabdruck bestätigt erst nach dem Download.

## 2026-11-19 – Re-upload detection: anchored windows, alignment check, safe delete (Review v0.10.0 M1/M2)

- **Entscheid (M2):** Fingerabdruck-Format `VERSION = 2` (alte Abdrücke werden beim nächsten Durchlauf neu
  berechnet). Fenster an **absoluten** Zeiten statt proportional zur Dauer: Hälfte ab Anfang (5, 10, 15, 25 …
  Min.), Hälfte vor dem Ende (2, 6, 12, 20 … Min.). Dazu ein **Ausrichtungs-Check**: hat ein Kandidat im
  gespeicherten Abdruck genug ausgerichtete Treffer (≥ 40 und ≥ ⅓ der Schwelle), wird die neue Datei dort noch
  einmal dekodiert, wo die Abschnitte des Kandidaten beim gefundenen Versatz liegen (je max. 60 s, höchstens
  2 Kandidaten). Treffer erst, wenn dieser Abdruck beim selben Versatz die Schwelle erreicht und in ≥ 60 %
  (und ≥ 2) der abgebildeten Abschnitte trifft. Robustheit (QA): 3 stärkste Spitzen pro 0,25-s-Block (12/s statt
  7/s pro Sekunde) und Frequenzen im Hash in 2-Bin-Schritten (21,5 Hz).
- **Grund:** Proportionale Fenster verschoben sich bei Kopien anderer Länge gegeneinander; > ~2 Min. Unterschied
  wurde nie erkannt (Review-Tabelle). Absolute Anker decken anderes Ende bzw. anderes Intro ab, der
  Ausrichtungs-Check jede Längendifferenz, solange Kopf oder Anker einmal überlappen, und senkt gleichzeitig
  Fehltreffer (gemeinsamer Track / gleiches Intro: die übrigen Abschnitte beim selben Versatz passen nicht).
  Kosten: eine zweite Dekodierung (≤ 5 × 60 s) nur für Kandidaten, die schon teilweise passen. Synthetisch
  (Tests): +150 s / +10 Min. am Ende, +150 s / +8 Min. Intro, gekürzt, Pegel, tiefe Bitrate, SNR ≈ −8 dB werden
  erkannt; zufällige Paare bleiben unter ⅓ der Schwelle (keine Zweit-Dekodierung). Grenze: Kopien, die an
  **beiden** Enden anders sind und deren Intro-Unterschied grösser ist als der Kopf minus ~30 s.
- **Entscheid (M1):** «Neuere Datei löschen» nur, wenn das Original in der Bibliothek ist und seine Datei
  existiert und lesbar ist (`library.original_state` = `ok`, geprüft unter `FS_LOCK`). Sonst Fehler und in der UI
  deaktiviert; angeboten wird `adopt` («Original fehlt – diese Kopie behalten»: das fehlende Original verlässt
  die Bibliothek, die Markierung fällt weg). Verschwindet das Original trotzdem während des Löschens, wird die
  Archivzeile der gelöschten Kopie entfernt, damit sie wieder geladen werden kann.
- **Entscheid (m4):** Ein HTTP 403 einer API-Anfrage von Mixcloud (`[mixcloud…]`, Cloudflare vor GraphQL/API)
  oder hearthis.at (`[HearThisAt]`, `[hearthis:…]`) gilt wie bei SoundCloud als Sperre und startet den Backoff
  der Plattform; ein 403 einer abgelaufenen Medien-URL beim Download (ohne Extraktor-Präfix) nicht.
- **Grund:** Der Dialog verspricht «Das Original bleibt»; ohne Prüfung konnte die letzte Kopie gelöscht und per
  Archiv für immer gesperrt werden.

## 2026-11-19 – Mixcloud and hearthis.at (v0.10.0)

- **Entscheid:** Zwei Plattformen wie SoundCloud: IDs `mc:<nutzer>_<slug>` (= yt-dlp-ID, Archivzeile `mixcloud …`)
  und `ht:<track-id>` (Archivzeile `hearthisat …`), Dateiname `[mc-…]` / `[ht-…]`, Tag `TXXX:MIXCLOUD_ID` /
  `TXXX:HEARTHIS_ID`, eigener Throttle (`settings.mixcloud`, `settings.hearthis`, State-Präfix `mixcloud.` /
  `hearthis.`, eigene Prozess-Locks). Die Download-URL lässt sich nicht aus der ID bauen (Mixcloud-Nutzer
  können `_` enthalten, hearthis braucht die Track-Seite): sie kommt aus `videos.url` und wird vor dem Download
  geprüft (`platforms.track_page_ok`: https, Host der Plattform, Track-Pfad; bei Mixcloud muss die ID dazu passen).
- yt-dlp 2026.10.26 (geprüft): Mixcloud hat `MixcloudIE` (Track), `MixcloudUserIE` (Uploads, Favoriten …) und
  `MixcloudPlaylistIE` über GraphQL, Seiten zu 100, ohne Titel/Dauer in der Liste, **keine Suche**. hearthis.at
  hat nur `HearThisAtIE` (einzelner Track über `api-v2.hearthis.at`), **keine Nutzer-/Set-Liste und keine Suche**.
  Daher (wie bei SoundCloud) Erweiterungen in `ytclient.py`, registriert pro YoutubeDL-Instanz:
  Mixcloud-Listen fragen in derselben GraphQL-Seite zusätzlich `name audioLength publishDate isExclusive picture
  owner` ab (Felder, die `MixcloudIE` selbst abfragt) und begrenzen Seitengrösse/Seiten auf das gewünschte Fenster;
  Mixcloud-Suche über die öffentliche API `api.mixcloud.com/search/?type=cloudcast`; hearthis.at-Suche
  (`/search?t=`) und Listen (`/<nutzer>/?type=tracks`, `/set/<slug>/`) über `api-v2.hearthis.at`, Seiten zu 20,
  lazy. Alles über yt-dlp-Networking (Proxy, `sleep_interval_requests`, Seiten-Tor von «Alles einlesen»), also
  durch den Throttle der Plattform. Kompatibilitätsprüfung wie bei SoundCloud: geänderte yt-dlp-Interna →
  Standard-Extraktoren (Warnung einmal im Log).
- Mixcloud-Select-Uploads (nur für Abonnenten, `isExclusive`) gelten wie Go+-Vorschauen als nie ladbar.
- **Grund:** Billig vor teuer: ohne Titel/Dauer in der flachen Liste müsste jeder Eintrag einzeln aufgelöst
  werden, nur um ihn zu filtern. Die Endpunkte von hearthis.at und die Mixcloud-Such-API sind aus dem Container
  nicht erreichbar (Proxy) und wurden mit aufgezeichneten Antworten getestet; der echte Test unter Windows steht
  in der QA aus.

## 2026-11-19 – archive.org (v0.10.0, nicht umgesetzt)

- **Entscheid:** archive.org wird in v0.10.0 **nicht** als Plattform eingebaut.
- **Grund:** yt-dlp 2026.10.26 kann nur einzelne Items (`ArchiveOrgIE`, `/details/<id>`) – Sammlungen und Suche
  (der eigentliche Nutzen als Watchlist-Quelle) bräuchten einen eigenen Client für die Advanced-Search-API, und
  ein Item ist oft ein ganzes Konzert mit vielen Dateien, was nicht zum Modell «ein Set = eine Datei» passt.
  Die Unterstützung ist damit nicht «solide» im Sinne der Roadmap (7c optional). Wieder aufnehmen, wenn yt-dlp
  Sammlungen flach listen kann oder ein konkreter Bedarf besteht.

