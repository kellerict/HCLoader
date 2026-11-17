"""Phase 7a: SoundCloud as second platform - ids, options, real yt-dlp SoundCloud extractors with
a mocked HTTP layer (no network), throttle per platform, filters, duplicates, watchlist, names."""

from __future__ import annotations

import sqlite3
from datetime import UTC, datetime, timedelta

import pytest
import yt_dlp
from yt_dlp.extractor import soundcloud as sc

from app.core import config, duplicates, filters, paths, platforms, sidecar, watchlist, ytclient
from app.core import db as dbmod
from app.core.db import Database
from app.core.throttle import BackoffActive, Throttle

# pre-v0.2.0 behaviour tests assert the German texts (pins the de catalog)
pytestmark = pytest.mark.usefixtures("german_messages")

# --------------------------------------------------------------------------- ids / platforms


def test_platform_ids():
    assert platforms.platform_of("abcdefghijk") == "youtube"
    assert platforms.platform_of("sc:123456789") == "soundcloud"
    assert platforms.native_id("sc:123456789") == "123456789"
    assert platforms.file_id("sc:123456789") == "sc-123456789"
    assert platforms.file_id("abcdefghijk") == "abcdefghijk"
    assert platforms.archive_line("sc:42") == "soundcloud 42"
    assert platforms.archive_line("abcdefghijk") == "youtube abcdefghijk"
    assert platforms.is_valid_db_id("sc:42") and not platforms.is_valid_db_id("sc:abc")
    assert ytclient.extract_video_id("sc:42") == "sc:42"
    assert ytclient.watch_url("sc:42") == "https://api.soundcloud.com/tracks/42"
    # the URL yt-dlp gets for a download is a single track for SoundcloudIE
    assert sc.SoundcloudIE.suitable(ytclient.watch_url("sc:42"))
    assert platforms.url_platform("https://m.soundcloud.com/dj") == "soundcloud"
    assert platforms.url_platform("https://youtu.be/x") == "youtube"
    assert platforms.url_platform("https://example.com") is None


def test_source_urls():
    norm = ytclient.normalize_source_url
    assert norm("https://soundcloud.com/dj-x") == "https://soundcloud.com/dj-x/tracks"
    assert norm("https://soundcloud.com/dj-x/") == "https://soundcloud.com/dj-x/tracks"
    assert norm("https://soundcloud.com/dj-x/tracks") == "https://soundcloud.com/dj-x/tracks"
    assert norm("https://soundcloud.com/dj-x/sets/abc") == "https://soundcloud.com/dj-x/sets/abc"
    assert ytclient.soundcloud_source_parts("https://soundcloud.com/discover") is None
    assert ytclient.soundcloud_source_parts("https://soundcloud.com/dj-x/sets/a-b") == (
        "dj-x",
        "sets",
        "a-b",
    )


# --------------------------------------------------------------------------- settings / options


def test_settings_soundcloud_section_and_german_errors():
    s = config.defaults()
    assert s.soundcloud.enabled is True
    assert s.soundcloud.max_searches_per_hour == s.throttle.max_searches_per_hour == 20
    assert s.soundcloud.sleep_requests == 3 and s.soundcloud.max_downloads_per_day == 25
    assert s.download.keep_original_soundcloud is True
    assert s.filters.hide_cross_platform_duplicates is False
    assert s.throttle_for("soundcloud") is s.soundcloud and s.throttle_for("youtube") is s.throttle
    values = s.to_dict()
    values["soundcloud"].update(max_searches_per_hour=0, sleep_interval=60, max_sleep_interval=5)
    values["download"]["keep_original_soundcloud"] = "vielleicht"
    errors = config.validate_settings(values)
    assert errors["soundcloud.max_searches_per_hour"] == "Muss mindestens 1 sein"
    assert errors["soundcloud.max_sleep_interval"].startswith("Muss grösser")
    assert errors["download.keep_original_soundcloud"] == "Muss ja oder nein sein"
    values = s.to_dict()
    values["storage"]["path_template"] = "{platform}/{genre}/{title} [{id}]"
    assert config.validate_settings(values) == {}
    assert "soundcloud:" in config.render_yaml(s)


def test_build_ydl_opts_per_platform():
    s = config.defaults()
    yt = ytclient.build_ydl_opts(s, "search")
    assert "js_runtimes" in yt and "youtubetab" in yt["extractor_args"]
    s.soundcloud.sleep_requests = 7
    s.network.cookies_from_browser = "edge"
    for purpose in ("search", "list", "resolve", "download"):
        o = ytclient.build_ydl_opts(s, purpose, "soundcloud")
        assert "js_runtimes" not in o and "cookiesfrombrowser" not in o
        assert o["extractor_args"] == {"soundcloud": {"formats": ytclient.SC_FORMATS}}
        assert not any(k.startswith("youtube") for k in o["extractor_args"])
        assert o["sleep_interval_requests"] == 7 and o["retries"] == 0
    dl = ytclient.build_ydl_opts(s, "download", "soundcloud")
    assert "postprocessors" not in dl  # keep_original_soundcloud (default)
    assert dl["outtmpl"]["default"] == "sc-%(id)s.%(ext)s"
    assert dl["format"] == ytclient.SC_FORMAT
    s.download.keep_original_soundcloud = False
    s.soundcloud.limit_rate_mb = 1
    dl = ytclient.build_ydl_opts(s, "download", "soundcloud")
    assert dl["postprocessors"][0]["preferredcodec"] == "mp3"
    assert dl["ratelimit"] == 1024 * 1024
    with pytest.raises(ValueError):
        ytclient.build_ydl_opts(s, "search", "vimeo")


