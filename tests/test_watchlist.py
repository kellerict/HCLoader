"""Watchlist core: validation, incremental check, filters, auto-download, backoff, events."""

from __future__ import annotations

import threading
from datetime import UTC, datetime, timedelta

import pytest

from app.core import config, watchlist
from app.core.throttle import BackoffActive, LimitReached


def entry(vid, title="Hardcore Mix", duration=3600, **kw):
    return {"id": vid, "title": title, "duration": duration, "channel_id": "UC1", **kw}


class FakeClient:
    def __init__(self, lists=None, searches=None, error=None):
        self.lists = lists or {}
        self.searches = searches or {}
        self.error = error
        self.calls = []

    def _raise(self, key):
        err = self.error.get(key) if isinstance(self.error, dict) else self.error
        if err:
            raise err

    def list_source(self, url, max_entries=None):
        self.calls.append(("list", url, max_entries))
        self._raise(url)
        return list(self.lists[url])

    def search(self, query, n=None, **kw):
        self.calls.append(("search", query, n))
        self._raise(query)
        return list(self.searches[query])


class FakeThrottle:
    def __init__(self, until=None):
        self.until = until

    def backoff_until(self):
        return self.until


@pytest.fixture
def settings():
    return config.defaults()


def src(db, stype="channel", url="https://www.youtube.com/@x", **kw):
    return db.get_source(db.add_source(stype, kw.pop("name", "Q"), url, **kw))


# --------------------------------------------------------------------------- validation


def valid(settings, **over):
    data = {"type": "channel", "name": "Kanal", "url_or_query": "https://www.youtube.com/@dj"}
    data.update(over)
    return watchlist.validate_source(data, settings)


def test_valid_sources_and_defaults(settings):
    clean, errors = valid(settings, id=5, last_checked="x", new_count=3, extra=1)
    assert errors == {} and clean["max_entries"] == 30 and clean["enabled"] is True
    assert set(clean) == {
        "type",
        "name",
        "url_or_query",
        "default_genre",
        "enabled",
        "auto_download",
        "max_entries",
    }
    for url in (
        "https://www.youtube.com/channel/UCabc123/videos",
        "https://youtube.com/c/Name",
        "https://m.youtube.com/user/Name/",
    ):
        assert valid(settings, url_or_query=url)[1] == {}
    assert (
        valid(settings, type="playlist", url_or_query="https://www.youtube.com/playlist?list=PL1")[
            1
        ]
        == {}
    )
    assert (
        valid(settings, type="search", url_or_query="  hardcore   mix ")[0]["url_or_query"]
        == "hardcore mix"
    )


@pytest.mark.parametrize(
    ("over", "field", "text"),
    [
        ({"name": "  "}, "name", "Name fehlt"),
        ({"url_or_query": ""}, "url_or_query", "URL fehlt"),
        ({"url_or_query": "https://example.com/@x"}, "url_or_query", "YouTube-URL"),
        ({"url_or_query": "javascript:alert(1)"}, "url_or_query", "YouTube-URL"),
        (
            {"url_or_query": "https://www.youtube.com/watch?v=abcdefghijk"},
            "url_or_query",
            "Kanal-URL",
        ),
        (
            {"type": "playlist", "url_or_query": "https://www.youtube.com/@x"},
            "url_or_query",
            "Playlist-URL",
        ),
        ({"type": "search", "url_or_query": "  "}, "url_or_query", "Suchbegriff fehlt"),
        ({"max_entries": 0}, "max_entries", "1 und 200"),
        ({"max_entries": 201}, "max_entries", "1 und 200"),
        ({"max_entries": "abc"}, "max_entries", "1 und 200"),
        ({"max_entries": 2.5}, "max_entries", "1 und 200"),
        ({"default_genre": "Polka"}, "default_genre", "Unbekanntes Genre"),
        ({"type": "radio"}, "type", "Typ"),
    ],
)
def test_validation_errors_are_german(settings, over, field, text):
    clean, errors = valid(settings, **over)
    assert clean == {} and text in errors[field]


def test_genre_must_exist_and_unsorted_means_none(settings):
    assert valid(settings, default_genre="Hardcore")[0]["default_genre"] == "Hardcore"
    assert valid(settings, default_genre="Unsortiert")[0]["default_genre"] is None
    assert valid(settings, default_genre="")[0]["default_genre"] is None


