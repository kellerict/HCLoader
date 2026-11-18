"""The only module that imports yt-dlp (search, list_source, resolve, download).

Every yt-dlp call passes through `Throttle.before_request(kind)` first. 429 / bot-check errors
start the persistent backoff and are never retried; network errors get exactly one retry
(yt-dlp's own retries are therefore set to 0).

Phase 7a: two platforms, YouTube and SoundCloud. Every call goes through the throttle of its
platform (`Throttle.platform(name)`); the platform comes from the id (`sc:` prefix), the URL
(watchlist sources) or `search(..., platform=)`. SoundCloud flat listings use slightly
extended copies of yt-dlp's SoundCloud extractors (`_sc_flat_extractors`): they keep the track
metadata yt-dlp already received (duration, date, uploader) and skip one HEAD request per
entry for the thumbnail; docs/decisions.md «SoundCloud: yt-dlp-Extractor».
"""

from __future__ import annotations

import inspect
import logging
import os
import re
import shutil
import threading
from collections import deque
from collections.abc import Callable, Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import yt_dlp
from yt_dlp.utils import DownloadCancelled

from . import binaries, config, paths, platforms, preflight, series, sidecar, tagging, tracklist
from .config import UNSORTED, Settings
from .db import Database
from .filters import normalize
from .genre import detect_genre, genre_search_terms
from .i18n import tr
from .library import FS_LOCK
from .platforms import SOUNDCLOUD, YOUTUBE
from .redact import redact
from .throttle import (
    K_YTDLP_UPDATE,
    MetadataBusy,
    RequestBudgetSpent,
    Throttle,
    ThrottleError,
    WaitCancelled,
    is_rate_limit_error,
)

log = logging.getLogger(__name__)

PURPOSES = ("search", "list", "resolve", "download")
PHASE_DOWNLOAD = "laden"
PHASE_CONVERT = "konvertieren"
PHASE_TAG = "taggen"
IMAGE_EXTS = (".webp", ".jpg", ".jpeg", ".png")
AUDIO_EXTS = (".mp3", ".m4a", ".opus", ".ogg", ".webm", ".mp4", ".aac", ".flac", ".wav")
_ID_RE = re.compile(r"^[0-9A-Za-z_-]{11}$")
_URL_ID_RE = re.compile(r"(?:[?&]v=|youtu\.be/|/shorts/|/live/|/embed/)([0-9A-Za-z_-]{11})")
_CHANNEL_ROOT_RE = re.compile(
    r"^(https?://(?:www\.|m\.)?youtube\.com/(?:@[^/?#]+|channel/[^/?#]+|c/[^/?#]+|user/[^/?#]+))/?$"
)
_NETWORK_RE = re.compile(
    r"timed out|timeout|connection (?:reset|refused|aborted|error)|temporary failure|"
    r"network is unreachable|name or service not known|getaddrinfo|incompleteread|"
    r"remote end closed|urlopen error|transporterror",
    re.I,
)
_HTTP_403_RE = re.compile(r"http error 403", re.I)
# max. wait of a search/list/resolve for the metadata lock held by a download's extraction (m4)
METADATA_WAIT_S = 60.0
# Review Phase 4 m4: hard limit for reading a playlist from the end (`newest_last`); ~20 pages
NEWEST_LAST_MAX = 2000
# SoundCloud: transcodings whose stream URL yt-dlp resolves (one API request each, see
# `SoundcloudBaseIE._extract_info_dict`). Opus (64 kbps) is left out: never better than AAC 160
# / MP3 128, and every extra transcoding costs a request.
SC_FORMATS = ["http_aac", "hls_aac", "http_mp3", "hls_mp3"]
# lossless originals (downloadable tracks) are huge and cannot be tagged: prefer streams
SC_FORMAT = "bestaudio[ext!=wav][ext!=aiff][ext!=aif][ext!=flac]/bestaudio/best"
PREVIEW_REASON = "filter.preview"  # message key (app/locales)
_SC_USER_RESERVED = {
    "discover",
    "search",
    "stream",
    "you",
    "charts",
    "upload",
    "pages",
    "settings",
    "messages",
    "notifications",
    "people",
    "stations",
    "terms-of-use",
    "mobile",
    "signin",
    "logout",
    "jobs",
    "imprint",
    "popular",
    "tags",
}
_SC_USER_RE = re.compile(
    r"^https?://(?:www\.|m\.)?soundcloud\.com/([\w-]+)(?:/(tracks|sets/([\w:-]+)))?/?(?:[?#].*)?$",
    re.I,
)

_SC_TRACK_RE = re.compile(
    r"^https?://(?:www\.|m\.)?soundcloud\.com/([\w-]+)/([\w-]+)/?(?:[?#].*)?$", re.I
)
_SC_NOT_TRACK = {"tracks", "sets", "likes", "albums", "reposts", "popular-tracks", "following"}

__all__ = [
    "DownloadCancelled",
    "DownloadResult",
    "LocalError",
    "YtClient",
    "YtClientError",
    "build_ydl_opts",
    "extract_video_id",
    "soundcloud_track_url",
    "build_search_query",
    "normalize_entry",
]


class YtClientError(RuntimeError):
    """A yt-dlp operation failed. `rate_limited` is True if the backoff was triggered."""

    def __init__(self, message: str, *, rate_limited: bool = False) -> None:
        super().__init__(message)
        self.rate_limited = rate_limited


class PreviewOnly(YtClientError):
    """SoundCloud offers only the 30 s Go+ preview of this track (never downloaded)."""

    def __init__(self) -> None:
        super().__init__(tr("yt.preview_only", reason=tr(PREVIEW_REASON)))


class LocalError(YtClientError, preflight.LocalError):
    """A local precondition failed before any YouTube request (Review Phase 3 m2).
    code 'pot' | 'target'; the queue blocks instead of failing the entry."""

    def __init__(self, code: str, message: str) -> None:
        RuntimeError.__init__(self, message)
        self.code = code
        self.rate_limited = False


@dataclass
class DownloadResult:
    video_id: str
    status: str  # 'done' | 'skipped' | 'failed' | 'cancelled'
    file_path: Path | None = None
    title: str = ""
    skipped: bool = False
    error: str = ""
    rate_limited: bool = False
    cue_path: Path | None = None
    info: dict[str, Any] = field(default_factory=dict, repr=False)

    @property
    def ok(self) -> bool:
        return self.status in ("done", "skipped")


# --------------------------------------------------------------------------- helpers


def extract_video_id(url_or_id: str) -> str | None:
    """DB id of a single video/track: YouTube id or URL, or a SoundCloud DB id `sc:<id>`."""
    text = (url_or_id or "").strip()
    if _ID_RE.match(text) or platforms.is_valid_db_id(text):
        return text
    m = _URL_ID_RE.search(text)
    return m.group(1) if m else None


def soundcloud_track_url(text: str) -> str | None:
    """The permalink `https://soundcloud.com/<user>/<track>` (query/fragment cut off), else None.
    User roots, `/tracks`, `/sets/...`, `/likes` and reserved site paths are no track."""
    m = _SC_TRACK_RE.match((text or "").strip())
    if not m or m.group(1).lower() in _SC_USER_RESERVED or m.group(2).lower() in _SC_NOT_TRACK:
        return None
    return f"https://soundcloud.com/{m.group(1)}/{m.group(2)}"


def watch_url(video_id: str) -> str:
    """URL handed to yt-dlp for a single video/track, rebuilt from the DB id."""
    if platforms.platform_of(video_id) == SOUNDCLOUD:
        return platforms.soundcloud_track_api_url(video_id)
    return f"https://www.youtube.com/watch?v={video_id}"


def soundcloud_source_parts(url: str) -> tuple[str, str | None, str | None] | None:
    """(user, kind, set slug) of a SoundCloud user/tracks/set URL, else None.
    kind: None (user root), 'tracks' or 'sets'. Reserved paths (discover, search …) -> None."""
    m = _SC_USER_RE.match((url or "").strip())
    if not m or m.group(1).lower() in _SC_USER_RESERVED:
        return None
    kind = m.group(2)
    if kind and kind.lower().startswith("sets"):
        return m.group(1), "sets", m.group(3)
    return m.group(1), (kind.lower() if kind else None), None


def normalize_source_url(url: str) -> str:
    """Channel root URLs list only the 'Videos' tab (flat extraction of tabs is not recursive).
    SoundCloud: a user root lists the user's stream incl. reposts of other users; the
    watchlist reads `/tracks` (own uploads, newest first)."""
    text = url.strip()
    if platforms.url_platform(text) == SOUNDCLOUD:
        parts = soundcloud_source_parts(text)
        if parts and parts[1] is None:
            return f"https://soundcloud.com/{parts[0]}/tracks"
        return text
    m = _CHANNEL_ROOT_RE.match(text)
    return f"{m.group(1)}/videos" if m else text


def _date_from_ts(ts: Any) -> str:
    try:
        return datetime.fromtimestamp(int(ts), UTC).strftime("%Y%m%d")
    except (TypeError, ValueError, OverflowError, OSError):
        return ""


def _sc_thumbnail(entry: Mapping[str, Any]) -> str | None:
    thumbs = [t for t in entry.get("thumbnails") or [] if isinstance(t, Mapping)]
    for t in thumbs:
        if t.get("id") == "t500x500" and t.get("url"):
            return str(t["url"])
    return entry.get("thumbnail") or (thumbs[-1].get("url") if thumbs else None)


