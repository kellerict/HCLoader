"""End-to-end (Phase 3): search -> filter -> enqueue -> sequential download -> tagging -> DB.

Real `Api`, `DownloadQueue`, `YtClient`, `Throttle`, tagging and paths; only `yt_dlp.YoutubeDL`
is replaced (flat search entries, a short MP3 made by ffmpeg). Clock and sleep of the throttle
are injected, so throttle pauses (3 s between requests, 30 s between downloads) take no time.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import types
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

from app.api import Api
from app.core import config, ytclient
from app.core.db import Database
from app.core.throttle import Throttle
from app.worker import EventBus

pytestmark = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg fehlt")

DOWNLOAD_PAUSE = 30.0


# --------------------------------------------------------------------------- fakes


class FakeTime:
    def __init__(self):
        self.now = datetime(2026, 11, 16, 11, 0, tzinfo=UTC)
        self.slept: list[float] = []
        self.on_sleep = None

    def clock(self):
        return self.now

    def sleep(self, seconds):
        self.slept.append(round(seconds, 3))
        self.now += timedelta(seconds=seconds)
        if self.on_sleep:
            self.on_sleep(seconds)


class FakeWatchdog:
    server = None

    def running(self):
        return False

    def apply(self):
        pass

    def start(self):
        pass

    def stop(self):
        pass


def _entry(vid, title, duration, channel="Partyraiser", channel_id="UCparty"):
    return {
        "id": vid,
        "title": title,
        "duration": duration,
        "channel": channel,
        "channel_id": channel_id,
        "url": f"https://www.youtube.com/watch?v={vid}",
        "live_status": "not_live",
        "timestamp": 1790000000,  # flat result: approximate date
        "view_count": 1000,
        "thumbnails": [{"url": f"https://i.ytimg.com/vi/{vid}/hq.jpg"}],
    }


SEARCH = [
    _entry("hcLiveset01", "Partyraiser Hardcore Liveset 2026", 3600),
    _entry("upMix000002", "Uptempo Terror Mix 2026", 4000, "DJ Terror", "UCterror"),
    _entry("hcTutorial3", "Hardcore Mix Tutorial", 3000),
    _entry("hcShortMix4", "Hardcore mix", 300),
    _entry("frBlocked05", "Frenchcore Set 2026", 5000, "Spam Channel", "UCspam"),
    _entry("gbMegamix06", "Gabber Megamix Vol. 6", 4200, "Gabber Garage", "UCgabber"),
    _entry("gbSession07", "Gabber Session 7", 4100, "Gabber Garage", "UCgabber"),
]


class FakeYDL:
    """Stands in for yt_dlp.YoutubeDL (no network)."""

    instances: list = []
    downloads: list[str] = []
    behaviour: dict = {}

    def __init__(self, opts):
        self.opts = opts
        FakeYDL.instances.append(self)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def sanitize_info(self, info):
        return info

    def extract_info(self, url, download=True):
        if not download:
            assert url.startswith("ytsearch")
            FakeYDL.search_url = url
            return {"_type": "playlist", "entries": [dict(e) for e in SEARCH]}
        vid = url.rsplit("=", 1)[1]
        FakeYDL.downloads.append(vid)
        action = FakeYDL.behaviour.get(vid)
        if callable(action):
            action(self)
        elif isinstance(action, BaseException):
            raise action
        hooks = self.opts.get("progress_hooks", [])
        for hook in hooks:
            hook(
                {
                    "status": "downloading",
                    "downloaded_bytes": 50,
                    "total_bytes": 100,
                    "speed": 2 * 1048576,
                    "eta": 5,
                }
            )
        tmp = Path(self.opts["paths"]["home"])
        tmp.mkdir(parents=True, exist_ok=True)
        mp3 = tmp / f"{vid}.mp3"
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"]
            + ["-t", "1", "-q:a", "9", str(mp3)],
            check=True,
        )
        for hook in hooks:
            hook({"status": "finished", "downloaded_bytes": 100, "total_bytes": 100})
        for hook in self.opts.get("postprocessor_hooks", []):
            hook({"status": "started", "postprocessor": "FFmpegExtractAudio"})
        entry = next(e for e in SEARCH if e["id"] == vid)
        return {
            **entry,
            "upload_date": "20261003",
            "webpage_url": entry["url"],
            "description": "",
            "requested_downloads": [{"filepath": str(mp3)}],
        }


@pytest.fixture
def world(tmp_path, monkeypatch):
    FakeYDL.instances = []
    FakeYDL.downloads = []
    FakeYDL.behaviour = {}
    monkeypatch.setattr(ytclient.yt_dlp, "YoutubeDL", FakeYDL)

    settings = config.defaults()
    settings.storage.target_dir = str(tmp_path / "music")
    settings.network.po_token_mode = "off"
    config.save(settings, config.config_path())

    db = Database(tmp_path / "hc.db")
    db.add_to_blacklist("UCspam", "Spam Channel")
    ft = FakeTime()
    holder: dict = {}
    throttle = Throttle(
        db,
        lambda: holder["api"]._cfg.throttle,
        clock=ft.clock,
        sleep=ft.sleep,
        uniform=lambda low, high: low,
    )
    events: list[tuple[str, dict]] = []
    bus = EventBus()
    bus.subscribe(lambda t, d: events.append((t, d)))

    class Lock:
        def release(self):
            pass

    api = Api(
        db=db,
        bus=bus,
        throttle=throttle,
        watchdog=FakeWatchdog(),
        run_lock=Lock,
        configure_logging=False,
        queue_options={"idle_interval": 60.0},
    )
    holder["api"] = api
    w = types.SimpleNamespace(api=api, db=db, throttle=throttle, time=ft, events=events)
    yield w
    api.shutdown()
    db.close()


def set_throttle(api, **values):
    data = api.get_settings()["values"]
    data["throttle"].update(values)
    res = api.save_settings(data)
    assert res["ok"], res


def of(events, etype, vid=None):
    return [d for t, d in events if t == etype and (vid is None or d.get("id") == vid)]


def search_and_pick(w):
    """UI behaviour: search, then select every hit without filter_reason."""
    res = w.api.search("hardcore", {"genre": "Hardcore", "year": None})
    assert res["ok"], res
    return res, [v["id"] for v in res["results"] if not v["filter_reason"]]


# --------------------------------------------------------------------------- the flow


def test_search_filter_enqueue_download_tag_done(world):
    w = world
    res, picked = search_and_pick(w)

    # search: genre terms appended, all hits returned, filter reasons from the saved filters
    assert res["effective_query"].startswith("hardcore ") and res["query"] == "hardcore"
    assert FakeYDL.search_url == f"ytsearch30:{res['effective_query']}"
    by_id = {v["id"]: v for v in res["results"]}
    assert len(by_id) == len(SEARCH) and res["hidden_count"] == 3
    assert by_id["hcTutorial3"]["filter_reason"] == "Exclude-Keyword: tutorial"
    assert by_id["hcShortMix4"]["filter_reason"] == "Zu kurz"
    assert by_id["frBlocked05"]["filter_reason"] == "Kanal blockiert"
    assert by_id["upMix000002"]["genre"] == "Uptempo"  # keyword beats the chip
    assert by_id["gbMegamix06"]["genre"] == "Hardcore"
    assert by_id["hcLiveset01"]["date_approx"] is True
    assert all(v["status"] == "new" for v in res["results"])
    assert w.db.get_video("hcTutorial3")["status"] == "new"  # every hit is stored
    assert picked == ["hcLiveset01", "upMix000002", "gbMegamix06", "gbSession07"]

    # enqueue the selection (minus one) -> queue thread loads one after another
    picked = picked[:3]
    assert w.api.enqueue(picked) == {"ok": True, "ids": picked}
    last = w.api.get_last_search()
    assert [v["status"] for v in last["results"][:2]] == ["queued", "queued"]
    assert last["effective_query"] == res["effective_query"]
    w.api._queue.start()
    assert w.api._queue.wait_idle(60)

    # DB: done, file in the genre/artist/year folder with tags
    for vid in picked:
        row = w.db.get_video(vid)
        assert row["status"] == "done", row
        assert Path(row["file_path"]).is_file()
    hc = Path(w.db.get_video("hcLiveset01")["file_path"])
    assert hc.parts[-4:-1] == ("Hardcore", "Partyraiser", "2026")
    assert hc.name == "2026-10-03 - Partyraiser Hardcore Liveset 2026 [hcLiveset01].mp3"
    from mutagen.id3 import ID3

    tags = ID3(hc)
    assert str(tags["TCON"]) == "Hardcore" and str(tags["TIT2"]).startswith("Partyraiser")
    assert str(tags["TXXX:YOUTUBE_ID"]) == "hcLiveset01"
    assert w.db.get_video("upMix000002")["date_approx"] == 0  # exact date from the download

    # sequential, in queue order, with the throttle pause in between
    assert FakeYDL.downloads == picked
    assert [d["id"] for d in of(w.events, "done")] == picked
    assert w.time.slept.count(DOWNLOAD_PAUSE) == 2

    # event order per entry: (sleep) -> download -> convert -> tag -> done
    for i, vid in enumerate(picked):
        seq = [
            (t, d.get("phase"))
            for t, d in w.events
            if d.get("id") == vid and t in ("progress", "done")
        ]
        phases = [p for _t, p in seq]
        expected = ["download", "convert", "tag"]
        if i:
            assert phases[0] == "sleep"
            sleep = of(w.events, "progress", vid)[0]
            assert sleep["eta"] == 30 and sleep["sleep_total"] == 30 and sleep["pct"] == 0
            phases = phases[1:]
        dedup = [p for j, p in enumerate(phases) if j == 0 or phases[j - 1] != p]
        assert dedup == [*expected, None], seq  # None = the done event
    first = of(w.events, "progress", "hcLiveset01")[0]
    assert first == {"id": "hcLiveset01", "phase": "download", "pct": 50.0, "speed": 2.0, "eta": 5}
    # no progress of the next entry before the previous one is done
    idx_done_1 = next(
        i for i, (t, d) in enumerate(w.events) if t == "done" and d["id"] == picked[0]
    )
    idx_prog_2 = next(
        i for i, (t, d) in enumerate(w.events) if t == "progress" and d["id"] == picked[1]
    )
    assert idx_done_1 < idx_prog_2
    assert [d["status"] for d in of(w.events, "video", "upMix000002")] == [
        "queued",
        "downloading",
        "done",
    ]

    # queue empty, one run recorded, counters
    q = w.api.get_queue()
    assert q["items"] == [] and q["blocked_reason"] is None
    runs = w.db.list_runs()
    assert len(runs) == 1 and runs[0]["kind"] == "manual" and runs[0]["downloaded"] == 3
    assert w.throttle.downloads_today() == 3
    status = w.api.get_status()
    assert status["queue_length"] == 0 and status["counters"]["downloads_day"] == 3
    assert any(t == "status" for t, _d in w.events)


# --------------------------------------------------------------------------- limits


def test_run_limit_keeps_rest_queued_until_new_run(world):
    w = world
    set_throttle(w.api, max_downloads_per_run=2)
    _res, picked = search_and_pick(w)
    w.api.enqueue(picked)
    w.api._queue.run_pending()

    assert [w.db.get_video(v)["status"] for v in picked] == ["done", "done", "queued", "queued"]
    q = w.api.get_queue()
    assert [i["state"] for i in q["items"]] == ["waiting", "waiting"]
    assert q["blocked_code"] == "run_limit"
    assert q["blocked_reason"].startswith("Limit pro Lauf erreicht (2/2) – Rest bleibt")
    assert w.db.list_runs()[0]["note"].startswith("Limit pro Lauf erreicht")
    w.api._queue.run_pending()  # nothing happens by itself
    assert FakeYDL.downloads == picked[:2]

    # "Fortsetzen" starts a new run
    assert w.api.set_queue_paused(False) == {"ok": True, "paused": False}
    w.api._queue.run_pending()
    assert [w.db.get_video(v)["status"] for v in picked] == ["done"] * 4
    assert len(w.db.list_runs()) == 2


def test_day_limit_blocks_and_reports(world):
    w = world
    set_throttle(w.api, max_downloads_per_day=3)
    _res, picked = search_and_pick(w)
    w.api.enqueue(picked)
    w.api._queue.run_pending()
    assert [w.db.get_video(v)["status"] for v in picked] == ["done", "done", "done", "queued"]
    q = w.api.get_queue()
    assert q["blocked_code"] == "day_limit"
    assert q["blocked_reason"] == "Tageslimit erreicht (3/3) – Rest bleibt in der Warteschlange"
    # next day: continues by itself
    w.time.now += timedelta(days=1)
    w.api._queue.run_pending()
    assert w.db.get_video(picked[3])["status"] == "done"


def test_backoff_on_429_stops_queue(world):
    w = world
    _res, picked = search_and_pick(w)
    FakeYDL.behaviour[picked[1]] = ytclient.yt_dlp.utils.DownloadError(
        "ERROR: [youtube] x: HTTP Error 429: Too Many Requests"
    )
    w.api.enqueue(picked)
    w.api._queue.run_pending()

    assert FakeYDL.downloads == picked[:2]  # no retry, nothing after the 429
    assert [w.db.get_video(v)["status"] for v in picked] == ["done", "failed", "queued", "queued"]
    failed = of(w.events, "failed", picked[1])
    assert len(failed) == 1 and "429" in failed[0]["error"]
    assert w.throttle.backoff_until() is not None
    q = w.api.get_queue()
    assert q["blocked_code"] == "backoff"
    assert q["blocked_reason"].startswith("Backoff aktiv bis ")
    assert [i["state"] for i in q["items"]] == ["waiting", "waiting", "failed"]
    assert w.api.get_status()["backoff"]["active"] is True
    res = w.api.search("gabber")
    assert res["ok"] is False and res["error"].startswith("Backoff aktiv bis")

    w.api._queue.run_pending()
    assert len(FakeYDL.downloads) == 2  # still blocked
    # manual retry is possible, but runs only once the backoff is lifted
    assert w.api.queue_retry(picked[1]) == {"ok": True}
    w.api.clear_backoff()
    w.api._queue.run_pending()
    assert FakeYDL.downloads == [*picked[:2], picked[2], picked[3], picked[1]]


# --------------------------------------------------------------------------- user actions


def test_cancel_during_sleep_and_snapshot(world):
    w = world
    _res, picked = search_and_pick(w)
    seen = {}

    def on_sleep(seconds):
        if seconds == DOWNLOAD_PAUSE and "queue" not in seen:
            seen["queue"] = w.api.get_queue()
            assert w.api.queue_cancel(picked[1]) == {"ok": True}

    w.time.on_sleep = on_sleep
    w.api.enqueue(picked[:3])
    w.api._queue.run_pending()

    snap = seen["queue"]["items"]
    assert snap[0]["id"] == picked[1] and snap[0]["state"] == "waiting"
    assert snap[0]["phase"] == "sleep" and snap[0]["sleep_total"] == 30
    assert 0 <= snap[0]["eta"] <= 30
    assert w.db.get_video(picked[1])["status"] == "new"  # cancelled before its download
    assert FakeYDL.downloads == [picked[0], picked[2]]
    assert w.db.get_video(picked[2])["status"] == "done"
    assert of(w.events, "video", picked[1])[-1]["status"] == "new"


def test_cancel_active_download_and_reorder(world):
    w = world
    _res, picked = search_and_pick(w)
    w.api.enqueue(picked)
    assert w.api.queue_move(picked[2], -1) == {"ok": True}
    assert [i["id"] for i in w.api.get_queue()["items"]] == [
        picked[0],
        picked[2],
        picked[1],
        picked[3],
    ]
    assert w.api.queue_move(picked[0], -1)["ok"] is False

    def cancel_me(ydl):
        assert w.api.queue_cancel(picked[2]) == {"ok": True}
        ydl.opts["progress_hooks"][0]({"status": "downloading", "downloaded_bytes": 1})

    FakeYDL.behaviour[picked[2]] = cancel_me
    assert w.api.queue_cancel(picked[3]) == {"ok": True}  # waiting entry: removed directly
    w.api._queue.run_pending()
    assert FakeYDL.downloads == [picked[0], picked[2], picked[1]]
    assert w.db.get_video(picked[2])["status"] == "new"
    assert w.db.get_video(picked[3])["status"] == "new"
    assert w.db.get_video(picked[1])["status"] == "done"


def test_pause_persists_and_blocks(world):
    w = world
    _res, picked = search_and_pick(w)
    w.api.set_queue_paused(True)
    w.api.enqueue(picked[:1])
    w.api._queue.run_pending()
    assert FakeYDL.downloads == []
    assert w.db.get_state("queue_paused") == "1"
    assert w.api.get_queue()["paused"] is True
    w.api.set_queue_paused(False)
    w.api._queue.run_pending()
    assert FakeYDL.downloads == picked[:1]


def test_restart_required_after_update_blocks_queue_and_search(world):
    w = world
    _res, picked = search_and_pick(w)
    assert "yt_dlp" in sys.modules
    w.api._update_runner = lambda on_line=None: {
        "ok": True,
        "ytdlp": "2099.1.1",
        "plugin": "9",
        "changed": True,
        "output": "",
    }
    res = w.api.update_ytdlp()
    assert res["ok"] and res["restart_required"] is True
    w.api.enqueue(picked[:1])
    w.api._queue.run_pending()
    assert FakeYDL.downloads == []
    q = w.api.get_queue()
    assert q["blocked_code"] == "restart" and q["blocked_reason"].startswith("Neustart nötig")
    assert w.api.search("x")["error"].startswith("Neustart nötig")


def test_search_limit_message_with_reopening_time(world):
    w = world
    set_throttle(w.api, max_searches_per_hour=1)
    assert w.api.search("hardcore")["ok"]
    res = w.api.search("gabber", {"genre": None, "year": 2026})
    assert res["ok"] is False
    reopen = (w.time.now + timedelta(hours=1)).astimezone()
    assert res["error"] == (
        f"Limit «Suchen pro Stunde» erreicht (1/1) – wieder möglich ab {reopen:%H:%M}"
    )


def test_search_year_option_sets_filter_reason(world):
    w = world
    res = w.api.search("hardcore", {"genre": None, "year": 2024})
    assert res["ok"] and res["effective_query"] == "hardcore 2024" and res["year"] == 2024
    by_id = {v["id"]: v for v in res["results"]}
    # approximate date 2026-09 vs. year 2024: outside even with the +-1 tolerance
    assert by_id["gbMegamix06"]["filter_reason"] == "Ausserhalb des Zeitraums"
