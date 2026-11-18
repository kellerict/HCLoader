"""v0.5.0 «Festival collector»: timetable parser (table-driven), shipped timetable files,
checklist rows, scoring, offline + searched matching (paced, resumable, backoff), playlist
import, queueing with festival values, migration and the bridge methods. Network is always
mocked; every request of a real `YtClient` is checked to pass the Throttle."""

from __future__ import annotations

import json
import sqlite3
import threading
from datetime import UTC, datetime, timedelta

import pytest

from app.core import collector, config, series
from app.core import db as dbmod
from app.core import festivals as fx
from app.core import timetable as tt
from app.core.db import Database
from app.core.throttle import K_SEARCH_TIMES, LimitReached, Throttle
from app.core.ytclient import YtClient, YtClientError

DQ_PLAYLIST = "https://www.youtube.com/playlist?list=PLdq2024"


def _catalog():
    data, _ = series.builtin_data()
    return fx.stages_from(data.get("stages")), fx.set_types_from(data.get("set_types"))


STAGES, SET_TYPES = _catalog()


def parse(text):
    return tt.parse(text, STAGES, SET_TYPES)


def rows_of(text):
    return [
        (r["artist"], r["stage"], r["day"], r["start"], r["end"], r["set_type"])
        for r in parse(text)["rows"]
    ]


# =========================================================================== parser

N = None
PARSER_CASES = [
    # 1 the classic line
    ("18:00 - 19:00 Headhunterz", [("Headhunterz", N, N, "18:00", "19:00", N)]),
    # 2 en dash, no spaces
    ("18:00–19:00 Headhunterz", [("Headhunterz", N, N, "18:00", "19:00", N)]),
    # 3 time after the name
    ("Headhunterz 18:00 - 19:00", [("Headhunterz", N, N, "18:00", "19:00", N)]),
    # 4 pipe cells with stage
    ("Headhunterz | 18:00–19:00 | RED", [("Headhunterz", "RED", N, "18:00", "19:00", N)]),
    # 5 pipe cells, other order
    ("RED | 18:00 - 19:00 | Headhunterz", [("Headhunterz", "RED", N, "18:00", "19:00", N)]),
    # 6 dots as time separator, start only
    ("18.00 Rooler", [("Rooler", N, N, "18:00", N, N)]),
    # 7 four-digit times
    ("1800-1900 Sub Zero Project", [("Sub Zero Project", N, N, "18:00", "19:00", N)]),
    # 8 am/pm
    ("6pm - 7:30pm Da Tweekaz", [("Da Tweekaz", N, N, "18:00", "19:30", N)]),
    # 9 stage in brackets
    ("21:00 - 22:00 Angerfist (BLACK)", [("Angerfist", "BLACK", N, "21:00", "22:00", N)]),
    # 10 stage after @
    (
        "21:00 - 22:00 D-Block & S-te-Fan @ UV",
        [("D-Block & S-te-Fan", "UV", N, "21:00", "22:00", N)],
    ),
    # 11 live act in brackets
    (
        "19:00 - 20:30 Sub Zero Project (Live)",
        [("Sub Zero Project", N, N, "19:00", "20:30", "live_set")],
    ),
    # 12 closing ceremony keeps its name
    (
        "23:00 - 23:30 Closing Ceremony",
        [("Closing Ceremony", N, N, "23:00", "23:30", "closing_ceremony")],
    ),
    # 13 set type keyword after the artist is cut off
    ("Headhunterz Endshow", [("Headhunterz", N, N, N, N, "endshow")]),
    # 14 day heading (English) and stage heading
    (
        "Saturday\nRED\n18:00 - 19:00 Headhunterz",
        [("Headhunterz", "RED", "Saturday", "18:00", "19:00", N)],
    ),
    # 15 German day heading with date
    ("Samstag, 28.06.\n18:00 Headhunterz", [("Headhunterz", N, "Samstag, 28.06.", "18:00", N, N)]),
    # 16 Dutch markdown day heading
    (
        "## Zaterdag\n20:00 - 21:00 Brennan Heart",
        [("Brennan Heart", N, "Zaterdag", "20:00", "21:00", N)],
    ),
    # 17 "Stage:" heading
    ("Stage: BLUE\n18:00 - 19:00 Wildstylez", [("Wildstylez", "BLUE", N, "18:00", "19:00", N)]),
    # 18 bracketed stage heading of an unknown stage
    (
        "[The Gathering]\n12:00 - 13:00 Warface",
        [("Warface", "The Gathering", N, "12:00", "13:00", N)],
    ),
    # 19 stage heading with the word "stage"
    (
        "Hardcore Stage\n14:00 - 15:00 Miss K8",
        [("Miss K8", "Hardcore Stage", N, "14:00", "15:00", N)],
    ),
    # 20 day + stage in one heading
    (
        "Sunday – BLACK\n21:00 - 22:00 Angerfist",
        [("Angerfist", "BLACK", "Sunday", "21:00", "22:00", N)],
    ),
    # 21 plain line-up list with bullets
    (
        "- Atmozfears\n* Sefa\n• Vexxed",
        [("Atmozfears", N, N, N, N, N), ("Sefa", N, N, N, N, N), ("Vexxed", N, N, N, N, N)],
    ),
    # 22 numbered list
    ("1. Headhunterz\n2. Rebelion", [("Headhunterz", N, N, N, N, N), ("Rebelion", N, N, N, N, N)]),
    # 23 CSV with header (comma)
    (
        "artist,stage,day,start,end\nHeadhunterz,RED,Saturday,18:00,19:00",
        [("Headhunterz", "RED", "Saturday", "18:00", "19:00", N)],
    ),
    # 24 CSV with German header (semicolon) and dotted times
    (
        "Künstler;Bühne;Tag;von;bis\nRooler;BLUE;Sonntag;20.00;21.00",
        [("Rooler", "BLUE", "Sonntag", "20:00", "21:00", N)],
    ),
    # 25 TSV with a time range column and a set type column
    ("DJ\tTime\tType\nSefa\t17:00-18:00\twarm_up", [("Sefa", N, N, "17:00", "18:00", "warm_up")]),
    # 26 markdown table (separator row ignored)
    (
        "| Time | Artist | Stage |\n|---|---|---|\n| 18:00-19:00 | Headhunterz | RED |",
        [("Headhunterz", "RED", N, "18:00", "19:00", N)],
    ),
    # 27 title lines are no rows/headings
    (
        "# Defqon.1 2024 Timetable\n18:00 - 19:00 Headhunterz",
        [("Headhunterz", N, N, "18:00", "19:00", N)],
    ),
    # 28 duplicates are dropped
    (
        "18:00 - 19:00 Headhunterz\n18:00 - 19:00 Headhunterz",
        [("Headhunterz", N, N, "18:00", "19:00", N)],
    ),
    # 29 b2b stays one row
    (
        "21:00 - 22:00 Angerfist b2b Miss K8 [Live Set]",
        [("Angerfist b2b Miss K8", N, N, "21:00", "22:00", "live_set")],
    ),
    # 30 lines with only a time are skipped
    ("18:00 - 19:00\n19:00 - 20:00 Rebelion", [("Rebelion", N, N, "19:00", "20:00", N)]),
    # 31 a day heading resets the stage
    (
        "Saturday\nRED\n18:00 Headhunterz\nSunday\n18:00 Wildstylez",
        [
            ("Headhunterz", "RED", "Saturday", "18:00", N, N),
            ("Wildstylez", N, "Sunday", "18:00", N, N),
        ],
    ),
    # 32 "Day 2" heading and "h" time separator
    ("Day 2\n18h00 - 19h00 Phuture Noize", [("Phuture Noize", N, "Day 2", "18:00", "19:00", N)]),
    # 33 Windows line endings and blank lines
    ("Friday\r\n\r\n20:00 - 21:00 B-Front\r\n", [("B-Front", N, "Friday", "20:00", "21:00", N)]),
    # 34 trailing stage after a dash
    ("Headhunterz - RED", [("Headhunterz", "RED", N, N, N, N)]),
    # 35 warm-up prefix
    ("Warm-up Sefa", [("Sefa", N, N, N, N, "warm_up")]),
    # 36 "Mainstage:" heading (known stage with colon)
    ("Mainstage:\n22:00 - 23:00 Coone", [("Coone", "Mainstage", N, "22:00", "23:00", N)]),
]


