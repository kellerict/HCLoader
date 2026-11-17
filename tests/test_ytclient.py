import shutil
import subprocess
import threading
from pathlib import Path

import pytest
import yt_dlp
from mutagen.id3 import ID3

from app.core import binaries, config, ytclient
from app.core.config import Settings
from app.core.throttle import BackoffActive, LimitReached, Throttle
from app.core.ytclient import DownloadCancelled, YtClient, YtClientError, build_ydl_opts

# pre-v0.2.0 behaviour tests assert the German texts (pins the de catalog)
pytestmark = pytest.mark.usefixtures("german_messages")

needs_ffmpeg = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg fehlt")
VID = "abc123XYZ_-"


@pytest.fixture(autouse=True)
def _env(monkeypatch, tmp_path):
    monkeypatch.setenv("TOKEN_TTL", "x")  # restored after the test
    monkeypatch.setenv("HCLOADER_BIN_DIR", str(tmp_path / "bin"))


@pytest.fixture
def settings(tmp_path):
    s = Settings()
    s.storage.target_dir = str(tmp_path / "music")
    s.throttle.sleep_requests = 0
    s.network.po_token_mode = "off"
    return s


@pytest.fixture
def throttle(db, settings):
    return Throttle(db, lambda: settings.throttle, sleep=lambda s: None)


@pytest.fixture
def client(settings, db, throttle):
    return YtClient(lambda: settings, db, throttle)


# ------------------------------------------------------------------ build_ydl_opts


def test_opts_search_and_list_are_flat(settings):
    for purpose in ("search", "list"):
        o = build_ydl_opts(settings, purpose)
        assert o["extract_flat"] == "in_playlist"
        assert o["skip_download"] is True
        assert o["sleep_interval_requests"] == settings.throttle.sleep_requests
        assert "sleep_interval" not in o and "max_sleep_interval" not in o
        assert "download_archive" not in o and "postprocessors" not in o
        assert o["retries"] <= 1 and o["fragment_retries"] <= 1 and o["extractor_retries"] <= 1
        assert not o.get("remote_components")
        assert "deno" in o["js_runtimes"]


def test_opts_resolve(settings):
    o = build_ydl_opts(settings, "resolve")
    assert o["skip_download"] is True and o["noplaylist"] is True
    assert "extract_flat" not in o


@pytest.mark.parametrize("purpose", ["search", "list", "resolve", "download"])
@pytest.mark.parametrize("platform", ["youtube", "soundcloud"])
def test_opts_cachedir_in_app_home(settings, purpose, platform):
    o = build_ydl_opts(settings, purpose, platform)
    assert Path(o["cachedir"]) == config.app_home() / "cache" / "yt-dlp"


def test_resolve_soundcloud_permalink_uses_url_and_returns_sc_id(client, monkeypatch):
    seen = {}

    def fake(kind, url, opts, settings, **kw):
        seen.update(kind=kind, url=url, platform=kw["platform"])
        return {"id": 123, "title": "T", "uploader": "U", "uploader_id": 5, "duration": 60.0}

    monkeypatch.setattr(client, "_metadata_call", fake)
    out = client.resolve("https://soundcloud.com/user/track?si=abc")
    assert seen == {
        "kind": "resolve",
        "url": "https://soundcloud.com/user/track",
        "platform": "soundcloud",
    }
    assert out["id"] == "sc:123" and out["platform"] == "soundcloud"


def test_opts_unknown_purpose(settings):
    with pytest.raises(ValueError):
        build_ydl_opts(settings, "bogus")


def test_opts_download_mp3_320(settings, tmp_path):
    o = build_ydl_opts(settings, "download")
    tmp = Path(settings.storage.target_dir) / ".tmp"
    assert o["format"] == "bestaudio/best" and o["noplaylist"] is True
    assert o["paths"] == {"home": str(tmp), "temp": str(tmp)}
    assert o["outtmpl"]["default"] == "%(id)s.%(ext)s"
    assert "download_archive" not in o  # written by HCLoader after `done` (M2)
    assert o["playlist_items"] == "1" and "max_downloads" not in o
    assert o["ratelimit"] == 3 * 1024 * 1024
    assert o["writethumbnail"] is True
    assert o["postprocessors"] == [
        {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "320"}
    ]
    assert "extract_flat" not in o


def test_opts_download_variants(settings):
    settings.download.mp3_quality = "v0"
    settings.throttle.limit_rate_mb = 0
    settings.download.embed_cover = False
    o = build_ydl_opts(settings, "download")
    assert o["postprocessors"][0]["preferredquality"] == "0"
    assert o["ratelimit"] is None and o["writethumbnail"] is False
    settings.download.audio_format = "original"
    assert "postprocessors" not in build_ydl_opts(settings, "download")


def test_opts_hooks_and_logger(settings):
    hook = lambda d: None  # noqa: E731
    lg = object()
    o = build_ydl_opts(settings, "download", progress_hook=hook, postprocessor_hook=hook, logger=lg)
    assert o["progress_hooks"] == [hook] and o["postprocessor_hooks"] == [hook]
    assert o["logger"] is lg


def test_opts_ffmpeg_and_deno_locations(settings, tmp_path):
    bindir = tmp_path / "bin"
    bindir.mkdir()
    for name in ("ffmpeg", "deno"):
        (bindir / name).write_text("x")
        (bindir / f"{name}.exe").write_text("x")
    o = build_ydl_opts(settings, "download")
    assert Path(o["ffmpeg_location"]).parent == bindir
    assert Path(o["js_runtimes"]["deno"]["path"]).parent == bindir


