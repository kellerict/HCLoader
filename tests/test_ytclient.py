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
from app.core.ytclient import DownloadCancelled, YtClient, build_ydl_opts

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


def test_opts_unknown_purpose(settings):
    with pytest.raises(ValueError):
        build_ydl_opts(settings, "bogus")


def test_opts_download_mp3_320(settings, tmp_path):
    o = build_ydl_opts(settings, "download")
    tmp = Path(settings.storage.target_dir) / ".tmp"
    assert o["format"] == "bestaudio/best" and o["noplaylist"] is True
    assert o["paths"] == {"home": str(tmp), "temp": str(tmp)}
    assert o["outtmpl"]["default"] == "%(id)s.%(ext)s"
    assert o["download_archive"] == str(config.archive_path())
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

    def extract_info(self, url, download=True):
        self.url = url
        if not download:
            return FakeYDL.info
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
        with open(self.opts["download_archive"], "a", encoding="utf-8") as fh:
            fh.write(f"youtube {info['id']}\n")
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
        def extract_info(self, url, download=True):
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

    def raising(opts_self, url, download=True):
        for hook in opts_self.opts["progress_hooks"]:
            hook({"status": "downloading", "downloaded_bytes": 1, "total_bytes": 10})

    monkeypatch.setattr(FakeYDL, "extract_info", raising)
    res = client.download(VID, cancel_event=ev)
    assert res.status == "cancelled" and not res.ok
    assert not list(tmp.glob(f"{VID}.*"))
    assert db.get_video(VID)["status"] == "failed"


def test_cancel_exception_type_is_ytdlp_cancel():
    assert issubclass(DownloadCancelled, yt_dlp.utils.YoutubeDLError)


def test_limits_block_download(client, fake, settings, throttle):
    settings.throttle.max_downloads_per_run = 1
    throttle.register_download()
    with pytest.raises(LimitReached):
        client.download(VID)
    assert not fake.instances


@needs_ffmpeg
def test_failure_after_ytdlp_removes_archive_entry(client, fake, db, monkeypatch):
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