def is_preview_entry(entry: Mapping[str, Any]) -> bool:
    """SoundCloud Go+ snippet: API policy SNIP (kept by `_sc_flat_extractors`)."""
    return str(entry.get("sc_policy") or "").upper() == "SNIP"


def is_geo_blocked_entry(entry: Mapping[str, Any]) -> bool:
    """SoundCloud track not available in this region: API policy BLOCK (Review M1)."""
    return str(entry.get("sc_policy") or "").upper() == "BLOCK"


def normalize_entry(entry: Mapping[str, Any], platform: str = YOUTUBE) -> dict[str, Any]:
    """Map a yt-dlp info/entry dict to the fields HCLoader uses (see SPEC §9).
    `id` is the DB id (SoundCloud: `sc:<id>`), `channel_id` too (`sc:<user id>`)."""
    if platform == SOUNDCLOUD:
        return _normalize_sc(entry)
    vid = str(entry.get("id") or "")
    thumbs = entry.get("thumbnails") or []
    thumb = entry.get("thumbnail") or (thumbs[-1].get("url") if thumbs else None)
    upload = entry.get("upload_date")
    approx = False
    if not upload:
        # flat results: `timestamp` is only approximate (youtubetab:approximate_date)
        upload = _date_from_ts(entry.get("timestamp") or entry.get("release_timestamp"))
        approx = bool(upload)
    url = entry.get("webpage_url") or entry.get("url") or ""
    if not str(url).startswith("http") and vid:
        url = watch_url(vid)
    duration = entry.get("duration")
    return {
        "id": vid,
        "platform": YOUTUBE,
        "title": entry.get("title") or "",
        "channel_id": entry.get("channel_id") or entry.get("uploader_id") or "",
        "channel_name": entry.get("channel") or entry.get("uploader") or "",
        "channel_url": entry.get("channel_url") or entry.get("uploader_url") or "",
        "duration": int(duration) if isinstance(duration, (int, float)) else None,
        "upload_date": upload or "",
        "date_approx": approx,
        "view_count": entry.get("view_count"),
        "thumbnail": thumb,
        "url": url,
        "live_status": entry.get("live_status"),
        "preview": False,
        "geo_blocked": False,
    }


def _normalize_sc(entry: Mapping[str, Any]) -> dict[str, Any]:
    """SoundCloud: dates are exact (`created_at`), the duration comes in (float) seconds."""
    raw = str(entry.get("id") or "")
    vid = platforms.sc_db_id(raw) if raw and not raw.startswith(platforms.SC_PREFIX) else raw
    upload = entry.get("upload_date") or _date_from_ts(
        entry.get("timestamp") or entry.get("release_timestamp")
    )
    url = entry.get("webpage_url") or ""
    if (
        not url
        and "soundcloud.com/" in str(entry.get("url") or "")
        and "api" not in str(entry.get("url"))
    ):
        url = entry["url"]
    uploader_id = str(entry.get("uploader_id") or "")
    duration = entry.get("duration")
    return {
        "id": vid,
        "platform": SOUNDCLOUD,
        "title": entry.get("title") or entry.get("track") or "",
        "channel_id": platforms.sc_db_id(uploader_id) if uploader_id else "",
        "channel_name": entry.get("uploader") or "",
        "channel_url": entry.get("uploader_url") or "",
        "duration": int(round(duration)) if isinstance(duration, (int, float)) else None,
        "upload_date": upload or "",
        "date_approx": False,
        "view_count": entry.get("view_count"),
        "thumbnail": _sc_thumbnail(entry),
        "url": url,
        "live_status": None,
        "preview": is_preview_entry(entry),
        "geo_blocked": is_geo_blocked_entry(entry),
    }


def normalize_progress(d: Mapping[str, Any], phase: str = PHASE_DOWNLOAD) -> dict[str, Any]:
    """yt-dlp progress dict -> {phase, percent, speed, eta, downloaded_bytes, total_bytes}."""
    done = d.get("downloaded_bytes")
    total = d.get("total_bytes") or d.get("total_bytes_estimate")
    percent: float | None = None
    if d.get("status") == "finished":
        percent = 100.0
    elif done is not None and total:
        percent = round(min(100.0, done * 100.0 / total), 1)
    return {
        "phase": phase,
        "percent": percent,
        "speed": d.get("speed"),
        "eta": d.get("eta"),
        "downloaded_bytes": done,
        "total_bytes": total,
    }


class _YdlLogger:
    """Routes yt-dlp messages to our logging (no console output).

    Remembers the first 429 / bot-check message: yt-dlp often reports it only as a warning and
    carries on with other clients, so the caller starts the backoff afterwards (`rate_limit_hit`).
    """

    def __init__(self, platform: str = YOUTUBE) -> None:
        self.rate_limit_hit: str | None = None
        self.platform = platform

    def _watch(self, msg: str) -> None:
        if self.rate_limit_hit is None and is_rate_limit_error(msg, self.platform):
            self.rate_limit_hit = _clean_error(Exception(msg))[:200]

    def debug(self, msg: str) -> None:
        log.debug("yt-dlp: %s", msg)

    def info(self, msg: str) -> None:
        log.debug("yt-dlp: %s", msg)

    def warning(self, msg: str) -> None:
        self._watch(msg)
        log.warning("yt-dlp: %s", msg)

    def error(self, msg: str) -> None:
        self._watch(msg)
        log.error("yt-dlp: %s", msg)


# --------------------------------------------------------------------------- options


def build_ydl_opts(
    settings: Settings,
    purpose: str,
    platform: str = YOUTUBE,
    *,
    progress_hook: Callable[[dict], None] | None = None,
    postprocessor_hook: Callable[[dict], None] | None = None,
    logger: Any = None,
    target_dir: Path | None = None,
) -> dict[str, Any]:
    """The single place where yt-dlp options are built from the settings.

    purpose: 'search' / 'list' (flat), 'resolve' (full metadata, no download), 'download'.
    Checked against `yt_dlp/YoutubeDL.py` (2026.10.x): js_runtimes, extractor_args,
    sleep_interval_requests, ratelimit, retries, fragment_retries, extractor_retries,
    paths/outtmpl, playlist_items, ffmpeg_location, cookiesfrombrowser, writethumbnail.
    `remote_components` stays unset (nothing is fetched remotely; ejs comes from yt-dlp-ejs).
    `sleep_interval` is deliberately not used: `Throttle.before_request("download")` enforces
    the pause between downloads (persisted, across YoutubeDL instances).
    `download_archive` is deliberately not passed: HCLoader writes the archive itself, only
    after the file is tagged, moved and stored as `done` (docs/decisions.md).
    `max_downloads` is deliberately not set: yt-dlp raises MaxDownloadsReached after the (only)
    successful download and drops the info dict. The single-video guarantee comes from
    `download()` (video id required, URL rebuilt) plus `playlist_items=1` and a `_type` check.

    Phase 7a, `platform`: PO token, Deno (`js_runtimes`) and `youtubetab:approximate_date` only
    for YouTube. SoundCloud gets its own request spacing / rate limit (`settings.soundcloud`),
    the `soundcloud:formats` list (SC_FORMATS: fewer format-info requests) and, with
    `download.keep_original_soundcloud`, no MP3 conversion.
    """
    if purpose not in PURPOSES:
        raise ValueError(f"Unknown purpose: {purpose}")
    if platform not in platforms.PLATFORMS:
        raise ValueError(f"Unknown platform: {platform}")
    net = settings.network
    limits = settings.throttle_for(platform)
    opts: dict[str, Any] = {
        "quiet": True,
        "no_warnings": False,
        "noprogress": True,
        "logger": logger if logger is not None else _YdlLogger(platform),
        "socket_timeout": 30,
        "retries": 0,
        "fragment_retries": 0,
        "extractor_retries": 0,
        "sleep_interval_requests": limits.sleep_requests,
        "noplaylist": purpose in ("resolve", "download"),
        "extractor_args": _extractor_args(settings, purpose, platform),
        # SoundCloud client_id etc.: keep yt-dlp's cache in the data folder (portable mode)
        "cachedir": str(config.app_home() / "cache" / "yt-dlp"),
    }
    if platform == YOUTUBE:
        deno = binaries.deno_path()
        opts["js_runtimes"] = {"deno": {"path": str(deno)} if deno.exists() else {}}
    if net.proxy:
        opts["proxy"] = net.proxy
    if net.cookies_from_browser and platform == YOUTUBE:
        opts["cookiesfrombrowser"] = (net.cookies_from_browser,)
        log.warning(
            tr("yt.cookies_active", browser=net.cookies_from_browser),
        )
    if purpose in ("search", "list"):
        opts["extract_flat"] = "in_playlist"
        opts["skip_download"] = True
        opts["lazy_playlist"] = True
    elif purpose == "resolve":
        opts["skip_download"] = True
        # YouTube: one extractor retry for transient player errors. SoundCloud: the
        # RetryManager in `SoundcloudIE._real_extract` retries exactly on 429 and without
        # `retry_sleep`, i.e. a second request right after the rate limit (Review m4) -> 0.
        opts["extractor_retries"] = 0 if platform == SOUNDCLOUD else 1
    else:
        _download_opts(opts, settings, target_dir, platform)
        if progress_hook:
            opts["progress_hooks"] = [progress_hook]
        if postprocessor_hook:
            opts["postprocessor_hooks"] = [postprocessor_hook]
    return opts


