# Review Phase 7a (SoundCloud), Phase 8 (Player, Genre-Popover), Selbst-Update

- Umfang: `git diff 2f12235..HEAD` (HEAD = 5cbaf1c), dazu die nie reviewten Portable-Fixes vom 16./17.11.
  (`Expand-ZipFile`, `Remove-Tree`, `Save-Download`, `portable_tools.py`, `materialize_links.py`).
- Geprüft gegen CLAUDE.md, SPEC.md, `docs/decisions.md` (Einträge 2026-11-17), `docs/bridge-api.md`,
  `docs/settings-schema.md`, `docs/RELEASING.md` und den installierten Quelltext von yt-dlp 2026.10.26
  (`.venv/lib/python3.13/site-packages/yt_dlp/extractor/soundcloud.py`, `extractor/common.py`).
- `ruff check` und `ruff format --check`: sauber. `pytest -m "not network"`: **799 passed**, 1 deselected.
- Kein Netzwerkzugriff, kein Code geändert. Ein Offline-Nachweis (siehe M1) lief mit echtem yt-dlp ohne
  HTTP.

## Ergebnis: ÄNDERUNGEN NÖTIG

Kein Blocker. Vier Major-Funde: M1 bis M3 betreffen Korrektheit und Schonung bei SoundCloud, M4 den
Updater. Die Architektur ist sauber: Throttle pro Plattform, globaler Lauf-Lock, Staging statt
Austausch im laufenden Betrieb, Zip-Slip-Schutz, Release-Job mit `env:` statt `${{ }}` im Skript.

---

## Major

### M1 – Ein geo-gesperrter SoundCloud-Track bricht ganze Listen und Suchen ab
`app/core/ytclient.py:1308-1321` (`_Mixin._extract_info_dict` / `url_result`).
yt-dlp `SoundcloudBaseIE._extract_info_dict` (soundcloud.py ~Z. 375) ruft bei leerer Formatliste
`raise_geo_restricted()` auf, wenn `policy == "BLOCK"`. Mit `extract_flat=True` ist die Formatliste
**immer** leer. Damit wirft jeder flache Eintrag mit `policy: BLOCK` einen `GeoRestrictedError`.
- Bisher war davon nur die Suche betroffen (yt-dlp-Fehler). Durch das neue Mergen in `url_result` trifft
  es jetzt auch Nutzer-Listen (`/tracks`) und Sets. Ein einziger gesperrter Track, in der Schweiz bei
  Label-Uploads häufig, lässt die Watchlist-Quelle bei jeder Prüfung scheitern.
- Offline mit echtem yt-dlp nachgestellt: `url_result(...)` auf einen gemerkten Track mit
  `policy: "BLOCK"` → `GeoRestrictedError: This video is not available from your location …`.
- Vorschlag: In `_Mixin._extract_info_dict` bei `extract_flat` die Policy vor dem Aufruf entfernen,
  z.B. `super()._extract_info_dict({**info, "policy": None}, ...)`, danach `sc_policy` aus dem Original
  setzen. Das repariert auch die Suche. Zusätzlich in `url_result` `ExtractorError` abfangen und ohne
  Merge weitermachen. BLOCK-Treffer per Filter ausblenden (wie Go+-Vorschauen) und einen Test mit
  `policy: BLOCK` in Suche, Nutzer und Set ergänzen.

### M2 – Die Rückfallebene der yt-dlp-Unterklassen greift nur bei umbenannten Klassen
`app/core/ytclient.py:1241-1375`, `docs/decisions.md` «SoundCloud: yt-dlp-Extractor».
- Wie behauptet sicher zurück fällt nur ein `AttributeError` beim Bauen der Klassen (`sc.SoundcloudUserIE`
  fehlt). Ändert yt-dlp eine Methode (`_call_api`, `_extract_thumbnails`, `_extract_set(playlist, token)`,
  Signatur von `_extract_info_dict`, `_API_V2_BASE`/`_HEADERS`), entstehen die Klassen trotzdem. Der
  Fehler kommt dann erst zur Laufzeit in `super()...` als `AttributeError`/`TypeError`.
- `_metadata_call` reicht solche Fehler roh weiter (kein `YoutubeDLError`). Folge: Jede SoundCloud-Suche
  und -Liste schlägt fehl, statt auf das Original-Verhalten zurückzufallen.
- yt-dlp ist nicht gepinnt und wird per Knopf aktualisiert. Abweichungen kommen also beim User an,
  bevor die CI sie sieht. Der Test in `tests/test_soundcloud.py` deckt nur die CI-Version ab.
