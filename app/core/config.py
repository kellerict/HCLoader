"""Settings models (pydantic v2) and YAML load/save.

Contract: docs/settings-schema.md. Keys are English snake_case, user-facing messages German.
"""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator
from ruamel.yaml import YAML
from ruamel.yaml.comments import CommentedMap

from .i18n import tr

log = logging.getLogger(__name__)

APP_NAME = "HCLoader"
UNSORTED = "Unsortiert"
MIN_UPLOAD_YEAR = 2005

DEFAULT_INCLUDE_KEYWORDS = [
    "mix",
    "set",
    "liveset",
    "live set",
    "podcast",
    "continuous",
    "megamix",
    "yearmix",
    "radio show",
    "session",
    "warm up",
    "closing",
]
DEFAULT_EXCLUDE_KEYWORDS = [
    "reaction",
    "tutorial",
    "how to",
    "shorts",
    "trailer",
    "aftermovie",
    "teaser",
    "preview",
    "lyrics",
    "karaoke",
    "sample pack",
    "ableton",
    "fl studio",
]
DEFAULT_CLEANUP_PATTERNS = [
    r"\(Official[^)]*\)",
    r"\[HQ\]",
    r"\[HD\]",
    r"\(HQ\)",
    r"\(HD\)",
    r"\[Official[^\]]*\]",
]

VIEWS = ("discover", "inbox", "watchlist", "downloads", "library", "stats", "log")


# --------------------------------------------------------------------------- paths


PORTABLE_MARKER = "portable.txt"
PORTABLE_DATA_DIR = "data"
# Written by the installer (installer/HCLoader.iss, privacy page) into the app folder. Applied only
# while no config.yaml exists yet - docs/decisions.md "Installer-Vorgaben".
INSTALLER_DEFAULTS = "installer-defaults.json"


def app_root() -> Path:
    """The app folder (repo root / unpacked portable folder): parent of `app/`."""
    return Path(__file__).resolve().parents[2]


def is_portable(root: Path | None = None) -> bool:
    """Portable mode: a file `portable.txt` lies in the app folder (the portable build creates
    it, docs/decisions.md "Portable-Version")."""
    return ((root or app_root()) / PORTABLE_MARKER).is_file()


def _roaming_dir() -> Path:
    """%APPDATA% (Windows) or ~/.config, independent of portable mode."""
    if sys.platform == "win32":
        base = os.environ.get("APPDATA")
        return Path(base) if base else Path.home() / "AppData" / "Roaming"
    return Path.home() / ".config"


def app_home() -> Path:
    """User data folder. Order (first match wins):
    1. $HCLOADER_HOME (tests, special setups),
    2. portable mode (`portable.txt` in the app folder): `<app folder>/data`,
    3. %APPDATA%\\HCLoader (Windows) or ~/.config/HCLoader.
    """
    override = os.environ.get("HCLOADER_HOME")
    if override:
        return Path(override)
    root = app_root()
    if is_portable(root):
        return root / PORTABLE_DATA_DIR
    return _roaming_dir() / APP_NAME


def config_path() -> Path:
    return app_home() / "config.yaml"


def db_path() -> Path:
    return app_home() / "hcloader.db"


def archive_path() -> Path:
    return app_home() / "archive.txt"


def logs_dir() -> Path:
    return app_home() / "logs"


_ENV_RE = re.compile(r"%([^%]+)%")


def expand_path(value: str) -> Path:
    """Expand %VAR% (e.g. %USERPROFILE%) and ~ in a configured path; works on any platform.

    A path that is still relative afterwards is resolved against the app folder in portable
    mode only; otherwise it stays relative (working directory), as before."""

    def repl(m: re.Match[str]) -> str:
        name = m.group(1)
        found = os.environ.get(name)
        if found:
            return found
        if name.upper() == "USERPROFILE":
            return str(Path.home())
        if name.upper() == "APPDATA":
            return str(_roaming_dir())
        return m.group(0)

    text = _ENV_RE.sub(repl, value)
    if sys.platform != "win32":
        text = text.replace("\\", "/")
    path = Path(text).expanduser()
    if not path.is_absolute():
        root = app_root()
        if is_portable(root):
            # portable (e.g. USB stick): ".\\Music" lives next to the app, wherever it is.
            # On Windows "\\Music" (no drive) gets the app folder's drive.
            return root / path
    return path


# --------------------------------------------------------------------------- models


class _Section(BaseModel):
    model_config = ConfigDict(extra="ignore", validate_assignment=False)


def _clean_list(v: Any) -> Any:
    if isinstance(v, list):
        return [s.strip() for s in v if isinstance(s, str) and s.strip()]
    return v


class GeneralSettings(_Section):
    # UI + message language (docs/TRANSLATING.md); "auto" = Windows display language, else en
    # de-x-frk = Franconian fun dialect (never chosen by "auto"; missing keys -> de -> en)
    # nl-BE = Flemish variant (partial catalog; missing keys -> nl -> en; "auto" for nl-BE only)
    language: Literal[
        "auto",
        *("en", "de", "zh-CN", "hi", "es", "fr", "bn", "pt", "ru", "id", "nl", "nl-BE"),
        *("sv", "nb", "fi", "lt", "lv", "et", "de-x-frk"),
    ] = "en"
    start_view: Literal[
        "discover", "inbox", "watchlist", "downloads", "library", "stats", "log"
    ] = "discover"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    confirm_delete: bool = True


class SearchSettings(_Section):
    results_count: int = Field(30, ge=1, le=100)
    append_year: bool = True


