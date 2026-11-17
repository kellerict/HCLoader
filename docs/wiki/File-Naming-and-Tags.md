# File naming and tags

## Folder structure

The default path template is `{genre}/{artist}/{year}/{date} - {title} [{id}]`:

```
<target folder>\<Genre>\<Artist>\<Year>\<YYYY-MM-DD> - <Title> [<video id>].mp3
```

Example:

```
D:\Music\HCLoader\Hardcore\Partyraiser\2026\2026-10-03 - Masters of Hardcore 2026 Liveset [abc123XYZ].mp3
```

- The default target folder is `%USERPROFILE%\Music\HCLoader`.
- The genre folder name is the genre's name from your genre list. Mixes without a keyword match are
  filed under `Unsortiert`.
- The artist is the channel name, or optionally parsed from the title (`artist_from_title`).
- The **video id is always in the file name** so names are unique and media-server friendly.
  SoundCloud ids appear as `[sc-<id>]`.
- Change the pattern in Settings, Ablage & Tags. Available placeholders: `genre`, `artist`,
  `channel`, `year`, `date`, `title`, `id`, `platform`. `{id}` is mandatory.

## Sanitizing and limits

- Characters that Windows does not allow in file names are replaced.
- Titles are shortened to `max_title_length` (default 120 characters).
- The whole path is kept below `max_path_length` (default 240, hard Windows limit 259 or 260). If a
  path would still be too long, the title and then artist, channel and genre parts are shortened
  (the video id never is); if even that is not enough, the download fails with a "path too long"
  error. Choose a short target folder to avoid this.
- Noise like `(Official ...)`, `[HQ]`, `[HD]` is removed from titles with the cleanup patterns
  (editable regular expressions).
- Temporary files live in `<target>\.tmp` and are moved only after tagging succeeded.

## Audio

Best available audio, converted to **MP3 320 kbps CBR** (default) or **V0 VBR**. Optionally keep the
original (Opus or M4A) without conversion. YouTube typically delivers Opus at about 130 to 160 kbps,
so MP3 is for compatibility, not quality. SoundCloud audio is kept unchanged by default.

## ID3v2.4 tags (MP3)

| Frame | Content |
|---|---|
| `TIT2` | Title (cleaned) |
| `TPE1` / `TPE2` | Artist / album artist (channel name, or parsed from the title) |
| `TALB` | Album = title |
| `TRCK` | Track number, 1 |
| `TCON` | Genre |
| `TDRC` | Upload date |
| `COMM` | Source URL |
| `TXXX:YOUTUBE_ID` (or `TXXX:SOUNDCLOUD_ID`) | Platform id |
| `TXXX:SOURCE` | `YouTube` or `SoundCloud` |
| `APIC` | Cover, square crop from the center of the best thumbnail (optional) |
| `CHAP` / `CTOC` | Chapters (optional) |

For `original` audio, `.m4a` and `.opus` files get the equivalent MP4 atoms or Vorbis comments;
other containers are left untagged (the file is still moved).

## Cover

The thumbnail in the best available resolution, cropped square from the center, embedded as `APIC`.
Optionally also written as `cover.jpg` (`write_cover_jpg`).

## Chapters and CUE

If the video has chapters, or timestamps in its description, HCLoader writes a `.cue` file next to
the MP3 and, for MP3, ID3 `CHAP`/`CTOC` frames. The CUE writer is conservative: the first track is
at 00:00, there are at most 99 tracks, and chapters beyond the end of the audio are dropped, so a
wrong chapter list never produces a broken CUE. A small metadata sidecar in the data folder
(`meta\<id>.json`) keeps the resolved chapters for re-tagging and the player.

## Re-tagging

Library, Re-tag rewrites tags, cover and chapters from stored metadata, without network access. It
also moves the file when your path template changed. Foreign ID3 frames you added with other tools
are kept.
