# Shared timetables (v0.5.0 «Festival collector»)

Timetables shipped with HCLoader, one file per edition:
`app/data/timetables/<series-key>/<year>.json` (a variant: `<year>-<variant>.json`, e.g.
`defqon1/2024-australia.json`). `<series-key>` is the `key` of the series in `app/data/series.yaml`.
In the app: Festival collector → «Shared timetables» imports a file into the checklist of its edition.

Only data that is verifiably correct may be added. Every file needs a `source` (link to the official
timetable of the organiser). No scraping: type the sets in from the official publication.

```json
{
  "format": 1,
  "series": "defqon1",
  "year": 2024,
  "variant": "",
  "source": "https://… (official timetable)",
  "updated": "2024-06-20",
  "sets": [
    {"artist": "Artist name", "stage": "RED", "day": "Saturday", "start": "18:00", "end": "19:00", "set_type": null}
  ]
}
```

- `format`: always `1`. `series`: equals the folder name. `year`: 1990–2100. `variant`: `""` or the
  variant name from `series.yaml` (e.g. `Australia`).
- `sets`: not empty. `artist` is required; `stage` and `day` are free text (use the official names);
  `start`/`end` `HH:MM` (24 h) or omitted; `set_type` one of `live_set`, `closing_ceremony`, `opening`,
  `endshow`, `full_show`, `warm_up`, `anthem`, `episode` or `null`.
- `tests/test_collector.py::test_shipped_timetable_files_are_valid` checks every file.
