# Review Phase 5 – Bibliothek, Protokoll, Feinschliff

- Umfang: Phase-5-Anteile von `git diff 17fafdd..HEAD` (`core/library.py`, `core/sidecar.py`,
  `core/logview.py`, `core/logging_setup.py`, `core/maintenance.py`, `core/tagging.py` (`cue_chapters`),
  `api.py` (Bibliothek/Log/Versionen), `db.py` (`set_file_path`, `mark_removed`, Run-Listener),
  `tests/conftest.py`, `tests/test_update_real_venv.py`, `ui/js/views/{library,log,settings}.js`,
  `ui/js/util.js`, `ui/css/effects.css`). Die Phase-4-Fixes darin wurden nur auf Bruch durch Phase 5
  geprüft (keiner gefunden).
- Geprüft gegen: CLAUDE.md, SPEC §3.4, §3.5, §6, §7, §10.2, §11, `docs/decisions.md` (Phase 5),
  `docs/bridge-api.md`.
- Werkzeuge: `ruff check .` und `ruff format --check .` sauber. `pytest` (venv, ohne `-m network`) grün,
  Exit 0. Zwei eigene Versuche (Skript im Scratchpad, nur lokale Dateien, kein Netz) bestätigen M1 und m1.
  Kein Code geändert.

## Ergebnis: ÄNDERUNGEN NÖTIG

Die Phase ist sorgfältig gebaut. Die Pfadsicherheit beim Löschen und Verschieben hält: `within()` löst
Symlinks, Junctions und `..` auf. Unter Windows vergleicht `PureWindowsPath` ohne Gross/Kleinschreibung, UNC
funktioniert, der Zielordner selbst ist ausgeschlossen. `prune_empty_dirs` geht nie bis zum Zielordner
oder darüber hinaus. Neu-Taggen ist wirklich offline: `library` importiert weder `ytclient` noch
`yt_dlp` und ruft kein ffmpeg. Die Sidecar-ID wird per Regex geprüft, Path-Traversal über die ID ist nicht
möglich. Die Suchmarkierung im Log ist XSS-sicher. Reduced-Motion ist vollständig umgesetzt.

Ein Major-Fund verhindert die Freigabe: **Neu taggen löscht bei MP3 alle Frames, die die App nicht selbst
schreibt** (BPM, Key, Rating, ReplayGain, Lyrics …). Das passiert ohne Warnung und lässt sich nicht
rückgängig machen. Dazu kommen drei Minor-Funde.

## Funde

### Major

#### M1 – Neu taggen verwirft fremde ID3-Frames (Datenverlust)
- **Ort:** `app/core/tagging.py:333` (`tags = ID3()` in `_write_id3`), aufgerufen aus
  `app/core/library.py:318-326` (`retag`).
- **Problem:** `_write_id3` baut einen **leeren** ID3-Tag auf und speichert ihn über den vorhandenen.
  Beim Download ist das richtig (frische Datei). Beim Neu-Taggen einer Bibliotheksdatei gehen dadurch
  alle Frames verloren, die der Nutzer oder ein anderes Werkzeug ergänzt hat, z.B. `TBPM`, `TKEY`, `POPM`,
  `TXXX:replaygain_*`, `USLT` und Kommentare. Versuch: eine MP3 mit `TBPM=200` und `POPM` hat nach
  `library.retag` nur noch `COMM, TALB, TCON, TDRC, TIT2, TPE1, TPE2, TRCK, TXXX:SOURCE, TXXX:YOUTUBE_ID`.
  Der Bestätigungsdialog fehlt (Neu taggen startet sofort). Weder decisions.md noch die UI erwähnen das.
  Bei M4A/Opus tritt das Problem nicht auf: Dort werden vorhandene Tags aktualisiert und nicht ersetzt.
- **Vorschlag:** Für das Neu-Taggen (z.B. per Parameter `replace=False` an `write_tags`) den vorhandenen
  Tag laden (`ID3(path)`, Rückfall auf `ID3()` bei `ID3NoHeaderError`). Nur die eigenen Frames
  ersetzen: `delall` für TIT2/TPE1/TPE2/TALB/TRCK/TCON/TDRC/`COMM::eng`/`TXXX:YOUTUBE_ID`/
  `TXXX:SOURCE`/CHAP/CTOC, APIC nur bei vorhandenem neuem Cover. Dazu einen Test mit einem fremden Frame
  (TBPM), der das Neu-Taggen überstehen muss.

