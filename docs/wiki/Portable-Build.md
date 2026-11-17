![](images/divider.svg)

The portable build is a folder that runs without an installed Python and without git. It contains
an embedded Python 3.12 (Windows embeddable package, amd64) with all dependencies, the app, and
`bin\` with Deno, ffmpeg, ffprobe and the PO-token provider. You can move the folder, for example to
a USB stick or another drive.

## Getting it

- **Download** `HCLoader-portable-<version>-win64.zip` from the repository's GitHub releases
  (once published) or from a build artifact of the "Portable" workflow. GitHub wraps workflow
  artifacts in an extra ZIP, so the file you download then contains the actual ZIP.
- **Build it yourself** (below).

## Extracting

1. Right-click the ZIP, **Properties**, tick **Unblock**, OK. Otherwise Windows marks every
   extracted file as "downloaded from the internet". HCLoader removes that mark from its .NET DLLs
   at start, but unblocking first is the safe way.
2. Extract to a **short path**, for example `C:\Tools\` or `E:\`. Windows Explorer fails on paths
   over 260 characters, and the bundled `node_modules` are nested deeply (MAX_PATH).

## Starting

| File | Purpose |
|---|---|
| `HCLoader.cmd` | The normal launcher. Relative paths, no lingering console window, works after moving the folder. |
| `HCLoader.vbs` | Variant without any console flash. Needs VBScript, which may be removed on recent Windows 11. |
| `HCLoader-Konsole.cmd` | Starts with a visible console for troubleshooting. Extra arguments are passed through, for example `--headless --run-watchlist`. |
| `Verknuepfung-erstellen.cmd` | Creates the desktop shortcut "HCLoader (Portable)" pointing to the current location. |

## Where your data lives

As long as `portable.txt` is in the app folder, settings, database, archive, logs and backups are in
`HCLoader\data\`. Delete `portable.txt` to use `%APPDATA%\HCLoader` instead (`data\` stays
untouched). The environment variable `HCLOADER_HOME` takes precedence over both.

The default target folder stays `%USERPROFILE%\Music\HCLoader`. A relative path such as `.\Music` is
resolved relative to the app folder in the portable build, so your music can move with the stick.

## Moving the folder

Move the whole folder. Then run `Verknuepfung-erstellen.cmd` again if you use the shortcut. If you
set up a scheduled task, it still points to the old location: the app reports "app was moved,
re-create the task" in Settings, Zeitplan (schedule), and one click re-creates it.

## Updating

- yt-dlp and the plugin: Settings, Wartung (maintenance), update button. It runs `pip` in the
  embedded Python. Pip is not officially supported in the embeddable distribution, but the build is
  tested for it.
- The app: see [App updates](App-Updates).

## Building it yourself

Requirements: Windows, Windows PowerShell 5.1, internet. No Python, no admin rights.

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build_portable.ps1 -OutDir C:\hcl -Zip
```

The result is `C:\hcl\HCLoader\` and `C:\hcl\HCLoader-portable-<version>-win64.zip`. Use a **short
output path** such as `C:\hcl` because of MAX_PATH. Running the script from a PowerShell 7 console is
fine: the script starts cleanly under Windows PowerShell 5.1 and fixes the module path itself.

| Parameter | Meaning |
|---|---|
| `-PythonVersion` | `3.12` (default) = newest 3.12.x with a Windows embeddable package, or exact such as `3.12.10` |
| `-PythonSha256` | Expected SHA256 of the embeddable ZIP (otherwise it is only printed) |
| `-OutDir` | Output folder (default `<repo>\dist`) |
| `-Zip` | Also create the ZIP |
| `-Force` | Replace an existing build even if it already contains user data (`data\`) |

The build needs python.org, bootstrap.pypa.io, PyPI, GitHub and gyan.dev.

## Licenses

The ZIP contains `THIRD_PARTY_LICENSES.txt` and a `licenses\` folder. Note that the bundled ffmpeg
build is GPL-3.0-or-later.

---

[← Installation](Installation) · [🏠 Home](Home) · [Getting started →](Getting-Started)