- Vorschlag:
  1. Beim Bauen eine Fähigkeitsprüfung: `hasattr` auf alle benutzten Methoden und Attribute,
     `inspect.signature` von `_extract_info_dict` mit Parameter `extract_flat`, `_extract_set` mit
     zwei Parametern. Schlägt sie fehl, keine Unterklassen.
  2. In den Overrides jede Abweichung abfangen (`except (AttributeError, TypeError)`) und an
     `super()` bzw. das Original durchreichen, Warnung einmal ins Log.
  3. Optional: geprüfte yt-dlp-Version im Log melden, wenn sie von 2026.10.26 abweicht.

### M3 – SoundCloud: 403 von Datadome löst keinen Backoff aus
`app/core/throttle.py:43-49` (`_RATE_LIMIT_PATTERNS`), `app/core/ytclient.py:928-937`, `1001-1016`.
- SoundCloud blockiert Bots mit HTTP 403 (Datadome, siehe den Kommentar zu `_browser_impersonate_target`
  in yt-dlp), selten mit 429. Die Muster erkennen nur 429 und den YouTube-Bot-Text.
- Bei 401/403 holt yt-dlp in `_call_api` die `client_id` neu (Startseite plus bis zu ~10 JS-Assets) und
  wiederholt den Aufruf einmal.
- Folge bei einer Sperre:
  - Jeder weitere SoundCloud-Download kostet 3-12 Requests und endet als `failed`. Die Queue nimmt
    sofort den nächsten SoundCloud-Eintrag, bis zum Lauflimit.
  - Jede Watchlist-Prüfung einer SoundCloud-Quelle macht dasselbe.
  - Das widerspricht «bei 429/Bot-Check sofort Backoff» (CLAUDE.md Prinzip 1).
- Vorschlag:
  - Für die Plattform SoundCloud `HTTP Error 403` (bzw. Datadome-Merkmale wie `captcha-delivery`,
    `datadome`) nach dem einmaligen client_id-Refresh als Bot-Check werten → `trigger_backoff` auf dem
    SoundCloud-Throttle.
  - Mindestens zwei aufeinanderfolgende 403 eines Laufs als Sperre behandeln.
  - Test: zwei SoundCloud-Einträge, der erste liefert 403. Erwartet: kein zweiter Versuch, Backoff
    SoundCloud aktiv, YouTube läuft weiter.

