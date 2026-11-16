from datetime import date

import pytest

from app.core import filters
from app.core.config import DEFAULT_EXCLUDE_KEYWORDS, DEFAULT_INCLUDE_KEYWORDS, FilterSettings


def S(**kw):
    return FilterSettings(**kw)


def V(title="Uptempo Mix 2026", duration=3600, **kw):
    d = {"id": "x", "title": title, "duration": duration, "channel_id": "c1"}
    d.update(kw)
    return d


def test_normalize():
    assert filters.normalize("  Müller  ÄÖÜ Straße Café ") == "muller aou strasse cafe"
    assert filters.normalize(None) == ""


@pytest.mark.parametrize("kw", DEFAULT_INCLUDE_KEYWORDS)
def test_every_default_include_keyword_matches(kw):
    ok, reason = filters.passes(V(f"Great {kw.upper()} 2026"), S())
    assert ok, reason


@pytest.mark.parametrize("kw", DEFAULT_EXCLUDE_KEYWORDS)
def test_every_default_exclude_keyword_rejects(kw):
    ok, reason = filters.passes(V(f"Hardcore mix {kw}"), S())
    assert not ok and kw in reason


def test_word_boundaries():
    assert not filters.keyword_matches("Hardstyle Remix", "mix")
    assert not filters.keyword_matches("Playset", "set")
    assert not filters.keyword_matches("Sessions", "session")
    assert filters.keyword_matches("Mix, 2026", "mix")
    assert filters.keyword_matches("Hardcore-Mix", "mix")
    assert filters.keyword_matches("Live  Set", "live set")
    assert filters.keyword_matches("MIX", "mix")
    assert filters.keyword_matches("LIVE SET at X", "live set")
    assert not filters.keyword_matches("Live Settings", "live set")
    assert not filters.keyword_matches("x", "")


def test_umlauts_in_keywords():
    assert filters.keyword_matches("Prüfung Mix", "prufung")
    assert filters.keyword_matches("Strasse Set", "Straße")


def test_remix_title_without_include_fails():
    ok, reason = filters.passes(V("Hardstyle Remix 2026"), S())
    assert not ok and "Include" in reason


def test_empty_include_allows_all():
    assert filters.passes(V("Whatever"), S(include_keywords=[]))[0]


def test_duration_rules():
    assert filters.passes(V(duration=600), S())[0]
    assert filters.passes(V(duration=599), S()) == (False, "Zu kurz")
    assert filters.passes(V(duration=99999), S())[0]
    assert filters.passes(V(duration=5000), S(max_duration=4000)) == (False, "Zu lang")
    assert filters.passes(V(duration=None), S())[1] == "Dauer unbekannt"
    assert filters.passes(V(duration=0), S())[0] is False


def test_livestream_rejected():
    assert filters.passes(V(is_live=True), S()) == (False, "Livestream")
    assert filters.passes(V(live_status="is_upcoming"), S())[0] is False
    assert filters.passes(V(live_status="not_live"), S())[0] is True


def test_blacklist_and_status():
    assert filters.passes(V(), S(), blacklist={"c1"}) == (False, "Kanal blockiert")
    assert filters.passes(V(), S(apply_channel_blacklist=False), blacklist={"c1"})[0]
    assert filters.passes(V(), S(), status="done")[0] is False
    assert filters.passes(V(), S(), status="ignored")[0] is False
    assert filters.passes(V(), S(hide_done_ignored=False), status="done")[0]
    assert filters.passes(V(), S(), status="inbox")[0]


def test_description_matching():
    v = V("Random title", description="a great hardcore mix")
    assert not filters.passes(v, S())[0]
    assert filters.passes(v, S(match_description=True))[0]
    v2 = V("Mix", description="contains tutorial")
    assert filters.passes(v2, S())[0] and not filters.passes(v2, S(match_description=True))[0]


def test_upload_period():
    today = date(2026, 11, 16)
    assert filters.within_upload_period("20261110", "7d", today=today)
    assert not filters.within_upload_period("20261001", "7d", today=today)
    assert filters.within_upload_period("20261020", "30d", today=today)
    assert not filters.within_upload_period("20250101", "1y", today=today)
    assert filters.within_upload_period("2026-01-01", "1y", today=today)
    assert filters.within_upload_period(None, "all", today=today)
    assert not filters.within_upload_period(None, "7d", today=today)
    assert not filters.within_upload_period("garbage", "30d", today=today)
