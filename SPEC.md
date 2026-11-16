# SPEC – HCLoader

Version 0.1 · Stand 2026-11-16

## 1. Ziel

Windows-Desktop-App, mit der Pidi Hardstyle-, Hardcore- und Uptempo-**Mixes** auf YouTube findet (Suche + Watchlist), filtert und als getaggte MP3 lokal ablegt – mit möglichst geringer Last für YouTube. Später sollen die Dateien von einem separaten Medienserver (Plex/Jellyfin) gelesen werden; die Ordnerstruktur und Tags sind darauf ausgelegt.

Nicht-Ziele: kein Streaming/Player, keine Weiterverbreitung, kein Multi-User, kein Video-Download.

## 2. Plattform & Betrieb

- Windows 10/11, x64. Läuft als normale Fenster-App (pywebview/WebView2).
- Installation über `scripts/setup.ps1`: venv, Abhängigkeiten, `deno.exe` + `ffmpeg.exe` nach `bin/`, Desktop-Verknüpfung mit `pythonw.exe -m app.main`.
- Single-Instance (zweiter Start bringt bestehendes Fenster nach vorne).
- Headless-Modus `--headless --run-watchlist` für die Windows-Aufgabenplanung; die App kann die geplante Aufgabe in den Einstellungen anlegen/entfernen (`schtasks`).
- Solange die App offen ist, kann sie die Watchlist zusätzlich selbst im eingestellten Intervall prüfen.

## 3. Funktionen

### 3.1 Entdecken (Suche)
- Freitextsuche, optional Genre-Chip vorausgewählt (hängt Genre-Begriffe an die Suche an).
- Quelle der Suche: `ytsearchN:` über yt-dlp, flach (`extract_flat`). N konfigurierbar (Default 30, Max 100).
- Ergebnisse als Karten: Thumbnail, Titel, Kanal, Dauer-Badge, Upload-Datum, Aufrufe, erkanntes Genre, Status (neu / in Warteschlange / geladen / ignoriert / Fehler).
- Filterleiste (live, clientseitig auf den Treffern + gespeicherten Defaults):
  - Dauer min/max (Default min 10 min, max offen)
  - Upload-Zeitraum (alle / 7 Tage / 30 Tage / 1 Jahr / benutzerdefiniert)
  - Genre (Mehrfachauswahl, inkl. "Unsortiert")
  - Include-Keywords / Exclude-Keywords (vorbelegt aus Settings, temporär änderbar)
  - Status (bereits geladene / ignorierte ausblenden – Default an)
  - Kanal-Blacklist anwenden (Default an)
  - Sortierung: Relevanz, Datum, Dauer, Aufrufe
- Aktionen pro Karte: Herunterladen, Ignorieren, Auf YouTube öffnen, Kanal zur Watchlist, Kanal blockieren, Genre manuell setzen.
- Mehrfachauswahl + "Auswahl herunterladen".

### 3.2 Watchlist
- Quellen: Kanal, Playlist, gespeicherte Suche. Felder: Name, URL/Query, Standard-Genre (optional), aktiv, max. Einträge pro Prüfung (Default 30), zuletzt geprüft, Anzahl neu.
- "Jetzt prüfen" (einzeln / alle). Neue Treffer, die alle Filter bestehen, landen im **Eingang**.
- Pro Quelle wählbar: Treffer automatisch herunterladen **oder** nur in den Eingang.
- Prüfung bricht pro Quelle beim ersten Video ab, das **diese Quelle** schon gesehen hat (`break_on_existing`-Logik über DB, Tabelle `source_videos`). Nur aus einer Suche oder einer anderen Quelle bekannte Videos stoppen die Prüfung nicht. Die erste Prüfung einer Quelle bricht nie ab.

### 3.3 Downloads (Warteschlange)
- Sequenziell, genau ein aktiver Download.
- Anzeige: Fortschritt, Geschwindigkeit, ETA, Phase (Laden / Konvertieren / Taggen).
- Aktionen: Abbrechen, Wiederholen (manuell), Reihenfolge ändern, Warteschlange pausieren.
- Limit "max. Downloads pro Lauf/Tag" greift auch hier; Rest bleibt in der Queue.

### 3.4 Bibliothek
- Liste aller geladenen Mixes (aus DB), Suche/Filter nach Genre/Kanal/Jahr.
- Aktionen: Ordner öffnen, Datei neu taggen, Eintrag + Datei löschen (mit Bestätigung).

### 3.5 Protokoll
- Live-Log (Info/Warn/Fehler filterbar), Lauf-Historie (Start, Ende, gefunden, geladen, Fehler, Backoff).