# --------------------------------------------------------------------------- real extractors


def _track(i, duration=3_600_000, policy="ALLOW", full=True):
    t: dict = {"id": i, "kind": "track"}
    if full:
        t.update(
            {
                "title": f"Hardcore Mix {i}",
                "duration": duration,
                "full_duration": 3_600_000,
                "created_at": "2026-10-03T12:00:00Z",
                "permalink_url": f"https://soundcloud.com/dj-x/mix-{i}",
                "policy": policy,
                "user": {
                    "id": 77,
                    "username": "DJ X",
                    "permalink_url": "https://soundcloud.com/dj-x",
                },
                "artwork_url": f"https://i1.sndcdn.com/artworks-{i}-large.jpg",
                "playback_count": 5,
                "uri": f"https://api.soundcloud.com/tracks/{i}",
            }
        )
    return t


@pytest.fixture
def sc_api(monkeypatch):
    """Mocked SoundCloud HTTP layer of yt-dlp's extractor (API JSON); every other request
    (webpages, HEAD for thumbnails) fails the test."""
    calls: list[tuple[str, dict]] = []

    def fake_json(self, url, video_id, *a, **kw):
        q = dict(kw.get("query") or {})
        calls.append((url.split("?")[0], q))
        if "search/tracks" in url:
            assert "limit=5" in url  # N results = one page (max. 200)
            return {"collection": [_track(1), _track(2, 30_000, "SNIP")], "next_href": None}
        if "resolve" in url and url.endswith("/dj-x"):
            return {"id": 77, "username": "DJ X", "kind": "user"}
        if "resolve" in url and "/sets/" in url:
            return {
                "id": 9,
                "kind": "playlist",
                "title": "Hardcore Sessions",
                "user": {"id": 77, "username": "DJ X"},
                "tracks": [_track(1), _track(2), {"id": 3, "kind": "track"}, {"id": 4}],
            }
        if url.endswith("/tracks") and "users" not in url:
            return [_track(int(x)) for x in q["ids"].split(",")]
        if "users/77/tracks" in url:
            return {"collection": [_track(5), _track(6)], "next_href": None}
        raise AssertionError(url)

    def no_request(self, *a, **kw):
        raise AssertionError(f"unerwarteter Request: {a[:1]}")

    monkeypatch.setattr(sc.SoundcloudBaseIE, "_download_json", fake_json)
    monkeypatch.setattr(sc.SoundcloudBaseIE, "_request_webpage", no_request)
    monkeypatch.setattr(
        sc.SoundcloudBaseIE, "_initialize_pre_login", lambda self: setattr(self, "_CLIENT_ID", "x")
    )
    return calls


def _flat(url, purpose, window, playlistend=None):
    opts = ytclient.build_ydl_opts(config.defaults(), purpose, "soundcloud")
    opts["cachedir"] = False
    if playlistend:
        opts["playlistend"] = playlistend
    with yt_dlp.YoutubeDL(opts) as ydl:
        ytclient._install_sc_flat_extractors(ydl, window)
        return ydl.sanitize_info(ydl.extract_info(url, download=False))


def test_flat_search_one_request_no_thumbnail_head(sc_api):
    info = _flat("scsearch5:hardcore", "search", ("head", 5))
    entries = [ytclient.normalize_entry(e, "soundcloud") for e in info["entries"]]
    assert [c[0] for c in sc_api] == ["https://api-v2.soundcloud.com/search/tracks"]
    a, b = entries
    assert a["id"] == "sc:1" and a["platform"] == "soundcloud" and a["duration"] == 3600
    assert a["upload_date"] == "20261003" and a["date_approx"] is False
    assert a["channel_id"] == "sc:77" and a["channel_name"] == "DJ X"
    assert a["channel_url"] == "https://soundcloud.com/dj-x"
    assert a["url"] == "https://soundcloud.com/dj-x/mix-1"
    assert a["thumbnail"] == "https://i1.sndcdn.com/artworks-1-t500x500.jpg"
    assert a["preview"] is False and b["preview"] is True  # policy SNIP
    assert filters.passes(b, config.defaults().filters)[1] == "Nur Vorschau (Go+)"


def test_flat_user_tracks_keep_metadata(sc_api):
    url = ytclient.normalize_source_url("https://soundcloud.com/dj-x")
    info = _flat(url, "list", ("head", 5), playlistend=5)
    entries = [ytclient.normalize_entry(e, "soundcloud") for e in info["entries"]]
    # resolve user + one page of tracks (limit 200), nothing per entry
    assert [c[0].rsplit("/", 1)[-1] for c in sc_api] == ["resolve", "tracks"]
    assert [e["id"] for e in entries] == ["sc:5", "sc:6"]
    assert entries[0]["duration"] == 3600 and entries[0]["channel_name"] == "DJ X"
    assert ytclient.listing_name(info, url, "soundcloud") == "DJ X"


