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


# ------------------------------------------------------------------ Phase 3a: year / custom


def test_title_has_year_as_word():
    assert filters.title_has_year("Defqon.1 2024 Mix", 2024)
    assert filters.title_has_year("Mix (2024)", 2024)
    assert not filters.title_has_year("Mix 20245", 2024)
    assert not filters.title_has_year("Mix 12024", 2024)
    assert not filters.title_has_year(None, 2024)


def test_period_year():
    f = filters.within_upload_period
    assert f("20240601", "year", year=2024)
    assert not f("20250101", "year", year=2024)
    # approximate date: +-1 year tolerated
    assert f("20250101", "year", year=2024, approx=True)
    assert f("20230601", "year", year=2024, approx=True)
    assert not f("20220601", "year", year=2024, approx=True)
    # year in the title wins, also without date
    assert f(None, "year", year=2024, title="Q-Dance 2024 Live Set", approx=True)
    assert f("20100101", "year", year=2024, title="Best of 2024")
    # unknown date and no year in title -> rejected
    assert not f(None, "year", year=2024, title="Live Set")
    assert not f("20240601", "year", year=0)


def test_period_custom():
    f = filters.within_upload_period
    kw = {"date_from": "2024-03-01", "date_to": "2024-06-30"}
    assert f("20240401", "custom", **kw)
    assert f("20240301", "custom", **kw) and f("20240630", "custom", **kw)
    assert not f("20240228", "custom", **kw)
    assert not f("20240701", "custom", **kw)
    assert not f(None, "custom", **kw)
    # approximate: +-1 year at the edges
    assert f("20230501", "custom", approx=True, **kw)
    assert f("20250501", "custom", approx=True, **kw)
    assert not f("20220101", "custom", approx=True, **kw)
    # open ends
    assert f("20990101", "custom", date_from="2024-01-01")
    assert f("19990101", "custom", date_to="2024-01-01")


def test_passes_includes_upload_period():
    s = S(upload_period="year", upload_year=2024)
    ok, why = filters.passes(V("Hardcore Mix 2024", upload_date="20200101"), s)
    assert ok, why
    ok, why = filters.passes(V("Hardcore Mix", upload_date="20200101"), s)
    assert not ok and why == "Ausserhalb des Zeitraums"
    ok, why = filters.passes(V("Hardcore Mix"), s)
    assert not ok and why == "Upload-Datum unbekannt"
    ok, why = filters.passes(V("Hardcore Mix", upload_date="20250301", date_approx=True), s)
    assert ok, why
    s = S(upload_period="custom", upload_from="2024-01-01", upload_to="2024-12-31")
    assert filters.passes(V(upload_date="20240505"), s)[0]
    assert not filters.passes(V(upload_date="20260505"), s)[0]
    # duration is still checked first
    assert filters.passes(V(duration=5, upload_date="20260505"), s)[1] == "Zu kurz"
