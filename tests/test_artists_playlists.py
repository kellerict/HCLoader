"""v0.8.0 DJ pages (core/artists.py) and playlist export (core/playlists.py): credit parsing,
b2b attribution, aliases/merge/split/hide, watchlist proposal, M3U8 format, relative paths
(incl. another Windows drive -> absolute), file names, overwrite, every export kind, sync and
the bridge methods. No network, no ffmpeg."""

from __future__ import annotations

import json
import ntpath
import sqlite3
import time

import pytest

from app.core import artists, playlists, series
from app.core import db as dbmod
from app.core.config import Settings
from app.core.db import Database
from tests.test_api import env  # noqa: F401  (fixture)


@pytest.fixture
def settings(tmp_path):
    s = Settings()
    s.storage.target_dir = str(tmp_path / "music")
    return s


def add_set(db, settings, vid, title, *, channel="Q-dance", cid="UCqdance0000000000000000", **kw):
    root = settings.target_dir_path()
    path = root / kw.pop("folder", "Hardstyle") / f"{vid}.mp3"
    path.parent.mkdir(parents=True, exist_ok=True)
    if not kw.pop("missing", False):
        path.write_bytes(b"ID3")
    db.upsert_video(
        {
            "id": vid,
            "title": title,
            "channel_name": channel,
            "channel_id": cid,
            "duration": kw.pop("duration", 3600),
            "upload_date": kw.pop("upload_date", "20240701"),
            "genre": kw.pop("genre", "Hardstyle"),
        }
    )
    db.set_status(vid, "done", file_path=str(path))
    if kw:
        sets = ", ".join(f"{k} = ?" for k in kw)
        db.execute(f"UPDATE videos SET {sets} WHERE id = ?", (*kw.values(), vid))
    return path


def edition(db, key="defqon1", year=2024):
    series.sync_builtin(db)
    sid = db.query_one("SELECT id FROM series WHERE key = ?", (key,))["id"]
    return series.ensure_edition(db, sid, year)


@pytest.fixture
def lib(db, settings):
    """A small library: festival sets, a b2b, alias spellings, a mix channel."""
    dq24 = edition(db, "defqon1", 2024)
    dom = edition(db, "dominator", 2024)
    add_set(db, settings, "a1", "Angerfist b2b Miss K8 | Dominator 2024", edition_id=dom)
    add_set(db, settings, "a2", "Angerfist | Defqon.1 2024 | BLACK", edition_id=dq24, stage="BLACK")
    add_set(db, settings, "h1", "HH @ Defqon.1 2022", upload_date="20220701")
    add_set(db, settings, "h2", "Headhunterz | Defqon.1 2024 | RED", edition_id=dq24, stage="RED")
    add_set(
        db, settings, "s1", "Sub-Zero Project | Defqon.1 2024 | RED", edition_id=dq24, stage="RED"
    )
    add_set(db, settings, "s2", "SubZero Project (Live) @ Reverze 2020", upload_date="20200301")
    add_set(db, settings, "y1", "Euphoric Hardstyle Yearmix 2026", channel="Euphoric Kicks")
    add_set(db, settings, "t1", "Raw Hour 12", channel="Da Tweekaz", cid="UCtweekaz000000000000000")
    add_set(db, settings, "c1", "Defqon.1 2024 | RED | The Closing Ceremony", edition_id=dq24)
    artists.invalidate()
    return {"dq24": dq24, "dom": dom}


# =========================================================================== credit parsing


