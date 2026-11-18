# ruff: noqa: E501
"""v0.6.0 «Tracklist search»: description parser (table-driven), track normalisation,
extraction from chapters / ID3 CHAP / CUE / description, migration 10, storage, FTS5 search
(and the LIKE fallback), «most played», the offline pass, the bridge API and the
download -> tracklist -> search flow. No network."""

from __future__ import annotations

import sqlite3
import threading

import pytest
from test_api import env  # noqa: F401  (fixture)
from test_integration_queue import world  # noqa: F401  (fixture)

from app.core import db as dbmod
from app.core import sidecar, tagging, tracklist
from app.core.db import Database
from app.core.tagging import Chapter
from app.core.tracklist import parse_description, parse_track


def fmt(t: tracklist.Track) -> str:
    if t.start is None:
        ts = "-"
    else:
        s = int(t.start)
        ts = (
            f"{s // 3600}:{s // 60 % 60:02d}:{s % 60:02d}"
            if s >= 3600
            else f"{s // 60}:{s % 60:02d}"
        )
    out = f"{ts}|{t.artist}|{t.title}|{t.version}|{t.label}"
    return out + ("|ID" if t.is_id else "")


# =========================================================================== description table

DESCRIPTIONS = [
    # 1 classic timestamps, intro without artist
    (
        "Tracklist:\n00:00 Intro\n03:12 Headhunterz - Dragonborn\n07:45 Wildstylez - Lose My Mind",
        ["0:00||Intro||", "3:12|Headhunterz|Dragonborn||", "7:45|Wildstylez|Lose My Mind||"],
    ),
    # 2 bracketed timestamps, en dash, remix in parentheses
    (
        "[00:00] Sub Zero Project – The Project\n[12:34] Rebelion – Rage (D-Sturb Remix)",
        ["0:00|Sub Zero Project|The Project||", "12:34|Rebelion|Rage|D-Sturb Remix|"],
    ),
    # 3 hours, h:mm:ss and mixed widths
    (
        "0:00 A - One\n59:59 B - Two\n1:02:03 C - Three\n01:10:00 D - Four",
        ["0:00|A|One||", "59:59|B|Two||", "1:02:03|C|Three||", "1:10:00|D|Four||"],
    ),
    # 4 numbered list with label, no timestamps
    (
        "1. Angerfist - Raise Your Fist [Masters of Hardcore]\n2. Miss K8 - Discombobulated [Masters of Hardcore]",
        [
            "-|Angerfist|Raise Your Fist||Masters of Hardcore",
            "-|Miss K8|Discombobulated||Masters of Hardcore",
        ],
    ),
    # 5 ID - ID and Artist - ID
    (
        "00:00 Warface - Wrecking Ball\n04:00 ID - ID\n08:00 Sub Zero Project - ID",
        ["0:00|Warface|Wrecking Ball||", "4:00|ID|ID|||ID", "8:00|Sub Zero Project|ID|||ID"],
    ),
    # 6 feat. variants are unified
    (
        "00:00 Coone ft. Gloria Kaye - Million Miles\n03:00 Brennan Heart featuring Jake Reese - Imaginary\n06:00 Da Tweekaz Feat Hardstyle Mike - Jägermeister",
        [
            "0:00|Coone feat. Gloria Kaye|Million Miles||",
            "3:00|Brennan Heart feat. Jake Reese|Imaginary||",
            "6:00|Da Tweekaz feat. Hardstyle Mike|Jägermeister||",
        ],
    ),
    # 7 feat. in the title moves to the artist
    (
        "00:00 Headhunterz - Reignite (feat. Malukah)\n04:10 Wildstylez - Year Of Summer feat. Niels Geusebroek",
        [
            "0:00|Headhunterz feat. Malukah|Reignite||",
            "4:10|Wildstylez feat. Niels Geusebroek|Year Of Summer||",
        ],
    ),
    # 8 x / X / vs / VS. / &
    (
        "00:00 Sub Zero Project X Devin Wild - Meltdown\n03:00 D-Sturb VS. Act of Rage - Lights Out\n06:00 Brennan Heart&Wildstylez - Lose It",
        [
            "0:00|Sub Zero Project x Devin Wild|Meltdown||",
            "3:00|D-Sturb vs. Act of Rage|Lights Out||",
            "6:00|Brennan Heart & Wildstylez|Lose It||",
        ],
    ),
    # 9 version as a trailing dash segment
    (
        "00:00 Phuture Noize - Bring Back The Kick - Rebelion Remix\n05:00 Ran-D - Zombie - VIP Edit",
        ["0:00|Phuture Noize|Bring Back The Kick|Rebelion Remix|", "5:00|Ran-D|Zombie|VIP Edit|"],
    ),
    # 10 unicode quotes and em dashes
    (
        "00:00 “Brennan Heart” — “Lose My Mind”\n02:30 ‘Zatox’ – ‘No Way Back’",
        ["0:00|Brennan Heart|Lose My Mind||", "2:30|Zatox|No Way Back||"],
    ),
    # 11 timestamp at the end of the line
    (
        "Headhunterz - Dragonborn 0:00\nWildstylez - Lose My Mind (3:20)\nNoisecontrollers - Crump [7:05]",
        [
            "0:00|Headhunterz|Dragonborn||",
            "3:20|Wildstylez|Lose My Mind||",
            "7:05|Noisecontrollers|Crump||",
        ],
    ),
    # 12 pipes and separators after the timestamp
    (
        "00:00:00 | Rooler - Barbarian\n00:03:30 - Mutilator - Raw Style\n00:07:00 : Vertile - Dance No More",
        ["0:00|Rooler|Barbarian||", "3:30|Mutilator|Raw Style||", "7:00|Vertile|Dance No More||"],
    ),
    # 13 numbered AND timestamped
    (
        "01. 00:00 Angerfist - Dreamseeker\n02. 04:12 Destructive Tendencies - Never Silence Us",
        ["0:00|Angerfist|Dreamseeker||", "4:12|Destructive Tendencies|Never Silence Us||"],
    ),
    # 14 bullets and emoji in front
    (
        "• 00:00 Dr. Peacock - Trip To Frenchcore\n▶ 03:00 Sefa - Le Bateau\n🔥 06:00 Billx - Nuance",
        ["0:00|Dr. Peacock|Trip To Frenchcore||", "3:00|Sefa|Le Bateau||", "6:00|Billx|Nuance||"],
    ),
    # 15 numbering with ) and #
    (
        "Tracklist\n1) Partyraiser - Spin It\n#2 Dimitri K - Vengeance\n3) Drokz - Hardcore Junkie",
        ["-|Partyraiser|Spin It||", "-|Dimitri K|Vengeance||", "-|Drokz|Hardcore Junkie||"],
    ),
    # 16 plain block after a heading, ended by a blank line
    (
        "Tracklist:\nAngerfist - Raise Your Fist\nMiss K8 - Discombobulated\n\nFollow us - Instagram",
        ["-|Angerfist|Raise Your Fist||", "-|Miss K8|Discombobulated||"],
    ),
    # 17 timetable ranges are NOT a tracklist
    ("Line-up:\n12:00 - 13:00 Headhunterz\n13:00 - 14:00 Wildstylez\n14:00 - 15:00 Coone", []),
    # 18 promo lines with links are ignored
    (
        "Tickets: https://example.org 12:00\n00:00 Zatox - Wrath\n03:00 Gunz for Hire - Bang Bang\nFollow me 05:00 @instagram",
        ["0:00|Zatox|Wrath||", "3:00|Gunz for Hire|Bang Bang||"],
    ),
    # 19 a single timestamp is not a tracklist
    ("Recorded live 01:00 at the Mainstage\nHeadhunterz - Dragonborn 0:00", []),
    # 20 non-increasing timestamps are dropped (second list restarts)
    (
        "00:00 A - One\n05:00 B - Two\n03:00 C - Late\n09:00 D - Four",
        ["0:00|A|One||", "5:00|B|Two||", "9:00|D|Four||"],
    ),
    # 21 extended / original mix stay as version, label after version
    (
        "00:00 Rejecta - Ritual (Extended Mix) [Gearbox]\n04:00 Adrenalize - Rise (Original Mix)",
        ["0:00|Rejecta|Ritual|Extended Mix|Gearbox", "4:00|Adrenalize|Rise|Original Mix|"],
    ),
    # 22 VIP and Edit in square brackets are a version, not a label
    (
        "00:00 Sound Rush - Weekend [VIP]\n03:00 Atmozfears - Release [Edit]",
        ["0:00|Sound Rush|Weekend|VIP|", "3:00|Atmozfears|Release|Edit|"],
    ),
    # 23 ??? and Unknown are IDs
    (
        "00:00 ??? - ???\n02:00 Unknown - Unknown\n04:00 Radical Redemption - Brutal 6.0",
        ["0:00|ID|ID|||ID", "2:00|ID|ID|||ID", "4:00|Radical Redemption|Brutal 6.0||"],
    ),
    # 24 ID with a remix credit
    (
        "00:00 ID - ID (Sub Zero Project Remix)\n03:00 Act of Rage - ID (ID Remix)",
        ["0:00|ID|ID|Sub Zero Project Remix||ID", "3:00|Act of Rage|ID|ID Remix||ID"],
    ),
    # 25 title only lines with a timestamp
    (
        "00:00 Intro\n02:00 Headhunterz\n05:00 Outro",
        ["0:00||Intro||", "2:00||Headhunterz||", "5:00||Outro||"],
    ),
    # 26 Cyrillic, umlauts, CJK stay intact
    (
        "00:00 Гр. Ляпис - Капитал\n03:00 Böhse Hardcore - Überdosis\n06:00 東京 - 夜",
        ["0:00|Гр. Ляпис|Капитал||", "3:00|Böhse Hardcore|Überdosis||", "6:00|東京|夜||"],
    ),
    # 27 whole description with prose around the list
    (
        "Thanks for 100k!\nSet recorded at Defqon.1 2024 - BLACK.\n\n00:00 Warface - Stop Hating\n02:45 Mutilator - Fear\n\nBooking: info@example.org",
        ["0:00|Warface|Stop Hating||", "2:45|Mutilator|Fear||"],
    ),
    # 28 numbered without separator "01 Artist - Title" in a block
    (
        "Tracklist:\n01 Zatox - Wrath\n02 Rooler - Barbarian",
        ["-|Zatox|Wrath||", "-|Rooler|Barbarian||"],
    ),
    # 29 timestamps win over numbered lines
    (
        "1. Foo - Bar\n2. Baz - Qux\n00:00 Real - One\n04:00 Real - Two",
        ["0:00|Real|One||", "4:00|Real|Two||"],
    ),
    # 30 timestamps beyond the duration are dropped (duration 600 s)
    ("00:00 A - One\n05:00 B - Two\n15:00 C - Too Late", ["0:00|A|One||", "5:00|B|Two||"]),
    # 31 «with» stays inside the artist, comma list normalised
    (
        "00:00 Tha Playah,Nosferatu - Rave Rebels\n03:00 Angerfist , Outblast - Pennywise",
        ["0:00|Tha Playah, Nosferatu|Rave Rebels||", "3:00|Angerfist, Outblast|Pennywise||"],
    ),
    # 32 non-breaking spaces, tabs and zero-width characters
    (
        "00:00 Angerfist​ - Incoming\n03:00\tSevered - Beast",
        ["0:00|Angerfist|Incoming||", "3:00|Severed|Beast||"],
    ),
    # 33 dash-numbered lines "1 - Artist - Title"
    (
        "1 - Partyraiser - Brainstorm\n2 - Drokz - The Toxic",
        ["-|Partyraiser|Brainstorm||", "-|Drokz|The Toxic||"],
    ),
    # 34 empty / no tracklist at all
    ("Best hardstyle mix of the year. Enjoy!", []),
]