### Minor

#### m1 – `PathTooLongError` beim Neu-Taggen wird nicht abgefangen
- **Ort:** `app/core/library.py:298-313` (`paths.build_target_path` steht ausserhalb jedes `try`).
- **Problem:** Wurde `max_path_length` nach dem Download verkleinert oder der Zielordner tiefer gelegt,
  wirft `build_target_path` eine `PathTooLongError`. Die Ausnahme fliegt durch den Wartungs-Worker (Log
  mit Traceback «Hintergrundauftrag retag:… fehlgeschlagen») bis in die JS-Bridge. Dort entsteht nur der
  generische Bridge-Fehler-Toast statt `{ok:false, error}`. Im Versuch reproduziert
  (`max_path_length=100`, tiefer Zielordner).
- **Vorschlag:** `except paths.PathTooLongError as exc: return {"ok": False, "error": str(exc)}` um den
  Pfadbau. Optional: Datei nur taggen und nicht verschieben, mit Hinweis.

#### m2 – Nicht erreichbarer Zielordner zeigt jeden Eintrag als «Datei fehlt»
- **Ort:** `app/core/library.py:100-122` (`library_item`), `ui/js/views/library.js:286-297` (`remove`).
- **Problem:** Ist das Laufwerk mit dem Zielordner abgezogen oder die Netzfreigabe offline, liefert
  `is_file()` überall `False`. Die gesamte Bibliothek erscheint dann als «Datei fehlt», mit Chip-Filter und
  der Aktion «Eintrag entfernen». Entfernt der Nutzer diese Einträge, verlieren sie den Status `done` und
  den Pfad, obwohl die Dateien noch existieren. Sie sind dann `ignored` und tauchen nicht mehr in der
  Bibliothek auf. Bei einer hängenden SMB-Freigabe blockiert ausserdem jeder `stat` einzeln, sodass
  `get_library` sehr lange laufen kann.
- **Vorschlag:** In `list_library` einmal prüfen, ob `settings.target_dir_path()` existiert. Wenn nicht,
  ein Flag `root_missing` (bzw. pro Eintrag `missing:"root"`) zurückgeben und die Einzel-`stat`s für Pfade
  unter diesem Ordner überspringen. In der UI dann ein Banner «Zielordner nicht erreichbar» zeigen und
  «Eintrag entfernen» sperren bzw. deutlich warnen.

#### m3 – Dateien ausserhalb des (geänderten) Zielordners lassen sich in der UI weder löschen noch entfernen
- **Ort:** `app/core/library.py:399-406`, `ui/js/views/library.js:288-298`.
- **Problem:** Nach einer Änderung von `storage.target_dir` liegen alte Dateien ausserhalb des neuen
  Zielordners. `delete_item` verweigert dann zu Recht das Löschen. Die UI schickt `delete_file=false`
  aber nur bei `missing:true`, deshalb gibt es für diese Einträge keinen Weg, sie zu entfernen. Der
  Nutzer sieht nur den Fehler-Toast. Neu taggen verschiebt sie (wie entschieden) auch nicht in den neuen
  Ordner. Das Verhalten selbst ist sicher, nur fehlt ein Ausweg.
- **Vorschlag:** Bei diesem Fehler im Toast/Dialog «Nur Eintrag entfernen» anbieten (z.B. `{ok:false,
  error, outside:true}` zurückgeben und dann `delete_library_item(id, false)` aufrufen). Optional die
  Einträge in der Liste kennzeichnen («ausserhalb Zielordner»). In decisions.md vermerken, was nach einer
  Zielordner-Änderung mit alten Dateien passiert: Sie bleiben liegen, Neu-Taggen taggt sie an Ort und Stelle.

### Hinweise (n)

- **n1 – Bibliotheksaktionen und Download-Queue ohne gemeinsame Sperre.** `delete_library_item` läuft im
  js_api-Thread, `retag` im Wartungs-Worker, die Queue in ihrem eigenen Thread. Kleines Zeitfenster:
  `prune_empty_dirs` (`library.py:57-76`) entfernt einen Ordner, den der Download gerade angelegt hat
  (`ytclient.py:879-880`: `mkdir` und danach `shutil.move`). Dann schlägt der Download nach vollständigem
  Laden fehl. Vorschlag: ein `threading.Lock` «Bibliothek schreiben» um das finale Verschieben im
  Downloader und um `retag`/`delete_item`.