@pytest.mark.parametrize(
    ("text", "want"),
    [
        ("Angerfist b2b Miss K8", ["Angerfist", "Miss K8"]),
        ("Angerfist B2B Miss K8 b3b Sefa", ["Angerfist", "Miss K8", "Sefa"]),
        ("Brennan Heart & Wildstylez", ["Brennan Heart", "Wildstylez"]),
        ("D-Block & S-te-Fan", ["D-Block & S-te-Fan"]),  # known act (seed list)
        ("D-Block & S-te-Fan b2b Frontliner", ["D-Block & S-te-Fan", "Frontliner"]),
        ("Sub Zero Project x Dr. Peacock", ["Sub Zero Project", "Dr. Peacock"]),
        ("Radical Redemption feat. MC Diesel", ["Radical Redemption"]),
        ("Headhunterz (Live)", ["Headhunterz"]),
        ("Rebelion vs. Act of Rage", ["Rebelion", "Act of Rage"]),
        ("Sefa Live Set", ["Sefa"]),
        ("Hardstyle Yearmix 2026", []),
    ],
)
def test_split_credit(db, text, want):
    artists.ensure_seeded(db)
    assert artists.split_credit(text, artists._known(db)) == want


@pytest.mark.parametrize(
    ("title", "want"),
    [
        ("Headhunterz | Defqon.1 2024 | RED", "Headhunterz"),
        ("Defqon.1 2024 | RED | Headhunterz", "Headhunterz"),
        ("Dominator 2024 | Mainstage | Sefa – Closing Set", "Sefa"),
        ("Dominator 2023 | Warm-Up Mix by Never Surrender", "Never Surrender"),
        ("Q-dance Radio 512 | Hosted by Villain", "Villain"),
        ("Defqon.1 2024 | RED | The Closing Ceremony", None),
        ("Euphoric Hardstyle Yearmix 2026", None),
        ("Raw Nation Podcast #4", None),
        ("The Prophet - Defqon.1 2018", "The Prophet"),
        ("Hard Driver | Defqon.1 2019 | RED", "Hard Driver"),
    ],
)
def test_credit_from_title(db, settings, title, want):
    cat = series.catalog(db, settings)
    assert artists.credit_from_title(title, cat, artists._known(db)) == want


def test_key_folds_spelling_variants():
    k = artists.key_of
    assert (
        k("Sub Zero Project") == k("Sub-Zero Project") == k("SubZero Project") == "subzeroproject"
    )
    assert k("Ränd-Y") == "randy"
    assert artists.initials("Sub Zero Project") == "SZ"
    assert artists.initials("Headhunterz") == "HE"


# =========================================================================== index


def test_index_attributes_b2b_aliases_and_skips_mix_channels(db, settings, lib):
    by = {a["key"]: a for a in artists.list_artists(db, settings)}
    assert by["angerfist"]["sets"] == 2 and by["angerfist"]["b2b"] == 1
    assert by["missk8"]["sets"] == 1 and by["missk8"]["b2b"] == 1
    assert by["headhunterz"]["sets"] == 2  # «HH» is a seeded alias
    assert by["subzeroproject"]["sets"] == 2 and by["subzeroproject"]["name"] == "Sub Zero Project"
    assert by["datweekaz"]["sets"] == 1  # own channel, title without a name
    assert "euphorickicks" not in by  # a mix channel is not a DJ
    assert by["angerfist"]["festivals"] == 2 and by["angerfist"]["years"] == [2024]
    assert by["headhunterz"]["years"] == [2022, 2024]
    assert by["headhunterz"]["seconds"] == 7200


def test_list_sort_and_search(db, settings, lib):
    names = [a["name"] for a in artists.list_artists(db, settings, {"sort": "name"})]
    assert names == sorted(names, key=str.casefold)
    recent = artists.list_artists(db, settings, {"sort": "recent"})
    assert recent[0]["last"] >= recent[-1]["last"]
    hits = artists.list_artists(db, settings, {"search": "hh"})
    assert [a["key"] for a in hits] == ["headhunterz"]  # found by alias


