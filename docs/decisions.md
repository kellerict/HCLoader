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
