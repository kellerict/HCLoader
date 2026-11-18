"""v0.9.0 Plex/Jellyfin library scan (core/mediaserver.py, core/credentials.py,
worker.MediaScanQueue, Api): settings validation, request building, path mapping, response
parsing, error mapping, transport safety (no proxy, no redirect), secret storage outside
config.yaml/log, debounced batches and the headless run. HTTP is always faked - no network."""

from __future__ import annotations

import json
import logging
import types
import urllib.request

import pytest

from app.api import Api
from app.core import config, credentials, mediaserver
from app.core.mediaserver import MediaServerError, Request
from app.core.scheduler import TaskScheduler
from app.worker import EventBus, MediaScanQueue, run_scan
from tests.test_api import FakeLock, FakeSchtasks, FakeWatchdog, FakeWindow, NullClient

TOKEN = "s3cr3t-T0ken-abc"
PLEX_ROOT = {"MediaContainer": {"friendlyName": "Basement", "version": "1.42.2"}}
PLEX_SECTIONS = {
    "MediaContainer": {
        "Directory": [
            {"key": "1", "title": "Movies", "type": "movie", "Location": [{"path": "/movies"}]},
            {"key": "3", "title": "Hard Music", "type": "artist", "Location": [{"path": "/m"}]},
        ]
    }
}
JF_INFO = {"ServerName": "nas", "Version": "10.11.3"}
JF_FOLDERS = [
    {"Name": "Shows", "ItemId": "aa", "CollectionType": "tvshows", "Locations": ["/tv"]},
    {"Name": "Music", "ItemId": "bb", "CollectionType": "music", "Locations": ["/media/music"]},
]


class FakeHttp:
    """Transport stand-in: records requests, answers from a table {path-prefix: (status, body)}."""

    def __init__(self, answers=None, error=None):
        self.answers = answers or {}
        self.error = error
        self.requests: list[Request] = []

    def __call__(self, req, timeout, verify):
        self.requests.append(req)
        self.last = (timeout, verify)
        if self.error:
            raise self.error
        for prefix, (status, body) in self.answers.items():
            if prefix in req.url:
                return status, json.dumps(body).encode() if not isinstance(body, bytes) else body
        return 200, b""


# --------------------------------------------------------------------------- settings


@pytest.mark.parametrize(
    ("values", "error"),
    [
        ({"type": "plex", "url": "http://192.168.1.10:32400/"}, None),
        ({"type": "jellyfin", "url": "https://nas.local:8920/jellyfin"}, None),
        ({"type": "off", "url": ""}, None),
        ({"type": "plex", "url": ""}, "media_server.url"),
        ({"type": "plex", "url": "ftp://nas"}, "media_server.url"),
        ({"type": "plex", "url": "http://user:pw@nas:32400"}, "media_server.url"),
        ({"type": "plex", "url": "http://nas:32400/?X-Plex-Token=x"}, "media_server.url"),
        ({"type": "plex", "url": "http://nas:99999"}, "media_server.url"),
        ({"type": "plex", "url": "http://"}, "media_server.url"),
        ({"type": "emby", "url": "http://nas"}, "media_server.type"),
        ({"delay_seconds": 5}, "media_server.delay_seconds"),
        ({"server_root": "/data\nx"}, "media_server.server_root"),
    ],
)
def test_settings_validation(values, error):
    parsed, errors = config.parse_settings({"media_server": values})
    if error is None:
        assert errors == {} and not parsed.media_server.url.endswith("/")
    else:
        assert error in errors and parsed is None


def test_notification_settings_validation():
    _parsed, errors = config.parse_settings({"notifications": {"quiet_to": "7:00"}})
    assert "notifications.quiet_to" in errors
    parsed, errors = config.parse_settings({"notifications": {"quiet_hours": True}})
    assert errors == {} and parsed.notifications.quiet_from == "22:00"


def test_settings_have_no_secret_field():
    """The token/API key is never part of the settings model (so never in config.yaml)."""
    fields = set(config.MediaServerSettings.model_fields)
    assert not {f for f in fields if any(w in f for w in ("token", "secret", "key", "password"))}


# --------------------------------------------------------------------------- requests


