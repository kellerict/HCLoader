# Installation

There are three ways to run HCLoader. All give you the same app.

| | Installer (recommended) | Portable build | venv install |
|---|---|---|---|
| Download | `HCLoader-Setup-<version>.exe` | `HCLoader-portable-<version>-win64.zip` | source (git / ZIP) |
| Needs Python | no (embedded) | no (embedded) | yes, 3.12 or newer |
| Needs admin rights | no (per user) | no | no |
| Start menu entry, uninstaller | yes | no | no (desktop shortcut) |
| Can be moved (USB stick, other drive) | no | yes | no |
| Program folder | `%LOCALAPPDATA%\Programs\HCLoader\` | where you extract it | the clone |
| Data location | `%APPDATA%\HCLoader\` | `HCLoader\data\` | `%APPDATA%\HCLoader\` |
| App self-update, yt-dlp update button | yes (embedded Python) | yes (embedded Python) | yes (venv) |
| Best for | most users | USB stick, no install | developers, tinkerers |

## Requirements

- Windows 10 or 11, x64
- **Microsoft Edge WebView2 Runtime**: preinstalled on Windows 11 and most up-to-date Windows 10.
  If the window stays blank or an error mentions WebView2, install the Evergreen runtime from
  Microsoft.
- Internet access
- venv install only: Python 3.12+ (`py -3.12` or `python` on PATH); git is optional

You do not need to install Deno, ffmpeg or the PO-token provider yourself. They are bundled in the
installer and the portable build and fetched by `setup.ps1` into `bin\`.

## Option A: installer (recommended)

1. Download `HCLoader-Setup-<version>.exe` from the
   [latest release](https://github.com/kellerict/HCLoader/releases/latest). `SHA256SUMS` in the same
   release lists its checksum (`Get-FileHash .\HCLoader-Setup-<version>.exe`).
2. Run it. The installer is **not code-signed**, so Windows SmartScreen may show
   "Windows protected your PC" ("Der Computer wurde durch Windows geschützt"). Click
   **More info** ("Weitere Informationen"), then **Run anyway** ("Trotzdem ausführen").
3. Choose the language, keep the default folder `%LOCALAPPDATA%\Programs\HCLoader` (no admin rights,
   no UAC prompt), optionally tick "Create a desktop shortcut", and finish. "Launch HCLoader" starts the
   app right away.

Afterwards HCLoader is in the Start menu. Settings, database, download archive and logs live in
`%APPDATA%\HCLoader\` - the same place as a venv install, so switching from a venv install keeps
your data. Your music goes to the target folder you configure.

- **Updates:** the app updates itself like the portable build (Settings › Wartung › App-Update); the
  program folder is replaced, the data folder is never touched. Installing a newer
  `HCLoader-Setup-*.exe` over an existing installation also works: it closes a running HCLoader,
  replaces the program files and keeps your data. Note that "Apps & features" keeps showing the
  version of the last *installer* run after a self-update.
- **Folder rules:** the installer refuses a folder that already holds other files or a portable copy
  (`portable.txt` / `data\`), and folders so long that the deepest bundled file would exceed the
  Windows path limit of 260 characters. Keep the default unless you have a reason.
- **Silent install** (e.g. for scripts):
  `HCLoader-Setup-<version>.exe /VERYSILENT /SUPPRESSMSGBOXES /NORESTART [/DIR="C:\Tools\HCLoader"]`.
  Add `/TASKS="desktopicon"` for the desktop shortcut.

## Option B: portable build

See [Portable build](Portable-Build) for the full guide. In short:

1. Obtain `HCLoader-portable-<version>-win64.zip` (a release download, or build it with
   `scripts\build_portable.ps1`).
2. Right-click the ZIP, Properties, **Unblock**, OK.
3. Extract to a short path such as `C:\Tools\`.
4. Run `HCLoader\HCLoader.cmd`.

## Option C: venv install

```powershell
git clone https://github.com/kellerict/HCLoader.git
cd HCLoader
.\scripts\setup.ps1
```

(Without git, download the repository as a ZIP from GitHub and extract it.)

`setup.ps1`:

- creates `.venv` (it picks Python 3.13, then 3.12, then the newest installed 3.x that is at least 3.12),
- installs `requirements.txt` (yt-dlp, the bgutil PO-token plugin, mutagen, pydantic, ruamel.yaml, pywebview),
- downloads `deno.exe`, `ffmpeg.exe`, `ffprobe.exe` and the PO-token provider into `bin\`,
- creates a desktop shortcut that starts `pythonw.exe -m app.main`.

It is idempotent: run it again to repair or update. Switches:

| Switch | Effect |
|---|---|
| `-Force` | Re-create packages, binaries and the shortcut |
| `-SkipBinaries` | Do not download Deno, ffmpeg, ffprobe, provider |
| `-NoShortcut` | Do not create the desktop shortcut |
| `-Dev` | Also install `requirements-dev.txt` (pytest, ruff, playwright) |

You can fetch only the binaries with `.\scripts\fetch_binaries.ps1`.

If you start `setup.ps1` from a PowerShell 7 console, it works around the module path problem of
Windows PowerShell 5.1 itself (see [Troubleshooting](Troubleshooting)). If script execution is
blocked: `powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1`.

## Starting

```powershell
.\.venv\Scripts\python -m app.main                              # GUI
.\.venv\Scripts\python -m app.main --headless --run-watchlist   # for the Task Scheduler
.\.venv\Scripts\python -m app.main --smoke <URL>                # one real download, QA only
```

A second start brings the existing window to the front (single instance).

## Uninstall

**Installer:** Windows Settings › Apps › Installed apps › HCLoader › Uninstall (or "HCLoader" in
"Programs and Features"). The uninstaller closes HCLoader, deletes the scheduled watchlist task if it
belongs to this installation, and removes the whole program folder, including files created later
(update backups `_previous*`, Python caches, packages updated by the yt-dlp button). It **never**
touches `%APPDATA%\HCLoader\` (settings, database, archive, logs) or your music folder; delete those
yourself if you want a completely clean system. Silent: `"%LOCALAPPDATA%\Programs\HCLoader\unins000.exe" /VERYSILENT`.

**Portable / venv:** delete the folder (and the desktop shortcut). To remove your settings and database as well, delete
the data folder (see [Settings reference](Settings-Reference#where-settings-live)). Your downloaded
music is in the target folder you configured and is not touched. If you created a scheduled task,
remove it first in Settings, Zeitplan (schedule).
