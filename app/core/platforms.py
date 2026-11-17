"""Platforms (Phase 7a): YouTube and SoundCloud. Pure functions, no network, no yt-dlp.

IDs (docs/decisions.md «SoundCloud: IDs»):
- DB primary key (`videos.id`, the id the UI and the bridge use): YouTube = the 11-character
  video id (unchanged), SoundCloud = `sc:<numeric track id>`. The colon never occurs in a
  YouTube id, so the two id spaces cannot collide. `videos.platform` stores the platform as
  well (queries, UI badge), but the prefix alone already decides.
- File id (file name `[{id}]`, temp files, sidecar name): YouTube = id, SoundCloud
  `sc-<id>` (Windows file names must not contain `:`).
- Archive line (yt-dlp format `<extractor> <id>`): `youtube <id>` / `soundcloud <id>`.
"""

from __future__ import annotations

import re
from urllib.parse import urlparse

YOUTUBE = "youtube"
SOUNDCLOUD = "soundcloud"
PLATFORMS = (YOUTUBE, SOUNDCLOUD)
LABELS = {YOUTUBE: "YouTube", SOUNDCLOUD: "SoundCloud"}
SC_PREFIX = "sc:"
SC_FILE_PREFIX = "sc-"

_YT_ID_RE = re.compile(r"^[0-9A-Za-z_-]{11}$")
_SC_ID_RE = re.compile(r"^sc:(\d{1,20})$")
_SC_HOSTS = ("soundcloud.com", "www.soundcloud.com", "m.soundcloud.com")
_YT_HOSTS = ("youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "music.youtube.com")


def label(platform: str | None) -> str:
    return LABELS.get(platform or YOUTUBE, str(platform))


def valid(platform: str | None) -> bool:
    return platform in PLATFORMS


def sc_db_id(native_id: object) -> str:
    return f"{SC_PREFIX}{native_id}"


def db_id(platform: str, native_id: object) -> str:
    """Primary key in the DB for a native (yt-dlp) id."""
    return sc_db_id(native_id) if platform == SOUNDCLOUD else str(native_id)


def platform_of(video_id: str | None) -> str:
    """Platform of a DB id (`sc:` prefix = SoundCloud, everything else YouTube)."""
    return SOUNDCLOUD if str(video_id or "").startswith(SC_PREFIX) else YOUTUBE


def native_id(video_id: str) -> str:
    """The id yt-dlp uses (`sc:123` -> `123`)."""
    text = str(video_id)
    return text[len(SC_PREFIX) :] if text.startswith(SC_PREFIX) else text


def is_valid_db_id(video_id: str | None) -> bool:
    text = str(video_id or "")
    return bool(_YT_ID_RE.match(text) or _SC_ID_RE.match(text))


def file_id(video_id: str) -> str:
    """Id used in file names (`[{id}]`), temp files and the sidecar name."""
    if platform_of(video_id) == SOUNDCLOUD:
        return SC_FILE_PREFIX + native_id(video_id)
    return str(video_id)


def archive_line(video_id: str) -> str:
    """yt-dlp archive format: `youtube <id>` / `soundcloud <id>`."""
    return f"{platform_of(video_id)} {native_id(video_id)}"


def soundcloud_track_api_url(video_id: str) -> str:
    """Download URL rebuilt from the id (single track guaranteed, like `watch?v=` for YouTube).
    yt-dlp's SoundcloudIE accepts `api.soundcloud.com/tracks/<id>` and calls the API directly
    (no resolve request)."""
    return f"https://api.soundcloud.com/tracks/{native_id(video_id)}"


def url_platform(url: str | None) -> str | None:
    """Platform of a web URL by its host (None = neither)."""
    try:
        host = (urlparse(str(url or "").strip()).hostname or "").lower()
    except ValueError:
        return None
    if host in _SC_HOSTS:
        return SOUNDCLOUD
    if host in _YT_HOSTS:
        return YOUTUBE
    return None


def is_soundcloud_host(host: str | None) -> bool:
    return (host or "").lower() in _SC_HOSTS