def test_auth_headers():
    h = mediaserver.auth_headers("plex", TOKEN)
    assert h["X-Plex-Token"] == TOKEN and h["Accept"] == "application/json"
    j = mediaserver.auth_headers("jellyfin", TOKEN)
    assert (
        j["Authorization"].startswith("MediaBrowser ") and f'Token="{TOKEN}"' in j["Authorization"]
    )
    with pytest.raises(MediaServerError):
        mediaserver.auth_headers("jellyfin", 'x", Token="y')
    with pytest.raises(MediaServerError):
        mediaserver.auth_headers("emby", TOKEN)


def test_plex_scan_requests():
    paths = [
        "/m/Hardcore/Angerfist/2026/a.mp3",
        "/m/Hardcore/Angerfist/2026/b.mp3",
        "/m/Uptempo/x.mp3",
    ]
    reqs = mediaserver.scan_requests("plex", "http://nas:32400/", TOKEN, "3", paths)
    assert [r.method for r in reqs] == ["GET", "GET"]
    assert reqs[0].url == (
        "http://nas:32400/library/sections/3/refresh?path=%2Fm%2FHardcore%2FAngerfist%2F2026"
    )
    assert all(TOKEN not in r.url for r in reqs) and reqs[0].headers["X-Plex-Token"] == TOKEN
    many = [f"/m/g{i}/a.mp3" for i in range(mediaserver.PLEX_MAX_FOLDERS + 1)]
    assert [r.url for r in mediaserver.scan_requests("plex", "http://nas", TOKEN, "3", many)] == [
        "http://nas/library/sections/3/refresh"
    ]
    unmapped = mediaserver.scan_requests("plex", "http://nas", TOKEN, "3", ["/m/a.mp3", None])
    assert unmapped[0].url == "http://nas/library/sections/3/refresh"
    assert mediaserver.scan_requests("plex", "http://nas", TOKEN, "", paths)[0].url == (
        "http://nas/library/sections/all/refresh"
    )
    windows = mediaserver.scan_requests("plex", "http://nas", TOKEN, "3", [r"D:\M\Hardcore\a.mp3"])
    assert windows[0].url.endswith("?path=D%3A%5CM%5CHardcore")


def test_jellyfin_scan_requests():
    reqs = mediaserver.scan_requests(
        "jellyfin", "http://nas:8096", TOKEN, "bb", ["/a/x.mp3", "/a/y.mp3"]
    )
    assert len(reqs) == 1 and reqs[0].method == "POST"
    assert reqs[0].url == "http://nas:8096/Library/Media/Updated"
    assert json.loads(reqs[0].body) == {
        "Updates": [
            {"Path": "/a/x.mp3", "UpdateType": "Created"},
            {"Path": "/a/y.mp3", "UpdateType": "Created"},
        ]
    }
    assert reqs[0].headers["Content-Type"] == "application/json"
    full = mediaserver.scan_requests("jellyfin", "http://nas:8096", TOKEN, "bb", [None])
    assert full[0].url.startswith("http://nas:8096/Items/bb/Refresh?Recursive=true")
    assert mediaserver.scan_requests("jellyfin", "http://nas", TOKEN, "", [None])[0].url == (
        "http://nas/Library/Refresh"
    )
    many = [f"/a/{i}.mp3" for i in range(mediaserver.JELLYFIN_MAX_PATHS + 1)]
    assert (
        "/Library/Refresh"
        in mediaserver.scan_requests("jellyfin", "http://nas", TOKEN, "", many)[0].url
    )


@pytest.mark.parametrize(
    ("local", "target", "root", "expected"),
    [
        (
            r"D:\Music\HCLoader\Hardcore\a.mp3",
            r"D:\Music\HCLoader",
            "",
            r"D:\Music\HCLoader\Hardcore\a.mp3",
        ),
        (
            r"D:\Music\HCLoader\Hardcore\DJ X\a.mp3",
            r"D:\Music\HCLoader",
            "/data/music/",
            "/data/music/Hardcore/DJ X/a.mp3",
        ),
        (
            r"d:\music\hcloader\H\a.mp3",
            r"D:\Music\HCLoader",
            r"\\nas\music",
            r"\\nas\music\H\a.mp3",
        ),
        (r"E:\Other\a.mp3", r"D:\Music\HCLoader", "/data", None),
        ("/home/u/m/H/a.mp3", "/home/u/m", "/srv/m", "/srv/m/H/a.mp3"),
    ],
)
def test_server_path_mapping(local, target, root, expected):
    assert mediaserver.server_path(local, target, root) == expected


