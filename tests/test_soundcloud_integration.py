"""Phase 7a end-to-end: SoundCloud search -> filter -> queue -> download -> tagging -> path with
[sc-…] -> DB done, and a SoundCloud 429 that blocks only SoundCloud.

Real `Api`, `DownloadQueue`, `YtClient`, `Throttle` (per platform), tagging and paths; only
`yt_dlp.YoutubeDL` is replaced by a fake that returns SoundCloud-shaped info dicts (the shape of
yt-dlp's SoundCloud extractor plus `sc_policy` from `ytclient._sc_flat_extractors`) and writes a
short audio file made by ffmpeg. Clock and sleep of the throttle are injected.
"""

from __future__ import annotations

import shutil
import subprocess
import types
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
import yt_dlp

from app.api import Api
from app.core import config, sidecar, ytclient
from app.core.db import Database
from app.core.throttle import Throttle
from app.worker import EventBus

pytestmark = [
    pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg fehlt"),
    pytest.mark.usefixtures("german_messages"),  # pre-v0.2.0 tests pin the German texts
]


class FakeTime:
    def __init__(self):
        self.now = datetime(2026, 11, 17, 11, 0, tzinfo=UTC)

    def clock(self):
        return self.now

    def sleep(self, seconds):
        self.now += timedelta(seconds=seconds)


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


def sc_info(tid, title, duration, *, policy="ALLOW", user="DJ Thera", user_id="77"):
    slug = user.lower().replace(" ", "-")
    return {
        "id": str(tid),
        "title": title,
        "duration": float(duration),
        "uploader": user,
        "uploader_id": user_id,
        "uploader_url": f"https://soundcloud.com/{slug}",
        "timestamp": 1790000000,  # 2026-09-21, exact for SoundCloud
        "webpage_url": f"https://soundcloud.com/{slug}/mix-{tid}",
        "url": f"https://api.soundcloud.com/tracks/{tid}",
        "view_count": 100,
        "thumbnails": [
            {"id": "t500x500", "url": f"https://i1.sndcdn.com/artworks-{tid}-t500x500.jpg"}
        ],
        "sc_policy": policy,
        "ie_key": "Soundcloud",
        "_type": "url",
    }


SC_SEARCH = [
    sc_info(111111111, "DJ Thera Hardstyle Mix 2026", 3600),
    sc_info(222222222, "Uptempo Terror Liveset", 4000, user="Partyraiser", user_id="88"),
    sc_info(333333333, "Hardcore Mix (Go+ Preview)", 30, policy="SNIP"),
    sc_info(444444444, "Hardcore Mix Tutorial", 3000),
]
YT_SEARCH = [
    {
        "id": "ytTheraMix1",
        "title": "DJ Thera - Hardstyle Mix 2026",
        "duration": 3602,
        "channel": "DJ Thera",
        "channel_id": "UCthera",
        "url": "https://www.youtube.com/watch?v=ytTheraMix1",
        "timestamp": 1790000000,
    },
    {
        "id": "ytOtherMix2",
        "title": "Gabber Megamix 2026",
        "duration": 3605,
        "channel": "Gabber",
        "channel_id": "UCgab",
        "url": "https://www.youtube.com/watch?v=ytOtherMix2",
    },
]


class FakeYDL:
    instances: list = []
    downloads: list[str] = []
    searches: list[str] = []
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

    def extract_info(self, url, download=True, process=True):
        assert not download
        if not process:  # extraction part of a download
            if url.startswith("https://api.soundcloud.com/tracks/"):
                tid = url.rsplit("/", 1)[1]
                FakeYDL.downloads.append(f"sc:{tid}")
                fmt = "hls_mp3_128_preview" if tid == "555555555" else "hls_aac_160k"
                return {"id": tid, "formats": [{"format_id": fmt}]}
            vid = url.rsplit("=", 1)[1]
            FakeYDL.downloads.append(vid)
            return {"_type": "video", "id": vid}
        FakeYDL.searches.append(url)
        if url.startswith("scsearch"):
            return {"_type": "playlist", "entries": [dict(e) for e in SC_SEARCH]}
        assert url.startswith("ytsearch")
        return {"_type": "playlist", "entries": [dict(e) for e in YT_SEARCH]}

    def process_ie_result(self, ie_result, download=True):
        assert download
        rid = ie_result["id"]
        sc = not str(rid).startswith("yt")
        action = FakeYDL.behaviour.get(f"sc:{rid}" if sc else rid)
        if isinstance(action, BaseException):
            raise action
        for hook in self.opts.get("progress_hooks", []):
            hook({"status": "downloading", "downloaded_bytes": 1, "total_bytes": 2})
        tmp = Path(self.opts["paths"]["home"])
        tmp.mkdir(parents=True, exist_ok=True)
        convert = bool(self.opts.get("postprocessors"))
        ext = "mp3" if convert or not sc else "m4a"
        out = tmp / (self.opts["outtmpl"]["default"] % {"id": rid, "ext": ext})
        codec = ["-q:a", "9"] if ext == "mp3" else ["-c:a", "aac", "-b:a", "32k"]
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono"]
            + ["-t", "1", *codec, str(out)],
            check=True,
        )
        if sc:
            info = next(e for e in SC_SEARCH if e["id"] == str(rid))
            info = {**info, "description": "", "_type": None}
        else:
            info = next(e for e in YT_SEARCH if e["id"] == rid)
            info = {**info, "upload_date": "20261003", "webpage_url": info["url"]}
        return {**info, "requested_downloads": [{"filepath": str(out)}]}


