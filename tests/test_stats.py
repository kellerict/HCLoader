"""v0.9.0 statistics (core/stats.py, Api.get_stats): queries on a synthetic database, date
range, gap-filled months, DJ/track tops, watchlist activity, file sizes (migration 15, background
measuring) and speed on 10k sets. No network, no files except the ones created here."""

from __future__ import annotations

import sqlite3
import time
from datetime import UTC, datetime, timedelta

import pytest

from app.api import Api
from app.core import config, stats
from app.core import db as dbmod
from app.core.db import Database
from app.core.scheduler import TaskScheduler
from app.worker import EventBus
from tests.test_api import FakeLock, FakeSchtasks, FakeWatchdog, FakeWindow, NullClient


def _iso(dt: datetime) -> str:
    return dt.astimezone(UTC).isoformat(timespec="seconds")


def add_set(
    db,
    vid,
    *,
    title,
    genre="Hardstyle",
    duration=3600,
    downloaded=None,
    platform="youtube",
    upload="20240501",
    edition=None,
    size=None,
    status="done",
    path=None,
):
    db.upsert_video(
        {
            "id": vid,
            "title": title,
            "channel_id": "UC1",
            "channel_name": "Channel",
            "duration": duration,
            "upload_date": upload,
            "platform": platform,
            "status": status,
        }
    )
    db.execute(
        "UPDATE videos SET status=?, genre=?, downloaded_at=?, file_path=?, file_size=?, "
        "edition_id=? WHERE id=?",
        (
            status,
            genre,
            downloaded,
            path or (f"D:/m/{vid}.mp3" if status == "done" else None),
            size,
            edition,
            vid,
        ),
    )


def edition(db, key, name, year, kind="festival"):
    db.execute("INSERT OR IGNORE INTO series(key, name, kind) VALUES (?, ?, ?)", (key, name, kind))
    sid = db.query_one("SELECT id FROM series WHERE key=?", (key,))["id"]
    db.execute("INSERT INTO editions(series_id, year) VALUES (?, ?)", (sid, year))
    return db.query_one("SELECT id FROM editions WHERE series_id=? AND year=?", (sid, year))["id"]


@pytest.fixture
def lib(db):
    """A small library over three months with festivals, two platforms and tracklists."""
    d1 = datetime(2026, 3, 10, 12, tzinfo=UTC)
    d2 = datetime(2026, 5, 2, 12, tzinfo=UTC)
    d3 = datetime(2026, 5, 20, 12, tzinfo=UTC)
    q24 = edition(db, "qlimax", "Qlimax", 2024)
    q25 = edition(db, "qlimax", "Qlimax", 2025)
    dq = edition(db, "defqon1", "Defqon.1", 2023)
    radio = edition(db, "qdance-radio", "Q-dance Radio", 0, kind="radio")
    add_set(
        db,
        "aaaaaaaaaa1",
        title="Headhunterz @ Qlimax 2024",
        downloaded=_iso(d1),
        edition=q24,
        size=100,
        duration=3600,
    )
    add_set(
        db,
        "aaaaaaaaaa2",
        title="Headhunterz @ Qlimax 2025",
        downloaded=_iso(d2),
        edition=q25,
        size=200,
        duration=1800,
    )
    add_set(
        db,
        "aaaaaaaaaa3",
        title="Angerfist @ Defqon.1 2023",
        genre="Hardcore",
        downloaded=_iso(d3),
        edition=dq,
        size=None,
        duration=5400,
        upload="20230701",
    )
    add_set(
        db,
        "sc-1",
        title="Uptempo Podcast 12",
        genre="Uptempo",
        platform="soundcloud",
        downloaded=_iso(d3),
        size=50,
        duration=3000,
        upload="",
    )
    add_set(
        db,
        "aaaaaaaaaa5",
        title="Q-dance Radio 100",
        genre="",
        downloaded=_iso(d2),
        edition=radio,
        size=10,
        duration=600,
        upload="20220101",
    )
    add_set(db, "inboxxxxxx1", title="Not loaded", status="inbox")
    for vid in ("aaaaaaaaaa1", "aaaaaaaaaa2", "aaaaaaaaaa3"):
        for pos, (artist, title) in enumerate([("Sefa", "Calling Out"), ("Miss K8", "Mayhem")]):
            key = f"{artist.lower()}|{title.lower()}|" if vid != "aaaaaaaaaa3" or pos else ""
            db.execute(
                "INSERT INTO tracks(video_id, position, artist, title, key, search) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (vid, pos, artist, title, key, f"{artist} {title}".lower()),
            )
    src = db.add_source(type="channel", name="Kickdrum", url_or_query="https://www.youtube.com/@k")
    sid = src["id"] if isinstance(src, dict) else src
    for vid in ("aaaaaaaaaa1", "aaaaaaaaaa2", "inboxxxxxx1"):
        db.execute(
            "INSERT INTO source_videos(source_id, video_id, first_seen) VALUES (?, ?, ?)",
            (sid, vid, _iso(d2)),
        )
    for kind, started, found, dl in (
        ("watchlist", d1, 3, 0),
        ("headless", d2, 2, 1),
        ("headless", d3, 0, 0),
        ("manual", d3, 0, 5),  # queue runs are no watchlist activity
    ):
        rid = db.start_run(kind)
        db.execute(
            "UPDATE runs SET started=?, finished=?, found=?, downloaded=? WHERE id=?",
            (_iso(started), _iso(started + timedelta(minutes=3)), found, dl, rid),
        )
    return db