def test_description_table_is_large_enough():
    assert len(DESCRIPTIONS) >= 30


@pytest.mark.parametrize(
    ("text", "expected"), DESCRIPTIONS, ids=[str(i + 1) for i in range(len(DESCRIPTIONS))]
)
def test_parse_description(text, expected):
    duration = 600 if "Too Late" in text else None
    res = parse_description(text, duration)
    assert [fmt(t) for t in res.tracks] == expected
    if expected:
        assert res.timed == (not expected[0].startswith("-"))


@pytest.mark.parametrize(
    ("text", "artist", "title", "version", "label", "is_id"),
    [
        (
            "Headhunterz ft. Malukah – Reignite (Wildstylez Remix) [Q-dance Records]",
            "Headhunterz feat. Malukah",
            "Reignite",
            "Wildstylez Remix",
            "Q-dance Records",
            False,
        ),
        ("ID - ID", "ID", "ID", "", "", True),
        ("Angerfist - ID", "Angerfist", "ID", "", "", True),
        ("TBA - TBA", "ID", "ID", "", "", True),
        ("Intro", "", "Intro", "", "", False),
        ('"Artist" - "Title"', "Artist", "Title", "", "", False),
        ("A - B (Bootleg) (Live Edit)", "A", "B", "Bootleg / Live Edit", "", False),
        ("A versus B - C", "A vs. B", "C", "", "", False),
    ],
)
def test_parse_track(text, artist, title, version, label, is_id):
    t = parse_track(text)
    assert (t.artist, t.title, t.version, t.label, t.is_id) == (
        artist,
        title,
        version,
        label,
        is_id,
    )