@pytest.mark.parametrize(("text", "expected"), PARSER_CASES)
def test_parser(text, expected):
    assert rows_of(text) == expected


def test_parser_has_enough_cases():
    assert len(PARSER_CASES) >= 25


def test_parser_reports_days_stages_skipped_and_csv():
    res = parse("Saturday\nRED\n18:00 - 19:00 Headhunterz\n18:00 - 19:00\nSunday\nBLUE\n9:00 X")
    assert res["days"] == ["Saturday", "Sunday"] and res["stages"] == ["RED", "BLUE"]
    assert res["skipped"] == ["18:00 - 19:00"] and res["csv"] is False
    assert parse("artist,stage\nX,RED")["csv"] is True


@pytest.mark.parametrize(
    ("raw", "out"),
    [
        ("18:00", "18:00"),
        ("8:05", "08:05"),
        ("18.30", "18:30"),
        ("18h30", "18:30"),
        ("6pm", "18:00"),
        ("12 am", "00:00"),
        ("6:30 PM", "18:30"),
        ("1800", "18:00"),
        ("24:00", "00:00"),
        ("25:00", None),
        ("18:61", None),
        ("abc", None),
        ("", None),
    ],
)
def test_norm_time(raw, out):
    assert tt.norm_time(raw) == out


def test_parser_never_raises_on_odd_input():
    for text in ("", "\n\n", "|||", ";;;", "????", "18:00", "x" * 5000, None):
        assert isinstance(parse(text)["rows"], list)


# QA v0.5.0 snippets: real-world pastes that came out wrong. Each is checked with the
# app's stage / set-type catalog and with a bare `tt.parse(text)` (no catalog).
QA_CASES = [
    # 3 day heading + uppercase stage headings on their own line
    (
        "Samstag\nRED\n18:00 - 19:00 Headhunterz\nBLUE\n19:00 - 20:00 Wildstylez",
        [
            ("Headhunterz", "RED", "Samstag", "18:00", "19:00", N),
            ("Wildstylez", "BLUE", "Samstag", "19:00", "20:00", N),
        ],
    ),
    # 17 dated day heading + mixed-case stage heading
    (
        "Friday 28 June\nBlack\n21:00 - 22:00 Angerfist",
        [("Angerfist", "BLACK", "Friday 28 June", "21:00", "22:00", N)],
    ),
    # «BLUE STAGE» heading
    ("BLUE STAGE\n18:00 Sefa", [("Sefa", "BLUE", N, "18:00", N, N)]),
    # unknown uppercase stage heading
    (
        "Day 1\nTHE GATHERING\n12:00 Warface",
        [("Warface", "THE GATHERING", "Day 1", "12:00", N, N)],
    ),
    # 14 pipe layout: day | stage | time | artist
    (
        "Freitag | UV | 18:00-19:00 | Max Enforcer",
        [("Max Enforcer", "UV", "Freitag", "18:00", "19:00", N)],
    ),
    # 20 tab layout with start and end in their own columns
    (
        "Mittwoch\tPURPLE\t10:00\t11:00\tLogic",
        [("Logic", "PURPLE", "Mittwoch", "10:00", "11:00", N)],
    ),
    # 22 several sets on one line: comma, pipe, slash
    (
        "18:00 Headhunterz, 19:00 Wildstylez",
        [("Headhunterz", N, N, "18:00", N, N), ("Wildstylez", N, N, "19:00", N, N)],
    ),
    (
        "18:00 A-Team | 19:00 B-Front",
        [("A-Team", N, N, "18:00", N, N), ("B-Front", N, N, "19:00", N, N)],
    ),
    (
        "18:00 - 19:00 Rooler / 19:00 - 20:00 Sefa",
        [("Rooler", N, N, "18:00", "19:00", N), ("Sefa", N, N, "19:00", "20:00", N)],
    ),
    # 21 «(Live Set)» suffix
    ("20:00 Sub Zero Project (Live Set)", [("Sub Zero Project", N, N, "20:00", N, "live_set")]),
    # a timed line after a plain list entry with a bullet stays a row
    (
        "- Atmozfears\n18:00 Sefa",
        [("Atmozfears", N, N, N, N, N), ("Sefa", N, N, "18:00", N, N)],
    ),
]


@pytest.mark.parametrize(("text", "expected"), QA_CASES)
def test_parser_qa_snippets(text, expected):
    assert rows_of(text) == expected


@pytest.mark.parametrize(("text", "expected"), QA_CASES)
def test_parser_qa_snippets_without_catalog(text, expected):
    def key(rows):
        # without the catalog a stage keeps the spelling of the paste («Black», «BLUE STAGE»)
        return [(a, fx.norm(st).removesuffix(" stage"), d, s, e, t) for a, st, d, s, e, t in rows]

    got = [
        (r["artist"], r["stage"], r["day"], r["start"], r["end"], r["set_type"])
        for r in tt.parse(text)["rows"]
    ]
    assert key(got) == key(expected)


# QA v0.5.0 re-check («Nachprüfung», snippets 7/12/17/21/22) plus variations: (text, rows,
# skipped lines). Checked with the app catalog and bare (no catalog, see `_bare_key`).
RECHECK_CASES = [
    # --- 7 CSV without header row: columns inferred from their content
    (
        "Dillytek,BLUE,Sat,16:00,17:00",
        [("Dillytek", "BLUE", "Sat", "16:00", "17:00", N)],
        [],
    ),
    (
        "Dillytek,BLUE,Sat,16:00,17:00\nSefa,RED,Sat,17:00,18:00",
        [
            ("Dillytek", "BLUE", "Sat", "16:00", "17:00", N),
            ("Sefa", "RED", "Sat", "17:00", "18:00", N),
        ],
        [],
    ),
    (
        "Sat;16:00-17:00;Dillytek;Purple\nSun;18:00-19:00;Sefa;Purple\nSun;19:00-20:00;Rooler;Red",
        [
            ("Dillytek", "PURPLE", "Sat", "16:00", "17:00", N),
            ("Sefa", "PURPLE", "Sun", "18:00", "19:00", N),
            ("Rooler", "RED", "Sun", "19:00", "20:00", N),
        ],
        [],
    ),
    (
        '"Da Tweekaz", "THE GATHERING", Friday, 6pm, 7pm',
        [("Da Tweekaz", "THE GATHERING", "Friday", "18:00", "19:00", N)],
        [],
    ),
    (
        "Dillytek,Hardcore Stage,16:00\nnote without commas\nSefa,Hardcore Stage,17:00",
        [
            ("Dillytek", "Hardcore Stage", N, "16:00", N, N),
            ("Sefa", "Hardcore Stage", N, "17:00", N, N),
        ],
        ["note without commas"],
    ),
    # --- 12 day and stage in one heading line
    (
        "Saturday – RED\n18:00 - 19:00 Headhunterz",
        [("Headhunterz", "RED", "Saturday", "18:00", "19:00", N)],
        [],
    ),
    ("SAT | RED STAGE\n18:00 Headhunterz", [("Headhunterz", "RED", "SAT", "18:00", N, N)], []),
    (
        "Saturday 28.06. – RED\n18:00 Headhunterz",
        [("Headhunterz", "RED", "Saturday 28.06.", "18:00", N, N)],
        [],
    ),
    ("Sunday, Black\n18:00 Angerfist", [("Angerfist", "BLACK", "Sunday", "18:00", N, N)], []),
    ("PURPLE – Sunday\n18:00 Sefa", [("Sefa", "PURPLE", "Sunday", "18:00", N, N)], []),
    (
        "Saturday - The Gathering\n18:00 Warface",
        [("Warface", "The Gathering", "Saturday", "18:00", N, N)],
        [],
    ),
    # --- 17 emoji and markdown decoration
    ("🔥 RED STAGE 🔥\n⏰ 18:00 🎧 Warface", [("Warface", "RED", N, "18:00", N, N)], []),
    (
        "★ BLUE ★\n► 19:00 - 20:00 Wildstylez",
        [("Wildstylez", "BLUE", N, "19:00", "20:00", N)],
        [],
    ),
    ("=== UV ===\n--- 20:00 Rebelion ---", [("Rebelion", "UV", N, "20:00", N, N)], []),
    (
        "**Saturday**\n**RED**\n18:00 **Headhunterz** 🔥🔥",
        [("Headhunterz", "RED", "Saturday", "18:00", N, N)],
        [],
    ),
    # a leading symbol only is a list bullet, no heading
    (
        "★ Atmozfears\n★ Sefa",
        [("Atmozfears", N, N, N, N, N), ("Sefa", N, N, N, N, N)],
        [],
    ),
    # separator lines are no rows and not reported
    ("🎶🎶🎶\n=====\n18:00 Sefa\n-----", [("Sefa", N, N, "18:00", N, N)], []),
    # --- 21 day prefix, dotted times, «@ stage» suffix
    (
        "Sat 18.00-19.00 Lil Texas @ PURPLE",
        [("Lil Texas", "PURPLE", "Sat", "18:00", "19:00", N)],
        [],
    ),
    (
        "Sat 18.00–19.00 Headhunterz @ PURPLE",
        [("Headhunterz", "PURPLE", "Sat", "18:00", "19:00", N)],
        [],
    ),
    (
        "Sun 20.00 - 21.00 Sefa @ The Gathering",
        [("Sefa", "The Gathering", "Sun", "20:00", "21:00", N)],
        [],
    ),
    ("Fr 18:00 Rooler", [("Rooler", N, "Fr", "18:00", N, N)], []),
    (
        "Saturday\nSun 18:00 Headhunterz @ Hardcore Stage\n19:00 Sefa",
        [
            ("Headhunterz", "Hardcore Stage", "Sun", "18:00", N, N),
            ("Sefa", N, "Saturday", "19:00", N, N),
        ],
        [],
    ),
    # --- 22 garbage lines are reported, never a stage
    (
        "RED\n18:00 Headhunterz\n????? ##\n19:00 Wildstylez",
        [("Headhunterz", "RED", N, "18:00", N, N), ("Wildstylez", "RED", N, "19:00", N, N)],
        ["????? ##"],
    ),
    ("????? ##\n18:00 Sefa", [("Sefa", N, N, "18:00", N, N)], ["????? ##"]),
    ("18:00 Sefa\n!!!\n%%%%", [("Sefa", N, N, "18:00", N, N)], ["!!!", "%%%%"]),
    ("18:00 - 19:00\n19:00 Sefa", [("Sefa", N, N, "19:00", N, N)], ["18:00 - 19:00"]),
    # a weekday word inside a name is no day
    (
        "Sunday Service\nMonday Night Fever",
        [("Sunday Service", N, N, N, N, N), ("Monday Night Fever", N, N, N, N, N)],
        [],
    ),
]


