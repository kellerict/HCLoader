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

    def list_source(self, url, max_entries=None, *, newest_last=False, cancel_event=None):
        self.calls.append(
            ("list", url, max_entries, newest_last) if newest_last else ("list", url, max_entries)
        )
        self._raise(url)
        entries = list(self.lists[url])
        if newest_last:  # like yt-dlp "-1:-N:-1": the last N, last one first
            entries = entries[::-1][:max_entries]
        return entries

    def search(self, query, n=None, *, cancel_event=None, **kw):
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
    # n7: no value = NULL = schedule.entries_per_source at check time
    assert errors == {} and clean["max_entries"] is None and clean["enabled"] is True
    assert set(clean) == {
        "type",
        "name",
        "url_or_query",
        "default_genre",
        "enabled",
        "auto_download",
        "max_entries",
        "newest_last",
    }
    assert clean["newest_last"] is False
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


def seen_by(db, source, *ids):
    """Mark videos as seen by `source` in an earlier check (and the source as checked)."""
    for vid in ids:
        if db.get_video(vid) is None:
            db.upsert_video({"id": vid, "title": "k", "source_id": source["id"]})
        db.link_source_video(source["id"], vid)
    db.mark_source_checked(source["id"])
    return db.get_source(source["id"])


def test_stops_at_first_known_and_stores_source_genre(db, settings):
    s = seen_by(db, src(db, default_genre="Uptempo"), "known1")
    client = FakeClient(
        {s["url_or_query"]: [entry("n1"), entry("n2"), entry("known1"), entry("n3")]}
    )
    res = watchlist.check_source(s, client=client, db=db, settings=settings)
    assert (res.new, res.inbox, res.seen) == (2, 2, 3)
    assert db.get_video("n3") is None
    assert db.source_has_seen(s["id"], "n1") and db.source_has_seen(s["id"], "n2")
    row = db.get_video("n1")
    assert row["status"] == "inbox" and row["source_id"] == s["id"] and row["genre"] == "Uptempo"
    assert db.get_source(s["id"])["last_checked"]
    assert client.calls == [("list", s["url_or_query"], 30)]  # NULL -> entries_per_source


def test_filtered_entries_stay_new_not_in_inbox(db, settings):
    s = src(db)
    entries = [entry("ok1"), entry("short1", duration=100), entry("tut1", "Hardcore Mix Tutorial")]
    entries.append(entry("live1", live_status="was_live", duration=None))
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


# --------------------------------------------------------------------------- M1 (Review Phase 4)


def test_first_check_after_search_does_not_stop_at_search_hit(db, settings):
    """Search -> «Kanal zur Watchlist» -> first check: the mix from the search (2nd entry of the
    channel) must not hide the older videos behind it, and it lands in the inbox itself."""
    db.upsert_video(
        {"id": "mix1", "title": "Hardcore Mix", "duration": 3600, "status": "new", "genre": "X"}
    )
    s = src(db, url="https://www.youtube.com/channel/UCabc", default_genre="Hardcore")
    entries = [entry("n1"), entry("mix1"), entry("old1"), entry("old2")]
    res = watchlist.check_source(
        s, client=FakeClient({s["url_or_query"]: entries}), db=db, settings=settings
    )
    assert (res.new, res.adopted, res.inbox, res.seen) == (3, 1, 4, 4)
    for vid in ("n1", "mix1", "old1", "old2"):
        row = db.get_video(vid)
        assert row["status"] == "inbox" and row["source_id"] == s["id"]
        assert db.source_has_seen(s["id"], vid)
    assert db.get_video("mix1")["genre"] == "Hardcore"  # the source's genre, not the search's


def test_second_check_skips_search_hits_and_stops_at_own_video(db, settings):
    s = src(db)
    url = s["url_or_query"]
    watchlist.check_source(s, client=FakeClient({url: [entry("a1")]}), db=db, settings=settings)
    db.upsert_video({"id": "hit1", "title": "Hardcore Mix", "duration": 3600})  # a search hit
    client = FakeClient({url: [entry("hit1"), entry("b1"), entry("a1"), entry("zz")]})
    res = watchlist.check_source(db.get_source(s["id"]), client=client, db=db, settings=settings)
    assert (res.new, res.adopted, res.seen) == (1, 1, 3)  # stops at a1 (own), never sees zz
    assert db.get_video("zz") is None and db.get_video("hit1")["status"] == "inbox"