@pytest.fixture
def world(tmp_path, monkeypatch):
    FakeYDL.instances, FakeYDL.downloads, FakeYDL.searches = [], [], []
    FakeYDL.behaviour = {}
    monkeypatch.setattr(ytclient.yt_dlp, "YoutubeDL", FakeYDL)
    settings = config.defaults()
    settings.storage.target_dir = str(tmp_path / "music")
    settings.network.po_token_mode = "off"
    config.save(settings, config.config_path())
    db = Database(tmp_path / "hc.db")
    ft = FakeTime()
    holder: dict = {}
    throttle = Throttle(
        db,
        lambda: holder["api"]._cfg.throttle,
        clock=ft.clock,
        sleep=ft.sleep,
        uniform=lambda low, high: low,
        platform_settings={"soundcloud": lambda: holder["api"]._cfg.soundcloud},
    )
    events: list[tuple[str, dict]] = []
    bus = EventBus()
    bus.subscribe(lambda t, d: events.append((t, d)))

    class Lock:
        def release(self):
            pass

    browsed: list[str] = []
    api = Api(
        db=db,
        bus=bus,
        throttle=throttle,
        watchdog=FakeWatchdog(),
        run_lock=Lock,
        browser=browsed.append,
        configure_logging=False,
        queue_options={"idle_interval": 60.0},
    )
    holder["api"] = api
    w = types.SimpleNamespace(
        api=api, db=db, throttle=throttle, time=ft, events=events, browsed=browsed
    )
    yield w
    api.shutdown()
    db.close()