class FilterSettings(_Section):
    min_duration: int = Field(600, ge=0)
    max_duration: int = Field(0, ge=0)
    upload_period: Literal["all", "7d", "30d", "1y", "year", "custom"] = "all"
    upload_year: int = Field(0, validate_default=True)
    upload_from: str = Field("", validate_default=True)
    upload_to: str = Field("", validate_default=True)
    include_keywords: list[str] = Field(default_factory=lambda: list(DEFAULT_INCLUDE_KEYWORDS))
    exclude_keywords: list[str] = Field(default_factory=lambda: list(DEFAULT_EXCLUDE_KEYWORDS))
    match_description: bool = False
    hide_done_ignored: bool = True
    apply_channel_blacklist: bool = True
    # Phase 7a: hide hits that probably are the same mix already loaded from another platform
    hide_cross_platform_duplicates: bool = False

    _clean = field_validator("include_keywords", "exclude_keywords", mode="before")(_clean_list)

    @field_validator("upload_year")
    @classmethod
    def _upload_year(cls, v: int, info: Any) -> int:
        if v != 0 and not (MIN_UPLOAD_YEAR <= v <= datetime.now().year):
            raise ValueError(tr("config.year_range", min=MIN_UPLOAD_YEAR, max=datetime.now().year))
        if v == 0 and info.data.get("upload_period") == "year":
            raise ValueError(tr("config.year_missing"))
        return v

    @field_validator("upload_from", "upload_to", mode="before")
    @classmethod
    def _date_text(cls, v: Any) -> Any:
        return v.strip() if isinstance(v, str) else v

    @field_validator("upload_from", "upload_to")
    @classmethod
    def _date_format(cls, v: str) -> str:
        if v:
            try:
                datetime.strptime(v, "%Y-%m-%d")
            except ValueError:
                raise ValueError(tr("config.invalid_date")) from None
        return v

    @field_validator("upload_to")
    @classmethod
    def _to_after_from(cls, v: str, info: Any) -> str:
        start = info.data.get("upload_from")
        if v and start and v < start:
            raise ValueError(tr("config.to_before_from"))
        return v

    @field_validator("max_duration")
    @classmethod
    def _max_duration(cls, v: int, info: Any) -> int:
        low = info.data.get("min_duration")
        if v and low is not None and v < low:
            raise ValueError(tr("config.max_below_min"))
        return v


class GenreItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(min_length=1)
    color: str = Field("#6b6b78", pattern=r"^#[0-9a-fA-F]{6}$")
    keywords: list[str] = Field(default_factory=list)
    priority: int = 99

    @field_validator("name", mode="before")
    @classmethod
    def _strip_name(cls, v: Any) -> Any:
        return v.strip() if isinstance(v, str) else v

    _clean = field_validator("keywords", mode="before")(_clean_list)


def default_genres() -> list[GenreItem]:
    return [
        GenreItem(
            name="Uptempo",
            color="#b6ff00",
            keywords=["uptempo", "up-tempo", "terror", "terrorcore", "speedcore"],
            priority=1,
        ),
        GenreItem(
            name="Hardcore",
            color="#ff1f1f",
            keywords=[
                "hardcore",
                "gabber",
                "gabba",
                "frenchcore",
                "industrial",
                "early hardcore",
                "millennium",
                "mainstream hardcore",
            ],
            priority=2,
        ),
        GenreItem(
            name="Hardstyle",
            color="#a43bff",
            keywords=["hardstyle", "rawstyle", "raw", "euphoric", "xtra raw", "reverse bass"],
            priority=3,
        ),
        GenreItem(name=UNSORTED, color="#6b6b78", keywords=[], priority=99),
    ]


class GenreSettings(_Section):
    items: list[GenreItem] = Field(default_factory=default_genres)

    @field_validator("items")
    @classmethod
    def _unique_and_fallback(cls, items: list[GenreItem]) -> list[GenreItem]:
        seen: set[str] = set()
        for g in items:
            key = g.name.casefold()
            if key in seen:
                raise ValueError(tr("config.genre_names_unique", name=g.name))
            seen.add(key)
        if UNSORTED.casefold() not in seen:
            items = [*items, GenreItem(name=UNSORTED, color="#6b6b78", keywords=[], priority=99)]
        return items


class DownloadSettings(_Section):
    audio_format: Literal["mp3", "original"] = "mp3"
    mp3_quality: Literal["320", "v0"] = "320"
    embed_cover: bool = True
    write_cover_jpg: bool = False
    write_cue: bool = True
    write_id3_chapters: bool = True
    # Phase 7a: SoundCloud mostly streams 128 kbps (MP3) / 160 kbps (AAC); converting to MP3 320
    # only makes the file bigger. True = keep the original audio (M4A/MP3/Opus) for SoundCloud.
    keep_original_soundcloud: bool = True

    @field_validator("mp3_quality", mode="before")
    @classmethod
    def _quality(cls, v: Any) -> Any:
        if isinstance(v, int) and not isinstance(v, bool):
            return str(v)
        if isinstance(v, str):
            return v.strip().lower()
        return v


class StorageSettings(_Section):
    target_dir: str = Field(r"%USERPROFILE%\Music\HCLoader", min_length=1)
    path_template: str = Field("{genre}/{artist}/{year}/{date} - {title} [{id}]", min_length=1)
    max_title_length: int = Field(120, ge=20, le=200)
    max_path_length: int = Field(240, ge=100, le=259)
    artist_from_title: bool = False
    # v0.3.0: album tag = edition («Defqon.1 2024») when a festival/series is assigned
    album_from_edition: bool = True
    title_cleanup_patterns: list[str] = Field(
        default_factory=lambda: list(DEFAULT_CLEANUP_PATTERNS)
    )

    @field_validator("path_template")
    @classmethod
    def _template(cls, v: str) -> str:
        allowed = {
            *("genre", "artist", "channel", "year", "date", "title", "id", "platform"),
            *("festival", "event_year", "stage"),  # v0.3.0, empty -> cleaned away
        }
        names = set(re.findall(r"\{([^{}]*)\}", v))
        unknown = sorted(names - allowed)
        if unknown:
            raise ValueError(
                tr(
                    "config.unknown_placeholders",
                    bad=", ".join(unknown),
                    allowed=", ".join(sorted(allowed)),
                )
            )
        if "id" not in names:
            raise ValueError(tr("config.id_placeholder"))
        return v

    @field_validator("title_cleanup_patterns", mode="before")
    @classmethod
    def _patterns(cls, v: Any) -> Any:
        v = _clean_list(v)
        if isinstance(v, list):
            for i, pat in enumerate(v):
                try:
                    re.compile(pat)
                except re.error as exc:
                    raise ValueError(tr("config.invalid_regex", n=i + 1, error=exc)) from exc
        return v


