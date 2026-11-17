![](images/divider.svg)

There are two kinds of updates.

## yt-dlp and the PO-token plugin

YouTube changes often, so these two matter most. In Settings, Wartung (maintenance), use the update
button (`pip install -U` in the venv or in the embedded Python of the installer / portable build). A restart is needed
afterwards. Until then search and downloads are blocked and the queue is kept. If something suddenly
fails, update first.

At start (setting *check_updates_on_start*, at most once per day) the app asks PyPI whether newer
versions exist. This is not a request to YouTube.

## The app itself

HCLoader checks GitHub releases at start for a newer version (setting
*check_app_updates_on_start*; the repository is *update_repo*). If one exists, it can download it
in the background and apply it when you restart the app (setting *apply_update_on_exit* controls
whether it is applied automatically when you close the app). This works the same for the installer,
the portable build and ZIP-based venv installs. Your data folder is left untouched, and the
database is backed up before any migration. The app version is shown in Settings, Wartung.

Details on releases and the update flow are described for maintainers in
[RELEASING.md](https://github.com/kellerict/HCLoader/blob/main/docs/RELEASING.md). Until a release
is published, update manually:

- **Installer**: run the newer `HCLoader-Setup-<version>.exe`; it installs over the old version and
  keeps `%APPDATA%\HCLoader`.
- **Portable build**: extract the new ZIP to a new folder and copy your old `data\` folder into it
  (or point the new folder at the old data with `HCLOADER_HOME`).
- **venv install**: `git pull`, then `.\scripts\setup.ps1` again.

> 💾 **Backup first** – Back up `data\` (or `%APPDATA%\HCLoader`) before manual updates if you care about your database.

---

[← Getting started](Getting-Started) · [🏠 Home](Home) · [Discover and search →](Discover-and-Search)