def test_parse_track_empty():
    assert parse_track("") is None and parse_track("  - | ") is None


def test_fold_and_keys():
    assert tracklist.fold("Jägermeister “VIP” – Édit") == "jagermeister vip edit"
    assert tracklist.fold("Гр. Ляпис") == "гр ляпис"
    a = parse_track("Sub Zero Project x Devin Wild - Meltdown (Extended Mix)")
    b = parse_track("devin wild & sub zero project - MELTDOWN")
    c = parse_track("Sub Zero Project - Meltdown (VIP)")
    assert tracklist.track_key(a) == tracklist.track_key(b) != ""
    assert tracklist.track_key(c) != tracklist.track_key(a)  # a VIP is another track
    assert tracklist.track_key(parse_track("ID - ID")) == ""
    assert tracklist.track_key(parse_track("Intro")) == ""
    assert tracklist.search_text(parse_track("ID - ID")) == ""
    assert tracklist.search_text(parse_track("Angerfist - ID")) == "angerfist"


# =========================================================================== chapters / CUE


def test_from_chapters_skips_generic_titles():
    chs = [
        Chapter(0, "<Untitled Chapter 1>"),
        Chapter(60, "01. Headhunterz - Dragonborn"),
        Chapter(200, "Track 03"),
        Chapter(300, "Wildstylez - Lose My Mind"),
    ]
    assert [fmt(t) for t in tracklist.from_chapters(chs)] == [
        "1:00|Headhunterz|Dragonborn||",
        "5:00|Wildstylez|Lose My Mind||",
    ]