- **n2 – Teil-Löschung:** Wird die MP3 gelöscht und schlägt danach das Löschen der `.cue` fehl
  (`library.py:409-419`), meldet die Funktion einen Fehler, und die DB bleibt `done` (jetzt «Datei
  fehlt»). Das ist harmlos, aber zuerst die `.cue` zu löschen oder trotz Fehler `mark_removed` zu setzen
  wäre konsistenter.
- **n3 – `_same_file` (`library.py:53-54`) löst nichts auf.** Unter Windows wird eine reine Änderung der
  Gross/Kleinschreibung im Titel nie umbenannt. Gibt es im Zielordner einen Junction-/Symlink-Umweg, meldet
  die Funktion «Zieldatei existiert bereits» für dieselbe Datei. Vorschlag: `os.path.samefile`, wenn beide
  Pfade existieren. Bei reinem Case-Unterschied über eine temporäre Datei umbenennen.
- **n4 – `shutil.move` über Volumegrenzen** (nur mit Junction/Mount im Zielordner) kopiert und löscht
  danach. Scheitert das Löschen (Datei in Benutzung), bleibt eine Kopie am Ziel, und die DB zeigt
  weiterhin auf das Original.
- **n5 – `desktop.ini`/`Thumbs.db`** verhindern das Aufräumen leerer Ordner (`prune_empty_dirs` behandelt
  nur `cover.jpg` als leer). Optional die beiden wie `cover.jpg` behandeln.
- **n6 – Backup-Rotation zu breit / Race:** `prune_backups` und `list_backups`
  (`maintenance.py:294`, `362`) erfassen jedes `hcloader-*.db`. Eine vom Nutzer abgelegte Kopie wie
  `hcloader-vor-umzug.db` würde mitrotiert und gelöscht. Vorschlag: Regex
  `^hcloader-\d{8}-\d{6}(-\d+)?\.db$`. `p.stat()` im Sortierschlüssel ist ungeschützt: Verschwindet eine
  Datei zwischen `glob` und `stat`, wirft `backup_database` nach erfolgreichem Backup bzw. `get_versions`.
- **n7 – Job-Schlüssel im Text:** Läuft ein Neu-Taggen und wird ein zweites angestossen, lautet die
  Meldung «Wartung läuft gerade (retag:abc…)» (`api.py:405`, `970`). Vorschlag: `_JOB_LABELS` um ein
  Präfix `retag:` → «Neu taggen» ergänzen. Optional mehrere Neu-Taggen nacheinander einreihen statt
  abzuweisen.
- **n8 – `get_library` bei jedem `done`-Event** (`library.js:383`) baut die komplette Liste neu auf: pro
  Eintrag drei `stat`s, bei fehlender Dauer zusätzlich ein Mutagen-Parse (`library.py:87-97`). Bei grossen
  Bibliotheken auf einem NAS spürbar. Vorschlag: eine per Mutagen ermittelte Dauer in die DB schreiben und
  `done` nur debounced nachladen.
- **n9 – `logview.filter_lines(levels=[…])`** behandelt `ok` getrennt von `info`, die Mindeststufe und die
  UI dagegen nicht (`logview.py:30-33`). Die UI ist davon nicht betroffen (sie filtert selbst).
- **n10 – Log-Historie:** Gelesen werden nur die letzten 512 KB der aktuellen `hcloader.log`. Nach einer
  Rotation ist die Historie kurz. GUI und Headless schreiben über eigene `RotatingFileHandler` in dieselbe
  Datei. Unter Windows scheitert die Rotation dann am offenen Handle des anderen Prozesses (bestehend seit
  Phase 4). Weil die Historie jetzt aus dieser Datei kommt, sollte das notiert werden. Mögliche Abhilfe:
  getrennte Dateien (`hcloader-headless.log`) oder `delay=True` mit Lock.
- **n11 – Update-Konsole** (`settings.js:291`) übernimmt während des Updates jede `log`-Zeile, auch
  fremde (z.B. Downloads). Das ist nur kosmetisch.
- **n12 – Sidecar unter Windows:** `meta/<id>.json` unterscheidet keine Gross/Kleinschreibung. Zwei IDs,
  die sich nur darin unterscheiden, teilen sich die Datei. Das ist praktisch irrelevant, sollte aber in
  decisions.md stehen. Die ID-Regex (`[0-9A-Za-z_-]{1,32}`) verhindert Traversal zuverlässig.