def test_detail_sets_partners_and_tracks(db, settings, lib):
    db.execute(
        "INSERT INTO tracks(video_id, position, artist, title, key) VALUES "
        "('a1', 1, 'Angerfist', 'Raise & Revolt', 'angerfist|raise revolt'), "
        "('a2', 1, 'Angerfist', 'Raise & Revolt', 'angerfist|raise revolt'), "
        "('a2', 2, 'Angerfist', 'Street Fighter', 'angerfist|street fighter')"
    )
    d = artists.detail(db, settings, "angerfist")
    sets = {s["id"]: s for s in d["sets"]}
    assert sets["a1"] == {"id": "a1", "role": "b2b", "with": ["Miss K8"]}
    assert sets["a2"]["role"] == "solo"
    assert d["tracks"][0] == {
        "artist": "Angerfist",
        "title": "Raise & Revolt",
        "version": "",
        "sets": 2,
    }
    assert artists.detail(db, settings, "HH")["artist"]["key"] == "headhunterz"  # alias resolves
    assert artists.detail(db, settings, "nobody") is None


def test_confirmed_checklist_row_wins_over_title(db, settings, lib):
    db.execute(
        "INSERT INTO checklist_rows(edition_id, artist, source, status, video_id, confirmed) "
        "VALUES (?, 'Rooler b2b Vertile', 'timetable', 'downloaded', 'c1', 1)",
        (lib["dq24"],),
    )
    artists.invalidate()
    by = {a["key"]: a for a in artists.list_artists(db, settings)}
    assert by["rooler"]["sets"] == 1 and by["vertile"]["b2b"] == 1


def test_merge_split_hide_and_save(db, settings, lib):
    add_set(db, settings, "m1", "Mad Dog | Masters of Hardcore 2024", upload_date="20240301")
    add_set(db, settings, "m2", "MadDawg | Dominator 2023", upload_date="20230701")
    artists.invalidate()
    keys = {a["key"] for a in artists.list_artists(db, settings)}
    assert {"maddog", "maddawg"} <= keys
    artists.merge(db, settings, ["maddawg"], "maddog")
    by = {a["key"]: a for a in artists.list_artists(db, settings)}
    assert by["maddog"]["sets"] == 2 and "MadDawg" in by["maddog"]["aliases"]
    assert "maddawg" not in by
    artists.split(db, settings, "maddog", "MadDawg")
    by = {a["key"]: a for a in artists.list_artists(db, settings)}
    assert by["maddog"]["sets"] == 1 and by["maddawg"]["sets"] == 1

    artists.set_hidden(db, settings, "datweekaz", True)
    assert "datweekaz" not in {a["key"] for a in artists.list_artists(db, settings)}
    assert [a["key"] for a in artists.list_artists(db, settings, {"hidden": True})] == ["datweekaz"]

    # an alias of another saved artist is refused; an alias that is a derived artist merges
    with pytest.raises(artists.ArtistError) as exc:
        artists.save_artist(
            db, settings, {"key": "angerfist", "name": "Angerfist", "aliases": ["HH"]}
        )
    assert "Headhunterz" in exc.value.errors["aliases"]
    artists.save_artist(db, settings, {"key": "maddog", "name": "Mad Dog", "aliases": ["MadDawg"]})
    by = {a["key"]: a for a in artists.list_artists(db, settings)}
    assert by["maddog"]["sets"] == 2 and "maddawg" not in by  # alias of a derived artist = merge
    with pytest.raises(artists.ArtistError):
        artists.save_artist(db, settings, {"name": " "})
    with pytest.raises(artists.ArtistError) as exc:
        artists.save_artist(db, settings, {"name": "X", "channel_url": "https://example.com/x"})
    assert "channel_url" in exc.value.errors


