"""End-to-end (Phase 4): headless watchlist run with the real YtClient, Throttle, DownloadQueue,
paths and tagging; only `yt_dlp.YoutubeDL` is replaced and the throttle clock/sleep are injected.

Two sources (channel with 6 entries of which 2 are known, playlist), auto-download on the channel
with max_downloads_per_run=2, second run, simulated 429 and the exit codes.
"""

from __future__ import annotations

import shutil
import subprocess
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

from app import headless
from app.core import config, locks, ytclient
from app.core.db import Database
from app.core.throttle import Throttle
from app.exitcodes import EXIT_BLOCKED, EXIT_BUSY, EXIT_FAILED, EXIT_OK

pytestmark = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg fehlt")

CHANNEL_URL = "https://www.youtube.com/@DJTest"
PLAYLIST_URL = "https://www.youtube.com/playlist?list=PLtest123"


def entry(vid, title, duration=3600, channel_id="UCtest"):
    return {
        "id": vid,
        "title": title,
        "duration": duration,
        "channel": "DJ Test",
        "channel_id": channel_id,
        "url": f"https://www.youtube.com/watch?v={vid}",
        "live_status": "not_live",
        "view_count": 10,
    }


# newest first: three new, a known one, an unknown one BEHIND it (must not be stored), a known one
CHANNEL = [
    entry("newAAAAAAA1", "Hardcore Mix One"),
    entry("newAAAAAAA2", "Hardcore Mix Two"),
    entry("newAAAAAAA3", "Hardcore Mix Three"),
    entry("knownAAAAA1", "Hardcore Mix Old One"),
    entry("behindAAAA1", "Hardcore Mix Behind"),
    entry("knownAAAAA2", "Hardcore Mix Old Two"),
]
PLAYLIST = [
    entry("plAAAAAAAA1", "Uptempo Set One"),
    entry("plAAAAAAAA2", "Uptempo Set Two"),
    entry("plShortAAA3", "Uptempo Set Short", duration=120),
]
ALL = {e["id"]: e for e in CHANNEL + PLAYLIST}


class FakeTime:
    def __init__(self):
        self.now = datetime(2026, 11, 16, 11, 0, tzinfo=UTC)

    def clock(self):
        return self.now

    def sleep(self, seconds):
        self.now += timedelta(seconds=seconds)


class FakeYDL:
    instances: list = []
    list_urls: list = []
    downloads: list = []
    error: str | None = None  # raised by every list request

    def __init__(self, opts):
        self.opts = opts
        FakeYDL.instances.append(self)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def sanitize_info(self, info):
        return info

    def extract_info(self, url, download=True, process=True):
        assert not download
        if not process:
            vid = url.rsplit("=", 1)[1]
            FakeYDL.downloads.append(vid)
            return {"_type": "video", "id": vid}
        FakeYDL.list_urls.append((url, self.opts.get("playlistend")))
        if FakeYDL.error:
            raise RuntimeError(FakeYDL.error)
        entries = CHANNEL if "@DJTest" in url else PLAYLIST
        return {
            "_type": "playlist",
            "entries": [dict(e) for e in entries[: self.opts["playlistend"]]],
        }

    def process_ie_result(self, ie_result, download=True):
        vid = ie_result["id"]
        tmp = Path(self.opts["paths"]["home"])
        tmp.mkdir(parents=True, exist_ok=True)
        mp3 = tmp / f"{vid}.mp3"
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"]
            + ["-t", "1", "-q:a", "9", str(mp3)],
            check=True,
        )
        return {
            **ALL[vid],
            "upload_date": "20261003",
            "webpage_url": ALL[vid]["url"],
            "description": "",
            "requested_downloads": [{"filepath": str(mp3)}],
        }


@pytest.fixture
def world(tmp_path, monkeypatch):
    FakeYDL.instances, FakeYDL.list_urls, FakeYDL.downloads, FakeYDL.error = [], [], [], None
    monkeypatch.setattr(ytclient.yt_dlp, "YoutubeDL", FakeYDL)
    settings = config.defaults()
    settings.storage.target_dir = str(tmp_path / "music")
    settings.network.po_token_mode = "off"
    settings.throttle.max_downloads_per_run = 2
    db = Database(tmp_path / "hc.db")
    for vid in ("knownAAAAA1", "knownAAAAA2"):  # seen in an earlier check
        db.upsert_video({"id": vid, "title": vid, "status": "done"})
    ch = db.add_source(
        "channel",
        "DJ Test",
        CHANNEL_URL,
        default_genre="Hardcore",
        auto_download=True,
        max_entries=30,
    )
    pl = db.add_source("playlist", "Sets", PLAYLIST_URL, max_entries=30)
    ft = FakeTime()
    throttle = Throttle(
        db, lambda: settings.throttle, clock=ft.clock, sleep=ft.sleep, uniform=lambda a, b: a
    )

    def run(**kw):
        return headless.run_watchlist(
            settings=settings, db=db, throttle=throttle, configure_logging=False, **kw
        )

    class W:
        pass

    w = W()
    w.settings, w.db, w.throttle, w.run, w.ch, w.pl, w.time = (
        settings,
        db,
        throttle,
        run,
        ch,
        pl,
        ft,
    )
    yield w
    db.close()