### M4 – `apply_update.ps1`: Eine Teilsperre beim Verschieben macht den Rollback unvollständig
`scripts/apply_update.ps1:75-89` (`Move-Entry`) und `180-191`.
- Gelingt das Umbenennen nicht (typisch: Virenscanner, Indexer oder ein Explorer-Vorschau-Handle auf
  einer Datei in `app\`), kopiert `Move-Entry` erst nach `_previous` und löscht dann mit `Remove-Tree`.
- Dieselbe Sperre lässt `rmdir /s /q` teilweise scheitern. `Remove-Tree` wirft, aber erst **nachdem**
  Teile von `$Root\app` gelöscht sind. `[void]$moved.Add($name)` (Z. 187) wird nie erreicht.
- Der Rollback stellt `app` deshalb nicht wieder her: `$moved` enthält es nicht, `$placed` auch nicht.
  Zurück bleibt ein halb gelöschtes `app\`, danach startet `Start-App` die defekte Installation.
  `_previous\app` ist vollständig, wird aber nicht benutzt.
- Vorschlag:
  - `$moved.Add($name)` vor dem Verschieben eintragen. Der Rollback ersetzt dann `$dst` durch
    `_previous\$name`, sofern dort etwas liegt.
  - Oder im Fallback nicht löschen, sondern abbrechen: «Datei gesperrt, Update später erneut». Vorher
    mit einer Rename-Probe prüfen, ob alle Einträge verschiebbar sind (`[IO.Directory]::Move` hin und
    zurück), bevor irgendetwas angefasst wird.
  - Dasselbe Muster gilt für den Rollback selbst (Z. 232-238): `Remove-Tree $dst` kann an derselben
    Sperre scheitern. Robocopy-Retry (`/R:5 /W:2`) bzw. Wiederholen mit Pause erwägen.

---

## Minor

### m1 – Updater startet beim Abmelden oder Herunterfahren von Windows
`app/main.py:212-217`, `app/api.py:654-665` (`finish_update`), Default `apply_update_on_exit = true`.
- Schliesst Windows die App beim Abmelden, startet `finish_update` den Updater mitten im Session-Ende.
  Er wird nach kurzer Zeit hart beendet.
- Bei geänderten `requirements.txt` dauert pip Minuten. Ein Abbruch zwischen Austausch und pip hinterlässt
  neuen Code mit alten Paketen, ohne `result.json` und mit `update.lock` (30 min Startsperre).
- Vorschlag: In `finish_update` bei laufendem Session-Ende nicht starten, das Update bleibt bereit.
  Erkennung über `GetSystemMetrics(SM_SHUTTINGDOWN=0x2000)` oder `WM_QUERYENDSESSION`.

### m2 – Kein Wiederanlauf nach einem Absturz mitten im Austausch; `_previous` wird vorschnell gelöscht
`scripts/apply_update.ps1:178`, `app/core/selfupdate.py:794-816`.
- Stirbt der Updater zwischen Z. 186 und 190 (Strom, Kill), fehlt `app\`. Die App kann sich nicht mehr
  selbst reparieren, `restore()` läuft nie.
- Ist ein Rollback gescheitert (`rolled_back: false`), liegt die einzige gute Kopie in `_previous`. Der
  **nächste** Updater-Lauf löscht sie als Erstes (`Remove-Tree $Prev`).
- Vorschlag:
  - Vor dem Austausch eine Journal-Datei schreiben (`<update>\swap.json` mit `moved`/`placed`). Beim
    nächsten Start (Skriptstart bzw. `HCLoader.cmd`) bei vorhandenem Journal automatisch aus
    `_previous` zurückrollen.
  - `_previous` nur löschen, wenn das letzte `result.json` `ok` war, oder einen Ordner mit Zeitstempel
    verwenden.
  - Bis dahin die manuelle Wiederherstellung im Wiki (Troubleshooting) beschreiben.

### m3 – Ein laufender Headless-Watchlist-Lauf wird vom Updater nicht berücksichtigt
`app/core/selfupdate.py:1011-1054`, `scripts/apply_update.ps1:154-163`.
- Der Updater wartet nur auf die GUI-PID. Ein gleichzeitig laufender `--headless --run-watchlist` aus der
  Aufgabenplanung läuft weiter, während `app\` getauscht und eventuell `site-packages` per pip ersetzt
  wird.
- `ytclient` wird lazy importiert, es entstehen also gemischte Modulstände. pip scheitert an gesperrten
  `.pyd` und löst einen Rollback aus.
- Vorschlag: `launch()` prüft den Lauf-Lock (`locks.acquire_run_lock()` probeweise) und verschiebt das
  Einspielen, oder `apply_update.ps1` wartet auf den Lauf-Lock bzw. Mutex (mit Timeout).

### m4 – SoundCloud-`resolve` wiederholt nach 429 einmal sofort
`app/core/ytclient.py:430` (`extractor_retries: 1` für `resolve`).
- `SoundcloudIE._real_extract` wiederholt im `RetryManager` genau bei 429, ohne `retry_sleep`. Bei
  SoundCloud folgt auf ein 429 also direkt ein zweiter Request.
- Die Wirkung ist klein: `resolve` nutzt heute nur `--smoke`. Die Methode ist aber öffentlich, und
  decisions.md behauptet «keine RetryManager-Wiederholung».
- Vorschlag: Für `platform == SOUNDCLOUD` `extractor_retries: 0` auch bei `resolve`.

### m5 – Die Backoff-Stufe von SoundCloud wird durch erfolgreiche Watchlist-Prüfungen nie zurückgesetzt; Headless meldet BLOCKED bei abgeschaltetem SoundCloud
`app/headless.py:287-292`.
- `throttle.finish_run(res.checked > 0 ...)` setzt nur YouTube zurück. Nach einem SoundCloud-Backoff
  bleibt die Eskalationsstufe dort, bis ein SoundCloud-*Download* gelingt. Der nächste 429 verdoppelt.
- `until_now` nimmt jede Plattform aus `throttle.platforms()`, auch bei `soundcloud.enabled = false`.
  Der Exit-Code ist dann `EXIT_BLOCKED`, obwohl alles Relevante geprüft wurde.
- Vorschlag: `CheckResult` liefert die erfolgreich geprüften Plattformen →
  `finish_run(True, platforms=…)`. Für den Exit-Code nur aktive Plattformen mit Quellen betrachten.

### m6 – Integrität des Selbst-Updates: nur TLS plus optionale SHA256SUMS aus demselben Release
`app/core/selfupdate.py:974-991`, `212-241`.
- Bewertung: `SHA256SUMS` liegt im selben Release wie das ZIP. Das schützt vor Übertragungs- und
  Speicherfehlern, nicht vor einem Angreifer mit Schreibrechten am Repo. Die Vertrauenskette ist
  «GitHub-Konto des Maintainers + TLS».
- Für ein öffentliches Single-Maintainer-Repo mit Klick-Bestätigung, Anzeige der Notizen und
  Downgrade-Schutz (`is_newer`, Versionsabgleich im Paket) ist das **vertretbar**. Viele vergleichbare
  Tools machen es genauso.
- Bedingungen dafür (bitte in `docs/RELEASING.md`/`SECURITY.md` festhalten):
  - 2FA am Konto.
  - Tag-Schutz-Ruleset für `v*`, nur der Maintainer darf Tags anlegen oder löschen.
  - «Immutable releases» in GitHub aktivieren.
  - `wiki.yml` mit `contents: write` nicht auf `claude/**`-Branches laufen lassen (siehe n6).
- Verbesserungen:
  1. Fail-closed: Hat ein *Release* (Quelle `release`) kein `SHA256SUMS` oder keinen Eintrag, abbrechen
     statt nur zu loggen. Der Release-Job hängt die Datei immer an; ihr Fehlen deutet auf einen
     unvollständigen oder manipulierten Release.
  2. Nur `https://` und die Hosts `api.github.com`, `codeload.github.com`, `github.com`,
     `objects.githubusercontent.com`, `raw.githubusercontent.com` zulassen. `browser_download_url`
     kommt ungeprüft aus der API-Antwort und wird an `urlopen` gegeben, das auch `file:` kann.
  3. Später: Signatur (z.B. minisign/ed25519) mit eingebautem öffentlichem Schlüssel.

### m7 – Einstellung `update_repo`
`app/core/config.py` (`MaintenanceSettings._repo`).
- Die Validierung (`owner/repo`-Regex, kein `..`) verhindert Pfad- und URL-Injektion in die API-URL.
- Wer `config.yaml` schreiben kann, kann auch den Programmcode im (Portable-)Ordner ändern. Lokal gibt
  es also keine neue Rechte-Grenze, das Risiko ist **gering**.
- Restrisiko Social Engineering: «trag für den Fix dieses Repo ein». Vorschlag: Ist das Repo nicht
  `DEFAULT_UPDATE_REPO`, im Update-Banner und Notizen-Dialog sichtbar «aus <repo>» anzeigen.

### m8 – Der Neustart nach dem Update startet anders als `HCLoader.cmd`
`scripts/apply_update.ps1:140`, `scripts/portable/HCLoader.cmd:11`.
- `HCLoader.cmd` startet mit `-X utf8`, der Updater mit `pythonw -m app.main` ohne. Nach dem Update
  läuft die App also ohne UTF-8-Modus (Unterschiede bei `subprocess`-Ausgaben, Dateikodierung ohne
  explizites `encoding`).
- Vorschlag: Im Portable-Modus `-X utf8` ergänzen, oder `HCLoader.cmd` verwenden.

### m9 – `fetch_binaries.ps1`: Prüfsumme fail-open, kein Vollständigkeitstest, relative Pfade in `Remove-Tree`
- `Get-ExpectedSha256` (Z. 154-164) schluckt jeden Fehler. Der Download läuft dann unverifiziert weiter
  (nur Warnung). Vorschlag: Bei deno und ffmpeg abbrechen, ausser mit explizitem `-AllowUnverified`.
- `Save-Download` (Z. 46-84, gleich in `build_portable.ps1`) prüft nicht `done == total`, wenn
  `ContentLength` bekannt ist. Vorschlag: `if ($total -gt 0 -and $done -ne $total) { throw ... }`.
- `Remove-Tree` (Z. 101-109) nutzt `[IO.Path]::GetFullPath($Path)`. .NET löst relative Pfade gegen das
  **Prozess**-Arbeitsverzeichnis auf, nicht gegen `$PWD`. Mit `-BinDir .\bin` aus einer Konsole, in der
  vorher `cd` lief, kann `rmdir /s /q` einen gleichnamigen Ordner an anderer Stelle löschen. Vorschlag:
  `$PSCmdlet.GetUnresolvedProviderPathFromPSPath($Path)` (bzw. `$ExecutionContext.SessionState.Path...`)
  statt `GetFullPath`. Gleiches Muster in `build_portable.ps1:122-130` und `apply_update.ps1:55-60`; dort
  sind die Pfade aus dem Manifest absolut, unkritisch.

---

## Nit

- **n1** `app/core/player.py:5-7`: Die Modul-Doku sagt «file must lie inside the target folder
  (`library.within`)». Der Code erlaubt bewusst frühere Zielordner (decisions.md, Orchestrator-Entscheid).
  Doku anpassen.
- **n2** `ui/index.html:12`: `media-src … data:` gilt auch im Live-Modus. `safeSrc` (`ui/js/player.js:68-73`)
  lässt `data:` nur im Mock zu, das genügt (kein Skript-Risiko). Optional `data:` nur im Mock per CSP
  erlauben.
- **n3** `ui/js/player.js:161`: überzähliges `</div>` im Cover-Markup. `ui.thumb` öffnet ein `div`, das
  hier geschlossen wird. Prüfen, ob danach `ui.eq('on-cover')` innerhalb oder ausserhalb liegen soll.
- **n4** Cover-Cache `<app_home>/cache/covers` wird nie aufgeräumt (gelöschte Mixe). Optional bei
  «Bibliothek bereinigen» verwaiste Dateien löschen.
- **n5** `app/core/selfupdate.py:809`: `remove_tree(_previous)` mit `shutil.rmtree(ignore_errors=True)`
  scheitert ohne LongPathsEnabled still an `_previous\site-packages` und `bgutil-pot-provider\…\node_modules`.
  `long_path()` wie in `portable_tools.py` verwenden.
- **n6** `.github/workflows/wiki.yml`: `contents: write` und Trigger auf `claude/**`. Unmergte Branches
  veröffentlichen ins Live-Wiki. Auf `main` beschränken.
  `.github/workflows/portable.yml:9`: Arbeitsbranch `claude/compassionate-thompson-zgetlu` vor dem Merge
  entfernen. Im Release-Job `persist-credentials: false` bei `actions/checkout`.
- **n7** `scripts/apply_update.ps1:39-48`: `ConvertFrom-Json` und `New-Item` laufen vor dem `try`. Ein
  defektes Manifest hinterlässt weder Log noch `result.json`, dafür ein `update.lock` (30 min Sperre).
  Diese Zeilen in den `try` ziehen.
- **n8** `cmd.exe /d /c "rmdir … \"$full\""`: In `/c`-Befehlszeilen expandiert `cmd` `%VAR%` auch in
  Anführungszeichen. App-Pfade mit `%` sind exotisch. Alternative: `[IO.Directory]::Delete($full, $true)`
  mit `\\?\`. Pfade mit `[`/`]`: `Start-Process -FilePath/-WorkingDirectory` (Z. 140) einmal auf Windows
  testen.
- **n9** Download-Kosten SoundCloud: `SoundcloudIE` macht pro Download weiterhin den HEAD-Request für das
  «original»-Artwork. Mit derselben `_extract_thumbnails`-Überschreibung im Download-Pfad spart das 1
  Request pro Track.
- **n10** `update.lock` wird während pip/fetch nicht aufgefrischt. Bei langsamen Netzen (> 30 min) gilt es
  als verwaist, und die Aufgabenplanung könnte mitten im Update starten. Den Lock z.B. in `Write-Log`
  per `touch` auffrischen.
- **n11** ID-Schema: Die theoretische Kollision einer YouTube-ID `sc-12345678` mit `sc:12345678` im
  `.tmp`-Ordner ist dokumentiert. Wahrscheinlichkeit ca. 1e-12 pro Video, unkritisch. Archivzeilen
  (`youtube …`/`soundcloud …`) und Sidecar-Hash (DB-ID) sind sauber getrennt.

---

## Geprüft und in Ordnung

**SoundCloud / Schonung**
- Jeder yt-dlp-Aufruf läuft über `Throttle.platform(p)`: `check_backoff`, `before_request`,
  `metadata_lock`, `request_spacing`, `mark_request`.
- `sleep_interval_requests` wirkt in yt-dlp auf jeden `_request_webpage`, also auch auf `_call_api`,
  HEAD-Requests und die client_id-Assets (common.py Z. 871).
- `extractor_retries`, `retries` und `fragment_retries` stehen auf 0. Der Paging-Retry bei 502 im
  `RetryManager` ist damit aus.
- Behauptete Kosten nachvollzogen:
  - Suche: 1 Request (`limit = n ≤ 200`).
  - Nutzer: 2 Requests (resolve + eine Seite mit 200, `lazy_playlist` + `playlistend`).
  - Set: 1 + ⌈Stubs/50⌉ Requests, nur im Fenster.
  - Download: Info + ≤ 4 Transcodierungen + HEAD (+ optional Original).
- `cachedir` hält die `client_id`.

**Lock-Reihenfolge, ein Download**
- Pro Plattform eigene Thread- und Prozess-Locks, überall in der Reihenfolge Metadaten-Lock → `_lock`
  → `_xlock`.
- Kein Codepfad hält Locks zweier Plattformen gleichzeitig: `finish_run(platforms=…)` und `start_run`
  arbeiten sequenziell, `_siblings_lock` nur beim Erzeugen. Kein Deadlock gefunden.
- Ein Queue-Thread plus globaler Lauf-Lock: nie mehr als ein aktiver Download.
- Plattform-Sperren über `exclude_platforms` lassen die andere Plattform weiterlaufen.

**DB-Migration 5**
- Nur `ALTER TABLE ADD COLUMN` mit Defaults plus Index, pro Schritt atomar.
- Das Pre-Migrations-Backup läuft vor dem ersten fälligen Schritt jeder bestehenden DB (`0 < version <
  len`), nicht bei frischer DB oder `:memory:`.
- Scheitert das Backup, wird nicht migriert (`MigrationBackupError`). GUI, `main()` und Headless fangen
  den Fehler ab und zeigen eine klare deutsche Meldung, die Daten bleiben unverändert.
- Eigene Aufbewahrung (5), die normale Rotation trifft diese Dateien nicht.

**Player**
- Nur `done` und Audio-Endungen, der Pfad stammt ausschliesslich aus der eigenen DB.
- `os.startfile` startet damit nie etwas anderes als Audio.
- `file:`-URLs über `Path.resolve().as_uri()` (prozentkodiert).
- Cover-Cache unter dem Sidecar-Namen, also ohne Kollision von `sc:` und Gross-/Kleinschreibung.
- Kapiteltitel, Interpreten und Tooltips im Trackmenü werden escaped bzw. per `textContent` gesetzt.
  Release-Notizen (`notesHtml`) escapen vor dem Markdown-Ersatz.
- `open_video` und `add_channel_source` für SoundCloud nehmen nur `https://soundcloud.com`-URLs aus der DB.

**Selbst-Update (Python-Seite)**
- Zip-Slip: absolute Pfade, Laufwerksbuchstaben, `..` und `:` (ADS) werden abgelehnt, Symlinks
  übersprungen.
- Grössenlimits, CRC-Test, Versionsabgleich im Paket, Downgrade-Schutz.
- Schutzliste doppelt geprüft: `assert` in Python, Namensprüfung und `-contains` (case-insensitiv) im
  PowerShell-Skript.
- Ausgeführt wird das installierte `apply_update.ps1`, nicht das heruntergeladene.
- `update.lock` blockiert GUI- und Headless-Start.
- Argumentliste als Liste an `Popen` (`list2cmdline`), `-File` ohne String-Interpolation. Pfade mit
  Leerzeichen und Umlauten sind unkritisch (CreateProcessW, Manifest als UTF-8 gelesen).

**Release-Job**
- `permissions: contents: read` global, `contents: write` nur im Job `release`.
- Tag und Version werden verglichen. Tag-Name und CHANGELOG gehen über `env:` bzw. Datei in die
  Skripte, kein `${{ }}` in `run:` des Release-Jobs.

**Portable-Skripte**
- PS-5.1-tauglich (ASCII, PSModulePath-Schutz).
- `Expand-ZipFile` prüft Zip-Slip korrekt (`GetFullPath` + Präfix mit `\`).
- `Remove-Tree` mit `\\?\`, `portable_tools.long_path` (inkl. UNC).
- `materialize_links.py` erkennt Zyklen und verwaiste Links.

**Modulgrenzen und Konfigurierbarkeit**
- `yt_dlp` wird nur in `ytclient.py` importiert, `core/` hat keinen UI-Bezug, `api.py` delegiert
  (Player, Updater, Plattformen).
- Alle neuen Einstellungen sind in der GUI erreichbar: `soundcloud.*`, `player.mode`,
  `maintenance.check_app_updates_on_start`, `maintenance.apply_update_on_exit`,
  `maintenance.update_repo`, `filters.hide_cross_platform_duplicates`,
  `download.keep_original_soundcloud`.

**Hygiene**
- Keine Cookies, Tokens, Binaries oder User-Pfade im Diff. Die Icons unter `ui/img/` sind gewollte
  Assets.
