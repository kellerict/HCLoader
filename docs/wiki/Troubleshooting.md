![](images/divider.svg)

First look at the **status bar** («System OK», yt-dlp version; a click on *System* shows Deno,
ffmpeg, PO token and backoff – with a problem they appear in the bar by themselves) and at the
**Protokoll** (Log) view. The log file is:

- portable build: `HCLoader\data\logs\hcloader.log`
- venv install: `%APPDATA%\HCLoader\logs\hcloader.log`

> 🔒 **Before you share a log** – Set `log_level` to DEBUG (Settings, Allgemein) only while investigating. Cookies and secrets are
> never written to the log, but **check a log before posting it** and remove personal paths.

## The window is blank, or an error mentions WebView2

HCLoader uses the Microsoft Edge **WebView2 Runtime**. It is preinstalled on Windows 11 and most
up-to-date Windows 10. If it is missing, pywebview would fall back to an old engine (MSHTML) on
which the UI does not work, so HCLoader stops at start with a message and offers to open
[Microsoft's download page](https://developer.microsoft.com/microsoft-edge/webview2/consumer/).
Install the Evergreen WebView2 Runtime there and start again.

- The **installer** installs the runtime itself if it is missing. If that failed (no internet during
  the installation), install it from the page above; the setup log
  (`%TEMP%\Setup Log *.txt`) has a line starting with `WebView2`.
- HCLoader detects the runtime through the registry keys Microsoft documents. If you use a
  runtime it cannot see there (e.g. a Fixed Version runtime), set the environment variable
  `HCLOADER_SKIP_WEBVIEW2_CHECK=1` to skip the check.

## Portable build: `HCLoader.vbs` does nothing

Recent Windows 11 builds may have VBScript disabled. Use `HCLoader.cmd` (the normal launcher, which
does not need VBScript). For visible output use `HCLoader-Konsole.cmd`.

## Portable build: errors while extracting or "path too long" (MAX_PATH)

Windows Explorer and many tools fail on paths longer than 260 characters, and the bundled
`node_modules` are deeply nested. Extract to a short path such as `C:\Tools\` and build to a short
path such as `C:\hcl`. Unblock the ZIP (Properties, Unblock) before extracting.

Library paths can hit the same limit. The path is limited by `max_path_length` (default 240); use a
shorter target folder or path template if a download fails with "path too long".

## Building the portable ZIP: `Expand-Archive` / module errors from a PowerShell 7 console

If you start `build_portable.ps1` (or `setup.ps1`) with Windows PowerShell 5.1 from inside a
PowerShell 7 console, the inherited `PSModulePath` lists the PowerShell 7 module folders and 5.1
fails to load modules such as `Microsoft.PowerShell.Archive` (`Expand-Archive`). The scripts now
clean the module path themselves, so update to the current version. If you still see it, start the
script from a plain Windows PowerShell 5.1 window:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build_portable.ps1 -OutDir C:\hcl -Zip
```

## Blank images or `ERR_FILE_NOT_FOUND` for covers/player

Earlier builds could fail to load local files (covers, audio) when the path contained characters
such as `?`, `#`, `%`, spaces or brackets, because `file:` URLs treat some of them as query or
fragment. This is fixed: the app percent-encodes these characters. If you still see
`ERR_FILE_NOT_FOUND`, update the app and re-check that the file exists (a "Datei fehlt" flag in the
library means it was moved or deleted outside HCLoader).

## Status bar: Deno or ffmpeg shows "fehlt" (missing)

The binaries are expected in `bin\` (portable: inside the app folder). Run `.\scripts\setup.ps1`
(venv install) or `.\scripts\fetch_binaries.ps1` again; use `-Force` to re-download. Antivirus
software sometimes quarantines downloaded executables; check its quarantine list.

## PO token shows "inaktiv" or "Fehler"

- Script mode needs `deno.exe` and the provider folder `bin\bgutil-pot-provider\`. Run
  `fetch_binaries.ps1` again if either is missing.
- Use the **test button** in Settings, Netzwerk & PO-Token. It runs the provider once and reports
  the result.
- If script mode keeps failing, try mode **HTTP**: the app starts a local server on
  `127.0.0.1:<port>` (default 4416). If the port is taken, change `po_token_port`.
- Do not enable browser cookies as a workaround unless nothing else works: cookies combined with PO
  tokens can cause problems.

Without a working PO token, downloads are more likely to fail with 403 or bot checks.

## HTTP 429, "confirm you're not a bot", or a backoff is active

This is YouTube telling HCLoader to slow down. A backoff blocks search, watchlist and downloads
(6 h by default, doubling up to 48 h). Waiting is the best fix. Then: update yt-dlp and the plugin
(Settings, Wartung), check the PO token, and keep the default limits. Lifting the backoff manually
is possible but makes a longer block more likely. See [Throttling and backoff](Throttling-and-Backoff).

## A download fails with HTTP 403 or "video unavailable"

Members-only, age-restricted, region-locked or removed videos cannot be downloaded without
credentials. Failed items show the reason in the Downloads view. 403 is never retried
automatically. After a YouTube change, an old yt-dlp is the most common cause: update it.

## "Unsortiert" genre: mixes land in the wrong folder

Genres are assigned by keywords in the **title**. A title like "Dominator 2026 Official Aftermovie"
has no default keyword and ends up in `Unsortiert`. Open Settings, Genres, add a keyword such as
`dominator` to the right genre (for example Hardcore or Hardstyle), save, then use **Re-tag** in
the Library to move already downloaded files. For a single mix, set the genre manually; a manual
genre always wins. A source's default genre also applies to everything it finds.

## Too few or too many results

Check the filters: minimum duration (default 10 minutes), the include list (a title needs at least
one include keyword) and the exclude list. The header shows how many hits were filtered out. Flat
searches only give approximate upload dates, which matters for year filters.

## The app says another instance is running, or a headless run exits with code 4

A second start just brings the existing window to the front. Exit code 4 means another run holds the
run or watchlist lock, for example the app is downloading. See [Scheduled checks](Scheduled-Checks).

## Scheduled task points to the wrong place

After moving the portable folder, Settings, Zeitplan shows that the app was moved. Click to
re-create the task.

## An app update was interrupted (power loss, Windows shut down)

The updater keeps a journal (`data\update\in_progress.json`, venv install:
`%APPDATA%\HCLoader\update\in_progress.json`). On the next start HCLoader restores the previous version
from the `_previous` folder in the app folder and starts again by itself. If that fails, close HCLoader,
delete `app`, `ui` and `scripts` in the app folder and move the folders from `_previous` (or the newest
`_previous-<timestamp>`) back; then delete `in_progress.json`. Log: `logs\update.log`.

## Still stuck?

Open an [issue](https://github.com/kellerict/HCLoader/issues/new/choose) with the app version
(Settings, Wartung), install type, Windows version, steps and the relevant log lines. Never post
cookies or tokens.

---

[← Throttling and backoff](Throttling-and-Backoff) · [🏠 Home](Home) · [FAQ →](FAQ)
