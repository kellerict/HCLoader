"""Settings models (pydantic v2) and YAML load/save.

Contract: docs/settings-schema.md. Keys are English snake_case, user-facing messages German.
"""

from __future__ import annotations

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

log = logging.getLogger(__name__)

APP_NAME = "HCLoader"
UNSORTED = "Unsortiert"

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

VIEWS = ("discover", "inbox", "watchlist", "downloads", "library", "log")


# --------------------------------------------------------------------------- paths


def app_home() -> Path:
    """User data folder: $HCLOADER_HOME, else %APPDATA%\\HCLoader (Windows) or ~/.config/HCLoader."""
    override = os.environ.get("HCLOADER_HOME")
    if override:
        return Path(override)
    if sys.platform == "win32":
        base = os.environ.get("APPDATA")
        return (Path(base) if base else Path.home() / "AppData" / "Roaming") / APP_NAME
    return Path.home() / ".config" / APP_NAME


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
    """Expand %VAR% (e.g. %USERPROFILE%) and ~ in a configured path; works on any platform."""

    def repl(m: re.Match[str]) -> str:
        name = m.group(1)
        found = os.environ.get(name)
        if found:
            return found
        if name.upper() == "USERPROFILE":
            return str(Path.home())
        if name.upper() == "APPDATA":
            return str(app_home().parent)
        return m.group(0)

    text = _ENV_RE.sub(repl, value)
    if sys.platform != "win32":
        text = text.replace("\\", "/")
    return Path(text).expanduser()


# --------------------------------------------------------------------------- models


class _Section(BaseModel):
    model_config = ConfigDict(extra="ignore", validate_assignment=False)


def _clean_list(v: Any) -> Any:
    if isinstance(v, list):
        return [s.strip() for s in v if isinstance(s, str) and s.strip()]
    return v


class GeneralSettings(_Section):
    start_view: Literal["discover", "inbox", "watchlist", "downloads", "library", "log"] = (
        "discover"
    )
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    confirm_delete: bool = True


class SearchSettings(_Section):
    results_count: int = Field(30, ge=1, le=100)


class FilterSettings(_Section):
    min_duration: int = Field(600, ge=0)
    max_duration: int = Field(0, ge=0)
    upload_period: Literal["all", "7d", "30d", "1y"] = "all"
    include_keywords: list[str] = Field(default_factory=lambda: list(DEFAULT_INCLUDE_KEYWORDS))
    exclude_keywords: list[str] = Field(default_factory=lambda: list(DEFAULT_EXCLUDE_KEYWORDS))
    match_description: bool = False
    hide_done_ignored: bool = True
    apply_channel_blacklist: bool = True

    _clean = field_validator("include_keywords", "exclude_keywords", mode="before")(_clean_list)

    @field_validator("max_duration")
    @classmethod
    def _max_duration(cls, v: int, info: Any) -> int:
        low = info.data.get("min_duration")
        if v and low is not None and v < low:
            raise ValueError("Maximum liegt unter der Mindestdauer (0 = unbegrenzt)")
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
                raise ValueError(f"Genre-Namen müssen eindeutig sein ('{g.name}' doppelt)")
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
    title_cleanup_patterns: list[str] = Field(
        default_factory=lambda: list(DEFAULT_CLEANUP_PATTERNS)
    )

    @field_validator("path_template")
    @classmethod
    def _template(cls, v: str) -> str:
        allowed = {"genre", "artist", "channel", "year", "date", "title", "id"}
        names = set(re.findall(r"\{([^{}]*)\}", v))
        unknown = sorted(names - allowed)
        if unknown:
            raise ValueError(
                f"Unbekannte Platzhalter: {', '.join(unknown)} "
                f"(erlaubt: {', '.join(sorted(allowed))})"
            )
        if "id" not in names:
            raise ValueError("Der Platzhalter {id} muss enthalten sein (Eindeutigkeit)")
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
                    raise ValueError(f"Ungültiger regulärer Ausdruck #{i + 1}: {exc}") from exc
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
            raise ValueError("Muss grösser oder gleich dem minimalen Intervall sein")
        return v

    @field_validator("backoff_max_hours")
    @classmethod
    def _backoff_max(cls, v: float, info: Any) -> float:
        low = info.data.get("backoff_initial_hours")
        if low is not None and v < low:
            raise ValueError("Muss grösser oder gleich der anfänglichen Sperrzeit sein")
        return v


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


