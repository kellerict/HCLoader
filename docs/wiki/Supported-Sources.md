![](images/divider.svg)

| Source | Status | Search | Watchlist | Download |
|---|---|---|---|---|
| **YouTube** | supported | `ytsearch`, flat | channels, playlists, saved searches | audio to MP3 (or original) |
| **SoundCloud** | supported | `scsearch` | user pages (`/tracks`), sets (playlists), saved searches | original audio kept by default |
| **Mixcloud** | supported (v0.10.0) | public search API (`mcsearch`) | user uploads, playlists, saved searches | original audio (AAC) kept by default |
| **hearthis.at** | supported (v0.10.0) | public API (`htsearch`) | user tracks, sets, saved searches | original stream (MP3) kept by default |
| archive.org | not planned for now | | | |

Every platform has its **own throttle**: its own pauses, limits per run/day/hour, counters and
backoff (Settings › Throttling for YouTube, › SoundCloud, › More sources for Mixcloud and
hearthis.at). A block (HTTP 429) on one platform never stops the others. Each platform except
YouTube can be switched off completely; it is then never contacted.

## YouTube

Uses yt-dlp as a library, Deno for JavaScript challenges and the bgutil PO-token provider. See
[Throttling and backoff](Throttling-and-Backoff).

## SoundCloud

- Search, watchlist sources (`soundcloud.com/<user>`, sets and searches) and downloads.
- Ids are stored as `sc:<id>`, file names contain `[sc-<id>]`, tags `TXXX:SOUNDCLOUD_ID` and
  `SOURCE=SoundCloud`.
- Go+ previews (short snippets of paid tracks) are dropped ("Preview only (Go+)"); only full tracks
  are considered.
- By default the original audio is kept (`keep_original_soundcloud`), because SoundCloud mostly
  serves 128 kbps MP3 or 160 kbps AAC and converting to MP3 320 would only make files bigger.
- Switch it off completely with `soundcloud.enabled: false`.

## Mixcloud

- **Search**: the platform switch in Discover has a Mixcloud button. yt-dlp has no Mixcloud search,
  so HCLoader asks Mixcloud's public search API (`api.mixcloud.com/search`) – one request per 50
  results.
- **Watchlist**: `mixcloud.com/<user>` (the user's uploads, newest first) or
  `mixcloud.com/<user>/playlists/<playlist>`. The listing asks for title, length, date and picture
  in the same page request, so the filters work without opening every set; it stops as soon as it
  has the entries it needs.
- **Download**: yt-dlp's Mixcloud extractor (the set's page is stored with the entry). The original
  AAC audio is kept by default (`keep_original_mixcloud`).
- Ids `mc:<user>_<slug>`, file names `[mc-<user>_<slug>]`, tag `TXXX:MIXCLOUD_ID`, `SOURCE=Mixcloud`.
- **Mixcloud Select** uploads (only for paying subscribers of a creator) can never be downloaded:
  they show "Subscribers only (Select)" and are filtered out.
- Switch it off with `mixcloud.enabled: false` (Settings › More sources).

## hearthis.at

- **Search** and **watchlist** through hearthis.at's public API (`api-v2.hearthis.at`, 20 entries
  per request): users (`hearthis.at/<user>/`) and sets (`hearthis.at/<user>/set/<set>/`).
- **Download**: yt-dlp's hearthis.at extractor; the MP3 stream is kept unchanged by default
  (`keep_original_hearthis`). Lossless originals (WAV) offered by some uploaders are skipped – they
  are huge and cannot be tagged.
- Ids `ht:<id>`, file names `[ht-<id>]`, tag `TXXX:HEARTHIS_ID`, `SOURCE=hearthis.at`.
- Switch it off with `hearthis.enabled: false` (Settings › More sources).

## Duplicates and re-uploads

- The same mix on two platforms is recognised **before** a download by similar length and title
  ("Probably already downloaded (YouTube)"); such hits never go to the queue automatically.
- With **Check before downloading** (Settings › Re-uploads) the same check also runs within one
  platform (a re-upload under a new id).
- **After** a download the audio itself is compared with your library – see
  [Re-upload detection](Re-upload-Detection).

## archive.org

Not included in v0.10.0. yt-dlp only supports single archive.org items, not collections or search,
and an item is often a whole concert with many files. It may come back once that changes.

## Terms of service

Every source has its own terms. You are responsible for following them. HCLoader keeps the load low,
but it does not change what you are allowed to do.

---

[← Scheduled checks](Scheduled-Checks) · [🏠 Home](Home) · [Settings reference →](Settings-Reference)
