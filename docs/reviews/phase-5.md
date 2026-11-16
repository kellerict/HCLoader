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