def test_totals_breakdowns_and_tops(lib):
    s = stats.compute(lib, config.defaults(), {})
    t = s["totals"]
    assert t["sets"] == 5 and t["library_sets"] == 5
    assert t["seconds"] == 3600 + 1800 + 5400 + 3000 + 600
    assert t["bytes"] == 360 and t["sizes_missing"] == 1
    assert t["avg_seconds"] == t["seconds"] // 5
    genres = {g["name"]: g for g in s["genres"]}
    assert genres["Hardstyle"]["sets"] == 2 and genres["Hardstyle"]["color"].startswith("#")
    assert genres["Unsortiert"]["sets"] == 1  # empty genre counts as unsorted
    fest = s["festivals"]
    assert [f["name"] for f in fest["items"]] == ["Qlimax", "Defqon.1"]  # radio is no festival
    assert fest["items"][0]["sets"] == 2 and fest["items"][0]["editions"] == 2
    assert fest["other"] == 0 and fest["festivals"] == 2
    years = {y["year"]: y["sets"] for y in s["years"]}
    assert years == {2024: 1, 2025: 1, 2023: 1, 2022: 1, None: 1}  # edition year wins
    assert {p["platform"]: p["sets"] for p in s["platforms"]} == {"youtube": 4, "soundcloud": 1}
    # months: gap filled (April 2026 has no downloads)
    assert [(m["month"], m["sets"]) for m in s["months"]] == [
        ("2026-03", 1),
        ("2026-04", 0),
        ("2026-05", 4),
    ]
    tracks = s["tracks"]
    assert tracks[0]["artist"] == "Miss K8" and tracks[0]["sets"] == 3
    assert tracks[1]["artist"] == "Sefa" and tracks[1]["sets"] == 2
    djs = {d["name"]: d["sets"] for d in s["djs"]}
    assert djs.get("Headhunterz") == 2 and djs.get("Angerfist") == 1
    w = s["watchlist"]
    assert (w["checks"], w["scheduled"], w["found"], w["downloaded"]) == (3, 2, 5, 1)
    assert w["sources"][0]["name"] == "Kickdrum"
    assert (w["sources"][0]["found"], w["sources"][0]["downloaded"]) == (3, 2)
    assert w["sources"][0]["inbox"] == 1 and w["inbox"] == 1


def test_date_range_filters_everything(lib):
    s = stats.compute(lib, config.defaults(), {"from": "2026-05-01", "to": "2026-05-31"})
    assert s["range"] == {"from": "2026-05-01", "to": "2026-05-31"}
    assert s["totals"]["sets"] == 4 and s["totals"]["library_sets"] == 5
    assert [m["month"] for m in s["months"]] == ["2026-05"]
    assert {d["name"] for d in s["djs"]} >= {"Headhunterz", "Angerfist"}
    assert {d["name"]: d["sets"] for d in s["djs"]}["Headhunterz"] == 1
    assert s["tracks"][0]["sets"] == 2  # Miss K8 in two sets of May
    assert s["watchlist"]["checks"] == 2  # the March check is outside
    # reversed bounds are swapped, an empty range gives zeros with filled months
    r = stats.compute(lib, config.defaults(), {"from": "2019-12-31", "to": "2019-11-01"})
    assert r["range"] == {"from": "2019-11-01", "to": "2019-12-31"}
    assert r["totals"]["sets"] == 0
    assert [m["month"] for m in r["months"]] == ["2019-11", "2019-12"]
    assert all(m["sets"] == 0 for m in r["months"])


