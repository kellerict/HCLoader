# App updates

There are two kinds of updates.

## yt-dlp and the PO-token plugin

YouTube changes often, so these two matter most. In Settings, Wartung (maintenance), use the update
button (`pip install -U` in the venv or in the portable build's embedded Python). A restart is needed
afterwards. Until then search and downloads are blocked and the queue is kept. If something suddenly
fails, update first.

At start (setting *check_updates_on_start*, at most once per day) the app asks PyPI whether newer
versions exist. This is not a request to YouTube.

## The app itself

HCLoader checks GitHub releases at start for a newer version (setting
*check_app_updates_on_start*; the repository is *update_repo*). If one exists, it can download it
in the background and apply it when you restart the app (setting *apply_update_on_exit* controls
whether it is applied automatically when you close the app). Your data folder is left untouched, and the
database is backed up before any migration. The app version is shown in Settings, Wartung.

Details on releases and the update flow are described for maintainers in
[RELEASING.md](https://github.com/kellerict/HCLoader/blob/main/docs/RELEASING.md). Until a release
is published, update manually:

- **Portable build**: extract the new ZIP to a new folder and copy your old `data\` folder into it
  (or point the new folder at the old data with `HCLOADER_HOME`).
- **venv install**: `git pull`, then `.\scripts\setup.ps1` again.

Back up `data\` (or `%APPDATA%\HCLoader`) before manual updates if you care about your database.