def test_opts_po_token_modes(settings):
    settings.network.po_token_mode = "off"
    assert build_ydl_opts(settings, "resolve")["extractor_args"] == {
        "youtube": {"fetch_pot": ["never"]}
    }
    settings.network.po_token_mode = "script"
    args = build_ydl_opts(settings, "resolve")["extractor_args"]
    assert args == {
        "youtubepot-bgutilscript": {"server_home": [str(binaries.provider_server_dir())]}
    }
    settings.network.po_token_mode = "http"
    settings.network.po_token_port = 4500
    args = build_ydl_opts(settings, "resolve")["extractor_args"]
    assert args == {"youtubepot-bgutilhttp": {"base_url": ["http://127.0.0.1:4500"]}}


def test_opts_cookies_and_proxy(settings, caplog):
    assert "cookiesfrombrowser" not in build_ydl_opts(settings, "search")
    settings.network.cookies_from_browser = "firefox"
    settings.network.proxy = "http://127.0.0.1:8080"
    with caplog.at_level("WARNING"):
        o = build_ydl_opts(settings, "search")
    assert o["cookiesfrombrowser"] == ("firefox",)
    assert o["proxy"] == "http://127.0.0.1:8080"
    assert any("Cookies" in r.message for r in caplog.records)


def test_opts_accepted_by_real_ydl(settings, tmp_path):
    # Constructing the real YoutubeDL validates js_runtimes / extractor_args formats offline.
    for purpose in ("search", "download"):
        with yt_dlp.YoutubeDL(build_ydl_opts(settings, purpose)):
            pass


# ------------------------------------------------------------------ helpers


def test_extract_video_id():
    f = ytclient.extract_video_id
    assert f(VID) == VID
    assert f(f"https://www.youtube.com/watch?v={VID}&t=5") == VID
    assert f(f"https://youtu.be/{VID}") == VID
    assert f(f"https://www.youtube.com/shorts/{VID}") == VID
    assert f("https://example.com/") is None


def test_normalize_source_url():
    n = ytclient.normalize_source_url
    assert (
        n("https://www.youtube.com/@Partyraiser") == "https://www.youtube.com/@Partyraiser/videos"
    )
    assert (
        n("https://www.youtube.com/channel/UC123/")
        == "https://www.youtube.com/channel/UC123/videos"
    )
    assert (
        n("https://www.youtube.com/playlist?list=PL1")
        == "https://www.youtube.com/playlist?list=PL1"
    )


def test_normalize_progress():
    p = ytclient.normalize_progress(
        {"status": "downloading", "downloaded_bytes": 50, "total_bytes_estimate": 200, "speed": 9}
    )
    assert p["phase"] == "laden" and p["percent"] == 25.0 and p["speed"] == 9
    assert p["total_bytes"] == 200 and p["eta"] is None
    assert ytclient.normalize_progress({"status": "finished"})["percent"] == 100.0


# ------------------------------------------------------------------ fake YoutubeDL


class FakeYDL:
    """Replaces yt_dlp.YoutubeDL. Behaviour is controlled via class attributes."""

    instances: list = []
    info: dict = {}
    errors: list = []  # exceptions raised by successive download calls
    archive: Path | None = None
    make_files = True

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
        self.url = url
        if not process:  # extraction part of a download
            assert not download
            return {"_type": "video", **FakeYDL.info, "_fake_url": url}
        assert not download
        return FakeYDL.info

    def process_ie_result(self, ie_result, download=True):
        assert download and ie_result.get("_fake_url") == self.url
        if FakeYDL.errors:
            exc = FakeYDL.errors.pop(0)
            if exc:
                raise exc
        for hook in self.opts.get("progress_hooks", []):
            hook({"status": "downloading", "downloaded_bytes": 50, "total_bytes": 100})
        tmp = Path(self.opts["paths"]["home"])
        tmp.mkdir(parents=True, exist_ok=True)
        info = dict(FakeYDL.info)
        if FakeYDL.make_files:
            mp3 = tmp / f"{info['id']}.mp3"
            subprocess.run(
                ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"]
                + ["-t", "2", "-q:a", "9", str(mp3)],
                check=True,
            )
            subprocess.run(
                ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=blue:s=640x360"]
                + ["-frames:v", "1", str(tmp / f"{info['id']}.jpg")],
                check=True,
            )
            info["requested_downloads"] = [{"filepath": str(mp3)}]
        for hook in self.opts.get("postprocessor_hooks", []):
            hook({"status": "started", "postprocessor": "FFmpegExtractAudio"})
        for hook in self.opts.get("progress_hooks", []):
            hook({"status": "finished", "downloaded_bytes": 100, "total_bytes": 100})
        return info


@pytest.fixture
def fake(monkeypatch):
    FakeYDL.instances = []
    FakeYDL.errors = []
    FakeYDL.make_files = True
    FakeYDL.info = {
        "id": VID,
        "title": "Partyraiser @ Masters of Hardcore 2026 Liveset (Official Video)",
        "channel": "Partyraiser",
        "channel_id": "UC1",
        "duration": 7200,
        "upload_date": "20261003",
        "view_count": 1234,
        "thumbnail": "https://i.ytimg.com/x.jpg",
        "webpage_url": f"https://www.youtube.com/watch?v={VID}",
        "description": "00:00 Intro\n30:00 DJ B - Peak\n1:00:00 Closing",
    }
    monkeypatch.setattr(ytclient.yt_dlp, "YoutubeDL", FakeYDL)
    return FakeYDL