def status(db, vid):
    row = db.get_video(vid)
    return row["status"] if row else None


def test_two_runs_incremental_limit_and_run_entries(world):
    w = world
    assert w.run() == EXIT_OK

    # channel: walked up to the first known video only, the unknown one behind it is untouched
    assert FakeYDL.list_urls[0] == (CHANNEL_URL + "/videos", 30)  # root -> Videos tab
    assert status(w.db, "behindAAAA1") is None
    assert status(w.db, "knownAAAAA1") == "done"
    # auto-download source: loaded sequentially, max_downloads_per_run=2 -> exactly 2, rest queued
    assert FakeYDL.downloads == ["newAAAAAAA1", "newAAAAAAA2"]
    assert [status(w.db, f"newAAAAAAA{i}") for i in (1, 2, 3)] == ["done", "done", "queued"]
    done = Path(w.db.get_video("newAAAAAAA1")["file_path"])
    assert done.is_file() and done.parts[-4] == "Hardcore"  # source default genre
    # playlist (inbox source): passing -> inbox, too short -> stays 'new' (not in the inbox)
    assert [status(w.db, v) for v in ("plAAAAAAAA1", "plAAAAAAAA2", "plShortAAA3")] == [
        "inbox",
        "inbox",
        "new",
    ]
    assert {v["id"] for v in w.db.list_videos(status="inbox")} == {"plAAAAAAAA1", "plAAAAAAAA2"}
    assert w.db.get_source(w.ch)["last_checked"] and w.db.get_source(w.pl)["last_checked"]

    runs = w.db.list_runs()
    assert len(runs) == 1  # one entry for the whole headless run
    r = runs[0]
    assert (r["kind"], r["found"], r["downloaded"], r["errors"]) == ("headless", 6, 2, 0)
    assert r["finished"] and "Limit pro Lauf" in r["note"]

    # second run: nothing new (both sources stop at the first known video), loads the rest
    FakeYDL.list_urls.clear()
    assert w.run() == EXIT_OK
    assert len(FakeYDL.list_urls) == 2
    r2 = w.db.list_runs()[0]
    assert (r2["kind"], r2["found"], r2["downloaded"], r2["errors"]) == ("headless", 0, 1, 0)
    assert status(w.db, "newAAAAAAA3") == "done"
    assert w.db.get_state("watchlist_last_run")


def test_simulated_429_sets_backoff_aborts_and_notes(world):
    w = world
    FakeYDL.error = "ERROR: HTTP Error 429: Too Many Requests"
    assert w.run() == EXIT_BLOCKED
    assert w.throttle.backoff_until() is not None
    assert len(FakeYDL.list_urls) == 1  # the second source is not even tried
    r = w.db.list_runs()[0]
    assert r["note"].startswith("Backoff") and r["errors"] == 1 and r["downloaded"] == 0
    assert w.db.get_state("watchlist_last_run") is None  # retried after the backoff

    # next start while the backoff lasts: no request at all, exit 2, visible run entry
    FakeYDL.list_urls.clear()
    FakeYDL.instances.clear()
    assert w.run() == EXIT_BLOCKED
    assert FakeYDL.instances == []
    assert w.db.list_runs()[0]["note"].startswith("Backoff aktiv bis")


def test_source_error_is_exit_1_and_other_sources_continue(world):
    w = world
    FakeYDL.error = "Unable to download webpage: boom"
    assert w.run() == EXIT_FAILED
    assert len(FakeYDL.list_urls) == 2  # both tried, no backoff for a normal error
    assert w.throttle.backoff_until() is None
    r = w.db.list_runs()[0]
    assert r["errors"] == 2 and "Fehler" in r["note"]


def test_busy_locks_give_exit_4(world, monkeypatch):
    w = world
    run_lock = locks.acquire_run_lock()
    try:
        assert w.run() == EXIT_BUSY
    finally:
        run_lock.release()
    wl_lock = locks.acquire_watchlist_lock()
    try:
        assert w.run() == EXIT_BUSY
        assert locks.acquire_run_lock() is not None  # released again after the refusal
    finally:
        wl_lock.release()
    assert w.db.list_runs() == [] and FakeYDL.instances == []
