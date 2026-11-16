# Review Phase 2 – GUI-Grundgerüst

- Reviewer: `reviewer` (unabhängig, hat den Code nicht geschrieben)
- Umfang: `git diff 9beccd9~1..86de529` (Integration: `app/api.py`, `app/worker.py`, `app/instance.py`,
  `app/main.py`, `app/core/{scheduler,maintenance,potoken,status}.py`, Änderungen an `config.py`/`logging_setup.py`,
  `scripts/run_watchlist.pyw`, `ui/js/bridge.js`, Tests, Doku) plus UI-Commit `a7b359c`. UI (`ui/`) nur auf
  XSS, externe Requests und Bridge-Konsistenz geprüft.
- Geprüft gegen: CLAUDE.md, SPEC §2, §3.6, §4–§8, §10, §11, `docs/settings-schema.md`, `docs/decisions.md`,
  `docs/bridge-api.md`, pywebview 6.2.1 (`webview/util.py` `get_functions`, `webview/event.py`).
- Werkzeuge: `ruff check .` sauber, `ruff format --check .` sauber, `pytest`: 373 passed. Kein Netzwerkzugriff.

## Ergebnis: FREIGEGEBEN

0 Blocker, 0 Major, 12 Minor, 6 Nits. Die Minor-Punkte sollten vor bzw. in Phase 3 erledigt oder bewusst in
`PROGRESS.md` übernommen werden.

### Was gut ist

- **YouTube-Schonung:** Phase 2 macht keinen einzigen YouTube-Request. `yt_dlp` wird nur in `ytclient.py`
  importiert. Der PO-Token-Test ruft nur `generate_once.ts --version` bzw. `GET 127.0.0.1:<port>/ping` auf,
  die Update-Prüfung nur PyPI (höchstens 1× pro Kalendertag, nur wenn aktiviert). `open_video` validiert die
  Video-ID und öffnet nur den Standardbrowser.
- **Threading:** `EventBus.emit` stellt nur in eine Queue, und genau ein Dispatcher-Thread ruft
  `evaluate_js` auf. Logging-Handler und Hooks blockieren deshalb nie auf der WebView. Die pywebview-Events
  (`loaded`, `closed`) laufen in eigenen Threads (`webview/event.py`), der GUI-Thread wartet nie auf
  Worker oder Bus. Eine Rückkopplung über die Logger `pywebview*`/`app.worker*` ist ausgeschlossen.
  `Worker.run` führt Aufrufe aus dem Worker-Thread inline aus (kein Self-Deadlock). Ich habe keinen
  Deadlock-Pfad gefunden.
- **Event-Injection:** `event_script` nutzt `json.dumps(..., ensure_ascii=True)`. Das ergibt ein gültiges
  JS-Literal ohne Ausbruchsmöglichkeit, auch bei beliebigen Titeln und Logzeilen.
- **XSS:** Alle Fremddaten (Titel, Kanalnamen, Logzeilen, Run-Notizen, Fehlertexte, Pfade, Quellen-Namen
  und -URLs, Blacklist, PO-Token-Detail, pip-Ausgabe) laufen vor `innerHTML` durch `util.esc`. Toasts und
  `ui.confirm` escapen selbst. Genre-Farben in `style` sind serverseitig (`^#[0-9a-fA-F]{6}$`) und
  clientseitig (`HC.genres.color`) geprüft.
- **Single-Instance:** Bind nur `127.0.0.1`, zufälliger Port, 128-bit-Token, `recv(256)` mit Timeout.
  Die Aktivierungsdatei wird beim Beenden nur gelöscht, wenn das eigene Token drinsteht.
- **schtasks:** Aufruf als Argumentliste ohne Shell, `task_time` per Regex (`validate_time` und
  pydantic-Pattern) geprüft. `/TR` ist korrekt gequotet und auf 261 Zeichen begrenzt. `CREATE_NO_WINDOW`
  und `pythonw` + `.pyw` verhindern Konsolenfenster. Über `task_time` ist keine Injection möglich.