def _entry(i):
    return {
        "id": f"id{i:09d}",
        "title": f"Mix {i}",
        "duration": 3600 + i,
        "channel": "C",
        "channel_id": "UC1",
        "url": f"https://www.youtube.com/watch?v=id{i:09d}",
        "live_status": "not_live",
        "timestamp": 1790000000,
    }


# ------------------------------------------------------------------ search / list / resolve


def test_search_normalizes_and_throttles(client, fake, db):
    fake.info = {"entries": [_entry(1), _entry(2), None, {"title": "no id"}]}
    res = client.search("hardcore mix", 5)
    assert [r["id"] for r in res] == ["id000000001", "id000000002"]
    r = res[0]
    assert set(r) >= {
        "id",
        "title",
        "channel_id",
        "channel_name",
        "duration",
        "upload_date",
        "view_count",
        "thumbnail",
        "url",
        "live_status",
    }
    assert r["channel_name"] == "C" and r["upload_date"] == "20260921"
    assert fake.instances[0].url == "ytsearch5:hardcore mix"
    assert fake.instances[0].opts["extract_flat"] == "in_playlist"
    assert client.throttle.searches_last_hour() == 1


def test_search_blocked_by_backoff(client, fake):
    client.throttle.trigger_backoff("test")
    with pytest.raises(BackoffActive):
        client.search("x", 3)
    assert not fake.instances


def test_search_limit(client, fake, settings):
    settings.throttle.max_searches_per_hour = 1
    fake.info = {"entries": []}
    client.search("a", 1)
    with pytest.raises(LimitReached):
        client.search("b", 1)


def test_search_rate_limit_triggers_backoff(client, monkeypatch):
    class Boom(FakeYDL):
        def extract_info(self, url, download=True, process=True):
            raise yt_dlp.utils.DownloadError("ERROR: HTTP Error 429: Too Many Requests")

    monkeypatch.setattr(ytclient.yt_dlp, "YoutubeDL", Boom)
    with pytest.raises(ytclient.YtClientError) as ei:
        client.search("x", 3)
    assert ei.value.rate_limited
    assert client.throttle.backoff_until() is not None


def test_list_source(client, fake):
    fake.info = {"entries": [_entry(i) for i in range(5)]}
    res = client.list_source("https://www.youtube.com/@Chan", 3)
    assert len(res) == 3
    inst = fake.instances[0]
    assert inst.url == "https://www.youtube.com/@Chan/videos"
    assert inst.opts["playlistend"] == 3


class PagingYDL:
    """yt-dlp stand-in for `newest_last`: `extract_info(process=False)` returns the first page
    with a lazy entries generator; `pulled` counts the entries yt-dlp would have paged."""

    total = 8
    count: int | None = None  # playlist_count from the header (first page)
    pulled = 0
    instances: list = []

    def __init__(self, opts):
        self.opts = opts
        self.params = dict(opts)
        PagingYDL.instances.append(self)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def sanitize_info(self, info):
        return info

    def extract_info(self, url, download=True, process=True):
        assert not download and not process  # newest_last pages itself

        def gen():
            for i in range(1, PagingYDL.total + 1):
                PagingYDL.pulled += 1
                yield _entry(i)

        return {"_type": "playlist", "playlist_count": PagingYDL.count, "entries": gen()}


@pytest.fixture
def paging(monkeypatch):
    PagingYDL.total, PagingYDL.count, PagingYDL.pulled, PagingYDL.instances = 8, None, 0, []
    monkeypatch.setattr(ytclient.yt_dlp, "YoutubeDL", PagingYDL)
    return PagingYDL


@pytest.mark.parametrize(
    ("total", "n", "expected"), [(8, 3, [8, 7, 6]), (2, 3, [2, 1]), (5, 1, [5])]
)
def test_list_source_newest_last_returns_last_n_newest_first(client, paging, total, n, expected):
    paging.total = total
    res = client.list_source("https://www.youtube.com/playlist?list=PL1", n, newest_last=True)
    assert [r["id"] for r in res] == [f"id{i:09d}" for i in expected]
    opts = paging.instances[0].opts
    assert "playlist_items" not in opts and "playlistend" not in opts
    assert opts["lazy_playlist"] is True and opts["extract_flat"] == "in_playlist"
    assert opts["sleep_interval_requests"] == client.settings.throttle.sleep_requests


def test_list_source_plain_uses_playlistend(client, fake):
    fake.info = {"entries": [_entry(i) for i in (7, 6, 5, 4)]}
    client.list_source("https://www.youtube.com/playlist?list=PL1", 4)
    opts = fake.instances[0].opts
    assert opts["playlistend"] == 4 and "playlist_items" not in opts


def test_newest_last_refuses_long_playlist_from_header(client, paging):
    """m4: playlist_count of the first page > 2000 -> German error before any further page."""
    paging.count = 2500
    with pytest.raises(YtClientError, match=r"Playlist zu lang .*2500 Einträge, max\. 2000"):
        client.list_source("https://www.youtube.com/playlist?list=PL1", 5, newest_last=True)
    assert paging.pulled == 0


def test_newest_last_hard_limit_while_paging(client, paging):
    """No count in the header: paging stops after NEWEST_LAST_MAX + 1 entries."""
    paging.total = ytclient.NEWEST_LAST_MAX + 500
    with pytest.raises(YtClientError, match="Playlist zu lang"):
        client.list_source("https://www.youtube.com/playlist?list=PL1", 5, newest_last=True)
    assert paging.pulled == ytclient.NEWEST_LAST_MAX + 1


