# CLAUDE.md – HCLoader

Windows-Desktop-App zum Finden, Filtern und lokalen Speichern von Hardstyle-, Hardcore- und Uptempo-Mixes von YouTube als MP3. Privater Eigengebrauch. Die vollständigen Anforderungen stehen in `SPEC.md` – vor jeder Phase lesen.

## Oberste Prinzipien

1. **YouTube schonen.** Jeder Netzwerkzugriff läuft über den zentralen `Throttle` (siehe SPEC §5). Keine Parallel-Downloads, keine Retry-Schleifen, bei 429/Bot-Check sofort Backoff. Neue Features dürfen diese Regeln nie umgehen.
2. **Billig vor teuer.** Erst Metadaten flach abfragen (`extract_flat`), filtern, dann erst einzelne Videos voll auflösen und laden.
3. **Nie doppelt.** SQLite-Status + yt-dlp `download_archive` sind die Wahrheit.
4. **Alles Relevante ist in der GUI konfigurierbar.** Kein Wert, den der User ändern will, darf nur im Code stehen.

## Stack

- **Python 3.12+**, lauffähig in lokalem `venv` (kein PyInstaller-Freeze als Hauptweg, damit yt-dlp per Knopfdruck aktualisierbar bleibt).
- **GUI:** `pywebview` (Edge WebView2) + Frontend in **Vanilla HTML/CSS/JS** unter `ui/` – kein Build-Step, kein Node für die UI.
- **Download:** `yt-dlp` als Python-Library (`yt_dlp.YoutubeDL`), **nicht** per Subprocess-CLI.
- **JS-Runtime:** `deno.exe` (Pflicht für YouTube-JS-Challenges), lokal unter `bin/`.
- **PO-Token:** `bgutil-ytdlp-pot-provider` (yt-dlp-Plugin) – Modus siehe SPEC §6.
- **Audio:** `ffmpeg.exe` / `ffprobe.exe` unter `bin/`.
- **Tags:** `mutagen` (ID3v2.4).
- **Config:** `pydantic` v2 Modelle ↔ YAML (`ruamel.yaml` für Kommentare erhalten).
- **DB:** `sqlite3` (Standardlib), einfache versionierte Migrationen.
- **Tests:** `pytest`. Netzwerk wird in Tests immer gemockt.
- **Lint/Format:** `ruff` (lint + format).

## Projektstruktur

```
HCLoader/
  app/
    main.py          # Einstieg: Single-Instance, Config laden, pywebview starten; CLI: --headless --run-watchlist
    api.py           # js_api-Bridge – dünn, nur Delegation an core/
    worker.py        # Download-Queue (1 Thread, sequenziell), Events an UI
    core/
      config.py      # Settings-Modelle, Laden/Speichern/Defaults
      db.py          # Schema, Migrationen, Queries
      ytclient.py    # einziger Ort, der yt-dlp anfasst (search, list_source, resolve, download)
      throttle.py    # Rate-Limits, Sleep, Backoff-State (persistiert)
      filters.py     # reine Funktionen: Dauer, Keywords, Status
      genre.py       # Genre-Erkennung aus Keywords / Quelle
      paths.py       # Ordnerstruktur, Dateinamen säubern, Windows-Pfadlängen
      tagging.py     # ID3, Cover, CUE aus Kapiteln
      binaries.py    # Pfade/Versionen von deno, ffmpeg, Plugin prüfen
  ui/
    index.html
    css/ (theme.css, components.css, effects.css)
    js/  (app.js, views/*.js, bridge.js)
    fonts/  (lokal eingebunden, OFL-Lizenz)
  bin/               # deno.exe, ffmpeg.exe, ffprobe.exe – NICHT im Git
  scripts/
    setup.ps1        # venv anlegen, pip install, Binaries holen, Desktop-Verknüpfung (pythonw)
    fetch_binaries.ps1
  tests/
  SPEC.md
  CLAUDE.md
```

## Konventionen