- **pip-Update:** Läuft nur mit Lauf-Lock, mit `python.exe` statt `pythonw.exe` und `CREATE_NO_WINDOW`
  (wie alle anderen Subprozesse: deno-Probe, schtasks, PotServer).
- **Konfigurierbarkeit:** Alle 48 Schlüssel aus `Settings().to_dict()` bzw. `docs/settings-schema.md`
  sind in `ui/js/views/settings.js` als Feld vorhanden (maschinell abgeglichen). Die Bridge-Methoden
  stimmen mit dem Kommentarvertrag in `bridge.js` überein (Test `test_exposed_methods_equal_bridge_contract`,
  Exposure-Regel gegen pywebview 6.2.1 `get_functions` verifiziert).
- **`api.py`** ist im Wesentlichen Delegation. Die Geschäftslogik liegt in `core/` bzw. `worker.py`.

---

## Minor

### m1 – Update-Timeout greift nicht, ein hängendes pip hält Lauf-Lock und Worker unbegrenzt
- **Ort:** `app/core/maintenance.py:109-120`
- **Problem:** `for raw in proc.stdout` blockiert bis EOF. `proc.wait(timeout=UPDATE_TIMEOUT_S)` wird erst
  danach erreicht und begrenzt deshalb nichts. Hängt pip (Proxy, Index, Dateisperre), bleiben der
  prozessweite Lauf-Lock (Phase 3/4: Downloads und geplanter Headless-Lauf werden mit „busy“ abgewiesen) und
  der einzige Wartungs-Worker (Backup, PO-Test) dauerhaft belegt. Der JS-Aufruf endet nach 660 s mit einem
  Timeout, der Job läuft aber weiter.
- **Vorschlag:** Eine Deadline über einen `threading.Timer(UPDATE_TIMEOUT_S, proc.kill)` oder einen
  Lese-Thread mit `queue.get(timeout=…)` durchsetzen. Dazu einen Test mit einem Fake-Popen, dessen stdout nie
  EOF liefert.

### m2 – yt-dlp-Update im laufenden Prozess: gemischte Modulstände bzw. gesperrte `.pyd`
- **Ort:** `app/main.py:15` (`from .core.ytclient import …` auf Modulebene → `yt_dlp` ist im GUI-Prozess
  ab Start importiert), `app/api.py:280-307`
- **Problem:** Nach einem Update mit `changed=True` steht nur „wirksam nach Neustart“ im Output, der
  Prozess lädt aber weiter. Ab Phase 3 kann ein Download im selben Prozess lazy importierte Extractor- oder
  Abhängigkeitsmodule in der **neuen** Version zu einem Kern in der **alten** Version nachladen. Unter Windows
  kann pip ausserdem geladene `.pyd` aus `yt-dlp[default]` (brotli, pycryptodomex, websockets) nicht löschen.
  Dann bleibt eine teilweise aktualisierte Installation zurück.
- **Vorschlag:** Den Import von `ytclient` in `main.py` nach `run_smoke` verschieben, damit die GUI
  `yt_dlp` erst bei Bedarf lädt. Nach `changed=True` ein Flag „Neustart nötig“ setzen, das die Phase-3-Queue
  blockiert, und in der UI einen Neustart-Knopf anbieten. Das gehört als Hinweis für Phase 3 in `PROGRESS.md`.

### m3 – Ein FIFO-Worker für alles: PO-Test und Backup warten hinter dem Update und enden mit leerem Timeout-Fehler
- **Ort:** `app/worker.py:264-269`, `app/api.py:337`, `:386` (`timeout=60`)
- **Problem:** Läuft ein Update (bis zu 10 min), steht `test_po_token` in der Queue und wirft nach 60 s
  `concurrent.futures.TimeoutError` mit leerer Meldung. Die UI zeigt dann einen generischen Bridge-Fehler.
  Der Job läuft danach trotzdem noch.