class ThrottleSettings(_Section):
    sleep_requests: float = Field(3.0, ge=0, le=60)
    sleep_interval: int = Field(30, ge=0, le=3600)
    max_sleep_interval: int = Field(120, ge=0, le=7200)
    limit_rate_mb: float = Field(3.0, ge=0)
    max_downloads_per_run: int = Field(10, ge=1, le=100)
    max_downloads_per_day: int = Field(25, ge=1, le=500)
    max_searches_per_hour: int = Field(20, ge=1, le=200)
    backoff_initial_hours: float = Field(6.0, ge=0.5, le=168)
    backoff_max_hours: float = Field(48.0, ge=0.5)

    @field_validator("max_sleep_interval")
    @classmethod
    def _max_sleep(cls, v: int, info: Any) -> int:
        low = info.data.get("sleep_interval")
        if low is not None and v < low:
            raise ValueError(tr("config.ge_min_interval"))
        return v

    @field_validator("backoff_max_hours")
    @classmethod
    def _backoff_max(cls, v: float, info: Any) -> float:
        low = info.data.get("backoff_initial_hours")
        if low is not None and v < low:
            raise ValueError(tr("config.ge_initial_backoff"))
        return v


class SoundCloudSettings(ThrottleSettings):
    """Phase 7a: SoundCloud on/off and its own throttle (same cautious defaults as YouTube).
    Counters and backoff are kept per platform: a 429 from SoundCloud never blocks YouTube."""

    enabled: bool = True


class NetworkSettings(_Section):
    po_token_mode: Literal["off", "script", "http"] = "script"
    po_token_port: int = Field(4416, ge=1024, le=65535)
    po_token_ttl_hours: float = Field(6.0, ge=0.5, le=48)
    cookies_from_browser: Literal["", "edge", "chrome", "firefox", "brave"] = ""
    proxy: str = ""

    @field_validator("proxy", "cookies_from_browser", mode="before")
    @classmethod
    def _strip(cls, v: Any) -> Any:
        return v.strip() if isinstance(v, str) else v


class ScheduleSettings(_Section):
    watchlist_interval_hours: float = Field(24.0, ge=1, le=168)
    in_app_check: bool = True
    task_scheduler_enabled: bool = False
    task_time: str = Field("03:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    entries_per_source: int = Field(30, ge=1, le=200)


class WatchlistSettings(_Section):
    """v0.4.0 «Read everything (once)»: cap per source and pacing of the backfill requests."""

    backfill_max_entries: int = Field(2000, ge=100, le=10000)
    backfill_requests_per_hour: int = Field(120, ge=10, le=600)


class AppearanceSettings(_Section):
    reduce_effects: bool = False
    scanlines: bool = True
    pulse_bpm: int = Field(200, ge=60, le=300)


class PlayerSettings(_Section):
    """Phase 8: `internal` = built-in player bar, `external` = system default player."""

    mode: Literal["internal", "external"] = "internal"
    # v0.7.0: loudness normalisation in the built-in player (ReplayGain from the analysis/tags)
    normalize: bool = True
    target_lufs: float = Field(-18.0, ge=-30.0, le=-6.0)
    # v0.7.0 player memory: ask = offer to resume, auto = resume silently, off = forget nothing/
    # remember nothing (no «continue listening» list)
    resume: Literal["ask", "auto", "off"] = "ask"
    # v0.7.0: waveform seek bar (peaks computed offline with ffmpeg, plain bar as fallback)
    waveform: bool = True


class LoudnessSettings(_Section):
    """v0.7.0: offline audio analysis with ffmpeg (EBU R128 loudness + true peak, waveform
    peaks). Never re-encodes: only tags are written (ReplayGain 2.0 / R128 for Opus)."""

    analyse_after_download: bool = True
    write_tags: bool = True
    waveforms: bool = True


class PlaylistSettings(_Section):
    """v0.8.0 playlist export (M3U8). `folder` empty = «Playlists» inside the target folder."""

    folder: str = ""
    relative_paths: bool = True
    sync_after_download: bool = False

    @field_validator("folder", mode="before")
    @classmethod
    def _folder(cls, v: Any) -> Any:
        return v.strip() if isinstance(v, str) else ("" if v is None else v)


_HHMM = r"^([01]\d|2[0-3]):[0-5]\d$"


class NotificationSettings(_Section):
    """v0.9.0 Windows notifications (core/notify.py). One aggregated toast per batch of events,
    nothing during the quiet hours (collected and shown as one summary afterwards)."""

    enabled: bool = True
    new_sets: bool = True  # a watchlist check (app or scheduled task) put new sets in the inbox
    downloads_done: bool = True
    downloads_failed: bool = True
    quiet_hours: bool = False
    quiet_from: str = Field("22:00", pattern=_HHMM)
    quiet_to: str = Field("07:00", pattern=_HHMM)


MEDIA_SERVER_TYPES = ("off", "plex", "jellyfin")


class MediaServerSettings(_Section):
    """v0.9.0 Plex/Jellyfin library scan after downloads (core/mediaserver.py). The token / API
    key is NOT here: it lives in the Windows Credential Manager (core/credentials.py)."""

    type: Literal["off", "plex", "jellyfin"] = "off"
    url: str = ""
    # Plex section key / Jellyfin library id; "" = all libraries
    library: str = ""
    library_name: str = ""  # display only (chosen from the «Test connection» list)
    # the target folder as the server sees it (NAS, Docker: /data/music); "" = same path
    server_root: str = ""
    delay_seconds: int = Field(120, ge=10, le=3600)
    verify_tls: bool = True

    @field_validator("url", "library", "library_name", "server_root", mode="before")
    @classmethod
    def _strip(cls, v: Any) -> Any:
        return v.strip() if isinstance(v, str) else ("" if v is None else v)

    @field_validator("url")
    @classmethod
    def _url(cls, v: str, info: Any) -> str:
        v = v.rstrip("/")
        if not v:
            if info.data.get("type", "off") != "off":
                raise ValueError(tr("config.media_url_missing"))
            return v
        from urllib.parse import urlsplit

        try:
            parts = urlsplit(v)
            parts.port  # noqa: B018 - raises ValueError on a bad port
        except ValueError:
            raise ValueError(tr("config.media_url_invalid")) from None
        if (
            parts.scheme not in ("http", "https")
            or not parts.hostname
            or parts.username
            or parts.password
            or parts.query
            or parts.fragment
            or any(c.isspace() for c in v)
        ):
            raise ValueError(tr("config.media_url_invalid"))
        return v

    @field_validator("library", "library_name", "server_root")
    @classmethod
    def _len(cls, v: str) -> str:
        if len(v) > 400 or any(c in v for c in "\r\n\x00"):
            raise ValueError(tr("config.invalid_format"))
        return v


# v0.3.0 festivals & series: codes = app/core/festivals.py SET_TYPES (UI translates them)
SET_TYPE_CODES = (
    "live_set",
    "closing_ceremony",
    "opening",
    "endshow",
    "full_show",
    "warm_up",
    "anthem",
    "episode",
)


class SetTypeKeyword(BaseModel):
    """User keyword for a set type, e.g. {keyword: "afterburner", set_type: "endshow"}."""

    model_config = ConfigDict(extra="ignore")

    keyword: str = Field(min_length=1, max_length=60)
    set_type: str

    @field_validator("keyword", mode="before")
    @classmethod
    def _strip(cls, v: Any) -> Any:
        return v.strip() if isinstance(v, str) else v

    @field_validator("set_type")
    @classmethod
    def _code(cls, v: str) -> str:
        if v not in SET_TYPE_CODES:
            raise ValueError(tr("config.unknown_set_type", value=v))
        return v


class FestivalSettings(_Section):
    """v0.3.0 «Festivals & series» tab. The series list itself lives in the database
    (built-ins from app/data/series.yaml + user series), not here."""

    detect: bool = True
    min_confidence: float = Field(0.65, ge=0.3, le=1.0)
    year_from_upload_date: bool = True
    match_description: bool = True
    extra_stages: list[str] = Field(default_factory=list)
    extra_set_types: list[SetTypeKeyword] = Field(default_factory=list)
    # v0.5.0 «Festival collector»: pacing and certainty of the per-row search of a checklist
    collector_searches_per_hour: int = Field(10, ge=1, le=200)
    collector_results_per_search: int = Field(10, ge=1, le=20)  # >20 = several requests
    collector_auto_confirm: float = Field(0.85, ge=0.5, le=1.0)

    _clean = field_validator("extra_stages", mode="before")(_clean_list)

    @field_validator("extra_stages")
    @classmethod
    def _stage_len(cls, v: list[str]) -> list[str]:
        for s in v:
            if len(s) > 40:
                raise ValueError(tr("config.stage_too_long", name=s[:40]))
        return v


DEFAULT_UPDATE_REPO = "kellerict/HCLoader"
_REPO_RE = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})/[A-Za-z0-9._-]{1,100}$")