def test_newest_last_cancel_while_paging(client, paging):
    """n5: the cancel event stops paging (WaitCancelled, no error, no backoff)."""
    from app.core.throttle import WaitCancelled

    cancel = threading.Event()
    real = paging.extract_info

    def extract(self, url, download=True, process=True):
        info = real(self, url, download, process)
        cancel.set()
        return info

    paging.extract_info = extract
    with pytest.raises(WaitCancelled):
        client.list_source(
            "https://www.youtube.com/playlist?list=PL1", 5, newest_last=True, cancel_event=cancel
        )
    assert paging.pulled == 1  # stops before the next entry (next page) is requested


def test_metadata_call_marks_last_request_at_the_end(client, paging, db, throttle):
    """m4: the request spacing counts from the end of a (multi-page) listing."""
    stamps = []
    real = throttle.mark_request

    def mark():
        stamps.append(paging.pulled)
        real()

    throttle.mark_request = mark
    client.list_source("https://www.youtube.com/playlist?list=PL1", 3, newest_last=True)
    assert stamps == [8]  # after all pages were read, before the lock was released
    assert db.get_state("last_request")


def test_resolve(client, fake):
    fake.info = {**FakeYDL.info, "chapters": [{"start_time": 0, "title": "A"}]}
    r = client.resolve(f"https://youtu.be/{VID}")
    assert r["id"] == VID and r["description"].startswith("00:00")
    assert r["chapters"] == [{"start_time": 0, "title": "A"}]
    assert fake.instances[0].url.endswith(VID)
    assert fake.instances[0].opts["noplaylist"] is True


# ------------------------------------------------------------------ download pipeline


@needs_ffmpeg
def test_download_pipeline_and_second_call_skips(client, fake, db, settings, throttle):
    progress = []
    res = client.download(f"https://www.youtube.com/watch?v={VID}", on_progress=progress.append)
    assert res.status == "done" and not res.skipped and res.ok
    target = res.file_path
    assert target and target.is_file() and target.suffix == ".mp3"
    rel = target.relative_to(Path(settings.storage.target_dir))
    assert rel.parts[0] == "Hardcore" and rel.parts[1] == "Partyraiser" and rel.parts[2] == "2026"
    assert rel.name == f"2026-10-03 - Partyraiser @ Masters of Hardcore 2026 Liveset [{VID}].mp3"
    tags = ID3(target)
    assert str(tags["TIT2"]) == "Partyraiser @ Masters of Hardcore 2026 Liveset"
    assert str(tags["TCON"]) == "Hardcore" and tags["TXXX:YOUTUBE_ID"].text == [VID]
    assert tags.getall("APIC") and len(tags.getall("CHAP")) == 3
    assert res.cue_path and res.cue_path.is_file()
    assert "INDEX 01 30:00:00" in res.cue_path.read_text(encoding="utf-8")
    assert not list((Path(settings.storage.target_dir) / ".tmp").glob(f"{VID}.*"))
    row = db.get_video(VID)
    assert row["status"] == "done" and row["file_path"] == str(target)
    assert row["channel_name"] == "Partyraiser" and row["genre"] == "Hardcore"
    assert throttle.downloads_today() == 1
    phases = {p["phase"] for p in progress}
    assert {"laden", "konvertieren", "taggen"} <= phases
    assert any(p["percent"] == 50.0 for p in progress)
    assert client.in_archive(VID)

    n = len(fake.instances)
    again = client.download(VID)
    assert again.skipped and again.status == "skipped" and again.file_path == target
    assert len(fake.instances) == n
    assert throttle.downloads_today() == 1


def test_skip_when_only_in_archive(client, fake, db):
    config.archive_path().parent.mkdir(parents=True, exist_ok=True)
    config.archive_path().write_text(f"youtube {VID}\n", encoding="utf-8")
    res = client.download(VID)
    assert res.skipped and not fake.instances


def test_rate_limit_429_sets_backoff_no_retry(client, fake, db, throttle):
    fake.errors = [yt_dlp.utils.DownloadError("ERROR: HTTP Error 429: Too Many Requests")]
    res = client.download(VID)
    assert res.status == "failed" and res.rate_limited
    assert len(fake.instances) == 1
    assert throttle.backoff_until() is not None
    assert db.get_video(VID)["status"] == "failed"
    with pytest.raises(BackoffActive):
        client.download("zzzzzzzzzzz")
    assert len(fake.instances) == 1


def test_bot_check_sets_backoff(client, fake, throttle):
    fake.errors = [yt_dlp.utils.DownloadError("Sign in to confirm you’re not a bot")]
    assert client.download(VID).rate_limited
    assert throttle.backoff_until() is not None


def test_403_not_retried_no_backoff(client, fake, throttle, db):
    fake.errors = [yt_dlp.utils.DownloadError("unable to download: HTTP Error 403: Forbidden")]
    res = client.download(VID)
    assert res.status == "failed" and not res.rate_limited
    assert len(fake.instances) == 1 and throttle.backoff_until() is None
    assert "403" in db.get_video(VID)["error"]


@needs_ffmpeg
def test_network_error_retried_once(client, fake, db):
    fake.errors = [yt_dlp.utils.DownloadError("Read timed out"), None]
    res = client.download(VID)
    assert res.status == "done" and len(fake.instances) == 2