- **Vorschlag:** Ist `worker.current` ein anderer Job, sofort `{ok:false, error:"Wartung läuft gerade
  (Update) – bitte später erneut"}` liefern oder Timeouts in `Api` abfangen und deutsch melden.

### m4 – Wichtige Watchdog-Fehler erscheinen nie im UI-Log
- **Ort:** `app/worker.py:55` (`_SILENT_LOGGERS` enthält `app.worker`), `:397`, `:421-424`, `:282`
- **Problem:** „PO-Token-Server startet nicht (3 Versuche) – bitte prüfen“, die Ausnahme aus dem Watchdog
  und „Hintergrundauftrag … fehlgeschlagen“ laufen über den Logger `app.worker`. Der wird komplett
  unterdrückt, obwohl die Unterdrückung nur für den Dispatcher gedacht ist. Diese Meldungen stehen nur
  in der Logdatei.
- **Vorschlag:** Nur den Dispatcher-Logger stumm schalten (z.B. `app.worker.events`) und für Watchdog und
  Worker eigene, sichtbare Logger verwenden (z.B. `hcloader.pot`, `hcloader.worker`).

### m5 – Abgleich der Aufgabenplanung erreicht das Formular nicht → extern gelöschte Aufgabe wird beim nächsten Speichern neu angelegt
- **Ort:** `app/api.py:429-430` (`_persist(task_scheduler_enabled=…)`), `ui/js/views/settings.js:384`
- **Problem:** `get_task_status` setzt im Backend `task_scheduler_enabled=False`, wenn die Aufgabe
  ausserhalb gelöscht wurde. Die UI aktualisiert dabei aber nur `cache.task`, nicht `work`/`saved`/
  `HC.settings.values`. Speichert der User danach irgendeine andere Einstellung, gilt im Backend
  `old=False, new=True`, und `_sync_task` legt die Aufgabe stillschweigend wieder an.
- **Vorschlag:** Im `.then` von `get_task_status` `schedule.task_scheduler_enabled` (und `task_time`) in
  `work`, `saved` und `HC.settings.values` übernehmen, so wie es der Klick-Handler (Z. 374) schon tut.
  Alternativ eine `status`/`settings`-Event-Benachrichtigung aus `_persist` senden.

### m6 – `query()` wertet jeden schtasks-Fehler als „nicht registriert“
- **Ort:** `app/core/scheduler.py:202-204`, zusammen mit `app/api.py:429-430`
- **Problem:** Zugriff verweigert, Dienst nicht verfügbar oder ein anderer Rückgabecode ≠ 0 ergibt
  `registered=False`, und `get_task_status` schaltet daraufhin die Einstellung ab. Ein vorübergehender Fehler
  verändert so die gespeicherte Config.
- **Vorschlag:** Nur bei „Aufgabe nicht gefunden“ als nicht registriert werten. Das lässt sich
  sprachunabhängig über einen zweiten Aufruf `/Query /TN … ` ohne `/V` oder über den Rückgabecode in
  Kombination mit leerem stdout erkennen. Alle anderen Fehler als `SchedulerError` melden und die Einstellung
  dann nicht ändern.

### m7 – Mehrdeutige Datumsformate bei „nächste Ausführung“
- **Ort:** `app/core/scheduler.py:32-34`
- **Problem:** `%m/%d/%Y …` wird vor `%d/%m/%Y …` probiert. Auf en-GB-Systemen wird `05/11/2026` deshalb
  als 11. Mai gelesen statt als 5. November. Betroffen ist nur die Anzeige im Aufgaben-Kasten (die
  Statusleiste rechnet mit `next_daily`).
- **Vorschlag:** Ein geparstes Datum verwerfen, wenn `HH:MM` nicht der erwarteten `task_time` entspricht
  oder es mehr als 24 h in der Zukunft liegt, und dann auf `next_daily(expected_time)` zurückfallen.
  Die nächste Laufzeit lässt sich auch einfach immer aus `task_time` berechnen.