class MaintenanceSettings(_Section):
    check_updates_on_start: bool = True
    # self-update of HCLoader itself (GitHub releases, docs/decisions.md "Selbst-Update")
    check_app_updates_on_start: bool = True
    apply_update_on_exit: bool = True
    update_repo: str = DEFAULT_UPDATE_REPO

    @field_validator("update_repo", mode="before")
    @classmethod
    def _repo(cls, v: Any) -> Any:
        if v is None or (isinstance(v, str) and not v.strip()):
            return DEFAULT_UPDATE_REPO
        if isinstance(v, str):
            v = v.strip().strip("/")
            if v.lower().startswith("https://github.com/"):
                v = v[len("https://github.com/") :].strip("/")
            if v.endswith(".git"):
                v = v[:-4]
            if not _REPO_RE.match(v) or ".." in v:
                raise ValueError(tr("config.repo_format"))
        return v


class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")

    general: GeneralSettings = Field(default_factory=GeneralSettings)
    search: SearchSettings = Field(default_factory=SearchSettings)
    filters: FilterSettings = Field(default_factory=FilterSettings)
    genres: GenreSettings = Field(default_factory=GenreSettings)
    download: DownloadSettings = Field(default_factory=DownloadSettings)
    storage: StorageSettings = Field(default_factory=StorageSettings)
    throttle: ThrottleSettings = Field(default_factory=ThrottleSettings)
    network: NetworkSettings = Field(default_factory=NetworkSettings)
    soundcloud: SoundCloudSettings = Field(default_factory=SoundCloudSettings)
    schedule: ScheduleSettings = Field(default_factory=ScheduleSettings)
    watchlist: WatchlistSettings = Field(default_factory=WatchlistSettings)
    appearance: AppearanceSettings = Field(default_factory=AppearanceSettings)
    maintenance: MaintenanceSettings = Field(default_factory=MaintenanceSettings)
    player: PlayerSettings = Field(default_factory=PlayerSettings)
    loudness: LoudnessSettings = Field(default_factory=LoudnessSettings)
    festivals: FestivalSettings = Field(default_factory=FestivalSettings)
    playlists: PlaylistSettings = Field(default_factory=PlaylistSettings)
    notifications: NotificationSettings = Field(default_factory=NotificationSettings)
    media_server: MediaServerSettings = Field(default_factory=MediaServerSettings)

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump(mode="json")

    def target_dir_path(self) -> Path:
        return expand_path(self.storage.target_dir)

    def playlist_dir_path(self) -> Path:
        """v0.8.0: default folder for exported playlists."""
        if self.playlists.folder:
            return expand_path(self.playlists.folder)
        return self.target_dir_path() / "Playlists"

    def throttle_for(self, platform: str) -> ThrottleSettings:
        """Throttle limits of a platform (`throttle` = YouTube, `soundcloud` = SoundCloud)."""
        return self.soundcloud if platform == "soundcloud" else self.throttle


SECTION_MODELS: dict[str, type[_Section]] = {
    name: field.annotation  # type: ignore[misc]
    for name, field in Settings.model_fields.items()
}
SECTIONS = tuple(SECTION_MODELS)


def defaults() -> Settings:
    return Settings()


def defaults_dict() -> dict[str, Any]:
    return defaults().to_dict()