- **n13 – Tests/CI:** Die Netzsperre in `conftest.py` gilt nur für den Python-Prozess. Von Tests gestartete
  Subprozesse (ffmpeg, pip, Chromium) deckt sie nicht ab, das sollte im Docstring stehen. Der
  `network`-Job in CI (`ci.yml`) wird bei nicht erreichbarem PyPI still übersprungen. Er zeigt dann grün,
  ohne etwas geprüft zu haben. Optional in CI mit `HCLOADER_REQUIRE_NETWORK=1` den Skip in einen Fehler
  verwandeln.
- **n14 – SPEC §3.5 «Ende»:** Die Lauf-Historie zeigt Start und Dauer, das Ende steht nicht direkt da.
  Das ist vertretbar. Das Ende könnte im Tooltip stehen.

## Geprüft und in Ordnung

- **Dateisicherheit:** `within()` mit `resolve()` lehnt `..`, Symlink- und Junction-Ausbrüche ab und
  schliesst den Zielordner selbst aus. Unter Windows wird ohne Gross/Kleinschreibung verglichen, UNC
  funktioniert, ein nicht auflösbarer Pfad ergibt `False`. Löschen ausserhalb wird vollständig verweigert,
  die `.cue` wird separat geprüft. `prune_empty_dirs` bricht am Zielordner ab, `cover.jpg` wird nur in
  sonst leeren Ordnern gelöscht. `retag` verschiebt nur innerhalb des Zielordners. Kollision: Abbruch
  vor jeder Änderung. Die Reihenfolge Tags → Verschieben → DB entspricht decisions.md.
- **Archiv/DB:** `mark_removed` setzt `ignored`, `archive.txt` bleibt erhalten (dokumentiert). Das
  Sidecar wird gelöscht. Eine neue Migration gibt es in Phase 5 nicht (m4 `source_videos` gehört zu
  Phase 4 und ist reviewt).
- **Sidecar:** Daten aus einer Whitelist, keine Cookies/Header/Tokens. Die Beschreibung ist auf 2000
  Zeichen begrenzt, das Schreiben atomar. Fehler werden geloggt und nie geworfen. Lesen ist robust gegen
  kaputtes JSON.
- **CUE:** `cue_chapters` liefert sortierte, streng steigende Frames, Track 01 bei 00:00:00, maximal 99
  Tracks, Minuten > 99. `_q` entfernt Anführungszeichen und Zeilenumbrüche, es gibt also keine
  Zeileninjektion. `chapters_from_info` verwirft Kapitel ab dem Medienende.
- **Event `run`:** Der Listener wird nach `finish_run` aufgerufen und ist gekapselt. `EventBus.emit` ist
  nicht blockierend (`put_nowait`), es gibt keinen Deadlock mit dem DB-Lock. Der Listener wird in
  `shutdown` entfernt.
- **Wartung:** `run_update(executable=…)` prüft venv und Versionen des fremden Interpreters (`-I`).
  Die Rotation schützt das neue Backup und löscht nur im `backups`-Ordner (siehe n6 zum Muster).
  `test_update_real_venv.py` hat den Marker `network` und spricht nur mit PyPI, YouTube kommt nicht vor.
  `addopts` schliesst `network` standardmässig aus.
- **api.py dünn:** Bibliothek und Log delegieren an `core/library` und `core/logview`, Neu-Taggen läuft
  im Wartungs-Worker. `delete_library_item` läuft synchron im js_api-Thread (kurz, nicht im GUI-Thread).
- **XSS:** Titel, Pfade, Kanäle, Genres, Notizen und Backup-Namen laufen durch `esc()` (auch `'` und
  `"`). Die Suchmarkierung `mark()` escaped jedes Teilstück einzeln und markiert nicht, wenn die
  Normalisierung die Länge ändert. Genre-Farben in `style` werden im Backend (`^#[0-9a-fA-F]{6}$`) und in
  `HC.genres.color` geprüft. Toasts escapen. Die Update-Konsole escaped Level und Text.
- **Clipboard/localStorage:** `copyText` nutzt die Clipboard-API, als Rückfall ein Textfeld mit
  `execCommand`. Fokus wird zurückgegeben. Im localStorage stehen nur Ansichtspräferenzen (`hc.library`,
  `hc.log`), validiert beim Laden.