def test_watch_proposal_channel_or_search(db, settings, lib):
    p = artists.watch_proposal(db, settings, "datweekaz")
    assert p["type"] == "channel"
    assert p["url_or_query"] == "https://www.youtube.com/channel/UCtweekaz000000000000000"
    p = artists.watch_proposal(db, settings, "headhunterz")
    assert p == {
        "type": "search",
        "name": "Headhunterz live set",
        "url_or_query": "Headhunterz live set",
        "platform": "youtube",
        "artist": "Headhunterz",
    }
    artists.save_artist(
        db,
        settings,
        {"key": "headhunterz", "name": "Headhunterz", "aliases": ["HH"],
         "channel_url": "https://www.youtube.com/@headhunterz"},
    )  # fmt: skip
    assert artists.watch_proposal(db, settings, "HH")["type"] == "channel"


def test_seed_is_inserted_once_and_never_again(db, settings):
    assert artists.ensure_seeded(db) > 0
    db.execute("DELETE FROM artists WHERE key = 'headhunterz'")
    assert artists.ensure_seeded(db) == 0
    assert db.query_one("SELECT 1 AS x FROM artists WHERE key = 'headhunterz'") is None


def test_migration_13_from_v12_keeps_data_and_backs_up(tmp_path):
    path = tmp_path / "old.db"
    conn = sqlite3.connect(path, isolation_level=None)
    dbmod.migrate(conn, dbmod.MIGRATIONS[:12])
    conn.execute("INSERT INTO videos(id, title, status) VALUES ('abcdefghijk', 'Alt', 'done')")
    conn.close()
    with Database(path) as d:
        assert d.schema_version() == len(dbmod.MIGRATIONS) >= 13
        assert d.get_video("abcdefghijk")["title"] == "Alt"
        cols = {r["name"] for r in d.query("PRAGMA table_info(artists)")}
        assert {"key", "name", "aliases", "channel_url", "hidden", "builtin"} <= cols
        cols = {r["name"] for r in d.query("PRAGMA table_info(playlists)")}
        assert {"name", "spec", "path", "relative", "sync", "count"} <= cols
    assert len(list((tmp_path / "backups").glob("hcloader-premigrate-v12-to-v*.db"))) == 1


# =========================================================================== M3U8


def test_render_format_relative_and_missing(settings, tmp_path):
    root = settings.target_dir_path()
    a = root / "Hardstyle" / "a.mp3"
    a.parent.mkdir(parents=True)
    a.write_bytes(b"x")
    rows = [
        {"id": "a", "title": "A", "file_path": str(a), "duration": 3725},
        {"id": "b", "title": "B", "file_path": str(root / "gone.mp3"), "duration": 60},
        {"id": "c", "title": "C", "file_path": str(a), "duration": None},
    ]
    text, counts = playlists.render(
        rows, root / "Playlists" / "x.m3u8", relative=True, labels={"a": "DJ - Set, live"}
    )
    lines = text.split("\n")
    assert lines[0] == "#EXTM3U"
    assert lines[1] == "#EXTINF:3725,DJ - Set, live"
    assert lines[2].replace("\\", "/") == "../Hardstyle/a.mp3"
    assert lines[3] == "#EXTINF:-1,C"
    assert counts == {"count": 2, "skipped": 1, "absolute_fallback": 0}
    assert text.endswith("\n") and "\r" not in text
    text, _ = playlists.render(rows[:1], root / "Playlists" / "x.m3u8", relative=False, labels={})
    assert text.split("\n")[2] == str(a)


@pytest.mark.parametrize(
    ("file", "base", "want", "fallback"),
    [
        (r"D:\Music\HC\Hardcore\a.mp3", r"D:\Music\HC\Playlists", r"..\Hardcore\a.mp3", False),
        (r"D:\Music\HC\a.mp3", r"d:\music\hc", r"a.mp3", False),  # case-insensitive drive
        (r"E:\Music\a.mp3", r"D:\Music\HC\Playlists", r"E:\Music\a.mp3", True),  # other drive
        (r"\\nas\share\a.mp3", r"D:\Playlists", r"\\nas\share\a.mp3", True),  # UNC share
    ],
)
def test_entry_path_windows_drives(file, base, want, fallback):
    assert playlists.entry_path(file, base, True, ntpath) == (want, fallback)
    assert playlists.entry_path(file, base, False, ntpath) == (file, False)