def test_flat_set_fetches_only_stubs_in_window(sc_api):
    url = "https://soundcloud.com/dj-x/sets/hardcore-sessions"
    info = _flat(url, "list", ("tail", 3))
    entries = [ytclient.normalize_entry(e, "soundcloud") for e in info["entries"]]
    assert [e["id"] for e in entries] == ["sc:1", "sc:2", "sc:3", "sc:4"]
    assert all(e["duration"] == 3600 for e in entries)
    batch = [c for c in sc_api if c[0].endswith("/tracks")]
    assert len(sc_api) == 2 and batch[0][1]["ids"] == "3,4"
    assert ytclient.listing_name(info, url, "soundcloud") == "DJ X – Hardcore Sessions"


def test_listing_names_youtube():
    assert ytclient.listing_name(
        {"title": "Partyraiser - Videos", "channel": "Partyraiser"},
        "https://www.youtube.com/@partyraiser/videos",
    ) == ("Partyraiser")
    assert ytclient.listing_name(
        {"title": "Partyraiser - Videos"}, "https://www.youtube.com/@p/videos"
    ) == ("Partyraiser")
    assert (
        ytclient.listing_name(
            {"title": "Best of 2026", "channel": "X"},
            "https://www.youtube.com/playlist?list=PL1",
        )
        == "Best of 2026"
    )


def test_only_previews():
    assert ytclient._only_previews({"formats": [{"format_id": "hls_mp3_preview"}]})
    assert not ytclient._only_previews(
        {"formats": [{"format_id": "hls_mp3_preview"}, {"format_id": "hls_aac_160k"}]}
    )
    assert not ytclient._only_previews({})


# --------------------------------------------------------------------------- throttle


def test_throttle_per_platform_state_and_backoff(db):
    s = config.defaults()
    now = {"t": datetime(2026, 11, 17, 12, 0, tzinfo=UTC)}
    yt = Throttle(
        db,
        lambda: s.throttle,
        clock=lambda: now["t"],
        sleep=lambda x: None,
        platform_settings={"soundcloud": lambda: s.soundcloud},
    )
    sc_th = yt.platform("soundcloud")
    assert yt.platform("youtube") is yt and sc_th.platform("youtube") is yt
    assert sc_th.platform("soundcloud") is sc_th and sc_th.label == "SoundCloud"
    s.soundcloud.backoff_initial_hours = 2
    assert sc_th.handle_error("HTTP Error 429: Too Many Requests")
    assert sc_th.backoff_until() == now["t"] + timedelta(hours=2)
    assert yt.backoff_until() is None and yt.can_download()
    with pytest.raises(BackoffActive):
        sc_th.check_backoff()
    yt.check_backoff()  # YouTube stays free
    assert db.get_state("soundcloud.backoff_until") and db.get_state("backoff_until") is None
    # counters are separate
    sc_th.clear_backoff_manual()
    sc_th.before_request("search")
    assert sc_th.searches_last_hour() == 1 and yt.searches_last_hour() == 0
    sc_th.register_download()
    assert sc_th.downloads_today() == 1 and yt.downloads_today() == 0
    yt.start_run()  # a run resets the run counter of every platform
    assert sc_th.downloads_this_run() == 0
    # separate cross-process locks
    assert sc_th._metadata_lock_name == "metadata-soundcloud"
    assert sc_th._throttle_lock_name == "throttle-soundcloud"
    assert yt._metadata_lock_name == "metadata"
    # finish_run per platform: only SoundCloud's escalation level is reset
    yt.trigger_backoff("x")
    yt.clear_backoff_manual()
    yt.finish_run(True, platforms=["soundcloud"])
    assert sc_th.backoff_level() == 0 and yt.backoff_level() == 1


# --------------------------------------------------------------------------- filters / duplicates


def test_preview_filter():
    f = config.defaults().filters
    f.min_duration = 0
    sc30 = {"id": "sc:1", "platform": "soundcloud", "title": "Hardcore Mix", "duration": 30}
    assert filters.passes(sc30, f) == (False, "Nur Vorschau (Go+)")
    yt30 = {**sc30, "id": "abcdefghijk", "platform": "youtube"}
    assert filters.passes(yt30, f)[0] is True
    assert filters.passes({**sc30, "duration": 3600, "preview": True}, f)[1] == (
        "Nur Vorschau (Go+)"
    )


def test_duplicate_detection(db):
    assert duplicates.title_tokens("Angerfist @ Defqon.1 2025 (Official Audio) [HQ]") == {
        "angerfist",
        "defqon",
        "1",
        "2025",
    }
    db.upsert_video(
        {
            "id": "ytAngerfist",
            "title": "Angerfist @ Defqon.1 2025 (Official Video)",
            "duration": 3700,
            "status": "done",
        }
    )
    db.upsert_video({"id": "ytOther0001", "title": "Angerfist @ Defqon.1 2025", "duration": 3000})
    hit = {"id": "sc:9", "platform": "soundcloud", "title": "ANGERFIST @ DEFQON.1 2025"}
    assert duplicates.find_duplicate(db, {**hit, "duration": 3704}) == {
        "id": "ytAngerfist",
        "platform": "youtube",
        "title": "Angerfist @ Defqon.1 2025 (Official Video)",
    }
    assert duplicates.find_duplicate(db, {**hit, "duration": 3710}) is None  # > 5 s
    other = {**hit, "title": "Angerfist Live Masters of Hardcore 2025", "duration": 3700}
    assert duplicates.find_duplicate(db, other) is None  # title too different
    # same platform never counts
    assert duplicates.find_duplicate(db, {**hit, "id": "x" * 11, "platform": "youtube"}) is None