def test_soundcloud_search_filter_queue_download_tag_done(world):
    w = world
    res = w.api.search("hardstyle", {"platform": "soundcloud", "genre": None})
    assert res["ok"], res
    assert res["platform"] == "soundcloud"
    assert FakeYDL.searches == ["scsearch30:hardstyle"]
    by_id = {v["id"]: v for v in res["results"]}
    assert set(by_id) == {"sc:111111111", "sc:222222222", "sc:333333333", "sc:444444444"}
    assert all(v["platform"] == "soundcloud" for v in res["results"])
    assert by_id["sc:333333333"]["filter_reason"] == "Nur Vorschau (Go+)"
    assert by_id["sc:333333333"]["preview"] is True
    assert by_id["sc:444444444"]["filter_reason"] == "Exclude-Keyword: tutorial"
    first = by_id["sc:111111111"]
    assert first["filter_reason"] == "" and first["date_approx"] is False
    assert first["channel_id"] == "sc:77" and first["url"].startswith("https://soundcloud.com/")
    assert first["genre"] == "Hardstyle" and first["duplicate_of"] is None
    assert w.api.get_last_search()["platform"] == "soundcloud"

    picked = [v["id"] for v in res["results"] if not v["filter_reason"]]
    assert picked == ["sc:111111111", "sc:222222222"]
    assert w.api.enqueue(picked)["ids"] == picked
    w.api._queue.start()
    assert w.api._queue.wait_idle(60)

    for vid in picked:
        row = w.db.get_video(vid)
        assert row["status"] == "done", row
        assert row["platform"] == "soundcloud"
    f = Path(w.db.get_video("sc:111111111")["file_path"])
    assert f.is_file() and f.suffix == ".m4a"  # keep_original_soundcloud: no MP3 320
    assert f.parts[-4:-1] == ("Hardstyle", "DJ Thera", "2026")
    assert f.name == "2026-09-21 - DJ Thera Hardstyle Mix 2026 [sc-111111111].m4a"
    from mutagen.mp4 import MP4

    tags = MP4(f).tags
    assert bytes(tags["----:com.apple.iTunes:SOUNDCLOUD_ID"][0]) == b"111111111"
    assert bytes(tags["----:com.apple.iTunes:SOURCE"][0]) == b"SoundCloud"
    assert "----:com.apple.iTunes:YOUTUBE_ID" not in tags
    assert tags["\xa9cmt"] == ["https://soundcloud.com/dj-thera/mix-111111111"]
    archive = config.archive_path().read_text(encoding="utf-8").splitlines()
    assert archive == ["soundcloud 111111111", "soundcloud 222222222"]
    assert sidecar.read("sc:111111111")["source"] == "SoundCloud"
    assert not list((f.parents[3] / ".tmp").glob("sc-*"))  # temp files cleaned up
    assert FakeYDL.downloads == picked
    dl_opts = [i.opts for i in FakeYDL.instances if "progress_hooks" in i.opts]
    assert all("js_runtimes" not in o and "postprocessors" not in o for o in dl_opts)

    lib = w.api.get_library()
    assert {i["platform"] for i in lib} == {"soundcloud"}
    status = w.api.get_status()
    sc_st, yt_st = status["platforms"]["soundcloud"], status["platforms"]["youtube"]
    assert sc_st["counters"]["searches_hour"] == 1 and yt_st["counters"]["searches_hour"] == 0
    assert sc_st["counters"]["downloads_day"] == 2 and yt_st["counters"]["downloads_day"] == 0
    assert status["counters"]["downloads_day"] == 0  # top level stays YouTube
    assert sc_st["enabled"] is True and sc_st["limits"]["searches_hour"] == 20

    # a second download is skipped (archive / DB done)
    assert ytclient.YtClient(lambda: w.api._cfg, w.db, w.throttle).download("sc:111111111").skipped

    # open in the browser, add the uploader as watchlist source
    assert w.api.open_video("sc:111111111") == {"ok": True}
    assert w.browsed == ["https://soundcloud.com/dj-thera/mix-111111111"]
    src = w.api.add_channel_source("sc:77", "DJ Thera")
    assert src["ok"] and src["source"]["url_or_query"] == "https://soundcloud.com/dj-thera"
    assert src["source"]["platform"] == "soundcloud" and src["source"]["name_auto"] is False
    assert w.api.add_channel_source("sc:99999", "X")["ok"] is False

    # the same mix found on YouTube is marked as probably loaded already
    yres = w.api.search("thera", {"genre": None})
    dup = {v["id"]: v["duplicate_of"] for v in yres["results"]}
    assert dup["ytTheraMix1"] == {
        "id": "sc:111111111",
        "platform": "soundcloud",
        "title": "DJ Thera Hardstyle Mix 2026",
    }
    assert dup["ytOtherMix2"] is None
    assert {v["id"]: v["filter_reason"] for v in yres["results"]}["ytTheraMix1"] == ""
    data = w.api.get_settings()["values"]
    data["filters"]["hide_cross_platform_duplicates"] = True
    assert w.api.save_settings(data)["ok"]
    hidden = {v["id"]: v["filter_reason"] for v in w.api.get_last_search()["results"]}
    assert hidden["ytTheraMix1"] == "Vermutlich bereits geladen (SoundCloud)"