def test_render_counts_absolute_fallback_on_windows(settings, monkeypatch):
    monkeypatch.setattr(playlists, "_exists", lambda fp: True)
    rows = [
        {"id": "a", "title": "A", "file_path": r"D:\HC\a.mp3", "duration": 1},
        {"id": "b", "title": "B", "file_path": r"E:\Other\b.mp3", "duration": 2},
    ]
    text, counts = playlists.render(
        rows, r"D:\HC\Playlists\p.m3u8", relative=True, labels={}, mod=ntpath
    )
    assert counts["absolute_fallback"] == 1
    assert r"..\a.mp3" in text and r"E:\Other\b.mp3" in text


def test_label_drops_repeated_artist_segment(settings):
    row = {"title": "Sub Zero Project | Defqon.1 2024 | RED", "channel_name": "Q-dance"}
    assert (
        playlists.label(row, ["Sub Zero Project"], settings)
        == "Sub Zero Project - Defqon.1 2024 | RED"
    )
    row = {"title": "Angerfist b2b Miss K8 | Dominator 2024", "channel_name": "x"}
    assert (
        playlists.label(row, ["Angerfist", "Miss K8"], settings)
        == "Angerfist b2b Miss K8 - Dominator 2024"
    )
    row = {"title": "Yearmix\n2026 (Official Video)", "channel_name": "Euphoric Kicks"}
    assert playlists.label(row, [], settings) == "Euphoric Kicks - Yearmix 2026"


def test_target_path_sanitises_and_respects_path_length(settings, tmp_path):
    p = playlists.target_path(tmp_path, 'Defqon.1 2024: RED/BLUE? "Best"', settings)
    assert p.name == "Defqon.1 2024- RED-BLUE 'Best'.m3u8"
    # Windows temp folders are long: the limit is set relative to the folder of this test
    folder = tmp_path / "pl"
    settings.storage.max_path_length = len(str(folder)) + 30
    p = playlists.target_path(folder, "A very long playlist name " * 5, settings)
    assert paths_len(p) < settings.storage.max_path_length and p.suffix == ".m3u8"
    assert p.name.startswith("A very long")
    with pytest.raises(playlists.PlaylistError):
        playlists.target_path(folder / ("y" * 40), "Name", settings)
    with pytest.raises(playlists.PlaylistError):
        playlists.target_path(tmp_path, " ... ", settings)


# =========================================================================== export kinds


def paths_len(p):
    from app.core.paths import windows_length

    return windows_length(p)


def _entries(path):
    return [
        ln for ln in path.read_text(encoding="utf-8").split("\n") if ln and not ln.startswith("#")
    ]


def test_export_kinds(db, settings, lib, tmp_path):
    out = tmp_path / "pl"
    ex = lambda spec, name: playlists.export(db, settings, spec, {"folder": str(out), "name": name})  # noqa: E731

    r = ex({"kind": "edition", "edition_id": lib["dq24"]}, "dq")
    assert r["ok"] and r["count"] == 4 and r["relative"] is True
    assert all(e.startswith("..") for e in _entries(out / "dq.m3u8"))
    r = ex(
        {
            "kind": "series",
            "series_id": db.query_one("SELECT id FROM series WHERE key='defqon1'")["id"],
        },
        "s",
    )
    assert r["count"] == 4
    assert ex({"kind": "genre", "genre": "Hardstyle"}, "g")["count"] == 9
    r = ex({"kind": "artist", "key": "HH"}, "hh")
    assert r["count"] == 2
    text = (out / "hh.m3u8").read_text(encoding="utf-8")
    assert "#EXTINF:3600,Headhunterz - Defqon.1 2024 | RED" in text
    r = ex(
        {"kind": "filter", "filters": {"search": "defqon", "year": "2024"}, "sort": "title"}, "f"
    )
    assert r["count"] == 4  # h1 is from 2022
    db.execute(
        "INSERT INTO checklist_rows(edition_id, artist, source, status, video_id, confirmed, "
        "position) VALUES (?, 'Headhunterz', 'timetable', 'downloaded', 'h2', 1, 1), "
        "(?, 'Ghost', 'timetable', 'missing', NULL, 0, 2)",
        (lib["dq24"], lib["dq24"]),
    )
    assert ex({"kind": "checklist", "edition_id": lib["dq24"]}, "cl")["count"] == 1
    db.execute(
        "INSERT INTO playback(video_id, position, duration, updated) "
        "VALUES ('a1', 600, 3600, '2026-01-01')"
    )
    assert ex({"kind": "continue"}, "cont")["count"] == 1
    with pytest.raises(playlists.PlaylistError):
        ex({"kind": "nope"}, "x")