# --------------------------------------------------------------------------- tags / paths / sidecar


def test_paths_tags_sidecar_for_soundcloud(tmp_path):
    path = paths.build_target_path(
        tmp_path,
        "{platform}/{genre}/{date} - {title} [{id}]",
        {
            "id": platforms.file_id("sc:123456789"),
            "platform": "soundcloud",
            "title": "Mix",
            "genre": "Hardcore",
            "upload_date": "20261003",
        },
    )
    assert path.relative_to(tmp_path).as_posix() == (
        "SoundCloud/Hardcore/2026-10-03 - Mix [sc-123456789].mp3"
    )
    data = sidecar.build({"id": "sc:123456789", "title": "Mix"}, source="SoundCloud")
    p = sidecar.write("sc:123456789", data)
    assert p is not None and p.name.startswith("sc-123456789.") and ":" not in p.name
    assert sidecar.read("sc:123456789")["source"] == "SoundCloud"
    # YouTube id that looks like the file id of a SoundCloud track: different sidecar
    assert sidecar.sidecar_path("sc-12345678") != sidecar.sidecar_path("sc:12345678")


def test_id3_soundcloud_id(tmp_path):
    import shutil
    import subprocess

    if shutil.which("ffmpeg") is None:
        pytest.skip("ffmpeg fehlt")
    from mutagen.id3 import ID3

    from app.core import tagging

    mp3 = tmp_path / "a.mp3"
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono"]
        + ["-t", "1", "-q:a", "9", str(mp3)],
        check=True,
    )
    meta = {"title": "Mix", "id": "123", "platform": "soundcloud", "source": "SoundCloud"}
    tagging.write_tags(mp3, meta)
    tags = ID3(mp3)
    assert str(tags["TXXX:SOUNDCLOUD_ID"]) == "123" and str(tags["TXXX:SOURCE"]) == "SoundCloud"
    assert "TXXX:YOUTUBE_ID" not in tags
    # re-tag as YouTube replaces the own id frame
    tagging.write_tags(mp3, {"title": "Mix", "id": "abcdefghijk"}, keep_existing=True)
    tags = ID3(mp3)
    assert "TXXX:SOUNDCLOUD_ID" not in tags and str(tags["TXXX:YOUTUBE_ID"]) == "abcdefghijk"


# --------------------------------------------------------------------------- migration


def test_migration_v5_existing_rows_become_youtube(tmp_path):
    path = tmp_path / "old.db"
    conn = sqlite3.connect(path, isolation_level=None)
    dbmod.migrate(conn, dbmod.MIGRATIONS[:4])
    conn.execute("INSERT INTO videos(id, title, status) VALUES ('abcdefghijk', 'Alt', 'done')")
    conn.execute("INSERT INTO sources(type, name, url_or_query) VALUES ('channel','K','u')")
    conn.close()
    with Database(path) as d:
        assert d.schema_version() == len(dbmod.MIGRATIONS) >= 6
        row = d.get_video("abcdefghijk")
        assert row["platform"] == "youtube" and row["preview"] == 0 and row["url"] is None
        src = d.list_sources()[0]
        assert src["platform"] == "youtube" and src["name_auto"] == 0
        d.upsert_video({"id": "sc:5", "title": "Neu"})
        assert d.get_video("sc:5")["platform"] == "soundcloud"


def test_queue_order_skips_blocked_platform(db):
    db.upsert_video({"id": "sc:1"})
    db.upsert_video({"id": "abcdefghijk"})
    db.enqueue(["sc:1", "abcdefghijk"])
    assert db.queued_platforms() == ["soundcloud", "youtube"]
    assert db.next_queued()["id"] == "sc:1"
    assert db.next_queued(exclude_platforms=["soundcloud"])["id"] == "abcdefghijk"


# --------------------------------------------------------------------------- watchlist


def _valid(settings, **over):
    data = {"type": "channel", "name": "DJ", "url_or_query": "https://soundcloud.com/dj-x"}
    data.update(over)
    return watchlist.validate_source(data, settings)