class AppearanceSettings(_Section):
    reduce_effects: bool = False
    scanlines: bool = True
    pulse_bpm: int = Field(200, ge=60, le=300)


class MaintenanceSettings(_Section):
    check_updates_on_start: bool = True


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
    schedule: ScheduleSettings = Field(default_factory=ScheduleSettings)
    appearance: AppearanceSettings = Field(default_factory=AppearanceSettings)
    maintenance: MaintenanceSettings = Field(default_factory=MaintenanceSettings)

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump(mode="json")

    def target_dir_path(self) -> Path:
        return expand_path(self.storage.target_dir)


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
        raise KeyError(f"Unbekannter Abschnitt: {section}")
    data = settings.to_dict()
    data[section] = defaults_dict()[section]
    return Settings.model_validate(data)


# --------------------------------------------------------------------------- validation

_TYPE_MESSAGES = {
    "int_parsing": "Muss eine ganze Zahl sein",
    "int_from_float": "Muss eine ganze Zahl sein",
    "float_parsing": "Muss eine Zahl sein",
    "bool_parsing": "Muss ja oder nein sein",
    "bool_type": "Muss ja oder nein sein",
    "string_type": "Muss ein Text sein",
    "list_type": "Muss eine Liste sein",
    "missing": "Pflichtfeld",
    "string_too_short": "Darf nicht leer sein",
    "too_short": "Darf nicht leer sein",
    "string_pattern_mismatch": "Ungültiges Format",
    "int_type": "Muss eine ganze Zahl sein",
    "float_type": "Muss eine Zahl sein",
}


def _fmt_num(v: Any) -> str:
    return str(int(v)) if isinstance(v, float) and v.is_integer() else str(v)


def _error_message(err: dict[str, Any]) -> str:
    etype, ctx = err["type"], err.get("ctx") or {}
    if etype == "greater_than_equal":
        return f"Muss mindestens {_fmt_num(ctx['ge'])} sein"
    if etype == "less_than_equal":
        return f"Darf höchstens {_fmt_num(ctx['le'])} sein"
    if etype == "literal_error":
        return f"Erlaubte Werte: {ctx.get('expected', '')}".replace("'", "")
    if etype == "value_error":
        return str(ctx.get("error", err["msg"])).removeprefix("Value error, ")
    if etype == "string_pattern_mismatch":
        return "Ungültiges Format" + (" (HH:MM)" if "[0-5]" in str(ctx.get("pattern")) else "")
    return _TYPE_MESSAGES.get(etype, err["msg"].removeprefix("Value error, "))


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
        return None, {"settings": "Ungültige Einstellungen"}
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
            out[f"genres.items.{i}.name"] = f"Name '{name.strip()}' ist doppelt vergeben"
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
    "schedule": "Zeitplan",
    "appearance": "Darstellung",
    "maintenance": "Wartung",
}

