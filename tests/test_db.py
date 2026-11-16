import sqlite3
import threading

import pytest

from app.core import db as dbmod
from app.core.db import Database


def vid(i="abc", **kw):
    d = {
        "id": i,
        "title": "T",
        "channel_id": "c1",
        "channel_name": "Chan",
        "duration": 3600,
        "upload_date": "20261003",
        "view_count": 5,
        "thumbnail": "u",
        "genre": "Hardcore",
    }
    d.update(kw)
    return d


def test_schema_and_version(db):
    assert db.schema_version() == len(dbmod.MIGRATIONS)
    tables = {r["name"] for r in db.query("SELECT name FROM sqlite_master WHERE type='table'")}
    assert {"videos", "sources", "channel_blacklist", "runs", "state", "schema_version"} <= tables
    assert db.query_one("PRAGMA journal_mode")["journal_mode"] == "wal"


def test_migration_from_older_version(tmp_path):
    path = tmp_path / "old.db"
    conn = sqlite3.connect(path)
    dbmod.migrate(conn, dbmod.MIGRATIONS[:1])
    conn.execute("INSERT INTO state VALUES ('k','v')")
    conn.commit()
    conn.close()

    def extra(c):
        c.execute("ALTER TABLE videos ADD COLUMN extra TEXT")

    n = len(dbmod.MIGRATIONS) + 1
    conn = sqlite3.connect(path)
    assert dbmod.migrate(conn, [*dbmod.MIGRATIONS, extra]) == n
    cols = [r[1] for r in conn.execute("PRAGMA table_info(videos)")]
    assert {"extra", "queue_pos", "date_approx"} <= set(cols)
    assert conn.execute("SELECT value FROM state WHERE key='k'").fetchone()[0] == "v"
    assert dbmod.migrate(conn, [*dbmod.MIGRATIONS, extra]) == n  # idempotent
    conn.close()


def test_migration_3_adds_newest_last(tmp_path):
    path = tmp_path / "v2.db"
    conn = sqlite3.connect(path)
    dbmod.migrate(conn, dbmod.MIGRATIONS[:2])
    conn.execute("INSERT INTO sources(type,name,url_or_query) VALUES ('playlist','P','u')")
    conn.commit()
    conn.close()
    d = dbmod.Database(path)
    try:
        assert d.schema_version() == len(dbmod.MIGRATIONS) >= 3
        assert d.list_sources()[0]["newest_last"] == 0
        sid = d.add_source("playlist", "Q", "u2", newest_last=True)
        assert d.get_source(sid)["newest_last"] == 1
        d.update_source(sid, newest_last=False)
        assert d.get_source(sid)["newest_last"] == 0
    finally:
        d.close()


def test_migration_3_is_atomic(tmp_path):
    conn = sqlite3.connect(tmp_path / "a.db")
    dbmod.migrate(conn, dbmod.MIGRATIONS[:2])

    def boom(c):
        dbmod._m3_newest_last(c)
        raise RuntimeError("x")

    with pytest.raises(RuntimeError):
        dbmod.migrate(conn, [*dbmod.MIGRATIONS[:2], boom])
    assert dbmod._current_version(conn) == 2
    assert "newest_last" not in [r[1] for r in conn.execute("PRAGMA table_info(sources)")]
    conn.close()


def test_migration_2_numbers_existing_queue(tmp_path):
    path = tmp_path / "v1.db"
    conn = sqlite3.connect(path)
    dbmod.migrate(conn, dbmod.MIGRATIONS[:1])
    for vid, status, seen in [
        ("b", "queued", "2026-01-02"),
        ("a", "queued", "2026-01-01"),
        ("c", "done", "2026-01-03"),
        ("d", "failed", "2026-01-04"),
    ]:
        conn.execute("INSERT INTO videos(id,status,first_seen) VALUES (?,?,?)", (vid, status, seen))
    conn.commit()
    conn.close()
    d = dbmod.Database(path)
    try:
        assert d.schema_version() == len(dbmod.MIGRATIONS)
        assert d.get_video("c")["queue_pos"] is None
        assert [r["id"] for r in d.list_queue()] == ["a", "b", "d"]
        assert d.get_video("a")["date_approx"] == 0
    finally:
        d.close()