def test_validate_soundcloud_sources():
    s = config.defaults()
    clean, errors = _valid(s)
    assert errors == {} and clean["platform"] == "soundcloud"
    for url in ("https://soundcloud.com/dj-x/tracks", "https://m.soundcloud.com/dj_x/"):
        assert _valid(s, url_or_query=url)[1] == {}
    clean, errors = _valid(
        s,
        type="playlist",
        url_or_query="https://soundcloud.com/dj-x/sets/hc-sessions",
        newest_last=True,
    )
    assert errors == {} and clean["newest_last"] is True and clean["platform"] == "soundcloud"
    bad = {
        "https://soundcloud.com/dj-x/some-track": "einzelne Tracks",
        "https://soundcloud.com/discover": "Nicht unterstützte SoundCloud-URL",
        "https://soundcloud.com/dj-x/likes": "Nicht unterstützte SoundCloud-URL",
        "https://soundcloud.com/dj-x/sets/abc": "Typ «Playlist»",
        "https://vimeo.com/123": "Nicht unterstützte URL",
    }
    for url, text in bad.items():
        assert text in _valid(s, url_or_query=url)[1]["url_or_query"], url
    assert (
        "SoundCloud-Playlist-URL"
        in (
            _valid(s, type="playlist", url_or_query="https://soundcloud.com/dj-x")[1][
                "url_or_query"
            ]
        )
    )
    clean, errors = _valid(s, type="search", url_or_query="uptempo", platform="soundcloud")
    assert errors == {} and clean["platform"] == "soundcloud"
    assert "platform" in _valid(s, type="search", url_or_query="x", platform="vimeo")[1]
    s.soundcloud.enabled = False
    assert "ausgeschaltet" in _valid(s)[1]["url_or_query"]
    # duplicate: same user with or without /tracks
    s.soundcloud.enabled = True
    existing = [
        {
            "id": 1,
            "type": "channel",
            "name": "A",
            "url_or_query": "https://soundcloud.com/dj-x",
            "platform": "soundcloud",
        }
    ]
    errs = watchlist.validate_source(
        {"type": "channel", "name": "B", "url_or_query": "https://www.soundcloud.com/dj-x/tracks"},
        s,
        existing=existing,
    )[1]
    assert "existiert bereits" in errs["url_or_query"]


@pytest.mark.parametrize(
    ("text", "hint", "expected"),
    [
        ("https://www.youtube.com/@Partyraiser", None, ("channel", "youtube", "Partyraiser")),
        ("youtube.com/@angerfist/videos", None, ("channel", "youtube", "angerfist")),
        ("https://www.youtube.com/channel/UCabcdef", None, ("channel", "youtube", "")),
        ("https://www.youtube.com/c/Masters", None, ("channel", "youtube", "Masters")),
        ("https://youtube.com/user/Thunderdome", None, ("channel", "youtube", "Thunderdome")),
        ("https://www.youtube.com/playlist?list=PL123", None, ("playlist", "youtube", "")),
        ("https://soundcloud.com/dj-thera", None, ("channel", "soundcloud", "Dj Thera")),
        ("https://soundcloud.com/DJ_Mad-Dog/tracks", None, ("channel", "soundcloud", "DJ Mad Dog")),
        (
            "https://soundcloud.com/dj-x/sets/hardcore-sessions",
            None,
            ("playlist", "soundcloud", "Dj X – Hardcore Sessions"),
        ),
        ("uptempo yearmix", None, ("search", "youtube", "uptempo yearmix")),
        ("https://soundcloud.com/x", "search", ("search", "youtube", "https://soundcloud.com/x")),
        ("https://soundcloud.com/dj-x/a-track", None, ("", "soundcloud", "")),
        ("https://example.com/@x", None, ("", "youtube", "")),
        ("", "channel", ("channel", "youtube", "")),
    ],
)
def test_suggest_source(text, hint, expected):
    res = watchlist.suggest_source(text, hint)
    assert set(res) == {"type", "platform", "name", "url_normalized"}
    assert (res["type"], res["platform"], res["name"]) == expected


def test_suggest_source_normalized_urls():
    assert watchlist.suggest_source("www.soundcloud.com/dj-x/tracks?x=1")["url_normalized"] == (
        "https://soundcloud.com/dj-x"
    )
    assert watchlist.suggest_source("https://www.youtube.com/watch?v=abc&list=PLx")[
        "url_normalized"
    ] == ("https://www.youtube.com/playlist?list=PLx")


class ListClient:
    def __init__(self, entries, name):
        self.entries, self.name, self.calls = entries, name, []

    def list_source(self, url, max_entries=None, *, newest_last=False, cancel_event=None):
        self.calls.append(url)
        return ytclient.SourceListing(list(self.entries), source_name=self.name)

    def search(self, query, n=None, *, cancel_event=None, platform="youtube", **kw):
        self.calls.append((platform, query))
        return list(self.entries)


def sc_entry(i, title="Hardcore Mix", duration=3600, **kw):
    return {
        "id": f"sc:{i}",
        "platform": "soundcloud",
        "title": title,
        "duration": duration,
        "channel_id": "sc:77",
        "channel_name": "DJ X",
        "url": f"https://soundcloud.com/dj-x/m{i}",
        "channel_url": "https://soundcloud.com/dj-x",
        **kw,
    }


def test_watchlist_soundcloud_rename_incremental_preview(db):
    s = config.defaults()
    sid = db.add_source(
        "channel", "Dj X", "https://soundcloud.com/dj-x", platform="soundcloud", name_auto=True
    )
    client = ListClient([sc_entry(3), sc_entry(2, duration=30), sc_entry(1)], "DJ X")
    events: list[dict] = []
    res = watchlist.check_all(
        client=client, db=db, throttle=None, settings=s, on_source=events.append
    )
    assert res.checked == 1 and res.found == 3 and res.inbox == 2
    src = db.get_source(sid)
    assert src["name"] == "DJ X" and src["name_auto"] == 1  # replaced, stays automatic
    assert events[-1]["name"] == "DJ X"
    assert db.get_video("sc:2")["status"] == "new"  # Go+ preview filtered
    row = db.get_video("sc:3")
    assert row["platform"] == "soundcloud" and row["url"] == "https://soundcloud.com/dj-x/m3"
    # incremental: newest first, stop at the first one this source has seen
    client.entries = [sc_entry(4), sc_entry(3), sc_entry(99)]
    res = watchlist.check_all(client=client, db=db, throttle=None, settings=s)
    assert res.found == 1 and db.get_video("sc:99") is None


