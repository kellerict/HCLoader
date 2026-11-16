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

    def m2(c):
        c.execute("ALTER TABLE videos ADD COLUMN extra TEXT")

    conn = sqlite3.connect(path)
    assert dbmod.migrate(conn, [*dbmod.MIGRATIONS, m2]) == 2
    cols = [r[1] for r in conn.execute("PRAGMA table_info(videos)")]
    assert "extra" in cols
    assert conn.execute("SELECT value FROM state WHERE key='k'").fetchone()[0] == "v"
    assert dbmod.migrate(conn, [*dbmod.MIGRATIONS, m2]) == 2  # idempotent
    conn.close()


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
