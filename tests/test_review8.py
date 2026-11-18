"""Review v0.8.0 fixes: known names before feature/collab splitting (M1), one cache version for
the DJ index via DB triggers incl. incremental rebuild (M2, m1), playlist minors (m2-m7, m9) and
the bridge id checks. No network."""

from __future__ import annotations

import os
import time

import pytest

from app.core import artists, playlists, series
from app.core.config import Settings
from tests.test_api import env  # noqa: F401  (fixture)
from tests.test_artists_playlists import add_set, edition, lib  # noqa: F401  (lib = fixture)


@pytest.fixture
def settings(tmp_path):
    s = Settings()
    s.storage.target_dir = str(tmp_path / "music")
    return s


# =========================================================================== M1


@pytest.mark.parametrize(
    ("text", "want"),
    [
        ("Mark With a K", ["Mark With a K"]),
        ("Mark With a K & MC Chucky", ["Mark With a K"]),
        ("Mark With a K b2b Angerfist", ["Mark With a K", "Angerfist"]),
        ("Mark With a K (Live)", ["Mark With a K"]),
        ("Headhunterz presents Project One", ["Headhunterz"]),
        ("Headhunterz pres. Something", ["Headhunterz"]),
        ("Sub Zero Project", ["Sub Zero Project"]),
        ("Brennan Heart & Wildstylez", ["Brennan Heart", "Wildstylez"]),
        ("D-Block & S-te-Fan", ["D-Block & S-te-Fan"]),
        ("D-Block and S-te-Fan", ["D-Block and S-te-Fan"]),
        ("Angerfist b2b Miss K8", ["Angerfist", "Miss K8"]),
        ("MC Nolz", ["MC Nolz"]),
        ("Will Sparks & MC Stretch", ["Will Sparks"]),
        ("Radical Redemption with MC Diesel", ["Radical Redemption"]),
        ("Headhunterz with Wildstylez", ["Headhunterz", "Wildstylez"]),
        ("Withheld", ["Withheld"]),  # «with» only as a whole word
        ("Presents of Mind", ["Presents of Mind"]),
    ],
)
def test_split_credit_known_names_first(db, text, want):
    artists.ensure_seeded(db)
    assert artists.split_credit(text, artists._known(db)) == want


def test_unknown_with_is_not_cut(db):
    artists.ensure_seeded(db)
    db.execute("DELETE FROM artists WHERE key = 'markwithak'")
    assert artists.split_credit("Mark With a K", artists._known(db)) == ["Mark With a K"]


def test_manual_artist_wins_over_feature_cut(db, settings):
    """A user-added name with «presents» inside is matched before the presenter cut."""
    add_set(
        db,
        settings,
        "p1",
        "Storm Presents Chaos & MC Chucky | Defqon.1 2024",
        edition_id=edition(db, "defqon1", 2024),
    )
    assert artists.credits(db, settings, "p1") == ["Storm"]
    artists.save_artist(db, settings, {"name": "Storm Presents Chaos"})
    assert artists.credits(db, settings, "p1") == ["Storm Presents Chaos"]


def test_known_duo_split_by_user(db):
    """Without the duo row, its members (if known) are two acts."""
    artists.ensure_seeded(db)
    db.execute("DELETE FROM artists WHERE key = ?", (artists.key_of("D-Block & S-te-Fan"),))
    known = artists._known(db)
    assert artists.split_credit("D-Block & S-te-Fan", known) == ["D-Block", "S-te-Fan"]


# =========================================================================== M2 + m1


def _keys(db, settings):
    return {a["key"]: a for a in artists.list_artists(db, settings)}


