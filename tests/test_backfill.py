"""v0.4.0 «Read everything (once)»: paged listing through the throttle (YtClient), backfill core
(cursor, cap, inbox only, dedup, backoff interruption + resume, pause/cancel), automatic
continuation (GUI and headless) and the bridge methods. Network is always mocked."""

from __future__ import annotations

import ast
import threading
import types
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
import yt_dlp

from app import headless
from app.core import backfill, config, locks, watchlist, ytclient
from app.core.db import Database
from app.core.throttle import (
    K_BACKFILL_LAST,
    BackoffActive,
    RequestBudgetSpent,
    Throttle,
    WaitCancelled,
)
from app.core.ytclient import YtClient, YtClientError
from app.exitcodes import EXIT_OK

ROOT = Path(__file__).resolve().parents[1]
CHANNEL = "https://www.youtube.com/@djx"


def entry(i, title=None, duration=3600, **kw):
    return {
        "id": f"bf{i:09d}",
        "title": title or f"Hardcore Mix {i}",
        "duration": duration,
        "channel_id": "UCx",
        "channel": "DJ X",
        **kw,
    }


class Clock:
    """Injected clock + sleep: sleeping advances the clock (pacing tests without real waits)."""

    def __init__(self):
        self.now = datetime(2026, 11, 17, 12, 0, tzinfo=UTC)
        self.slept: list[float] = []

    def __call__(self):
        return self.now

    def sleep(self, seconds):
        self.slept.append(round(seconds, 3))
        self.now += timedelta(seconds=seconds)


@pytest.fixture
def settings():
    s = config.defaults()
    s.throttle.sleep_requests = 0
    s.soundcloud.sleep_requests = 0
    s.network.po_token_mode = "off"
    return s


@pytest.fixture
def clock():
    return Clock()


@pytest.fixture
def throttle(db, settings, clock):
    return Throttle(
        db,
        lambda: settings.throttle,
        clock=clock,
        sleep=clock.sleep,
        platform_settings={"soundcloud": lambda: settings.soundcloud},
    )


def add(db, stype="channel", url=CHANNEL, **kw):
    count = kw.pop("item_count", None)
    sid = db.add_source(stype, kw.pop("name", "DJ X"), url, **kw)
    if count is not None:
        db.update_source(sid, item_count=count)
    return db.get_source(sid)


# =========================================================================== YtClient


class PagedYDL:
    """yt-dlp stand-in: `extract_info(process=False)` makes the first-page request through
    `self.urlopen` and returns a lazy generator that requests every further page through
    `self.urlopen` too (like YoutubeTabIE continuations). `fail` = {page index: exception}."""

    pages: list[list[dict]] = []
    count: int | None = None
    fail: dict[int, Exception] = {}
    instances: list = []
    local_calls = 0

    def __init__(self, opts):
        self.opts = opts
        self.params = dict(opts)
        self.requested: list[str] = []
        PagedYDL.instances.append(self)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def urlopen(self, req):
        self.requested.append(str(req))
        return "response"

    def _page(self, i):
        if i in PagedYDL.fail:
            raise PagedYDL.fail.pop(i)
        self.urlopen(f"https://www.youtube.com/youtubei/v1/browse?page={i}")

    def extract_info(self, url, download=True, process=True):
        assert not download and not process
        self.urlopen("http://127.0.0.1:4416/ping")  # local PO-token provider: never gated
        self._page(0)

        def gen():
            for i, page in enumerate(PagedYDL.pages):
                if i:
                    self._page(i)
                yield from page

        return {
            "_type": "playlist",
            "playlist_count": PagedYDL.count,
            "channel": "DJ X",
            "title": "DJ X - Videos",
            "entries": gen(),
        }


@pytest.fixture
def paged(monkeypatch, tmp_path):
    monkeypatch.setenv("HCLOADER_BIN_DIR", str(tmp_path / "bin"))
    monkeypatch.setenv("TOKEN_TTL", "x")
    PagedYDL.pages = [[entry(p * 3 + i) for i in range(1, 4)] for p in range(4)]  # 12 entries
    PagedYDL.count, PagedYDL.fail, PagedYDL.instances = None, {}, []
    monkeypatch.setattr(ytclient.yt_dlp, "YoutubeDL", PagedYDL)
    return PagedYDL


@pytest.fixture
def client(settings, db, throttle):
    return YtClient(lambda: settings, db, throttle)


def collect():
    got: list[tuple[list[str], int]] = []

    def on_entries(batch, position):
        got.append(([e["id"] for e in batch], position))

    return got, on_entries