@pytest.mark.parametrize("bad", ["2026-13-01", "yesterday", "2026-1-1", 20260101])
def test_invalid_range(lib, bad):
    with pytest.raises(stats.RangeError):
        stats.compute(lib, config.defaults(), {"from": bad})


def test_empty_library(db):
    s = stats.compute(db, config.defaults(), {})
    assert s["totals"]["sets"] == 0 and s["months"] == [] and s["djs"] == []
    assert s["festivals"] == {"items": [], "other": 0, "festivals": 0}


def test_file_size_written_with_path_and_measured_later(db, tmp_path):
    f = tmp_path / "set.mp3"
    f.write_bytes(b"x" * 1234)
    add_set(db, "aaaaaaaaaa1", title="A", downloaded=_iso(datetime.now(UTC)), path=str(f))
    db.execute("UPDATE videos SET file_size=NULL")
    db.set_status("aaaaaaaaaa1", "done", file_path=str(f))
    assert db.get_video("aaaaaaaaaa1")["file_size"] == 1234
    g = tmp_path / "moved.mp3"
    g.write_bytes(b"y" * 10)
    db.set_file_path("aaaaaaaaaa1", str(g))
    assert db.get_video("aaaaaaaaaa1")["file_size"] == 10
    db.mark_removed("aaaaaaaaaa1")
    assert db.get_video("aaaaaaaaaa1")["file_size"] is None
    # libraries from before v0.9.0: measured once; a missing file becomes 0 (not again)
    add_set(db, "bbbbbbbbbb1", title="B", downloaded=_iso(datetime.now(UTC)), path=str(f))
    add_set(
        db,
        "bbbbbbbbbb2",
        title="C",
        downloaded=_iso(datetime.now(UTC)),
        path=str(tmp_path / "gone.mp3"),
    )
    assert stats.missing_sizes(db) == 2
    seen = []
    res = stats.measure_sizes(db, progress=lambda d, t: seen.append((d, t)))
    assert res == {"done": 2, "total": 2, "missing": 1, "offline": 0} and seen[-1] == (2, 2)
    assert db.get_video("bbbbbbbbbb1")["file_size"] == 1234
    assert db.get_video("bbbbbbbbbb2")["file_size"] == 0
    assert stats.missing_sizes(db) == 0


def test_measure_sizes_leaves_offline_drive_unmeasured(db):
    """Review v0.9.0 m1: a NAS/USB drive that is not mounted is not «file gone» (0 forever)."""
    now = _iso(datetime.now(UTC))
    add_set(db, "cccccccccc1", title="NAS", downloaded=now, path="Z:/music/a.mp3")
    add_set(db, "cccccccccc2", title="Local", downloaded=now, path="C:/music/b.mp3")
    res = stats.measure_sizes(
        db, stat=lambda p: None, reachable=lambda root: not root.upper().startswith("Z")
    )
    assert res["offline"] == 1 and res["missing"] == 1
    assert db.get_video("cccccccccc1")["file_size"] is None  # measured again later
    assert db.get_video("cccccccccc2")["file_size"] == 0
    add_set(db, "cccccccccc3", title="NAS 2", downloaded=now, path="Z:/music/c.mp3")
    seen = []
    res = stats.measure_sizes(db, stat=lambda p: None, reachable=lambda r: seen.append(r) or False)
    assert res["offline"] == 2 and len(seen) == 1  # one check per drive, not per file


def test_months_use_local_time(db, monkeypatch):
    """Review v0.9.0 m5: in UTC+1 a download at 00:30 local on 1 Jan belongs to January."""
    if not hasattr(time, "tzset"):
        pytest.skip("needs time.tzset")
    monkeypatch.setenv("TZ", "CET-1")
    time.tzset()
    try:
        add_set(db, "dddddddddd1", title="NY", downloaded="2025-12-31T23:30:00+00:00")
        lo, hi, _ = stats.date_range({"from": "2026-01-01", "to": "2026-01-31"})
        months = stats.by_month(db, lo, hi)
        assert [m["month"] for m in months] == ["2026-01"] and months[0]["sets"] == 1
    finally:
        monkeypatch.delenv("TZ")
        time.tzset()