def test_first_check_never_stops_early(db, settings):
    """`last_checked` empty: no stop even at an already linked video (e.g. after a restore)."""
    s = src(db)
    db.upsert_video({"id": "a1", "title": "k", "source_id": s["id"]})
    db.link_source_video(s["id"], "a1")
    client = FakeClient({s["url_or_query"]: [entry("a1"), entry("b1"), entry("c1")]})
    res = watchlist.check_source(s, client=client, db=db, settings=settings)
    assert res.new == 2 and res.seen == 3


def test_video_in_two_sources(db, settings):
    """Channel and playlist share a video: the second source neither stops there nor changes
    the first owner; both remember it, the later checks of each stop at it."""
    ch = src(db, url="https://www.youtube.com/@dj", name="Kanal")
    pl = src(db, "playlist", "https://www.youtube.com/playlist?list=PL1", name="PL")
    lists = {
        ch["url_or_query"]: [entry("shared1"), entry("c1")],
        pl["url_or_query"]: [entry("p1"), entry("shared1"), entry("p2")],
    }
    client = FakeClient(lists)
    watchlist.check_source(ch, client=client, db=db, settings=settings)
    res = watchlist.check_source(pl, client=client, db=db, settings=settings)
    assert (res.new, res.adopted, res.seen) == (2, 0, 3)  # shared1 already in the inbox
    assert db.get_video("shared1")["source_id"] == ch["id"]
    assert db.source_has_seen(pl["id"], "shared1") and db.source_has_seen(ch["id"], "shared1")
    # second round: the playlist got a new video in front; it stops at p1 (its own)
    lists[pl["url_or_query"]] = [entry("p3"), entry("p1"), entry("shared1"), entry("p2")]
    res = watchlist.check_source(db.get_source(pl["id"]), client=client, db=db, settings=settings)
    assert (res.new, res.seen) == (1, 2)
    # deleting a source removes only its links
    db.delete_source(pl["id"])
    assert db.source_video_count(pl["id"]) == 0 and db.source_has_seen(ch["id"], "shared1")


def test_known_video_rejected_by_filters_stays_new(db, settings):
    db.upsert_video({"id": "short1", "title": "x", "duration": 60})
    s = src(db)
    res = watchlist.check_source(
        s,
        client=FakeClient({s["url_or_query"]: [entry("short1", duration=60)]}),
        db=db,
        settings=settings,
    )
    assert res.adopted == 0 and res.inbox == 0 and db.get_video("short1")["status"] == "new"
    assert db.source_has_seen(s["id"], "short1")


def test_known_video_with_user_status_is_not_touched(db, settings):
    db.upsert_video({"id": "ign1", "title": "x", "duration": 3600, "status": "ignored"})
    db.upsert_video({"id": "done1", "title": "y", "duration": 3600, "status": "done"})
    s = src(db, auto_download=True)
    seen = []
    res = watchlist.check_source(
        s,
        client=FakeClient({s["url_or_query"]: [entry("ign1"), entry("done1")]}),
        db=db,
        settings=settings,
        enqueue=lambda ids: seen.extend(ids) or ids,
    )
    assert res.adopted == 0 and seen == []
    assert db.get_video("ign1")["status"] == "ignored" and db.get_video("done1")["status"] == "done"


def test_known_new_video_is_enqueued_for_auto_download_source(db, settings):
    db.upsert_video({"id": "hit1", "title": "Hardcore Mix", "duration": 3600})
    s = src(db, auto_download=True)
    res = watchlist.check_source(
        s,
        client=FakeClient({s["url_or_query"]: [entry("hit1")]}),
        db=db,
        settings=settings,
        enqueue=db.enqueue,
    )
    assert res.queued_ids == ["hit1"] and db.get_video("hit1")["status"] == "queued"


def test_migration_4_takes_over_existing_source_ids(tmp_path):
    import sqlite3

    from app.core import db as dbmod

    conn = sqlite3.connect(tmp_path / "old.db", isolation_level=None)
    dbmod.migrate(conn, dbmod.MIGRATIONS[:3])
    conn.execute("INSERT INTO sources(id,type,name,url_or_query) VALUES (1,'channel','A','u')")
    conn.execute("INSERT INTO videos(id,source_id,status,first_seen) VALUES ('v1',1,'inbox','t')")
    conn.execute("INSERT INTO videos(id,source_id,status) VALUES ('v2',NULL,'new')")
    conn.execute("INSERT INTO videos(id,source_id,status) VALUES ('v3',9,'new')")  # source gone
    conn.close()
    with dbmod.Database(tmp_path / "old.db") as d:
        assert d.source_has_seen(1, "v1") and d.source_video_count(1) == 1
        assert not d.source_has_seen(9, "v3")