def test_soundcloud_429_blocks_only_soundcloud(world):
    w = world
    assert w.api.search("hardstyle", {"platform": "soundcloud"})["ok"]
    assert w.api.search("thera", {})["ok"]
    FakeYDL.behaviour["sc:111111111"] = yt_dlp.utils.DownloadError(
        "ERROR: [soundcloud] 111111111: HTTP Error 429: Too Many Requests"
    )
    order = ["sc:111111111", "ytTheraMix1", "sc:222222222", "ytOtherMix2"]
    assert w.api.enqueue(order)["ids"] == order
    w.api._queue.start()
    assert w.api._queue.wait_idle(60)

    assert w.db.get_video("sc:111111111")["status"] == "failed"
    assert w.db.get_video("ytTheraMix1")["status"] == "done"
    assert w.db.get_video("ytOtherMix2")["status"] == "done"
    assert w.db.get_video("sc:222222222")["status"] == "queued"  # waits for the SC backoff
    assert FakeYDL.downloads == ["sc:111111111", "ytTheraMix1", "ytOtherMix2"]
    sc_th = w.throttle.platform("soundcloud")
    assert sc_th.backoff_until() is not None and w.throttle.backoff_until() is None

    q = w.api.get_queue()
    assert q["blocked_code"] == "backoff" and q["blocked_reason"].startswith("SoundCloud: Backoff")
    st = w.api.get_status()
    assert st["backoff"]["active"] is False  # YouTube (status bar compatibility)
    assert st["platforms"]["soundcloud"]["backoff"]["active"] is True
    assert "429" in st["platforms"]["soundcloud"]["backoff"]["reason"]

    # searches: SoundCloud refused, YouTube works
    res = w.api.search("x", {"platform": "soundcloud"})
    assert res["ok"] is False and "Backoff (SoundCloud)" in res["error"]
    assert w.api.search("thera", {})["ok"] is True

    # lifting only the SoundCloud backoff lets the rest run
    assert w.api.clear_backoff("soundcloud") == {"ok": True}
    assert w.api.clear_backoff("vimeo")["ok"] is False
    assert w.api._queue.wait_idle(60)
    assert w.db.get_video("sc:222222222")["status"] == "done"


def test_partial_block_is_reported_per_platform(world):
    w = world
    assert w.api.search("hardstyle", {"platform": "soundcloud"})["ok"]
    assert w.api.search("thera", {})["ok"]
    w.throttle.platform("soundcloud").trigger_backoff("HTTP Error 429")
    w.api._queue.set_paused(True)
    w.api.enqueue(["sc:111111111", "ytTheraMix1"])
    q = w.api.get_queue()
    assert q["blocked_code"] is None
    assert q["platform_blocked"]["soundcloud"]["code"] == "backoff"
    assert "youtube" not in q["platform_blocked"]


def test_soundcloud_preview_download_refused_and_disabled(world):
    w = world
    w.db.upsert_video({"id": "sc:555555555", "title": "Hardcore Mix", "duration": 3600})
    client = ytclient.YtClient(lambda: w.api._cfg, w.db, w.throttle)
    res = client.download("sc:555555555")
    assert res.status == "failed" and res.error.startswith("Nur Vorschau (Go+)")
    row = w.db.get_video("sc:555555555")
    assert row["preview"] == 1 and row["status"] == "failed"
    data = w.api.get_settings()["values"]
    data["soundcloud"]["enabled"] = False
    assert w.api.save_settings(data)["ok"]
    assert "ausgeschaltet" in w.api.search("x", {"platform": "soundcloud"})["error"]
    assert w.api.search("x", {"platform": "vimeo"})["ok"] is False
    w.db.upsert_video({"id": "sc:666666666", "title": "Hardcore Mix", "duration": 3600})
    assert "ausgeschaltet" in client.download("sc:666666666").error
    assert w.api.get_status()["platforms"]["soundcloud"]["enabled"] is False


def test_api_suggest_and_save_source_with_name_auto(world):
    w = world
    sug = w.api.suggest_source("https://soundcloud.com/dj-thera/tracks")
    assert sug == {
        "type": "channel",
        "platform": "soundcloud",
        "name": "Dj Thera",
        "url_normalized": "https://soundcloud.com/dj-thera",
    }
    res = w.api.save_source(
        {
            "type": sug["type"],
            "name": sug["name"],
            "url_or_query": sug["url_normalized"],
            "name_auto": True,
        }
    )
    assert res["ok"], res
    src = res["source"]
    assert src["platform"] == "soundcloud" and src["name_auto"] is True
    res = w.api.save_source({**src, "name": "Thera (SC)", "name_auto": False})
    assert res["ok"] and res["source"]["name_auto"] is False
    res = w.api.save_source(
        {"type": "search", "name": "uptempo", "url_or_query": "uptempo", "platform": "soundcloud"}
    )
    assert res["ok"] and res["source"]["platform"] == "soundcloud"


# --------------------------------------------------------------------------- Review 7a/8


SC_403 = (
    "ERROR: [soundcloud] {tid}: Unable to download JSON metadata: HTTP Error 403: Forbidden "
    "(caused by <HTTPError 403: Forbidden>)"
)


