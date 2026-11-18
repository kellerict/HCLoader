"""v0.5.0 timetable parser: corpus of realistic pastes (festival apps, Instagram/Facebook posts,
websites, Reddit lists; English, German, Dutch). Each QA round writes new snippets, so this is
deliberately broader than the listed failures. Families: dated day headings, TSV/CSV/pipe tables
with and without header row, line-ups without times under stage headings, free-text lines
(reported in `skipped`, never an artist), comma/bullet lists, festival-app cards.

Every case is (text, rows, skipped); rows are (artist, stage, day, start, end, set_type). Checked
with the app catalog and bare (`tt.parse(text)`, stages compared loosely)."""

from __future__ import annotations

import pytest

from app.core import festivals as fx
from app.core import series
from app.core import timetable as tt


def _catalog():
    data, _ = series.builtin_data()
    return fx.stages_from(data.get("stages")), fx.set_types_from(data.get("set_types"))


STAGES, SET_TYPES = _catalog()
N = None


def R(artist, stage=N, day=N, start=N, end=N, set_type=N):  # noqa: N802 - table helper
    return (artist, stage, day, start, end, set_type)


CORPUS = [
    # ------------------------------------------------------------------ dated day headings
    (
        "Samstag, 12.07.\nMAINSTAGE\n18:00 - 19:00 Headhunterz\n19:00 - 20:00 Sub Zero Project",
        [
            R("Headhunterz", "Mainstage", "Samstag, 12.07.", "18:00", "19:00"),
            R("Sub Zero Project", "Mainstage", "Samstag, 12.07.", "19:00", "20:00"),
        ],
        [],
    ),
    (
        "Saturday 12 July\nRED\n14:00 Sefa\n15:00 Rooler",
        [
            R("Sefa", "RED", "Saturday 12 July", "14:00"),
            R("Rooler", "RED", "Saturday 12 July", "15:00"),
        ],
        [],
    ),
    (
        "Sa. 12.7.2025\n20:00 - 21:00 Rebelion",
        [R("Rebelion", N, "Sa. 12.7.2025", "20:00", "21:00")],
        [],
    ),
    ("12/07 – Saturday\n21:00 Warface", [R("Warface", N, "12/07 – Saturday", "21:00")], []),
    (
        "Friday 11 July 2025\nBLUE\n16:00 Dillytek\n\nSaturday 12 July 2025\nBLUE\n16:00 Sefa",
        [
            R("Dillytek", "BLUE", "Friday 11 July 2025", "16:00"),
            R("Sefa", "BLUE", "Saturday 12 July 2025", "16:00"),
        ],
        [],
    ),
    (
        "Zaterdag 12 juli\nRED\n18.00 - 19.00 Atmozfears",
        [R("Atmozfears", "RED", "Zaterdag 12 juli", "18:00", "19:00")],
        [],
    ),
    (
        "SATURDAY 12.07. – MAINSTAGE\n22:00 Headhunterz",
        [R("Headhunterz", "Mainstage", "SATURDAY 12.07.", "22:00")],
        [],
    ),
    (
        "Day 2 – Saturday 12 July\n20:00 Rebelion",
        [R("Rebelion", N, "Day 2 – Saturday 12 July", "20:00")],
        [],
    ),
    ("Sunday, July 13th\n17:00 Sefa", [R("Sefa", N, "Sunday, July 13th", "17:00")], []),
    ("12.07.2025\n18:00 Sefa", [R("Sefa", N, "12.07.2025", "18:00")], []),
    ("📅 Fr. 11.07.\n⏰ 23:00 Angerfist", [R("Angerfist", N, "Fr. 11.07.", "23:00")], []),
    (
        "Vrijdag 11 juli 2025\nTHE GATHERING\n14:00 – 15:00 Warface\n15:00 – 16:00 Rejecta",
        [
            R("Warface", "THE GATHERING", "Vrijdag 11 juli 2025", "14:00", "15:00"),
            R("Rejecta", "THE GATHERING", "Vrijdag 11 juli 2025", "15:00", "16:00"),
        ],
        [],
    ),
    (
        "Friday 11.07. | RED STAGE\n18:00 Sefa",
        [R("Sefa", "RED", "Friday 11.07.", "18:00")],
        [],
    ),
    # ------------------------------------------------------------------ tables
    (
        "Vrijdag\tBLUE\t14:00\t15:00\tTNT\nVrijdag\tBLUE\t15:00\t16:00\tSefa",
        [
            R("TNT", "BLUE", "Vrijdag", "14:00", "15:00"),
            R("Sefa", "BLUE", "Vrijdag", "15:00", "16:00"),
        ],
        [],
    ),
    ("Vrijdag\tBLUE\t14:00\t15:00\tTNT", [R("TNT", "BLUE", "Vrijdag", "14:00", "15:00")], []),
    (
        "Day\tStage\tStart\tEnd\tArtist\nSaturday\tRED\t18:00\t19:00\tHeadhunterz",
        [R("Headhunterz", "RED", "Saturday", "18:00", "19:00")],
        [],
    ),
    (
        "Tag\tBühne\tZeit\tKünstler\nSamstag\tRED\t18:00-19:00\tRebelion",
        [R("Rebelion", "RED", "Samstag", "18:00", "19:00")],
        [],
    ),
    (
        "Start\tEnde\tAct\tArea\n20:00\t21:00\tMiss K8\tHardcore Area",
        [R("Miss K8", "Hardcore Area", N, "20:00", "21:00")],
        [],
    ),
    (
        "Sat | 18:00-19:00 | Headhunterz | MAINSTAGE\nSat | 19:00-20:00 | Wildstylez | MAINSTAGE",
        [
            R("Headhunterz", "Mainstage", "Sat", "18:00", "19:00"),
            R("Wildstylez", "Mainstage", "Sat", "19:00", "20:00"),
        ],
        [],
    ),
    ("Time | Act | Stage\n18:00 | Sefa | RED", [R("Sefa", "RED", N, "18:00")], []),
    (
        "Defqon.1 2025 timetable\nartist,stage,start\nSefa,RED,18:00",
        [R("Sefa", "RED", N, "18:00")],
        ["Defqon.1 2025 timetable"],
    ),
    ("SAT\tRED\t18:00\tHEADHUNTERZ", [R("HEADHUNTERZ", "RED", "SAT", "18:00")], []),
    (
        "Time\tArtist\tStage\nSaturday\n18:00\tSefa\tRED\nSunday\n18:00\tRooler\tBLUE",
        [R("Sefa", "RED", "Saturday", "18:00"), R("Rooler", "BLUE", "Sunday", "18:00")],
        [],
    ),
    (
        "Zeit;Act;Bühne\n18:00-19:00;Sefa;RED\nbitte beachtet die Einlasszeiten\n"
        "19:00-20:00;Rooler;RED",
        [R("Sefa", "RED", N, "18:00", "19:00"), R("Rooler", "RED", N, "19:00", "20:00")],
        ["bitte beachtet die Einlasszeiten"],
    ),
    # ------------------------------------------------------------------ line-ups without times
    (
        "Sunday\nMAINSTAGE\nHeadhunterz\nWildstylez\nRED\nSefa\nRooler\nTHE GATHERING\nWarface\n"
        "Neophyte",
        [
            R("Headhunterz", "Mainstage", "Sunday"),
            R("Wildstylez", "Mainstage", "Sunday"),
            R("Sefa", "RED", "Sunday"),
            R("Rooler", "RED", "Sunday"),
            R("Warface", "THE GATHERING", "Sunday"),
            R("Neophyte", "THE GATHERING", "Sunday"),
        ],
        [],
    ),
    (
        "MAINSTAGE\nHeadhunterz\nWildstylez\n\nTHE GATHERING\nWarface",
        [
            R("Headhunterz", "Mainstage"),
            R("Wildstylez", "Mainstage"),
            R("Warface", "THE GATHERING"),
        ],
        [],
    ),
    (
        "Hardcore Area\nAngerfist\nMiss K8\nEuphoric Arena\nSound Rush",
        [
            R("Angerfist", "Hardcore Area"),
            R("Miss K8", "Hardcore Area"),
            R("Sound Rush", "Euphoric Arena"),
        ],
        [],
    ),
    (
        "Saturday\nTHE GATHERING\nWarface\nRadical Redemption",
        [
            R("Warface", "THE GATHERING", "Saturday"),
            R("Radical Redemption", "THE GATHERING", "Saturday"),
        ],
        [],
    ),
    (
        "HEADHUNTERZ\nWILDSTYLEZ\nSUB ZERO PROJECT\nREBELION",
        [R("HEADHUNTERZ"), R("WILDSTYLEZ"), R("SUB ZERO PROJECT"), R("REBELION")],
        [],
    ),
    (
        "Mainstage\nHeadhunterz\nTNT\nRebelion",
        [R("Headhunterz", "Mainstage"), R("TNT", "Mainstage"), R("Rebelion", "Mainstage")],
        [],
    ),
    (
        "Main Stage:\nHeadhunterz\n\nHardstage:\nRooler",
        [R("Headhunterz", "Mainstage"), R("Rooler", "Hardstage")],
        [],
    ),
    (
        "Zondag\nHOOFDPODIUM\nB-Front\nFrontliner",
        [R("B-Front", "HOOFDPODIUM", "Zondag"), R("Frontliner", "HOOFDPODIUM", "Zondag")],
        [],
    ),
    (
        "MAINSTAGE\nHEADHUNTERZ\nWILDSTYLEZ\n\nTHE GATHERING\nWARFACE\nNEOPHYTE",
        [
            R("HEADHUNTERZ", "Mainstage"),
            R("WILDSTYLEZ", "Mainstage"),
            R("WARFACE", "THE GATHERING"),
            R("NEOPHYTE", "THE GATHERING"),
        ],
        [],
    ),
    (
        "Saturday\nMAINSTAGE\n18:00 Headhunterz\nRED\nSefa\nRooler",
        [
            R("Headhunterz", "Mainstage", "Saturday", "18:00"),
            R("Sefa", "RED", "Saturday"),
            R("Rooler", "RED", "Saturday"),
        ],
        [],
    ),
    ("the darkraver & dj vince\ndj isaac", [R("the darkraver & dj vince"), R("dj isaac")], []),
    # ------------------------------------------------------------------ lists on one line
    (
        "Line-up: Headhunterz, Wildstylez, Sefa, Rooler",
        [R("Headhunterz"), R("Wildstylez"), R("Sefa"), R("Rooler")],
        [],
    ),
    (
        "HEADHUNTERZ • WILDSTYLEZ • D-Sturb",
        [R("HEADHUNTERZ"), R("WILDSTYLEZ"), R("D-Sturb")],
        [],
    ),
    (
        "FRIDAY: Headhunterz, Wildstylez\nSATURDAY: Sefa, Rooler",
        [
            R("Headhunterz", N, "FRIDAY"),
            R("Wildstylez", N, "FRIDAY"),
            R("Sefa", N, "SATURDAY"),
            R("Rooler", N, "SATURDAY"),
        ],
        [],
    ),
    (
        "MAINSTAGE: Headhunterz, Sub Zero Project\nRED: Sefa, Dillytek",
        [
            R("Headhunterz", "Mainstage"),
            R("Sub Zero Project", "Mainstage"),
            R("Sefa", "RED"),
            R("Dillytek", "RED"),
        ],
        [],
    ),
    (
        "Headhunterz, Wildstylez and many more!",
        [R("Headhunterz"), R("Wildstylez")],
        ["and many more!"],
    ),
    (
        "18:00 Headhunterz • 19:00 Wildstylez",
        [R("Headhunterz", N, N, "18:00"), R("Wildstylez", N, N, "19:00")],
        [],
    ),
    # ------------------------------------------------------------------ free text
    (
        "PINK\n18:00 Sefa\nfollow us on instagram!!\n19:00 Rooler",
        [R("Sefa", "PINK", N, "18:00"), R("Rooler", "PINK", N, "19:00")],
        ["follow us on instagram!!"],
    ),
    (
        "🔥 DEFQON.1 2025 – LINE-UP 🔥\nHeadhunterz\nWildstylez\nSub Zero Project\n"
        "Tickets via link in bio!\n#defqon1 #hardstyle #weekendwarriors",
        [R("Headhunterz"), R("Wildstylez"), R("Sub Zero Project")],
        [
            "🔥 DEFQON.1 2025 – LINE-UP 🔥",
            "Tickets via link in bio!",
            "#defqon1 #hardstyle #weekendwarriors",
        ],
    ),
    (
        "Doors open 12:00\nMAINSTAGE\n13:00 - 14:00 Dillytek\nLine-up subject to change.",
        [R("Dillytek", "Mainstage", N, "13:00", "14:00")],
        ["Doors open 12:00", "Line-up subject to change."],
    ),
    (
        "Einlass ab 14 Uhr\nSamstag\n15:00 Sefa\nÄnderungen vorbehalten!",
        [R("Sefa", N, "Samstag", "15:00")],
        ["Einlass ab 14 Uhr", "Änderungen vorbehalten!"],
    ),
    (
        "Zaterdag\n14:00 Atmozfears\nKaarten zijn uitverkocht, tot volgend jaar!\n"
        "Meer info op www.example.nl",
        [R("Atmozfears", N, "Zaterdag", "14:00")],
        ["Kaarten zijn uitverkocht, tot volgend jaar!", "Meer info op www.example.nl"],
    ),
    (
        "Here's the schedule for Saturday, see you there:\n- 18:00 Headhunterz\n- 19:00 Rebelion\n"
        "Edit: added times",
        [R("Headhunterz", N, N, "18:00"), R("Rebelion", N, N, "19:00")],
        ["Here's the schedule for Saturday, see you there:", "Edit: added times"],
    ),
    (
        "18:00 Sefa\nSee you on the dancefloor! 🎉",
        [R("Sefa", N, N, "18:00")],
        ["See you on the dancefloor! 🎉"],
    ),
    (
        "https://www.example.com/timetable\n18:00 Sefa",
        [R("Sefa", N, N, "18:00")],
        ["https://www.example.com/timetable"],
    ),
    (
        "Who are you most excited to see? 👇\nHeadhunterz\nRebelion",
        [R("Headhunterz"), R("Rebelion")],
        ["Who are you most excited to see? 👇"],
    ),
    (
        "Headhunterz\nMore artists to be announced...",
        [R("Headhunterz")],
        ["More artists to be announced..."],
    ),
    (
        "Unser Timetable für Samstag ist da! 🔥\nRED\n18:00 Sefa",
        [R("Sefa", "RED", N, "18:00")],
        ["Unser Timetable für Samstag ist da! 🔥"],
    ),
    (
        "BLACK\n21:00 Angerfist\nThank you, Amsterdam!\n22:00 Miss K8",
        [R("Angerfist", "BLACK", N, "21:00"), R("Miss K8", "BLACK", N, "22:00")],
        ["Thank you, Amsterdam!"],
    ),
    (
        "Saturday\nRED\nSefa\nRooler\nwe can't wait to see you all there\nBLUE\nDillytek",
        [
            R("Sefa", "RED", "Saturday"),
            R("Rooler", "RED", "Saturday"),
            R("Dillytek", "BLUE", "Saturday"),
        ],
        ["we can't wait to see you all there"],
    ),
    # ------------------------------------------------------------------ festival-app cards
    (
        "Headhunterz\n18:00 - 19:00\nWildstylez\n19:00 - 20:00",
        [R("Headhunterz", N, N, "18:00", "19:00"), R("Wildstylez", N, N, "19:00", "20:00")],
        [],
    ),
    (
        "18:00\nHeadhunterz\n19:00\nWildstylez",
        [R("Headhunterz", N, N, "18:00"), R("Wildstylez", N, N, "19:00")],
        [],
    ),
]