def test_paged_listing_flushes_each_page_before_the_next_request(client, paged, throttle, db):
    got, on_entries = collect()
    slots = []
    real = throttle.backfill_pace

    def slot(per_hour, cancel_event=None):
        slots.append((per_hour, len(got)))  # pages handed over before this request
        real(per_hour, cancel_event)

    throttle.backfill_pace = slot
    listing = client.list_source_paged(CHANNEL, limit=100, on_entries=on_entries)
    assert [pos for _, pos in got] == [3, 6, 9, 12]
    assert [len(ids) for ids, _ in got] == [3, 3, 3, 3]
    # one throttle slot per platform request, each after the previous page was stored
    assert slots == [(120, 0), (120, 1), (120, 2), (120, 3)]
    assert listing.requests == 4 and listing.complete and listing.position == 12
    assert listing.source_name == "DJ X"
    ydl = paged.instances[0]
    assert ydl.opts["sleep_interval_requests"] == 0  # spacing comes from the gate
    assert ydl.opts["extract_flat"] == "in_playlist" and ydl.opts["lazy_playlist"] is True
    assert ydl.requested[0].startswith("http://127.0.0.1")  # local request passed ungated
    assert db.get_state(K_BACKFILL_LAST) and db.get_state("last_request")


def test_paged_listing_paces_requests_per_hour(client, paged, clock, settings):
    settings.throttle.sleep_requests = 2
    _, on_entries = collect()
    client.list_source_paged(CHANNEL, limit=100, on_entries=on_entries, requests_per_hour=60)
    # first request at once, then one per minute (60/h); the 2 s spacing is covered by it
    assert clock.slept == [60.0, 60.0, 60.0]


def test_paged_listing_cap_stops_without_requesting_the_next_page(client, paged):
    got, on_entries = collect()
    listing = client.list_source_paged(CHANNEL, limit=6, on_entries=on_entries)
    assert got == [([f"bf{i:09d}" for i in (1, 2, 3)], 3), ([f"bf{i:09d}" for i in (4, 5, 6)], 6)]
    assert listing.requests == 2 and listing.capped and not listing.complete


def test_paged_listing_resume_skips_walked_entries(client, paged):
    got, on_entries = collect()
    client.list_source_paged(CHANNEL, start=7, limit=100, on_entries=on_entries)
    assert got == [([f"bf{i:09d}" for i in (8, 9)], 9), ([f"bf{i:09d}" for i in (10, 11, 12)], 12)]


def test_paged_listing_budget_spent_after_storing_the_page(client, paged):
    got, on_entries = collect()
    with pytest.raises(RequestBudgetSpent):
        client.list_source_paged(CHANNEL, limit=100, on_entries=on_entries, max_requests=2)
    assert [pos for _, pos in got] == [3, 6]  # both received pages are stored


def test_paged_listing_rate_limit_starts_backoff(client, paged, throttle):
    paged.fail = {2: yt_dlp.utils.DownloadError("HTTP Error 429: Too Many Requests")}
    got, on_entries = collect()
    with pytest.raises(YtClientError) as err:
        client.list_source_paged(CHANNEL, limit=100, on_entries=on_entries)
    assert err.value.rate_limited
    assert throttle.backoff_until() is not None
    assert [pos for _, pos in got] == [3, 6]  # cursor of the pages before the 429
    with pytest.raises(BackoffActive):  # nothing goes out during the backoff
        client.list_source_paged(CHANNEL, limit=100, on_entries=on_entries)


def test_paged_listing_cancel_stops_before_next_request(client, paged):
    cancel = threading.Event()
    got = []

    def on_entries(batch, position):
        got.append(position)
        cancel.set()

    with pytest.raises(WaitCancelled):
        client.list_source_paged(CHANNEL, limit=100, on_entries=on_entries, cancel_event=cancel)
    assert got == [3] and len(paged.instances[0].requested) == 2  # ping + first page


def test_list_source_reports_playlist_count(client, paged, monkeypatch):
    class Info:
        def __init__(self, opts):
            self.opts = opts

        def __enter__(self):
            return self

        def __exit__(self, *e):
            return False

        def extract_info(self, url, download=False, process=True):
            return {"_type": "playlist", "playlist_count": 486, "entries": [entry(1)]}

        def sanitize_info(self, info):
            return info

    monkeypatch.setattr(ytclient.yt_dlp, "YoutubeDL", Info)
    assert client.list_source("https://www.youtube.com/playlist?list=PL1", 5).total == 486


# =========================================================================== throttle


def test_backfill_slot_is_persisted_and_respects_backoff(db, settings, clock, throttle):
    throttle.backfill_slot(120)
    assert clock.slept == []
    # a new process (restart) continues the pacing from the persisted stamp: no burst
    again = Throttle(db, lambda: settings.throttle, clock=clock, sleep=clock.sleep)
    again.backfill_slot(120)
    assert clock.slept == [30.0]
    throttle.trigger_backoff("HTTP Error 429")
    with pytest.raises(BackoffActive):
        throttle.backfill_slot(120)


# =========================================================================== core