def test_from_cue_separates_set_performer(tmp_path):
    audio = tmp_path / "set.mp3"
    audio.write_bytes(b"")
    cue = tagging.write_cue(
        audio,
        [Chapter(0, "Intro"), Chapter(65.5, "Angerfist - Incoming"), Chapter(300, "Outro tool")],
        performer="DJ Mad Dog",
        title="Live",
    )
    tracks = tracklist.from_cue(cue.read_text(encoding="utf-8-sig"))
    assert [fmt(t) for t in tracks] == [
        "0:00||Intro||",
        "1:05|Angerfist|Incoming||",
        "5:00||Outro tool||",
    ]


# =========================================================================== migration / storage


@pytest.fixture
def lib(tmp_path):
    d = Database(tmp_path / "hc.db")
    yield d
    d.close()


def add_set(db, vid, title, *, status="done", downloaded=None, file_path=None):
    db.upsert_video(
        {"id": vid, "title": title, "channel_name": "Chan " + vid[:3], "duration": 3600}
    )
    if status == "done":
        db.set_status(vid, "done", file_path=file_path or f"/x/{vid}.mp3")
        if downloaded:
            db.execute("UPDATE videos SET downloaded_at = ? WHERE id = ?", (downloaded, vid))
    else:
        db.set_status(vid, status)


