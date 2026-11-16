"""Pure filter functions (SPEC §4): duration, keywords, status, blacklist, upload period."""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Collection, Iterable, Mapping
from datetime import UTC, date, datetime, timedelta
from typing import Any, Protocol

PERIOD_DAYS = {"7d": 7, "30d": 30, "1y": 365}


class FilterSettingsLike(Protocol):
    min_duration: int
    max_duration: int
    include_keywords: list[str]
    exclude_keywords: list[str]
    match_description: bool
    hide_done_ignored: bool
    apply_channel_blacklist: bool


def normalize(text: str | None) -> str:
    """Lower-case, strip accents/umlauts (ä->a, ß->ss), collapse whitespace."""
    if not text:
        return ""
    text = text.casefold().replace("ß", "ss")
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", text).strip()


def _keyword_regex(keyword: str) -> re.Pattern[str] | None:
    kw = normalize(keyword)
    if not kw:
        return None
    body = r"\s+".join(re.escape(part) for part in kw.split(" "))
    # word boundaries: not preceded/followed by a letter or digit
    return re.compile(rf"(?<![^\W_]){body}(?![^\W_])")


def keyword_matches(text: str | None, keyword: str) -> bool:
    rx = _keyword_regex(keyword)
    return bool(rx and rx.search(normalize(text)))


def matches_any(text: str | None, keywords: Iterable[str]) -> str | None:
    """First keyword that matches `text` (word-bounded, accent-insensitive) or None."""
    norm = normalize(text)
    if not norm:
        return None
    for kw in keywords:
        rx = _keyword_regex(kw)
        if rx and rx.search(norm):
            return kw
    return None


def check_duration(
    duration: int | float | None, min_duration: int, max_duration: int
) -> str | None:
    """Return a rejection reason or None if OK. Unknown duration is rejected."""
    if duration is None or duration <= 0:
        return "Dauer unbekannt"
    if duration < min_duration:
        return "Zu kurz"
    if max_duration and duration > max_duration:
        return "Zu lang"
    return None


def parse_upload_date(value: str | None) -> date | None:
    """Accepts yt-dlp 'YYYYMMDD' and ISO dates/timestamps."""
    if not value:
        return None
    m = re.match(r"^(\d{4})-?(\d{2})-?(\d{2})", str(value).strip())
    if not m:
        return None
    try:
        return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    except ValueError:
        return None


def within_upload_period(
    upload_date: str | None, period: str, *, today: date | None = None
) -> bool:
    """period: all | 7d | 30d | 1y. Unknown date passes only for 'all'."""
    if period == "all" or period not in PERIOD_DAYS:
        return True
    d = parse_upload_date(upload_date)
    if d is None:
        return False
    today = today or datetime.now(UTC).date()
    return d >= today - timedelta(days=PERIOD_DAYS[period])


def is_live(video: Mapping[str, Any]) -> bool:
    return bool(video.get("is_live")) or video.get("live_status") in {"is_live", "is_upcoming"}


def passes(
    video: Mapping[str, Any],
    settings: FilterSettingsLike,
    status: str | None = None,
    blacklist: Collection[str] | None = None,
) -> tuple[bool, str]:
    """Check all SPEC §4 rules. Returns (ok, reason); reason is '' on success (German text)."""
    if is_live(video):
        return False, "Livestream"
    reason = check_duration(video.get("duration"), settings.min_duration, settings.max_duration)
    if reason:
        return False, reason

    text = video.get("title") or ""
    if settings.match_description and video.get("description"):
        text = f"{text} {video['description']}"

    if settings.include_keywords and not matches_any(text, settings.include_keywords):
        return False, "Kein Include-Keyword"
    hit = matches_any(text, settings.exclude_keywords)
    if hit:
        return False, f"Exclude-Keyword: {hit}"

    channel_id = video.get("channel_id")
    if settings.apply_channel_blacklist and blacklist and channel_id in blacklist:
        return False, "Kanal blockiert"
    if settings.hide_done_ignored and status in ("done", "ignored"):
        return False, "Bereits geladen" if status == "done" else "Ignoriert"
    return True, ""
