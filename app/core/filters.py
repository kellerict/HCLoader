"""Pure filter functions (SPEC §4): duration, keywords, status, blacklist, upload period."""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Collection, Iterable, Mapping
from datetime import UTC, date, datetime, timedelta
from typing import Any, Protocol

from .i18n import tr

PERIOD_DAYS = {"7d": 7, "30d": 30, "1y": 365}


class FilterSettingsLike(Protocol):
    min_duration: int
    max_duration: int
    include_keywords: list[str]
    exclude_keywords: list[str]
    match_description: bool
    hide_done_ignored: bool
    apply_channel_blacklist: bool
    # optional (getattr with defaults in passes()): upload_period, upload_year,
    # upload_from, upload_to


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
        return tr("filter.duration_unknown")
    if duration < min_duration:
        return tr("filter.too_short")
    if max_duration and duration > max_duration:
        return tr("filter.too_long")
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


def title_has_year(title: str | None, year: int) -> bool:
    """True if `year` stands as a separate word in the title (e.g. 'Defqon.1 2024 Mix')."""
    if not title or not year:
        return False
    return bool(re.search(rf"(?<![^\W_]){int(year)}(?![^\W_])", title))


def within_upload_period(
    upload_date: str | None,
    period: str,
    *,
    today: date | None = None,
    year: int = 0,
    date_from: str | None = None,
    date_to: str | None = None,
    title: str | None = None,
    approx: bool = False,
) -> bool:
    """period: all | 7d | 30d | 1y | year | custom. Unknown date passes only for 'all'.

    `approx`: the date comes from a flat search ('vor X Jahren'), so 'year' and 'custom'
    tolerate +-1 year (docs/settings-schema.md, Phase 3). 'year' also passes if the year
    stands as a separate word in `title`.
    """
    if period == "all":
        return True
    d = parse_upload_date(upload_date)
    if period == "year":
        if year and title_has_year(title, year):
            return True
        if d is None or not year:
            return False
        return abs(d.year - year) <= 1 if approx else d.year == year
    if period == "custom":
        start = parse_upload_date(date_from)
        end = parse_upload_date(date_to)
        if d is None:
            return False
        if approx:
            if start:
                start -= timedelta(days=365)
            if end:
                end += timedelta(days=365)
        return not ((start and d < start) or (end and d > end))
    if period not in PERIOD_DAYS:
        return True
    if d is None:
        return False
    today = today or datetime.now(UTC).date()
    return d >= today - timedelta(days=PERIOD_DAYS[period])


def is_live(video: Mapping[str, Any]) -> bool:
    return bool(video.get("is_live")) or video.get("live_status") in {"is_live", "is_upcoming"}


PREVIEW_REASON = "filter.preview"  # message key (app/locales)
# SoundCloud Go+ snippets are 30 s long; flat results may lack the policy flag
PREVIEW_SECONDS = (29, 31)


def is_preview(video: Mapping[str, Any]) -> bool:
    """SoundCloud Go+ preview: flag `preview` (API policy SNIP / only preview formats) or a
    SoundCloud track of 29-31 s (Phase 7a)."""
    if video.get("preview"):
        return True
    duration = video.get("duration")
    return (
        video.get("platform") == "soundcloud"
        and isinstance(duration, (int, float))
        and PREVIEW_SECONDS[0] <= duration <= PREVIEW_SECONDS[1]
    )


GEO_REASON = "filter.geo"  # message key (app/locales)


def is_geo_blocked(video: Mapping[str, Any]) -> bool:
    """SoundCloud track blocked in this region (API policy BLOCK, Review M1)."""
    return bool(video.get("geo_blocked"))


def _period_reason(upload_date: str | None, period: str) -> str:
    if parse_upload_date(upload_date) is None:
        return tr("filter.date_unknown")
    return tr("filter.outside_period")


def passes(
    video: Mapping[str, Any],
    settings: FilterSettingsLike,
    status: str | None = None,
    blacklist: Collection[str] | None = None,
) -> tuple[bool, str]:
    """Check all SPEC §4 rules. Returns (ok, reason); reason is '' on success (German text)."""
    if is_live(video):
        return False, "Livestream"
    if is_geo_blocked(video):
        return False, tr(GEO_REASON)
    if is_preview(video):
        return False, tr(PREVIEW_REASON)
    reason = check_duration(video.get("duration"), settings.min_duration, settings.max_duration)
    if reason:
        return False, reason

    period = getattr(settings, "upload_period", "all")
    if period != "all" and not within_upload_period(
        video.get("upload_date"),
        period,
        year=getattr(settings, "upload_year", 0),
        date_from=getattr(settings, "upload_from", ""),
        date_to=getattr(settings, "upload_to", ""),
        title=video.get("title"),
        approx=bool(video.get("date_approx")),
    ):
        return False, _period_reason(video.get("upload_date"), period)

    text = video.get("title") or ""
    if settings.match_description and video.get("description"):
        text = f"{text} {video['description']}"

    if settings.include_keywords and not matches_any(text, settings.include_keywords):
        return False, tr("filter.no_include")
    hit = matches_any(text, settings.exclude_keywords)
    if hit:
        return False, tr("filter.exclude_keyword", keyword=hit)

    channel_id = video.get("channel_id")
    if settings.apply_channel_blacklist and blacklist and channel_id in blacklist:
        return False, tr("filter.channel_blocked")
    if settings.hide_done_ignored and status in ("done", "ignored"):
        return False, tr("filter.downloaded") if status == "done" else "Ignoriert"
    return True, ""
