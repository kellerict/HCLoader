# Getting started

A first session, from empty app to a tagged MP3. The screenshots in the repository use mock data.

## 1. Check the status bar

The bar at the bottom of the window is always visible. Before you search, make sure it shows:

- **yt-dlp**: a version number
- **Deno OK** and **ffmpeg OK** (both are required)
- **PO-Token**: active (Script). The PO token helps requests look like a real browser and lowers
  the risk of bot checks.
- **Backoff**: none

If something is red or missing, see [Troubleshooting](Troubleshooting).

## 2. Look at the settings once

Open **Einstellungen** (Settings). The most useful first stops:

- **Ablage & Tags** (storage): choose the **target folder** for your library. Default
  `%USERPROFILE%\Music\HCLoader`.
- **Filter & Keywords**: minimum duration (default 10 minutes) and the include/exclude keyword lists.
- **Schonung** (throttle): the defaults are deliberately cautious. Leave them unless you know why.

Everything is explained in the [Settings reference](Settings-Reference). Nothing takes effect until
you press **Speichern** (save); invalid values are flagged next to the field.

## 3. Search and download

1. Open **Entdecken** (Discover), type a search such as `hardcore liveset 2026`, optionally click a
   genre chip, press **Suchen**.
2. Use the filter panel to narrow the results (duration, upload period, keywords).
3. Click the download icon on a card, or select several cards and use **Auswahl laden** (download
   selection).
4. Watch the **Downloads** view: phase (download, convert, tag), progress, speed, ETA.
5. The file appears in the **Bibliothek** (Library) and in your target folder.

Downloads are sequential and paced by the throttle, so a batch of ten mixes takes a while on purpose.

## 4. Follow sources

In **Watchlist**, add a channel, playlist or saved search. HCLoader checks it incrementally, and new
matches arrive in the **Eingang** (Inbox) or are downloaded automatically. See
[Watchlist and Inbox](Watchlist-and-Inbox) and [Scheduled checks](Scheduled-Checks).

## Next

- [Discover and search](Discover-and-Search)
- [File naming and tags](File-Naming-and-Tags)
- [Throttling and backoff](Throttling-and-Backoff)