def test_network_error_twice_fails(client, fake, db):
    fake.errors = [yt_dlp.utils.DownloadError("Read timed out")] * 3
    res = client.download(VID)
    assert res.status == "failed" and len(fake.instances) == 2
    assert db.get_video(VID)["status"] == "failed"


def test_cancel_cleans_tmp(client, fake, db, settings, monkeypatch):
    ev = threading.Event()
    ev.set()
    tmp = Path(settings.storage.target_dir) / ".tmp"
    tmp.mkdir(parents=True)
    (tmp / f"{VID}.webm.part").write_text("partial")

    def raising(opts_self, ie_result, download=True):
        for hook in opts_self.opts["progress_hooks"]:
            hook({"status": "downloading", "downloaded_bytes": 1, "total_bytes": 10})

    monkeypatch.setattr(FakeYDL, "process_ie_result", raising)
    res = client.download(VID, cancel_event=ev)
    assert res.status == "cancelled" and not res.ok
    assert [f.name for f in tmp.glob(f"{VID}.*")] == [f"{VID}.webm.part"]  # resumable (m3)
    assert db.get_video(VID)["status"] == "new" and db.get_video(VID)["error"] == "Abgebrochen"
    assert res.error == "Abgebrochen"


def test_cancel_exception_type_is_ytdlp_cancel():
    assert issubclass(DownloadCancelled, yt_dlp.utils.YoutubeDLError)


def test_limits_block_download(client, fake, settings, throttle):
    settings.throttle.max_downloads_per_run = 1
    throttle.register_download()
    with pytest.raises(LimitReached):
        client.download(VID)
    assert not fake.instances


@needs_ffmpeg
def test_failure_before_done_does_not_write_archive(client, fake, db, monkeypatch):
    def boom(*a, **k):
        raise OSError("disk full")

    monkeypatch.setattr(ytclient.tagging, "write_tags", boom)
    res = client.download(VID)
    assert res.status == "failed" and "disk full" in res.error
    assert not client.in_archive(VID)
    assert db.get_video(VID)["status"] == "failed"


@needs_ffmpeg
def test_manual_genre_and_source_default(client, fake, db, settings):
    db.upsert_video({"id": VID, "title": "x", "genre": "Uptempo", "genre_manual": 1})
    res = client.download(VID)
    assert res.file_path.relative_to(Path(settings.storage.target_dir)).parts[0] == "Uptempo"


@needs_ffmpeg
def test_cover_jpg_and_no_cue_option(client, fake, settings):
    settings.download.write_cover_jpg = True
    settings.download.write_cue = False
    res = client.download(VID)
    assert (res.file_path.parent / "cover.jpg").is_file()
    assert res.cue_path is None and not res.file_path.with_suffix(".cue").exists()


def test_http_mode_starts_and_stops_server(client, fake, settings, monkeypatch):
    started = []

    class FakeServer:
        def __init__(self, port):
            self.port = port

        def start(self):
            started.append(self.port)
            return True

        def stop(self):
            started.append("stop")

    monkeypatch.setattr(ytclient.binaries, "PotServer", FakeServer)
    settings.network.po_token_mode = "http"
    settings.network.po_token_port = 4501
    fake.info = {"entries": []}
    client.search("x", 1)
    client.close()
    assert started == [4501, "stop"]


# ------------------------------------------------------------------ B1: single videos only


@pytest.mark.parametrize(
    "url",
    [
        "https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxx",
        "https://www.youtube.com/@somechannel",
        "https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv",
        "ytsearch10:hardcore mix",
        "",
    ],
)
def test_download_refuses_non_video_urls_before_throttle(client, fake, db, throttle, url):
    res = client.download(url)
    assert res.status == "failed" and not res.ok and res.error
    assert not fake.instances
    assert throttle.downloads_today() == 0 and throttle.downloads_this_run() == 0
    assert db.list_videos() == []


@needs_ffmpeg
def test_download_url_is_rebuilt_from_id(client, fake):
    url = f"https://www.youtube.com/watch?v={VID}&list=PLxxxxxxxxxxxxxxxx&index=3"
    assert client.download(url).status == "done"
    assert fake.instances[0].url == f"https://www.youtube.com/watch?v={VID}"
    assert fake.instances[0].opts["playlist_items"] == "1"


def test_playlist_result_is_an_error(client, fake, db):
    fake.info = {**FakeYDL.info, "_type": "playlist"}
    fake.make_files = False
    res = client.download(VID)
    assert res.status == "failed" and "Playlist" in res.error
    assert db.get_video(VID)["status"] == "failed"


# ------------------------------------------------------------------ M2: archive after done


@needs_ffmpeg
def test_archive_written_only_after_done(client, fake, db):
    seen = {}

    real = client._record_archive

    def spy(vid):
        seen["status"] = db.get_video(vid)["status"]
        real(vid)

    client._record_archive = spy
    assert client.download(VID).status == "done"
    assert seen["status"] == "done" and client.in_archive(VID)


def test_crash_window_does_not_block_video(client, fake, db, monkeypatch):
    """A hard stop after yt-dlp finished leaves no archive entry -> the video is retried."""

    def crash(*a, **k):
        raise KeyboardInterrupt

    monkeypatch.setattr(ytclient.tagging, "write_tags", crash)
    if shutil.which("ffmpeg"):
        with pytest.raises(KeyboardInterrupt):
            client.download(VID)
    assert not client.in_archive(VID)
    assert client._skip_result(VID) is None