def test_export_overwrite_flow_and_saved_list(db, settings, lib, tmp_path):
    spec = {"kind": "artist", "key": "angerfist"}
    first = playlists.export(db, settings, spec)
    target = settings.target_dir_path() / "Playlists" / "Angerfist.m3u8"
    assert first["ok"] and first["path"] == str(target) and target.is_file()
    again = playlists.export(db, settings, spec)
    assert again == {"ok": False, "exists": True, "path": str(target)}
    ok = playlists.export(db, settings, spec, {"overwrite": True, "sync": True, "relative": False})
    assert (
        ok["ok"] and ok["sync"] and _entries(target)[0].startswith(str(settings.target_dir_path()))
    )
    saved = playlists.saved(db)
    assert (
        len(saved) == 1
        and saved[0]["sync"]
        and saved[0]["kind"] == "artist"
        and saved[0]["count"] == 2
    )
    pv = playlists.preview(db, settings, spec)
    assert pv["name"] == "Angerfist" and pv["count"] == 2 and pv["saved"]["id"] == saved[0]["id"]


def test_sync_rewrites_marked_playlists(db, settings, lib):
    playlists.export(db, settings, {"kind": "artist", "key": "angerfist"}, {"sync": True})
    playlists.export(db, settings, {"kind": "genre", "genre": "Hardcore"}, {"sync": False})
    add_set(db, settings, "a3", "Angerfist | Thunderdome 2024")
    artists.invalidate()
    res = playlists.sync_all(db, settings)
    assert res["synced"] == 1 and res["failed"] == 0
    target = settings.target_dir_path() / "Playlists" / "Angerfist.m3u8"
    assert len(_entries(target)) == 3
    pid = playlists.saved(db)[0]["id"]
    assert playlists.set_sync(db, pid, False) and playlists.sync_all(db, settings)["synced"] == 0
    assert playlists.forget(db, pid) and target.is_file()  # forgetting keeps the file


# =========================================================================== bridge


def _wait(pred, timeout=5):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        if pred():
            return True
        time.sleep(0.02)
    return False


def test_api_artists_and_watch(env, tmp_path):  # noqa: F811
    api = env.make()
    api._settings.storage.target_dir = str(tmp_path / "music")
    add_set(api._db, api._settings, "a1", "Angerfist b2b Miss K8 | Dominator 2024")
    add_set(
        api._db,
        api._settings,
        "t1",
        "Raw Hour",
        channel="Da Tweekaz",
        cid="UCtweekaz000000000000000",
    )
    artists.invalidate()
    r = api.get_artists({"sort": "sets"})
    assert r["ok"] and {a["key"] for a in r["artists"]} == {"angerfist", "missk8", "datweekaz"}
    d = api.get_artist("angerfist")
    assert d["ok"] and d["sets"][0]["id"] == "a1" and d["sets"][0]["role"] == "b2b"
    assert d["sets"][0]["with"] == ["Miss K8"] and d["sets"][0]["file_path"]
    assert api.get_artist("nobody")["ok"] is False
    bad = api.save_artist({"name": ""})
    assert bad["ok"] is False and "name" in bad["errors"]
    assert api.merge_artists(["missk8"], "angerfist") == {"ok": True, "key": "angerfist"}
    assert api.split_artist("angerfist", "Miss K8")["ok"]
    assert api.hide_artist("missk8", True)["ok"]
    assert api.get_artists()["hidden"] == 1

    w = api.get_artist_watch("datweekaz")
    assert w["ok"] and w["source"]["type"] == "channel" and w["existing"] is None
    saved = api.save_source(w["source"])
    assert saved["ok"]
    again = api.get_artist_watch("datweekaz")
    assert again["existing"]["id"] == saved["source"]["id"]
    s = api.get_artist_watch("angerfist")["source"]
    assert s == {
        "type": "search",
        "name": "Angerfist live set",
        "url_or_query": "Angerfist live set",
        "platform": "youtube",
    }