- **Effekte:** Dauerschleifen laufen nur bei Aktivität (aktiver Download, Queue-LED `live`, Spinner,
  Prüfung, Sleep-Phase). Warn-LEDs blinken fünfmal. Animiert werden nur `transform`/`opacity`.
  `body.reduced` und `prefers-reduced-motion` setzen pauschal `animation/transition:none!important`, die
  neuen Pseudo-Elemente werden ausgeblendet. JS-Effekte (`fx.count`, `fx.pop`, `fx.leave`, FLIP in
  `downloads.js`) prüfen `fx.reduced()`.
- **Hygiene:** keine Secrets, keine Binaries, keine Benutzerpfade im Diff. `.gitignore` deckt `.tmp/`,
  `*.cue`, `*.db`, `*.log` ab.
- **Modulgrenzen:** `yt_dlp` kommt nur in `ytclient.py` vor, `core/` hat keinen UI-Bezug.

## Runde 2

- Umfang: Fixes in `87e916c..ea1e9aa` (`core/library.py`, `core/tagging.py`, `core/sidecar.py`,
  `core/maintenance.py`, `core/ytclient.py` (FS_LOCK), `api.py`, `ui/js/views/library.js`, `i18n.js`,
  `mock.js`, `bridge.js`, CSS, `tests/test_review5.py`, `conftest.py`, `ci.yml`), Begründungen in
  `docs/decisions.md` («Review Phase 5: Fixes»). Bewertet habe ich den Stand `ea1e9aa` in einem eigenen
  Worktree. Spätere Phase-6-Commits (ab `c134358`) wurden nicht bewertet.
- Werkzeuge: `ruff check .` und `ruff format --check .` (87 Dateien) sind sauber. `pytest` ohne `-m network`
  ergibt 620 passed, 1 deselected, Exit 0. Ein eigener Versuch (Scratchpad, nur lokale Dateien, kein Netz) prüft
  `write_tags(keep_existing=True)` an einer ID3v2.3-MP3 mit fremden Frames und `prune_empty_dirs` mit Mix,
  `cover.jpg` und `Thumbs.db` im selben Ordner. Kein Code geändert.

### Ergebnis Runde 2: FREIGEGEBEN

M1 ist behoben, ebenso m1–m3 und die angenommenen Hinweise (n1–n7, n12, n13). n8–n11 und n14 sind in
decisions.md bewusst offen gelassen, das ist vertretbar. Neu gefunden habe ich einen Minor-Fund (R2-m1: Neu-Taggen
entfernt zusätzliche fremde Bilder) und einige Hinweise. Keiner davon blockiert. Bitte R2-m1 in Phase 6 beheben oder
in decisions.md begründen.

### Status der Funde aus Runde 1

| ID | Status | Bemerkung |
|---|---|---|
| M1 | behoben | Versuch: `TBPM`, `TXXX:replaygain_track_gain`, `COMM::deu` und `COMM:iTunNORM:eng` bleiben erhalten. `COMM::eng` (App-Slot) wird ersetzt. Fremde `CHAP`/`CTOC` mit anderen IDs (`ext1`/`TOC1`) werden durch `_add_chapter_frames` sauber ersetzt (es gibt keine doppelte Top-Level-CTOC). Ohne Kapitel werden alte CHAP/CTOC entfernt. `mutagen.ID3.delall("COMM::eng")` trifft nur den exakten HashKey, kein Präfix. ID3v2.3-`TYER` wird beim Laden zu `TDRC` und damit ersetzt. Der Erst-Download startet weiterhin leer (`keep_existing=False`). Rest: R2-m1 (APIC). |
| m1 | behoben | `PathTooLongError`, `ValueError` und `OSError` beim Pfadbau ergeben `{ok:false}`, danach wird nichts geändert. |
| m2 | behoben | `get_library` prüft den Zielordner einmal (Thread, 3 s). Darunter wird nicht `stat`-geprüft, die Einträge sind `unknown`, nicht `missing`, und `_under` arbeitet rein lexikalisch. Die UI zeigt ein Banner und sperrt «Neu taggen» und «Entfernen». `delete_item` verweigert im Backend zusätzlich (`unreachable`). `get_library` bleibt eine Liste (kein Bridge-Bruch). Rest: R2-n1, R2-n2. |
| m3 | behoben | `outside:true` → Dialog «Nur Eintrag entfernen» (`delete_file=false`). Die Reihenfolge der Prüfungen stimmt: Eine Datei ausserhalb fällt nicht unter die Sperre «nicht erreichbar». Symlinks nach draussen werden über `within()` ebenfalls als `outside` erkannt. decisions.md ist ergänzt. |
| n1 | behoben (prozessintern) | `FS_LOCK` (RLock) siehe unten. Headless und GUI sind getrennte Prozesse, siehe R2-n3. |
| n2 | behoben | Erst `.cue`, dann MP3. Scheitert die MP3, bleibt der DB-Eintrag `done`, die `.cue` ist dann weg (lässt sich per Neu-Taggen aus dem Sidecar neu schreiben). |
| n3/n4 | behoben | `os.path.samefile`, Zwischenname bei reiner Gross/Kleinschreibung, Aufräumen der Kopie nach gescheitertem `shutil.move`. Rest: R2-n4. |
| n5 | behoben | Siehe «Aufräumen leerer Ordner». |
| n6 | behoben | Strenges Muster, passend zu `backup_database` (`hcloader-YYYYmmdd-HHMMSS[-n].db`). `.db.tmp` und Nutzerkopien werden nie erfasst. `stat` läuft einmal pro Datei, verschwundene Dateien werden übersprungen, nur reguläre Dateien zählen. |
| n7 | behoben | «Wartung läuft gerade (Neu taggen)». |
| n12 | behoben | Siehe «Sidecar-Migration». |
| n13 | behoben | Docstring ergänzt. `HCLOADER_REQUIRE_NETWORK=1` im CI-Netzwerkschritt macht aus dem PyPI-Skip einen Fehler. |
| n8–n11, n14 | offen (bewusst) | In decisions.md vermerkt. |