def test_watchlist_no_rename_after_manual_name(db):
    s = config.defaults()
    sid = db.add_source(
        "channel", "Mein Name", "https://soundcloud.com/dj-x", platform="soundcloud"
    )
    watchlist.check_all(client=ListClient([sc_entry(1)], "DJ X"), db=db, throttle=None, settings=s)
    assert db.get_source(sid)["name"] == "Mein Name"
    # search sources keep their query as name even with name_auto
    sid2 = db.add_source("search", "uptempo", "uptempo", platform="soundcloud", name_auto=True)
    client = ListClient([sc_entry(2)], "egal")
    watchlist.check_all(client=client, db=db, throttle=None, settings=s, ids=[sid2])
    assert db.get_source(sid2)["name"] == "uptempo"
    assert client.calls == [("soundcloud", "uptempo")]


def test_watchlist_duplicate_goes_to_inbox_not_queue(db):
    s = config.defaults()
    db.upsert_video(
        {"id": "ytDominator", "title": "Partyraiser @ Dominator 2026 Mix", "duration": 3600}
    )
    db.set_status("ytDominator", "done")
    db.add_source(
        "channel", "DJ X", "https://soundcloud.com/dj-x", platform="soundcloud", auto_download=True
    )
    queued: list[list[str]] = []
    client = ListClient(
        [
            sc_entry(1, title="Partyraiser @ Dominator 2026 (Mix)", duration=3603),
            sc_entry(2, title="Other Hardcore Mix", duration=3600),
        ],
        "DJ X",
    )
    res = watchlist.check_all(
        client=client,
        db=db,
        throttle=None,
        settings=s,
        enqueue=lambda ids: queued.append(ids) or ids,
    )
    assert queued == [["sc:2"]]  # the duplicate waits for a decision in the inbox
    assert db.get_video("sc:1")["status"] == "inbox" and res.sources[0].duplicates == 1
    # option: hide duplicates -> not even in the inbox
    s.filters.hide_cross_platform_duplicates = True
    client.entries = [sc_entry(5, title="Partyraiser @ Dominator 2026", duration=3598)]
    watchlist.check_all(client=client, db=db, throttle=None, settings=s)
    assert db.get_video("sc:5")["status"] == "new"


def test_watchlist_soundcloud_backoff_skips_only_soundcloud(db):
    s = config.defaults()
    th = Throttle(db, lambda: s.throttle, platform_settings={"soundcloud": lambda: s.soundcloud})
    db.add_source("channel", "SC1", "https://soundcloud.com/a", platform="soundcloud")
    db.add_source("channel", "SC2", "https://soundcloud.com/b", platform="soundcloud")
    db.add_source("channel", "YT", "https://www.youtube.com/@yt")

    class Client:
        calls: list[str] = []

        def list_source(self, url, max_entries=None, **kw):
            self.calls.append(url)
            if "soundcloud" in url:
                th.platform("soundcloud").trigger_backoff("HTTP Error 429")
                raise BackoffActive(th.platform("soundcloud").backoff_until(), "429")
            return [{"id": "abcdefghijk", "title": "Hardcore Mix", "duration": 3600}]

    events: list[dict] = []
    res = watchlist.check_all(
        client=Client(), db=db, throttle=th, settings=s, on_source=events.append
    )
    assert Client.calls == ["https://soundcloud.com/a", "https://www.youtube.com/@yt"]
    assert res.backoff and res.checked == 1 and res.errors == 1
    assert db.get_video("abcdefghijk")["status"] == "inbox"
    skipped = [e for e in events if e.get("error", "").startswith("SoundCloud blockiert")]
    assert len(skipped) == 2
    assert th.backoff_until() is None
    # only SoundCloud sources left in backoff -> watchlist still allowed (YouTube free)
    assert watchlist.blocked_until(db, th) is None
    th.trigger_backoff("x")
    assert watchlist.blocked_until(db, th) is not None


# --------------------------------------------------------------------------- Review 7a/8: M1, M2