def _bare_key(rows):
    # without the catalog a stage keeps the spelling of the paste («Black», «RED STAGE»)
    return [(a, fx.norm(st).removesuffix(" stage"), d, s, e, t) for a, st, d, s, e, t in rows]


def _tuples(res):
    return [
        (r["artist"], r["stage"], r["day"], r["start"], r["end"], r["set_type"])
        for r in res["rows"]
    ]


@pytest.mark.parametrize(("text", "expected", "skipped"), RECHECK_CASES)
def test_parser_recheck_snippets(text, expected, skipped):
    res = parse(text)
    assert _tuples(res) == expected
    assert res["skipped"] == skipped


@pytest.mark.parametrize(("text", "expected", "skipped"), RECHECK_CASES)
def test_parser_recheck_snippets_without_catalog(text, expected, skipped):
    res = tt.parse(text)
    assert _bare_key(_tuples(res)) == _bare_key(expected)
    assert res["skipped"] == skipped


def test_parser_headerless_csv_is_flagged_as_csv():
    assert parse("Dillytek,BLUE,Sat,16:00,17:00")["csv"] is True
    # two sets on one line stay the free-form path
    assert parse("18:00 Headhunterz, 19:00 Wildstylez")["csv"] is False


@pytest.mark.parametrize(
    "text",
    [
        "🔥" * 300_000,
        ("Saturday – " + "RED " * 100 + "\n") * 300,
        ("a," * 250 + "18:00\n") * 300,
        "Sat " + "18.00 " * 50_000,
    ],
)
def test_parser_stays_fast_on_decorated_or_wide_input(text):
    import time

    t0 = time.perf_counter()
    res = parse(text)
    assert time.perf_counter() - t0 < 2.0
    assert isinstance(res["rows"], list)


def test_endshow_closing_ceremony_keeps_its_name():
    assert rows_of("23:00 Endshow Closing Ceremony") == [
        ("Endshow Closing Ceremony", N, N, "23:00", N, "closing_ceremony")
    ]


@pytest.mark.parametrize(
    "text",
    [
        "A" + " " * 40_000 + "B",
        "A" + " \t" * 40_000 + "B",
        "18:00" + " " * 40_000 + "x",
        "Headhunterz" + " " * 40_000 + "(",
        "x" * 600_000,
        ("A" + " " * 5_000 + "B\n") * 200,
    ],
)
def test_parser_is_linear_on_long_whitespace(text):
    import time

    t0 = time.perf_counter()
    res = parse(text)
    assert time.perf_counter() - t0 < 1.0
    assert all(len(r["artist"]) <= tt.MAX_ARTIST for r in res["rows"])


# =========================================================================== fixtures


@pytest.fixture
def settings():
    s = config.defaults()
    s.throttle.sleep_requests = 0
    s.network.po_token_mode = "off"
    return s


class Clock:
    def __init__(self):
        self.now = datetime(2026, 11, 18, 12, 0, tzinfo=UTC)
        self.slept: list[float] = []

    def __call__(self):
        return self.now

    def sleep(self, seconds):
        self.slept.append(round(seconds))
        self.now += timedelta(seconds=seconds)


@pytest.fixture
def clock():
    return Clock()


@pytest.fixture
def throttle(db, settings, clock):
    return Throttle(db, lambda: settings.throttle, clock=clock, sleep=clock.sleep)


def series_id(db, key="defqon1"):
    series.sync_builtin(db)
    return db.query_one("SELECT id FROM series WHERE key=?", (key,))["id"]


@pytest.fixture
def edition(db):
    return collector.open_edition(db, {"series_id": series_id(db), "year": 2024})


def video(vid, title, duration=3600, upload="20240701", **kw):
    return {
        "id": vid,
        "title": title,
        "duration": duration,
        "upload_date": upload,
        "channel_name": "Q-dance",
        "platform": "youtube",
        **kw,
    }


def store(db, *videos, status=None):
    for v in videos:
        db.upsert_video(dict(v))
        if status:
            db.set_status(v["id"], status, file_path=f"/m/{v['id']}.mp3")


class FakeSearch:
    """Stands in for YtClient.search: hits per artist (lower case substring of the query)."""

    def __init__(self, hits=None, *, fail=None, on_search=None):
        self.hits = hits or {}
        self.fail = list(fail or [])
        self.queries: list[str] = []
        self.on_search = on_search
        self.closed = False

    def search(self, query, n=None, *, cancel_event=None, **kw):
        self.queries.append(query)
        if self.on_search:
            self.on_search(len(self.queries))
        if self.fail:
            exc = self.fail.pop(0)
            if exc is not None:
                raise exc
        for key, entries in self.hits.items():
            if key in query.lower():
                return [dict(e) for e in entries]
        return []

    def close(self):
        self.closed = True


# =========================================================================== migration


def test_migration_v9_adds_checklist_tables_and_backs_up(tmp_path):
    path = tmp_path / "old.db"
    conn = sqlite3.connect(path, isolation_level=None)
    dbmod.migrate(conn, dbmod.MIGRATIONS[:8])
    conn.execute("INSERT INTO videos(id, title, status) VALUES ('abcdefghijk', 'Alt', 'done')")
    conn.close()
    with Database(path) as d:
        assert d.schema_version() == len(dbmod.MIGRATIONS) >= 9
        assert d.get_video("abcdefghijk")["title"] == "Alt"
        cols = {r["name"] for r in d.query("PRAGMA table_info(checklist_rows)")}
        assert {
            "edition_id", "artist", "stage", "day", "start_time", "end_time", "set_type",
            "source", "status", "video_id", "confidence", "candidates", "confirmed",
            "checked", "ignored", "edited", "searched",
        } <= cols  # fmt: skip
        cols = {r["name"] for r in d.query("PRAGMA table_info(checklists)")}
        assert {"edition_id", "playlist_url", "job_state", "job_done", "job_note"} <= cols
    assert len(list((tmp_path / "backups").glob("hcloader-premigrate-v8-to-v*.db"))) == 1


