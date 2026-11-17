# Concept: Festivals & series in the library (planned v0.3.0)

Status: accepted by the user (2026-11-17). Scheduled after multilingual UI (v0.2.0).

## Goal
Many mixes are sets from festival X in year Y (e.g. *Defqon.1 2024 | RED | Closing Ceremony*).
The library should let the user browse and group by festival/series, year and stage – without any
extra network request.

## Data model
- **Series** – a festival *or* a recurring show/podcast (user decision 3: radio shows and podcasts
  are handled the same way). Fields: `name`, `kind` (festival | radio | podcast), `aliases`
  (e.g. Defqon.1 = "DQ1", "Defqon 1", "Defqon.1 Weekend Festival"), optional organiser channels
  (e.g. Q-dance), optional default genre.
- **Edition** – series + year (+ optional variant such as *Australia*), e.g. *Defqon.1 2024*.
  Radio/podcast: episode number instead of/besides the year.
- **Per mix** (all optional): edition, stage (RED, BLUE, Mainstage …), set type (live set,
  closing ceremony, endshow, warm-up, anthem, episode), `series_manual` flag.
- DB migration with new tables `series`, `series_alias`, `editions` and columns on the video row;
  automatic pre-migration backup as usual.

## Detection (cheap, offline)
- Only from title/description/channel already stored from the flat listing – **no extra requests**.
- Built-in, editable list of known hard dance festivals and shows (Defqon.1, Qlimax, Decibel
  outdoor, Intents, Dominator, Masters of Hardcore, Thunderdome, Reverze, Hard Bass, Q-BASE,
  Supremacy, Rebirth, Ground Zero, Hardshock, Q-dance Radio, Hardstyle Mag podcast, …) in a new
  settings tab «Festivals & Series».
- Year from the title (own word), otherwise the upload date; stage and set type via keyword lists
  (also editable).
- Confidence score; low confidence → not assigned (shown as suggestion).
- One-off offline pass over the existing library («Assign festivals»).
- Manual correction by clicking the festival badge (like the genre popover). Manual values are
  never overwritten by detection.

## Library UI
- «Group by» switch: genre · festival/series · artist · year.
- Festival view: one tile per series with count → years as a timeline → sets grouped by stage.
- Filter chips and search; optional festival filter in Discover.

## Files & tags
- New ID3 frames: `TXXX:FESTIVAL`, `TXXX:EVENT_YEAR`, `TXXX:STAGE`, `TXXX:SET_TYPE`.
- **Album tag = edition** (e.g. «Defqon.1 2024») so Plex/Jellyfin group sets as albums –
  default on, can be switched off (user decision 1).
- New path placeholders `{festival}`, `{event_year}`, `{stage}`; the **default path template stays
  unchanged** (user decision 2). Existing files only move when the user triggers retag/move.

## v0.5.0 – Collect a whole edition («Festival collector»)
User request: gather all sets of one festival edition, based on its timetable, with a checklist to
untick unwanted DJs/sets.

- **Edition checklist**: per edition a list of expected sets (DJ, stage, day/time, set type) with
  status *not found · found (YouTube/SoundCloud) · queued · downloaded · ignored*; each row has a
  checkbox, «Select all / none», filter by stage/day.
- **Where the list comes from** (no scraping of festival websites – fragile and against their terms):
  1. **Organiser playlists** (preferred, cheapest): e.g. the official «Defqon.1 2024 | Livesets»
     playlist of the organiser channel – one flat listing gives most sets at once.
  2. **Paste the timetable** as text (lines like `18:00 – 19:00 Headhunterz`, or CSV); a parser
     builds the rows, the user can edit them.
  3. **Shared timetable files** (`timetables/<series>/<year>.json`) curated in the repository and
     shipped with updates; users can contribute via issues/PRs.
- **Matching**: rows not covered by the playlist are searched one by one (`<DJ> <festival> <year>`,
  flat search, Throttle and `max_searches_per_hour` apply – the dialog shows the estimated number of
  requests and spreads them over time, resumable like the backfill). Hit = DJ name + series + year
  in the title, duration plausible; uncertain hits need a click to confirm.
- **Download**: only ticked and confirmed rows go to the queue (sequential, limits as always);
  results are tagged with the edition/stage from the checklist (manual = authoritative).
- Builds on the v0.3.0 data model (series/editions) and the v0.4.0 resumable backfill machinery.

## Out of scope
- Scraping festival websites or 1001tracklists.
- Automatic renaming/moving of existing files.