### `target_reachable` (Thread-Timeout)

- Richtig: Der Timeout gilt als «nicht erreichbar». `daemon=True` blockiert das Beenden der App nicht. Das Ergebnis
  wird über eine Liste übergeben (ein Thread schreibt, gelesen wird nach `join`). Das ist unkritisch.
- **Thread-Leak:** Ja, aber begrenzt. Jeder Aufruf bei hängender Freigabe hinterlässt einen blockierten Daemon-Thread, bis
  das OS den SMB-`stat` abbricht (unter Windows typischerweise 30–60 s, siehe R2-n1). Auslöser sind `get_library`
  (Ansicht öffnen und jedes `done`-Event), `get_library_status` (nur ohne Cache) und `delete_item`.
- Bei toter Freigabe hängen Downloads ohnehin vorher. Viele `done`-Events fallen in diesem Zustand also nicht an. Ein
  Anhäufen ist deshalb unwahrscheinlich, aber nicht ausgeschlossen (Nutzer klickt wiederholt in die Bibliothek).

### FS_LOCK

- **Kein Deadlock gefunden.**
  - Der Downloader nimmt `FS_LOCK` in `_finish`, nach `_download_with_retry`.
  - Zu diesem Zeitpunkt hält er weder `Throttle._lock` noch `_dl_lock` noch `_meta_lock`. Der Metadaten-Lock wird beim
    Start der Medienübertragung freigegeben, `mark_download_end` ist schon gelaufen.
  - Unter `FS_LOCK` werden nur `Database._lock` (kurz, pro Aufruf), `sidecar.write` und der Prüf-Thread benutzt.
  - Kein Halter von DB- oder Throttle-Locks greift umgekehrt nach `FS_LOCK`.
  - Kein Import-Zyklus: `library` importiert `ytclient` nicht.
- **Haltedauer:**
  - Der Downloader hält ihn nur für `mkdir` und `move`.
  - `retag` hält ihn für den ganzen Vorgang. Dazu gehört `write_tags` (Mutagen schreibt die Datei komplett neu, wenn
    das Padding nicht reicht, bei einem 200-MB-Mix auf einem NAS sind das Sekunden) und gegebenenfalls ein
    Verschieben über Volumegrenzen.
  - `delete_item` hält ihn inklusive bis zu 3 s `target_reachable`.
  - Folge: Ein fertiger Download wartet so lange vor dem Verschieben. Er ist dann schon `on_commit`, also nicht mehr
    abbrechbar. Das ist vertretbar, weil Neu-Taggen eine Einzelaktion ist.
  - Hängt jedoch ein `shutil.move` des Downloaders auf einer toten Freigabe, blockieren `delete_library_item`
    (js_api-Thread, nicht der GUI-Thread) und `retag` (Wartungs-Worker, läuft in den Timeout) entsprechend lange. Siehe
    R2-n1.

