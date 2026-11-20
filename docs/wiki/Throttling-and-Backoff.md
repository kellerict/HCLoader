![](images/divider.svg)

> 🛡️ HCLoader's first principle is to **be nice to the platform**. Every network access goes through
> one central throttle. New features must never bypass it.

## Rules

- **Sequential**: one download at a time; no parallel downloads.
- **Cheap before expensive**: flat metadata queries first, filter locally, resolve and download
  individual videos only afterwards.
- **Never twice**: the SQLite state and the yt-dlp download archive are the source of truth.
- **No retry loops**: no automatic retries for the same download within a run (at most one retry on
  a plain network error, never on 403 or 429).
- **Paced**: pauses between requests and between downloads, a bandwidth cap, and counters.

## Defaults

Everything is configurable in Settings, Schonung (throttle). See the
[Settings reference](Settings-Reference#throttle-tab-schonung-youtube).

| Setting | Default |
|---|---|
| Pause between metadata requests | 3 s |
| Pause between downloads (random between minimum and maximum) | 30 / 120 s |
| Download rate | 3 MB/s |
| Downloads per run | 10 |
| Downloads per day | 25 |
| Searches per hour | 20 |
| Watchlist interval | 24 h |
| Entries per source | 30 |
| Backoff | 6 h, doubling up to 48 h |

The counters (searches this hour, downloads today and this run) are kept centrally in the throttle
and shown in the app (Downloads view, Discover header, status bar).

## Backoff

When the platform answers with HTTP 429 or "confirm you're not a bot":

1. A backoff starts immediately (default 6 hours). It is stored in the database and survives
   restarts.
2. Search, watchlist and downloads are blocked. The status bar and the Schonung tab show the
   remaining time.
3. If it happens again, the duration doubles up to the maximum (default 48 hours).
4. After a successful run the level resets.

You can lift a backoff manually (**Manuell aufheben**) after a warning. Doing so right away is
usually a bad idea: it makes a longer block more likely.

## Per platform

YouTube and SoundCloud have separate limits, counters and backoff. A backoff on one platform blocks
only that platform; the queue keeps downloading from the other.

## What to do when you hit a backoff

- Wait. This is the cheapest fix.
- Update yt-dlp and the plugin (Settings, Wartung), because YouTube changes often.
- Check that the PO-token status is active (see [Troubleshooting](Troubleshooting)).
- Keep the default limits; lowering the number of searches and downloads helps, raising it does not.

## Update checks

The daily update check asks PyPI (for yt-dlp and the plugin), not YouTube, and is not part of the
throttle.

---

[← Settings reference](Settings-Reference) · [🏠 Home](Home) · [Troubleshooting →](Troubleshooting)