def reset(settings: Settings, section: str | None = None) -> Settings:
    """Return a copy with `section` (or everything) reset to defaults."""
    if section is None:
        return defaults()
    if section not in SECTION_MODELS:
        raise KeyError(f"Unknown section: {section}")
    data = settings.to_dict()
    data[section] = defaults_dict()[section]
    return Settings.model_validate(data)


# --------------------------------------------------------------------------- validation

# pydantic error type -> message key (app/locales), translated per call
_TYPE_MESSAGES = {
    "int_parsing": "config.must_int",
    "int_from_float": "config.must_int",
    "float_parsing": "config.must_number",
    "bool_parsing": "config.must_bool",
    "bool_type": "config.must_bool",
    "string_type": "config.must_text",
    "list_type": "config.must_list",
    "missing": "config.required",
    "string_too_short": "config.not_empty",
    "too_short": "config.not_empty",
    "string_pattern_mismatch": "config.invalid_format",
    "int_type": "config.must_int",
    "float_type": "config.must_number",
}


def _fmt_num(v: Any) -> str:
    return str(int(v)) if isinstance(v, float) and v.is_integer() else str(v)


def _error_message(err: dict[str, Any]) -> str:
    etype, ctx = err["type"], err.get("ctx") or {}
    if etype == "greater_than_equal":
        return tr("config.at_least", v=_fmt_num(ctx["ge"]))
    if etype == "less_than_equal":
        return tr("config.at_most", v=_fmt_num(ctx["le"]))
    if etype == "literal_error":
        return tr("config.allowed_values", values=ctx.get("expected", "")).replace("'", "")
    if etype == "value_error":
        return str(ctx.get("error", err["msg"])).removeprefix("Value error, ")
    if etype == "string_pattern_mismatch":
        return tr("config.invalid_format") + (
            " (HH:MM)" if "[0-5]" in str(ctx.get("pattern")) else ""
        )
    if etype in _TYPE_MESSAGES:
        return tr(_TYPE_MESSAGES[etype])
    return err["msg"].removeprefix("Value error, ")


def _errors_to_dict(exc: ValidationError, prefix: tuple[str, ...] = ()) -> dict[str, str]:
    out: dict[str, str] = {}
    for err in exc.errors():
        loc = [str(p) for p in (*prefix, *err["loc"])]
        out.setdefault(".".join(loc) or "settings", _error_message(err))
    return out


def parse_settings(values: dict[str, Any]) -> tuple[Settings | None, dict[str, str]]:
    """Validate a full or partial values dict. Missing keys fall back to defaults.

    Returns (settings, {}) on success or (None, {"section.key": "Meldung"}).
    """
    if not isinstance(values, dict):
        return None, {"settings": tr("config.invalid_settings")}
    try:
        return Settings.model_validate(values), {}
    except ValidationError as exc:
        errors = _errors_to_dict(exc)
        errors.update(_duplicate_genre_errors(values))
        return None, errors


def _duplicate_genre_errors(values: dict[str, Any]) -> dict[str, str]:
    """Point duplicate genre names at the offending row: {"genres.items.<i>.name": ...}."""
    items = (
        (values.get("genres") or {}).get("items")
        if isinstance(values.get("genres"), dict)
        else None
    )
    if not isinstance(items, list):
        return {}
    out: dict[str, str] = {}
    seen: set[str] = set()
    for i, item in enumerate(items):
        name = item.get("name") if isinstance(item, dict) else None
        if not isinstance(name, str) or not name.strip():
            continue
        key = name.strip().casefold()
        if key in seen:
            out[f"genres.items.{i}.name"] = tr("config.name_twice", name=name.strip())
        seen.add(key)
    return out


def validate_settings(values: dict[str, Any]) -> dict[str, str]:
    """Return {"section.key": "deutsche Meldung"}; empty dict means valid."""
    return parse_settings(values)[1]


# --------------------------------------------------------------------------- YAML

SECTION_TITLES = {
    "general": "Allgemein",
    "search": "Suche",
    "filters": "Filter & Keywords",
    "genres": "Genres",
    "download": "Download & Qualität",
    "storage": "Ablage & Tags",
    "throttle": "Schonung von YouTube",
    "network": "Netzwerk & PO-Token",
    "soundcloud": "SoundCloud",
    "schedule": "Zeitplan",
    "watchlist": "Watchlist",
    "appearance": "Darstellung",
    "maintenance": "Wartung",
    "player": "Player",
    "loudness": "Lautheit & Wellenform",
    "festivals": "Festivals & Serien",
    "playlists": "Playlists (M3U8)",
    "notifications": "Benachrichtigungen",
    "media_server": "Medienserver (Plex/Jellyfin)",
}