def test_duplicate_source_refused_but_not_itself(settings):
    existing = [
        {"id": 1, "type": "channel", "name": "Alt", "url_or_query": "https://www.youtube.com/@DJ/"}
    ]
    assert "existiert bereits" in valid_ex(settings, existing)[1]["url_or_query"]
    assert valid_ex(settings, existing, id=1)[1] == {}


def valid_ex(settings, existing, **over):
    data = {"type": "channel", "name": "N", "url_or_query": "https://www.youtube.com/@dj", **over}
    return watchlist.validate_source(data, settings, existing=existing)


# --------------------------------------------------------------------------- check_source


def test_stops_at_first_known_and_stores_source_genre(db, settings):
    db.upsert_video({"id": "known1", "title": "k"})
    s = src(db, default_genre="Uptempo")
    client = FakeClient(
        {s["url_or_query"]: [entry("n1"), entry("n2"), entry("known1"), entry("n3")]}
    )
    res = watchlist.check_source(s, client=client, db=db, settings=settings)
    assert (res.new, res.inbox, res.seen) == (2, 2, 3)
    assert db.get_video("n3") is None
    row = db.get_video("n1")
    assert row["status"] == "inbox" and row["source_id"] == s["id"] and row["genre"] == "Uptempo"
    assert db.get_source(s["id"])["last_checked"]
    assert client.calls == [("list", s["url_or_query"], 30)]  # max_entries default from the source


def test_filtered_entries_stay_new_not_in_inbox(db, settings):
    s = src(db)
    entries = [entry("ok1"), entry("short1", duration=100), entry("tut1", "Hardcore Mix Tutorial")]
    entries.append(entry("live1", live_status="is_live"))
    res = watchlist.check_source(
        s, client=FakeClient({s["url_or_query"]: entries}), db=db, settings=settings
    )
    assert (res.new, res.inbox, res.filtered) == (4, 1, 3)
    assert [db.get_video(v)["status"] for v in ("ok1", "short1", "tut1", "live1")] == [
        "inbox",
        "new",
        "new",
        "new",
    ]


def test_blacklisted_channel_is_filtered(db, settings):
    db.add_to_blacklist("UC1", "x")
    s = src(db)
    res = watchlist.check_source(
        s, client=FakeClient({s["url_or_query"]: [entry("a1")]}), db=db, settings=settings
    )
    assert res.inbox == 0 and db.get_video("a1")["status"] == "new"


def test_auto_download_enqueues_only_passing(db, settings):
    s = src(db, auto_download=True)
    client = FakeClient({s["url_or_query"]: [entry("a1"), entry("s1", duration=60), entry("a2")]})
    seen = []

    def enqueue(ids):
        seen.append(ids)
        return db.enqueue(ids)

    res = watchlist.check_source(s, client=client, db=db, settings=settings, enqueue=enqueue)
    assert seen == [["a1", "a2"]] and (res.queued, res.inbox, res.filtered) == (2, 0, 1)
    assert [db.get_video(v)["status"] for v in ("a1", "a2", "s1")] == ["queued", "queued", "new"]


def test_auto_download_falls_back_to_inbox_if_not_accepted(db, settings):
    s = src(db, auto_download=True)
    res = watchlist.check_source(
        s,
        client=FakeClient({s["url_or_query"]: [entry("a1")]}),
        db=db,
        settings=settings,
        enqueue=lambda ids: [],
    )
    assert res.inbox == 1 and db.get_video("a1")["status"] == "inbox"


def test_search_source_skips_known_without_stopping(db, settings):
    db.upsert_video({"id": "known1", "title": "k"})
    s = src(db, "search", "hardcore mix", max_entries=10)
    client = FakeClient(searches={"hardcore mix": [entry("known1"), entry("n1")]})
    res = watchlist.check_source(s, client=client, db=db, settings=settings)
    assert res.new == 1 and client.calls == [("search", "hardcore mix", 10)]


# --------------------------------------------------------------------------- check_all


