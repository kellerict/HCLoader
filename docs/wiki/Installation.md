# Installation

There are two ways to run HCLoader. Both give you the same app.

| | Portable build | venv install |
|---|---|---|
| Needs Python | no (embedded) | yes, 3.12 or newer |
| Needs git | no | optional |
| Can be moved (USB stick, other drive) | yes | no |
| Data location | `HCLoader\data\` | `%APPDATA%\HCLoader\` |
| yt-dlp update button | updates the embedded Python | updates the venv |
| Best for | most users | developers, tinkerers |

## Requirements

- Windows 10 or 11, x64
- **Microsoft Edge WebView2 Runtime**: preinstalled on Windows 11 and most up-to-date Windows 10.
  If the window stays blank or an error mentions WebView2, install the Evergreen runtime from
  Microsoft.
- Internet access
- venv install only: Python 3.12+ (`py -3.12` or `python` on PATH); git is optional

You do not need to install Deno, ffmpeg or the PO-token provider yourself. They are bundled in the
portable build and fetched by `setup.ps1` into `bin\`.

## Option A: portable build

See [Portable build](Portable-Build) for the full guide. In short:

1. Obtain `HCLoader-portable-<version>-win64.zip` (a release download, or build it with
   `scripts\build_portable.ps1`).
2. Right-click the ZIP, Properties, **Unblock**, OK.
3. Extract to a short path such as `C:\Tools\`.
4. Run `HCLoader\HCLoader.cmd`.

## Option B: venv install

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

Delete the folder (and the desktop shortcut). To remove your settings and database as well, delete
the data folder (see [Settings reference](Settings-Reference#where-settings-live)). Your downloaded
music is in the target folder you configured and is not touched. If you created a scheduled task,
remove it first in Settings, Zeitplan (schedule).