class FakeClient:
    """`list_source_paged` stand-in: pages of `page` entries over the whole listing; every page
    is one request. `errors` = {page index: exception} (raised once, before that request)."""

    def __init__(self, entries, page=3, total=None, errors=None, throttle=None):
        self.entries = entries
        self.page = page
        self.total = total
        self.errors = dict(errors or {})
        self.throttle = throttle
        self.calls = []

    def list_source_paged(
        self,
        url,
        *,
        limit,
        on_entries,
        start=0,
        requests_per_hour=120,
        max_requests=None,
        on_info=None,
        on_request=None,
        cancel_event=None,
    ):
        self.calls.append({"start": start, "limit": limit, "max_requests": max_requests})
        listing = ytclient.PagedListing(position=start, total=self.total)
        if on_info:
            on_info(listing)
        n = min(limit, len(self.entries))
        for idx, first in enumerate(range(0, n, self.page)):
            if cancel_event is not None and cancel_event.is_set():
                raise WaitCancelled
            if max_requests is not None and listing.requests >= max_requests:
                raise RequestBudgetSpent
            if idx in self.errors:
                exc = self.errors.pop(idx)
                if getattr(exc, "rate_limited", False) and self.throttle is not None:
                    self.throttle.trigger_backoff("HTTP Error 429")
                raise exc
            listing.requests += 1
            if on_request:
                on_request()
            end = min(first + self.page, n)
            if end <= start:
                continue
            batch = [e for i, e in enumerate(self.entries[first:end], first + 1) if i > start]
            on_entries(batch, end)
            listing.position = end
        listing.complete = n == len(self.entries)
        listing.capped = not listing.complete
        return listing


def limited():
    return YtClientError("HTTP Error 429: Too Many Requests", rate_limited=True)


def run(src, client, db, settings, **kw):
    return backfill.run(src, client=client, db=db, settings=settings, **kw)


def test_full_run_puts_passing_hits_into_inbox_only(db, settings):
    src = add(db, auto_download=True, default_genre="Hardcore")  # auto-download is ignored
    entries = [entry(i) for i in range(1, 8)] + [entry(8, duration=120)]  # 8: too short
    backfill.request(db, src["id"])
    events = []
    res = run(src, FakeClient(entries), db, settings, on_progress=events.append)
    assert res.state == "done" and res.added == 7 and res.found == 8 and res.requests == 3
    assert db.count_videos(status="inbox") == 7 and db.count_videos(status="queued") == 0
    assert db.get_video("bf000000008")["status"] == "new"  # filtered: stays out of the inbox
    assert db.get_video("bf000000001")["genre"] == "Hardcore"
    assert db.source_video_count(src["id"]) == 8
    row = db.get_backfill(src["id"])
    assert row["state"] == "done" and row["position"] == 8 and row["total"] == 8
    assert row["finished"] and row["added"] == 7
    assert [e["state"] for e in events][0] == "running" and events[-1]["state"] == "done"
    assert [e["position"] for e in events if e["state"] == "running"][1:] == [3, 6, 8]


def test_cap_from_settings(db, settings):
    settings.watchlist.backfill_max_entries = 100
    src = add(db)
    backfill.request(db, src["id"])
    client = FakeClient([entry(i) for i in range(1, 251)], page=30)
    res = run(src, client, db, settings)
    assert client.calls[0]["limit"] == 100
    assert res.state == "done" and db.get_backfill(src["id"])["position"] == 100
    assert db.count_videos(status="inbox") == 100


def test_backoff_interrupts_and_resume_continues_at_cursor(db, settings, throttle):
    src = add(db)
    entries = [entry(i) for i in range(1, 10)]
    client = FakeClient(entries, errors={1: limited()}, throttle=throttle)
    backfill.request(db, src["id"])
    res = run(src, client, db, settings)
    assert res.backoff and res.state == "pending"
    row = db.get_backfill(src["id"])
    assert row["position"] == 3 and "Backoff" in row["note"] and row["state"] == "pending"
    # during the backoff the automatic continuation skips it without any request
    out = backfill.continue_open(client=client, db=db, throttle=throttle, settings=settings)
    assert out[0].skipped and out[0].backoff and len(client.calls) == 1
    throttle.reset_backoff()
    out = backfill.continue_open(client=client, db=db, throttle=throttle, settings=settings)
    assert client.calls[-1]["start"] == 3 and out[0].state == "done"
    assert db.count_videos(status="inbox") == 9  # nothing twice, nothing lost
    assert db.get_backfill(src["id"])["note"] is None


def test_restart_resumes_running_row_from_cursor(tmp_path, settings):
    """App killed mid-run: the row stays `running`; the next process continues at its cursor."""
    path = tmp_path / "bf.db"
    with Database(path) as d:
        src = add(d)
        backfill.request(d, src["id"])
        d.update_backfill(src["id"], state="running", position=6, added=6)
    with Database(path) as d:
        assert backfill.open_ids(d) == [src["id"]]
        client = FakeClient([entry(i) for i in range(1, 10)])
        out = backfill.continue_open(client=client, db=d, throttle=None, settings=settings)
        assert client.calls[0]["start"] == 6 and out[0].state == "done"
        assert d.get_backfill(src["id"])["added"] == 6 + 3