def test_schema_rejects_unknown_source_and_status(db, edition):
    with pytest.raises(sqlite3.IntegrityError):
        db.execute(
            "INSERT INTO checklist_rows(edition_id, artist, source) VALUES (?, 'x', 'web')",
            (edition,),
        )
    with pytest.raises(sqlite3.IntegrityError):
        db.execute(
            "INSERT INTO checklist_rows(edition_id, artist, source, status) "
            "VALUES (?, 'x', 'manual', 'gone')",
            (edition,),
        )


def test_deleting_a_video_or_edition_keeps_the_schema_consistent(db, edition):
    store(db, video("abcdefghij1", "Headhunterz | Defqon.1 2024"))
    rid = collector.add_row(db, edition, {"artist": "Headhunterz"})
    collector.match_offline(db, config.defaults(), edition)
    assert collector.row_by_id(db, rid)["video_id"] == "abcdefghij1"
    db.delete_video("abcdefghij1")
    assert collector.row_by_id(db, rid)["video_id"] is None
    collector.sync(db, edition)
    assert collector.row_by_id(db, rid)["status"] == "missing"
    db.execute("DELETE FROM editions WHERE id=?", (edition,))
    assert db.query("SELECT * FROM checklist_rows") == []
    assert db.query("SELECT * FROM checklists") == []


# =========================================================================== editions / rows


def test_open_edition_validates_and_lists(db):
    sid = series_id(db)
    with pytest.raises(collector.CollectorError) as e:
        collector.open_edition(db, {"series_id": sid, "year": 0})
    assert "year" in e.value.errors
    with pytest.raises(collector.CollectorError) as e:
        collector.open_edition(db, {"series_id": 99999, "year": 2024})
    assert "series_id" in e.value.errors
    eid = collector.open_edition(db, {"series_id": sid, "year": 2024, "variant": "Australia"})
    assert collector.open_edition(db, {"edition_id": eid}) == eid
    items = collector.list_editions(db)
    assert [i["edition"] for i in items] == ["Defqon.1 Australia 2024"]
    assert items[0]["stats"]["total"] == 0 and items[0]["job"] is None


def test_rows_add_update_delete_flags(db, settings, edition):
    rid = collector.add_row(
        db, edition, {"artist": " Headhunterz ", "start": "6pm", "stage": "RED"}
    )
    row = collector.row_by_id(db, rid)
    assert row["artist"] == "Headhunterz" and row["start_time"] == "18:00"
    assert row["source"] == "manual" and row["edited"] == 1 and row["checked"] == 1
    with pytest.raises(collector.CollectorError) as e:
        collector.add_row(db, edition, {"artist": "", "start": "99:99", "set_type": "x"})
    assert set(e.value.errors) == {"artist", "start", "set_type"}
    row = collector.update_row(db, rid, {"stage": "BLUE", "set_type": "endshow"})
    assert row["stage"] == "BLUE" and row["set_type"] == "endshow"
    collector.set_flag(db, [rid], "checked", False)
    assert collector.row_by_id(db, rid)["checked"] == 0
    collector.set_flag(db, [rid], "ignored", True)
    assert collector.row_by_id(db, rid)["status"] == "ignored"
    collector.set_flag(db, [rid], "ignored", False)
    assert collector.row_by_id(db, rid)["status"] == "missing"
    assert collector.delete_rows(db, [rid, 424242]) == {edition: [rid]}
    with pytest.raises(collector.CollectorError):
        collector.row_by_id(db, rid)


def test_timetable_import_merges_into_playlist_rows_and_dedupes(db, settings, edition):
    store(db, video("abcdefghij1", "Headhunterz | Defqon.1 Weekend Festival 2024 | RED"))
    collector._playlist_rows(
        db,
        settings,
        collector.target_for(db, settings, edition),
        [video("abcdefghij1", "Headhunterz | Defqon.1 Weekend Festival 2024 | RED")],
        collector.ImportResult(edition),
    )
    text = (
        "Saturday\nRED\n18:00 - 19:00 Headhunterz\n19:00 - 20:00 Rebelion\n19:00 - 20:00 Rebelion"
    )
    res = collector.import_timetable(db, settings, edition, text)
    assert res["added"] == 1 and res["merged"] == 1
    rows = collector.get_checklist(db, edition)["rows"]
    hh = next(r for r in rows if r["artist"] == "Headhunterz")
    assert hh["day"] == "Saturday" and hh["start"] == "18:00" and hh["source"] == "playlist"
    assert hh["video_id"] == "abcdefghij1" and hh["confirmed"] and hh["status"] == "found"
    again = collector.import_timetable(db, settings, edition, text)
    assert again["added"] == 0 and again["merged"] == 2  # never twice


def test_edited_row_is_not_overwritten_by_an_import(db, settings, edition):
    rid = collector.add_row(db, edition, {"artist": "Rebelion", "stage": "RED"})
    collector.import_timetable(db, settings, edition, "RED\n19:00 - 20:00 Rebelion")
    assert collector.row_by_id(db, rid)["start_time"] is None  # manual = authoritative


# =========================================================================== scoring


@pytest.fixture
def target(db, settings, edition):
    return collector.target_for(db, settings, edition)


@pytest.mark.parametrize(
    ("title", "row", "kw", "lo", "hi", "reason"),
    [
        (
            "Headhunterz | Defqon.1 Weekend Festival 2024 | RED",
            {"stage": "RED"},
            {},
            0.95,
            1.0,
            "stage",
        ),
        ("Headhunterz @ Defqon.1 2024", {}, {}, 0.9, 0.9, "year"),
        ("Headhunterz @ Defqon.1", {}, {}, 0.8, 0.8, "year:upload"),
        ("Headhunterz @ Defqon.1", {}, {"upload": "20220101"}, 0.7, 0.7, "series"),
        ("Headhunterz @ Defqon.1 2019", {}, {}, 0.4, 0.4, "year:other"),
        ("Headhunterz @ Defqon.1 Australia 2024", {}, {}, 0.6, 0.6, "variant:other"),
        ("Headhunterz live 2024", {}, {}, 0.65, 0.65, "artist"),
        ("Defqon.1 2024 Aftermovie ft. Headhunterz", {}, {}, 0.5, 0.5, "negative"),
        (
            "Angerfist @ Defqon.1 2024",
            {"artist": "Angerfist b2b Miss K8"},
            {},
            0.75,
            0.75,
            "artist:partial",
        ),
        (
            "Miss K8 & Angerfist | Defqon.1 2024",
            {"artist": "Angerfist b2b Miss K8"},
            {},
            0.9,
            0.9,
            "artist",
        ),
        ("Headhunterz @ Defqon.1 2024", {}, {"duration": None}, 0.85, 0.85, "duration:unknown"),
    ],
)
def test_score(target, title, row, kw, lo, hi, reason):
    v = video("abcdefghij1", title, **{k: v for k, v in kw.items() if k != "upload"})
    if "upload" in kw:
        v["upload_date"] = kw["upload"]
    conf, reasons = collector.score({"artist": "Headhunterz", **row}, v, target)
    assert lo <= conf <= hi, (conf, reasons)
    assert reason in reasons


@pytest.mark.parametrize(
    ("v", "why"),
    [
        (video("abcdefghij1", "Wildstylez @ Defqon.1 2024"), "no_artist"),
        (video("abcdefghij1", "Headhunterz @ Defqon.1 2024", duration=200), "too_short"),
        (video("abcdefghij1", "Headhunterz @ Defqon.1 2024", live_status="is_live"), "live"),
        (video("abcdefghij1", "Headhunterz @ Defqon.1 2024", preview=True), "unavailable"),
    ],
)
def test_score_rejects(target, v, why):
    assert collector.score({"artist": "Headhunterz"}, v, target) == (0.0, [why])


def test_certain_needs_artist_series_year(target):
    for title, expected in (
        ("Headhunterz @ Defqon.1 2024", True),
        ("Headhunterz @ Defqon.1", False),  # upload year only
        ("Headhunterz live 2024", False),  # no series
    ):
        c, r = collector.score({"artist": "Headhunterz"}, video("abcdefghij1", title), target)
        assert collector.certain(c, r, target) is expected, title


