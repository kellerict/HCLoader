"""v0.10.0: Mixcloud and hearthis.at as platforms - ids/URL parsing, options, flat listings
through the real yt-dlp extractor code with recorded API answers (tests/fixtures/platforms,
`_download_json` mocked, no network), throttle per platform, watchlist sources, downloads."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
import yt_dlp
from yt_dlp.extractor.common import InfoExtractor

from app.core import config, discover, platforms, status, tagging, watchlist, ytclient
from app.core.throttle import BackoffActive, Throttle

FIX = Path(__file__).parent / "fixtures" / "platforms"


def fixture(name: str):
    return json.loads((FIX / f"{name}.json").read_text(encoding="utf-8"))


# --------------------------------------------------------------------------- ids / URLs


def test_platform_ids_and_prefixes():
    assert platforms.PLATFORMS == ("youtube", "soundcloud", "mixcloud", "hearthis")
    assert platforms.db_id("mixcloud", "DJ_Thera_set-1") == "mc:DJ_Thera_set-1"
    assert platforms.db_id("hearthis", 4001) == "ht:4001"
    assert platforms.db_id("hearthis", "ht:4001") == "ht:4001"  # never twice
    assert platforms.platform_of("mc:dj_x") == "mixcloud"
    assert platforms.platform_of("ht:12") == "hearthis"
    assert platforms.platform_of("sc:12") == "soundcloud"
    assert platforms.platform_of("abcdefghijk") == "youtube"
    assert platforms.platform_of("xx:12") == "youtube"  # unknown prefix
    assert platforms.native_id("mc:dj_x_mix-1") == "dj_x_mix-1"
    assert platforms.file_id("mc:dj_x_mix-1") == "mc-dj_x_mix-1"
    assert platforms.file_id("ht:12") == "ht-12"
    assert platforms.file_id("sc:12") == "sc-12"
    assert platforms.archive_line("mc:dj_x_mix-1") == "mixcloud dj_x_mix-1"
    assert platforms.archive_line("ht:12") == "hearthisat 12"
    assert platforms.archive_line("sc:12") == "soundcloud 12"
    for good in ("mc:dj_x_mix-1", "ht:4001", "sc:1", "abcdefghijk"):
        assert platforms.is_valid_db_id(good), good
    for bad in ("mc:", "ht:abc", "mc:a/b", "mc:../x", "ht:", "sc:x", "abc"):
        assert not platforms.is_valid_db_id(bad), bad
    assert (
        platforms.label("hearthis") == "hearthis.at" and platforms.label("mixcloud") == "Mixcloud"
    )
    assert platforms.tag_name("mixcloud") == "MIXCLOUD_ID"
    assert platforms.tag_name("hearthis") == "HEARTHIS_ID"


@pytest.mark.parametrize(
    ("url", "platform"),
    [
        ("https://www.mixcloud.com/DJ_Thera/", "mixcloud"),
        ("https://m.mixcloud.com/x/y/", "mixcloud"),
        ("https://hearthis.at/frenchcore-fabrik/", "hearthis"),
        ("https://www.hearthis.at/a/b/", "hearthis"),
        ("https://soundcloud.com/dj-x", "soundcloud"),
        ("https://youtu.be/abcdefghijk", "youtube"),
        ("https://evil.example/mixcloud.com/", None),
        ("https://mixcloud.com.evil.example/", None),
    ],
)
def test_url_platform(url, platform):
    assert platforms.url_platform(url) == platform


def test_track_page_parsing():
    assert (
        platforms.mixcloud_track_url("https://www.mixcloud.com/DJ_Thera/hardcore-session-1/?a=1")
        == "https://www.mixcloud.com/DJ_Thera/hardcore-session-1/"
    )
    assert platforms.mixcloud_id_from_url("https://mixcloud.com/DJ_Thera/hardcore-session-1") == (
        "mc:DJ_Thera_hardcore-session-1"
    )
    # user sub pages and site pages are no cloudcast
    for url in (
        "https://www.mixcloud.com/DJ_Thera/uploads/",
        "https://www.mixcloud.com/DJ_Thera/playlists/",
        "https://www.mixcloud.com/discover/hardcore/",
        "https://www.mixcloud.com/DJ_Thera/",
    ):
        assert platforms.mixcloud_track_url(url) is None, url
    assert (
        platforms.hearthis_track_url("https://hearthis.at/frenchcore-fabrik/frenchcore-podcast-1")
        == "https://hearthis.at/frenchcore-fabrik/frenchcore-podcast-1/"
    )
    for url in (
        "https://hearthis.at/frenchcore-fabrik/set/best-of/",
        "https://hearthis.at/frenchcore-fabrik/",
        "https://hearthis.at/search/hardcore/",
    ):
        assert platforms.hearthis_track_url(url) is None, url
    assert platforms.track_page_ok("hearthis", "https://hearthis.at/a/b/")
    assert not platforms.track_page_ok("hearthis", "http://hearthis.at/a/b/")
    assert not platforms.track_page_ok("mixcloud", "https://hearthis.at/a/b/")
    assert not platforms.track_page_ok("youtube", "https://www.youtube.com/watch?v=abcdefghijk")


def test_video_id_and_resolve_rules():
    assert ytclient.extract_video_id("mc:dj_x_mix-1") == "mc:dj_x_mix-1"
    assert ytclient.extract_video_id("ht:12") == "ht:12"
    assert ytclient.extract_video_id("https://www.mixcloud.com/dj_x/mix-1/") == "mc:dj_x_mix-1"
    # a hearthis page carries no id, and no YouTube id may be read out of another site's URL
    assert ytclient.extract_video_id("https://hearthis.at/dj/abcdefghijk/") is None
    assert ytclient.extract_video_id("https://www.mixcloud.com/dj_x/") is None
    assert ytclient.needs_resolve("https://hearthis.at/dj/set-1/")
    assert ytclient.needs_resolve("https://soundcloud.com/dj-x/mix-1")
    assert not ytclient.needs_resolve("https://www.mixcloud.com/dj_x/mix-1/")
    assert ytclient.watch_url("mc:dj_x_mix-1") == "" and ytclient.watch_url("ht:1") == ""


def test_source_urls_normalised():
    n = ytclient.normalize_source_url
    assert n("https://www.mixcloud.com/DJ_Thera") == "https://www.mixcloud.com/DJ_Thera/uploads/"
    assert n("https://mixcloud.com/DJ_Thera/uploads/") == (
        "https://www.mixcloud.com/DJ_Thera/uploads/"
    )
    assert n("https://www.mixcloud.com/DJ_Thera/playlists/uptempo-classics") == (
        "https://www.mixcloud.com/DJ_Thera/playlists/uptempo-classics/"
    )
    assert (
        n("https://www.hearthis.at/frenchcore-fabrik") == "https://hearthis.at/frenchcore-fabrik/"
    )
    assert n("https://hearthis.at/frenchcore-fabrik/set/best-of") == (
        "https://hearthis.at/frenchcore-fabrik/set/best-of/"
    )


# --------------------------------------------------------------------------- options


def test_build_ydl_opts_per_platform():
    s = config.defaults()
    s.mixcloud.sleep_requests = 7
    s.hearthis.limit_rate_mb = 1
    mc = ytclient.build_ydl_opts(s, "download", "mixcloud")
    ht = ytclient.build_ydl_opts(s, "download", "hearthis")
    for o in (mc, ht):
        assert "js_runtimes" not in o and "cookiesfrombrowser" not in o
        assert o["extractor_args"] == {}
        assert "postprocessors" not in o  # keep_original_* default on
    assert mc["outtmpl"]["default"] == "mc-%(id)s.%(ext)s"
    assert ht["outtmpl"]["default"] == "ht-%(id)s.%(ext)s"
    assert mc["sleep_interval_requests"] == 7
    assert ht["ratelimit"] == 1024 * 1024
    assert "wav" in ht["format"] and mc["format"] == "bestaudio/best"
    s.download.keep_original_mixcloud = False
    assert ytclient.build_ydl_opts(s, "download", "mixcloud")["postprocessors"][0]["key"] == (
        "FFmpegExtractAudio"
    )
    assert ytclient.build_ydl_opts(s, "resolve", "mixcloud")["extractor_retries"] == 0
    with pytest.raises(ValueError):
        ytclient.build_ydl_opts(s, "search", "bandcamp")


def test_settings_sections_and_enabled():
    s = config.defaults()
    assert s.platform_enabled("youtube") and s.platform_enabled("mixcloud")
    assert s.throttle_for("mixcloud") is s.mixcloud and s.throttle_for("hearthis") is s.hearthis
    assert s.throttle_for("youtube") is s.throttle
    s.hearthis.enabled = False
    assert not s.platform_enabled("hearthis") and not s.platform_enabled("bandcamp")
    provs = config.platform_throttle_settings(lambda: s)
    assert set(provs) == {"soundcloud", "mixcloud", "hearthis"}
    assert provs["hearthis"]() is s.hearthis
    # own validation per section (max >= min)
    data = s.to_dict()
    data["mixcloud"]["sleep_interval"] = 100
    data["mixcloud"]["max_sleep_interval"] = 5
    assert "mixcloud.max_sleep_interval" in config.validate_settings(data)


# --------------------------------------------------------------------------- flat listings


@pytest.fixture
def api(monkeypatch):
    """Recorded API answers; every request not covered fails the test."""
    calls: list[tuple[str, dict]] = []

    def fake_json(self, url, video_id, *a, **kw):
        q = dict(kw.get("query") or {})
        calls.append((url, q))
        if "app.mixcloud.com/graphql" in url:
            text = q["query"]
            if "playlistLookup" in text:
                return fixture("mixcloud_playlist")
            return fixture("mixcloud_user_page2" if "after:" in text else "mixcloud_user_page1")
        if url.startswith("https://api.mixcloud.com/search/"):
            return fixture("mixcloud_search" if "offset" not in url else "mixcloud_search_page2")
        if url == "https://api-v2.hearthis.at/search":
            return fixture("hearthis_search") if q["page"] == 1 else []
        if url == "https://api-v2.hearthis.at/frenchcore-fabrik/":
            assert q["type"] == "tracks" and q["count"] == ytclient.HT_PAGE
            return fixture("hearthis_user_page1" if q["page"] == 1 else "hearthis_user_page2")
        if url == "https://api-v2.hearthis.at/set/best-of/":
            return fixture("hearthis_set")
        raise AssertionError(url)

    def no_request(self, *a, **kw):
        raise AssertionError(f"unexpected request: {a[:1]}")

    monkeypatch.setattr(InfoExtractor, "_download_json", fake_json)
    monkeypatch.setattr(InfoExtractor, "_request_webpage", no_request)
    return calls


def _flat(url, platform, purpose, window, *, ie_key=None, playlistend=None):
    opts = ytclient.build_ydl_opts(config.defaults(), purpose, platform)
    opts["cachedir"] = False
    if playlistend:
        opts["playlistend"] = playlistend
    with yt_dlp.YoutubeDL(opts) as ydl:
        ytclient._install_platform_extractors(ydl, platform, window)
        extra = {"ie_key": ie_key} if ie_key else {}
        return ydl.sanitize_info(ydl.extract_info(url, download=False, **extra))


def test_mixcloud_user_listing_one_page_with_metadata(api):
    url = ytclient.normalize_source_url("https://www.mixcloud.com/DJ_Thera/")
    info = _flat(url, "mixcloud", "list", ("head", 3), playlistend=3)
    entries = [ytclient.normalize_entry(e, "mixcloud") for e in info["entries"]]
    graph = [c for c in api if "graphql" in c[0]]
    assert len(graph) == 1  # 3 wanted -> page size 3, no second page
    assert "uploads(first: 3" in graph[0][1]["query"] and "audioLength" in graph[0][1]["query"]
    a = entries[0]
    assert a["id"] == "mc:DJ_Thera_hardcore-session-1" and a["platform"] == "mixcloud"
    assert a["duration"] == 3607 and a["upload_date"] == "20260115" and not a["date_approx"]
    assert a["channel_id"] == "mc:DJ_Thera" and a["channel_name"] == "DJ Thera"
    assert a["url"] == "https://www.mixcloud.com/DJ_Thera/hardcore-session-1/"
    assert a["thumbnail"].startswith("https://thumbnailer.mixcloud.com/")
    assert [e["preview"] for e in entries] == [False, False, True]  # Select upload
    assert ytclient.listing_name(info, "https://www.mixcloud.com/DJ_Thera/", "mixcloud") == (
        "DJ Thera"
    )


def test_mixcloud_user_listing_pages_on_when_more_wanted(api):
    url = ytclient.normalize_source_url("https://www.mixcloud.com/DJ_Thera/")
    info = _flat(url, "mixcloud", "list", ("head", 30), playlistend=30)
    assert len(info["entries"]) == 5
    assert len([c for c in api if "graphql" in c[0]]) == 2


def test_mixcloud_playlist_listing(api):
    url = "https://www.mixcloud.com/DJ_Thera/playlists/uptempo-classics/"
    info = _flat(url, "mixcloud", "list", ("head", 10))
    ids = [ytclient.normalize_entry(e, "mixcloud")["id"] for e in info["entries"]]
    assert ids == ["mc:DJ_Thera_hardcore-session-6", "mc:DJ_Thera_hardcore-session-7"]
    assert ytclient.listing_name(info, url, "mixcloud") == "Uptempo Classics"


def test_mixcloud_search(api):
    info = _flat("mcsearch2:hardcore", "mixcloud", "search", ("head", 2), ie_key="HcMixcloudSearch")
    entries = [ytclient.normalize_entry(e, "mixcloud") for e in info["entries"]]
    assert [e["id"] for e in entries] == [
        "mc:DJ_Thera_hardcore-session-1",
        "mc:rawstyle_radio_episode-200",
    ]
    assert entries[1]["duration"] == 7200 and entries[1]["channel_name"] == "Rawstyle Radio"
    assert entries[1]["view_count"] == 120
    assert api[0][1] == {"q": "hardcore", "type": "cloudcast", "limit": 2}
    assert len(api) == 1  # two results wanted, the page had them


def test_hearthis_search_and_user_listing(api):
    info = _flat(
        "htsearch5:frenchcore", "hearthis", "search", ("head", 5), ie_key="HcHearthisSearch"
    )
    entries = [ytclient.normalize_entry(e, "hearthis") for e in info["entries"]]
    assert [e["id"] for e in entries] == ["ht:4001", "ht:4002"]  # entry without page skipped
    a = entries[0]
    assert a["title"] == "Frenchcore Fabrik - Frenchcore Podcast 1"
    assert a["duration"] == 3001 and a["upload_date"] == "20260301"
    assert a["channel_id"] == "ht:frenchcore-fabrik" and a["channel_name"] == "Frenchcore Fabrik"
    assert a["url"] == "https://hearthis.at/frenchcore-fabrik/frenchcore-podcast-1/"
    assert a["view_count"] == 101
    api.clear()
    url = ytclient.normalize_source_url("https://hearthis.at/frenchcore-fabrik")
    info = _flat(url, "hearthis", "list", ("head", 5), ie_key="HcHearthisList", playlistend=5)
    assert len(info["entries"]) == 5 and len(api) == 1  # lazy: one page of 20 is enough
    api.clear()
    info = _flat(url, "hearthis", "list", ("head", 30), ie_key="HcHearthisList", playlistend=30)
    assert len(info["entries"]) == 23 and len(api) == 2  # second page shorter -> end
    info = _flat(
        "https://hearthis.at/frenchcore-fabrik/set/best-of/",
        "hearthis",
        "list",
        ("head", 30),
        ie_key="HcHearthisList",
    )
    assert [e["id"] for e in info["entries"]] == ["4030", "4031"]


def test_mixcloud_extension_falls_back_on_changed_internals(monkeypatch, caplog):
    from yt_dlp.extractor import mixcloud as mc

    monkeypatch.setattr(ytclient, "_EXTRA_CLASSES", {})
    monkeypatch.setattr(ytclient, "_SC_WARNED", set())
    monkeypatch.delattr(mc.MixcloudUserIE, "_NODE_TEMPLATE")
    classes = ytclient._extra_extractor_classes("mixcloud")
    assert [c.__name__ for c in classes] == ["HcMixcloudSearchIE"]  # search still works
    assert "Mixcloud" in caplog.text


# --------------------------------------------------------------------------- client / DB


class _FakeYDL:
    """Records what yt-dlp would be asked (download URL, opts), returns a canned info."""

    seen: list[tuple[str, dict]] = []

    def __init__(self, opts):
        self.opts = opts

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def extract_info(self, url, download=False, process=True, **kw):
        _FakeYDL.seen.append((url, self.opts))
        raise yt_dlp.utils.DownloadError("HTTP Error 429: Too Many Requests")


def _client(db, s):
    th = Throttle(
        db,
        lambda: s.throttle,
        sleep=lambda x: None,
        platform_settings=config.platform_throttle_settings(lambda: s),
    )
    return ytclient.YtClient(lambda: s, db, th), th


def test_download_uses_stored_track_page_and_platform_throttle(db, monkeypatch, tmp_path):
    s = config.defaults()
    s.storage.target_dir = str(tmp_path / "lib")
    s.mixcloud.sleep_interval = s.mixcloud.max_sleep_interval = 0
    client, th = _client(db, s)
    monkeypatch.setattr(ytclient.yt_dlp, "YoutubeDL", _FakeYDL)
    _FakeYDL.seen.clear()
    # no stored page: refused before any request
    res = client.download("ht:4001")
    assert res.status == "failed" and _FakeYDL.seen == []
    db.upsert_video(
        {
            "id": "mc:DJ_Thera_hardcore-session-1",
            "title": "Mix",
            "url": "https://www.mixcloud.com/DJ_Thera/hardcore-session-1/",
        }
    )
    res = client.download("mc:DJ_Thera_hardcore-session-1")
    assert res.status == "failed" and res.rate_limited
    url, opts = _FakeYDL.seen[-1]
    assert url == "https://www.mixcloud.com/DJ_Thera/hardcore-session-1/"
    assert opts["outtmpl"]["default"].startswith("mc-")
    # the 429 put Mixcloud into backoff - YouTube, SoundCloud and hearthis.at stay free
    assert th.platform("mixcloud").backoff_until() is not None
    for other in ("youtube", "soundcloud", "hearthis"):
        assert th.platform(other).backoff_until() is None
    assert db.get_state("mixcloud.backoff_until")


def test_download_refuses_foreign_stored_page(db, monkeypatch, tmp_path):
    s = config.defaults()
    s.storage.target_dir = str(tmp_path / "lib")
    client, _th = _client(db, s)
    monkeypatch.setattr(ytclient.yt_dlp, "YoutubeDL", _FakeYDL)
    _FakeYDL.seen.clear()
    db.upsert_video({"id": "ht:7", "title": "x", "url": "https://evil.example/hearthis.at/a/b/"})
    db.upsert_video({"id": "mc:a_b", "title": "x", "url": "https://www.mixcloud.com/other/page/"})
    assert client.download("ht:7").status == "failed"
    assert client.download("mc:a_b").status == "failed"
    assert _FakeYDL.seen == []


def test_disabled_platform_refuses_without_request(db, monkeypatch):
    s = config.defaults()
    s.hearthis.enabled = False
    client, _th = _client(db, s)
    monkeypatch.setattr(ytclient.yt_dlp, "YoutubeDL", _FakeYDL)
    _FakeYDL.seen.clear()
    with pytest.raises(ytclient.YtClientError, match="hearthis.at"):
        client.search("frenchcore", platform="hearthis")
    with pytest.raises(ytclient.YtClientError):
        client.list_source("https://hearthis.at/frenchcore-fabrik/")
    assert _FakeYDL.seen == []


def test_throttle_per_platform_counters(db):
    s = config.defaults()
    now = {"t": datetime(2026, 11, 18, 12, 0, tzinfo=UTC)}
    yt = Throttle(
        db,
        lambda: s.throttle,
        clock=lambda: now["t"],
        sleep=lambda x: None,
        platform_settings=config.platform_throttle_settings(lambda: s),
    )
    mc, ht = yt.platform("mixcloud"), yt.platform("hearthis")
    assert mc.label == "Mixcloud" and ht.label == "hearthis.at"
    s.hearthis.backoff_initial_hours = 3
    assert ht.handle_error("HTTP Error 429: Too Many Requests")
    assert ht.backoff_until() == now["t"] + timedelta(hours=3)
    with pytest.raises(BackoffActive):
        ht.check_backoff()
    mc.check_backoff()
    yt.check_backoff()
    mc.before_request("search")
    assert mc.searches_last_hour() == 1 and ht.searches_last_hour() == 0
    assert yt.searches_last_hour() == 0
    assert mc._metadata_lock_name == "metadata-mixcloud"
    assert ht._throttle_lock_name == "throttle-hearthis"
    names = [t.platform_name for t in yt.platforms()]
    assert names == ["youtube", "soundcloud", "mixcloud", "hearthis"]
    st = status.platform_status(s, yt)
    assert set(st) == {"youtube", "soundcloud", "mixcloud", "hearthis"}
    assert st["hearthis"]["backoff"]["active"] and not st["mixcloud"]["backoff"]["active"]


def test_track_pages_for_open_and_watch(db):
    db.upsert_video(
        {
            "id": "ht:4001",
            "title": "x",
            "url": "https://hearthis.at/frenchcore-fabrik/frenchcore-podcast-1/",
            "channel_id": "ht:frenchcore-fabrik",
            "channel_url": "https://hearthis.at/frenchcore-fabrik/",
        }
    )
    db.upsert_video({"id": "mc:a_b", "title": "y", "url": "https://soundcloud.com/a/b"})
    assert discover.track_page(db, "ht:4001").startswith("https://hearthis.at/")
    assert discover.track_page(db, "mc:a_b") is None  # host of another platform
    assert discover.channel_page(db, "ht:frenchcore-fabrik") == (
        "https://hearthis.at/frenchcore-fabrik/"
    )
    assert discover.clean_platform({"platform": "hearthis"}) == "hearthis"
    assert discover.clean_platform({"platform": "bandcamp"}) is None


# --------------------------------------------------------------------------- watchlist


@pytest.mark.parametrize(
    ("url", "stype", "error"),
    [
        ("https://www.mixcloud.com/DJ_Thera/", "channel", None),
        ("https://www.mixcloud.com/DJ_Thera/uploads/", "channel", None),
        ("https://www.mixcloud.com/DJ_Thera/playlists/uptempo/", "playlist", None),
        ("https://www.mixcloud.com/DJ_Thera/playlists/uptempo/", "channel", "type"),
        ("https://www.mixcloud.com/DJ_Thera/", "playlist", "playlist"),
        ("https://www.mixcloud.com/DJ_Thera/hardcore-session-1/", "channel", "unsupported"),
        ("https://www.mixcloud.com/discover/hardcore/", "channel", "unsupported"),
        ("https://hearthis.at/frenchcore-fabrik/", "channel", None),
        ("https://hearthis.at/frenchcore-fabrik/set/best-of/", "playlist", None),
        ("https://hearthis.at/frenchcore-fabrik/frenchcore-podcast-1/", "channel", "unsupported"),
        ("https://hearthis.at/search/", "channel", "unsupported"),
    ],
)
def test_validate_sources(url, stype, error):
    s = config.defaults()
    clean, errors = watchlist.validate_source({"type": stype, "name": "x", "url_or_query": url}, s)
    if error is None:
        assert errors == {} and clean["platform"] == platforms.url_platform(url)
    else:
        msg = errors["url_or_query"]
        label = platforms.label(platforms.url_platform(url))
        assert label in msg
        key = {
            "type": "source.platform_set_type",
            "playlist": "source.platform_playlist_expected",
            "unsupported": "source.platform_url_unsupported",
        }[error]
        from app.core.i18n import tr

        assert msg == tr(key, platform=label)


def test_validate_source_platform_off_and_searches():
    s = config.defaults()
    s.mixcloud.enabled = False
    _c, errors = watchlist.validate_source(
        {"type": "channel", "name": "x", "url_or_query": "https://www.mixcloud.com/DJ_Thera/"}, s
    )
    assert "Mixcloud" in errors["url_or_query"]
    clean, errors = watchlist.validate_source(
        {"type": "search", "name": "x", "url_or_query": "frenchcore", "platform": "hearthis"}, s
    )
    assert errors == {} and clean["platform"] == "hearthis"


def test_suggest_source_new_platforms():
    sug = watchlist.suggest_source
    assert sug("https://www.mixcloud.com/dj-thera/") == {
        "type": "channel",
        "platform": "mixcloud",
        "name": "Dj Thera",
        "url_normalized": "https://www.mixcloud.com/dj-thera/",
    }
    assert sug("mixcloud.com/DJ_Thera/playlists/uptempo-classics/")["url_normalized"] == (
        "https://www.mixcloud.com/DJ_Thera/playlists/uptempo-classics/"
    )
    r = sug("https://hearthis.at/frenchcore-fabrik/set/best-of/")
    assert r["type"] == "playlist" and r["platform"] == "hearthis"
    assert r["name"] == "Frenchcore Fabrik – Best Of"
    assert sug("https://hearthis.at/frenchcore-fabrik/frenchcore-podcast-1/")["type"] == ""


class _ListClient:
    def __init__(self, entries):
        self.entries = entries
        self.calls = []

    def list_source(self, url, n, **kw):
        self.calls.append(url)
        return ytclient.SourceListing(self.entries, source_name="DJ Thera")

    def search(self, *a, **kw):  # pragma: no cover - not used
        raise AssertionError


def test_watchlist_check_mixcloud_source_into_inbox(db):
    s = config.defaults()
    sid = db.add_source("channel", "x", "https://www.mixcloud.com/DJ_Thera/", platform="mixcloud")
    entries = [
        ytclient.normalize_entry(e, "mixcloud")
        for e in [
            {
                "id": "DJ_Thera_hardcore-session-1",
                "url": "https://www.mixcloud.com/DJ_Thera/hardcore-session-1/",
                "title": "Hardcore Session #1 liveset",
                "duration": 3607,
                "timestamp": 1768500000,
                "uploader": "DJ Thera",
                "uploader_id": "DJ_Thera",
            }
        ]
    ]
    src = db.get_source(sid)
    res = watchlist.check_source(src, client=_ListClient(entries), db=db, settings=s)
    assert res.inbox == 1
    row = db.get_video("mc:DJ_Thera_hardcore-session-1")
    assert row["status"] == "inbox" and row["platform"] == "mixcloud"
    assert row["url"] == "https://www.mixcloud.com/DJ_Thera/hardcore-session-1/"


def test_id_tag_per_platform(tmp_path):
    from mutagen.id3 import ID3

    from tests.audio_fixtures import make_mp3

    f = tmp_path / "a.mp3"
    make_mp3(f)
    tagging.write_tags(
        f,
        {
            "title": "t",
            "artist": "a",
            "id": "DJ_Thera_x",
            "platform": "mixcloud",
            "source": "Mixcloud",
        },
    )
    tags = ID3(f)
    assert str(tags.getall("TXXX:MIXCLOUD_ID")[0].text[0]) == "DJ_Thera_x"
    assert not tags.getall("TXXX:YOUTUBE_ID")


def test_mixcloud_search_follows_only_the_api_host(api, monkeypatch):
    """Review v0.10.0 m2: a `paging.next` on another host or scheme ends the search."""
    page = fixture("mixcloud_search")
    for bad in (
        "https://evil.example/search/?offset=2",
        "http://api.mixcloud.com/search/?offset=2",
        "https://api.mixcloud.com.evil.example/x?offset=2",
    ):
        api.clear()
        data = {**page, "paging": {"next": bad}}
        monkeypatch.setattr(
            InfoExtractor,
            "_download_json",
            lambda self, url, vid, *a, _d=data, **kw: (api.append((url, kw.get("query"))), _d)[1],
        )
        info = _flat(
            "mcsearch10:hardcore", "mixcloud", "search", ("head", 10), ie_key="HcMixcloudSearch"
        )
        assert len(api) == 1 and len(info["entries"]) == 2, bad  # one entry has no url


def test_mixcloud_newest_last_listing_stops_past_the_cap(api, monkeypatch):
    """Review v0.10.0 m1: a `newest_last` (tail) listing stops paging one entry past
    NEWEST_LAST_MAX instead of walking the whole playlist."""
    monkeypatch.setattr(ytclient, "NEWEST_LAST_MAX", 2)
    url = ytclient.normalize_source_url("https://www.mixcloud.com/DJ_Thera/")
    info = _flat(url, "mixcloud", "list", ("tail", 2))
    assert len([c for c in api if "graphql" in c[0]]) == 1  # page 2 never requested
    assert len(info["entries"]) >= 3