COMMENTS = {
    "general.language": "Sprache der Oberfläche: auto (Windows-Sprache), en, de, zh-CN, hi, es, fr, bn, pt, ru, id, nl, nl-BE (Vlaams), sv, nb, fi, lt, lv, et, de-x-frk (Fränggisch)",
    "general.start_view": "Startansicht: discover, inbox, watchlist, downloads, library, stats, log",
    "general.log_level": "Log-Stufe: DEBUG, INFO, WARNING, ERROR",
    "general.confirm_delete": "Vor dem Löschen aus der Bibliothek nachfragen",
    "search.results_count": "Anzahl Treffer pro Suche (1-100)",
    "search.append_year": "Bei Jahr-Filter die Jahreszahl an den Suchbegriff anhängen",
    "filters.min_duration": "Mindestdauer in Sekunden (600 = 10 Minuten)",
    "filters.max_duration": "Maximaldauer in Sekunden, 0 = unbegrenzt",
    "filters.upload_period": "Upload-Zeitraum: all, 7d, 30d, 1y, year, custom",
    "filters.upload_year": "Jahr (nur bei upload_period: year), 0 = nicht gesetzt",
    "filters.upload_from": "Von-Datum JJJJ-MM-TT (nur bei upload_period: custom)",
    "filters.upload_to": "Bis-Datum JJJJ-MM-TT (nur bei upload_period: custom)",
    "filters.include_keywords": "Include-Keywords: mindestens eines muss im Titel vorkommen (leer = egal)",
    "filters.exclude_keywords": "Exclude-Keywords: Treffer mit einem dieser Begriffe werden verworfen",
    "filters.match_description": "Keywords auch in der Beschreibung suchen (flache Abfragen liefern sie oft nicht)",
    "filters.hide_done_ignored": "Bereits geladene/ignorierte Videos ausblenden",
    "filters.apply_channel_blacklist": "Kanal-Blacklist anwenden",
    "filters.hide_cross_platform_duplicates": "Vermutlich schon von der anderen Plattform geladene Mixes ausblenden (gleiche Dauer +-5 s, ähnlicher Titel)",
    "genres.items": "Genres in Prioritätsreihenfolge; 'Unsortiert' ist immer vorhanden",
    "download.audio_format": "mp3 oder original (keine Umwandlung)",
    "download.mp3_quality": "MP3-Qualität: 320 (CBR) oder v0 (VBR)",
    "download.embed_cover": "Cover (quadratisch zugeschnitten) in die MP3 einbetten",
    "download.write_cover_jpg": "Zusätzlich cover.jpg neben die Datei legen",
    "download.write_cue": "CUE-Datei aus Kapiteln erzeugen",
    "download.write_id3_chapters": "ID3-Kapitel (CHAP/CTOC) einbetten",
    "download.keep_original_soundcloud": "SoundCloud: Original behalten (meist 128-160 kbps; MP3 320 bringt nichts)",
    "storage.target_dir": "Zielordner; %USERPROFILE% wird ersetzt; relativ (z.B. .\\Music) = zum App-Ordner, nur Portable-Version",
    "storage.path_template": "Ordner-/Dateimuster; Platzhalter: genre, artist, channel, year, date, title, id, platform (id bei SoundCloud: sc-<id>), festival, event_year, stage (leer = entfällt)",
    "storage.max_title_length": "Maximale Titellänge im Dateinamen (20-200)",
    "storage.max_path_length": "Maximale Gesamtpfadlänge (100-259, Windows-Limit)",
    "storage.artist_from_title": "Artist aus dem Titel ableiten (ARTIST @ EVENT / ARTIST - TITEL)",
    "storage.album_from_edition": "Album-Tag = Ausgabe (z.B. «Defqon.1 2024»), wenn ein Festival/eine Serie zugeordnet ist",
    "storage.title_cleanup_patterns": "Reguläre Ausdrücke, die aus dem Titel entfernt werden",
    "throttle.sleep_requests": "Pause zwischen Metadaten-Requests in Sekunden (0-60)",
    "throttle.sleep_interval": "Minimale Pause zwischen Downloads in Sekunden",
    "throttle.max_sleep_interval": "Maximale Pause zwischen Downloads (>= minimal)",
    "throttle.limit_rate_mb": "Download-Tempo in MB/s, 0 = unbegrenzt",
    "throttle.max_downloads_per_run": "Maximale Downloads pro Lauf (1-100)",
    "throttle.max_downloads_per_day": "Maximale Downloads pro Tag (1-500)",
    "throttle.max_searches_per_hour": "Maximale Suchen pro Stunde (1-200)",
    "throttle.backoff_initial_hours": "Sperrzeit nach HTTP 429 / Bot-Check in Stunden (0.5-168)",
    "throttle.backoff_max_hours": "Obergrenze der Sperrzeit (Verdopplung bis hierhin)",
    "network.po_token_mode": "PO-Token: off, script (Deno) oder http (Provider-Server)",
    "network.po_token_port": "Port des PO-Token-Servers (HTTP-Modus)",
    "network.po_token_ttl_hours": "Gültigkeit des PO-Tokens in Stunden",
    "network.cookies_from_browser": "Notlösung: Cookies aus Browser (edge, chrome, firefox, brave); leer = aus",
    "network.proxy": "Optionaler Proxy, z.B. http://127.0.0.1:8080",
    "soundcloud.enabled": "SoundCloud als zweite Plattform nutzen (Suche, Watchlist, Downloads)",
    "soundcloud.sleep_requests": "SoundCloud: Pause zwischen Metadaten-Requests in Sekunden (0-60)",
    "soundcloud.sleep_interval": "SoundCloud: minimale Pause zwischen Downloads in Sekunden",
    "soundcloud.max_sleep_interval": "SoundCloud: maximale Pause zwischen Downloads (>= minimal)",
    "soundcloud.limit_rate_mb": "SoundCloud: Download-Tempo in MB/s, 0 = unbegrenzt",
    "soundcloud.max_downloads_per_run": "SoundCloud: maximale Downloads pro Lauf (1-100)",
    "soundcloud.max_downloads_per_day": "SoundCloud: maximale Downloads pro Tag (1-500)",
    "soundcloud.max_searches_per_hour": "SoundCloud: maximale Suchen pro Stunde (1-200)",
    "soundcloud.backoff_initial_hours": "SoundCloud: Sperrzeit nach HTTP 429 in Stunden (0.5-168)",
    "soundcloud.backoff_max_hours": "SoundCloud: Obergrenze der Sperrzeit (Verdopplung bis hierhin)",
    "schedule.watchlist_interval_hours": "Prüfintervall der Watchlist in Stunden (1-168)",
    "schedule.in_app_check": "Watchlist auch prüfen, solange die App offen ist",
    "schedule.task_scheduler_enabled": "Windows-Aufgabenplanung nutzen",
    "schedule.task_time": "Uhrzeit der geplanten Aufgabe (HH:MM)",
    "schedule.entries_per_source": "Einträge pro Quelle und Prüfung (1-200)",
    "watchlist.backfill_max_entries": "«Alles einlesen (einmalig)»: höchstens so viele Einträge pro Quelle (100-10000)",
    "watchlist.backfill_requests_per_hour": "«Alles einlesen»: höchstens so viele Seiten-Anfragen pro Stunde (10-600, gleichmässig verteilt; Headless-Lauf: Budget pro Lauf)",
    "appearance.reduce_effects": "Effekte reduzieren",
    "appearance.scanlines": "Scanlines-Overlay anzeigen",
    "appearance.pulse_bpm": "Takt des Fortschrittsbalkens in BPM (60-300)",
    "player.mode": "Abspielen: internal (eingebauter Player) oder external (Standardplayer von Windows)",
    "player.normalize": "Eingebauter Player: Lautheit angleichen (ReplayGain aus der Analyse bzw. den Tags, mit Schutz vor Übersteuern)",
    "player.target_lufs": "Ziel-Lautheit des eingebauten Players in LUFS (-30 bis -6; -18 = ReplayGain-2.0-Referenz)",
    "player.resume": "Wiedergabeposition pro Set merken: ask (nachfragen), auto (automatisch fortsetzen), off (nichts merken)",
    "player.waveform": "Wellenform als Zeitleiste im Player (sonst einfacher Balken)",
    "loudness.analyse_after_download": "Nach jedem Download Lautheit und Wellenform offline mit ffmpeg berechnen (niedrige Priorität, eine Datei nach der anderen)",
    "loudness.write_tags": "ReplayGain-2.0-Tags in die Dateien schreiben (MP3: TXXX, M4A: Atome, Opus: R128_TRACK_GAIN); nie neu kodieren",
    "loudness.waveforms": "Wellenform bei Analyse/Durchlauf vorberechnen (aus = erst beim ersten Abspielen)",
    "playlists.folder": "Ordner für exportierte Playlists; leer = «Playlists» im Zielordner",
    "playlists.relative_paths": "Pfade in der Playlist relativ zum Ort der Playlist (anderes Laufwerk: absolut)",
    "playlists.sync_after_download": "Gespeicherte Playlists mit «Aktuell halten» nach jedem Download neu schreiben",
    "notifications.enabled": "Windows-Benachrichtigungen anzeigen (gebündelt, Klick öffnet die App)",
    "notifications.new_sets": "Benachrichtigen, wenn eine Watchlist-Prüfung neue Sets in den Eingang legt (App oder geplante Aufgabe)",
    "notifications.downloads_done": "Benachrichtigen, wenn Downloads fertig sind (eine Meldung pro Lauf)",
    "notifications.downloads_failed": "Benachrichtigen, wenn Downloads fehlschlagen",
    "notifications.quiet_hours": "Ruhezeit: keine Benachrichtigungen; danach eine Zusammenfassung",
    "notifications.quiet_from": "Beginn der Ruhezeit (HH:MM)",
    "notifications.quiet_to": "Ende der Ruhezeit (HH:MM); kleiner als der Beginn = über Mitternacht",
    "media_server.type": "Bibliothek nach Downloads neu einlesen lassen: off, plex, jellyfin (Token/API-Key liegt in der Windows-Anmeldeinformationsverwaltung, nie hier)",
    "media_server.url": "Adresse des Servers, z.B. http://192.168.1.10:32400 (Plex) oder http://nas:8096 (Jellyfin)",
    "media_server.library": "Plex-Bibliotheks-ID bzw. Jellyfin-Bibliotheks-ID; leer = alle Bibliotheken",
    "media_server.library_name": "Name der gewählten Bibliothek (nur Anzeige)",
    "media_server.server_root": "Zielordner aus Sicht des Servers (NAS/Docker, z.B. /data/music/HCLoader); leer = gleicher Pfad",
    "media_server.delay_seconds": "Wartezeit nach dem letzten Download, bevor der Scan ausgelöst wird (10-3600 s, bündelt mehrere Downloads)",
    "media_server.verify_tls": "HTTPS-Zertifikat prüfen (aus nur für selbst signierte Zertifikate im Heimnetz)",
    "maintenance.check_updates_on_start": "Beim Start auf yt-dlp-Updates prüfen (max. 1x pro Tag)",
    "maintenance.check_app_updates_on_start": "Beim Start prüfen, ob eine neue HCLoader-Version da ist (GitHub)",
    "maintenance.apply_update_on_exit": "Ein heruntergeladenes App-Update beim Beenden automatisch einspielen",
    "maintenance.update_repo": "GitHub-Repo für App-Updates (besitzer/repo), für Forks änderbar",
    "festivals.detect": "Festival/Serie, Jahr, Bühne und Set-Art aus Titel/Kanal erkennen (offline, keine Zusatzanfragen)",
    "festivals.min_confidence": "Mindest-Sicherheit für eine automatische Zuordnung (0.3-1.0); darunter nur Vorschlag",
    "festivals.year_from_upload_date": "Ohne Jahreszahl im Titel das Upload-Jahr nehmen",
    "festivals.match_description": "Festivalnamen auch in der Beschreibung suchen (falls gespeichert)",
    "festivals.extra_stages": "Zusätzliche Bühnennamen (zu RED, BLUE, BLACK, UV, Mainstage …)",
    "festivals.extra_set_types": "Zusätzliche Begriffe für Set-Arten: keyword + set_type (live_set, closing_ceremony, opening, endshow, full_show, warm_up, anthem, episode)",
    "festivals.collector_searches_per_hour": "Festival-Sammler: höchstens so viele Suchen pro Stunde für fehlende Sets (1-200, gleichmässig verteilt; zusätzlich gilt throttle.max_searches_per_hour)",
    "festivals.collector_results_per_search": "Festival-Sammler: Treffer pro Suche (1-20: eine Anfrage pro Suche, YouTube liefert etwa 20 pro Seite)",
    "festivals.collector_auto_confirm": "Festival-Sammler: ab dieser Sicherheit gilt ein Treffer ohne Bestätigung (0.5-1.0; nur mit DJ, Festival und Jahr im Titel)",
}