# --------------------------------------------------------------------------- n6 / n8


def test_upcoming_and_live_entries_are_not_remembered(db, settings):
    """n8: a premiere is evaluated again at the next check (then with its duration)."""
    s = src(db)
    url = s["url_or_query"]
    client = FakeClient({url: [entry("prem1", duration=None, live_status="is_upcoming")]})
    res = watchlist.check_source(s, client=client, db=db, settings=settings)
    assert res.skipped_live == 1 and res.new == 0 and db.get_video("prem1") is None
    client.lists[url] = [entry("prem1", live_status="was_live"), entry("x1")]
    res = watchlist.check_source(db.get_source(s["id"]), client=client, db=db, settings=settings)
    assert res.new == 2 and db.get_video("prem1")["status"] == "inbox"


def test_auto_download_rows_are_stored_in_the_inbox_first(db, settings):
    """n6: if the process ends before enqueue, the videos are visible in the inbox."""
    s = src(db, auto_download=True)
    states = []

    def enqueue(ids):
        states.extend(db.get_video(v)["status"] for v in ids)
        raise SystemExit  # process ends here

    with pytest.raises(SystemExit):
        watchlist.check_source(
            s,
            client=FakeClient({s["url_or_query"]: [entry("a1")]}),
            db=db,
            settings=settings,
            enqueue=enqueue,
        )
    assert states == ["inbox"] and db.get_video("a1")["status"] == "inbox"


# --------------------------------------------------------------------------- m4 / m5 / n7


def test_search_sources_limited_to_100(db, settings):
    assert (
        "1 und 100"
        in valid(settings, type="search", url_or_query="q", max_entries=101)[1]["max_entries"]
    )
    assert valid(settings, type="search", url_or_query="q", max_entries=100)[1] == {}
    assert valid(settings, max_entries=200)[1] == {}  # channels keep 200
    settings.schedule.entries_per_source = 150
    s = src(db, "search", "hardcore")  # NULL -> default 150 -> capped at 100
    client = FakeClient(searches={"hardcore": []})
    watchlist.check_source(s, client=client, db=db, settings=settings)
    assert client.calls == [("search", "hardcore", 100)]


def test_null_max_entries_follows_the_setting(db, settings):
    s = src(db)
    assert s["max_entries"] is None
    settings.schedule.entries_per_source = 12
    client = FakeClient({s["url_or_query"]: []})
    watchlist.check_source(s, client=client, db=db, settings=settings)
    assert client.calls == [("list", s["url_or_query"], 12)]


@pytest.mark.parametrize("tab", ["playlists", "releases", "featured", "shorts", "community"])
def test_channel_tabs_other_than_videos_and_streams_refused(settings, tab):
    errors = valid(settings, url_or_query=f"https://www.youtube.com/@dj/{tab}")[1]
    assert "Kanal-URL" in errors["url_or_query"]
    for ok in ("", "/", "/videos", "/streams"):
        assert valid(settings, url_or_query=f"https://www.youtube.com/@dj{ok}")[1] == {}


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
    s = seen_by(db, src(db, "search", "hardcore mix", max_entries=10), "known1")
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


# --------------------------------------------------------------------------- newest_last


def test_newest_last_only_for_playlists(settings):
    url = "https://www.youtube.com/playlist?list=PL1"
    assert valid(settings, type="playlist", url_or_query=url)[0]["newest_last"] is False
    assert valid(settings, type="playlist", url_or_query=url, newest_last=True)[0]["newest_last"]
    assert valid(settings, newest_last=True)[0]["newest_last"] is False  # channel: forced off
    assert (
        valid(settings, type="search", url_or_query="x", newest_last=True)[0]["newest_last"]
        is False
    )