# Review v0.5.0 M1: auto-confirm is conservative. Every case here scores like a good hit
# (artist + series + year) but must stay «uncertain» for the user to confirm.
UNCERTAIN_CASES = [
    # solo row vs b2b / & / vs / x / feat. / with titles
    ({"artist": "Angerfist"}, "Angerfist b2b Miss K8 @ Defqon.1 2024 | RED", "artist:more"),
    ({"artist": "Angerfist"}, "Angerfist & Radical Redemption - Defqon.1 2024", "artist:more"),
    ({"artist": "Angerfist"}, "Angerfist vs Miss K8 | Defqon.1 2024", "artist:more"),
    ({"artist": "Angerfist"}, "Angerfist x Mad Dog @ Defqon.1 2024", "artist:more"),
    ({"artist": "Angerfist"}, "Angerfist feat. MC Tha Watcher @ Defqon.1 2024", "artist:more"),
    ({"artist": "Angerfist"}, "Angerfist (ft. MC Tha Watcher) @ Defqon.1 2024", "artist:more"),
    ({"artist": "Angerfist"}, "Angerfist with Miss K8 | Defqon.1 2024", "artist:more"),
    ({"artist": "Angerfist"}, "Miss K8 b2b Angerfist | Defqon.1 2024", "artist:more"),
    # wrong stage
    (
        {"artist": "Headhunterz", "stage": "RED"},
        "Headhunterz | Defqon.1 2024 | BLUE",
        "stage:other",
    ),
    (
        {"artist": "Headhunterz", "stage": "RED"},
        "Headhunterz @ BLUE stage Defqon.1 2024",
        "stage:other",
    ),
    # closing ceremony vs live set (and the other way round)
    (
        {"artist": "Headhunterz", "set_type": "live_set"},
        "Headhunterz | Defqon.1 2024 Closing Ceremony",
        "set_type:other",
    ),
    (
        {"artist": "Headhunterz", "set_type": "closing_ceremony"},
        "Headhunterz Live Set @ Defqon.1 2024",
        "set_type:other",
    ),
    # different / additional year
    ({"artist": "Headhunterz"}, "Headhunterz @ Defqon.1 2023", "year:other"),
    ({"artist": "Headhunterz"}, "Headhunterz @ Defqon.1 2023 & 2024 recap", "year:more"),
    # another series or variant in the title
    ({"artist": "Headhunterz"}, "Headhunterz @ Defqon.1 Australia 2024", "variant:other"),
    ({"artist": "Headhunterz"}, "Headhunterz @ Qlimax x Defqon.1 2024", "series:other"),
]


@pytest.mark.parametrize(("row", "title", "reason"), UNCERTAIN_CASES)
def test_conflicting_titles_are_never_certain(target, row, title, reason):
    c, r = collector.score(row, video("abcdefghij1", title), target)
    assert reason in r, (c, r)
    assert not collector.certain(c, r, target), (c, r)
    assert not collector.certain(1.0, r, target)  # whatever the score


@pytest.mark.parametrize(
    ("row", "title"),
    [
        ({"artist": "Angerfist"}, "Angerfist @ Defqon.1 2024 | RED"),
        ({"artist": "Angerfist b2b Miss K8"}, "Miss K8 & Angerfist | Defqon.1 2024"),
        ({"artist": "D-Block & S-te-Fan"}, "D-Block & S-te-Fan @ Defqon.1 2024"),
        ({"artist": "Headhunterz", "stage": "RED"}, "Headhunterz | Defqon.1 2024 | RED"),
        (
            {"artist": "Headhunterz", "set_type": "closing_ceremony"},
            "Headhunterz | Defqon.1 2024 Closing Ceremony",
        ),
        ({"artist": "Headhunterz"}, "Headhunterz | Defqon.1 Weekend Festival 2024 [Full Set]"),
    ],
)
def test_exact_titles_stay_certain(target, row, title):
    c, r = collector.score(row, video("abcdefghij1", title), target)
    assert collector.certain(c, r, target), (c, r)


@pytest.mark.parametrize(
    ("title", "certain", "reason"),
    [
        ("Headhunterz - Supremacy warm up mix 2024", False, "series:weak"),  # weak alone
        ("Headhunterz @ Supremacy 2024", True, "series"),  # weak alias + year right after
        ("Headhunterz @ Supremacy Festival 2024", True, "series"),  # strong alias
    ],
)
def test_weak_series_alias_needs_the_year(db, settings, title, certain, reason):
    eid = collector.open_edition(db, {"series_id": series_id(db, "supremacy"), "year": 2024})
    t = collector.target_for(db, settings, eid)
    c, r = collector.score({"artist": "Headhunterz"}, video("abcdefghij1", title), t)
    assert reason in r, (c, r)
    assert collector.certain(c, r, t) is certain, (c, r)


def test_solo_row_does_not_take_the_b2b_set_as_confirmed(db, settings, edition):
    solo = collector.add_row(db, edition, {"artist": "Angerfist"})
    store(db, video("b2bvideo001", "Angerfist b2b Miss K8 @ Defqon.1 2024 | RED"))
    collector.match_offline(db, settings, edition)
    row = collector.row_by_id(db, solo)
    assert row["video_id"] == "b2bvideo001" and not row["confirmed"]
    q = collector.queue_rows(db, edition)
    assert q["video_ids"] == [] and q["skipped"]["unconfirmed"] == 1


def test_confirm_refuses_a_video_another_row_holds(db, settings, edition):
    a = collector.add_row(db, edition, {"artist": "Angerfist"})
    b = collector.add_row(db, edition, {"artist": "Angerfist b2b Miss K8"})
    store(db, video("b2bvideo001", "Angerfist b2b Miss K8 @ Defqon.1 2024"))
    db.execute("UPDATE checklist_rows SET video_id='b2bvideo001', confidence=0.9 WHERE id=?", (a,))
    db.execute(
        "UPDATE checklist_rows SET candidates=? WHERE id=?",
        (json.dumps([{"id": "b2bvideo001", "confidence": 0.9}]), b),
    )
    with pytest.raises(collector.CollectorError) as err:
        collector.confirm_match(db, b, "b2bvideo001")
    assert "Angerfist" in str(err.value)
    collector.confirm_match(db, a, None, reject=True)  # the solo row lets go
    assert collector.confirm_match(db, b, "b2bvideo001")["confirmed"]


def test_variant_edition_wants_the_variant(db, settings):
    eid = collector.open_edition(
        db, {"series_id": series_id(db), "year": 2024, "variant": "Australia"}
    )
    t = collector.target_for(db, settings, eid)
    c1, _ = collector.score({"artist": "X"}, video("abcdefghij1", "X @ Defqon.1 Australia 2024"), t)
    c2, r2 = collector.score({"artist": "X"}, video("abcdefghij1", "X @ Defqon.1 2024"), t)
    assert c1 > c2 and "variant:missing" in r2
    assert t.query_name == "Defqon.1 Australia"


def test_artist_from_title(target):
    for title, artist in (
        ("Headhunterz | Defqon.1 Weekend Festival 2024 | RED", "Headhunterz"),
        ("Defqon.1 2024 | RED | Sub Zero Project", "Sub Zero Project"),
        ("Rebelion @ Defqon.1 2024", "Rebelion"),
        ("Defqon.1 2024 | BLUE | Wildstylez - Full Set", "Wildstylez"),
        ("Defqon.1 2024 | Closing Ceremony", "Closing Ceremony"),
    ):
        assert collector.artist_from_title(title, target) == artist, title


# =========================================================================== offline match