### 3.6 Statusleiste (immer sichtbar)
- yt-dlp-Version, Deno OK, ffmpeg OK, PO-Token-Status, Backoff aktiv bis …, nächste geplante Prüfung, Queue-Länge.

## 4. Filterlogik (core/filters.py)

- Ein Video besteht, wenn **alle** zutreffen:
  1. Dauer ≥ `min_duration` (Default **600 s**) und ≤ `max_duration` (0 = unbegrenzt). Unbekannte Dauer (Livestreams/Premieren) → verwerfen; Livestreams immer verwerfen.
  2. Include-Liste leer **oder** mindestens ein Include-Keyword trifft.
  3. Kein Exclude-Keyword trifft.
  4. Kanal nicht auf Blacklist.
  5. Status nicht `done`/`ignored` (sofern ausblenden aktiv).
- Matching: case-insensitive, Wortgrenzen, Umlaute/Akzente normalisiert. Geprüft wird der Titel; Beschreibung optional (Setting, Default aus, weil flache Abfragen sie oft nicht liefern).
- Default Include: `mix, set, liveset, live set, podcast, continuous, megamix, yearmix, radio show, session, warm up, closing`
- Default Exclude: `reaction, tutorial, how to, shorts, trailer, aftermovie, teaser, preview, lyrics, karaoke, sample pack, ableton, fl studio`

## 5. Schonung von YouTube (core/throttle.py)

Alle Werte in den Einstellungen änderbar, Defaults:

| Setting | Default |
|---|---|
| `sleep_requests` (zwischen Metadaten-Requests) | 3 s |
| `sleep_interval` / `max_sleep_interval` (zwischen Downloads, zufällig) | 30 / 120 s |
| `limit_rate` | 3 MB/s |
| `max_downloads_per_run` | 10 |
| `max_downloads_per_day` | 25 |
| `max_searches_per_hour` | 20 |
| `watchlist_interval` | 24 h |
| `entries_per_source` | 30 |
| Backoff bei HTTP 429 / "confirm you're not a bot" | 6 h, verdoppelt bis max. 48 h, Reset nach erfolgreichem Lauf |

- Keine automatischen Retries für denselben Download innerhalb eines Laufs (max. 1 Retry bei Netzwerkfehler, nicht bei 403/429).
- Backoff-Zustand wird in der DB persistiert und blockiert Suche, Watchlist und Downloads (UI zeigt Restzeit, manuell aufhebbar mit Warnhinweis).
- Zentrale Zähler (pro Stunde/Tag) im Throttle, nicht verstreut.

## 6. yt-dlp, Deno, PO-Token (core/ytclient.py, core/binaries.py)

- yt-dlp mit expliziter JS-Runtime: Deno aus `bin/deno.exe` (`js_runtimes`-Option bzw. aktuelle Entsprechung prüfen).
- PO-Token: `bgutil-ytdlp-pot-provider` als yt-dlp-Plugin, von Anfang an eingebaut.
  - Bevorzugt **Script-Modus mit Deno** (kein separater Server nötig). Falls die aktuelle Plugin-Version dafür ein vorbereitetes Provider-Verzeichnis braucht, übernimmt `setup.ps1` das.
  - Fallback **HTTP-Modus**: App startet den Provider-Server als Kindprozess auf `127.0.0.1:<port>` und beendet ihn beim Schliessen.
  - Settings: Modus (Aus / Script / HTTP), Port, Token-TTL; Statusanzeige "PO-Token: aktiv/inaktiv/Fehler" + Testknopf.
  - Hinweis aus Praxisberichten: PO-Token und Browser-Cookies kombiniert können Probleme machen → Cookies standardmässig **aus**; Option "Cookies aus Browser" nur als Notlösung, mit Warnung.
- **Wartung:** Knopf "yt-dlp & Plugin aktualisieren" (`pip install -U yt-dlp bgutil-ytdlp-pot-provider` im venv) + Versionsanzeige. Beim Start optional auf Updates prüfen (max. 1×/Tag).
- Alle yt-dlp-Optionen werden an genau einer Stelle aus den Settings gebaut (`build_ydl_opts(settings, purpose)` mit `purpose ∈ {search, list, download}`).

## 7. Audio, Tags, Ablage

- Format: bestes Audio (`bestaudio`) → ffmpeg → **MP3**. Einstellbar: 320 kbps CBR (Default) / V0 VBR. Optional "Original behalten (Opus/M4A, keine Umwandlung)".
- Cover: Thumbnail in bester Auflösung, quadratisch zugeschnitten (Mitte), als APIC eingebettet; zusätzlich `cover.jpg` optional.
- ID3v2.4:
  - `TIT2` Titel (bereinigt: "Official", "[HQ]" etc. via Regex-Liste entfernbar)
  - `TPE1` / `TPE2` Artist / Albumartist = Kanalname (Option: Artist aus Titel parsen, Muster `ARTIST @ EVENT` / `ARTIST - TITLE`)
  - `TALB` = Titel, `TRCK` = 1, `TCON` = Genre, `TDRC` = Upload-Datum
  - `COMM` = YouTube-URL, `TXXX:YOUTUBE_ID`, `TXXX:SOURCE`