def _extractor_args(
    settings: Settings, purpose: str = "resolve", platform: str = YOUTUBE
) -> dict[str, dict[str, list[str]]]:
    """PO-token provider args; flat purposes also get `youtubetab:approximate_date`.

    yt-dlp reads `approximate_date` via `_configuration_arg(...)` as a list; a non-empty list
    (even `['']`) is truthy and makes flat entries carry a `timestamp` parsed from 'vor X Jahren'.
    The keys (youtube / youtubepot-* / youtubetab) are distinct, so merging is plain assignment.
    SoundCloud: only `soundcloud:formats` (read with `ie_key=SoundcloudIE` for every SoundCloud
    extractor), nothing of YouTube.
    """
    if platform == SOUNDCLOUD:
        return {"soundcloud": {"formats": list(SC_FORMATS)}}
    net = settings.network
    args: dict[str, dict[str, list[str]]] = {}
    if purpose in ("search", "list"):
        args["youtubetab"] = {"approximate_date": [""]}
    if net.po_token_mode == "off":
        args["youtube"] = {"fetch_pot": ["never"]}
    elif net.po_token_mode == "script":
        args["youtubepot-bgutilscript"] = {"server_home": [str(binaries.provider_server_dir())]}
    elif net.po_token_mode == "http":
        args["youtubepot-bgutilhttp"] = {"base_url": [f"http://127.0.0.1:{net.po_token_port}"]}
    return args