def test_migration_v10_adds_tables_keeps_rows_and_backs_up(tmp_path):
    path = tmp_path / "old.db"
    conn = sqlite3.connect(path, isolation_level=None)
    dbmod.migrate(conn, dbmod.MIGRATIONS[:9])
    conn.execute("INSERT INTO videos(id, title, status) VALUES ('abcdefghijk', 'Alt', 'done')")
    conn.close()
    with Database(path) as d:
        assert d.schema_version() == len(dbmod.MIGRATIONS) == 10
        assert d.get_video("abcdefghijk")["title"] == "Alt"
        cols = {r["name"] for r in d.query("PRAGMA table_info(tracks)")}
        assert {
            "video_id",
            "position",
            "start",
            "artist",
            "title",
            "version",
            "label",
            "is_id",
            "key",
            "search",
        } <= cols
        assert {r["name"] for r in d.query("PRAGMA table_info(tracklists)")} == {
            "video_id",
            "source",
            "count",
            "extracted",
        }
        assert tracklist.has_fts(d)  # this Python's SQLite has FTS5
    assert len(list((tmp_path / "backups").glob("hcloader-premigrate-v9-to-v10-*.db"))) == 1


def test_migration_without_fts5_falls_back(tmp_path, monkeypatch):
    monkeypatch.setattr(dbmod, "fts5_available", lambda conn: False)
    with Database(tmp_path / "nofts.db") as d:
        assert not tracklist.has_fts(d)
        add_set(d, "aaaaaaaaaaa", "Set A")
        tracklist.store(
            d,
            "aaaaaaaaaaa",
            "description",
            [parse_track("Angerfist - Incoming", 0.0), parse_track("Miss K8 - Lion", 60.0)],
        )
        res = tracklist.search(d, "incom")
        assert res["engine"] == "like" and [s["id"] for s in res["sets"]] == ["aaaaaaaaaaa"]
        assert tracklist.search(d, "100%_x")["sets"] == []  # LIKE wildcards are escaped


def test_store_replaces_and_fts_follows(lib):
    add_set(lib, "aaaaaaaaaaa", "Set A")
    tracklist.store(
        lib,
        "aaaaaaaaaaa",
        "chapters",
        [parse_track("Angerfist - Incoming", 0.0), parse_track("Miss K8 - Lion", 60.0)],
    )
    assert tracklist.search(lib, "incoming")["sets"]
    tracklist.store(lib, "aaaaaaaaaaa", "chapters", [parse_track("Zatox - Wrath", 0.0)])
    assert tracklist.search(lib, "incoming")["sets"] == []
    assert tracklist.search(lib, "wrath")["sets"][0]["hits"][0]["title"] == "Wrath"
    assert lib.query_one("SELECT COUNT(*) AS n FROM tracks_fts")["n"] == 1
    lib.delete_video("aaaaaaaaaaa")  # cascade + trigger
    assert lib.query_one("SELECT COUNT(*) AS n FROM tracks_fts")["n"] == 0
    assert lib.query_one("SELECT COUNT(*) AS n FROM tracklists")["n"] == 0


# =========================================================================== search / top


def _fill(lib):
    sets = {
        "set00000001": (
            "Defqon.1 2024 | Sub Zero Project",
            "2026-11-10T10:00:00+00:00",
            "00:00 Sub Zero Project - The Project\n04:00 Headhunterz - Dragonborn\n08:00 ID - ID",
        ),
        "set00000002": (
            "Qlimax 2023 | Headhunterz",
            "2026-11-12T10:00:00+00:00",
            "00:00 Headhunterz - Dragonborn (Extended Mix)\n03:00 Wildstylez - Lose My Mind\n06:00 Sub Zero Project x Devin Wild - Meltdown",
        ),
        "set00000003": (
            "Uptempo Mix",
            "2026-11-11T10:00:00+00:00",
            "1. Devin Wild & Sub Zero Project - Meltdown\n2. Headhunterz - Dragonborn [Q-dance]",
        ),
    }
    for vid, (title, dl, desc) in sets.items():
        add_set(lib, vid, title, downloaded=dl)
        res = parse_description(desc)
        tracklist.store(lib, vid, "description", res.tracks)
    add_set(lib, "notdone0004", "Queued", status="queued")
    tracklist.store(
        lib,
        "notdone0004",
        "description",
        parse_description("00:00 Headhunterz - Dragonborn\n01:00 X - Y").tracks,
    )