def test_queue_helpers(db):
    for i in range(4):
        db.upsert_video({"id": f"v{i}", "title": f"T{i}"})
    db.upsert_video({"id": "done1", "status": "done"})
    assert db.enqueue(["v2", "v0", "v1", "v0", "done1", "nope"]) == ["v2", "v0", "v1"]
    assert db.next_queued()["id"] == "v2"
    assert db.move_in_queue("v1", -1) is True
    assert [r["id"] for r in db.list_queue()] == ["v2", "v1", "v0"]
    assert db.move_in_queue("v2", -1) is False  # already first
    assert db.move_in_queue("v3", 1) is False  # not queued
    db.set_status("v2", "failed", error="x")
    assert [r["id"] for r in db.list_queue()] == ["v1", "v0", "v2"]
    assert db.enqueue(["v2"]) == ["v2"]  # retry: back to the end of the waiting entries
    assert db.get_video("v2")["error"] is None
    assert [r["id"] for r in db.list_queue()] == ["v1", "v0", "v2"]
    db.dequeue("v0")
    assert db.get_video("v0")["status"] == "new" and db.get_video("v0")["queue_pos"] is None


def test_upsert_keeps_exact_date_over_approximate(db):
    db.upsert_video({"id": "x", "upload_date": "20240105"})
    db.upsert_video({"id": "x", "upload_date": "20230101", "date_approx": True})
    row = db.get_video("x")
    assert row["upload_date"] == "20240105" and row["date_approx"] == 0
    db.upsert_video({"id": "y", "upload_date": "20230101", "date_approx": True})
    assert db.get_video("y")["date_approx"] == 1
    db.upsert_video({"id": "y", "upload_date": "20230315"})  # full metadata: exact
    assert db.get_video("y")["upload_date"] == "20230315"
    assert db.get_video("y")["date_approx"] == 0
    db.upsert_video({"id": "y", "upload_date": "", "title": ""})  # empty never overwrites
    assert db.get_video("y")["upload_date"] == "20230315"


def test_newer_schema_rejected(tmp_path):
    path = tmp_path / "new.db"
    conn = sqlite3.connect(path)
    dbmod.migrate(conn)
    conn.execute("UPDATE schema_version SET version=99")
    conn.commit()
    conn.close()
    with pytest.raises(RuntimeError):
        Database(path)


def test_upsert_get_known(db):
    assert not db.is_known("abc")
    db.upsert_video(vid())
    v = db.get_video("abc")
    assert v["status"] == "new" and v["first_seen"] and v["genre"] == "Hardcore"
    assert db.is_known("abc") and db.known_ids(["abc", "zzz"]) == {"abc"}
    db.set_status("abc", "done", file_path="/x.mp3")
    db.upsert_video(vid(title="New title", view_count=9))
    v = db.get_video("abc")
    assert v["title"] == "New title" and v["view_count"] == 9
    assert v["status"] == "done" and v["file_path"] == "/x.mp3" and v["downloaded_at"]


def test_manual_genre_not_overwritten(db):
    db.upsert_video(vid())
    db.set_genre("abc", "Uptempo")
    db.upsert_video(vid(genre="Hardstyle"))
    assert db.get_video("abc")["genre"] == "Uptempo"
    assert db.get_video("abc")["genre_manual"] == 1


def test_status_validation(db):
    db.upsert_video(vid())
    with pytest.raises(ValueError):
        db.set_status("abc", "bogus")
    with pytest.raises(ValueError):
        db.upsert_video(vid("x", status="bogus"))
    db.set_status("abc", "failed", error="boom")
    assert db.get_video("abc")["error"] == "boom"