- Kapitel (falls vorhanden) bzw. Zeitstempel aus Beschreibung → `.cue`-Datei neben der MP3 und ID3 `CHAP`/`CTOC` (Option).
- **Ordnerstruktur** (Default, Muster in Settings änderbar mit Platzhaltern):
  ```
  <Zielordner>\<Genre>\<Artist>\<Jahr>\<JJJJ-MM-TT> - <Titel> [<id>].mp3
  ```
  Beispiel: `D:\Musik\HCLoader\Hardcore\Partyraiser\2026\2026-10-03 - Masters of Hardcore 2026 Liveset [abc123XYZ].mp3`
- Default-Zielordner: `%USERPROFILE%\Music\HCLoader`.
- Dateinamen: ungültige Zeichen ersetzen, Titel auf 120 Zeichen kürzen, Gesamtpfad < 240 Zeichen; Video-ID immer im Namen (eindeutig, Medienserver-freundlich).
- Temporäre Dateien in `<Zielordner>\.tmp`, erst nach erfolgreichem Taggen verschieben.

## 8. Genres (core/genre.py)

- Genre-Liste in Settings editierbar: Name, Farbe, Keywords, Priorität.
- Defaults (Reihenfolge = Priorität):
  1. **Uptempo** – `uptempo, up-tempo, terror, terrorcore, speedcore`
  2. **Hardcore** – `hardcore, gabber, gabba, frenchcore, industrial, early hardcore, millennium, mainstream hardcore`
  3. **Hardstyle** – `hardstyle, rawstyle, raw, euphoric, xtra raw, reverse bass`
  4. **Unsortiert** (Fallback)
- Reihenfolge der Ermittlung: manuell gesetzt > Standard-Genre der Quelle > erstes Keyword-Match nach Priorität > Unsortiert.

## 9. Datenmodell (SQLite)

```sql
videos(
  id TEXT PRIMARY KEY, title TEXT, channel_id TEXT, channel_name TEXT,
  duration INTEGER, upload_date TEXT, view_count INTEGER, thumbnail TEXT,
  genre TEXT, genre_manual INTEGER DEFAULT 0, source_id INTEGER,
  status TEXT CHECK(status IN ('new','inbox','queued','downloading','done','ignored','failed')),
  file_path TEXT, error TEXT, first_seen TEXT, downloaded_at TEXT
);
sources(id INTEGER PRIMARY KEY, type TEXT, name TEXT, url_or_query TEXT,
        default_genre TEXT, enabled INTEGER, auto_download INTEGER,
        max_entries INTEGER, last_checked TEXT);
channel_blacklist(channel_id TEXT PRIMARY KEY, channel_name TEXT, added TEXT);
runs(id INTEGER PRIMARY KEY, kind TEXT, started TEXT, finished TEXT,
     found INTEGER, downloaded INTEGER, errors INTEGER, note TEXT);
state(key TEXT PRIMARY KEY, value TEXT);   -- backoff_until, backoff_level, Zähler
schema_version(version INTEGER);
```

## 10. GUI

### 10.1 Aufbau
- Linke Seitenleiste (Navigation): Entdecken, Eingang (Badge), Watchlist, Downloads (Badge), Bibliothek, Protokoll, Einstellungen.
- Oben: Suchleiste + Genre-Chips. Rechts/links einklappbares Filter-Panel.
- Unten: Statusleiste (§3.6).
- Einstellungen als eigene Ansicht mit Tabs: Allgemein · Filter & Keywords · Genres · Download & Qualität · Ablage & Tags · Schonung · Netzwerk & PO-Token · Zeitplan · Darstellung · Wartung.
- Jede Einstellung: Label, kurze Hilfe, Default-Wert-Anzeige, "Zurücksetzen". Speichern validiert (pydantic) und zeigt Fehler am Feld.

### 10.2 Look & Feel – Hardcore-Szene
- **Dunkel, industriell, roh.** Fast schwarzer Hintergrund, harte Kanten, wenig Rundung (2–4 px), dünne Linien, Grossbuchstaben in Überschriften.
- Farben (CSS-Variablen in `theme.css`):
  - `--bg #08080a`, `--panel #111114`, `--panel-2 #18181d`, `--line #26262d`
  - `--text #ececf0`, `--muted #8a8a96`
  - `--accent #ff1f1f` (Hardcore-Rot), `--accent-glow rgba(255,31,31,.45)`
  - `--acid #b6ff00` (Erfolg / Fortschritt), `--warn #ffb000`, `--error #ff3b5c`
  - Genre: Hardstyle `#a43bff`, Hardcore `#ff1f1f`, Uptempo `#b6ff00`, Unsortiert `#6b6b78`