def test_search_groups_by_set_newest_first(lib):
    _fill(lib)
    res = tracklist.search(lib, "dragonborn")
    assert res["engine"] == "fts5" and res["hits"] == 3
    assert [s["id"] for s in res["sets"]] == [
        "set00000002",
        "set00000003",
        "set00000001",
    ]  # not the queued one
    first = res["sets"][0]
    assert first["title"] == "Qlimax 2023 | Headhunterz" and first["hits"][0]["start"] == 0.0
    assert first["hits"][0]["version"] == "Extended Mix"
    assert res["sets"][1]["hits"][0]["start"] is None  # numbered list: no timestamp
    # several words, any order, prefix, case and diacritics insensitive
    assert [s["id"] for s in tracklist.search(lib, "ZERO melt")["sets"]] == [
        "set00000002",
        "set00000003",
    ]
    assert tracklist.search(lib, "hëadhunt")["hits"] == 3
    assert tracklist.search(lib, "   ")["sets"] == []
    assert tracklist.search(lib, '"; DROP TABLE tracks; --')["sets"] == []  # FTS syntax is quoted
    # «ID - ID» never matches, the artist of «Artist - ID» does
    assert tracklist.search(lib, "id")["sets"] == []


def test_top_tracks_counts_sets_and_merges_spellings(lib):
    _fill(lib)
    top = tracklist.top_tracks(lib, 20)
    # «Extended Mix» = same track; «x» and «&» spellings in any order = same artists
    assert [(t["artist"], t["title"], t["version"], t["sets"]) for t in top] == [
        ("Headhunterz", "Dragonborn", "", 3),
        ("Devin Wild & Sub Zero Project", "Meltdown", "", 2),
    ]
    assert all(t["sets"] >= 2 for t in top) and len(top) == 2


def test_status_and_get_tracklist(lib):
    _fill(lib)
    st = tracklist.status(lib)
    assert st["total"] == 3 and st["sets"] == 3 and st["tracks"] == 8 and st["engine"] == "fts5"
    tl = tracklist.get_tracklist(lib, "set00000001")
    assert tl["source"] == "description" and [t["position"] for t in tl["tracks"]] == [1, 2, 3]
    assert tl["tracks"][2]["is_id"] is True
    assert tracklist.get_tracklist(lib, "nope0000000")["ok"] is False


# =========================================================================== extraction priority + pass


def test_extract_prefers_rich_sources(tmp_path):
    data = {
        "chapters": [{"start": 0, "title": "Track 01"}, {"start": 60, "title": "Track 02"}],
        "description": "00:00 A - One\n01:00 B - Two\n02:00 C - Three",
        "duration": 600,
    }
    source, tracks = tracklist.extract("x", data=data)
    assert source == "description" and len(tracks) == 3  # generic chapters carry nothing
    data["chapters"] = [
        {"start": 0, "title": "A - One"},
        {"start": 60, "title": "B - Two"},
        {"start": 120, "title": "C - Three"},
    ]
    assert tracklist.extract("x", data=data)[0] == "chapters"  # equal: chapters first
    assert tracklist.extract("x", data={}) == ("none", [])


def test_extract_from_id3_and_cue_without_sidecar(tmp_path):
    import shutil

    from test_tagging import make_mp3

    if shutil.which("ffmpeg") is None:
        pytest.skip("ffmpeg fehlt")
    mp3 = make_mp3(tmp_path / "a.mp3", seconds=3)
    tagging.write_tags(
        mp3,
        {"title": "Set"},
        chapters=[Chapter(0, "Angerfist - Incoming", 1), Chapter(1, "Miss K8 - Lion", 2)],
        total_duration=3,
    )
    assert tracklist.extract("x", data={}, path=mp3)[0] == "id3"
    assert tracklist.extract("x", data={}, path=mp3, files_ok=False) == ("none", [])
    plain = tmp_path / "b.opus"
    plain.write_bytes(b"")
    tagging.write_cue(
        plain, [Chapter(0, "Zatox - Wrath"), Chapter(30, "Rooler - Barbarian")], performer="DJ"
    )
    source, tracks = tracklist.extract("x", data={}, path=plain)
    assert source == "cue" and [t.artist for t in tracks] == ["Zatox", "Rooler"]