_HEADER = (
    "HCLoader - Konfiguration\n"
    "Alle Werte sind optional; fehlende Werte nehmen den Standard. Kommentare bleiben erhalten."
)


def _plain(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {str(k): _plain(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_plain(v) for v in obj]
    if isinstance(obj, bool) or obj is None:
        return obj
    if isinstance(obj, int):
        return int(obj)
    if isinstance(obj, float):
        return float(obj)
    if isinstance(obj, str):
        return str(obj)
    return obj


def _yaml() -> YAML:
    y = YAML(typ="rt")
    y.default_flow_style = False
    y.width = 100
    y.indent(mapping=2, sequence=4, offset=2)
    return y


def _build_commented(settings: Settings) -> CommentedMap:
    root = CommentedMap()
    data = settings.to_dict()
    for i, (sec, sec_values) in enumerate(data.items()):
        node = CommentedMap(sec_values)
        for key in node:
            text = COMMENTS.get(f"{sec}.{key}")
            if text:
                node.yaml_set_comment_before_after_key(key, before=text, indent=2)
        root[sec] = node
        root.yaml_set_comment_before_after_key(
            sec, before=("\n" if i else "") + f"--- {SECTION_TITLES[sec]} ---"
        )
    root.yaml_set_start_comment(_HEADER)
    return root


def render_yaml(settings: Settings) -> str:
    """Render settings as commented YAML (used for config.example.yaml and fresh files)."""
    import io

    buf = io.StringIO()
    _yaml().dump(_build_commented(settings), buf)
    return buf.getvalue()


def _merge_into(existing: CommentedMap, settings: Settings) -> None:
    """Update values in an existing round-trip document, keeping its comments."""
    fresh = _build_commented(settings)
    for sec, sec_node in fresh.items():
        cur = existing.get(sec)
        if not isinstance(cur, CommentedMap):
            existing[sec] = sec_node
            continue
        for key, value in sec_node.items():
            if key not in cur or _plain(cur[key]) != _plain(value):
                cur[key] = value
        # unknown keys in the existing file stay untouched (forward compatibility)


def _backup_unreadable(path: Path) -> None:
    """Keep an unreadable config.yaml as `config.yaml.bak-<timestamp>` before it is replaced."""
    backup = path.with_name(f"{path.name}.bak-{datetime.now():%Y%m%d-%H%M%S}")
    try:
        shutil.copy2(path, backup)
        log.warning(tr("config.unreadable_backed_up", path=backup))
    except OSError as exc:
        log.error(tr("config.unreadable_backup_failed", error=exc))


def save(settings: Settings, path: Path | None = None) -> Path:
    """Write settings to YAML (atomic), preserving comments of an existing file."""
    import io

    path = path or config_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    y = _yaml()
    doc: CommentedMap | None = None
    if path.exists():
        try:
            loaded = y.load(path.read_text(encoding="utf-8"))
            if isinstance(loaded, CommentedMap):
                doc = loaded
        except Exception:  # corrupt file: overwrite with fresh content
            log.warning(tr("config.unreadable_rewrite", error=path))
        if doc is None:
            _backup_unreadable(path)
    if doc is None:
        doc = _build_commented(settings)
    else:
        _merge_into(doc, settings)
    buf = io.StringIO()
    y.dump(doc, buf)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(buf.getvalue(), encoding="utf-8", newline="\n")
    os.replace(tmp, path)
    return path


def _repair_section(model: type[_Section], data: Any, name: str, warnings: list[str]) -> _Section:
    if not isinstance(data, dict):
        if data is not None:
            warnings.append(tr("config.section_invalid", section=name))
        return model()
    data = dict(data)
    for _ in range(3):
        try:
            return model.model_validate(data)
        except ValidationError as exc:
            bad = {err["loc"][0] for err in exc.errors() if err["loc"]}
            for key in bad:
                warnings.append(tr("config.value_invalid", section=name, field=key))
                data.pop(key, None)
    warnings.append(tr("config.section_invalid", section=name))
    return model()


def _normalize(settings: Settings) -> None:
    for t in (settings.throttle, settings.soundcloud):
        if t.max_sleep_interval < t.sleep_interval:
            t.max_sleep_interval = t.sleep_interval
        if t.backoff_max_hours < t.backoff_initial_hours:
            t.backoff_max_hours = t.backoff_initial_hours


def installer_defaults(file: Path | None = None) -> dict[str, Any]:
    """Choices made in the installer (`<app folder>/installer-defaults.json`, e.g.
    `{"maintenance": {"check_app_updates_on_start": false}}`). Only known sections that are
    objects; missing or unreadable file -> {} (DEBUG log, the installer is optional)."""
    file = file or app_root() / INSTALLER_DEFAULTS
    try:
        data = json.loads(file.read_text(encoding="utf-8-sig"))
    except FileNotFoundError:
        return {}
    except (OSError, ValueError) as exc:
        log.debug("Installer defaults %s not readable: %s", file, exc)
        return {}
    if not isinstance(data, dict):
        return {}
    return {k: v for k, v in data.items() if k in SECTION_MODELS and isinstance(v, dict)}


def _from_raw(raw: dict[str, Any], warnings: list[str]) -> Settings:
    sections = {
        name: _repair_section(model, raw.get(name), name, warnings)
        for name, model in SECTION_MODELS.items()
    }
    settings = Settings.model_construct(**sections)
    _normalize(settings)
    return settings


def load_with_warnings(
    path: Path | None = None, *, installer_file: Path | None = None
) -> tuple[Settings, list[str]]:
    """Load config; missing values -> defaults, invalid file/values -> defaults + warnings.

    Precedence: an existing config.yaml (also one that is empty or broken) always wins. Only when
    there is no config.yaml yet (first start) the installer's choices
    (`installer-defaults.json`, see `installer_defaults`) are laid over the built-in defaults;
    they end up in config.yaml with the first save. A later install never changes a config.
    """
    path = path or config_path()
    warnings: list[str] = []
    if not path.exists():
        preset = installer_defaults(installer_file)
        if not preset:
            return defaults(), warnings
        ignored: list[str] = []  # invalid installer values: built-in default, DEBUG only
        settings = _from_raw(preset, ignored)
        for w in ignored:
            log.debug("Installer defaults: %s", w)
        return settings, warnings
    try:
        raw = _plain(_yaml().load(path.read_text(encoding="utf-8")))
    except Exception as exc:
        warnings.append(tr("config.file_invalid", error=exc.__class__.__name__))
        return defaults(), warnings
    if raw is None:
        return defaults(), warnings
    if not isinstance(raw, dict):
        warnings.append(tr("config.file_bad_format"))
        return defaults(), warnings
    return _from_raw(raw, warnings), warnings


def load(path: Path | None = None) -> Settings:
    settings, warnings = load_with_warnings(path)
    for w in warnings:
        log.warning(w)
    return settings