### `_move` mit Zwischennamen

- `same` und eine nur in der Gross/Kleinschreibung abweichende Schreibweise ergeben `moving=True`, ohne
  «existiert bereits»-Abbruch. Der Weg führt dann über `*.hcl-rename`. Unter Linux (case-sensitive) bleibt es ein
  normales Verschieben.
- `.cue`: Bei gleicher Datei wird nicht gelöscht (`_same_file(old_cue, new_cue)`), sondern überschrieben bzw.
  verschoben. Das ist korrekt.
- `prune_empty_dirs` nach einer Umbenennung im selben Ordner findet die Datei und bricht ab.
- Aufräumen nach gescheitertem `shutil.move`: Die Kopie am Ziel wird nur gelöscht, wenn die Quelle noch existiert. Ein
  vorher vorhandenes Ziel ist ausgeschlossen, weil `new_path.exists()` vorher unter `FS_LOCK` abbricht. Damit ist das
  Löschen sicher.
- Lücke: R2-n4 (zweites `os.replace` scheitert).

### Aufräumen leerer Ordner (`cover.jpg`, `desktop.ini`, `Thumbs.db`)

- Gelöscht wird nur, wenn **alle** Einträge des Ordners Junk-Namen haben **und** reguläre Dateien sind. Ein noch
  vorhandener Mix, eine `.cue`, ein Unterordner oder irgendeine andere Datei (`folder.jpg`, `.nfo`) verhindert das
  Löschen. Versuch: Ordner mit `mix.mp3`, `cover.jpg` und `Thumbs.db` → nichts entfernt.
- **Ein `cover.jpg`, das zu einem noch vorhandenen Mix im selben Ordner gehört, wird also nie gelöscht.** Ein Mix mit
  Status `done`, dessen Datei fehlt, schützt das Cover nicht. Das ist harmlos, Neu-Taggen schreibt es neu.
- Nie der Zielordner selbst: `within(root, root)` ist falsch, bei flacher Vorlage bleibt also auch `<Ziel>/cover.jpg`.
- Downloads schreiben `cover.jpg` erst nach dem Verschieben (ausserhalb von `FS_LOCK`). Der Mix liegt dann schon im
  Ordner, das Aufräumen greift also nicht.
- Unter Windows kann ein schreibgeschütztes `desktop.ini` (Attribut `+r`) `unlink` scheitern lassen. Dann ist
  vielleicht schon `cover.jpg` weg, der Ordner bleibt aber stehen (`OSError` → Abbruch). Das ist harmlos.

### Sidecar-Migration

- Neuer Name `<id>.<sha1[:8]>.json`. Die ID-Regex verbietet Punkte, Kollisionen mit anderen IDs sind also
  ausgeschlossen.
- Altes `<id>.json` wird nur gelesen, migriert (beim nächsten `write`) oder gelöscht, wenn das gespeicherte `id`
  genau passt oder fehlt. Unter Windows bleibt so ein `ABC.json` (id `ABC`) beim Schreiben für `abc` erhalten.
  `build` schreibt `id` immer.
- Kleinigkeit: `delete` entfernt ein **kaputtes** altes `<id>.json` (`_load` → `None`) auch dann, wenn es zur
  Variante mit anderer Schreibweise gehört. Das ist praktisch irrelevant.
- Andere Leser des `meta`-Ordners gibt es nicht (grep).
- Ohne `write` (kein Neu-Taggen) bleiben alte Namen dauerhaft liegen. Das funktioniert, ist aber nicht aufgeräumt.

### Neue Funde

#### Minor

##### R2-m1 – Neu taggen entfernt bei MP3 alle zusätzlichen Bilder (APIC)
- **Ort:** `app/core/tagging.py:369-370` (`if cover: tags.delall("APIC")`) zusammen mit
  `app/core/library.py:363` (`cover = extract_cover(path)`, Cover kommt immer aus der Datei selbst).