### m8 – Unbehandelte `OSError` beim Speichern der Config
- **Ort:** `app/api.py:204` (`reset_settings`), `:247` (`_persist`, aufgerufen aus `get_task_status`,
  `create_task`, `remove_task`)
- **Problem:** `save_settings` fängt `OSError` ab, diese drei Pfade nicht. Bei `create_task` ist die Windows-
  Aufgabe dann angelegt, die Config aber nicht aktualisiert, und der User sieht nur einen generischen
  Bridge-Fehler. In `reset_settings` ist `self._settings` dann ebenfalls nicht aktualisiert, die Antwort
  ist aber ein Fehler ohne deutsche Meldung.
- **Vorschlag:** `config.save` in diesen Pfaden wie in `save_settings` absichern und
  `{ok:false, error:"Speichern fehlgeschlagen: …"}` liefern. Zu prüfen ist auch die Reihenfolge in
  `save_settings:180-184`: Die Aufgabe wird angelegt, bevor das Speichern sicher geklappt hat.

### m9 – Echte App fällt nach 30 s still in den Mock-Modus
- **Ort:** `ui/js/bridge.js:133` (`setTimeout(() => finish(hasApi()), hosted ? LIVE_WAIT_MS : WAIT_MS)`)
- **Problem:** Mit `?host=pywebview` startet bei einer langsamen oder fehlerhaften API-Injection der
  Mock-Simulator. Der User kann dann Einstellungen „speichern“, die nie in `config.yaml` landen. Das
  Mock-Flag ist sichtbar, aber leicht zu übersehen.
- **Vorschlag:** Bei `hosted` keinen Mock verwenden, sondern einen Fehlerzustand zeigen („Verbindung zum
  Backend fehlt – neu starten“) und weiter auf `pywebviewready` warten.

### m10 – Thumbnails laden direkt von YouTube-CDN, ausserhalb des Throttle
- **Ort:** `ui/js/components.js:202` (`<img src="${esc(v.thumbnail)}" …>`)
- **Problem:** Eingang und Discover (ab Phase 3/4) laden pro Karte ein Bild von `i.ytimg.com` aus der
  WebView, ohne Throttle und ohne Begrenzung. Es ist kein API-Verkehr, aber YouTube-Infrastruktur, und
  CLAUDE.md §1 lässt dafür keine Ausnahme. Die URL kommt ausserdem ungeprüft aus den Metadaten.
- **Vorschlag:** Bewusst in `docs/decisions.md` entscheiden. Entweder als zulässiger CDN-Abruf dokumentieren
  und auf `https://i.ytimg.com/` beschränken (`loading="lazy"` ist schon da), oder Thumbnails beim Download
  lokal cachen und in Listen nur lokale Bilder bzw. den generierten Platzhalter zeigen. Spätestens in Phase 3
  festlegen.

### m11 – Verwaister PO-Token-Server nach hartem Beenden
- **Ort:** `app/worker.py:401-428`, `app/core/binaries.py:193-216`
- **Problem:** Wird HCLoader per Task-Manager oder Absturz beendet, läuft `deno` weiter und belegt den Port.
  Beim nächsten Start scheitert der neue Server am Port, `wait_ready` sieht aber eventuell das `/ping` des
  alten Servers. Danach ist der neue Prozess tot, der Watchdog startet jede Minute neu und schreibt Log-
  Rauschen. Zusätzlich ist ungeprüft, ob der bgutil-Server nur auf `127.0.0.1` lauscht (der Code fragt nur
  `127.0.0.1` ab, übergibt aber keinen Host).