@pytest.fixture
def sc_geo(monkeypatch):
    """Like `sc_api`, but one track of every answer has `policy: BLOCK` (geo-blocked)."""
    calls: list[str] = []

    def fake_json(self, url, video_id, *a, **kw):
        q = dict(kw.get("query") or {})
        calls.append(url.split("?")[0])
        if "search/tracks" in url:
            return {"collection": [_track(1, policy="BLOCK"), _track(2)], "next_href": None}
        if "resolve" in url and url.endswith("/dj-x"):
            return {"id": 77, "username": "DJ X", "kind": "user"}
        if "resolve" in url and "/sets/" in url:
            return {
                "id": 9,
                "kind": "playlist",
                "title": "Hardcore Sessions",
                "user": {"id": 77, "username": "DJ X"},
                "tracks": [_track(1, policy="BLOCK"), _track(2), {"id": 3, "kind": "track"}],
            }
        if url.endswith("/tracks") and "users" not in url:
            return [_track(int(x), policy="BLOCK") for x in q["ids"].split(",")]
        if "users/77/tracks" in url:
            return {"collection": [_track(5, policy="BLOCK"), _track(6)], "next_href": None}
        raise AssertionError(url)

    def no_request(self, *a, **kw):
        raise AssertionError(f"unerwarteter Request: {a[:1]}")

    monkeypatch.setattr(sc.SoundcloudBaseIE, "_download_json", fake_json)
    monkeypatch.setattr(sc.SoundcloudBaseIE, "_request_webpage", no_request)
    monkeypatch.setattr(
        sc.SoundcloudBaseIE, "_initialize_pre_login", lambda self: setattr(self, "_CLIENT_ID", "x")
    )
    return calls


@pytest.mark.parametrize(
    ("url", "purpose", "window", "blocked", "ok"),
    [
        ("scsearch5:hardcore", "search", ("head", 5), {"sc:1"}, {"sc:2"}),
        ("https://soundcloud.com/dj-x/tracks", "list", ("head", 5), {"sc:5"}, {"sc:6"}),
        (
            "https://soundcloud.com/dj-x/sets/hardcore-sessions",
            "list",
            ("head", 5),
            {"sc:1", "sc:3"},
            {"sc:2"},
        ),
    ],
)
def test_geo_blocked_track_does_not_abort_flat_listing(sc_geo, url, purpose, window, blocked, ok):
    """Review M1, real yt-dlp offline: with `policy: BLOCK` yt-dlp raised GeoRestrictedError
    for every flat entry (no formats in flat mode) and aborted the whole search/listing."""
    info = _flat(url, purpose, window, playlistend=5 if purpose == "list" else None)
    entries = {
        e["id"]: e for e in (ytclient.normalize_entry(x, "soundcloud") for x in info["entries"])
    }
    assert set(entries) == blocked | ok
    f = config.defaults().filters
    for vid in blocked:
        assert entries[vid]["geo_blocked"] is True and entries[vid]["duration"] == 3600
        assert filters.passes(entries[vid], f) == (False, "Nicht verfügbar (Region)")
    for vid in ok:
        assert entries[vid]["geo_blocked"] is False
        assert filters.passes(entries[vid], f)[0] is True


def test_geo_blocked_merge_error_keeps_entry(sc_geo, monkeypatch):
    """Review M1: an ExtractorError while merging one remembered track (here: the stock
    `_extract_info_dict` raising for this track) never aborts the listing; the entry stays
    (without merged metadata, but with its policy)."""
    from yt_dlp.utils import ExtractorError

    stock = sc.SoundcloudBaseIE._extract_info_dict

    def picky(self, info, full_title=None, secret_token=None, extract_flat=False):
        if str(info.get("id")) == "5":
            raise ExtractorError("kaputt", expected=True)
        return stock(self, info, full_title, secret_token, extract_flat)

    monkeypatch.setattr(sc.SoundcloudBaseIE, "_extract_info_dict", picky)
    info = _flat("https://soundcloud.com/dj-x/tracks", "list", ("head", 5), playlistend=5)
    entries = {e["id"]: e for e in info["entries"]}
    assert set(entries) == {"5", "6"}
    assert entries["5"]["sc_policy"] == "BLOCK" and "duration" not in entries["5"]
    assert entries["6"]["duration"] == 3600.0


def test_geo_blocked_column_migration_and_upsert(tmp_path):
    path = tmp_path / "v5.db"
    conn = sqlite3.connect(path, isolation_level=None)
    dbmod.migrate(conn, dbmod.MIGRATIONS[:5])
    conn.execute("INSERT INTO videos(id, title, status) VALUES ('sc:1', 'Alt', 'new')")
    conn.close()
    with Database(path) as d:
        assert d.schema_version() >= 6 and d.get_video("sc:1")["geo_blocked"] == 0
        d.upsert_video({"id": "sc:1", "geo_blocked": True})
        assert d.get_video("sc:1")["geo_blocked"] == 1
        d.upsert_video({"id": "sc:1", "title": "Neu"})  # no flag in the dict: unchanged
        assert d.get_video("sc:1")["geo_blocked"] == 1


@pytest.fixture
def fresh_sc_classes(monkeypatch):
    monkeypatch.setattr(ytclient, "_SC_FLAT_CLASSES", None)
    monkeypatch.setattr(ytclient, "_SC_WARNED", set())


def test_capability_check_passes_for_installed_ytdlp():
    assert ytclient._sc_check_capabilities(sc) == []


