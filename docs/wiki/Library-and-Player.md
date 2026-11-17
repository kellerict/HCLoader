# Library and player

**Bibliothek** (Library) lists everything you have downloaded, from the database.

## Browsing

- Switch between **list** and **grid** view; optionally group by genre (**Nach Genre**).
- Summary tiles: number of mixes, total duration, size, mixes per genre.
- Search by title, channel or path; filter by genre, channel and year; sort (default newest first).
- Entries whose file is missing on disk are flagged ("Datei fehlt"); a banner appears when the
  target folder cannot be reached.
- A **CUE** badge marks entries with a CUE file.

## Actions

| Action | What it does |
|---|---|
| Play | See below. |
| Open folder | Opens Explorer with the file selected. |
| Re-tag | Rewrites tags, cover and chapters without any network access, and moves the file to the location the current path template produces. Foreign ID3 frames (BPM, key, rating, ReplayGain, lyrics) are kept. |
| Change genre | Sets the genre manually; it is kept over automatic detection. |
| Delete | Removes the entry and the file (and `.cue`), with confirmation (setting *confirm_delete*). Only files inside the target folder are deleted; for others there is "remove entry only". |

## Player

The setting *Abspielen mit* (`player.mode`, Settings, Allgemein) chooses what play does:

- **Built-in mini player** (default, **in development**): a bar above the status bar that keeps
  playing when you switch views. Cover, title, play/pause, seek, volume and time. Chapters from the
  sidecar, ID3 or CUE appear as markers on the timeline and as an expandable track list. It only
  plays local files, no network.
- **Windows default player**: opens the file with your system's default audio app.

The other variant is always available per entry in the menu.

## Tip for media servers

Point Plex or Jellyfin at the target folder (type: Music). The default folder layout and the tags
are designed for it; see [File naming and tags](File-Naming-and-Tags).