def _download_opts(
    opts: dict[str, Any], settings: Settings, target_dir: Path | None, platform: str = YOUTUBE
) -> None:
    dl = settings.download
    target = target_dir or settings.target_dir_path()
    tmp = paths.tmp_dir(target)
    rate_mb = settings.throttle_for(platform).limit_rate_mb
    sc = platform == SOUNDCLOUD
    opts.update(
        {
            "format": SC_FORMAT if sc else "bestaudio/best",
            "ratelimit": int(rate_mb * 1024 * 1024) if rate_mb and rate_mb > 0 else None,
            "playlist_items": "1",
            "paths": {"home": str(tmp), "temp": str(tmp)},
            # temp name = file id: `sc-<id>` never collides with a YouTube id of the same digits
            "outtmpl": {"default": f"{platforms.SC_FILE_PREFIX if sc else ''}%(id)s.%(ext)s"},
            "writethumbnail": bool(dl.embed_cover or dl.write_cover_jpg),
            "overwrites": True,
            "continuedl": True,
        }
    )
    ffmpeg = binaries.ffmpeg_path()
    if ffmpeg.exists():
        opts["ffmpeg_location"] = str(ffmpeg)
    if sc and dl.keep_original_soundcloud:
        return  # SoundCloud streams are 128-160 kbps: MP3 320 would only inflate the file
    if dl.audio_format == "mp3":
        quality = "0" if dl.mp3_quality == "v0" else "320"
        opts["postprocessors"] = [
            {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": quality}
        ]


MAX_GENRE_TERMS = 2


def build_search_query(
    query: str,
    *,
    genre: str | None = None,
    year: int | None = None,
    settings: Settings,
) -> str:
    """Query text for YouTube: user query + up to 2 genre terms + year (if `append_year`).

    Only the first genre keywords (they are the most distinctive ones) are appended, and only
    if the query does not already contain them; long keyword lists would narrow the search.
    """
    parts = [(query or "").strip()]
    if genre:

        def flat(text: str) -> str:
            return normalize(text).replace("-", "").replace(" ", "")

        chosen: list[str] = []
        for term in genre_search_terms(genre, settings.genres.items):
            key = flat(term)
            if key and key not in flat(parts[0]) and all(key != flat(c) for c in chosen):
                chosen.append(term)
        terms = chosen
        parts.extend(terms[:MAX_GENRE_TERMS])
    if (
        year
        and settings.search.append_year
        and not re.search(rf"(?<!\d){int(year)}(?!\d)", parts[0])
    ):
        parts.append(str(int(year)))
    return " ".join(p for p in parts if p)


# --------------------------------------------------------------------------- client


class YtClient:
    """High-level yt-dlp wrapper. `settings_provider`: callable returning Settings (or Settings)."""

    def __init__(
        self,
        settings_provider: Callable[[], Settings] | Settings,
        db: Database,
        throttle: Throttle,
        pot_server: binaries.PotServer | None = None,
    ) -> None:
        self._settings = settings_provider
        self.db = db
        self.throttle = throttle
        # externally managed (PotWatchdog): never started/stopped here (port conflict otherwise)
        self._external_pot = pot_server is not None
        self._pot_server: binaries.PotServer | None = pot_server
        self._lock = threading.Lock()

    @property
    def settings(self) -> Settings:
        return self._settings() if callable(self._settings) else self._settings

    def close(self) -> None:
        if self._pot_server and not self._external_pot:
            self._pot_server.stop()
            self._pot_server = None

    # -- preparation

    def _prepare(self, settings: Settings, platform: str = YOUTUBE) -> None:
        """Environment for the bgutil provider (token TTL, HTTP server child process).

        `TOKEN_TTL` is read by the provider (script mode: token cache of generate_once; HTTP
        mode: the server process inherits it at start) in whole hours (bgutil 2.0.2 README:
        "in hours, defaults to 6"). Fractions are not safe (integer parsing), so the setting is
        rounded to whole hours, minimum 1 (docs/decisions.md).
        """
        net = settings.network
        os.environ["TOKEN_TTL"] = str(max(1, round(net.po_token_ttl_hours)))
        if net.po_token_mode != "http" or platform != YOUTUBE:
            return
        if self._external_pot:
            if not self._pot_server.running():  # type: ignore[union-attr]
                raise LocalError("pot", tr("yt.pot_not_running"))
            return
        with self._lock:
            if self._pot_server is None or self._pot_server.port != net.po_token_port:
                if self._pot_server:
                    self._pot_server.stop()
                self._pot_server = binaries.PotServer(net.po_token_port)
            if not self._pot_server.start():
                raise LocalError("pot", tr("yt.pot_not_ready"))

    def _extract(
        self,
        kind: str,
        url: str,
        opts: dict[str, Any],
        *,
        download: bool = False,
        settings: Settings,
        cancel_event: threading.Event | None = None,
        retry: bool = False,
        on_request: Callable[[], None] | None = None,
        handler: Callable[[Any, dict[str, Any]], dict[str, Any]] | None = None,
        platform: str = YOUTUBE,
        window: tuple[str, int] | None = None,
    ) -> dict[str, Any]:
        """One yt-dlp call behind the throttle and the metadata lock (m4) of `platform`.

        `handler(ydl, ie_result)` (metadata calls only): extract with `process=False` and let
        the handler build the result (used for `newest_last`, which pages itself).

        Metadata calls (search/list/resolve) hold `Throttle.metadata_lock` for the whole call
        and give up after METADATA_WAIT_S (MetadataBusy). A download holds it only while
        yt-dlp extracts (`extract_info(process=False)`: webpage, player, API, PO token) and
        releases it before `process_ie_result(download=True)` starts the media transfer, so
        a search may run while a mix is being loaded, but never during its extraction.
        The download takes the lock *after* `before_request`, so the pause between downloads
        never blocks searches. `on_request` is called right before the first YouTube request
        (m2: only then did the attempt reach the network).
        SoundCloud metadata calls register `_sc_flat_extractors(window)` on the YoutubeDL.
        """
        th = self.throttle.platform(platform)
        th.check_backoff()
        self._prepare(settings, platform)
        logger = opts.get("logger")
        try:
            if download:
                th.before_request(
                    kind, cancel_event=cancel_event, count_attempt=not retry, retry=retry
                )
                with yt_dlp.YoutubeDL(opts) as ydl:
                    with th.metadata_lock(cancel_event=cancel_event):
                        # R2-m1: a search may have run while we waited for the lock
                        th.request_spacing(cancel_event)
                        if on_request:
                            on_request()
                        ie_result = ydl.extract_info(url, download=False, process=False)
                    if ie_result is None:
                        raise YtClientError(tr("yt.no_data"))
                    if platform == SOUNDCLOUD and _only_previews(ie_result):
                        raise PreviewOnly
                    if ie_result.get("_type") == "playlist":
                        raise YtClientError(tr("yt.not_single_video"))
                    if ie_result.get("_type") not in (None, "video"):  # R2-n1: url/url_transparent
                        raise YtClientError(tr("yt.not_direct_video"))
                    info = ydl.process_ie_result(ie_result, download=True)
                    if info is None:
                        raise YtClientError(tr("yt.no_data"))
                    return ydl.sanitize_info(info)  # type: ignore[no-any-return]
            with th.metadata_lock(timeout=METADATA_WAIT_S, cancel_event=cancel_event):
                th.before_request(kind, cancel_event=cancel_event)
                if on_request:
                    on_request()
                try:
                    with yt_dlp.YoutubeDL(opts) as ydl:
                        if platform == SOUNDCLOUD:
                            _install_sc_flat_extractors(ydl, window)
                        info = ydl.extract_info(url, download=False, process=handler is None)
                        if info is None:
                            raise YtClientError(tr("yt.no_data"))
                        if handler is not None:
                            info = handler(ydl, info)
                        return ydl.sanitize_info(info)  # type: ignore[no-any-return]
                finally:
                    # m4: a multi-page listing ends long after its slot; space from now
                    th.mark_request()
        finally:
            hit = getattr(logger, "rate_limit_hit", None)
            if hit:
                th.trigger_backoff(hit)

    def _metadata_call(
        self,
        kind: str,
        url: str,
        opts: dict[str, Any],
        settings: Settings,
        *,
        cancel_event: threading.Event | None = None,
        handler: Callable[[Any, dict[str, Any]], dict[str, Any]] | None = None,
        platform: str = YOUTUBE,
        window: tuple[str, int] | None = None,
    ):
        try:
            return self._extract(
                kind,
                url,
                opts,
                settings=settings,
                cancel_event=cancel_event,
                handler=handler,
                platform=platform,
                window=window,
            )
        except (DownloadCancelled, MetadataBusy, WaitCancelled):
            raise
        except Exception as exc:
            if isinstance(exc, YtClientError):
                raise
            limited = self.throttle.platform(platform).handle_error(exc)
            if isinstance(exc, (yt_dlp.utils.YoutubeDLError, OSError)) or limited:
                raise YtClientError(_clean_error(exc), rate_limited=limited) from exc
            raise

    # -- metadata

    def search(
        self,
        query: str,
        n: int | None = None,
        *,
        genre: str | None = None,
        year: int | None = None,
        cancel_event: threading.Event | None = None,
        platform: str = YOUTUBE,
    ) -> list[dict[str, Any]]:
        """Flat search; genre search terms and (with `search.append_year`) the year are appended.
        `platform` 'soundcloud': `scsearchN:` (one API request for N <= 200), entries carry
        `platform` and DB ids `sc:<id>`."""
        settings = self.settings
        if platform not in platforms.PLATFORMS:
            raise YtClientError(tr("api.unknown_platform_x", platform=platform))
        if platform == SOUNDCLOUD and not settings.soundcloud.enabled:
            raise YtClientError(tr("sc.off_in_settings"))
        n = n or settings.search.results_count
        full_query = build_search_query(query, genre=genre, year=year, settings=settings)
        opts = build_ydl_opts(settings, "search", platform)
        prefix = "scsearch" if platform == SOUNDCLOUD else "ytsearch"
        info = self._metadata_call(
            "search",
            f"{prefix}{int(n)}:{full_query}",
            opts,
            settings,
            cancel_event=cancel_event,
            platform=platform,
            window=("head", int(n)),
        )
        return [
            normalize_entry(e, platform) for e in info.get("entries") or [] if e and e.get("id")
        ]

    def list_source(
        self,
        url: str,
        max_entries: int | None = None,
        *,
        newest_last: bool = False,
        cancel_event: threading.Event | None = None,
    ) -> list[dict[str, Any]]:
        """Flat listing, newest first. `newest_last`: the source appends new videos at the end
        (playlists); the last `max_entries` are returned in reverse order. The whole playlist
        has to be paged (~100 entries per request, `sleep_interval_requests` between pages),
        at most NEWEST_LAST_MAX entries (m4), see docs/decisions.md."""
        settings = self.settings
        platform = platforms.url_platform(url) or YOUTUBE
        if platform == SOUNDCLOUD and not settings.soundcloud.enabled:
            raise YtClientError(tr("sc.off_in_settings"))
        max_entries = int(max_entries or settings.schedule.entries_per_source)
        opts = build_ydl_opts(settings, "list", platform)
        handler = None
        if newest_last:
            handler = _newest_last_handler(max_entries, cancel_event)
        else:
            opts["playlistend"] = max_entries
        info = self._metadata_call(
            "list",
            normalize_source_url(url),
            opts,
            settings,
            cancel_event=cancel_event,
            handler=handler,
            platform=platform,
            window=("tail" if newest_last else "head", max_entries),
        )
        entries = [
            normalize_entry(e, platform) for e in info.get("entries") or [] if e and e.get("id")
        ]
        count = info.get("playlist_count")
        return SourceListing(
            entries[: int(max_entries)],
            source_name=listing_name(info, url, platform),
            total=count if isinstance(count, int) and count >= 0 else None,
        )

    def list_source_paged(
        self,
        url: str,
        *,
        limit: int,
        on_entries: Callable[[list[dict[str, Any]], int], None],
        start: int = 0,
        requests_per_hour: int = 120,
        max_requests: int | None = None,
        on_info: Callable[[PagedListing], None] | None = None,
        on_request: Callable[[], None] | None = None,
        cancel_event: threading.Event | None = None,
    ) -> PagedListing:
        """v0.4.0 «Read everything (once)»: walk the flat listing of a channel/playlist/user/set
        page by page, at most `limit` entries, in listing order.

        Every HTTP request yt-dlp makes for the listing (webpage, API pages, SoundCloud
        client-id discovery …) passes `_PagedGate`: entries received so far are handed to
        `on_entries(batch, position)` (position = entries of the listing walked, the resume
        cursor), then the request waits for its pacing slot (`Throttle.backfill_pace`,
        `requests_per_hour`) *without any lock* and only then takes the metadata lock for the
        request itself (`Throttle.backfill_request`: backoff check, `sleep_requests` spacing) -
        so searches, checks and downloads are never held up by the pacing (Review v0.4.0 M1).
        `max_requests` (headless budget) raises RequestBudgetSpent before a further request. A
        resume (`start` > 0) has to walk the first `start` entries again (YouTube/SoundCloud
        only know "next page" tokens); they are skipped without processing
        (`PagedListing.walked` counts them). `cancel_event` or a yt-dlp update started by
        another process stop before the next entry/request (WaitCancelled; entries not yet
        handed over are dropped, the cursor stays). 429/bot check: backoff +
        YtClientError(rate_limited)."""
        settings = self.settings
        platform = platforms.url_platform(url) or YOUTUBE
        if platform == SOUNDCLOUD and not settings.soundcloud.enabled:
            raise YtClientError(tr("sc.off_in_settings"))
        limit = max(1, int(limit))
        start = max(0, int(start))
        opts = build_ydl_opts(settings, "list", platform)
        opts["sleep_interval_requests"] = 0  # the gate spaces every request itself
        th = self.throttle.platform(platform)
        th.check_backoff()
        self._prepare(settings, platform)
        listing = PagedListing(position=start)
        db = self.db
        update_mark = db.get_state(K_YTDLP_UPDATE) if db is not None else None

        def updated() -> bool:
            """M3: a yt-dlp update (GUI) started since this listing began -> stop."""
            return db is not None and db.get_state(K_YTDLP_UPDATE) != update_mark

        gate = _PagedGate(
            th,
            listing,
            on_entries,
            per_hour=requests_per_hour,
            max_requests=max_requests,
            on_request=on_request,
            cancel_event=cancel_event,
            stopped=updated,
        )
        logger = opts.get("logger")
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                gate.install(ydl)
                if platform == SOUNDCLOUD:
                    _install_sc_flat_extractors(ydl, ("head", limit))
                ie = ydl.extract_info(normalize_source_url(url), download=False, process=False)
                if ie is None:
                    raise YtClientError(tr("yt.no_data"))
                if ie.get("_type") in ("url", "url_transparent") and ie.get("url"):
                    # m4: redirected URL - resolve the target lazily as well (cursor per page)
                    target = ydl.extract_info(ie["url"], download=False, process=False)
                    if target is not None:
                        ie = target
                if ie.get("_type") not in ("playlist", "multi_video"):
                    # still no listing: let yt-dlp resolve it (flat, at most `limit` entries)
                    ydl.params["playlistend"] = limit
                    ie = ydl.process_ie_result(ie, download=False)
                    if ie is None:
                        raise YtClientError(tr("yt.no_data"))
                count = ie.get("playlist_count")
                listing.total = count if isinstance(count, int) and count >= 0 else None
                listing.source_name = listing_name(ie, url, platform)
                if on_info is not None:
                    on_info(listing)
                walked = 0
                entries = iter(ie.get("entries") or ())
                while walked < limit:
                    gate.check_stop(external=False)
                    try:
                        entry = next(entries)
                    except StopIteration:
                        listing.complete = True
                        break
                    walked += 1
                    listing.walked = walked
                    if walked <= start:
                        continue
                    gate.add(entry, walked, platform)
                gate.check_stop(external=False)
                gate.flush()
                listing.capped = not listing.complete
                return listing
        except WaitCancelled:
            raise  # m3: pause/cancel/delete/update - entries not yet handed over are dropped
        except (DownloadCancelled, MetadataBusy, RequestBudgetSpent):
            gate.flush_quietly()
            raise
        except Exception as exc:
            gate.flush_quietly()
            if isinstance(exc, YtClientError):
                raise
            limited = th.handle_error(exc)
            if isinstance(exc, (yt_dlp.utils.YoutubeDLError, OSError)) or limited:
                raise YtClientError(_clean_error(exc), rate_limited=limited) from exc
            raise
        finally:
            hit = getattr(logger, "rate_limit_hit", None)
            if hit:
                th.trigger_backoff(hit)

    def resolve(self, video_id: str) -> dict[str, Any]:
        settings = self.settings
        permalink = soundcloud_track_url(video_id)
        if permalink:  # SoundCloud permalink: the id is only known after this request
            vid, url = "", permalink
            platform = SOUNDCLOUD
        else:
            vid = extract_video_id(video_id) or video_id
            platform = platforms.platform_of(vid)
            url = watch_url(vid)
        opts = build_ydl_opts(settings, "resolve", platform)
        info = self._metadata_call("resolve", url, opts, settings, platform=platform)
        out = normalize_entry(info, platform)
        out.update(
            {
                "description": info.get("description") or "",
                "chapters": info.get("chapters") or [],
                "tags": info.get("tags") or [],
                "categories": info.get("categories") or [],
            }
        )
        return out

    # -- download

    def in_archive(self, video_id: str) -> bool:
        archive = config.archive_path()
        try:
            lines = archive.read_text(encoding="utf-8").splitlines()
        except OSError:
            return False
        return platforms.archive_line(video_id) in (ln.strip() for ln in lines)

    def _record_archive(self, video_id: str) -> None:
        """Append `youtube <id>` / `soundcloud <id>` to the archive (yt-dlp format); only called
        after the video is `done`."""
        if self.in_archive(video_id):
            return
        archive = config.archive_path()
        try:
            archive.parent.mkdir(parents=True, exist_ok=True)
            with archive.open("a", encoding="utf-8", newline="\n") as fh:
                fh.write(platforms.archive_line(video_id) + "\n")
        except OSError as exc:
            log.warning(tr("yt.archive_not_writable", path=archive, error=exc))

    def download(
        self,
        url_or_id: str,
        *,
        on_progress: Callable[[dict[str, Any]], None] | None = None,
        cancel_event: threading.Event | None = None,
        on_commit: Callable[[], bool] | None = None,
    ) -> DownloadResult:
        """Full pipeline: skip check -> throttle -> yt-dlp into .tmp -> tags -> move -> DB.

        `on_commit` is asked once right before the file is moved into the library (point of
        no return); returning False aborts like a cancel. The queue uses it to decide
        atomically whether a cancel request still takes effect (Review Phase 3 n3).
        Local preconditions (PO-token server, writable target) raise LocalError before any
        request; the DB status is left unchanged then.

        Only single videos: a video id (or a URL containing one) is required. Playlist, channel
        and search URLs are refused before the throttle, and the URL passed to yt-dlp is always
        rebuilt from the id (B1).
        Raises ThrottleError subclasses (BackoffActive / LimitReached) if downloads are blocked.
        Download failures are returned as DownloadResult(status='failed'/'cancelled').
        """
        settings = self.settings
        vid = extract_video_id(url_or_id)
        if not vid:
            msg = tr("yt.no_video_url")
            log.error(tr("yt.download_refused", target=msg, error=(url_or_id or "")[:100]))
            return DownloadResult("", "failed", error=msg)
        url = watch_url(vid)
        platform = platforms.platform_of(vid)
        stem = platforms.file_id(vid)

        skipped = self._skip_result(vid)
        if skipped:
            return skipped
        if platform == SOUNDCLOUD and not settings.soundcloud.enabled:
            return DownloadResult(vid, "failed", error=tr("sc.off_in_settings"))
        th = self.throttle.platform(platform)
        th.check_download()

        target_dir = settings.target_dir_path()
        tmp = paths.tmp_dir(target_dir)
        self.check_local(settings, target_dir, platform)
        config.archive_path().parent.mkdir(parents=True, exist_ok=True)
        previous = self.db.get_video(vid)
        prev_status = previous["status"] if previous else "new"
        prev_error = previous.get("error") if previous else None
        self.db.upsert_video({"id": vid})
        self.db.set_status(vid, "downloading")
        _cleanup_tmp(tmp, stem, keep_partial=True)

        emit = on_progress or (lambda _d: None)
        phase = {"value": PHASE_DOWNLOAD}

        def check_cancel() -> None:
            if cancel_event is not None and cancel_event.is_set():
                raise DownloadCancelled

        def progress_hook(d: dict) -> None:
            check_cancel()
            emit(normalize_progress(d, phase["value"]))

        def pp_hook(d: dict) -> None:
            check_cancel()
            if d.get("status") in ("started", "processing"):
                phase["value"] = PHASE_CONVERT
                emit({**normalize_progress({}, PHASE_CONVERT), "percent": None})

        opts = build_ydl_opts(
            settings,
            "download",
            platform,
            progress_hook=progress_hook,
            postprocessor_hook=pp_hook,
            target_dir=target_dir,
        )
        try:
            info = self._download_with_retry(
                url, opts, settings, check_cancel, cancel_event, platform
            )
            check_cancel()
            emit({**normalize_progress({}, PHASE_TAG), "percent": None})
            return self._finish(info, vid, settings, target_dir, tmp, check_cancel, on_commit)
        except (DownloadCancelled, WaitCancelled):
            return self._cancelled(vid, tmp, prev_status)
        except (ThrottleError, LocalError):
            self._restore_status(vid, prev_status, prev_error)
            raise
        except PreviewOnly as exc:
            self.db.upsert_video({"id": vid, "preview": True})
            return self._fail(vid, tmp, str(exc))
        except Exception as exc:
            limited = th.handle_error(exc)
            msg = _failure_reason(exc)
            if not isinstance(exc, (yt_dlp.utils.YoutubeDLError, OSError, YtClientError)):
                log.exception(tr("yt.unexpected", id=vid))
            elif isinstance(exc, OSError):
                log.debug("Local OS error while downloading %s", vid, exc_info=True)
            keep = (
                not limited
                and not _HTTP_403_RE.search(str(exc))
                and bool(_NETWORK_RE.search(str(exc)))
            )
            return self._fail(vid, tmp, msg, rate_limited=limited, keep_partial=keep)

    def check_local(
        self,
        settings: Settings | None = None,
        target_dir: Path | None = None,
        platform: str = YOUTUBE,
    ) -> None:
        """Local preconditions of a download (m2): PO-token server ready (YouTube only), target
        writable. Raises LocalError('pot' | 'target'); makes no request."""
        settings = settings or self.settings
        target_dir = target_dir or settings.target_dir_path()
        self._prepare(settings, platform)
        err = preflight.check_target(target_dir)
        if err is not None:
            raise LocalError(err.code, str(err))

    def _restore_status(self, vid: str, prev_status: str, prev_error: str | None) -> None:
        status = "queued" if prev_status == "downloading" else prev_status
        if self.db.is_known(vid):
            self.db.set_status(vid, status, error=prev_error)

    def _skip_result(self, vid: str) -> DownloadResult | None:
        row = self.db.get_video(vid)
        if row and row["status"] == "done":
            log.info(tr("yt.skipped_done", id=vid))
            fp = Path(row["file_path"]) if row.get("file_path") else None
            return DownloadResult(vid, "skipped", fp, row.get("title") or "", skipped=True)
        if self.in_archive(vid):
            log.info(tr("yt.skipped_archive", id=vid))
            return DownloadResult(vid, "skipped", None, (row or {}).get("title") or "", True)
        return None

    def _download_with_retry(
        self,
        url: str,
        opts: dict[str, Any],
        settings: Settings,
        check_cancel: Callable[[], None],
        cancel_event: threading.Event | None = None,
        platform: str = YOUTUBE,
    ) -> dict[str, Any]:
        attempt = 0
        # set by _extract right before the first request: local errors (PO-token server,
        # throttle refusals, a cancelled wait) never count as a download end (m2)
        reached = {"network": False}

        def mark_request() -> None:
            reached["network"] = True

        try:
            while True:
                try:
                    return self._extract(
                        "download",
                        url,
                        opts,
                        download=True,
                        settings=settings,
                        cancel_event=cancel_event,
                        retry=attempt > 0,
                        on_request=mark_request,
                        platform=platform,
                    )
                except (ThrottleError, WaitCancelled, DownloadCancelled, LocalError, PreviewOnly):
                    raise
                except Exception as exc:
                    if not reached["network"]:
                        raise
                    msg = str(exc)
                    if is_rate_limit_error(msg, platform) or _HTTP_403_RE.search(msg):
                        raise
                    if attempt < 1 and _NETWORK_RE.search(msg):
                        attempt += 1
                        log.warning(tr("yt.network_retry", error=_clean_error(exc)))
                        check_cancel()
                        continue
                    raise
        finally:
            if reached["network"]:
                self.throttle.platform(platform).mark_download_end()

    def _finish(
        self,
        info: dict[str, Any],
        vid: str,
        settings: Settings,
        target_dir: Path,
        tmp: Path,
        check_cancel: Callable[[], None],
        on_commit: Callable[[], bool] | None = None,
    ) -> DownloadResult:
        dl = settings.download
        st = settings.storage
        platform = platforms.platform_of(vid)
        stem = platforms.file_id(vid)
        audio = _find_audio(info, tmp, stem)
        if audio is None:
            raise YtClientError(tr("yt.audio_not_found"))
        meta = normalize_entry(info, platform)
        row = self.db.get_video(vid) or {}
        manual = row.get("genre") if row.get("genre_manual") else None
        source_default = None
        if row.get("source_id") is not None:
            src = self.db.get_source(row["source_id"])
            source_default = (src or {}).get("default_genre") or None
        description = info.get("description") or ""
        genre = detect_genre(
            meta["title"],
            settings.genres.items,
            manual=manual,
            source_default=source_default,
            description=description if settings.filters.match_description else None,
        )
        if genre == UNSORTED and manual is None:
            # Review Phase 3 M1: the genre chip of the search was stored as a non-manual hint
            # (discover.store_results). Priority: manual > source > keyword > chip > Unsortiert.
            stored = row.get("genre")
            if stored and stored != UNSORTED and stored in {g.name for g in settings.genres.items}:
                genre = stored
        title = paths.clean_title(meta["title"], st.title_cleanup_patterns)
        channel = meta["channel_name"]
        artist = channel
        if st.artist_from_title:
            artist = paths.parse_artist_from_title(title) or channel
        url = info.get("webpage_url") or row.get("url") or watch_url(vid)
        tag_meta = {
            "title": title,
            "artist": artist,
            "albumartist": artist,
            "album": title,
            "genre": genre,
            "date": meta["upload_date"],
            "url": url,
            "id": platforms.native_id(vid),
            "platform": platform,
            "source": platforms.label(platform),
        }
        # v0.3.0: festival/series from the full title + description (offline, manual values
        # stay); TXXX:FESTIVAL … and album = edition, path placeholders {festival} …
        if row:
            series.detect_and_store(self.db, settings, [vid], descriptions={vid: description})
        fest = series.tag_fields(self.db, vid)
        series.apply_to_tags(tag_meta, fest, settings)

        cover = None
        thumb = _find_thumbnail(tmp, stem)
        if thumb and (dl.embed_cover or dl.write_cover_jpg):
            try:
                cover = tagging.make_square_cover(thumb, ffmpeg=binaries.ffmpeg_path())
            except tagging.TaggingError as exc:
                log.warning(tr("yt.cover_skipped", error=exc))
        # always resolved: the sidecar keeps them for a later re-tag even if CUE/CHAP are off
        chapters = tagging.chapters_from_info(info)
        duration = float(meta["duration"]) if meta["duration"] else None
        check_cancel()
        tagging.write_tags(
            audio,
            tag_meta,
            cover_jpeg=cover if dl.embed_cover else None,
            chapters=chapters,
            id3_chapters=dl.write_id3_chapters,
            total_duration=duration,
        )

        check_cancel()
        if on_commit is not None and not on_commit():
            raise DownloadCancelled  # cancelled at the last moment: nothing moved yet
        target = paths.build_target_path(
            target_dir,
            st.path_template,
            {
                "id": stem,
                "platform": platform,
                "title": title,
                "artist": artist,
                "channel": channel,
                "genre": genre,
                "upload_date": meta["upload_date"],
                **series.path_values(fest),
            },
            ext=audio.suffix,
            max_title_length=st.max_title_length,
            max_path_length=st.max_path_length,
        )
        with FS_LOCK:  # n1: library clean-up must not remove the folder between mkdir and move
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(audio), str(target))

        # The file is in place: from here on nothing is fatal (a re-download would be wasteful).
        cue_path = None
        if chapters and dl.write_cue:
            try:
                cue_path = tagging.write_cue(target, chapters, performer=artist, title=title)
            except Exception as exc:
                log.warning(tr("yt.cue_not_written", path=vid, error=exc))
        if cover and dl.write_cover_jpg:
            try:
                cover_file = target.parent / "cover.jpg"
                if not cover_file.exists():
                    cover_file.write_bytes(cover)
            except OSError as exc:
                log.warning(tr("library.cover_jpg_failed", path=vid, error=exc))
        _cleanup_tmp(tmp, stem)

        self.db.upsert_video(
            {
                "id": vid,
                "title": meta["title"],
                "channel_id": meta["channel_id"],
                "channel_name": channel,
                "duration": meta["duration"],
                "upload_date": meta["upload_date"],
                "view_count": meta["view_count"],
                "thumbnail": meta["thumbnail"],
                "genre": genre,
                "url": url,
                "channel_url": meta.get("channel_url") or None,
            }
        )
        self.db.set_status(vid, "done", file_path=str(target))
        side = sidecar.build(
            {**meta, "url": url},
            chapters=chapters,
            description=description,
            genre=genre,
            source=platforms.label(platform),
        )
        sidecar.write(vid, side)
        self._record_archive(vid)  # only after `done`: no crash window blocks a video forever
        # v0.6.0: tracklist for «Tracklist search» from chapters/description (offline, never fatal)
        tracklist.safe_refresh(self.db, vid, data=side, path=target)
        log.info(tr("yt.downloaded", id=vid, path=target))
        return DownloadResult(vid, "done", target, title, cue_path=cue_path, info=meta)

    def _cancelled(self, vid: str, tmp: Path, prev_status: str) -> DownloadResult:
        """Abort: keep resumable `.part` files, put the video back to its previous status."""
        _cleanup_tmp(tmp, platforms.file_id(vid), keep_partial=True)
        self._restore_status(vid, prev_status, "Abgebrochen")
        log.info(tr("yt.cancelled", id=vid))
        return DownloadResult(vid, "cancelled", error="Abgebrochen")

    def _fail(
        self,
        vid: str,
        tmp: Path,
        message: str,
        *,
        rate_limited: bool = False,
        keep_partial: bool = False,
    ) -> DownloadResult:
        """`keep_partial`: network errors keep `.part` so a manual retry resumes (m3)."""
        _cleanup_tmp(tmp, platforms.file_id(vid), keep_partial=keep_partial)
        if self.db.is_known(vid):
            self.db.set_status(vid, "failed", error=message)
        log.error(tr("yt.failed", id=vid, error=message))
        return DownloadResult(vid, "failed", error=message, rate_limited=rate_limited)