def test_parse_libraries_and_info():
    plex = mediaserver.parse_libraries("plex", PLEX_SECTIONS)
    assert [lib["name"] for lib in plex] == ["Hard Music", "Movies"]  # music first
    assert plex[0] == {
        "id": "3",
        "name": "Hard Music",
        "type": "artist",
        "paths": ["/m"],
        "music": True,
    }
    jf = mediaserver.parse_libraries("jellyfin", JF_FOLDERS)
    assert jf[0]["id"] == "bb" and jf[0]["paths"] == ["/media/music"]
    assert mediaserver.parse_info("plex", PLEX_ROOT) == {"name": "Basement", "version": "1.42.2"}
    assert mediaserver.parse_info("jellyfin", JF_INFO)["name"] == "nas"
    for kind, bad in (("plex", {"x": 1}), ("jellyfin", 5), ("plex", [])):
        with pytest.raises(MediaServerError) as e:
            mediaserver.parse_libraries(
                kind, bad
            ) if kind == "jellyfin" else mediaserver.parse_info(kind, bad)
        assert e.value.code == "bad_response"


def test_test_connection_and_error_mapping():
    http = FakeHttp({"/library/sections": (200, PLEX_SECTIONS), "nas:32400/": (200, PLEX_ROOT)})
    res = mediaserver.test_connection(
        "plex", "http://nas:32400", TOKEN, transport=http, verify_tls=False
    )
    assert res["name"] == "Basement" and len(res["libraries"]) == 2
    assert len(http.requests) == 2 and http.last == (mediaserver.TIMEOUT_S, False)
    for status, code in ((401, "auth"), (403, "auth"), (500, "http"), (302, "http")):
        with pytest.raises(MediaServerError) as e:
            mediaserver.test_connection(
                "jellyfin", "http://nas", TOKEN, transport=FakeHttp({"/": (status, b"")})
            )
        assert e.value.code == code
    with pytest.raises(MediaServerError) as e:
        mediaserver.test_connection(
            "jellyfin", "http://nas", TOKEN, transport=FakeHttp({"/": (200, b"<html>")})
        )
    assert e.value.code == "bad_response"
    err = MediaServerError("unreachable", "Connection refused")
    assert "Connection refused" in err.message()


def test_urllib_transport_bypasses_proxy_and_refuses_redirects(monkeypatch):
    seen = {}

    class Resp:
        status = 200

        def read(self, n):
            return b"{}"

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    class Opener:
        def open(self, req, timeout):
            seen["req"], seen["timeout"] = req, timeout
            return Resp()

    def build(*handlers):
        seen["handlers"] = handlers
        return Opener()

    monkeypatch.setattr(urllib.request, "build_opener", build)
    status, body = mediaserver.urllib_transport(
        Request("POST", "http://nas/Library/Refresh", {"X-Plex-Token": TOKEN}, b"{}"), 7, True
    )
    assert (status, body) == (200, b"{}") and seen["timeout"] == 7
    proxy = [h for h in seen["handlers"] if isinstance(h, urllib.request.ProxyHandler)]
    assert proxy and proxy[0].proxies == {}
    assert any(isinstance(h, mediaserver._NoRedirect) for h in seen["handlers"])
    assert seen["req"].get_method() == "POST"


# --------------------------------------------------------------------------- secrets


def test_memory_store_and_clean_secret():
    s = credentials.MemoryStore()
    assert s.get("plex") is None and s.persistent is False
    s.set("plex", "abc")
    assert s.get("plex") == "abc"
    s.delete("plex")
    s.delete("plex")
    assert s.get("plex") is None
    assert credentials.clean_secret("  tok  ") == "tok"
    for bad in ("", "  ", "a\nb", "x" * 600, None):
        with pytest.raises(credentials.CredentialError):
            credentials.clean_secret(bad)
    assert credentials.target("plex") == "HCLoader/media_server/plex"