def test_offline_match_prefers_library_and_marks_status(db, settings, edition):
    store(db, video("abcdefghij1", "Headhunterz @ Defqon.1 2024"), status="done")
    store(db, video("abcdefghij2", "Headhunterz @ Defqon.1 2024 (reupload)"))
    store(db, video("abcdefghij3", "Rebelion @ Defqon.1"))  # uploaded 2024: unsure
    store(db, video("abcdefghij4", "Warface @ Defqon.1 2024"))
    db.set_status("abcdefghij4", "ignored")
    res = collector.import_timetable(db, settings, edition, "Headhunterz\nRebelion\nWarface")
    assert res["matched"] == 2
    rows = {r["artist"]: r for r in collector.get_checklist(db, edition)["rows"]}
    assert rows["Headhunterz"]["video_id"] == "abcdefghij1"
    assert rows["Headhunterz"]["status"] == "downloaded" and rows["Headhunterz"]["confirmed"]
    assert [c["video"]["id"] for c in rows["Headhunterz"]["candidates"]] == ["abcdefghij2"]
    assert rows["Rebelion"]["status"] == "found" and rows["Rebelion"]["needs_confirmation"]
    assert rows["Warface"]["status"] == "missing"  # ignored videos never match
    st = collector.stats(db, edition)
    assert st["downloaded"] == 1 and st["found"] == 1 and st["missing"] == 1
    assert st["to_confirm"] == 1 and st["to_search"] == 1


def test_confirm_reject_and_pick_candidate(db, settings, edition):
    store(
        db,
        video("abcdefghij1", "Rebelion @ Defqon.1"),
        video("abcdefghij2", "Rebelion - Defqon.1 set"),
    )
    rid = collector.add_row(db, edition, {"artist": "Rebelion"})
    collector.match_offline(db, settings, edition)
    row = collector.row_by_id(db, rid)
    first = row["video_id"]
    other = json.loads(row["candidates"])[0]["id"]
    row = collector.confirm_match(db, rid, other)
    assert row["video_id"] == other and row["confirmed"] == 1
    assert json.loads(row["candidates"])[0]["id"] == first
    with pytest.raises(collector.CollectorError):
        collector.confirm_match(db, rid, "zzzzzzzzzzz")
    row = collector.confirm_match(db, rid, None, reject=True)
    assert row["video_id"] is None and other in json.loads(row["rejected"])
    collector.match_offline(db, settings, edition)
    assert collector.row_by_id(db, rid)["video_id"] == first  # the rejected one never again


# =========================================================================== matching job


HH = video("abcdefghij1", "Headhunterz @ Defqon.1 2024 | RED")
RB = video("abcdefghij2", "Rebelion | Defqon.1 2024")
WF = video("abcdefghij3", "Warface live")  # no series/year: candidate, needs confirmation


def run(db, settings, throttle, clock, edition, client, cancel=None, rows=None):
    return collector.run_job(
        edition,
        client=client,
        db=db,
        settings=settings,
        throttle=throttle,
        cancel=cancel,
        on_rows=(lambda e, ids: rows.extend(ids)) if rows is not None else None,
        sleep=clock.sleep,
        clock=clock,
    )


def test_job_searches_row_by_row_paced_and_scores(db, settings, throttle, clock, edition):
    collector.import_timetable(
        db, settings, edition, "Headhunterz\nRebelion\nWarface\nNobody\nUnticked"
    )
    unticked = next(r["id"] for r in collector._rows(db, edition) if r["artist"] == "Unticked")
    collector.set_flag(db, [unticked], "checked", False)
    est = collector.estimate(db, settings, throttle, edition)
    assert est["requests"] == 4 and est["per_hour"] == 10 and est["seconds"] == 3 * 360
    collector.request_job(db, edition)
    client = FakeSearch({"headhunterz": [HH], "rebelion": [RB, HH], "warface": [WF]})
    changed: list[int] = []
    res = run(db, settings, throttle, clock, edition, client, rows=changed)
    assert res.state == "done" and res.searches == 4 and res.hits == 3
    assert client.queries == [
        "Headhunterz Defqon.1 2024",
        "Rebelion Defqon.1 2024",
        "Warface Defqon.1 2024",
        "Nobody Defqon.1 2024",
    ]
    assert clock.slept == [360, 360, 360]  # 10 searches per hour, evenly spread
    rows = {r["artist"]: r for r in collector.get_checklist(db, edition)["rows"]}
    assert rows["Headhunterz"]["video_id"] == HH["id"] and rows["Headhunterz"]["confirmed"]
    assert rows["Rebelion"]["video_id"] == RB["id"]  # HH is taken by another row
    assert rows["Warface"]["video_id"] == WF["id"] and rows["Warface"]["needs_confirmation"]
    assert rows["Nobody"]["status"] == "missing" and rows["Nobody"]["searched"]
    assert rows["Unticked"]["searched"] is None  # unticked rows cost no request
    assert db.get_video(HH["id"])["status"] == "new"  # stored like a search hit
    job = collector.get_job(db, edition)
    assert job["state"] == "done" and job["done"] == 4 and job["searches"] == 4
    assert set(changed) == {r["id"] for r in rows.values() if r["artist"] != "Unticked"}


def test_job_respects_global_search_limit(db, settings, throttle, clock, edition):
    settings.throttle.max_searches_per_hour = 4
    collector.import_timetable(db, settings, edition, "A1\nB2")
    assert collector.per_hour(settings) == 4  # never above the global limit
    collector.request_job(db, edition)
    run(db, settings, throttle, clock, edition, FakeSearch())
    assert clock.slept == [900]


def test_job_waits_when_the_hourly_limit_is_used_up(db, settings, throttle, clock, edition):
    settings.throttle.max_searches_per_hour = 2
    now = clock().timestamp()
    db.set_state(K_SEARCH_TIMES, json.dumps([now - 600, now - 300]))  # other searches
    collector.import_timetable(db, settings, edition, "A1")
    collector.request_job(db, edition)
    client = FakeSearch(fail=[LimitReached("searches_per_hour", 2)])
    res = run(db, settings, throttle, clock, edition, client)
    assert res.state == "done" and len(client.queries) == 2
    assert clock.slept[0] == 3000  # until the oldest search drops out of the hour


def test_job_is_resumable_after_cancel_and_app_exit(db, settings, throttle, clock, edition):
    collector.import_timetable(db, settings, edition, "A1\nB2\nC3\nD4")
    collector.request_job(db, edition)
    cancel = threading.Event()
    client = FakeSearch(on_search=lambda n: cancel.set() if n == 2 else None)
    res = run(db, settings, throttle, clock, edition, client, cancel=cancel)
    assert res.cancelled and res.state == "pending"  # app exit: continues automatically
    # the 2nd search reached YouTube: its result is kept, never searched twice (review m4)
    assert collector.get_job(db, edition)["done"] == 2
    assert collector.open_jobs(db) == [edition]
    client2 = FakeSearch()
    res = run(db, settings, throttle, clock, edition, client2)
    assert res.state == "done"
    assert client2.queries == [f"{a} Defqon.1 2024" for a in ("C3", "D4")]
    assert collector.get_job(db, edition)["done"] == 4
    # done -> a new start searches every missing row again; a user cancel keeps the cursor
    collector.import_timetable(db, settings, edition, "E5")
    job = collector.request_job(db, edition)
    assert job["total"] == 5 and job["done"] == 0
    client3 = FakeSearch(on_search=lambda n: collector.cancel_job(db, edition) if n == 2 else None)
    res = run(db, settings, throttle, clock, edition, client3)
    assert res.state == "cancelled" and collector.get_job(db, edition)["done"] == 2
    assert run(db, settings, throttle, clock, edition, FakeSearch()).skipped
    job = collector.request_job(db, edition)
    assert job["state"] == "pending" and job["total"] == 5 and job["done"] == 2
    client4 = FakeSearch()
    assert run(db, settings, throttle, clock, edition, client4).state == "done"
    assert client4.queries == [f"{a} Defqon.1 2024" for a in ("C3", "D4", "E5")]


def test_user_cancel_during_run_wins(db, settings, throttle, clock, edition):
    collector.import_timetable(db, settings, edition, "A1\nB2\nC3")
    collector.request_job(db, edition)
    client = FakeSearch(on_search=lambda n: collector.cancel_job(db, edition) if n == 1 else None)
    res = run(db, settings, throttle, clock, edition, client)
    assert res.state == "cancelled" and len(client.queries) == 1


def test_job_backoff_stops_without_further_requests(db, settings, throttle, clock, edition):
    collector.import_timetable(db, settings, edition, "A1\nB2")
    collector.request_job(db, edition)
    client = FakeSearch(fail=[YtClientError("HTTP Error 429", rate_limited=True)])
    res = run(db, settings, throttle, clock, edition, client)
    assert res.backoff and res.state == "pending" and len(client.queries) == 1
    assert collector.get_job(db, edition)["note"]
    throttle.trigger_backoff("429")
    res = run(db, settings, throttle, clock, edition, client)
    assert res.backoff and len(client.queries) == 1  # active backoff: no request at all