# --------------------------------------------------------------------------- listings


class SourceListing(list):
    """Entries of `list_source` plus the name of the listed channel/playlist/user as yt-dlp
    reported it on playlist level (`source_name`, may be ''). Used to replace an automatically
    suggested source name without an extra request (watchlist `name_auto`)."""

    def __init__(
        self, entries: Any = (), *, source_name: str = "", total: int | None = None
    ) -> None:
        super().__init__(entries)
        self.source_name = source_name
        # v0.4.0: size of the whole listing if yt-dlp knew it (`playlist_count`), else None
        self.total = total


@dataclass
class PagedListing:
    """Result/progress of `list_source_paged` (v0.4.0 backfill)."""

    position: int = 0  # entries of the listing walked so far (resume cursor)
    total: int | None = None  # size reported on the first page (`playlist_count`), else None
    source_name: str = ""
    requests: int = 0  # page requests made (through the throttle)
    walked: int = 0  # entries walked in this call, including re-read ones before `start`
    complete: bool = False  # end of the listing reached
    capped: bool = False  # stopped at `limit`


_LOOPBACK = {"127.0.0.1", "localhost", "::1"}
# Review v0.4.0 m7: script assets of the SoundCloud client-id discovery (no listing page)
_UNPACED_SUFFIXES = ("sndcdn.com",)