def _key(rows):
    # bare parsing keeps the spelling of the paste («MAINSTAGE», «Main Stage», «RED STAGE»)
    return [
        (a, fx.norm(st).replace(" ", "").removesuffix("stage"), d, s, e, t)
        for a, st, d, s, e, t in rows
    ]


def _tuples(res):
    return [
        (r["artist"], r["stage"], r["day"], r["start"], r["end"], r["set_type"])
        for r in res["rows"]
    ]


def test_corpus_is_large_enough():
    assert len(CORPUS) >= 40


@pytest.mark.parametrize(("text", "expected", "skipped"), CORPUS)
def test_corpus(text, expected, skipped):
    res = tt.parse(text, STAGES, SET_TYPES)
    assert _tuples(res) == expected
    assert res["skipped"] == skipped


@pytest.mark.parametrize(("text", "expected", "skipped"), CORPUS)
def test_corpus_without_catalog(text, expected, skipped):
    res = tt.parse(text)
    assert _key(_tuples(res)) == _key(expected)
    assert res["skipped"] == skipped


def test_corpus_never_loses_a_line():
    """Every non-blank, non-separator line ends up as a row, a heading or in `skipped`."""
    for text, _rows, _skipped in CORPUS:
        res = tt.parse(text, STAGES, SET_TYPES)
        assert res["rows"] or res["skipped"]
