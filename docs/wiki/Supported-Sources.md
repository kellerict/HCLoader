![](images/divider.svg)

| Source | Status | Search | Watchlist | Download |
|---|---|---|---|---|
| **YouTube** | supported | `ytsearch`, flat | channels, playlists, saved searches | audio to MP3 (or original) |
| **SoundCloud** | in development | `scsearch` | user pages (`/tracks`), sets (playlists), saved searches | original audio kept by default |
| Mixcloud | planned | | | |
| hearthis.at | planned | | | |
| archive.org | planned | | | |

## YouTube

Uses yt-dlp as a library, Deno for JavaScript challenges and the bgutil PO-token provider. See
[Throttling and backoff](Throttling-and-Backoff).

## SoundCloud (in development)

SoundCloud is being added as a second platform. What the code has so far:

- Search, watchlist sources (`soundcloud.com/<user>`, sets and searches) and downloads, each with
  its **own throttle**, counters and backoff, independent from YouTube.
- Ids are stored as `sc:<id>`, file names contain `[sc-<id>]`, tags `TXXX:SOUNDCLOUD_ID` and
  `SOURCE=SoundCloud`.
- Go+ previews (short snippets of paid tracks) are dropped ("Nur Vorschau (Go+)"); only full tracks are
  considered.
- Likely duplicates across platforms are detected (similar duration and title) and are never
  downloaded automatically; the filter `hide_cross_platform_duplicates` hides them.
- By default the original audio is kept (`keep_original_soundcloud`), because SoundCloud mostly
  serves 128 kbps MP3 or 160 kbps AAC and converting to MP3 320 would only make files bigger.
- Switch it off completely with `soundcloud.enabled: false`.

The UI for SoundCloud is still being finished, so behavior and wording may change.

## Planned

Mixcloud, hearthis.at and archive.org are on the roadmap. Nothing is promised or scheduled.

## Terms of service

Every source has its own terms. You are responsible for following them. HCLoader keeps the load low,
but it does not change what you are allowed to do.

---

[← Scheduled checks](Scheduled-Checks) · [🏠 Home](Home) · [Settings reference →](Settings-Reference)