- Code, Bezeichner, Commits: Englisch. UI-Texte und Logs für den User: **Deutsch (Schweiz, "ss" statt "ß")**.
- UI-Strings zentral in `ui/js/i18n.js` (nur `de-CH`, aber nicht hart im Markup verstreut).
- `core/` kennt die GUI nicht. `api.py` kennt yt-dlp nicht. Nur `ytclient.py` importiert `yt_dlp`.
- Lange Operationen nie im pywebview-Callback-Thread – immer über `worker.py`; Fortschritt per Event-Push (`window.evaluate_js`) an das Frontend.
- Pfade immer `pathlib.Path`. User-Daten unter `%APPDATA%\HCLoader\` (config.yaml, hcloader.db, archive.txt, logs\).
- Logging: `logging` mit RotatingFileHandler, zusätzlich Live-Log-Stream an die UI.
- Keine Secrets/Cookies im Repo oder Log.

## Befehle

```powershell
.\scripts\setup.ps1                 # Erstinstallation
.\.venv\Scripts\python -m app.main  # Start mit GUI
.\.venv\Scripts\python -m app.main --headless --run-watchlist   # für Windows-Aufgabenplanung
.\.venv\Scripts\python -m app.main --smoke <URL>          # ein echter Download als Smoke-Test (nur QA)
.\.venv\Scripts\python scripts\ui_screenshots.py           # Screenshots aller Ansichten im Mock-Modus → docs/screenshots/
.\.venv\Scripts\pytest
.\.venv\Scripts\ruff check . ; .\.venv\Scripts\ruff format .
```

## Git & GitHub

- GitHub-Repo **`HCLoader`** existiert bereits (privat empfohlen), Default-Branch `main`. Lokaler Ordner = Clone dieses Repos. Arbeit auf Phasen-Branches (`phase-<n>-<name>`), Merge per Pull Request (Squash) nach grüner CI.
- Commits im Stil Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`), klein und thematisch.
- **Nie committen:** `bin/` (deno, ffmpeg), `.venv/`, `__pycache__/`, `*.mp3`/`*.opus`/`*.m4a`, `*.db`, `config.yaml` mit User-Werten, Cookies, Logs. `.gitignore` gleich in Phase 1 anlegen.
- Mitgeliefert wird `config.example.yaml` mit allen Defaults und Kommentaren.
- `README.md`: Zweck, Installation (`setup.ps1`), Start, Screenshots, Hinweis privater Eigengebrauch.
- GitHub Actions (`.github/workflows/ci.yml`): auf `windows-latest` `ruff check` + `pytest` bei Push und PR.
- Versionierung mit Tags `v0.x.y` pro abgeschlossener Phase; Änderungen in `CHANGELOG.md`.

## Modellwahl & Agenten

Der Bau läuft vollautomatisch über den Orchestrator (`/build-all`) und Subagents in `.claude/agents/`. Jeder Agent hat sein Modell fest im Frontmatter.

| Rolle | Agent | Modell | Einsatz |
|---|---|---|---|
| Orchestrator | Hauptsession | **Opus 5.5** | Planen, delegieren, Ergebnisse prüfen, Git/PR/Merge/Tag, `PROGRESS.md` |
| Backend | `backend-dev` | **Sonnet 5.5** | Config, DB, yt-dlp-Wrapper, Throttle, Filter, Tagging, Watchlist, Zeitplan, Tests, CI |
| UI | `ui-designer` | **Fable 5.2** | Layout, Theme, Effekte, Animationen, visuelle Prüfung per Screenshots |
| Integration | `integrator` | **Opus 5.5** | `api.py`, Events, End-to-End-Fluss, schwierige Bugs, Architekturentscheide |
| QA | `qa-tester` | **Sonnet 5.5** | Akzeptanzkriterien prüfen, Tests, Smoke-Test, Screenshots – ändert keinen Code |
| Review | `reviewer` | **Opus 5.5** | Unabhängiges Review vor dem Merge – ändert keinen Code |

Schwerpunkt pro Phase: 1 Backend · 2 UI · 3 Integration · 4 Backend · 5 Backend + UI-Feinschliff.

- Faustregel: Sieht man es oder muss es sich gut anfühlen → Fable. Muss es korrekt zusammenspielen → Opus. Ist es klar spezifiziert und repetitiv → Sonnet.
- Fable verbraucht mehr Kontingent pro Anfrage; nur für UI-Arbeit einsetzen.
- Eskalation: Scheitert ein Agent dreimal an derselben QA-Rückmeldung, übernimmt eine Stufe höher (`backend-dev` → `integrator`).
- QA und Review sind immer andere Agenten als die, die den Code geschrieben haben.

## Automatisierter Ablauf

- Start: `claude --model opus` im Repo, dann `/build-all` (alle Phasen) oder `/build-phase <n>` (eine Phase). Unbeaufsichtigt: `claude --model opus -p "/build-all"`.
- Ablauf pro Phase: Branch → Plan → Agenten → Zwischencommits → QA → Review → PR → CI grün → Squash-Merge → Tag `v0.<n>.0`.
- Zustand steht in `PROGRESS.md`; ein abgebrochener Lauf setzt dort fort.
- Berechtigungen sind in `.claude/settings.json` vorab freigegeben (Python, pip, pytest, ruff, git, gh). Force-Push, Push direkt auf `main` und `reset --hard` sind gesperrt.
- Echter YouTube-Zugriff während des Baus nur über den QA-Smoke-Test mit `MV_SMOKE_URL`, einmal pro Phase.
- Der Orchestrator stoppt nur bei echten Blockaden (fehlende Anmeldung, fehlende `MV_SMOKE_URL`, dreimal rote QA nach Eskalation) und trägt sie in `PROGRESS.md` ein.
- Vor dem Einbau von yt-dlp-, Deno- oder bgutil-Optionen die **aktuelle** Doku prüfen – YouTube ändert sich laufend.