def test_dedup_known_videos_never_twice(db, settings):
    src = add(db)
    db.upsert_video({**entry(1), "status": "done"})  # already downloaded
    db.upsert_video({**entry(2), "status": "ignored"})
    db.upsert_video({**entry(3), "status": "new"})  # from a search, passing now -> adopted
    backfill.request(db, src["id"])
    res = run(src, FakeClient([entry(i) for i in range(1, 6)]), db, settings)
    assert db.get_video("bf000000001")["status"] == "done"
    assert db.get_video("bf000000002")["status"] == "ignored"
    assert db.get_video("bf000000003")["status"] == "inbox"
    assert res.added == 3 and res.found == 2
    # reading again adds nothing new
    backfill.request(db, src["id"])
    again = run(src, FakeClient([entry(i) for i in range(1, 6)]), db, settings)
    assert again.state == "done" and again.added == 0 and again.found == 0
    assert db.count_videos(status="inbox") == 3


def test_festival_detection_like_a_normal_check(db, settings):
    src = add(db)
    backfill.request(db, src["id"])
    run(src, FakeClient([entry(1, title="Defqon.1 2019 | RED | Some DJ")]), db, settings)
    row = db.get_video("bf000000001")
    assert row["edition_id"] is not None and row["stage"] == "RED"


def test_user_pause_and_cancel_win_over_the_running_backfill(db, settings):
    src = add(db)
    backfill.request(db, src["id"])
    stop = threading.Event()

    def on_progress(view):
        if view["state"] == "running" and view["position"] >= 3:
            backfill.pause(db, src["id"])  # API: DB first, then the event
            stop.set()

    res = run(
        src,
        FakeClient([entry(i) for i in range(1, 10)]),
        db,
        settings,
        cancel=stop,
        on_progress=on_progress,
    )
    assert res.cancelled and res.state == "paused"
    assert db.get_backfill(src["id"])["position"] == 3
    assert backfill.open_ids(db) == []  # paused: no automatic continuation
    assert backfill.request(db, src["id"])["state"] == "pending"  # «Resume»
    assert db.get_backfill(src["id"])["position"] == 3
    assert backfill.cancel(db, src["id"])
    row = db.get_backfill(src["id"])
    assert row["state"] == "cancelled" and row["position"] == 0
    assert db.count_videos(status="inbox") == 3  # hits stay
    assert backfill.request(db, src["id"])["position"] == 0  # a new start begins from scratch


def test_errors_in_a_row_pause_the_backfill(db, settings):
    src = add(db)
    backfill.request(db, src["id"])
    for n in range(1, 4):
        client = FakeClient([entry(1)], errors={0: YtClientError("HTTP Error 404")})
        res = run(src, client, db, settings)
        assert res.error and "404" in db.get_backfill(src["id"])["note"]
        assert res.state == ("paused" if n == 3 else "pending")


def test_continue_open_budget_and_eligibility(db, settings, throttle):
    a = add(db, name="A", item_count=9)
    b = add(db, url="https://www.youtube.com/@b", name="B", item_count=9)
    off = add(db, url="https://www.youtube.com/@c", name="C", enabled=False, item_count=9)
    for s in (a, b, off):
        backfill.request(db, s["id"])
    client = FakeClient([entry(i) for i in range(1, 10)])
    out = backfill.continue_open(
        client=client, db=db, throttle=throttle, settings=settings, max_requests=4
    )
    # A: estimated 2 requests, fits -> 3 requests (done). B: estimated 2, only 1 left in the
    # budget -> not started at all (next run, no wasted request). C (disabled) is skipped.
    assert [c["max_requests"] for c in client.calls] == [4]
    assert out[0].state == "done" and out[1].skipped and not out[1].deferred
    assert db.get_backfill(b["id"])["position"] == 0 and db.get_backfill(b["id"])["note"] is None
    assert db.get_backfill(off["id"])["state"] == "pending"
    # explicit start (ids): also a disabled source
    backfill.continue_open(
        client=client, db=db, throttle=throttle, settings=settings, ids=[off["id"]]
    )
    assert db.get_backfill(off["id"])["state"] == "done"


def test_search_sources_are_refused(db, settings):
    s = add(db, stype="search", url="hardcore mix")
    assert backfill.refusal(s, settings)
    est_src = add(db, stype="playlist", url="https://www.youtube.com/playlist?list=PL1")
    assert backfill.refusal(est_src, settings) is None


def test_estimate_known_and_conservative(db, settings):
    settings.throttle.sleep_requests = 3
    src = add(db, stype="playlist", url="https://www.youtube.com/playlist?list=PL1")
    e = backfill.estimate(src, db, settings)
    assert e["conservative"] and e["entries"] == 2000 and e["requests"] == 1 + 20
    assert e["seconds"] == 21 * 30  # 120/h -> 30 s per request
    db.update_source(src["id"], item_count=486)
    e = backfill.estimate(db.get_source(src["id"]), db, settings)
    assert not e["conservative"] and e["known_total"] == 486 and e["requests"] == 1 + 5
    ch = add(db, url="https://www.youtube.com/@big")
    db.update_source(ch["id"], item_count=5000)
    e = backfill.estimate(db.get_source(ch["id"]), db, settings)
    assert e["entries"] == 2000 and e["requests"] == 1 + 67  # channel pages of ~30


