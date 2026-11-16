"""The only module that imports yt-dlp (search, list_source, resolve, download).

Every yt-dlp call passes through `Throttle.before_request(kind)` first. 429 / bot-check errors
start the persistent backoff and are never retried; network errors get exactly one retry
(yt-dlp's own retries are therefore set to 0).
"""

from __future__ import annotations

import logging
import os
import re
import shutil
import threading
from collections.abc import Callable, Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import yt_dlp
from yt_dlp.utils import DownloadCancelled

from . import binaries, config, paths, tagging
from .config import Settings
from .db import Database
from .filters import normalize
from .genre import detect_genre, genre_search_terms
from .throttle import Throttle, ThrottleError, WaitCancelled, is_rate_limit_error

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

__all__ = [
    "DownloadCancelled",
    "DownloadResult",
    "YtClient",
    "YtClientError",
    "build_ydl_opts",
    "extract_video_id",
    "build_search_query",
    "normalize_entry",
]


class YtClientError(RuntimeError):
    """A yt-dlp operation failed. `rate_limited` is True if the backoff was triggered."""

    def __init__(self, message: str, *, rate_limited: bool = False) -> None:
        super().__init__(message)
        self.rate_limited = rate_limited


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
    text = (url_or_id or "").strip()
    if _ID_RE.match(text):
        return text
    m = _URL_ID_RE.search(text)
    return m.group(1) if m else None


def watch_url(video_id: str) -> str:
    return f"https://www.youtube.com/watch?v={video_id}"


def normalize_source_url(url: str) -> str:
    """Channel root URLs list only the 'Videos' tab (flat extraction of tabs is not recursive)."""
    m = _CHANNEL_ROOT_RE.match(url.strip())
    return f"{m.group(1)}/videos" if m else url.strip()


def _date_from_ts(ts: Any) -> str:
    try:
        return datetime.fromtimestamp(int(ts), UTC).strftime("%Y%m%d")
    except (TypeError, ValueError, OverflowError, OSError):
        return ""