def test_job_pauses_after_three_errors(db, settings, throttle, clock, edition):
    collector.import_timetable(db, settings, edition, "A1\nB2\nC3\nD4")
    collector.request_job(db, edition)
    client = FakeSearch(fail=[YtClientError("boom")] * 3)
    res = run(db, settings, throttle, clock, edition, client)
    assert res.state == "paused" and len(client.queries) == 3
    assert "boom" in collector.get_job(db, edition)["note"]


def test_offline_hit_costs_no_search(db, settings, throttle, clock, edition):
    collector.import_timetable(db, settings, edition, "Headhunterz")
    collector.request_job(db, edition)
    store(db, HH)  # arrives after the import (e.g. a watchlist check)
    client = FakeSearch()
    res = run(db, settings, throttle, clock, edition, client)
    assert res.state == "done" and client.queries == [] and res.hits == 1


# =========================================================================== real YtClient


class SearchYDL:
    """yt-dlp stand-in for flat searches and paged playlist listings."""

    entries: list[dict] = []
    pages: list[list[dict]] = []

    def __init__(self, opts):
        self.opts = opts
        self.params = dict(opts)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def sanitize_info(self, info):
        return info

    def urlopen(self, req):
        return "ok"

    def extract_info(self, url, download=True, process=True):
        if url.startswith("ytsearch"):
            return {"_type": "playlist", "entries": [dict(e) for e in SearchYDL.entries]}
        self.urlopen("https://www.youtube.com/playlist?page=0")

        def gen():
            for i, page in enumerate(SearchYDL.pages):
                if i:
                    self.urlopen(f"https://www.youtube.com/browse?page={i}")
                yield from page

        return {"_type": "playlist", "title": "Defqon.1 2024", "entries": gen()}


@pytest.fixture
def spy_throttle(db, settings, clock, monkeypatch):
    from app.core import ytclient

    monkeypatch.setattr(ytclient.yt_dlp, "YoutubeDL", SearchYDL)
    th = Throttle(db, lambda: settings.throttle, clock=clock, sleep=clock.sleep)
    calls: list[str] = []
    real_before, real_bf = th.before_request, th.backfill_request

    def before(kind="request", **kw):
        calls.append(kind)
        return real_before(kind, **kw)

    def bf(cancel_event=None):
        calls.append("page")
        return real_bf(cancel_event)

    monkeypatch.setattr(th, "before_request", before)
    monkeypatch.setattr(th, "backfill_request", bf)
    th.calls = calls
    return th


def test_every_search_of_the_job_passes_the_throttle(db, settings, clock, edition, spy_throttle):
    SearchYDL.entries = [{"id": "abcdefghij1", "title": "A1 @ Defqon.1 2024", "duration": 3600}]
    collector.import_timetable(db, settings, edition, "A1\nB2\nC3")
    collector.request_job(db, edition)
    client = YtClient(lambda: settings, db, spy_throttle)
    res = run(db, settings, spy_throttle, clock, edition, client)
    assert res.state == "done" and res.searches == 3
    assert spy_throttle.calls == ["search"] * 3
    assert spy_throttle.searches_last_hour() == 3  # counted against max_searches_per_hour


def test_playlist_import_pages_through_the_throttle(db, settings, clock, edition, spy_throttle):
    SearchYDL.pages = [
        [
            {"id": "abcdefghij1", "title": "Headhunterz | Defqon.1 2024 | RED", "duration": 3600},
            {"id": "abcdefghij2", "title": "Defqon.1 2024 | Official Aftermovie", "duration": 900},
        ],
        [
            {"id": "abcdefghij3", "title": "Defqon.1 2024 | BLUE | Wildstylez", "duration": 3500},
            {"id": "abcdefghij4", "title": "Defqon.1 2024 | Trailer", "duration": 60},
        ],
    ]
    collector.import_timetable(db, settings, edition, "BLUE\n20:00 - 21:00 Wildstylez")
    events: list[dict] = []
    client = YtClient(lambda: settings, db, spy_throttle)
    res = collector.import_playlist(
        edition, DQ_PLAYLIST, client=client, db=db, settings=settings, on_progress=events.append
    )
    assert res.error is None and res.entries == 4 and res.requests == 2
    assert spy_throttle.calls == ["page", "page"]  # every page request through the throttle
    assert res.added == 3 and res.merged == 1 and res.unchecked == 2
    rows = {r["artist"]: r for r in collector.get_checklist(db, edition)["rows"]}
    assert rows["Headhunterz"]["stage"] == "RED" and rows["Headhunterz"]["confirmed"]
    assert (
        rows["Wildstylez"]["source"] == "timetable"
        and rows["Wildstylez"]["video_id"] == "abcdefghij3"
    )
    assert rows["Wildstylez"]["start"] == "20:00"
    assert not next(r for r in rows.values() if r["video_id"] == "abcdefghij4")["checked"]
    assert [e["phase"] for e in events][0] == "start" and events[-1]["phase"] == "done"
    assert collector.summary(db, edition)["playlist_url"] == DQ_PLAYLIST
    again = collector.import_playlist(edition, DQ_PLAYLIST, client=client, db=db, settings=settings)
    assert again.added == 0 and again.merged == 4  # never twice


def test_playlist_url_validation(settings):
    for bad in ("https://www.youtube.com/@qdance", "nonsense", "https://example.com/list=PL1"):
        with pytest.raises(collector.CollectorError):
            collector.check_playlist_url(bad, settings)
    assert (
        collector.check_playlist_url(
            "https://www.youtube.com/watch?v=abcdefghijk&list=PL1", settings
        )
        == "https://www.youtube.com/playlist?list=PL1"
    )
    settings.soundcloud.enabled = False
    with pytest.raises(collector.CollectorError):
        collector.check_playlist_url("https://soundcloud.com/qdance/sets/dq-2024", settings)


# =========================================================================== queue


def test_queue_rows_applies_festival_values(db, settings, edition):
    store(db, HH, RB, WF)
    store(db, video("abcdefghij5", "Sefa @ Defqon.1 2024"), status="done")
    collector.import_timetable(
        db, settings, edition, "RED\nHeadhunterz\nRebelion\nWarface\nSefa\nNobody"
    )
    rows = {r["artist"]: r["id"] for r in collector.get_checklist(db, edition)["rows"]}
    collector.update_row(db, rows["Rebelion"], {"set_type": "endshow", "stage": ""})
    collector.set_flag(db, [rows["Rebelion"]], "checked", False)
    res = collector.queue_rows(db, edition)
    assert res["video_ids"] == [HH["id"]]
    assert res["skipped"] == {"unchecked": 1, "unconfirmed": 1, "missing": 1, "other": 0}
    assert res["retag"] == ["abcdefghij5"]  # already downloaded: values + retag
    v = db.get_video(HH["id"])
    assert v["edition_id"] == edition and v["stage"] == "RED" and v["festival_manual"] == 1
    assert series.tag_fields(db, HH["id"])["edition"] == "Defqon.1 2024"
    # an edited row is authoritative (empty stage stays empty)
    collector.set_flag(db, [rows["Rebelion"]], "checked", True)
    res = collector.queue_rows(db, edition, [rows["Rebelion"]])
    v = db.get_video(RB["id"])
    assert res["video_ids"] == [RB["id"]] and v["set_type"] == "endshow" and v["stage"] is None
    # after enqueueing, the row follows the video status
    db.enqueue([HH["id"]])
    assert collector.rows_for_videos(db, [HH["id"]]) == {edition: [rows["Headhunterz"]]}
    assert collector.row_by_id(db, rows["Headhunterz"])["status"] == "queued"
    db.set_status(HH["id"], "done", file_path="/m/x.mp3")
    collector.sync(db, edition)
    assert collector.row_by_id(db, rows["Headhunterz"])["status"] == "downloaded"
    assert collector.queue_rows(db, edition, [rows["Headhunterz"]])["video_ids"] == []


# =========================================================================== shipped files


def write_tt(root, key, name, data):
    folder = root / key
    folder.mkdir(parents=True, exist_ok=True)
    (folder / name).write_text(json.dumps(data), encoding="utf-8")