def test_check_source_stores_item_count(db, settings):
    src = add(db, stype="playlist", url="https://www.youtube.com/playlist?list=PL1")

    class C:
        def list_source(self, url, n=None, **kw):
            return ytclient.SourceListing([entry(1)], total=486)

    watchlist.check_source(src, client=C(), db=db, settings=settings)
    assert db.get_source(src["id"])["item_count"] == 486


def test_delete_source_drops_backfill(db):
    src = add(db)
    backfill.request(db, src["id"])
    db.delete_source(src["id"])
    assert db.get_backfill(src["id"]) is None


# =========================================================================== headless


class HeadlessClient(FakeClient):
    def list_source(self, url, n=None, **kw):
        return []

    def search(self, *a, **kw):
        return []

    def close(self):
        pass


class _Lock:
    def release(self):
        pass


class _Held:
    def __init__(self, log, name):
        self.log, self.name = log, name

    def release(self):
        self.log.append(f"release:{self.name}")


def _headless(db, settings, client, **kw):
    return headless.run_watchlist(
        settings=settings,
        db=db,
        client_factory=lambda: client,
        run_lock=kw.pop("run_lock", _Lock),
        watchlist_lock=kw.pop("watchlist_lock", _Lock),
        backfill_lock=_Lock,
        configure_logging=False,
        watchdog=types.SimpleNamespace(check=lambda: None, stop=lambda: None, running=lambda: True),
        **kw,
    )


def test_headless_run_continues_open_backfill_within_budget(tmp_path, settings):
    settings.storage.target_dir = str(tmp_path / "music")
    settings.watchlist.backfill_requests_per_hour = 2
    db = Database(tmp_path / "h.db")
    try:
        src = add(db, item_count=9)  # estimate: 1 + 1 page -> fits the budget of 2
        db.mark_source_checked(src["id"])
        backfill.request(db, src["id"])
        paused = add(db, url="https://www.youtube.com/@p", name="P")
        backfill.request(db, paused["id"])
        backfill.pause(db, paused["id"])
        client = HeadlessClient([entry(i) for i in range(1, 10)])
        assert _headless(db, settings, client) == EXIT_OK
        assert [c["start"] for c in client.calls] == [0]  # the paused one is left alone
        row = db.get_backfill(src["id"])
        # the pages were smaller than estimated: the budget backstop stops after 2 pages
        assert row["state"] == "pending" and row["position"] == 6
        assert db.count_videos(status="inbox") == 6
        run = db.list_runs()[0]
        assert run["found"] == 6 and "Read everything" in run["note"]
        # M2: the learned page size shows that the next run cannot finish (1 + 1 re-read + 1
        # new > 2): it defers without any request instead of re-reading the same pages
        assert _headless(db, settings, client) == EXIT_OK
        assert len(client.calls) == 1
        row = db.get_backfill(src["id"])
        assert row["state"] == "pending" and "Too large for a scheduled run" in row["note"]
        assert "too large" in db.list_runs()[0]["note"]
    finally:
        db.close()


def test_headless_releases_run_and_watchlist_locks_before_the_backfill(tmp_path, settings):
    """Review v0.4.0 M3: the GUI queue, in-app checks and a yt-dlp update are not blocked
    while a scheduled run reads a source page by page."""
    settings.storage.target_dir = str(tmp_path / "music")
    db = Database(tmp_path / "h.db")
    log: list[str] = []
    try:
        src = add(db, item_count=9)
        db.mark_source_checked(src["id"])
        backfill.request(db, src["id"])

        class Client(HeadlessClient):
            def list_source_paged(self, *a, **kw):
                log.append("backfill")
                return super().list_source_paged(*a, **kw)

        code = _headless(
            db,
            settings,
            Client([entry(i) for i in range(1, 4)]),
            run_lock=lambda: _Held(log, "run"),
            watchlist_lock=lambda: _Held(log, "watchlist"),
        )
        assert code == EXIT_OK
        assert log == ["release:watchlist", "release:run", "backfill"]  # once, before reading
        assert db.get_backfill(src["id"])["state"] == "done"
    finally:
        db.close()


def test_headless_without_open_backfill_keeps_locks_to_the_end(tmp_path, settings):
    settings.storage.target_dir = str(tmp_path / "music")
    db = Database(tmp_path / "h.db")
    log: list[str] = []
    try:
        code = _headless(
            db,
            settings,
            HeadlessClient([]),
            run_lock=lambda: _Held(log, "run"),
            watchlist_lock=lambda: _Held(log, "watchlist"),
        )
        assert code == EXIT_OK and log == ["release:watchlist", "release:run"]
    finally:
        db.close()


# =========================================================================== M2 economics