# ------------------------------------------------------------------ M4/M5 through the client


def _paced_client(settings, db, slept):
    settings.throttle.sleep_interval = 30
    settings.throttle.max_sleep_interval = 30
    th = Throttle(db, lambda: settings.throttle, sleep=slept.append, uniform=lambda a, b: b)
    return YtClient(lambda: settings, db, th), th


def test_second_download_waits_pause(settings, db, fake):
    slept = []
    c, th = _paced_client(settings, db, slept)
    fake.errors = [yt_dlp.utils.DownloadError("HTTP Error 404")] * 2
    c.download("aaaaaaaaaaa")
    assert slept == []  # first download: nothing to wait for
    c.download("bbbbbbbbbbb")
    assert len(slept) == 1 and 25 < slept[0] <= 30


def test_skip_does_not_wait_or_count(settings, db, fake):
    slept = []
    c, th = _paced_client(settings, db, slept)
    db.upsert_video({"id": VID})
    db.set_status(VID, "done", file_path="/x.mp3")
    th.mark_download_end()
    assert c.download(VID).skipped
    assert slept == [] and th.downloads_this_run() == 0


def test_failed_attempts_count_against_run_limit(client, fake, settings, throttle):
    settings.throttle.max_downloads_per_run = 2
    fake.errors = [yt_dlp.utils.DownloadError("HTTP Error 403: Forbidden")] * 5
    assert client.download("aaaaaaaaaaa").status == "failed"
    assert client.download("bbbbbbbbbbb").status == "failed"
    assert throttle.downloads_this_run() == 2 and throttle.downloads_today() == 2
    with pytest.raises(LimitReached):
        client.download("ccccccccccc")
    assert len(fake.instances) == 2


@needs_ffmpeg
def test_network_retry_counts_once(client, fake, settings, throttle):
    settings.throttle.max_downloads_per_run = 1
    fake.errors = [yt_dlp.utils.DownloadError("Read timed out"), None]
    assert client.download(VID).status == "done"
    assert throttle.downloads_this_run() == 1


def test_pause_wait_cancel_restores_status(client, db, fake, settings, monkeypatch):
    ev = threading.Event()
    ev.set()
    db.upsert_video({"id": VID, "status": "queued"})
    client.throttle.mark_download_end()
    settings.throttle.sleep_interval = 60
    settings.throttle.max_sleep_interval = 60
    res = client.download(VID, cancel_event=ev)
    assert res.status == "cancelled" and not fake.instances
    assert db.get_video(VID)["status"] == "queued"


# ------------------------------------------------------------------ m4: status handling


def test_cancel_restores_queued(client, fake, db, monkeypatch):
    ev = threading.Event()
    ev.set()
    db.upsert_video({"id": VID, "status": "queued"})

    def hook_cancel(self, ie_result, download=True):
        for hook in self.opts["progress_hooks"]:
            hook({"status": "downloading"})

    monkeypatch.setattr(FakeYDL, "process_ie_result", hook_cancel)
    res = client.download(VID, cancel_event=ev)
    assert res.status == "cancelled"
    row = db.get_video(VID)
    assert row["status"] == "queued" and row["error"] == "Abgebrochen"


def test_throttle_refusal_restores_status(client, fake, db, throttle):
    db.upsert_video({"id": VID, "status": "queued"})
    throttle.trigger_backoff("x")
    with pytest.raises(BackoffActive):
        client.download(VID)
    assert db.get_video(VID)["status"] == "queued"


# ------------------------------------------------------------------ m3: .part handling


def _tmp(settings):
    return Path(settings.storage.target_dir) / ".tmp"


def test_network_error_keeps_part_file(client, fake, db, settings):
    tmp = _tmp(settings)
    tmp.mkdir(parents=True)
    (tmp / f"{VID}.webm.part").write_text("partial")
    (tmp / f"{VID}.webm").write_text("stale complete file")
    fake.errors = [yt_dlp.utils.DownloadError("Read timed out")] * 3
    assert client.download(VID).status == "failed"
    assert [f.name for f in tmp.glob(f"{VID}.*")] == [f"{VID}.webm.part"]


def test_403_removes_part_file(client, fake, db, settings):
    tmp = _tmp(settings)
    tmp.mkdir(parents=True)
    (tmp / f"{VID}.webm.part").write_text("partial")
    fake.errors = [yt_dlp.utils.DownloadError("HTTP Error 403: Forbidden")]
    assert client.download(VID).status == "failed"
    assert not list(tmp.glob(f"{VID}.*"))


# ------------------------------------------------------------------ m2: post-move steps


@needs_ffmpeg
def test_cue_failure_after_move_still_done(client, fake, db, monkeypatch):
    def boom(*a, **k):
        raise OSError("cue blocked")

    monkeypatch.setattr(ytclient.tagging, "write_cue", boom)
    res = client.download(VID)
    assert res.status == "done" and res.file_path.is_file() and res.cue_path is None
    assert db.get_video(VID)["status"] == "done" and client.in_archive(VID)


# ------------------------------------------------------------------ m5: warning-level 429


def test_warning_429_triggers_backoff(client, fake, throttle, monkeypatch):
    def warn_then_ok(self, url, download=True, process=True):
        self.opts["logger"].warning("WARNING: HTTP Error 429: Too Many Requests, trying next")
        return {"entries": []}

    monkeypatch.setattr(FakeYDL, "extract_info", warn_then_ok)
    client.search("x", 1)
    assert throttle.backoff_until() is not None