@pytest.fixture
def api(tmp_path):
    http = FakeHttp(
        {
            "/library/sections/3/refresh": (200, b""),
            "/library/sections": (200, PLEX_SECTIONS),
            ":32400/": (200, PLEX_ROOT),
        }
    )
    store = credentials.MemoryStore()
    bus = EventBus()
    window = FakeWindow()
    a = Api(
        bus=bus,
        task_scheduler=TaskScheduler(run=FakeSchtasks(), platform="win32"),
        watchdog=FakeWatchdog(),
        run_lock=lambda: FakeLock(),
        client_factory=NullClient,
        configure_logging=False,
        secret_store=store,
        media_transport=http,
    )
    bus.attach(window, ready=True)
    a.http, a.store, a.window = http, store, window
    yield a
    a.shutdown()


def test_api_test_connection_stores_secret_only_after_success(api, caplog, tmp_path):
    caplog.set_level(logging.DEBUG)
    r = api.test_media_server({"type": "plex", "url": "http://nas:32400", "secret": " " + TOKEN})
    assert r["ok"] and r["name"] == "Basement" and r["stored"] is True
    assert [lib["id"] for lib in r["libraries"]] == ["3", "1"]
    assert api.store.get("plex") == TOKEN
    st = api.get_media_server_status()
    assert st["has_secret"] == {"plex": True, "jellyfin": False} and st["persistent"] is False
    # a wrong typed token is not stored and the old one stays
    api.http.answers = {"/": (401, b"")}
    bad = api.test_media_server({"type": "plex", "url": "http://nas:32400", "secret": "wrong"})
    assert (
        bad == {"ok": False, "code": "auth", "error": bad["error"]}
        and api.store.get("plex") == TOKEN
    )
    assert api.test_media_server({"type": "jellyfin", "url": "http://nas"})["code"] == "no_secret"
    assert api.test_media_server({"type": "plex", "url": "ftp://x"})["code"] == "config"
    assert (
        api.test_media_server({"type": "plex", "url": "http://x", "secret": "a\nb"})["code"]
        == "auth"
    )
    assert api.test_media_server("nonsense")["code"] == "config"
    # never in the log or the config
    assert TOKEN not in caplog.text
    cfg_text = (
        config.config_path().read_text(encoding="utf-8") if config.config_path().exists() else ""
    )
    assert TOKEN not in cfg_text
    assert api.forget_media_server_secret("plex") == {"ok": True}
    assert api.store.get("plex") is None
    assert api.forget_media_server_secret("emby")["ok"] is False


def test_api_scan_now_and_save_settings_keep_secret_out(api):
    api.store.set("plex", TOKEN)
    saved = api.save_settings(
        {
            **api.get_settings()["values"],
            "media_server": {"type": "plex", "url": "http://nas:32400", "library": "3"},
        }
    )
    assert saved["ok"]
    assert TOKEN not in config.config_path().read_text(encoding="utf-8")
    r = api.scan_media_server()
    assert r["ok"] and r["requests"] == 1 and r["server"] == "plex"
    assert api.http.requests[-1].url == "http://nas:32400/library/sections/3/refresh"
    assert api._bus.flush(5)
    assert api.window.events_of("media_scan")[-1]["ok"] is True
    assert api.get_media_server_status()["last_scan"]["ok"] is True


def test_stored_token_only_goes_to_the_saved_address(api):
    """Review v0.9.0 m2: «Test» with a changed address does not send the stored token there."""
    api.store.set("plex", TOKEN)
    r = api.test_media_server({"type": "plex", "url": "http://other.example:32400"})
    assert r["code"] == "no_secret" and api.http.requests == []
    assert api.save_settings(
        {
            **api.get_settings()["values"],
            "media_server": {"type": "plex", "url": "http://nas:32400", "library": "3"},
        }
    )["ok"]
    assert api.test_media_server({"type": "plex", "url": "http://nas:32400/"})["ok"] is True
    assert api.http.requests and api.http.requests[-1].url.startswith("http://nas:32400")
    r = api.test_media_server({"type": "plex", "url": "http://evil.example:32400"})
    assert r["code"] == "no_secret"
    assert all("evil" not in q.url for q in api.http.requests)