def _budget_runs(db, settings, client, runs):
    """`runs` scheduled runs (budget = requests per hour); returns requests per run."""
    per_run = []
    for _ in range(runs):
        before = sum(1 for _ in client.calls)
        out = backfill.continue_open(
            client=client,
            db=db,
            throttle=None,
            settings=settings,
            max_requests=int(settings.watchlist.backfill_requests_per_hour),
        )
        per_run.append(sum(r.requests for r in out))
        assert len(client.calls) - before <= 1
    return per_run


def test_cap_5000_at_120_per_hour_is_deferred_to_the_app_with_a_clear_note(db, settings):
    """Review v0.4.0 M2: a YouTube channel with cap 5000 needs ~168 requests; a scheduled run
    (120/h) can never finish it. Instead of re-reading the same pages every day it makes no
    request at all and says why; the app (no budget) reads it in one go."""
    settings.watchlist.backfill_max_entries = 5000
    settings.watchlist.backfill_requests_per_hour = 120
    src = add(db)
    backfill.request(db, src["id"])
    client = FakeClient([entry(i) for i in range(1, 6001)], page=30)
    assert _budget_runs(db, settings, client, 5) == [0] * 5
    assert client.calls == []
    row = db.get_backfill(src["id"])
    assert row["state"] == "pending" and row["position"] == 0
    assert "Too large for a scheduled run (168 requests, budget 120 per hour)" in row["note"]
    assert "at least 168" in row["note"]  # 168 <= 600: raising the value would help
    est = backfill.estimate(src, db, settings)
    assert est["requests"] == 168 and est["headless_ok"] is False
    # the app continues it without a budget: a single paged generator, every page once
    out = backfill.continue_open(client=client, db=db, throttle=None, settings=settings)
    assert out[0].state == "done" and out[0].requests == 167
    assert db.get_backfill(src["id"])["position"] == 5000


def test_cap_5000_resume_after_app_close_is_left_to_the_app(db, settings):
    settings.watchlist.backfill_max_entries = 5000
    settings.watchlist.backfill_requests_per_hour = 120
    src = add(db)
    backfill.request(db, src["id"])
    db.update_backfill(src["id"], position=3570)  # the app was closed after 119 pages
    client = FakeClient([entry(i) for i in range(1, 6001)], page=30)
    assert _budget_runs(db, settings, client, 3) == [0, 0, 0]
    assert backfill.estimate(src, db, settings)["reread"] == 119
    out = backfill.continue_open(client=client, db=db, throttle=None, settings=settings)
    assert client.calls == [{"start": 3570, "limit": 5000, "max_requests": None}]
    assert out[0].state == "done"


def test_cap_2000_at_120_per_hour_finishes_in_one_scheduled_run(db, settings):
    src = add(db)  # defaults: cap 2000, 120/h -> 1 + 67 requests
    backfill.request(db, src["id"])
    client = FakeClient([entry(i) for i in range(1, 2501)], page=30)
    assert _budget_runs(db, settings, client, 2) == [67, 0]
    assert db.get_backfill(src["id"])["state"] == "done"


def test_smaller_pages_than_estimated_end_after_a_bounded_number_of_runs(db, settings):
    """Backstop: pages of 10 instead of 30. The first run spends its budget; the learned page
    size makes every later run defer (no request) - never a daily re-read loop."""
    src = add(db)
    backfill.request(db, src["id"])
    client = FakeClient([entry(i) for i in range(1, 2501)], page=10)
    assert _budget_runs(db, settings, client, 4) == [120, 0, 0, 0]
    row = db.get_backfill(src["id"])
    assert row["position"] == 1200 and "Too large for a scheduled run" in row["note"]
    size = float(db.get_state(f"backfill_page_size:{src['id']}"))
    assert size == pytest.approx(1200 / 119, abs=1e-3)


def test_resume_that_only_re_reads_is_never_repeated(db, settings):
    """A resume whose re-read alone used up the budget (no progress) stores an upper bound
    of the page size, so the next scheduled run defers instead of doing the same again."""
    src = add(db, item_count=1600)
    backfill.request(db, src["id"])
    db.update_backfill(src["id"], position=1500)
    client = FakeClient([entry(i) for i in range(1, 1601)], page=10)
    # estimated with pages of 30: 1 + 50 + 4 = 55 requests -> started; actually 150 re-reads
    assert _budget_runs(db, settings, client, 3) == [120, 0, 0]
    assert db.get_backfill(src["id"])["position"] == 1500


# =========================================================================== review v0.4.0