def test_timetable_files_list_and_import(db, settings, tmp_path):
    series_id(db)
    root = tmp_path / "timetables"
    good = {
        "format": 1,
        "series": "defqon1",
        "year": 2024,
        "source": "https://example.invalid/timetable",
        "sets": [
            {
                "artist": "Headhunterz",
                "stage": "RED",
                "day": "Saturday",
                "start": "18:00",
                "end": "19:00",
            },
            {
                "artist": "Closing Ceremony",
                "stage": "RED",
                "day": "Sunday",
                "set_type": "closing_ceremony",
            },
        ],
    }
    write_tt(root, "defqon1", "2024.json", good)
    write_tt(root, "defqon1", "2023.json", {**good, "year": 2023, "sets": [{"artist": ""}]})
    write_tt(root, "nope", "2024.json", {**good, "series": "nope"})
    files = {f["file"]: f for f in collector.list_files(db, root)}
    assert files["defqon1/2024.json"]["sets"] == 2
    assert files["defqon1/2024.json"]["edition"] == "Defqon.1 2024"
    assert "artist" in files["defqon1/2023.json"]["error"]
    assert files["nope/2024.json"]["series"] is None
    res = collector.import_file(db, settings, "defqon1/2024.json", root)
    assert res["added"] == 2
    rows = collector.get_checklist(db, res["edition_id"])["rows"]
    assert {r["source"] for r in rows} == {"file"}
    assert rows[1]["set_type"] == "closing_ceremony"
    with pytest.raises(collector.CollectorError):
        collector.import_file(db, settings, "nope/2024.json", root)
    for bad in ("../x.json", "defqon1/../../etc.json", "/etc/passwd", "defqon1/missing.json"):
        assert tt.resolve_file(bad, root) is None


def test_timetable_file_with_bom(db, tmp_path):
    folder = tmp_path / "defqon1"
    folder.mkdir()
    data = {"format": 1, "series": "defqon1", "year": 2024, "sets": [{"artist": "Sefa"}]}
    (folder / "2024.json").write_text(json.dumps(data), encoding="utf-8-sig")
    assert tt.load_file(folder / "2024.json", tmp_path)["rows"][0]["artist"] == "Sefa"


def test_shipped_timetable_files_are_valid():
    """Only real, verified data may be shipped; whatever is there must load."""
    for f in tt.list_files():
        assert "error" not in f, f


# =========================================================================== bridge


@pytest.fixture
def api_env(tmp_path, monkeypatch):
    from app.api import Api
    from app.worker import EventBus
    from tests.test_api import FakeLock, FakeWatchdog

    monkeypatch.setenv("APPDATA", str(tmp_path / "appdata"))
    monkeypatch.setattr(collector, "interval", lambda settings: 0.0)  # pacing: tested above
    made = []
    holder = {"client": FakeSearch({"headhunterz": [HH]})}

    def make():
        bus = EventBus()
        events: list[tuple[str, dict]] = []
        bus.subscribe(lambda t, d: events.append((t, d)))
        a = Api(
            config_file=tmp_path / "config.yaml",
            db=Database(tmp_path / "hc.db"),
            bus=bus,
            watchdog=FakeWatchdog(),
            run_lock=lambda: FakeLock(),
            client_factory=lambda: holder["client"],
            configure_logging=False,
        )
        a._settings.throttle.sleep_requests = 0
        a._settings.festivals.collector_searches_per_hour = 200
        a._settings.throttle.max_searches_per_hour = 200
        a.events = events
        made.append(a)
        return a

    holder["make"] = make
    yield holder
    for a in made:
        a.shutdown(1)


def wait_for(pred, timeout=10.0):
    end = datetime.now() + timedelta(seconds=timeout)
    while datetime.now() < end:
        if pred():
            return True
        threading.Event().wait(0.02)
    return False


def test_api_flow_timetable_match_queue(api_env):
    a = api_env["make"]()
    sid = next(s["id"] for s in a.get_series() if s["key"] == "defqon1")
    opened = a.open_collector_edition({"series_id": sid, "year": 2024})
    assert opened["ok"] and opened["edition"]["edition"] == "Defqon.1 2024"
    eid = opened["edition"]["edition_id"]
    assert a.open_collector_edition({"series_id": sid, "year": "x"})["ok"] is False
    preview = a.parse_timetable("Saturday\nRED\n18:00 - 19:00 Headhunterz\n19:00 Rebelion")
    assert preview["ok"] and len(preview["rows"]) == 2
    res = a.import_timetable(eid, preview["rows"])
    assert res["ok"] and res["added"] == 2
    assert [e for e in a.events if e[0] == "collector_rows"]
    est = a.estimate_checklist_matching(eid)
    assert est["ok"] and est["requests"] == 2
    started = a.start_checklist_matching(eid)
    assert started["ok"] and started["job"]["state"] == "pending"
    assert wait_for(lambda: (collector.get_job(a._db, eid) or {}).get("state") == "done")
    assert wait_for(
        lambda: any(e[0] == "collector_job" and e[1]["state"] == "done" for e in a.events)
    )
    assert api_env["client"].queries == ["Headhunterz Defqon.1 2024", "Rebelion Defqon.1 2024"]
    cl = a.get_checklist(eid)
    rows = {r["artist"]: r for r in cl["rows"]}
    assert rows["Headhunterz"]["status"] == "found" and rows["Headhunterz"]["confirmed"]
    assert a.get_collector_editions()[0]["stats"]["ready"] == 1
    q = a.queue_checklist(eid)
    assert q["ok"] and q["queued"] == [HH["id"]] and q["skipped"]["missing"] == 1
    assert a.get_checklist(eid)["rows"][0]["status"] == "queued"
    rows_events = [d for t, d in a.events if t == "collector_rows" and d["rows"]]
    assert any(r["status"] == "queued" for d in rows_events for r in d["rows"])
    # row editing through the bridge
    rid = rows["Rebelion"]["id"]
    assert a.update_checklist_row(rid, {"start": "nope"})["errors"] == {
        "start": a.update_checklist_row(rid, {"start": "nope"})["errors"]["start"]
    }
    assert a.set_checklist_ignored([rid], True)["changed"] == 1
    assert a.get_checklist(eid)["rows"][1]["status"] == "ignored"
    added = a.add_checklist_row(eid, {"artist": "Sefa", "stage": "BLUE"})
    assert added["ok"] and added["row"]["source"] == "manual"
    assert a.delete_checklist_rows([added["row"]["id"]])["deleted"] == 1
    assert a.confirm_checklist_match(rid, "zzzzzzzzzzz")["ok"] is False
    assert a.delete_checklist(eid) == {"ok": True, "deleted": True}
    assert a.get_collector_editions() == []


def test_api_refuses_matching_during_backoff_and_cancel(api_env):
    a = api_env["make"]()
    sid = next(s["id"] for s in a.get_series() if s["key"] == "defqon1")
    eid = a.open_collector_edition({"series_id": sid, "year": 2024})["edition"]["edition_id"]
    a.import_timetable(eid, "Nobody")
    a._throttle.trigger_backoff("HTTP Error 429")
    res = a.start_checklist_matching(eid)
    assert res["ok"] is False and res["error"]
    assert a.import_checklist_playlist(eid, DQ_PLAYLIST)["ok"] is False
    a._throttle.clear_backoff_manual()
    assert a.import_checklist_playlist(eid, "https://www.youtube.com/@qdance")["ok"] is False
    assert a.cancel_checklist_matching(eid)["ok"]
    assert a.start_checklist_matching(999)["ok"] is False


def test_api_interrupted_job_continues_after_restart(api_env):
    a = api_env["make"]()
    sid = next(s["id"] for s in a.get_series() if s["key"] == "defqon1")
    eid = a.open_collector_edition({"series_id": sid, "year": 2024})["edition"]["edition_id"]
    a.import_timetable(eid, "A1")
    collector.request_job(a._db, eid)
    collector.update_job(a._db, eid, job_state="running")  # crash / exit while running
    collector.release_running(a._db, "x")
    assert collector.open_jobs(a._db) == [eid]
    a._resume_collector()
    assert wait_for(lambda: (collector.get_job(a._db, eid) or {}).get("state") == "done")