- **Problem:**
  - Hat die Datei irgendein Bild, ist `cover` beim Neu-Taggen immer gesetzt. Dann werden **alle** APIC-Frames gelöscht
    und nur das Frontcover (bzw. das erste Bild) als `type=3, desc="Cover"` neu geschrieben.
  - Versuch: Datei mit Front (`type 3`) und Rückseite (`type 4, desc "back"`) → danach nur noch
    `APIC:Cover` mit den Front-Daten. Die Rückseite ist weg.
  - Das ist dieselbe Fundklasse wie M1 (fremde Frames gehen verloren), nur viel enger.
  - Die Doku (`bridge-api.md`: «APIC nur mit neuem Cover», decisions.md: «ein altes Cover bleibt ohne neues»)
    legt nahe, dass das Cover nur bei einem *neuen* Bild ersetzt wird. Ein neues Bild gibt es beim Neu-Taggen nie.
  - Zusätzlich (schon vor Runde 2): Ein vom Nutzer eingesetztes PNG-Cover wird mit `mime="image/jpeg"`
    zurückgeschrieben (`tagging.py:389`). Bei MP4 passiert dasselbe mit `FORMAT_JPEG`.
- **Vorschlag:**
  - Beim Neu-Taggen das vorhandene APIC gar nicht anfassen: in `retag` `cover_jpeg=None` übergeben und `cover` nur für
    `cover.jpg` verwenden.
  - Alternativ nur `APIC:Cover` bzw. das eine extrahierte Frame ersetzen und den MIME-Typ übernehmen.
  - Test: Rückseite (`type 4`) übersteht das Neu-Taggen.

#### Hinweise
- **R2-n1 – Prüf-Thread pro Aufruf** (`library.py:78-92`): Bei hängender Freigabe entsteht pro `get_library` bzw.
  `delete_item` ein weiterer blockierter Thread. Vorschlag: Nur eine laufende Prüfung pro Zielordner zulassen
  (Modulvariable). Läuft noch eine, sofort `False` zurückgeben, ohne neuen Thread.
- **R2-n2 – Langsame, aber lebende Freigabe:** Ein NAS, das aus dem Standby aufwacht, braucht oft mehr als 3 s. Die
  Bibliothek zeigt dann kurz «nicht erreichbar» und lädt nicht von selbst neu. Das ist sicher (es wird nichts entfernt).
  Optional: Banner mit Knopf «Erneut prüfen», oder einmal automatisch nach ~10 s neu laden.
- **R2-n3 – FS_LOCK nur prozessintern:** Ein Headless-Lauf (Aufgabenplanung) verschiebt Downloads in einem anderen
  Prozess. Das Zeitfenster aus n1 bleibt zwischen Headless-Download und GUI-Löschen bestehen (selten: beide
  gleichzeitig, gleicher Ordner). Optional ein Datei-Lock wie `_xlock` beim Throttle, sonst in decisions.md
  festhalten.
- **R2-n4 – `_move`, zweites `os.replace` scheitert** (`library.py:100-101`): Die Datei bleibt als
  `<name>.hcl-rename` liegen, die DB zeigt auf den alten Namen («Datei fehlt»). Vorschlag: Im `except` zurück
  umbenennen (`os.replace(tmp, src)`).
- **R2-n5 – `get_library_status` liest `_lib_status`** ohne Lock aus dem js_api-Thread. Gleichzeitige `get_library`
  können sich überschreiben. Das ist harmlos (Ergebnis höchstens ein Aufruf alt).

### Checkliste reviewer.md (Runde 2)

| Punkt | Ergebnis |
|---|---|
| 1 YouTube-Schonung | ok. Keine neuen Netzwerkzugriffe. Neu-Taggen bleibt offline, `library` importiert weder `ytclient` noch `yt_dlp`. `ytclient` importiert nur `FS_LOCK`. |
| 2 Modulgrenzen | ok. `yt_dlp` nur in `ytclient.py`. `core/` ohne UI-Bezug. `api.py` delegiert (`get_library_status` ist ein dünner Cache). |
| 3 Sicherheit/Hygiene | ok. Keine Secrets, Binaries oder Benutzerpfade im Diff. Banner und Dialog escapen Pfad und Fehlertext. |
| 4 Korrektheit | ok. Kein Deadlock, Löschen nur innerhalb des Ziels, kein Cover-Verlust bei vorhandenem Mix, strenge Backup-Rotation. Rest: R2-m1, R2-n1–n5. |
| 5 Konfigurierbarkeit | ok. Keine neuen Einstellungen. `ROOT_CHECK_TIMEOUT_S` ist eine bewusste Konstante. |

**Meldung: FREIGEGEBEN.** R2-m1 bitte in Phase 6 beheben oder in decisions.md begründen.
