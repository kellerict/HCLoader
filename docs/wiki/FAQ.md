![](images/divider.svg)

**Is this legal?**
This is not legal advice. HCLoader is for **personal use only**. You are responsible for complying
with the terms of service of YouTube and SoundCloud and with copyright law in your country. Do not
redistribute what you download. Support the artists and labels you enjoy.

**Why is it so slow?**
On purpose. Downloads are sequential with random pauses (30 to 120 s), a bandwidth limit and daily
limits, so the platform sees a polite client. See [Throttling and backoff](Throttling-and-Backoff).

**Can I raise the limits?**
Yes, in Settings, Schonung. But more load means more risk of a 429 or bot check, and the backoff then
blocks everything for hours. The defaults are a good trade-off.

**Which languages does the interface speak?**
19 languages (from v0.2.0): English (default), German (Swiss spelling), Chinese (Simplified), Hindi, Spanish, French, Bengali, Portuguese (Brazil), Russian, Indonesian, Dutch, Flemish (Belgium), Swedish, Norwegian (Bokmål), Finnish, Lithuanian, Latvian, Estonian and Fränggisch (fun dialect). English is the default; pick another one in Settings ›
General › Language, or «Automatic» to follow the Windows display language. The switch applies at
once. «Automatic» never picks Fränggisch – it is a Franconian fun dialect you choose on purpose;
texts it lacks fall back to German, then English. German uses Swiss spelling ("ss" instead of
"ß"). Want to help with a translation? See `docs/TRANSLATING.md`.

**Why MP3 and not the original audio?**
MP3 plays everywhere and tags well. YouTube mostly serves Opus at about 130 to 160 kbps, so MP3 320
does not sound better than the source. You can keep the original (Opus/M4A) with
`audio_format: original`.

**Where are my files?**
In the target folder (default `%USERPROFILE%\Music\HCLoader`), organized as
`Genre\Artist\Year\Date - Title [id].mp3`. See [File naming and tags](File-Naming-and-Tags).

**Where are my settings and database?**
`%APPDATA%\HCLoader\` (venv install) or `HCLoader\data\` (portable). See
[Settings reference](Settings-Reference#where-settings-live).

**Does it work with Plex or Jellyfin?**
That is what the folder layout and tags are made for. Point a Music library at the target folder.

**Does it stream or play from YouTube?**
No. The player only plays files you already downloaded.

**Can I download videos, playlists in bulk or whole channels?**
Audio only, and only mixes that pass your filters. Add a channel or playlist as a watchlist source;
HCLoader reads it incrementally within the limits.

**Do I need a YouTube account or cookies?**
No. Browser cookies are an emergency option, off by default.

**Why does it need Deno?**
YouTube requires solving JavaScript challenges; yt-dlp uses Deno for that. Deno and the PO-token
provider are bundled or fetched for you.

**Can I run it on macOS or Linux?**
The app targets Windows 10/11. Developers can run the tests on Linux (see [Development](Development)).

**Which genres are supported?**
Uptempo, Hardcore, Hardstyle and a fallback "Unsortiert" by default. Genres, colors and keywords
are editable, so you can add your own.

**How do I update?**
yt-dlp and the plugin: Settings, Wartung. The app: see [App updates](App-Updates).

**Can I contribute?**
Issues are welcome. Pull requests are limited to repository collaborators. See
[CONTRIBUTING.md](https://github.com/kellerict/HCLoader/blob/main/CONTRIBUTING.md).

---

[← Troubleshooting](Troubleshooting) · [🏠 Home](Home) · [Roadmap →](Roadmap)