class _PagedGate:
    """Wraps `YoutubeDL.urlopen` of one paged listing (`list_source_paged`): before every
    request to the platform the entries received so far are flushed to the caller, then the
    request waits for its throttle slot. Local requests (PO-token provider) pass unchanged."""

    def __init__(
        self,
        throttle: Throttle,
        listing: PagedListing,
        on_entries: Callable[[list[dict[str, Any]], int], None],
        *,
        per_hour: int,
        max_requests: int | None,
        on_request: Callable[[], None] | None,
        cancel_event: threading.Event | None,
        stopped: Callable[[], bool] | None = None,
    ) -> None:
        self.th = throttle
        self.stopped = stopped
        self.listing = listing
        self.on_entries = on_entries
        self.per_hour = per_hour
        self.max_requests = max_requests
        self.on_request = on_request
        self.cancel = cancel_event
        self.buf: list[dict[str, Any]] = []
        self.walked = listing.position

    def install(self, ydl: Any) -> None:
        orig = ydl.urlopen

        def urlopen(req: Any, *args: Any, **kwargs: Any) -> Any:
            target = getattr(req, "url", req)
            try:
                host = (urlparse(str(target)).hostname or "").lower()
            except ValueError:
                host = ""
            if host in _LOOPBACK:
                return orig(req, *args, **kwargs)
            self.check_stop()  # m3: a pause/cancel/delete drops the batch (cursor unchanged)
            self.flush()
            if self.max_requests is not None and self.listing.requests >= self.max_requests:
                raise RequestBudgetSpent
            # Review v0.4.0 M1: the pacing wait holds no lock; the metadata lock is taken only
            # for the request itself (searches, checks and downloads interleave freely).
            # m7: SoundCloud script assets (client-id discovery) are spaced, not paced.
            if not host.endswith(_UNPACED_SUFFIXES):
                self.th.backfill_pace(self.per_hour, self.cancel)
            self.check_stop()
            with self.th.metadata_lock(cancel_event=self.cancel):
                self.th.backfill_request(self.cancel)
                self.listing.requests += 1
                if self.on_request is not None:
                    self.on_request()
                try:
                    return orig(req, *args, **kwargs)
                finally:
                    self.th.mark_request()

        ydl.urlopen = urlopen

    def check_stop(self, *, external: bool = True) -> None:
        """Cancel event of this process; `external`: also `stopped()` (a yt-dlp update started
        by another process, Review v0.4.0 M3 - one DB read, so only before requests)."""
        if self.cancel is not None and self.cancel.is_set():
            raise WaitCancelled
        if external and self.stopped is not None and self.stopped():
            raise WaitCancelled

    def add(self, entry: Any, walked: int, platform: str) -> None:
        self.walked = walked
        if entry and entry.get("id"):
            self.buf.append(normalize_entry(entry, platform))

    def flush(self) -> None:
        """Hand the entries received so far (and the cursor) to the caller."""
        if self.walked == self.listing.position and not self.buf:
            return
        batch, self.buf = self.buf, []
        self.listing.position = self.walked
        self.on_entries(batch, self.walked)

    def flush_quietly(self) -> None:
        try:
            self.flush()
        except Exception:
            log.debug("Backfill entries not stored", exc_info=True)


_SC_RESOURCE_SUFFIX = re.compile(
    r"\s*\((?:All|Tracks|Albums|Sets|Reposts|Likes|Spotlight|Comments)\)$"
)
_YT_TAB_SUFFIX = re.compile(r"\s+-\s+(?:Videos|Live|Streams|Home|Shorts|Playlists)$")