def test_cache_follows_festival_retag_delete_and_collector(db, settings):
    """No `invalidate()` anywhere: the trigger-bumped cache version alone refreshes the index."""
    add_set(db, settings, "m1", "Mystery DJ | Some Rave", channel="Random Uploads")
    assert "mysterydj" not in _keys(db, settings)  # title not trusted without a festival
    ed = edition(db, "defqon1", 2024)
    series.set_manual(db, "m1", {"edition_id": ed, "stage": "RED"})  # set_festival
    got = _keys(db, settings)["mysterydj"]
    assert got["sets"] == 1 and got["festivals"] == 1
    series.set_manual(db, "m1", None)  # «no festival»
    assert "mysterydj" not in _keys(db, settings)

    series.set_manual(db, "m1", {"edition_id": ed})
    db.execute("UPDATE videos SET title = ? WHERE id = 'm1'", ("Other DJ | Some Rave",))  # retag
    keys = _keys(db, settings)
    assert "otherdj" in keys and "mysterydj" not in keys

    db.execute(  # festival collector confirms a timetable row for the set
        "INSERT INTO checklist_rows(edition_id, artist, source, video_id, confirmed) "
        "VALUES (?, 'Timetable Act', 'timetable', 'm1', 1)",
        (ed,),
    )
    keys = _keys(db, settings)
    assert "timetableact" in keys and "otherdj" not in keys
    db.execute("UPDATE checklist_rows SET confirmed = 0")
    assert "otherdj" in _keys(db, settings)

    db.delete_video("m1")
    assert "otherdj" not in _keys(db, settings)


def test_cache_follows_merge_split_and_other_process(db, settings, tmp_path):
    add_set(db, settings, "a", "Angerfist | Dominator 2024", edition_id=edition(db, "dominator"))
    add_set(db, settings, "b", "Angerfist Mix by Kid Pulse")
    assert {"angerfist", "kidpulse"} <= set(_keys(db, settings))
    artists.merge(db, settings, ["kidpulse"], "angerfist")
    assert "kidpulse" not in _keys(db, settings)
    artists.split(db, settings, "angerfist", "Kid Pulse")
    assert "kidpulse" in _keys(db, settings)
    # another process (headless) writes: only the DB counter tells this process
    db.execute("UPDATE artists SET hidden = 1 WHERE key = 'angerfist'")
    assert "angerfist" not in _keys(db, settings)


def test_download_progress_does_not_bump(db, settings):
    add_set(db, settings, "x", "Angerfist | Dominator 2024")
    before = artists._revisions(db)
    db.upsert_video({"id": "q", "title": "Queued", "channel_name": "c", "channel_id": "c"})
    db.set_status("q", "queued")
    db.set_status("q", "downloading")
    db.execute("UPDATE checklist_rows SET searched = 'x'")
    assert artists._revisions(db) == before
    db.set_status("q", "done", file_path="/x.mp3")
    assert artists._revisions(db)[0] != before[0] and artists._revisions(db)[1] == before[1]


def test_incremental_rebuild_parses_only_changed_rows(db, settings, monkeypatch):
    for i in range(30):
        add_set(db, settings, f"v{i}", f"Angerfist | Dominator {2000 + i}")
    artists.index(db, settings)
    calls = []
    real = artists._names_of_row
    monkeypatch.setattr(
        artists, "_names_of_row", lambda row, *a: calls.append(row["id"]) or real(row, *a)
    )
    add_set(db, settings, "new", "Sefa | Defqon.1 2024")
    idx = artists.index(db, settings)
    assert calls == ["new"] and idx.by_video["new"] == ["sefa"]
    assert len(idx.artists["angerfist"].videos) == 30
    calls.clear()
    artists.save_artist(db, settings, {"name": "Sefa", "aliases": ["Sefa Live"]})
    artists.index(db, settings)
    assert len(calls) == 31  # artist table changed: full rebuild


def test_hidden_artist_not_listed_as_b2b_partner(db, settings, lib):  # noqa: F811
    artists.set_hidden(db, settings, "missk8", True)
    sets = artists.detail(db, settings, "angerfist")["sets"]
    assert all("Miss K8" not in s["with"] for s in sets)


def test_merge_refuses_alias_overflow(db, settings):
    add_set(db, settings, "a", "Angerfist | Dominator 2024")
    add_set(db, settings, "b", "Sefa | Dominator 2024")
    artists.save_artist(
        db,
        settings,
        {"name": "Sefa", "aliases": [f"Sefa Alias {i}" for i in range(artists.MAX_ALIASES)]},
    )
    with pytest.raises(artists.ArtistError) as exc:
        artists.merge(db, settings, ["sefa"], "angerfist")
    assert "keys" in exc.value.errors
    assert db.query_one("SELECT 1 AS x FROM artists WHERE key = 'sefa'")  # nothing lost


