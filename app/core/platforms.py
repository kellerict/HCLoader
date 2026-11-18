"""Platforms: YouTube, SoundCloud (Phase 7a), Mixcloud and hearthis.at (v0.10.0).
Pure functions, no network, no yt-dlp.

IDs (docs/decisions.md «SoundCloud: IDs», «Mixcloud and hearthis.at: IDs»):
- DB primary key (`videos.id`, the id the UI and the bridge use): YouTube = the 11-character
  video id (unchanged), every other platform `<prefix>:<native id>`: SoundCloud `sc:<numeric
  track id>`, Mixcloud `mc:<user>_<slug>` (yt-dlp's id), hearthis.at `ht:<numeric track id>`.
  The colon never occurs in a YouTube id, so the id spaces cannot collide. `videos.platform`
  stores the platform as well (queries, UI badge), but the prefix alone already decides.
- File id (file name `[{id}]`, temp files, sidecar name): YouTube = id, others
  `<prefix>-<id>` (Windows file names must not contain `:`).
- Archive line (yt-dlp format `<extractor> <id>`): `youtube <id>`, `soundcloud <id>`,
  `mixcloud <id>`, `hearthisat <id>` (yt-dlp's lower-cased extractor key).
- Download URL: YouTube and SoundCloud rebuild it from the id; Mixcloud and hearthis.at use
  the track page stored with the entry (`videos.url`), checked by `track_page_ok`.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import urlparse

YOUTUBE = "youtube"
SOUNDCLOUD = "soundcloud"
MIXCLOUD = "mixcloud"
HEARTHIS = "hearthis"


@dataclass(frozen=True)
class PlatformInfo:
    key: str
    label: str
    prefix: str  # DB id prefix ('' = YouTube)
    archive: str  # extractor name in the archive file
    hosts: tuple[str, ...]
    id_re: re.Pattern[str]  # native id
    search: bool  # flat search supported
    section: str  # settings section with `enabled` + throttle limits ('throttle' = YouTube)
    tag: str  # TXXX description of the platform id


_INFO = {
    YOUTUBE: PlatformInfo(
        YOUTUBE,
        "YouTube",
        "",
        "youtube",
        ("youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "music.youtube.com"),
        re.compile(r"^[0-9A-Za-z_-]{11}$"),
        True,
        "throttle",
        "YOUTUBE_ID",
    ),
    SOUNDCLOUD: PlatformInfo(
        SOUNDCLOUD,
        "SoundCloud",
        "sc",
        "soundcloud",
        ("soundcloud.com", "www.soundcloud.com", "m.soundcloud.com"),
        re.compile(r"^\d{1,20}$"),
        True,
        "soundcloud",
        "SOUNDCLOUD_ID",
    ),
    MIXCLOUD: PlatformInfo(
        MIXCLOUD,
        "Mixcloud",
        "mc",
        "mixcloud",
        ("mixcloud.com", "www.mixcloud.com", "m.mixcloud.com", "beta.mixcloud.com"),
        re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,199}$"),
        True,
        "mixcloud",
        "MIXCLOUD_ID",
    ),
    HEARTHIS: PlatformInfo(
        HEARTHIS,
        "hearthis.at",
        "ht",
        "hearthisat",
        ("hearthis.at", "www.hearthis.at"),
        re.compile(r"^\d{1,20}$"),
        True,
        "hearthis",
        "HEARTHIS_ID",
    ),
}

PLATFORMS = tuple(_INFO)
OTHER_PLATFORMS = tuple(p for p in PLATFORMS if p != YOUTUBE)
LABELS = {k: v.label for k, v in _INFO.items()}
SC_PREFIX = "sc:"
SC_FILE_PREFIX = "sc-"
MC_PREFIX = "mc:"
HT_PREFIX = "ht:"
_BY_PREFIX = {i.prefix: i.key for i in _INFO.values() if i.prefix}
_HOSTS = {h: i.key for i in _INFO.values() for h in i.hosts}


def info(platform: str | None) -> PlatformInfo:
    return _INFO.get(platform or YOUTUBE, _INFO[YOUTUBE])


def label(platform: str | None) -> str:
    return LABELS.get(platform or YOUTUBE, str(platform))


def valid(platform: str | None) -> bool:
    return platform in PLATFORMS


def section(platform: str | None) -> str:
    """Settings section of a platform (`throttle` for YouTube)."""
    return info(platform).section


def sc_db_id(native_id: object) -> str:
    return f"{SC_PREFIX}{native_id}"


def db_id(platform: str, native_id: object) -> str:
    """Primary key in the DB for a native (yt-dlp) id."""
    pre = info(platform).prefix
    text = str(native_id)
    if not pre or text.startswith(pre + ":"):
        return text
    return f"{pre}:{text}"


def platform_of(video_id: str | None) -> str:
    """Platform of a DB id by its prefix (`sc:`, `mc:`, `ht:`; everything else YouTube)."""
    text = str(video_id or "")
    head, sep, _rest = text.partition(":")
    if sep and head in _BY_PREFIX:
        return _BY_PREFIX[head]
    return YOUTUBE


def native_id(video_id: str) -> str:
    """The id yt-dlp uses (`sc:123` -> `123`, `mc:dj_set-1` -> `dj_set-1`)."""
    text = str(video_id)
    if platform_of(text) == YOUTUBE:
        return text
    return text.partition(":")[2]


def is_valid_db_id(video_id: str | None) -> bool:
    text = str(video_id or "")
    p = platform_of(text)
    if p == YOUTUBE:
        return bool(_INFO[YOUTUBE].id_re.match(text))
    return bool(_INFO[p].id_re.match(native_id(text)))


def file_id(video_id: str) -> str:
    """Id used in file names (`[{id}]`), temp files and the sidecar name."""
    p = platform_of(video_id)
    if p == YOUTUBE:
        return str(video_id)
    return f"{_INFO[p].prefix}-{native_id(video_id)}"


def file_prefix(platform: str) -> str:
    """`sc-` / `mc-` / `ht-` ('' for YouTube): prefix of the temp file name."""
    pre = info(platform).prefix
    return f"{pre}-" if pre else ""


def archive_line(video_id: str) -> str:
    """yt-dlp archive format: `youtube <id>` / `soundcloud <id>` / `mixcloud <id>` / …"""
    return f"{_INFO[platform_of(video_id)].archive} {native_id(video_id)}"


def soundcloud_track_api_url(video_id: str) -> str:
    """Download URL rebuilt from the id (single track guaranteed, like `watch?v=` for YouTube).
    yt-dlp's SoundcloudIE accepts `api.soundcloud.com/tracks/<id>` and calls the API directly
    (no resolve request)."""
    return f"https://api.soundcloud.com/tracks/{native_id(video_id)}"


def host_of(url: str | None) -> str:
    try:
        return (urlparse(str(url or "").strip()).hostname or "").lower()
    except ValueError:
        return ""


def url_platform(url: str | None) -> str | None:
    """Platform of a web URL by its host (None = none of ours)."""
    return _HOSTS.get(host_of(url))


def is_soundcloud_host(host: str | None) -> bool:
    return _HOSTS.get((host or "").lower()) == SOUNDCLOUD


def tag_name(platform: str | None) -> str:
    """TXXX description of the platform id (YOUTUBE_ID, SOUNDCLOUD_ID, MIXCLOUD_ID, …)."""
    return info(platform).tag


# --------------------------------------------------------------------------- track pages

# Mixcloud: /<user>/<slug>/ ; reserved first segments are site pages, reserved second
# segments are user sub pages (uploads, favorites, playlists …), never a cloudcast.
_MC_TRACK_RE = re.compile(
    r"^https?://(?:www\.|m\.|beta\.)?mixcloud\.com/([^/?#]+)/([^/?#]+)/?(?:[?#].*)?$", re.I
)
MC_USER_RESERVED = {
    "discover",
    "search",
    "upload",
    "dashboard",
    "settings",
    "select",
    "pro",
    "about",
    "categories",
    "tag",
    "genres",
    "live",
    "player",
    "widget",
    "developers",
    "login",
    "signup",
    "favicon.ico",
}
MC_NOT_TRACK = {
    "uploads",
    "favorites",
    "listens",
    "stream",
    "playlists",
    "followers",
    "following",
    "reposts",
    "history",
    "shows",
    "posts",
    "albums",
}
# hearthis.at: /<user>/<track>/ ; /<user>/set/<slug>/ = playlist; reserved site paths
_HT_TRACK_RE = re.compile(
    r"^https?://(?:www\.)?hearthis\.at/([\w.-]+)/([\w.-]+)/?(?:[?#].*)?$", re.I
)
HT_USER_RESERVED = {
    "search",
    "charts",
    "feed",
    "genre",
    "genres",
    "categories",
    "upload",
    "login",
    "register",
    "settings",
    "about",
    "api-v2",
    "imprint",
    "privacy",
    "terms",
    "blog",
    "playlist.php",
    "live",
    "podcasts",
    "radio",
}
HT_NOT_TRACK = {"set", "sets", "likes", "reposts", "followers", "following", "playlists", "tracks"}


def mixcloud_track_url(text: str | None) -> str | None:
    """Canonical cloudcast page `https://www.mixcloud.com/<user>/<slug>/`, else None."""
    m = _MC_TRACK_RE.match((text or "").strip())
    if not m:
        return None
    user, slug = m.group(1), m.group(2)
    if user.lower() in MC_USER_RESERVED or slug.lower() in MC_NOT_TRACK:
        return None
    return f"https://www.mixcloud.com/{user}/{slug}/"


def mixcloud_id_from_url(text: str | None) -> str | None:
    """DB id `mc:<user>_<slug>` of a cloudcast URL (yt-dlp builds the same id), else None."""
    from urllib.parse import unquote

    url = mixcloud_track_url(text)
    if not url:
        return None
    m = _MC_TRACK_RE.match(url)
    assert m is not None
    native = f"{unquote(m.group(1))}_{unquote(m.group(2))}"
    vid = db_id(MIXCLOUD, native)
    return vid if is_valid_db_id(vid) else None


def hearthis_track_url(text: str | None) -> str | None:
    """Canonical track page `https://hearthis.at/<user>/<track>/`, else None."""
    m = _HT_TRACK_RE.match((text or "").strip())
    if not m:
        return None
    user, slug = m.group(1), m.group(2)
    if user.lower() in HT_USER_RESERVED or slug.lower() in HT_NOT_TRACK:
        return None
    return f"https://hearthis.at/{user}/{slug}/"


def track_page_ok(platform: str, url: str | None) -> bool:
    """A stored track page that may be handed to yt-dlp for a download (Mixcloud, hearthis)."""
    text = str(url or "")
    if not text.startswith("https://"):
        return False
    if platform == MIXCLOUD:
        return mixcloud_track_url(text) is not None
    if platform == HEARTHIS:
        return hearthis_track_url(text) is not None
    return False
