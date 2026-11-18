![](images/divider.svg)

![Library grid with the built-in player](images/screenshot-library.jpg)

**Bibliothek** (Library) lists everything you have downloaded, from the database.

## Browsing

- Switch between **list** and **grid** view.
- **Group by**: none, genre, festival, artist (channel) or year. The choice is remembered.
- Summary tiles: number of mixes, total duration, size, mixes per genre.
- Search by title, channel, path or festival; filter by genre, channel and year; sort (default newest first).
- Entries whose file is missing on disk are flagged ("Datei fehlt"); a banner appears when the
  target folder cannot be reached.
- A **CUE** badge marks entries with a CUE file.

## Festivals and series (v0.3.0)

Many mixes are sets from a festival edition (*Defqon.1 2024 | RED | Closing Ceremony*) or episodes
of a radio show or podcast. HCLoader recognizes this offline from the stored title, channel and
description, without any extra request.

- **Group by → Festival** shows one tile per series with its kind (festival, radio show, podcast),
  the number of sets and the range of years. Entries without a festival are collected in
  **Other / unassigned**.
- Click a tile to open the series: the editions appear as a compact **year timeline** (variants such
  as *at Home* are separate editions), below it the sets of the selected edition **grouped by
  stage**. **All** lists every edition. Play, open folder and the menu work as everywhere else, and
  search and filters stay active.
- Every entry carries a **festival badge** with edition and stage (coloured dot for stages named
  after a colour). Click it to set the series (type to search), year, variant, stage and set type,
  choose **No festival**, or **Reset to automatic**. Entries without a badge show a small **+** when
  you hover the row; the menu has the same form. Values you set by hand are marked with a dot and
  are never overwritten by the detection.
- After a change the file is **retagged immediately** (festival, year, stage and set-type tags, album
  = edition) and moved if your path template uses `{festival}`, `{event_year}` or `{stage}`. If the
  file is missing only the entry is updated.
- Detections below the threshold are shown as **dashed suggestions** with a question mark; the check
  mark accepts them.

To gather **all sets of one edition** with a checklist (timetable, missing sets, download), use the
[Festival collector](Festival-Collector): button **Collector** in the header, or **Collect this
edition** next to the selected year.

The list of series, the threshold and the one-off pass over an existing library («Assign festivals
now») are in Settings, tab *Festivals & series*; see [Settings reference](Settings-Reference).

## Actions

| Action | What it does |
|---|---|
| Play | See below. |
| Open folder | Opens Explorer with the file selected. |
| Re-tag | Rewrites tags, cover and chapters without any network access, and moves the file to the location the current path template produces. Foreign ID3 frames (BPM, key, rating, ReplayGain, lyrics) are kept. |
| Change genre | Sets the genre manually; it is kept over automatic detection. |
| Change festival | Click the festival badge (or use the menu): sets series, year, stage and set type manually and retags the file. |
| Delete | Removes the entry and the file (and `.cue`), with confirmation (setting *confirm_delete*). Only files inside the target folder are deleted; for others there is "remove entry only". |

## Player

The setting *Abspielen mit* (`player.mode`, Settings, Allgemein) chooses what play does:

- **Built-in mini player** (default, **in development**): a bar above the status bar that keeps
  playing when you switch views. Cover, title, play/pause, seek, volume and time. Chapters from the
  sidecar, ID3 or CUE appear as markers on the timeline and as an expandable track list. It only
  plays local files, no network.
- **Windows default player**: opens the file with your system's default audio app.

The other variant is always available per entry in the menu.

## Tracks and tracklists (v0.6.0)

**Tracks** (button next to *Collector*) searches the tracklists of all your sets: type an artist or
title, click a timestamp and the set plays from that point. The menu (**⋯**) of every entry has
**Tracklist** with clickable timestamps. Details: [Tracklist search](Tracklist-Search).

## Tip for media servers

Point Plex or Jellyfin at the target folder (type: Music). The default folder layout and the tags
are designed for it; see [File naming and tags](File-Naming-and-Tags).

---

[← Downloads and queue](Downloads-and-Queue) · [🏠 Home](Home) · [File naming and tags →](File-Naming-and-Tags)