def normalize_entry(entry: Mapping[str, Any]) -> dict[str, Any]:
    """Map a yt-dlp info/entry dict to the fields HCLoader uses (see SPEC §9)."""
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
        "title": entry.get("title") or "",
        "channel_id": entry.get("channel_id") or entry.get("uploader_id") or "",
        "channel_name": entry.get("channel") or entry.get("uploader") or "",
        "duration": int(duration) if isinstance(duration, (int, float)) else None,
        "upload_date": upload or "",
        "date_approx": approx,
        "view_count": entry.get("view_count"),
        "thumbnail": thumb,
        "url": url,
        "live_status": entry.get("live_status"),
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

    def __init__(self) -> None:
        self.rate_limit_hit: str | None = None

    def _watch(self, msg: str) -> None:
        if self.rate_limit_hit is None and is_rate_limit_error(msg):
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
    """
    if purpose not in PURPOSES:
        raise ValueError(f"Unbekannter Zweck: {purpose}")
    net = settings.network
    deno = binaries.deno_path()
    opts: dict[str, Any] = {
        "quiet": True,
        "no_warnings": False,
        "noprogress": True,
        "logger": logger if logger is not None else _YdlLogger(),
        "socket_timeout": 30,
        "retries": 0,
        "fragment_retries": 0,
        "extractor_retries": 0,
        "sleep_interval_requests": settings.throttle.sleep_requests,
        "js_runtimes": {"deno": {"path": str(deno)} if deno.exists() else {}},
        "noplaylist": purpose in ("resolve", "download"),
        "extractor_args": _extractor_args(settings, purpose),
    }
    if net.proxy:
        opts["proxy"] = net.proxy
    if net.cookies_from_browser:
        opts["cookiesfrombrowser"] = (net.cookies_from_browser,)
        log.warning(
            "Cookies aus %s aktiv (Notlösung, kann mit PO-Token Probleme machen)",
            net.cookies_from_browser,
        )
    if purpose in ("search", "list"):
        opts["extract_flat"] = "in_playlist"
        opts["skip_download"] = True
        opts["lazy_playlist"] = True
    elif purpose == "resolve":
        opts["skip_download"] = True
        opts["extractor_retries"] = 1
    else:
        _download_opts(opts, settings, target_dir)
        if progress_hook:
            opts["progress_hooks"] = [progress_hook]
        if postprocessor_hook:
            opts["postprocessor_hooks"] = [postprocessor_hook]
    return opts


def _extractor_args(
    settings: Settings, purpose: str = "resolve"
) -> dict[str, dict[str, list[str]]]:
    """PO-token provider args; flat purposes also get `youtubetab:approximate_date`.

    yt-dlp reads `approximate_date` via `_configuration_arg(...)` as a list; a non-empty list
    (even `['']`) is truthy and makes flat entries carry a `timestamp` parsed from 'vor X Jahren'.
    The keys (youtube / youtubepot-* / youtubetab) are distinct, so merging is plain assignment.
    """
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


def _download_opts(opts: dict[str, Any], settings: Settings, target_dir: Path | None) -> None:
    dl = settings.download
    target = target_dir or settings.target_dir_path()
    tmp = paths.tmp_dir(target)
    rate_mb = settings.throttle.limit_rate_mb
    opts.update(
        {
            "format": "bestaudio/best",
            "ratelimit": int(rate_mb * 1024 * 1024) if rate_mb and rate_mb > 0 else None,
            "playlist_items": "1",
            "paths": {"home": str(tmp), "temp": str(tmp)},
            "outtmpl": {"default": "%(id)s.%(ext)s"},
            "writethumbnail": bool(dl.embed_cover or dl.write_cover_jpg),
            "overwrites": True,
            "continuedl": True,
        }
    )
    ffmpeg = binaries.ffmpeg_path()
    if ffmpeg.exists():
        opts["ffmpeg_location"] = str(ffmpeg)
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

    def _prepare(self, settings: Settings) -> None:
        """Environment for the bgutil provider (token TTL, HTTP server child process).

        `TOKEN_TTL` is read by the provider (script mode: token cache of generate_once; HTTP
        mode: the server process inherits it at start) in whole hours (bgutil 2.0.2 README:
        "in hours, defaults to 6"). Fractions are not safe (integer parsing), so the setting is
        rounded to whole hours, minimum 1 (docs/decisions.md).
        """
        net = settings.network
        os.environ["TOKEN_TTL"] = str(max(1, round(net.po_token_ttl_hours)))
        if net.po_token_mode != "http":
            return
        if self._external_pot:
            if not self._pot_server.running():  # type: ignore[union-attr]
                raise YtClientError("PO-Token-Server läuft nicht (wird vom Watchdog neu gestartet)")
            return
        with self._lock:
            if self._pot_server is None or self._pot_server.port != net.po_token_port:
                if self._pot_server:
                    self._pot_server.stop()
                self._pot_server = binaries.PotServer(net.po_token_port)
            if not self._pot_server.start():
                raise YtClientError(
                    "PO-Token-Server nicht bereit (Deno/Provider fehlt oder keine Antwort)"
                )

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
    ) -> dict[str, Any]:
        self.throttle.check_backoff()
        self._prepare(settings)
        self.throttle.before_request(
            kind, cancel_event=cancel_event, count_attempt=download and not retry, retry=retry
        )
        logger = opts.get("logger")
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=download)
                if info is None:
                    raise YtClientError("Keine Daten von yt-dlp erhalten")
                if download and info.get("_type") == "playlist":
                    raise YtClientError("Keine einzelne Video-URL (Playlist erkannt)")
                return ydl.sanitize_info(info)  # type: ignore[no-any-return]
        finally:
            hit = getattr(logger, "rate_limit_hit", None)
            if hit:
                self.throttle.trigger_backoff(hit)

    def _metadata_call(self, kind: str, url: str, opts: dict[str, Any], settings: Settings):
        try:
            return self._extract(kind, url, opts, settings=settings)
        except DownloadCancelled:
            raise
        except Exception as exc:
            if isinstance(exc, YtClientError):
                raise
            limited = self.throttle.handle_error(exc)
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
    ) -> list[dict[str, Any]]:
        """Flat search; genre search terms and (with `search.append_year`) the year are appended."""
        settings = self.settings
        n = n or settings.search.results_count
        full_query = build_search_query(query, genre=genre, year=year, settings=settings)
        opts = build_ydl_opts(settings, "search")
        info = self._metadata_call("search", f"ytsearch{int(n)}:{full_query}", opts, settings)
        return [normalize_entry(e) for e in info.get("entries") or [] if e and e.get("id")]

    def list_source(self, url: str, max_entries: int | None = None) -> list[dict[str, Any]]:
        settings = self.settings
        max_entries = max_entries or settings.schedule.entries_per_source
        opts = build_ydl_opts(settings, "list")
        opts["playlistend"] = int(max_entries)
        info = self._metadata_call("list", normalize_source_url(url), opts, settings)
        entries = [normalize_entry(e) for e in info.get("entries") or [] if e and e.get("id")]
        return entries[: int(max_entries)]

    def resolve(self, video_id: str) -> dict[str, Any]:
        settings = self.settings
        vid = extract_video_id(video_id) or video_id
        opts = build_ydl_opts(settings, "resolve")
        info = self._metadata_call("resolve", watch_url(vid), opts, settings)
        out = normalize_entry(info)
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
        return f"youtube {video_id}" in (ln.strip() for ln in lines)

    def _record_archive(self, video_id: str) -> None:
        """Append `youtube <id>` to the archive; only called after the video is `done`."""
        if self.in_archive(video_id):
            return
        archive = config.archive_path()
        try:
            archive.parent.mkdir(parents=True, exist_ok=True)
            with archive.open("a", encoding="utf-8", newline="\n") as fh:
                fh.write(f"youtube {video_id}\n")
        except OSError as exc:
            log.warning("Download-Archiv nicht beschreibbar (%s): %s", archive, exc)

    def download(
        self,
        url_or_id: str,
        *,
        on_progress: Callable[[dict[str, Any]], None] | None = None,
        cancel_event: threading.Event | None = None,
    ) -> DownloadResult:
        """Full pipeline: skip check -> throttle -> yt-dlp into .tmp -> tags -> move -> DB.

        Only single videos: a video id (or a URL containing one) is required. Playlist, channel
        and search URLs are refused before the throttle, and the URL passed to yt-dlp is always
        rebuilt from the id (B1).
        Raises ThrottleError subclasses (BackoffActive / LimitReached) if downloads are blocked.
        Download failures are returned as DownloadResult(status='failed'/'cancelled').
        """
        settings = self.settings
        vid = extract_video_id(url_or_id)
        if not vid:
            msg = "Keine Video-URL oder Video-ID (Playlists, Kanäle und Suchen sind nicht erlaubt)"
            log.error("Download abgelehnt: %s (%s)", msg, (url_or_id or "")[:100])
            return DownloadResult("", "failed", error=msg)
        url = watch_url(vid)

        skipped = self._skip_result(vid)
        if skipped:
            return skipped
        self.throttle.check_download()

        target_dir = settings.target_dir_path()
        tmp = paths.tmp_dir(target_dir)
        tmp.mkdir(parents=True, exist_ok=True)
        config.archive_path().parent.mkdir(parents=True, exist_ok=True)
        previous = self.db.get_video(vid)
        prev_status = previous["status"] if previous else "new"
        prev_error = previous.get("error") if previous else None
        self.db.upsert_video({"id": vid})
        self.db.set_status(vid, "downloading")
        _cleanup_tmp(tmp, vid, keep_partial=True)

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
            progress_hook=progress_hook,
            postprocessor_hook=pp_hook,
            target_dir=target_dir,
        )
        try:
            info = self._download_with_retry(url, opts, settings, check_cancel, cancel_event)
            check_cancel()
            emit({**normalize_progress({}, PHASE_TAG), "percent": None})
            return self._finish(info, vid, settings, target_dir, tmp, check_cancel)
        except (DownloadCancelled, WaitCancelled):
            return self._cancelled(vid, tmp, prev_status)
        except ThrottleError:
            self._restore_status(vid, prev_status, prev_error)
            raise
        except Exception as exc:
            limited = self.throttle.handle_error(exc)
            msg = _clean_error(exc)
            if not isinstance(exc, (yt_dlp.utils.YoutubeDLError, OSError, YtClientError)):
                log.exception("Unerwarteter Fehler beim Download von %s", vid)
            keep = (
                not limited
                and not _HTTP_403_RE.search(str(exc))
                and bool(_NETWORK_RE.search(str(exc)))
            )
            return self._fail(vid, tmp, msg, rate_limited=limited, keep_partial=keep)

    def _restore_status(self, vid: str, prev_status: str, prev_error: str | None) -> None:
        status = "queued" if prev_status == "downloading" else prev_status
        if self.db.is_known(vid):
            self.db.set_status(vid, status, error=prev_error)

    def _skip_result(self, vid: str) -> DownloadResult | None:
        row = self.db.get_video(vid)
        if row and row["status"] == "done":
            log.info("Übersprungen (bereits geladen): %s", vid)
            fp = Path(row["file_path"]) if row.get("file_path") else None
            return DownloadResult(vid, "skipped", fp, row.get("title") or "", skipped=True)
        if self.in_archive(vid):
            log.info("Übersprungen (im Download-Archiv): %s", vid)
            return DownloadResult(vid, "skipped", None, (row or {}).get("title") or "", True)
        return None

    def _download_with_retry(
        self,
        url: str,
        opts: dict[str, Any],
        settings: Settings,
        check_cancel: Callable[[], None],
        cancel_event: threading.Event | None = None,
    ) -> dict[str, Any]:
        attempt = 0
        reached_network = False
        try:
            while True:
                try:
                    info = self._extract(
                        "download",
                        url,
                        opts,
                        download=True,
                        settings=settings,
                        cancel_event=cancel_event,
                        retry=attempt > 0,
                    )
                    reached_network = True
                    return info
                except (ThrottleError, WaitCancelled):
                    raise
                except DownloadCancelled:
                    reached_network = True
                    raise
                except Exception as exc:
                    reached_network = True
                    msg = str(exc)
                    if is_rate_limit_error(msg) or _HTTP_403_RE.search(msg):
                        raise
                    if attempt < 1 and _NETWORK_RE.search(msg):
                        attempt += 1
                        log.warning(
                            "Netzwerkfehler, ein Versuch wird wiederholt: %s", _clean_error(exc)
                        )
                        check_cancel()
                        continue
                    raise
        finally:
            if reached_network:
                self.throttle.mark_download_end()

    def _finish(
        self,
        info: dict[str, Any],
        vid: str,
        settings: Settings,
        target_dir: Path,
        tmp: Path,
        check_cancel: Callable[[], None],
    ) -> DownloadResult:
        dl = settings.download
        st = settings.storage
        audio = _find_audio(info, tmp, vid)
        if audio is None:
            raise YtClientError("Audiodatei nach dem Download nicht gefunden")
        meta = normalize_entry(info)
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
        title = paths.clean_title(meta["title"], st.title_cleanup_patterns)
        channel = meta["channel_name"]
        artist = channel
        if st.artist_from_title:
            artist = paths.parse_artist_from_title(title) or channel
        url = info.get("webpage_url") or watch_url(vid)
        tag_meta = {
            "title": title,
            "artist": artist,
            "albumartist": artist,
            "album": title,
            "genre": genre,
            "date": meta["upload_date"],
            "url": url,
            "id": vid,
            "source": "YouTube",
        }

        cover = None
        thumb = _find_thumbnail(tmp, vid)
        if thumb and (dl.embed_cover or dl.write_cover_jpg):
            try:
                cover = tagging.make_square_cover(thumb, ffmpeg=binaries.ffmpeg_path())
            except tagging.TaggingError as exc:
                log.warning("Cover übersprungen: %s", exc)
        chapters = (
            tagging.chapters_from_info(info) if (dl.write_cue or dl.write_id3_chapters) else []
        )
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
        target = paths.build_target_path(
            target_dir,
            st.path_template,
            {
                "id": vid,
                "title": title,
                "artist": artist,
                "channel": channel,
                "genre": genre,
                "upload_date": meta["upload_date"],
            },
            ext=audio.suffix,
            max_title_length=st.max_title_length,
            max_path_length=st.max_path_length,
        )
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(audio), str(target))

        # The file is in place: from here on nothing is fatal (a re-download would be wasteful).
        cue_path = None
        if chapters and dl.write_cue:
            try:
                cue_path = tagging.write_cue(target, chapters, performer=artist, title=title)
            except Exception as exc:
                log.warning("CUE-Datei nicht geschrieben (%s): %s", vid, exc)
        if cover and dl.write_cover_jpg:
            try:
                cover_file = target.parent / "cover.jpg"
                if not cover_file.exists():
                    cover_file.write_bytes(cover)
            except OSError as exc:
                log.warning("cover.jpg nicht geschrieben (%s): %s", vid, exc)
        _cleanup_tmp(tmp, vid)

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
            }
        )
        self.db.set_status(vid, "done", file_path=str(target))
        self._record_archive(vid)  # only after `done`: no crash window blocks a video forever
        log.info("Geladen: %s -> %s", vid, target)
        return DownloadResult(
            vid, "done", target, title, cue_path=cue_path, info=normalize_entry(info)
        )

    def _cancelled(self, vid: str, tmp: Path, prev_status: str) -> DownloadResult:
        """Abort: keep resumable `.part` files, put the video back to its previous status."""
        _cleanup_tmp(tmp, vid, keep_partial=True)
        self._restore_status(vid, prev_status, "Abgebrochen")
        log.info("Download cancelled: %s", vid)
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
        _cleanup_tmp(tmp, vid, keep_partial=keep_partial)
        if self.db.is_known(vid):
            self.db.set_status(vid, "failed", error=message)
        log.error("Download failed: %s (%s)", vid, message)
        return DownloadResult(vid, "failed", error=message, rate_limited=rate_limited)


# --------------------------------------------------------------------------- file helpers


def _clean_error(exc: BaseException) -> str:
    text = re.sub(r"\x1b\[[0-9;]*m", "", str(exc)).strip()
    return re.sub(r"^ERROR:\s*", "", text)[:500] or exc.__class__.__name__


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
            log.debug("Temporäre Datei nicht löschbar: %s", f)


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
