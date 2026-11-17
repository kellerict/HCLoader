# Roadmap

Agreed with the user on 2026-11-17. Order may change; each release ends with QA, review and an
automated GitHub release (see v0.2.0).

| Version | Content |
|---|---|
| v0.1.0 | First public release (done) |
| v0.2.0 | Multilingual UI – 11 languages, English default (en, de, zh-CN, hi, es, fr, bn, pt-BR, ru, id, nl). **Release automation**: pushing a new version to `main` creates tag, release (notes from CHANGELOG) and assets; Claude prepares, the user gives the go. |
| v0.3.0 | Festivals & series in the library – [concept](concepts/festivals.md) |
| v0.4.0 | Watchlist «Read everything (once)» per source – paged, resumable backfill into the inbox |
| v0.5.0 | Festival collector: checklist per edition from organiser playlist / pasted timetable / shared timetable files – [concept](concepts/festivals.md#v050--collect-a-whole-edition-festival-collector) |
| v0.6.0 | Tracklist search: tracklists from chapters/descriptions, «which sets play track X?» |
| v0.7.0 | Loudness normalisation (ReplayGain / EBU R128 tags, offline) · player remembers position, waveform with chapter marks, sleep timer |
| v0.8.0 | Playlist export (M3U per festival/genre/DJ) · DJ pages with aliases and one-click watchlist |
| v0.9.0 | Statistics view · Windows notifications for new watchlist sets · Plex/Jellyfin library scan after download |
| v0.10.0 | Re-upload detection via audio fingerprint · more sources: Mixcloud, hearthis.at (7b), archive.org (7c, optional) |
| any time | **Signed installer** – code signing certificate (e.g. SignPath Foundation for open source), signing in the release workflow, no more SmartScreen warning |

Principles stay the same for every release: gentle on YouTube (central throttle), cheap before
expensive, never download twice, everything configurable in the GUI.