@pytest.mark.parametrize("what", ["info_dict", "extract_set", "headers", "class"])
def test_changed_ytdlp_internals_keep_stock_extractors(fresh_sc_classes, monkeypatch, caplog, what):
    """Review M2: a changed signature/attribute is detected before the classes are built;
    the stock extractors stay in use and the log gets one warning."""
    if what == "info_dict":

        def changed(self, info, full_title=None, secret_token=None):  # no extract_flat
            return {}

        monkeypatch.setattr(sc.SoundcloudBaseIE, "_extract_info_dict", changed)
    elif what == "extract_set":

        def changed_set(self, playlist):  # token dropped
            return {}

        monkeypatch.setattr(sc.SoundcloudPlaylistBaseIE, "_extract_set", changed_set)
    elif what == "headers":
        monkeypatch.setattr(sc.SoundcloudBaseIE, "_HEADERS", None)
    else:
        monkeypatch.delattr(sc, "SoundcloudSetIE")
    assert ytclient._sc_check_capabilities(sc)
    with pytest.raises(ytclient.ScIncompatible):
        ytclient._sc_flat_extractor_classes()

    added: list = []

    class Ydl:
        def add_info_extractor(self, ie):
            added.append(ie)

    caplog.set_level("WARNING", logger="app.core.ytclient")
    ytclient._install_sc_flat_extractors(Ydl(), ("head", 5))
    ytclient._install_sc_flat_extractors(Ydl(), ("head", 5))
    assert added == []
    warnings = [r for r in caplog.records if "SoundCloud-Erweiterung nicht aktiv" in r.message]
    assert len(warnings) == 1


def test_runtime_drift_in_override_falls_back_to_stock(
    sc_api, fresh_sc_classes, monkeypatch, caplog
):
    """Review M2: a TypeError inside an override (here: `_call_api` no longer takes the
    keyword `query` for the stub batch) falls back to the stock `_extract_set` instead of
    failing the whole listing; one warning in the log."""
    stock = sc.SoundcloudBaseIE._call_api

    def changed(self, *args, **kwargs):
        if "ids" in (kwargs.get("query") or {}):
            raise TypeError("_call_api() got an unexpected keyword argument 'query'")
        return stock(self, *args, **kwargs)

    monkeypatch.setattr(sc.SoundcloudBaseIE, "_call_api", changed)
    caplog.set_level("WARNING", logger="app.core.ytclient")
    info = _flat("https://soundcloud.com/dj-x/sets/hardcore-sessions", "list", ("tail", 3))
    entries = [ytclient.normalize_entry(e, "soundcloud") for e in info["entries"]]
    assert [e["id"] for e in entries] == ["sc:1", "sc:2", "sc:3", "sc:4"]
    assert [e["duration"] for e in entries] == [3600, 3600, None, None]  # stock: stubs stay
    assert len(sc_api) == 1  # only the resolve, the stub batch was never sent
    assert any("passt nicht zu dieser yt-dlp-Version" in r.message for r in caplog.records)


# --------------------------------------------------------------------------- Review 7a/8: M3, m4


@pytest.mark.parametrize(
    ("message", "sc_hit", "yt_hit"),
    [
        (
            "ERROR: [soundcloud:user] a: Unable to download JSON metadata: HTTP Error 403: "
            "Forbidden (caused by <HTTPError 403: Forbidden>)",
            True,
            False,
        ),
        ("ERROR: [soundcloud] Unable to download webpage: HTTP Error 403: Forbidden", True, False),
        ("[soundcloud:search] x: blocked by https://geo.captcha-delivery.com/captcha", True, False),
        (
            "[soundcloud] 1: Unable to download JSON metadata: HTTP Error 404: Not Found",
            False,
            False,
        ),
        (
            "[soundcloud] 1: Unable to download JSON metadata: HTTP Error 401: Unauthorized",
            False,
            False,
        ),
        ("ERROR: unable to download video data: HTTP Error 403: Forbidden", False, False),
        ("[youtube] abc: HTTP Error 403: Forbidden", False, False),
        ("ERROR: [soundcloud] 1: HTTP Error 429: Too Many Requests", True, True),
    ],
)
def test_soundcloud_bot_check_detection(db, message, sc_hit, yt_hit):
    from app.core.throttle import is_rate_limit_error

    assert is_rate_limit_error(message, "soundcloud") is sc_hit
    assert is_rate_limit_error(message) is yt_hit
    s = config.defaults()
    yt = Throttle(db, lambda: s.throttle, platform_settings={"soundcloud": lambda: s.soundcloud})
    assert yt.platform("soundcloud").handle_error(message) is sc_hit
    assert yt.handle_error(message) is yt_hit


def test_soundcloud_resolve_has_no_extractor_retry():
    s = config.defaults()
    assert ytclient.build_ydl_opts(s, "resolve", "soundcloud")["extractor_retries"] == 0
    assert ytclient.build_ydl_opts(s, "resolve", "youtube")["extractor_retries"] == 1
    assert ytclient.build_ydl_opts(s, "search", "soundcloud")["logger"].platform == "soundcloud"


def test_enqueue_refuses_previews_and_geo_blocked(db):
    """QA 7a/8: known Go+ previews / geo-blocked tracks are skipped by `enqueue`."""
    db.upsert_video({"id": "sc:1", "title": "a", "preview": True})
    db.upsert_video({"id": "sc:2", "title": "b", "geo_blocked": True})
    db.upsert_video({"id": "sc:3", "title": "c"})
    assert db.enqueue(["sc:1", "sc:2", "sc:3"]) == ["sc:3"]
    assert db.get_video("sc:1")["status"] == "new"