def test_api_playlists_and_sync_after_download(env, tmp_path):  # noqa: F811
    api = env.make()
    api._settings.storage.target_dir = str(tmp_path / "music")
    add_set(api._db, api._settings, "a1", "Angerfist | Dominator 2024")
    artists.invalidate()
    spec = {"kind": "artist", "key": "angerfist"}
    pv = api.preview_playlist(spec)
    assert pv["ok"] and pv["count"] == 1 and pv["folder"].endswith("Playlists")
    assert api.preview_playlist({"kind": "?"})["ok"] is False
    r = api.export_playlist(spec, {"sync": True})
    assert r["ok"] and r["count"] == 1
    assert api.export_playlist(spec)["exists"] is True
    lst = api.get_saved_playlists()
    assert lst["sync_enabled"] is False and lst["playlists"][0]["sync"] is True

    add_set(api._db, api._settings, "a2", "Angerfist | Thunderdome 2024")
    artists.invalidate()
    api._after_download("a2")  # setting off: nothing happens
    api._pl_worker.run("probe", lambda: None, timeout=5)
    assert len(_entries(tmp_path / "music" / "Playlists" / "Angerfist.m3u8")) == 1
    api._settings.playlists.sync_after_download = True
    api._after_download("a2")
    assert _wait(lambda: len(_entries(tmp_path / "music" / "Playlists" / "Angerfist.m3u8")) == 2)
    api._bus.flush(5)
    assert _wait(lambda: env.window.events_of("playlists_synced"))
    assert env.window.events_of("playlists_synced")[-1] == {"synced": 1, "failed": 0}

    pid = lst["playlists"][0]["id"]
    assert api.set_playlist_sync(pid, False) == {"ok": True}
    assert api.set_playlist_sync(9999, True)["ok"] is False
    assert api.sync_playlists([pid])["synced"] == 1
    assert api.forget_playlist(pid) == {"ok": True}
    assert api.get_saved_playlists()["playlists"] == []
    assert json.loads(json.dumps(pv))  # bridge payloads are JSON


def test_mix_channels_and_shows_name_no_dj(db, settings):
    add_set(db, settings, "o1", "Overdrive – 1 Hour Uptempo Mix", channel="Distortion Unit")
    add_set(db, settings, "q1", "Qlimax 2024 | Rise of the Celestials | Full Show")
    add_set(
        db,
        settings,
        "u1",
        "Rooler – Summer Mix 2024",
        channel="Rooler",
        cid="UCrooler0000000000000000",
    )
    add_set(
        db, settings, "u2", "Sunday Rave Session", channel="Rooler", cid="UCrooler0000000000000000"
    )
    artists.invalidate()
    keys = {a["key"]: a for a in artists.list_artists(db, settings)}
    assert "overdrive" not in keys and "distortionunit" not in keys
    assert "riseofthecelestials" not in keys
    assert keys["rooler"]["sets"] == 1  # own name in the title; «Sunday Rave Session» names nobody