def test_check_all_writes_run_entry_and_events(db, settings):
    a = src(db, url="https://www.youtube.com/@a", name="A")
    b = src(db, url="https://www.youtube.com/@b", name="B")
    off = src(db, url="https://www.youtube.com/@c", name="C", enabled=False)
    client = FakeClient(
        {a["url_or_query"]: [entry("a1")], b["url_or_query"]: [entry("b1"), entry("b2")]}
    )
    events = []
    res = watchlist.check_all(
        client=client, db=db, throttle=FakeThrottle(), settings=settings, on_source=events.append
    )
    assert (res.checked, res.found, res.errors, res.backoff) == (2, 3, 0, False)
    assert [e["id"] for e in events] == [a["id"], a["id"], b["id"], b["id"]]
    assert [e["checking"] for e in events] == [True, False, True, False]
    assert events[3]["new_count"] == 2 and events[3]["last_checked"] and "error" not in events[3]
    run = db.list_runs()[0]
    assert (run["kind"], run["found"], run["downloaded"], run["errors"]) == ("watchlist", 3, 0, 0)
    assert run["finished"] and db.get_source(off["id"])["last_checked"] is None
    assert watchlist.last_run(db) is not None


def test_check_all_selected_ids_include_disabled_and_keep_last_run(db, settings):
    off = src(db, enabled=False)
    res = watchlist.check_all(
        client=FakeClient({off["url_or_query"]: [entry("x1")]}),
        db=db,
        throttle=FakeThrottle(),
        settings=settings,
        ids=[off["id"]],
    )
    assert res.checked == 1 and watchlist.last_run(db) is None


def test_backoff_aborts_whole_run(db, settings):
    a = src(db, url="https://www.youtube.com/@a")
    b = src(db, url="https://www.youtube.com/@b")
    until = datetime.now(UTC) + timedelta(hours=6)
    client = FakeClient({}, error=BackoffActive(until, "HTTP Error 429"))
    events = []
    res = watchlist.check_all(
        client=client,
        db=db,
        throttle=FakeThrottle(until),
        settings=settings,
        on_source=events.append,
    )
    assert res.backoff and res.errors == 1 and len(client.calls) == 1
    assert res.note.startswith("Backoff bis")
    assert db.list_runs()[0]["note"].startswith("Backoff")
    assert events[-1]["error"] and watchlist.last_run(db) is None
    assert db.get_source(b["id"])["last_checked"] is None and a


def test_rate_limited_client_error_aborts(db, settings):
    class Limited(Exception):
        rate_limited = True

    src(db, url="https://www.youtube.com/@a")
    src(db, url="https://www.youtube.com/@b")
    client = FakeClient({}, error=Limited("429"))
    res = watchlist.check_all(client=client, db=db, throttle=FakeThrottle(), settings=settings)
    assert res.backoff and len(client.calls) == 1


def test_source_error_continues_and_is_counted(db, settings):
    a = src(db, url="https://www.youtube.com/@a")
    b = src(db, url="https://www.youtube.com/@b")
    client = FakeClient(
        {b["url_or_query"]: [entry("b1")]},
        error={a["url_or_query"]: RuntimeError("Zugang http://u:p@proxy:1 kaputt")},
    )
    events = []
    res = watchlist.check_all(
        client=client, db=db, throttle=FakeThrottle(), settings=settings, on_source=events.append
    )
    assert (res.checked, res.errors, res.found, res.backoff) == (1, 1, 1, False)
    err = [e for e in events if e.get("error")][0]
    assert "u:p" not in err["error"] and "***" in err["error"]
    assert db.get_source(a["id"])["last_checked"] is None
    assert "1 Quelle(n) mit Fehler" in db.list_runs()[0]["note"]


def test_search_limit_is_a_source_error_not_an_abort(db, settings):
    s = src(db, "search", "q")
    res = watchlist.check_all(
        client=FakeClient(error=LimitReached("searches_per_hour", 20)),
        db=db,
        throttle=FakeThrottle(),
        settings=settings,
    )
    assert res.errors == 1 and not res.backoff and s


def test_cancel_stops_before_next_source(db, settings):
    src(db, url="https://www.youtube.com/@a")
    cancel = threading.Event()
    cancel.set()
    res = watchlist.check_all(
        client=FakeClient(), db=db, throttle=FakeThrottle(), settings=settings, cancel=cancel
    )
    assert res.cancelled and res.checked == 0 and watchlist.last_run(db) is None