def test_scan_queue_batches_downloads_and_reports_failures(db, tmp_path):
    timers = []

    class FakeTimer:
        def __init__(self, delay, fn):
            self.delay, self.fn, self.cancelled, self.daemon = delay, fn, False, False
            timers.append(self)

        def start(self):
            pass

        def cancel(self):
            self.cancelled = True

    settings = config.defaults()
    settings.storage.target_dir = r"D:\Music\HCLoader"
    settings.media_server.type = "jellyfin"
    settings.media_server.url = "http://nas:8096"
    settings.media_server.server_root = "/media/music"
    http = FakeHttp()
    events = []
    bus = EventBus()
    bus.subscribe(lambda t, d: events.append((t, d)))
    q = MediaScanQueue(
        db, lambda: settings, {"jellyfin": TOKEN}.get, bus, transport=http, timer_factory=FakeTimer
    )
    for i in range(3):
        db.upsert_video({"id": f"vid0000000{i}", "title": "x", "status": "new"})
        db.execute(
            "UPDATE videos SET status='done', file_path=? WHERE id=?",
            (rf"D:\Music\HCLoader\Hardcore\DJ\{i}.mp3", f"vid0000000{i}"),
        )
        assert q.add(f"vid0000000{i}")
    assert len(timers) == 3 and timers[0].cancelled and timers[1].cancelled
    assert timers[-1].delay == settings.media_server.delay_seconds and q.pending == 3
    res = timers[-1].fn()
    assert res["ok"] and res["partial"] and len(http.requests) == 1
    assert [u["Path"] for u in json.loads(http.requests[0].body)["Updates"]] == [
        "/media/music/Hardcore/DJ/0.mp3",
        "/media/music/Hardcore/DJ/1.mp3",
        "/media/music/Hardcore/DJ/2.mp3",
    ]
    assert q.pending == 0 and q.fire() == {"ok": True, "requests": 0}
    # failure: logged + toast, no retry
    http.error = MediaServerError("unreachable", "Connection refused")
    q.add("vid00000000")
    res = timers[-1].fn()
    assert res["ok"] is False and res["code"] == "unreachable"
    assert ("toast", {"msg": res["error"], "kind": "warn"}) in events
    assert len(http.requests) == 2
    # off: nothing collected
    settings.media_server.type = "off"
    assert q.add("vid00000001") is False
    q.stop()


def test_run_scan_without_secret_and_state(db):
    settings = config.defaults()
    settings.media_server.type = "plex"
    settings.media_server.url = "http://nas"
    res = run_scan(db, settings, lambda k: None, ["/a.mp3"], transport=FakeHttp())
    assert res["ok"] is False and res["code"] == "no_secret"
    assert json.loads(db.get_state("media_scan_last"))["code"] == "no_secret"


def test_headless_scans_the_downloads_of_the_run(tmp_path, monkeypatch):
    from app import headless
    from app.core.db import Database

    settings = config.defaults()
    settings.storage.target_dir = str(tmp_path / "music")
    settings.media_server.type = "plex"
    settings.media_server.url = "http://nas:32400"
    settings.media_server.library = "3"
    db = Database(tmp_path / "h.db")
    db.upsert_video({"id": "vid00000001", "title": "x", "status": "new"})
    f = tmp_path / "music" / "Hardcore" / "a.mp3"
    db.execute("UPDATE videos SET status='done', file_path=? WHERE id='vid00000001'", (str(f),))
    store = credentials.MemoryStore()
    store.set("plex", TOKEN)
    http = FakeHttp()
    try:
        headless._after_run(
            db,
            settings,
            new_sets=0,
            session={"downloaded": 1},
            done_ids=["vid00000001"],
            secret_store=store,
            media_transport=http,
            notify_sender=types.SimpleNamespace(
                name="x", available=lambda: False, show=lambda xml: None
            ),
        )
        assert len(http.requests) == 1
        assert "path=" in http.requests[0].url and TOKEN not in http.requests[0].url
        # nothing downloaded -> no request at all
        headless._after_run(
            db,
            settings,
            new_sets=0,
            session={},
            done_ids=[],
            secret_store=store,
            media_transport=http,
        )
        assert len(http.requests) == 1
    finally:
        db.close()