def test_soundcloud_403_after_refresh_is_bot_check(world):
    """Review M3: a SoundCloud API 403 (after yt-dlp's own client_id refresh) starts the
    SoundCloud backoff; no second SoundCloud download, YouTube goes on."""
    w = world
    assert w.api.search("hardstyle", {"platform": "soundcloud"})["ok"]
    assert w.api.search("thera", {})["ok"]
    FakeYDL.behaviour["sc:111111111"] = yt_dlp.utils.DownloadError(SC_403.format(tid=111111111))
    order = ["sc:111111111", "sc:222222222", "ytTheraMix1"]
    assert w.api.enqueue(order)["ids"] == order
    w.api._queue.start()
    assert w.api._queue.wait_idle(60)

    assert FakeYDL.downloads == ["sc:111111111", "ytTheraMix1"]  # no second SC attempt
    assert w.db.get_video("sc:111111111")["status"] == "failed"
    assert w.db.get_video("sc:222222222")["status"] == "queued"
    assert w.db.get_video("ytTheraMix1")["status"] == "done"
    sc_th = w.throttle.platform("soundcloud")
    assert sc_th.backoff_until() is not None and w.throttle.backoff_until() is None
    assert "403" in w.api.get_status()["platforms"]["soundcloud"]["backoff"]["reason"]
    res = w.api.search("x", {"platform": "soundcloud"})
    assert res["ok"] is False and "Backoff (SoundCloud)" in res["error"]


def test_soundcloud_404_or_cdn_403_is_no_backoff(world):
    """Review M3: «track deleted/private» (404) and a 403 of the media CDN (no extractor
    prefix, e.g. an expired signed URL) fail only this entry."""
    w = world
    assert w.api.search("hardstyle", {"platform": "soundcloud"})["ok"]
    FakeYDL.behaviour["sc:111111111"] = yt_dlp.utils.DownloadError(
        "ERROR: [soundcloud] 111111111: Unable to download JSON metadata: HTTP Error 404: Not Found"
    )
    FakeYDL.behaviour["sc:222222222"] = yt_dlp.utils.DownloadError(
        "ERROR: unable to download video data: HTTP Error 403: Forbidden"
    )
    order = ["sc:111111111", "sc:222222222"]
    w.api.enqueue(order)
    w.api._queue.start()
    assert w.api._queue.wait_idle(60)
    assert FakeYDL.downloads == order
    assert all(w.db.get_video(v)["status"] == "failed" for v in order)
    assert w.throttle.platform("soundcloud").backoff_until() is None


def test_soundcloud_403_in_watchlist_stops_soundcloud_sources(world, monkeypatch):
    """Review M3: the watchlist skips the remaining SoundCloud sources after a 403."""
    from app.core import watchlist

    w = world
    w.db.add_source("channel", "SC1", "https://soundcloud.com/a", platform="soundcloud")
    w.db.add_source("channel", "SC2", "https://soundcloud.com/b", platform="soundcloud")
    listed: list[str] = []

    def extract_info(self, url, download=True, process=True):
        listed.append(url)
        raise yt_dlp.utils.DownloadError(
            "ERROR: [soundcloud:user] a: Unable to download JSON metadata: HTTP Error 403: "
            "Forbidden"
        )

    monkeypatch.setattr(FakeYDL, "extract_info", extract_info)
    client = ytclient.YtClient(lambda: w.api._cfg, w.db, w.throttle)
    res = watchlist.check_all(client=client, db=w.db, throttle=w.throttle, settings=w.api._cfg)
    assert listed == ["https://soundcloud.com/a/tracks"]
    assert res.backoff and w.throttle.platform("soundcloud").backoff_until() is not None
    assert w.throttle.backoff_until() is None


def test_soundcloud_geo_blocked_hit_is_filtered_not_fatal(world, monkeypatch):
    """Review M1: a geo-blocked track (policy BLOCK) is a normal hit with a filter reason."""
    w = world
    blocked = sc_info(777777777, "Hardcore Mix Label Upload", 3600, policy="BLOCK")
    monkeypatch.setattr(
        FakeYDL,
        "extract_info",
        lambda self, url, download=True, process=True: {
            "_type": "playlist",
            "entries": [dict(blocked), dict(SC_SEARCH[0])],
        },
    )
    res = w.api.search("hardcore", {"platform": "soundcloud"})
    assert res["ok"], res
    by_id = {v["id"]: v for v in res["results"]}
    assert by_id["sc:777777777"]["geo_blocked"] is True
    assert by_id["sc:777777777"]["filter_reason"] == "Nicht verfügbar (Region)"
    ok = by_id["sc:111111111"]
    assert ok["filter_reason"] == "" and ok["geo_blocked"] is False
    assert w.db.get_video("sc:777777777")["geo_blocked"] == 1