def test_logger_ignores_normal_warnings():
    lg = ytclient._YdlLogger()
    lg.warning("some other warning")
    lg.error("ERROR: Video unavailable")
    assert lg.rate_limit_hit is None
    lg.warning("Sign in to confirm you’re not a bot")
    assert lg.rate_limit_hit


# ------------------------------------------------------------------ m7/m8: provider


@pytest.mark.parametrize(("hours", "expected"), [(0.5, "1"), (6.0, "6"), (6.6, "7"), (48, "48")])
def test_token_ttl_whole_hours(client, fake, settings, hours, expected):
    settings.network.po_token_ttl_hours = hours
    fake.info = {"entries": []}
    client.search("x", 1)
    assert ytclient.os.environ["TOKEN_TTL"] == expected


def test_http_server_not_ready_fails_clean(client, fake, settings, monkeypatch):
    class DeadServer:
        def __init__(self, port):
            self.port = port

        def start(self):
            return False

        def stop(self):
            pass

    monkeypatch.setattr(ytclient.binaries, "PotServer", DeadServer)
    settings.network.po_token_mode = "http"
    with pytest.raises(ytclient.YtClientError):
        client.search("x", 1)
    assert not fake.instances
    assert client.throttle.searches_last_hour() == 0


# ------------------------------------------------------------------ Phase 3a: Entdecken


def test_opts_flat_purposes_enable_approximate_date(settings):
    for purpose in ("search", "list"):
        args = build_ydl_opts(settings, purpose)["extractor_args"]
        assert args["youtubetab"] == {"approximate_date": [""]}
        assert args["youtube"] == {"fetch_pot": ["never"]}  # merged with PO-token args
    assert "youtubetab" not in build_ydl_opts(settings, "resolve")["extractor_args"]
    settings.network.po_token_mode = "script"
    args = build_ydl_opts(settings, "search")["extractor_args"]
    assert "youtubepot-bgutilscript" in args and "youtubetab" in args


def test_approximate_date_arg_is_truthy_for_ytdlp(settings):
    from yt_dlp.extractor.youtube import YoutubeTabIE

    opts = build_ydl_opts(settings, "search")
    with yt_dlp.YoutubeDL(opts) as ydl:
        ie = ydl.get_info_extractor("YoutubeTab")
        assert isinstance(ie, YoutubeTabIE)
        assert ie._configuration_arg("approximate_date", ie_key=YoutubeTabIE)
    with yt_dlp.YoutubeDL(build_ydl_opts(settings, "resolve")) as ydl:
        assert not ydl.get_info_extractor("YoutubeTab")._configuration_arg(
            "approximate_date", ie_key=YoutubeTabIE
        )


def test_normalize_entry_date_approx():
    flat = ytclient.normalize_entry({"id": "a" * 11, "timestamp": 1790000000})
    assert flat["upload_date"] == "20260921" and flat["date_approx"] is True
    exact = ytclient.normalize_entry({"id": "a" * 11, "upload_date": "20240101", "timestamp": 1})
    assert exact["upload_date"] == "20240101" and exact["date_approx"] is False
    none = ytclient.normalize_entry({"id": "a" * 11})
    assert none["upload_date"] == "" and none["date_approx"] is False


def test_build_search_query(settings):
    q = ytclient.build_search_query
    assert q("mix", settings=settings) == "mix"
    # only the first two genre terms, not the whole keyword list
    assert q("mix", genre="Hardcore", settings=settings) == "mix hardcore gabber"
    assert q("mix", genre="Hardcore", year=2024, settings=settings) == "mix hardcore gabber 2024"
    # terms already in the query (also hyphen/space variants) are not repeated
    assert q("Uptempo mix", genre="Uptempo", settings=settings) == "Uptempo mix terror terrorcore"
    assert q("mix 2024", year=2024, settings=settings) == "mix 2024"
    assert q("mix", genre="Gibtsnicht", settings=settings) == "mix"
    settings.search.append_year = False
    assert q("mix", year=2024, settings=settings) == "mix"


def test_search_passes_genre_and_year(client, fake, settings):
    fake.info = {"entries": []}
    client.search("mix", 3, genre="Hardstyle", year=2023)
    assert fake.instances[0].url == "ytsearch3:mix hardstyle rawstyle 2023"


def test_external_pot_server_is_not_started_or_stopped(client, fake, settings):
    class External:
        port = 4416

        def __init__(self, up):
            self.up, self.calls = up, []

        def running(self):
            return self.up

        def start(self):
            self.calls.append("start")
            return True

        def stop(self):
            self.calls.append("stop")

    ext = External(True)
    c = YtClient(lambda: settings, client.db, client.throttle, pot_server=ext)
    settings.network.po_token_mode = "http"
    fake.info = {"entries": []}
    c.search("x", 1)
    c.close()
    assert ext.calls == []
    ext.up = False
    with pytest.raises(ytclient.YtClientError, match="PO-Token-Server"):
        c.search("x", 1)


# ------------------------------------------------------------------ Review Phase 3


class _ExternalPot:
    def __init__(self, alive):
        self.alive = alive
        self.port = 4416

    def running(self):
        return self.alive

    def start(self):
        return self.alive

    def stop(self):
        pass


