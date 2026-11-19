![](images/divider.svg)

What is planned for HCLoader after the first public release. The order may change – ideas and
feedback are welcome in [Issues](https://github.com/kellerict/HCLoader/issues).
Progress per version is tracked in the [milestones](https://github.com/kellerict/HCLoader/milestones).

![Roadmap timeline: v0.1 released, v0.2 in progress, v0.3 to v0.10 planned](images/roadmap.svg)

| Version | Status | Planned |
|---|---|---|
| **v0.1.0** | ✅&nbsp;Released | First public release – discover, watchlist, downloads, library with player, self-update, installer and portable build |
| **v0.2.0** | ✅&nbsp;Released | **Multilingual UI** – 19 languages: English (default), German (Swiss spelling), Chinese (Simplified), Hindi, Spanish, French, Bengali, Portuguese (Brazil), Russian, Indonesian, Dutch, Flemish (Belgium), Swedish, Norwegian (Bokmål), Finnish, Lithuanian, Latvian, Estonian and Fränggisch (fun dialect) |
| **v0.3.0** | ✅&nbsp;Released | **Festivals & series** – recognise festival, year, stage and set type (Defqon.1, Qlimax, Dominator, …) as well as radio shows and podcasts; group the library by festival; album tag = edition for Plex/Jellyfin |
| **v0.4.0** | ✅&nbsp;Released | **Read everything (once)** – fetch the complete back catalogue of a channel, playlist or artist into the inbox, gently and resumable |
| **v0.5.0** | ✅&nbsp;Released | **Festival collector** – collect all sets of one festival edition from the organiser playlist or a timetable, with a checklist to untick sets you do not want |
| **v0.6.0** | ✅&nbsp;Released | **Tracklist search** – tracklists from chapters and descriptions: «which sets play track X?» |
| **v0.7.0** | ✅&nbsp;Released | **Loudness normalisation** (ReplayGain / EBU R128) · player remembers the position, waveform with chapter marks, sleep timer |
| **v0.8.0** | ✅&nbsp;Released | **Playlist export** (M3U8 per festival, genre, DJ, search, checklist) · **DJ pages** with aliases, b2b sets and one-click watchlist – see [DJ pages and playlists](DJ-Pages-and-Playlists) |
| **v0.9.0** | ✅&nbsp;Released | **Statistics** · Windows notifications for new sets · Plex/Jellyfin library scan after downloads |
| **v0.10.0** | 🔨&nbsp;In progress | **Re-upload detection** via an offline audio fingerprint · more sources: Mixcloud and hearthis.at (archive.org postponed – see [Supported sources](Supported-Sources)) |

## Any time

Not tied to a version – ships when it is ready.

| Milestone | Status | Planned |
|---|---|---|
| **Signed installer** | 🗓️&nbsp;Planned | Code signing certificate for open source (for example SignPath Foundation), signing in the release workflow – no more SmartScreen warning |

➡️ **[Milestones and issues on GitHub](https://github.com/kellerict/HCLoader/milestones)**

> 🛡️ **Same principles, every release** – gentle on YouTube (one central throttle, sequential
> downloads, automatic backoff), cheap before expensive, never download twice, everything
> configurable in the app.

Detailed concepts: [festivals & festival collector](https://github.com/kellerict/HCLoader/blob/main/docs/concepts/festivals.md).

---

[← FAQ](FAQ) · [🏠 Home](Home) · [Architecture →](Architecture)
