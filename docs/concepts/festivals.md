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

## Out of scope
- Online lookups (1001tracklists, festival websites).
- Automatic renaming/moving of existing files.