- Schrift: Überschriften **Bebas Neue** oder **Oswald**, Text **Inter**, Zahlen/Log **JetBrains Mono** – alle lokal eingebunden (OFL).
- Effekte (dezent, per Setting "Effekte reduzieren" abschaltbar, respektiert `prefers-reduced-motion`):
  - Neon-Glow auf aktivem Navigationspunkt, Primärbuttons, Fokus
  - feine Scanlines/Noise-Overlay über dem Hintergrund
  - Glitch-Effekt auf dem Logo / Seitentitel bei Hover
  - Fortschrittsbalken mit "Kick-Puls" im Takt (Default 200 BPM)
  - Karten-Hover: leichtes Anheben + roter Rand-Glow
- Logo: Wortmarke "HCLOADER" in kondensierter Schrift mit Rot-Akzent; kein fremdes Label-/Event-Logo verwenden.

## 11. Phasen & Akzeptanzkriterien

Empfohlenes Modell pro Phase (Details in `CLAUDE.md` → Modellwahl):

| Phase | Hauptagent (Modell) | Weitere |
|---|---|---|
| 1 – Gerüst & Kern-Download | `backend-dev` (Sonnet 5.5) | |
| 2 – GUI-Grundgerüst | `ui-designer` (Fable 5.2) | `backend-dev` für Settings-Modelle |
| 3 – Entdecken & Downloads | `integrator` (Opus 5.5) | `ui-designer`, `backend-dev` |
| 4 – Watchlist & Zeitplan | `backend-dev` (Sonnet 5.5) | `ui-designer` für Watchlist-Ansicht |
| 5 – Bibliothek, Protokoll, Feinschliff | `backend-dev` (Sonnet 5.5) | `ui-designer` (Fable 5.2) für Effekte final |

Jede Phase endet mit `qa-tester` (Sonnet 5.5) und `reviewer` (Opus 5.5).

Ausgangspunkt für Phase 2 ist der Prototyp `ui/index.html` (Layout, Farben, Effekte, Bridge-Muster übernehmen; in `theme.css`, `components.css`, `effects.css` und `js/` aufteilen; Fonts lokal einbinden).

**Phase 1 – Gerüst & Kern-Download**
- Projektstruktur, setup.ps1, Config laden/speichern, DB + Migration, Logging, `.gitignore`, CI-Workflow.
- CLI `--smoke <URL>`: lädt genau ein Video vollständig (für QA).
- `scripts/ui_screenshots.py`: öffnet `ui/index.html` per Playwright im Mock-Modus und speichert Screenshots aller Ansichten (Dev-Abhängigkeit).
- `ytclient.download(url)` mit Deno + PO-Token (Script-Modus) → MP3 320 mit Tags + Cover in Ordnerstruktur.
- ✅ Eine Mix-URL per CLI-Testbefehl landet korrekt getaggt am richtigen Ort; zweiter Aufruf lädt nicht erneut; Tests für paths/filters/genre grün.

**Phase 2 – GUI-Grundgerüst**
- pywebview-Fenster, Theme, Navigation, Statusleiste, Einstellungen (alle Tabs, speichern/validieren).
- ✅ Alle Settings aus §4–§8 in der GUI änderbar und nach Neustart erhalten; Statusleiste zeigt echte Versionen/Status.

**Phase 3 – Entdecken & Downloads**
- Suche, Ergebniskarten, Filter-Panel, Aktionen, Warteschlange mit Live-Fortschritt.
- ✅ Suche → filtern → mehrere auswählen → sequenziell laden mit Fortschritt; Throttle-Limits sichtbar wirksam.

**Phase 4 – Watchlist & Zeitplan**
- Quellen verwalten, Eingang, Auto-Download, Intervall in der App, Aufgabenplanung anlegen/entfernen, Headless-Modus.
- ✅ Headless-Lauf prüft Quellen inkrementell, lädt max. N, schreibt Run-Eintrag; Backoff greift bei simuliertem 429.

**Phase 5 – Bibliothek, Protokoll, Feinschliff**
- Bibliothek, Log-Ansicht, CUE/Kapitel, Wartung (Update-Knopf, DB-Backup), Effekte final.
- ✅ Kapitel-Mix erzeugt gültige .cue; Update-Knopf aktualisiert yt-dlp im venv.

**Optional später:** Tray-Icon, Discord-Webhook bei neuen Mixes, Medienserver-Rescan per API, Artist-Parsing verbessern.