def test_list_videos_filters(db):
    db.upsert_video(vid("a", genre="Hardcore", title="Alpha"))
    db.upsert_video(
        vid("b", genre="Uptempo", channel_id="c2", upload_date="20250101", title="Beta")
    )
    db.upsert_video(vid("c", genre="Hardcore", title="Gamma"))
    db.set_status("a", "done")
    db.set_status("b", "inbox")
    assert {v["id"] for v in db.list_videos(status="done")} == {"a"}
    assert {v["id"] for v in db.list_videos(status=["done", "inbox"])} == {"a", "b"}
    assert {v["id"] for v in db.list_videos(genre="Hardcore")} == {"a", "c"}
    assert {v["id"] for v in db.list_videos(channel_id="c2")} == {"b"}
    assert {v["id"] for v in db.list_videos(year=2025)} == {"b"}
    assert {v["id"] for v in db.list_videos(search="gam")} == {"c"}
    assert [v["id"] for v in db.list_videos(order_by="title", descending=False)] == ["a", "b", "c"]
    assert len(db.list_videos(limit=2)) == 2
    assert db.count_videos(status="done") == 1 and db.count_videos() == 3
    with pytest.raises(ValueError):
        db.list_videos(order_by="id; DROP TABLE videos")


def test_sources_crud(db):
    sid = db.add_source("channel", "Chan", "https://youtube.com/@x", default_genre="Hardcore")
    s = db.get_source(sid)
    assert s["enabled"] == 1 and s["auto_download"] == 0 and s["max_entries"] == 30
    db.update_source(sid, enabled=False, auto_download=True, name="Neu")
    s = db.get_source(sid)
    assert s["enabled"] == 0 and s["auto_download"] == 1 and s["name"] == "Neu"
    assert db.list_sources(enabled_only=True) == [] and len(db.list_sources()) == 1
    db.mark_source_checked(sid)
    assert db.get_source(sid)["last_checked"]
    with pytest.raises(ValueError):
        db.update_source(sid, bogus=1)
    with pytest.raises(ValueError):
        db.add_source("weird", "n", "u")
    db.delete_source(sid)
    assert db.get_source(sid) is None


def test_blacklist(db):
    assert not db.is_blacklisted("c1")
    db.add_to_blacklist("c1", "Spam")
    db.add_to_blacklist("c1", "Spam2")
    assert db.is_blacklisted("c1") and db.blacklist_ids() == {"c1"}
    assert db.list_blacklist()[0]["channel_name"] == "Spam2"
    db.remove_from_blacklist("c1")
    assert not db.is_blacklisted("c1")


def test_runs(db):
    rid = db.start_run("watchlist")
    db.finish_run(rid, found=5, downloaded=2, errors=1, note="ok")
    r = db.list_runs()[0]
    assert r["kind"] == "watchlist" and r["found"] == 5 and r["finished"] and r["note"] == "ok"


def test_state(db):
    assert db.get_state("k") is None and db.get_state("k", "d") == "d"
    db.set_state("k", 5)
    db.set_state("k", 6)
    assert db.get_state("k") == "6"
    db.delete_state("k")
    assert db.get_state("k") is None