def test_m2_pot_not_running_is_local_error_without_side_effects(settings, db, throttle, fake):
    settings.network.po_token_mode = "http"
    client = YtClient(lambda: settings, db, throttle, pot_server=_ExternalPot(False))
    db.upsert_video({"id": VID, "status": "queued"})
    with pytest.raises(ytclient.LocalError) as ei:
        client.download(VID)
    assert ei.value.code == "pot" and isinstance(ei.value, ytclient.YtClientError)
    assert db.get_video(VID)["status"] == "queued"
    assert not fake.instances  # no yt-dlp, no request
    assert db.get_state("last_download_end") is None and throttle.downloads_today() == 0


def test_m2_unwritable_target_is_local_error(client, settings, db, throttle, fake, tmp_path):
    blocker = tmp_path / "file"
    blocker.write_text("x")
    settings.storage.target_dir = str(blocker / "music")
    db.upsert_video({"id": VID, "status": "queued"})
    with pytest.raises(ytclient.LocalError) as ei:
        client.download(VID)
    assert ei.value.code == "target" and "Zielordner nicht erreichbar" in str(ei.value)
    assert db.get_video(VID)["status"] == "queued" and not fake.instances
    assert db.get_state("last_download_end") is None


def test_m2_error_before_first_request_is_no_download_end(client, fake, db, monkeypatch):
    """A failure before yt-dlp sends anything (e.g. YoutubeDL() itself) needs no pause."""

    class Broken(FakeYDL):
        def __init__(self, opts):
            raise yt_dlp.utils.YoutubeDLError("cookies database locked")

    monkeypatch.setattr(ytclient.yt_dlp, "YoutubeDL", Broken)
    res = client.download(VID)
    assert res.status == "failed" and "cookies" in res.error
    assert db.get_state("last_download_end") is None


@needs_ffmpeg
def test_m4_download_releases_metadata_lock_before_media(client, fake, throttle, monkeypatch):
    seen = {}
    real_extract = FakeYDL.extract_info
    real_process = FakeYDL.process_ie_result

    def extract(self, url, download=True, process=True):
        seen["extract"] = throttle.metadata_busy()
        return real_extract(self, url, download=download, process=process)

    def process(self, ie_result, download=True):
        seen["process"] = throttle.metadata_busy()
        return real_process(self, ie_result, download=download)

    monkeypatch.setattr(FakeYDL, "extract_info", extract)
    monkeypatch.setattr(FakeYDL, "process_ie_result", process)
    assert client.download(VID).status == "done"
    assert seen == {"extract": True, "process": False}
    assert not throttle.metadata_busy()


def test_m4_search_gives_up_while_download_extracts(client, fake, throttle, monkeypatch):
    monkeypatch.setattr(ytclient, "METADATA_WAIT_S", 0.1)
    fake.info = {"entries": []}
    with throttle.metadata_lock(), pytest.raises(ytclient.MetadataBusy):
        client.search("x", 1)
    assert not fake.instances and throttle.searches_last_hour() == 0
    assert client.search("x", 1) == []


@needs_ffmpeg
def test_m1_stored_chip_genre_is_used_when_keywords_decide_nothing(client, fake, db):
    fake.info = {**fake.info, "title": "Partyraiser @ Dominator 2024", "description": ""}
    db.upsert_video({"id": VID, "title": "x", "genre": "Uptempo"})  # chip hint, not manual
    res = client.download(VID)
    assert res.status == "done" and res.file_path.parts[-4] == "Uptempo"
    assert str(ID3(res.file_path)["TCON"]) == "Uptempo"
    assert db.get_video(VID)["genre"] == "Uptempo"


@needs_ffmpeg
def test_m1_keyword_beats_stored_chip_and_unknown_hint_is_ignored(client, fake, db):
    fake.info = {**fake.info, "title": "Partyraiser Hardcore Liveset", "description": ""}
    db.upsert_video({"id": VID, "title": "x", "genre": "Uptempo"})
    assert client.download(VID).file_path.parts[-4] == "Hardcore"

    vid2 = "zzz123XYZ_-"
    fake.info = {**fake.info, "id": vid2, "title": "Angerfist @ Defqon.1"}
    db.upsert_video({"id": vid2, "title": "x", "genre": "Polka"})  # genre deleted meanwhile
    assert client.download(vid2).file_path.parts[-4] == "Unsortiert"


def test_n3_on_commit_false_aborts_before_move(client, fake, db, settings):
    if shutil.which("ffmpeg") is None:
        pytest.skip("ffmpeg fehlt")
    db.upsert_video({"id": VID, "status": "queued"})
    res = client.download(VID, on_commit=lambda: False)
    assert res.status == "cancelled"
    assert db.get_video(VID)["status"] == "queued" and not db.get_video(VID)["file_path"]
    assert not list(Path(settings.storage.target_dir).rglob("*.mp3"))


def test_n4_clean_error_masks_proxy_credentials():
    exc = yt_dlp.utils.DownloadError(
        "ERROR: Unable to connect to proxy http://hans:geheim@10.0.0.1:3128 (refused)"
    )
    text = ytclient._clean_error(exc)
    assert "geheim" not in text and "hans" not in text
    assert "http://***@10.0.0.1:3128" in text


def test_r2n1_url_reference_is_refused(client, fake, db):
    """R2-n1: url/url_transparent (trailer link of a paid video) is never re-extracted."""

    class Ref(fake):
        def extract_info(self, url, download=True, process=True):
            if not process:
                return {**FakeYDL.info, "_type": "url_transparent"}
            return super().extract_info(url, download, process)

    import app.core.ytclient as yc

    yc.yt_dlp.YoutubeDL = Ref
    res = client.download(VID)
    assert res.status == "failed" and "Kein direktes Video" in res.error