COMMENTS = {
    "general.start_view": "Startansicht: discover, inbox, watchlist, downloads, library, log",
    "general.log_level": "Log-Stufe: DEBUG, INFO, WARNING, ERROR",
    "general.confirm_delete": "Vor dem Löschen aus der Bibliothek nachfragen",
    "search.results_count": "Anzahl Treffer pro Suche (1-100)",
    "filters.min_duration": "Mindestdauer in Sekunden (600 = 10 Minuten)",
    "filters.max_duration": "Maximaldauer in Sekunden, 0 = unbegrenzt",
    "filters.upload_period": "Upload-Zeitraum: all, 7d, 30d, 1y",
    "filters.include_keywords": "Include-Keywords: mindestens eines muss im Titel vorkommen (leer = egal)",
    "filters.exclude_keywords": "Exclude-Keywords: Treffer mit einem dieser Begriffe werden verworfen",
    "filters.match_description": "Keywords auch in der Beschreibung suchen (flache Abfragen liefern sie oft nicht)",
    "filters.hide_done_ignored": "Bereits geladene/ignorierte Videos ausblenden",
    "filters.apply_channel_blacklist": "Kanal-Blacklist anwenden",
    "genres.items": "Genres in Prioritätsreihenfolge; 'Unsortiert' ist immer vorhanden",
    "download.audio_format": "mp3 oder original (keine Umwandlung)",
    "download.mp3_quality": "MP3-Qualität: 320 (CBR) oder v0 (VBR)",
    "download.embed_cover": "Cover (quadratisch zugeschnitten) in die MP3 einbetten",
    "download.write_cover_jpg": "Zusätzlich cover.jpg neben die Datei legen",
    "download.write_cue": "CUE-Datei aus Kapiteln erzeugen",
    "download.write_id3_chapters": "ID3-Kapitel (CHAP/CTOC) einbetten",
    "storage.target_dir": "Zielordner; %USERPROFILE% wird ersetzt",
    "storage.path_template": "Ordner-/Dateimuster; Platzhalter: genre, artist, channel, year, date, title, id",
    "storage.max_title_length": "Maximale Titellänge im Dateinamen (20-200)",
    "storage.max_path_length": "Maximale Gesamtpfadlänge (100-259, Windows-Limit)",
    "storage.artist_from_title": "Artist aus dem Titel ableiten (ARTIST @ EVENT / ARTIST - TITEL)",
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
    "schedule.watchlist_interval_hours": "Prüfintervall der Watchlist in Stunden (1-168)",
    "schedule.in_app_check": "Watchlist auch prüfen, solange die App offen ist",
    "schedule.task_scheduler_enabled": "Windows-Aufgabenplanung nutzen",
    "schedule.task_time": "Uhrzeit der geplanten Aufgabe (HH:MM)",
    "schedule.entries_per_source": "Einträge pro Quelle und Prüfung (1-200)",
    "appearance.reduce_effects": "Effekte reduzieren",
    "appearance.scanlines": "Scanlines-Overlay anzeigen",
    "appearance.pulse_bpm": "Takt des Fortschrittsbalkens in BPM (60-300)",
    "maintenance.check_updates_on_start": "Beim Start auf yt-dlp-Updates prüfen (max. 1x pro Tag)",
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
        log.warning("Unlesbare Konfiguration gesichert als %s", backup)
    except OSError as exc:
        log.error("Backup der unlesbaren Konfiguration fehlgeschlagen: %s", exc)


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
            log.warning("Konfigurationsdatei unlesbar, wird neu geschrieben: %s", path)
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
            warnings.append(f"Abschnitt '{name}' ist ungültig, Standardwerte werden verwendet")
        return model()
    data = dict(data)
    for _ in range(3):
        try:
            return model.model_validate(data)
        except ValidationError as exc:
            bad = {err["loc"][0] for err in exc.errors() if err["loc"]}
            for key in bad:
                warnings.append(f"Ungültiger Wert für {name}.{key}, Standard wird verwendet")
                data.pop(key, None)
    warnings.append(f"Abschnitt '{name}' ist ungültig, Standardwerte werden verwendet")
    return model()


def _normalize(settings: Settings) -> None:
    t = settings.throttle
    if t.max_sleep_interval < t.sleep_interval:
        t.max_sleep_interval = t.sleep_interval
    if t.backoff_max_hours < t.backoff_initial_hours:
        t.backoff_max_hours = t.backoff_initial_hours


def load_with_warnings(path: Path | None = None) -> tuple[Settings, list[str]]:
    """Load config; missing values -> defaults, invalid file/values -> defaults + warnings."""
    path = path or config_path()
    warnings: list[str] = []
    if not path.exists():
        return defaults(), warnings
    try:
        raw = _plain(_yaml().load(path.read_text(encoding="utf-8")))
    except Exception as exc:
        warnings.append(f"Konfigurationsdatei ungültig ({exc.__class__.__name__}): Standardwerte")
        return defaults(), warnings
    if raw is None:
        return defaults(), warnings
    if not isinstance(raw, dict):
        warnings.append("Konfigurationsdatei hat ein ungültiges Format: Standardwerte")
        return defaults(), warnings
    sections = {
        name: _repair_section(model, raw.get(name), name, warnings)
        for name, model in SECTION_MODELS.items()
    }
    settings = Settings.model_construct(**sections)
    _normalize(settings)
    return settings, warnings


def load(path: Path | None = None) -> Settings:
    settings, warnings = load_with_warnings(path)
    for w in warnings:
        log.warning(w)
    return settings