def listing_name(info: Mapping[str, Any], url: str, platform: str = YOUTUBE) -> str:
    """Name of a listed source from the playlist-level fields of a flat extraction.

    YouTube channel tab: `channel` / `uploader` (the `title` is «<Kanal> - Videos»);
    YouTube playlist: `title`. SoundCloud user: `title` «<Name> (Tracks)» without the suffix;
    SoundCloud set: «<uploader> – <title>»."""
    title = str(info.get("title") or "").strip()
    if platform == SOUNDCLOUD:
        parts = soundcloud_source_parts(url)
        if parts and parts[1] == "sets":
            uploader = str(info.get("uploader") or "").strip()
            return f"{uploader} – {title}" if uploader and title else title or uploader
        return _SC_RESOURCE_SUFFIX.sub("", title).strip() or str(info.get("uploader") or "")
    if "list=" in url:
        return title
    name = str(info.get("channel") or info.get("uploader") or "").strip()
    return name or _YT_TAB_SUFFIX.sub("", title).strip()


def _only_previews(ie_result: Mapping[str, Any]) -> bool:
    """SoundCloud: every format yt-dlp found is a Go+ preview (`…_preview`, 30 s)."""
    formats = [f for f in ie_result.get("formats") or [] if isinstance(f, Mapping)]
    return bool(formats) and all("preview" in str(f.get("format_id") or "") for f in formats)


# --------------------------------------------------------------------------- SoundCloud flat


_SC_FLAT_CLASSES: list[type] | None = None
# yt-dlp version the SoundCloud extensions were written and checked against
SC_CHECKED_YTDLP = "2026.10.26"
_SC_WARNED: set[str] = set()


class ScIncompatible(Exception):
    """yt-dlp's SoundCloud internals differ from what `_sc_flat_extractor_classes` expects."""


def _sc_warn_once(key: str, text: str, *args: Any) -> None:
    if key in _SC_WARNED:
        return
    _SC_WARNED.add(key)
    log.warning(text, *args)


def _sc_fallback(where: str, exc: BaseException) -> None:
    """Review M2: an override hit an unexpected yt-dlp change at runtime -> stock behaviour."""
    _sc_warn_once(
        f"runtime:{where}",
        tr(
            "yt.sc_ext_mismatch",
            ext=where,
            version=getattr(yt_dlp.version, "__version__", "?"),
            error=exc,
        ),
    )
    log.debug("SoundCloud extension: fallback in %s", where, exc_info=exc)


# errors that mean «the yt-dlp internals changed» (never ExtractorError: those are real
# answers of SoundCloud, e.g. 429/403, and must reach the throttle)
_SC_DRIFT_ERRORS = (AttributeError, TypeError, KeyError, IndexError, ValueError)


def _params(func: Any) -> list[inspect.Parameter] | None:
    try:
        return list(inspect.signature(func).parameters.values())
    except (TypeError, ValueError):
        return None


def _sc_check_capabilities(sc: Any) -> list[str]:
    """Review M2: every yt-dlp internal the overrides use, with the expected shape.
    Returns the problems (empty = compatible)."""
    problems: list[str] = []
    names = (
        "SoundcloudBaseIE",
        "SoundcloudIE",
        "SoundcloudSearchIE",
        "SoundcloudUserIE",
        "SoundcloudSetIE",
        "SoundcloudPlaylistBaseIE",
    )
    for name in names:
        if not isinstance(getattr(sc, name, None), type):
            problems.append(f"Class {name} missing")
    if problems:
        return problems
    base = sc.SoundcloudBaseIE
    for cls in (sc.SoundcloudSearchIE, sc.SoundcloudUserIE, sc.SoundcloudSetIE):
        if not issubclass(cls, base):
            problems.append(f"{cls.__name__} does not inherit from SoundcloudBaseIE")
    for attr in ("_call_api", "_extract_thumbnails", "_extract_info_dict", "url_result"):
        if not callable(getattr(base, attr, None)):
            problems.append(f"SoundcloudBaseIE.{attr} missing")
    if not isinstance(getattr(base, "_API_V2_BASE", None), str):
        problems.append("SoundcloudBaseIE._API_V2_BASE missing")
    if not isinstance(getattr(base, "_HEADERS", None), dict):
        problems.append("SoundcloudBaseIE._HEADERS missing")
    if problems:
        return problems

    def names_of(func: Any) -> list[str] | None:
        ps = _params(func)
        return None if ps is None else [p.name for p in ps]

    info_dict = names_of(base._extract_info_dict)
    if not info_dict or info_dict[:2] != ["self", "info"] or "extract_flat" not in info_dict:
        problems.append(f"Signature _extract_info_dict changed: {info_dict}")
    thumbs = names_of(base._extract_thumbnails)
    if not thumbs or thumbs[:2] != ["self", "info"]:
        problems.append(f"Signature _extract_thumbnails changed: {thumbs}")
    url_res = names_of(base.url_result)  # staticmethod: (url, ie, video_id, video_title, ...)
    if not url_res or url_res[:3] != ["url", "ie", "video_id"]:
        problems.append(f"Signature url_result changed: {url_res}")
    ext_set = getattr(sc.SoundcloudSetIE, "_extract_set", None)
    set_params = _params(ext_set) if callable(ext_set) else None
    if (
        set_params is None
        or [p.name for p in set_params[:3]] != ["self", "playlist", "token"]
        or set_params[2].default is inspect.Parameter.empty
    ):
        problems.append("Signature _extract_set(playlist, token=None) changed")
    return problems


def _sc_flat_extractor_classes() -> list[type]:
    """Subclasses of yt-dlp's SoundCloud search/user/set extractors for *flat* listings.

    Same `ie_key()` as the originals (class name), so `YoutubeDL.add_info_extractor` replaces
    them in place for one YoutubeDL instance only. They change these things (yt-dlp 2026.10.26,
    `yt_dlp/extractor/soundcloud.py`):
    1. `_extract_thumbnails`: no HEAD request for the «original» artwork (one request per entry
       otherwise, each after `sleep_interval_requests`); the t500x500 URL is built directly.
    2. `_call_api` remembers full track objects of every API answer and `url_result` merges
       their metadata (duration, date, uploader, policy) into user/set entries, which yt-dlp
       reduces to id + title. No extra request: the data was already received.
    3. Sets: stub tracks (only `id`, everything after the first few) inside the wanted window
       (`head`/`tail`, n) are fetched in batches of 50 (`tracks?ids=`), like yt-dlp does for
       private sets, so the entries have a duration. Cost: ceil(stubs / 50) requests.
    4. `sc_policy` in every flat entry (SNIP = Go+ preview, BLOCK = geo-blocked). For flat
       entries the policy is hidden from yt-dlp: with `extract_flat` the format list is always
       empty, and yt-dlp would raise GeoRestrictedError for every BLOCK track, which aborted
       the whole search/listing (Review M1).

    Review M2: before the classes are built, `_sc_check_capabilities` checks every internal
    used (classes, methods, attributes, signatures); a mismatch raises ScIncompatible and the
    stock extractors stay in use. At runtime every override falls back to the stock
    behaviour on an unexpected AttributeError/TypeError/... (warning once in the log).
    """
    global _SC_FLAT_CLASSES
    if _SC_FLAT_CLASSES is not None:
        return _SC_FLAT_CLASSES
    from yt_dlp.extractor import soundcloud as sc
    from yt_dlp.utils import ExtractorError

    problems = _sc_check_capabilities(sc)
    if problems:
        raise ScIncompatible("; ".join(problems))
    version = getattr(yt_dlp.version, "__version__", "")
    if version and version != SC_CHECKED_YTDLP:
        _sc_warn_once(
            "version",
            tr("yt.sc_ext_ok", version=version, checked=SC_CHECKED_YTDLP),
        )

    class _Mixin:
        _hc_window: tuple[str, int] | None = None

        def _hc_store(self) -> dict[str, dict]:
            store = self.__dict__.get("_hc_tracks")
            if store is None:
                store = self.__dict__["_hc_tracks"] = {}
            return store

        def _hc_remember(self, res: Any) -> None:
            items: list[Any] = []
            if isinstance(res, list):
                items = res
            elif isinstance(res, dict):
                if isinstance(res.get("collection"), list):
                    items = res["collection"]
                elif isinstance(res.get("tracks"), list):
                    items = res["tracks"]
            store = self._hc_store()
            for item in items:
                if not isinstance(item, dict):
                    continue
                for cand in (item, item.get("track")):
                    if (
                        isinstance(cand, dict)
                        and cand.get("id") is not None
                        and cand.get("kind", "track") == "track"
                        and cand.get("duration") is not None
                    ):
                        store[str(cand["id"])] = cand

        def _call_api(self, *args: Any, **kwargs: Any) -> Any:
            res = super()._call_api(*args, **kwargs)  # type: ignore[misc]
            try:
                self._hc_remember(res)
            except _SC_DRIFT_ERRORS as exc:
                _sc_fallback("_call_api", exc)
            return res

        def _extract_thumbnails(self, info: Any) -> Any:
            try:
                url = (info or {}).get("artwork_url") or ((info or {}).get("user") or {}).get(
                    "avatar_url"
                )
                if not url:
                    return None
                big = re.sub(r"-[0-9a-z]+\.(?:jpg|png)", "-t500x500.jpg", str(url))
                return [{"id": "t500x500", "url": big, "width": 500, "height": 500}]
            except _SC_DRIFT_ERRORS as exc:
                _sc_fallback("_extract_thumbnails", exc)
                return super()._extract_thumbnails(info)  # type: ignore[misc]

        def _extract_info_dict(self, info: Any, *args: Any, **kwargs: Any) -> Any:
            flat = bool(kwargs.get("extract_flat") or (len(args) >= 3 and args[2]))
            policy = info.get("policy") if isinstance(info, dict) else None
            call_info = info
            if flat and policy is not None:
                # M1: no formats in flat mode -> yt-dlp would raise for policy BLOCK
                call_info = {**info, "policy": None}
            try:
                res = super()._extract_info_dict(call_info, *args, **kwargs)  # type: ignore[misc]
            except _SC_DRIFT_ERRORS as exc:
                if call_info is info:
                    raise  # nothing of ours involved: stock behaviour
                _sc_fallback("_extract_info_dict", exc)
                return super()._extract_info_dict(info, *args, **kwargs)  # type: ignore[misc]
            if isinstance(res, dict) and isinstance(info, dict):
                res["sc_policy"] = policy
            return res

        def url_result(self, url: Any, ie: Any = None, video_id: Any = None, *a: Any, **kw: Any):
            try:
                track = self._hc_store().get(str(video_id)) if video_id is not None else None
                if track is not None and "duration" not in kw:
                    try:
                        meta = dict(self._extract_info_dict(track, extract_flat=True))
                    except ExtractorError as exc:  # never let one track abort the listing
                        log.debug("SoundCloud entry %s without metadata: %s", video_id, exc)
                        meta = {"sc_policy": track.get("policy")}
                    for key in ("formats", "__post_extractor", "id"):
                        meta.pop(key, None)
                    kw = {**meta, **kw}
            except _SC_DRIFT_ERRORS as exc:
                _sc_fallback("url_result", exc)
            return super().url_result(url, ie, video_id, *a, **kw)  # type: ignore[misc]

    class _SetMixin(_Mixin):
        def _hc_fill_window(self, playlist: Any) -> Any:
            tracks = (playlist or {}).get("tracks") or []
            window = self._hc_window
            if window and tracks:
                mode, n = window
                part = tracks[-n:] if mode == "tail" else tracks[:n]
                stubs = [str(t["id"]) for t in part if t.get("id") and not t.get("permalink_url")]
                full: dict[str, dict] = {}
                for i in range(0, len(stubs), 50):
                    got = self._call_api(
                        self._API_V2_BASE + "tracks",
                        str(playlist.get("id")),
                        "Downloading tracks",
                        query={"ids": ",".join(stubs[i : i + 50])},
                        headers=self._HEADERS,
                    )
                    for t in got if isinstance(got, list) else []:
                        if isinstance(t, dict) and t.get("id") is not None:
                            full[str(t["id"])] = t
                if full:
                    playlist = {
                        **playlist,
                        "tracks": [full.get(str(t.get("id")), t) for t in tracks],
                    }
            self._hc_remember({"tracks": (playlist or {}).get("tracks") or []})
            return playlist

        def _extract_set(self, playlist: Any, token: Any = None) -> Any:
            try:
                filled = self._hc_fill_window(playlist)
            except _SC_DRIFT_ERRORS as exc:
                _sc_fallback("_extract_set", exc)
                filled = playlist
            return super()._extract_set(filled, token)  # type: ignore[misc]

    out = []
    for base, mixin in (
        (sc.SoundcloudSearchIE, _Mixin),
        (sc.SoundcloudUserIE, _Mixin),
        (sc.SoundcloudSetIE, _SetMixin),
    ):
        out.append(type(base.__name__, (mixin, base), {"__module__": __name__}))
    _SC_FLAT_CLASSES = out
    return out