- **Vorschlag:** Den Kindprozess unter Windows einem Job Object mit `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`
  zuordnen. Vor dem Start prüfen, ob der Port schon antwortet, und den Server dann als fremd melden. Die
  Bind-Adresse von bgutil 2.x anhand der aktuellen Doku prüfen und, wenn möglich, `--host 127.0.0.1`
  übergeben.

### m12 – Hinweis „ganze Stunden“ für die Token-TTL fehlt in der GUI
- **Ort:** `ui/js/i18n.js:223`, offen laut `docs/decisions.md` (PO-Token-TTL, „Offen für den Orchestrator“)
- **Problem:** Das Schema erlaubt 0.5–48 (float), wirksam ist aber `max(1, round(x))`. Der User sieht die
  Rundung nicht.
- **Vorschlag:** Den Hilfetext ergänzen („wird auf ganze Stunden gerundet, min. 1“) oder Schema und Feld auf
  `int` 1–48 umstellen.

---

## Nits

- **n1** `ui/index.html`: keine Content-Security-Policy. Das Escaping ist konsequent, trotzdem wäre
  `default-src 'self'; img-src 'self' https://i.ytimg.com data:; style-src 'self' 'unsafe-inline'` als
  Zweitverteidigung sinnvoll. Das Inline-`onerror` in `components.js:202` müsste dann durch einen
  Listener ersetzt werden.
- **n2** `ui/js/views/watchlist.js:20` `t('source_type.' + s.type)`: Bei einem unbekannten Typ gibt `HC.t`
  den rohen Schlüssel **unescaped** zurück. Heute schreibt nur die App selbst in die DB, also ist das harmlos.
  Besser trotzdem `esc(...)`. Dasselbe Muster gibt es bei `t('phase.' + q.phase)` in `downloads.js` (Phase 3).
- **n3** `app/worker.py:286-287`: `_pending.pop` läuft erst nach `set_result`. Ein `submit` mit gleichem
  Schlüssel genau in diesem Fenster bekommt das schon erledigte Future zurück, ein Doppelklick direkt nach
  Ende startet also nichts. Das ist harmlos, `pop` vor `set_result` ist aber sauberer.
- **n4** `app/main.py:85-95`: Scheitert `Api()` (z.B. gesperrte oder defekte DB), endet der Prozess unter
  `pythonw` ohne sichtbare Meldung. Den Fehler loggen und eine minimale Fehlerseite oder MessageBox zeigen.
- **n5** `app/core/maintenance.py:60-71`: Es wird nicht geprüft, ob `sys.executable` in einem venv läuft
  (`sys.prefix != sys.base_prefix`). Ohne venv aktualisiert der Knopf die System-Python-Pakete.
- **n6** `app/core/scheduler.py:180-182`: Die Aufgabe läuft nur bei angemeldetem User. Die Standard-
  Bedingungen (nur am Netzteil, kein Nachholen verpasster Läufe) lassen sich per `schtasks`-Parameter nicht
  setzen. Für Laptops wäre `/XML` mit `StartWhenAvailable`/`DisallowStartIfOnBatteries=false` robuster
  (Phase 4).

---

## Checkliste reviewer.md

| Punkt | Ergebnis |
|---|---|
| 1 YouTube-Schonung | ok – kein YouTube-Request in Phase 2. Offene Entscheidung zu Thumbnails (m10). |
| 2 Modulgrenzen | ok – `yt_dlp` nur in `ytclient.py`, `core/` ohne pywebview/UI, `api.py` dünn. |
| 3 Sicherheit/Hygiene | ok – keine Secrets, Cookies, Binaries oder Userpfade im Diff, `.gitignore` deckt DB/Config/Logs/Cookies ab. Aktivierungs-Socket nur lokal mit Token, kein XSS gefunden. |
| 4 Korrektheit | Minor-Punkte m1, m3, m5–m8, m11. Keine DB-Migration in dieser Phase. |
| 5 Konfigurierbarkeit | ok – alle 48 Schlüssel in der GUI. TTL-Rundungshinweis fehlt (m12). |