def test_pacing_wait_holds_no_metadata_lock(client, paged, db, settings, throttle):
    """Review v0.4.0 M1: while the backfill waits for its pacing slot, a search / watchlist
    check / download extraction gets the metadata lock at once."""
    pacing = threading.Event()
    release = threading.Event()

    def sleep(seconds):
        pacing.set()
        assert release.wait(5)

    throttle._sleep = sleep
    throttle._default_sleep = False
    db.set_state(K_BACKFILL_LAST, datetime.now(UTC).isoformat())  # first request must wait
    throttle._now = lambda: datetime.now(UTC)
    errors = []

    def read():
        try:
            client.list_source_paged(
                CHANNEL, limit=100, on_entries=lambda b, p: None, requests_per_hour=60
            )
        except Exception as exc:  # pragma: no cover - reported below
            errors.append(exc)

    t = threading.Thread(target=read)
    t.start()
    try:
        assert pacing.wait(5)
        with throttle.platform("youtube").metadata_lock(timeout=1.0):
            pass  # MetadataBusy here = the pacing wait holds the lock
    finally:
        release.set()
        t.join(10)
    assert not t.is_alive() and errors == []


def test_paged_listing_stops_when_a_ytdlp_update_starts(client, paged, db):
    """M3: the headless backfill no longer holds the run lock; a yt-dlp update of the GUI
    stops it before its next request (it continues later with the new yt-dlp)."""
    got = []

    def on_entries(batch, position):
        got.append(position)
        backfill.stop_for_update(db)

    with pytest.raises(WaitCancelled):
        client.list_source_paged(CHANNEL, limit=100, on_entries=on_entries)
    assert got == [3] and len(paged.instances[0].requested) == 2  # ping + first page


def test_paged_listing_resolves_a_redirect_lazily(client, paged, monkeypatch):
    """m4: a redirecting URL is resolved with process=False again (cursor per page)."""
    real = paged.extract_info

    def extract_info(self, url, download=True, process=True):
        if "redirect" in url:
            self.urlopen("https://www.youtube.com/redirect")
            return {"_type": "url", "url": CHANNEL + "/videos"}
        return real(self, url, download=download, process=process)

    monkeypatch.setattr(paged, "extract_info", extract_info)
    got, on_entries = collect()
    listing = client.list_source_paged(
        "https://www.youtube.com/redirect", limit=100, on_entries=on_entries
    )
    assert [pos for _, pos in got] == [3, 6, 9, 12] and listing.complete


def test_soundcloud_assets_are_spaced_not_paced(throttle):
    calls = []
    throttle.backfill_pace = lambda *a, **kw: calls.append("pace")
    gate = ytclient._PagedGate(
        throttle,
        ytclient.PagedListing(),
        lambda b, p: None,
        per_hour=120,
        max_requests=None,
        on_request=None,
        cancel_event=None,
    )
    ydl = types.SimpleNamespace(urlopen=lambda req: "ok")
    gate.install(ydl)
    assert ydl.urlopen("https://a-v2.sndcdn.com/assets/0-abc.js") == "ok"
    assert calls == [] and gate.listing.requests == 1
    ydl.urlopen("https://api-v2.soundcloud.com/users/1/tracks")
    assert calls == ["pace"]


def test_pause_by_another_process_stops_before_storing_the_next_page(db, settings):
    """m1/m3: a pause/cancel only visible in the DB (another process) stops the run before the
    next batch is stored; counters match the inbox."""
    src = add(db)
    backfill.request(db, src["id"])

    def on_progress(view):
        if view["state"] == "running" and view["position"] == 3:
            db.update_backfill(src["id"], state="paused")  # the GUI, other process

    res = run(
        src, FakeClient([entry(i) for i in range(1, 10)]), db, settings, on_progress=on_progress
    )
    row = db.get_backfill(src["id"])
    assert res.cancelled and row["state"] == "paused"
    assert row["position"] == 3 and row["added"] == 3 and db.count_videos(status="inbox") == 3


def test_deleted_source_stops_its_backfill(db, settings):
    src = add(db)
    backfill.request(db, src["id"])

    def on_progress(view):
        if view["state"] == "running" and view["position"] == 3:
            db.delete_source(src["id"])

    res = run(
        src, FakeClient([entry(i) for i in range(1, 10)]), db, settings, on_progress=on_progress
    )
    assert res.cancelled and res.error is None
    assert db.count_videos(status="inbox") == 3


# =========================================================================== API


@pytest.fixture
def api_env(tmp_path, monkeypatch):
    from app.api import Api
    from app.worker import EventBus

    made = []

    class Window:
        def __init__(self):
            self.calls = []

        def evaluate_js(self, js):
            self.calls.append(js)

    def make(client):
        bus = EventBus()
        events = []
        bus.subscribe(lambda t, d: events.append((t, d)))
        a = Api(
            bus=bus,
            run_lock=lambda: _Lock(),
            watchlist_lock=lambda: _Lock(),
            backfill_lock=lambda: _Lock(),
            client_factory=lambda: client,
            configure_logging=False,
            watchdog=types.SimpleNamespace(
                start=lambda: None,
                stop=lambda: None,
                check=lambda: None,
                running=lambda: False,
                apply=lambda: None,
                gave_up=False,
                server=None,
            ),
        )
        bus.attach(Window(), ready=True)
        a._events = events
        made.append(a)
        return a

    yield make
    for a in made:
        a.shutdown(1)