def _install_sc_flat_extractors(ydl: Any, window: tuple[str, int] | None) -> None:
    """Register the flat SoundCloud extractors on one YoutubeDL instance (metadata calls)."""
    add = getattr(ydl, "add_info_extractor", None)
    if add is None:  # test doubles
        return
    try:
        classes = _sc_flat_extractor_classes()
    except Exception as exc:  # yt-dlp changed: stock extractors stay in use
        _sc_warn_once(
            "build",
            tr(
                "yt.sc_ext_inactive", version=getattr(yt_dlp.version, "__version__", "?"), error=exc
            ),
        )
        return
    for cls in classes:
        ie = cls()
        ie._hc_window = window
        add(ie)


# --------------------------------------------------------------------------- file helpers


def _playlist_too_long(n: int) -> YtClientError:
    return YtClientError(tr("yt.playlist_too_long", n=n, max=NEWEST_LAST_MAX))


def _newest_last_handler(
    max_entries: int, cancel_event: threading.Event | None
) -> Callable[[Any, dict[str, Any]], dict[str, Any]]:
    """`newest_last` (Review Phase 4 m4): page through the flat playlist ourselves, keep the
    last `max_entries` and return them newest first. `playlist_count` (from the first page,
    `_tab.py` reads "N Videos" of the header) refuses a too long playlist before any
    continuation request; while paging, NEWEST_LAST_MAX is a hard limit in any case (no
    count in the header, playlist grows meanwhile). Replaces `playlist_items "-1:-N:-1"`,
    which made yt-dlp load every page without a limit."""

    def handle(ydl: Any, ie_result: dict[str, Any]) -> dict[str, Any]:
        if ie_result.get("_type") not in ("playlist", "multi_video"):
            # redirected URL (rare for …/playlist?list=): let yt-dlp resolve it, first N only
            ydl.params["playlistend"] = max_entries
            info = ydl.process_ie_result(ie_result, download=False)
            if info is None:
                raise YtClientError(tr("yt.no_data"))
            return info  # type: ignore[no-any-return]
        count = ie_result.get("playlist_count")
        if isinstance(count, int) and count > NEWEST_LAST_MAX:
            raise _playlist_too_long(count)
        tail: deque[dict[str, Any]] = deque(maxlen=max(1, max_entries))
        seen = 0
        for entry in ie_result.get("entries") or ():
            if cancel_event is not None and cancel_event.is_set():
                raise WaitCancelled
            seen += 1
            if seen > NEWEST_LAST_MAX:
                raise _playlist_too_long(seen if not isinstance(count, int) else count)
            if entry:
                tail.append(dict(entry))
        out = dict(ie_result)
        out["entries"] = list(reversed(tail))
        return out

    return handle


def _clean_error(exc: BaseException) -> str:
    text = redact(re.sub(r"\x1b\[[0-9;]*m", "", str(exc))).strip()
    return re.sub(r"^ERROR:\s*", "", text)[:500] or exc.__class__.__name__


_STDLIB_DIR = os.path.normcase(os.path.dirname(os.__file__))


def _is_stdlib(filename: str) -> bool:
    path = os.path.normcase(filename)
    return path.startswith(_STDLIB_DIR) and "site-packages" not in path


def _failure_reason(exc: BaseException) -> str:
    """Failure reason stored on the job: like `_clean_error`, but a local `OSError` (missing
    binary, locked file, bad path) also names its type, the file involved and the innermost
    non-stdlib frame. On Windows `subprocess` raises a bare `[WinError 2] The system cannot
    find the file specified` without any file name - unusable without the location."""
    msg = _clean_error(exc)
    if not isinstance(exc, OSError) or isinstance(exc, yt_dlp.utils.YoutubeDLError):
        return msg
    parts = [exc.__class__.__name__]
    for name in (exc.filename, exc.filename2):
        shown = redact(repr(str(name))) if name else ""
        if shown and shown not in msg and str(name) not in msg:
            parts.append(shown)
    if where := _error_origin(exc):
        parts.append(f"at {where}")
    extra = " ".join(parts)
    return f"{msg[: 500 - len(extra) - 3]} ({extra})"


def _error_origin(exc: BaseException) -> str:
    """`file.py:line in func` of the innermost frame outside the standard library."""
    tb = exc.__traceback__
    found = ""
    while tb is not None:
        code = tb.tb_frame.f_code
        if not _is_stdlib(code.co_filename):
            found = f"{Path(code.co_filename).name}:{tb.tb_lineno} in {code.co_name}"
        tb = tb.tb_next
    return found


def _is_partial(name: str) -> bool:
    return name.endswith((".part", ".ytdl")) or ".part-Frag" in name


def _cleanup_tmp(tmp: Path, vid: str, *, keep_partial: bool = False) -> None:
    """Remove `<id>.*` from the temp dir; `keep_partial` keeps resumable download leftovers."""
    if not tmp.is_dir():
        return
    for f in tmp.glob(f"{glob_escape(vid)}.*"):
        if keep_partial and _is_partial(f.name):
            continue
        try:
            f.unlink()
        except OSError:
            log.debug("Temporary file not deletable: %s", f)


def glob_escape(text: str) -> str:
    return re.sub(r"([\[\]*?])", r"[\1]", text)


def _find_audio(info: Mapping[str, Any], tmp: Path, vid: str) -> Path | None:
    for rd in info.get("requested_downloads") or []:
        fp = rd.get("filepath")
        if fp and Path(fp).is_file():
            return Path(fp)
    for ext in AUDIO_EXTS:
        cand = tmp / f"{vid}{ext}"
        if cand.is_file():
            return cand
    return None


def _find_thumbnail(tmp: Path, vid: str) -> Path | None:
    for ext in IMAGE_EXTS:
        cand = tmp / f"{vid}{ext}"
        if cand.is_file():
            return cand
    return None