def test_migration_15_from_v14_keeps_rows(tmp_path):
    path = tmp_path / "old.db"
    conn = sqlite3.connect(path)
    assert dbmod.migrate(conn, dbmod.MIGRATIONS[:14]) == 14
    conn.execute(
        "INSERT INTO videos(id, title, status, file_path, downloaded_at) "
        "VALUES ('vid00000001', 'Mix', 'done', 'C:/m/mix.mp3', '2026-01-01T00:00:00+00:00')"
    )
    conn.commit()
    conn.close()
    d = Database(path)
    try:
        assert d.schema_version() == len(dbmod.MIGRATIONS) >= 15
        row = d.get_video("vid00000001")
        assert row["file_size"] is None and row["title"] == "Mix"
        idx = {r["name"] for r in d.query("SELECT name FROM sqlite_master WHERE type='index'")}
        assert "idx_videos_downloaded" in idx
        assert stats.missing_sizes(d) == 1
    finally:
        d.close()


NAMES = [f"Kick{chr(65 + i // 26)}{chr(97 + i % 26)}ter" for i in range(300)]


def test_fast_on_ten_thousand_sets(db):
    base = datetime(2024, 1, 1, tzinfo=UTC)
    genres = ("Hardstyle", "Hardcore", "Uptempo")
    with db.transaction():
        for i in range(10_000):
            db.execute(
                "INSERT INTO videos(id, title, duration, upload_date, status, genre, platform, "
                "downloaded_at, file_path, file_size) VALUES (?,?,?,?,?,?,?,?,?,?)",
                (
                    f"v{i:010d}",
                    f"{NAMES[i % 300]} @ Qlimax {2015 + i % 10}",
                    3600 + i % 900,
                    f"{2015 + i % 10}0101",
                    "done",
                    genres[i % 3],
                    "soundcloud" if i % 7 == 0 else "youtube",
                    _iso(base + timedelta(hours=i * 2)),
                    f"D:/m/v{i}.mp3",
                    150_000_000,
                ),
            )
    settings = config.defaults()
    stats.compute(db, settings, {})  # first call builds the DJ index (cached afterwards)
    start = time.perf_counter()
    s = stats.compute(db, settings, {"from": "2024-06-01"})
    took = time.perf_counter() - start
    assert s["totals"]["library_sets"] == 10_000
    assert len(s["djs"]) == 10
    assert took < 2.0, f"statistics took {took:.2f}s"


# --------------------------------------------------------------------------- bridge


@pytest.fixture
def api(tmp_path):
    bus = EventBus()
    window = FakeWindow()
    a = Api(
        bus=bus,
        task_scheduler=TaskScheduler(run=FakeSchtasks(), platform="win32"),
        watchdog=FakeWatchdog(),
        run_lock=lambda: FakeLock(),
        client_factory=NullClient,
        configure_logging=False,
    )
    bus.attach(window, ready=True)
    a.window = window
    yield a
    a.shutdown()


def test_api_get_stats_and_background_size_measuring(api, tmp_path):
    f = tmp_path / "a.mp3"
    f.write_bytes(b"z" * 77)
    add_set(
        api._db,
        "aaaaaaaaaa1",
        title="Sefa @ Defqon.1",
        downloaded=_iso(datetime.now(UTC)),
        path=str(f),
    )
    events = []
    api._bus.subscribe(lambda t, d: events.append((t, d)) if t == "stats_sizes" else None)
    r = api.get_stats()
    assert r["ok"] and r["totals"]["sizes_missing"] == 1 and r["measuring"] is True
    api._stats_worker.submit("sizes-wait", lambda: None).result(timeout=10)
    assert events[-1][1]["phase"] == "done" and events[-1][1]["done"] == 1
    r = api.get_stats({"from": None, "to": ""})
    assert r["totals"]["bytes"] == 77 and r["measuring"] is False
    bad = api.get_stats({"from": "2026-02-30"})
    assert bad["ok"] is False and bad["error"]