def _wait(a, sid, state, timeout=5.0):
    import time

    end = time.monotonic() + timeout
    while time.monotonic() < end:
        row = a._db.get_backfill(sid)
        if row and row["state"] == state:
            return row
        time.sleep(0.02)
    raise AssertionError(f"state {state} not reached: {a._db.get_backfill(sid)}")


def test_api_start_runs_in_backfill_thread_and_emits_events(api_env):
    client = HeadlessClient([entry(i) for i in range(1, 8)])
    threads = []
    real = client.list_source_paged

    def spy(*a, **kw):
        threads.append(threading.current_thread().name)
        return real(*a, **kw)

    client.list_source_paged = spy
    a = api_env(client)
    sid = a._db.add_source("channel", "DJ", CHANNEL, auto_download=True)
    est = a.estimate_backfill(sid)
    assert est["ok"] and est["conservative"] and est["entries"] == 2000
    res = a.start_backfill(sid)
    assert res["ok"] and res["backfill"]["state"] in ("pending", "running", "done")
    _wait(a, sid, "done")
    assert threads == ["hcloader-backfill"]
    assert a._db.count_videos(status="inbox") == 7 and a._db.count_videos(status="queued") == 0
    src = next(s for s in a.get_sources() if s["id"] == sid)
    assert src["backfill"]["state"] == "done" and src["backfill"]["added"] == 7
    a._bus.flush(2)
    states = [d["state"] for t, d in a._events if t == "backfill"]
    assert states[0] == "pending" and "running" in states and states[-1] == "done"


def test_api_refusals(api_env, settings):
    a = api_env(HeadlessClient([]))
    search = a._db.add_source("search", "S", "hardcore mix")
    assert a.start_backfill(search)["ok"] is False
    assert a.estimate_backfill(search)["ok"] is False
    assert a.pause_backfill(12345)["ok"] is False
    sid = a._db.add_source("channel", "DJ", CHANNEL)
    a._throttle.trigger_backoff("HTTP Error 429")
    r = a.start_backfill(sid)
    assert r["ok"] is False and "Backoff" in r["error"]
    assert a._db.get_backfill(sid) is None


def test_api_pause_stops_the_running_backfill(api_env):
    gate = threading.Event()
    release = threading.Event()

    class Slow(HeadlessClient):
        def list_source_paged(self, url, *, on_entries, cancel_event=None, **kw):
            on_entries([entry(1)], 1)
            gate.set()
            release.wait(5)
            if cancel_event is not None and cancel_event.is_set():
                raise WaitCancelled
            raise AssertionError("not stopped")

    a = api_env(Slow([]))
    sid = a._db.add_source("channel", "DJ", CHANNEL)
    a.start_backfill(sid)
    assert gate.wait(5)
    res = a.pause_backfill(sid)
    release.set()
    assert res["ok"] and res["backfill"]["state"] == "paused"
    row = _wait(a, sid, "paused")
    assert row["position"] == 1
    assert a._resume_backfills() is None and a._db.get_backfill(sid)["state"] == "paused"


def test_api_delete_source_stops_its_backfill(api_env):
    a = api_env(HeadlessClient([]))
    sid = a._db.add_source("channel", "DJ", CHANNEL)
    ev = threading.Event()
    a._bf_events[sid] = ev
    assert a.delete_source(sid)["ok"] and ev.is_set()


def test_api_start_refuses_a_backfill_running_in_another_process(api_env):
    a = api_env(HeadlessClient([entry(1)]))
    sid = a._db.add_source("channel", "DJ", CHANNEL)
    backfill.request(a._db, sid)
    a._db.update_backfill(sid, state="running", position=30)
    a._backfill_lock = lambda: None  # held by the headless process
    r = a.start_backfill(sid)
    assert r["ok"] is False and a._db.get_backfill(sid)["position"] == 30
    a._backfill_lock = lambda: _Lock()  # stale row of a crashed process: taken over
    assert a.start_backfill(sid)["ok"]


# =========================================================================== architecture


def test_only_ytclient_imports_yt_dlp():
    """CLAUDE.md: only `ytclient.py` touches yt-dlp (the backfill core and API never do)."""
    offenders = []
    for path in sorted((ROOT / "app").rglob("*.py")):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            names = []
            if isinstance(node, ast.Import):
                names = [a.name for a in node.names]
            elif isinstance(node, ast.ImportFrom) and node.module:
                names = [node.module]
            if any(n == "yt_dlp" or n.startswith("yt_dlp.") for n in names):
                offenders.append(path.relative_to(ROOT).as_posix())
    allowed = {"app/core/ytclient.py", "app/core/maintenance.py", "app/core/binaries.py"}
    assert set(offenders) <= allowed, offenders
    assert "app/core/ytclient.py" in offenders
    src = (ROOT / "app" / "core" / "backfill.py").read_text(encoding="utf-8")
    assert "yt_dlp" not in src and "import ytclient" not in src


def test_backfill_lock_is_exclusive():
    first = locks.acquire_backfill_lock()
    try:
        assert first is not None and locks.acquire_backfill_lock() is None
    finally:
        first.release()
