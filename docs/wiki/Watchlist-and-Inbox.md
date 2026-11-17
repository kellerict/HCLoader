# Watchlist and Inbox

## Watchlist

The **Watchlist** holds the sources HCLoader follows.

| Source type | Example |
|---|---|
| Channel | `https://www.youtube.com/@SomeChannel` (the channel root is read from its `/videos` tab) |
| Playlist | A YouTube playlist URL |
| Search | A saved search query |

Per source you can set: name (HCLoader can suggest one and replaces it with the real channel or
playlist name after the first check), URL or query, default genre (optional), active on/off,
**auto-download** (download matches directly instead of sending them to the Inbox), and the
maximum entries per check (empty = *entries per source* from Settings, Zeitplan; max 200, 100 for
searches). The table shows when a source was last checked and how many new hits it found.

Buttons: **Prüfen** (check one source) and **Alle jetzt prüfen** (check all).

### How a check works

- Sources are read newest first, via a flat metadata query.
- A check stops at the first video **this source** has already seen. A video known only from a
  search or another source does not stop it. The very first check of a source never stops early.
- Search sources skip known videos but never stop early, because relevance order is not
  chronological.
- New videos that pass all filters go to the Inbox (or the queue with auto-download). Videos that
  fail the filters are stored as "new" and not shown again as new.
- **Playlists that append new videos at the end** can be handled with the "newest are at the end"
  option. It reads the last N entries, which costs roughly one request per 100 playlist entries, so
  enable it only for long playlists where it is needed.
- If the platform signals a rate limit, the whole check stops and a backoff starts; the check is
  repeated after the backoff.

## Inbox

**Eingang** (Inbox) lists new matches from the watchlist that passed all filters, waiting for your
decision. The sidebar badge shows how many there are. Select entries and download or ignore them,
exactly like on Discover cards. Downloaded items leave the Inbox.

## Automatic checks

In the app (default every 24 h while it is open) and via the Windows Task Scheduler even when the
app is closed: see [Scheduled checks](Scheduled-Checks).