def test_playlist_new_videos_at_the_end(db, settings):
    url = "https://www.youtube.com/playlist?list=PL1"
    vids = [entry(f"v{i:010d}") for i in range(8)]
    client = FakeClient(lists={url: vids[:5]})

    plain = src(db, "playlist", url, name="P", max_entries=3)
    watchlist.check_source(plain, client=client, db=db, settings=settings)  # first check
    client.lists[url] = vids  # 3 new videos appended at the end
    res = watchlist.check_source(
        db.get_source(plain["id"]), client=client, db=db, settings=settings
    )
    assert res.new == 0  # first 3 are known: new ones at the end are never seen

    s = src(db, "playlist", url + "&x=1", name="P2", max_entries=5, newest_last=True)
    client.lists[url + "&x=1"] = vids[:5]
    watchlist.check_source(s, client=client, db=db, settings=settings)  # first check
    client.lists[url + "&x=1"] = vids
    res = watchlist.check_source(db.get_source(s["id"]), client=client, db=db, settings=settings)
    assert res.new == 3 and res.seen == 4  # stops at the first one this source has seen
    assert client.calls[-1] == ("list", url + "&x=1", 5, True)
    assert all(db.is_known(v["id"]) for v in vids)


def test_newest_last_ignored_for_channels(db, settings):
    client = FakeClient(lists={"https://www.youtube.com/@x": [entry("a" * 11)]})
    s = src(db, "channel", newest_last=True)
    watchlist.check_source(s, client=client, db=db, settings=settings)
    assert client.calls == [("list", "https://www.youtube.com/@x", 30)]


# --------------------------------------------------------------------------- m2 / m3 / n5


def test_running_marker_set_at_start_and_cleared(db, settings):
    s = src(db)
    seen = []

    class Client(FakeClient):
        def list_source(self, url, max_entries=None, **kw):
            seen.append(watchlist.running_since(db))
            return []

    watchlist.check_all(client=Client(), db=db, throttle=FakeThrottle(), settings=settings)
    assert seen[0] is not None and watchlist.running_since(db) is None and s
    # a stale marker (crashed process) is ignored
    db.set_state(watchlist.K_RUNNING_SINCE, (datetime.now(UTC) - timedelta(hours=7)).isoformat())
    assert watchlist.running_since(db) is None


def test_all_sources_failed_sets_retry_not_last_run(db, settings):
    """m3: no successful source -> no last_run, retry in 1 h; a later success clears it."""
    s = src(db)
    client = FakeClient({s["url_or_query"]: [entry("a1")]}, error=RuntimeError("Netz weg"))
    res = watchlist.check_all(client=client, db=db, throttle=FakeThrottle(), settings=settings)
    assert res.checked == 0 and watchlist.last_run(db) is None
    retry = watchlist.retry_at(db)
    assert retry is not None
    assert timedelta(minutes=59) < retry - datetime.now(UTC) <= timedelta(hours=1)
    client.error = None
    watchlist.check_all(client=client, db=db, throttle=FakeThrottle(), settings=settings)
    assert watchlist.last_run(db) is not None and watchlist.retry_at(db) is None


def test_cancel_inside_a_request_ends_the_run(db, settings):
    """n5: the cancel event reaches the client; WaitCancelled ends the run as cancelled."""
    from app.core.throttle import WaitCancelled

    src(db, url="https://www.youtube.com/@a")
    src(db, url="https://www.youtube.com/@b")
    cancel = threading.Event()
    got = []

    class Client(FakeClient):
        def list_source(self, url, max_entries=None, *, cancel_event=None, **kw):
            got.append(cancel_event)
            cancel.set()
            raise WaitCancelled

    res = watchlist.check_all(
        client=Client(), db=db, throttle=FakeThrottle(), settings=settings, cancel=cancel
    )
    assert got == [cancel] and res.cancelled and res.errors == 0 and res.note == "Abgebrochen"
    run = db.list_runs()[0]
    assert run["finished"] and run["note"] == "Abgebrochen"
    assert watchlist.last_run(db) is None and watchlist.retry_at(db) is None


def test_close_interrupted_finishes_open_run(db):
    rid = db.start_run("watchlist")
    db.set_state(watchlist.K_RUNNING_SINCE, datetime.now(UTC).isoformat())
    watchlist.close_interrupted(db, "Abgebrochen (App beendet)")
    run = [r for r in db.list_runs() if r["id"] == rid][0]
    assert run["finished"] and run["note"] == "Abgebrochen (App beendet)"
    assert watchlist.running_since(db) is None