# =========================================================================== playlists


@pytest.mark.parametrize("folder", ["#HardstyleMixes", " #Mixes", " Spaced"])
def test_relative_entry_never_reads_as_comment(settings, tmp_path, folder):
    root = tmp_path / "music"
    f = root / folder / "a.mp3"
    f.parent.mkdir(parents=True)
    f.write_bytes(b"x")
    rows = [{"id": "a", "title": "A", "file_path": str(f), "duration": 1}]
    text, _ = playlists.render(rows, root / "list.m3u8", relative=True, labels={})
    line = text.split("\n")[2]
    assert line.startswith("." + os.sep) and line[2:] == os.path.join(folder, "a.mp3")


def test_render_sanitises_every_line_break(settings, tmp_path):
    f = tmp_path / "a.mp3"
    f.write_bytes(b"x")
    rows = [{"id": "a", "title": "\n  Evil\r\n#EXTINF:1,x", "file_path": str(f)}]
    text, _ = playlists.render(rows, tmp_path / "p.m3u8", relative=True, labels={"a": " \n "})
    lines = text.split("\n")
    assert len(lines) == 4 and lines[1].startswith("#EXTINF:-1,Evil")
    assert " " not in text


def test_name_with_extension_and_tmp_file(db, settings, lib, tmp_path):  # noqa: F811
    t = playlists.target_path(tmp_path, "My List.m3u8", settings)
    assert t.name == "My List.m3u8"
    settings.storage.max_path_length = len(str(tmp_path)) + playlists.TMP_NAME_LEN
    with pytest.raises(playlists.PlaylistError):
        playlists.target_path(tmp_path, "ab", settings)
    settings.storage.max_path_length = 259
    (tmp_path / "Angerfist.m3u8.tmp").write_text("unrelated")
    res = playlists.export(
        db, settings, {"kind": "artist", "key": "angerfist"}, {"folder": str(tmp_path)}
    )
    assert res["ok"] and (tmp_path / "Angerfist.m3u8.tmp").read_text() == "unrelated"
    assert not list(tmp_path.glob(".hcl-*.tmp"))


def test_sync_does_not_recreate_deleted_playlist(db, settings, lib):  # noqa: F811
    res = playlists.export(db, settings, {"kind": "artist", "key": "angerfist"}, {"sync": True})
    target = settings.target_dir_path() / "Playlists" / "Angerfist.m3u8"
    assert res["ok"] and target.is_file()
    target.unlink()
    out = playlists.sync_all(db, settings)
    assert out["synced"] == 0 and out["gone"] == 1 and not target.exists()
    view = playlists.saved(db)[0]
    assert view["sync"] is False and view["exists"] is False
    # «Write now» for this playlist is an explicit request: it is written again
    assert playlists.sync_all(db, settings, only=[view["id"]])["synced"] == 1
    assert target.is_file()


def test_api_ids_from_js_never_raise(env):  # noqa: F811
    api = env.make()
    assert api.set_playlist_sync("abc", True)["ok"] is False
    assert api.forget_playlist(None)["ok"] is False
    assert api.sync_playlists(["x"])["ok"] is False


def test_sync_request_after_last_check_is_not_lost(env, monkeypatch):  # noqa: F811
    """m5: a request that reuses the running job's future is run once that job is done."""
    api = env.make()
    runs: list[int] = []
    monkeypatch.setattr(
        playlists,
        "sync_all",
        lambda db, cfg, **kw: runs.append(1) or {"ok": True, "synced": 1, "failed": 0},
    )
    emit = api._bus.emit

    def late_request(name, data):
        emit(name, data)
        if len(runs) == 1:  # a download finishes after the job's last dirty check
            assert api._pl_worker.busy("pl-sync")  # submit() reuses the running future
            api._request_playlist_sync()

    monkeypatch.setattr(api._bus, "emit", late_request)
    api._request_playlist_sync()
    end = time.monotonic() + 5
    while len(runs) < 2 and time.monotonic() < end:
        time.sleep(0.02)
    assert len(runs) == 2