def test_index_pass_progress_cancel_and_missing_scope(lib):
    for i in range(25):
        add_set(lib, f"pass{i:07d}", f"Set {i}")
    descs = {
        f"pass{i:07d}": {"description": f"00:00 Artist {i} - Song\n01:00 Other - Track {i}"}
        for i in range(0, 25, 2)
    }
    events = []
    res = tracklist.index_pass(lib, progress=events.append, read=descs.get, files_ok=False)
    assert res["total"] == res["done"] == 25 and res["sets"] == 13 and res["tracks"] == 26
    assert [e["done"] for e in events] == [10, 20, 25] and not res["cancelled"]
    assert lib.get_state(tracklist.K_LAST_PASS)
    assert tracklist.index_pass(lib, read=descs.get, files_ok=False)["total"] == 0  # all examined
    stop = threading.Event()
    stop.set()
    res = tracklist.index_pass(lib, scope="all", cancel=stop, read=descs.get, files_ok=False)
    assert res["cancelled"] and res["done"] == 0 and res["total"] == 25


# =========================================================================== bridge API + flow


def test_api_methods_and_pass_events(env):  # noqa: F811
    api = env.make()
    db = api._db
    add_set(db, "apiset00001", "Api Set")
    sidecar.write(
        "apiset00001",
        {"id": "apiset00001", "description": "00:00 Angerfist - Incoming\n03:00 Miss K8 - Lion"},
    )
    assert api.get_tracklist_status()["scanned"] == 0
    tl = api.get_tracklist("apiset00001")  # extracted on demand
    assert tl["ok"] and [t["title"] for t in tl["tracks"]] == ["Incoming", "Lion"]
    assert api.get_tracklist("nope0000000")["ok"] is False
    assert api.search_tracks("lion")["sets"][0]["id"] == "apiset00001"
    assert api.search_tracks("")["sets"] == []
    assert api.get_top_tracks(5) == {"ok": True, "tracks": []}
    assert api.get_top_tracks("x")["ok"]

    r = api.build_tracklists({"scope": "all"})
    assert r["ok"] and r["started"] and r["scope"] == "all"
    api._worker.run("wait", lambda: None, timeout=10)  # FIFO: the pass has finished
    api._bus.flush()
    events = env.window.events_of("tracklist_index")
    assert events[0]["phase"] == "start" and events[-1]["phase"] == "done"
    assert events[-1]["sets"] == 1 and events[-1]["tracks"] == 2 and events[-1]["scope"] == "all"
    st = api.get_tracklist_status()
    assert st["running"] is False and st["last_pass"] and st["sets"] == 1
    assert api.cancel_build_tracklists()["ok"]


def test_api_pass_refused_while_other_maintenance_job(env):  # noqa: F811
    api = env.make()
    gate = threading.Event()
    api._worker.submit("backup", gate.wait, 5)
    try:
        r = api.build_tracklists()
        assert r["ok"] is False and r["error"]
    finally:
        gate.set()


def test_download_extracts_tracklist_and_search_finds_it(world, monkeypatch):  # noqa: F811
    import test_integration_queue as tiq

    w = world
    desc = "Tracklist:\n00:00 Partyraiser - Spin It\n05:00 Angerfist - Incoming (Miss K8 Remix)\n10:00 ID - ID"
    orig = tiq.FakeYDL.process_ie_result

    def with_description(self, ie_result, download=True):
        info = orig(self, ie_result, download)
        info["description"] = desc
        return info

    monkeypatch.setattr(tiq.FakeYDL, "process_ie_result", with_description)
    assert w.api.search("hardcore", {"genre": "Hardcore", "year": None})["ok"]
    assert w.api.enqueue(["hcLiveset01"])["ok"]
    w.api._queue.start()
    assert w.api._queue.wait_idle(60)
    assert w.db.get_video("hcLiveset01")["status"] == "done"
    found = w.api.search_tracks("incoming miss")
    assert [s["id"] for s in found["sets"]] == ["hcLiveset01"]
    hit = found["sets"][0]["hits"][0]
    assert (hit["artist"], hit["title"], hit["version"], hit["start"]) == (
        "Angerfist",
        "Incoming",
        "Miss K8 Remix",
        300.0,
    )
    tl = w.api.get_tracklist("hcLiveset01")
    assert tl["source"] in ("chapters", "description") and tl["tracks"][-1]["is_id"] is True
    assert w.api.get_tracklist_status()["sets"] == 1