def test_threaded_use(db):
    def work(n):
        for i in range(20):
            db.upsert_video(vid(f"{n}-{i}"))

    ts = [threading.Thread(target=work, args=(n,)) for n in range(4)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    assert db.count_videos() == 80


def test_persists_on_reopen(tmp_path):
    p = tmp_path / "x.db"
    with Database(p) as d:
        d.set_state("a", 1)
    with Database(p) as d:
        assert d.get_state("a") == "1"


def test_failing_migration_rolls_back_and_restarts(tmp_path):
    path = tmp_path / "mig.db"
    conn = sqlite3.connect(path)

    def bad(c):
        c.execute("CREATE TABLE half_done(x)")
        c.execute("INSERT INTO no_such_table VALUES (1)")  # fails after a DDL statement

    with pytest.raises(sqlite3.OperationalError):
        dbmod.migrate(conn, [*dbmod.MIGRATIONS, bad])
    tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert "half_done" not in tables and "videos" in tables  # real steps stay, bad rolled back
    assert dbmod._current_version(conn) == len(dbmod.MIGRATIONS)

    def good(c):
        c.execute("CREATE TABLE half_done(x)")

    assert dbmod.migrate(conn, [*dbmod.MIGRATIONS, good]) == len(dbmod.MIGRATIONS) + 1
    conn.close()


def test_failing_first_migration_leaves_clean_db(tmp_path):
    conn = sqlite3.connect(tmp_path / "first.db")

    def bad_first(c):
        c.execute("CREATE TABLE t(x)")
        raise RuntimeError("boom")

    with pytest.raises(RuntimeError):
        dbmod.migrate(conn, [bad_first])
    assert not conn.execute("SELECT 1 FROM sqlite_master WHERE name='t'").fetchone()
    assert dbmod._current_version(conn) == 0
    assert dbmod.migrate(conn) == len(dbmod.MIGRATIONS)  # real schema installs fine afterwards
    conn.close()


def test_reset_interrupted_downloads(db):
    for i, status in enumerate(["downloading", "done", "queued", "downloading"]):
        db.upsert_video({"id": f"v{i}", "status": status})
    assert db.reset_interrupted_downloads() == 2
    assert (
        db.get_video("v0")["status"] == "failed" and db.get_video("v0")["error"] == "Unterbrochen"
    )
    assert db.get_video("v1")["status"] == "done" and db.get_video("v2")["status"] == "queued"
    assert db.reset_interrupted_downloads() == 0


# ------------------------------------------------------------------ Review Phase 3 m7 / m5


def test_enqueue_is_atomic(db, monkeypatch):
    for i in ("a1", "a2", "a3"):
        db.upsert_video(vid(i))
    real = db.get_video
    calls = {"n": 0}

    def flaky(video_id):
        calls["n"] += 1
        if calls["n"] == 2:
            raise sqlite3.OperationalError("disk I/O error")
        return real(video_id)

    monkeypatch.setattr(db, "get_video", flaky)
    with pytest.raises(sqlite3.OperationalError):
        db.enqueue(["a1", "a2", "a3"])
    monkeypatch.setattr(db, "get_video", real)
    assert [db.get_video(i)["status"] for i in ("a1", "a2", "a3")] == ["new"] * 3
    assert db.enqueue(["a1", "a2"]) == ["a1", "a2"]  # connection usable afterwards


def test_move_in_queue_is_atomic(db, monkeypatch):
    for i in ("a1", "a2", "a3"):
        db.upsert_video(vid(i))
    db.enqueue(["a1", "a2", "a3"])
    before = {r["id"]: r["queue_pos"] for r in db.list_queue()}
    real = db.execute
    calls = {"n": 0}

    def flaky(sql, params=()):
        if sql.startswith("UPDATE videos SET queue_pos"):
            calls["n"] += 1
            if calls["n"] == 2:
                raise sqlite3.OperationalError("crash mid renumbering")
        return real(sql, params)

    monkeypatch.setattr(db, "execute", flaky)
    with pytest.raises(sqlite3.OperationalError):
        db.move_in_queue("a3", -1)
    monkeypatch.setattr(db, "execute", real)
    assert {r["id"]: r["queue_pos"] for r in db.list_queue()} == before
    assert db.move_in_queue("a3", -1) is True
    assert [r["id"] for r in db.list_queue()] == ["a1", "a3", "a2"]


def test_requeue_downloading(db):
    db.upsert_video(vid("a1", status="downloading"))
    db.upsert_video(vid("a2", status="done"))
    assert db.requeue_downloading() == 1
    assert db.get_video("a1")["status"] == "queued" and db.get_video("a2")["status"] == "done"
