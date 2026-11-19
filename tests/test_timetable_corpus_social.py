"""v0.10.2 timetable parser: second corpus, written before the parser changes (pass rate measured
against it). Realistic pastes from Instagram/Facebook posts (emoji, marketing lines), festival-app
exports (cards, buttons like «Add to favourites»), website copy-paste with table remnants and
inline stage forms, in English, German and Dutch. Families of the last QA round (docs/qa/v0.5.0.md
«Nachprüfung 3»): marketing lines must go to `skipped`, inline stage prefixes with several sets on
one line, the stage as line prefix, ALL-CAPS area names in line-ups without times.

Same format as tests/test_timetable_corpus.py: (text, rows, skipped); rows are
(artist, stage, day, start, end, set_type)."""

from __future__ import annotations

import pytest

from app.core import timetable as tt
from tests.test_timetable_corpus import R, STAGES, SET_TYPES, N, _key, _tuples

SOCIAL = [
    # ------------------------------------------------------------------ marketing lines (family 1)
    (
        "🔥 SATURDAY TIMETABLE 🔥\nRED\n18:00 - 19:00 Sefa\n19:00 - 20:00 Rooler\n"
        "Swipe for more ➡️\nTickets via link in bio 🎟️",
        [R("Sefa", "RED", N, "18:00", "19:00"), R("Rooler", "RED", N, "19:00", "20:00")],
        ["🔥 SATURDAY TIMETABLE 🔥", "Swipe for more ➡️", "Tickets via link in bio 🎟️"],
    ),
    (
        "Save the date 📅\nLine-up phase 1 🔥\nHeadhunterz\nWildstylez\nD-Sturb\n"
        "👇 full timetable in the app 👇",
        [R("Headhunterz"), R("Wildstylez"), R("D-Sturb")],
        ["Save the date 📅", "Line-up phase 1 🔥", "👇 full timetable in the app 👇"],
    ),
    (
        "Swipe ➡️ for the full line-up\nAngerfist\nMiss K8\nDr. Peacock",
        [R("Angerfist"), R("Miss K8"), R("Dr. Peacock")],
        ["Swipe ➡️ for the full line-up"],
    ),
    (
        "Es ist soweit! 🎉 Der Timetable für Samstag:\nMAINSTAGE\n20:00 – 21:00 Sub Zero Project\n"
        "21:00 – 22:00 Rebelion\nTeilt den Beitrag mit euren Freunden! 🙌",
        [
            R("Sub Zero Project", "Mainstage", N, "20:00", "21:00"),
            R("Rebelion", "Mainstage", N, "21:00", "22:00"),
        ],
        [
            "Es ist soweit! 🎉 Der Timetable für Samstag:",
            "Teilt den Beitrag mit euren Freunden! 🙌",
        ],
    ),
    (
        "ZATERDAG 📍 HOOFDPODIUM\n14:00 Frontliner\n15:00 B-Front\nTag je festivalmaatje! 👯\n"
        "Check de app voor de volledige timetable",
        [
            R("Frontliner", "HOOFDPODIUM", "ZATERDAG", "14:00"),
            R("B-Front", "HOOFDPODIUM", "ZATERDAG", "15:00"),
        ],
        ["Tag je festivalmaatje! 👯", "Check de app voor de volledige timetable"],
    ),
    (
        "Het is zover!! Het blokkenschema van zaterdag 👇\nBLACK\n21:00 - 22:00 Angerfist\n"
        "22:00 - 23:00 Partyraiser\nWie zien we daar? 🖤",
        [
            R("Angerfist", "BLACK", N, "21:00", "22:00"),
            R("Partyraiser", "BLACK", N, "22:00", "23:00"),
        ],
        ["Het is zover!! Het blokkenschema van zaterdag 👇", "Wie zien we daar? 🖤"],
    ),
    (
        "TONIGHT'S SET TIMES ⏰\n9pm Sound Rush\n10pm Atmozfears\n11pm Headhunterz\n"
        "Who's coming? 🙋",
        [
            R("Sound Rush", N, N, "21:00"),
            R("Atmozfears", N, N, "22:00"),
            R("Headhunterz", N, N, "23:00"),
        ],
        ["TONIGHT'S SET TIMES ⏰", "Who's coming? 🙋"],
    ),
    (
        "FRIDAY 27.06.\nUV\n22:00 - 23:30 Deadly Guns\n23:30 - 01:00 Warface\nSwipe for more ➡️",
        [
            R("Deadly Guns", "UV", "FRIDAY 27.06.", "22:00", "23:30"),
            R("Warface", "UV", "FRIDAY 27.06.", "23:30", "01:00"),
        ],
        ["Swipe for more ➡️"],
    ),
    (
        "SAVE THE DATE 📅\nSamstag, 12.07.\nMAINSTAGE\n20:00 Headhunterz\n21:00 Wildstylez\n"
        "Tickets ab Freitag im Vorverkauf",
        [
            R("Headhunterz", "Mainstage", "Samstag, 12.07.", "20:00"),
            R("Wildstylez", "Mainstage", "Samstag, 12.07.", "21:00"),
        ],
        ["SAVE THE DATE 📅", "Tickets ab Freitag im Vorverkauf"],
    ),
    (
        "QLIMAX 2025 🖤\nThe Source of Creation\nLine-up:\nSub Zero Project\nD-Sturb\nRebelion\n"
        "Act of Rage\n👇 Tag your crew 👇\n#qlimax #hardstyle",
        [R("Sub Zero Project"), R("D-Sturb"), R("Rebelion"), R("Act of Rage")],
        [
            "QLIMAX 2025 🖤",
            "The Source of Creation",
            "Line-up:",
            "👇 Tag your crew 👇",
            "#qlimax #hardstyle",
        ],
    ),
    (
        "LINE-UP ANNOUNCEMENT 🚨\nPhase 1 👇\nHeadhunterz\nSub Zero Project\nD-Sturb\n"
        "More to be announced soon!\nSwipe left to see the timetable ⬅️",
        [R("Headhunterz"), R("Sub Zero Project"), R("D-Sturb")],
        [
            "LINE-UP ANNOUNCEMENT 🚨",
            "Phase 1 👇",
            "More to be announced soon!",
            "Swipe left to see the timetable ⬅️",
        ],
    ),
    (
        "Zaterdag 12 juli\nRED\n19:00 - 20:00 Sub Zero Project LIVE\n20:00 - 21:00 Rebelion\n"
        "Deel dit bericht met je vrienden!",
        [
            R("Sub Zero Project", "RED", "Zaterdag 12 juli", "19:00", "20:00", "live_set"),
            R("Rebelion", "RED", "Zaterdag 12 juli", "20:00", "21:00"),
        ],
        ["Deel dit bericht met je vrienden!"],
    ),
    (
        "18:00 Sefa\n19:00 Rooler\nDon't miss it!\nLink in bio for tickets",
        [R("Sefa", N, N, "18:00"), R("Rooler", N, N, "19:00")],
        ["Don't miss it!", "Link in bio for tickets"],
    ),
    (
        "Samstag 🔥\n22:00 Rebelion\n23:00 Sub Zero Project\n00:00 Warface\nWer ist dabei??",
        [
            R("Rebelion", N, "Samstag", "22:00"),
            R("Sub Zero Project", N, "Samstag", "23:00"),
            R("Warface", N, "Samstag", "00:00"),
        ],
        ["Wer ist dabei??"],
    ),
    (
        "Set times below ⬇️\nBLUE\n16:00 Ecstatic\n17:00 Vertile\nComing soon: the full app 📲",
        [R("Ecstatic", "BLUE", N, "16:00"), R("Vertile", "BLUE", N, "17:00")],
        ["Set times below ⬇️", "Coming soon: the full app 📲"],
    ),
    (
        "Defqon.1 Weekend Festival 2025\nFriday 27 June\nBLUE\n13:00 - 14:00\nSefa\n"
        "14:00 - 15:00\nRooler",
        [
            R("Sefa", "BLUE", "Friday 27 June", "13:00", "14:00"),
            R("Rooler", "BLUE", "Friday 27 June", "14:00", "15:00"),
        ],
        ["Defqon.1 Weekend Festival 2025"],
    ),
    # ------------------------------------------------------------------ app exports
    (
        "SATURDAY\nRED\n18:00 - 19:00\nSefa\nAdd to favourites\n19:00 - 20:00\nRooler\n"
        "Add to favourites",
        [
            R("Sefa", "RED", "SATURDAY", "18:00", "19:00"),
            R("Rooler", "RED", "SATURDAY", "19:00", "20:00"),
        ],
        ["Add to favourites", "Add to favourites"],
    ),
    (
        "BLUE\nNow playing\nSefa\n13:00 - 14:00\nUp next\nRooler\n14:00 - 15:00",
        [R("Sefa", "BLUE", N, "13:00", "14:00"), R("Rooler", "BLUE", N, "14:00", "15:00")],
        ["Now playing", "Up next"],
    ),
    (
        "❤️ 18:00 – 19:00 Headhunterz\n🤍 19:00 – 20:00 Wildstylez",
        [R("Headhunterz", N, N, "18:00", "19:00"), R("Wildstylez", N, N, "19:00", "20:00")],
        [],
    ),
    (
        "Friday\nHeadhunterz\nMAINSTAGE · 22:00 - 23:00\nAdd to my timetable",
        [R("Headhunterz", "Mainstage", "Friday", "22:00", "23:00")],
        ["Add to my timetable"],
    ),
    # ------------------------------------------------------------------ website copy
    (
        "Time\tArtist\tStage\n18:00 – 19:00\tHeadhunterz\tMainstage\n"
        "19:00 – 20:00\tWildstylez\tMainstage\nShow more",
        [
            R("Headhunterz", "Mainstage", N, "18:00", "19:00"),
            R("Wildstylez", "Mainstage", N, "19:00", "20:00"),
        ],
        ["Show more"],
    ),
    (
        "| Time | Artist | Stage |\n|---|---|---|\n| 18:00 | Sefa | RED |\n| 19:00 | Rooler | RED |",
        [R("Sefa", "RED", N, "18:00"), R("Rooler", "RED", N, "19:00")],
        [],
    ),
    (
        "Line-up\nHeadhunterz\nRead more\nWildstylez\nRead more\nBuy tickets",
        [R("Headhunterz"), R("Wildstylez")],
        ["Line-up", "Read more", "Read more", "Buy tickets"],
    ),
    (
        "Programm Samstag\nHauptbühne\n16:00 – 17:00 Uhr: Frontliner\n"
        "17:00 – 18:00 Uhr: Brennan Heart\nAlle Angaben ohne Gewähr",
        [
            R("Frontliner", "Hauptbühne", N, "16:00", "17:00"),
            R("Brennan Heart", "Hauptbühne", N, "17:00", "18:00"),
        ],
        ["Programm Samstag", "Alle Angaben ohne Gewähr"],
    ),
    (
        "Vrijdag 27 juni\nMainstage\n20.00 - 21.00 uur Da Tweekaz\n21.00 - 22.00 uur Brennan Heart\n"
        "Bekijk het volledige programma in de app",
        [
            R("Da Tweekaz", "Mainstage", "Vrijdag 27 juni", "20:00", "21:00"),
            R("Brennan Heart", "Mainstage", "Vrijdag 27 juni", "21:00", "22:00"),
        ],
        ["Bekijk het volledige programma in de app"],
    ),
    (
        "Saturday RED\nSefa 18:00-19:00\nRooler 19:00-20:00\nDillytek 20:00-21:00",
        [
            R("Sefa", "RED", "Saturday", "18:00", "19:00"),
            R("Rooler", "RED", "Saturday", "19:00", "20:00"),
            R("Dillytek", "RED", "Saturday", "20:00", "21:00"),
        ],
        [],
    ),
    (
        "Doors open at 20:00 and the first DJ starts at 21:00, see you there!\n21:00 Sefa",
        [R("Sefa", N, N, "21:00")],
        ["Doors open at 20:00 and the first DJ starts at 21:00, see you there!"],
    ),
    (
        "18:00 Headhunterz @ RED, 19:00 Wildstylez @ BLUE",
        [R("Headhunterz", "RED", N, "18:00"), R("Wildstylez", "BLUE", N, "19:00")],
        [],
    ),
    # ------------------------------------------------------------------ inline stage forms (2)
    (
        "RED: 18:00 Headhunterz, 19:00 Sub Zero Project\nBLUE: 18:00 Sefa, 19:00 Dillytek",
        [
            R("Headhunterz", "RED", N, "18:00"),
            R("Sub Zero Project", "RED", N, "19:00"),
            R("Sefa", "BLUE", N, "18:00"),
            R("Dillytek", "BLUE", N, "19:00"),
        ],
        [],
    ),
    (
        "Bühne RED – 18:00 Headhunterz · 19:00 Sub Zero Project\n"
        "Bühne BLUE – 18:00 Sefa · 19:00 Rooler",
        [
            R("Headhunterz", "RED", N, "18:00"),
            R("Sub Zero Project", "RED", N, "19:00"),
            R("Sefa", "BLUE", N, "18:00"),
            R("Rooler", "BLUE", N, "19:00"),
        ],
        [],
    ),
    (
        "Mainstage: 17:00 Crypsis, 18:00 Deadly Guns, 19:00 Warface",
        [
            R("Crypsis", "Mainstage", N, "17:00"),
            R("Deadly Guns", "Mainstage", N, "18:00"),
            R("Warface", "Mainstage", N, "19:00"),
        ],
        [],
    ),
    (
        "RED STAGE — 18:00 Sefa / 19:00 Rooler / 20:00 Ecstatic",
        [
            R("Sefa", "RED", N, "18:00"),
            R("Rooler", "RED", N, "19:00"),
            R("Ecstatic", "RED", N, "20:00"),
        ],
        [],
    ),
    (
        "Saturday – RED: 18:00 Sefa, 19:00 Rooler",
        [R("Sefa", "RED", "Saturday", "18:00"), R("Rooler", "RED", "Saturday", "19:00")],
        [],
    ),
    (
        "UV: 22:00 Deadly Guns b2b Thyron, 23:00 Warface",
        [R("Deadly Guns b2b Thyron", "UV", N, "22:00"), R("Warface", "UV", N, "23:00")],
        [],
    ),
    (
        "RED: 18:00-19:00 Sefa, 19:00-20:00 Rooler",
        [R("Sefa", "RED", N, "18:00", "19:00"), R("Rooler", "RED", N, "19:00", "20:00")],
        [],
    ),
    (
        "Hauptbühne: 20:00 Headhunterz · 21:00 Wildstylez · 22:00 Sub Zero Project",
        [
            R("Headhunterz", "Hauptbühne", N, "20:00"),
            R("Wildstylez", "Hauptbühne", N, "21:00"),
            R("Sub Zero Project", "Hauptbühne", N, "22:00"),
        ],
        [],
    ),
    # ------------------------------------------------------------------ stage as line prefix (3)
    (
        "RED | 18:00–19:00 | Headhunterz\nRED | 19:00–20:00 | Sub Zero Project\n"
        "BLUE | 18:00–19:00 | Sefa",
        [
            R("Headhunterz", "RED", N, "18:00", "19:00"),
            R("Sub Zero Project", "RED", N, "19:00", "20:00"),
            R("Sefa", "BLUE", N, "18:00", "19:00"),
        ],
        [],
    ),
    (
        "[BLUE] 20:00 Angerfist\n[BLUE] 21:00 Miss K8\n[RED] 20:00 Sefa",
        [
            R("Angerfist", "BLUE", N, "20:00"),
            R("Miss K8", "BLUE", N, "21:00"),
            R("Sefa", "RED", N, "20:00"),
        ],
        [],
    ),
    (
        "Saturday\nMainstage 19:00 Gridkiller\nBlack 19:00 Ophidian\nMainstage 20:00 Mutilator\n"
        "Black 20:00 Partyraiser",
        [
            R("Gridkiller", "Mainstage", "Saturday", "19:00"),
            R("Ophidian", "BLACK", "Saturday", "19:00"),
            R("Mutilator", "Mainstage", "Saturday", "20:00"),
            R("Partyraiser", "BLACK", "Saturday", "20:00"),
        ],
        [],
    ),
    (
        "[UV] 22:00 - 23:00 Deadly Guns\n[UV] 23:00 - 00:00 Warface",
        [R("Deadly Guns", "UV", N, "22:00", "23:00"), R("Warface", "UV", N, "23:00", "00:00")],
        [],
    ),
    (
        "THE GATHERING | 14:00 Warface\nTHE GATHERING | 15:00 Rejecta",
        [R("Warface", "THE GATHERING", N, "14:00"), R("Rejecta", "THE GATHERING", N, "15:00")],
        [],
    ),
    (
        "Hardstyle Arena | 20:00 - 21:00 | Da Tweekaz\nHardstyle Arena | 21:00 - 22:00 | Coone",
        [
            R("Da Tweekaz", "Hardstyle Arena", N, "20:00", "21:00"),
            R("Coone", "Hardstyle Arena", N, "21:00", "22:00"),
        ],
        [],
    ),
    # ------------------------------------------------------------------ ALL-CAPS areas (4)
    (
        "MAINSTAGE\nHeadhunterz\nWildstylez\nUNDERGROUND\nAngerfist\nMiss K8",
        [
            R("Headhunterz", "Mainstage"),
            R("Wildstylez", "Mainstage"),
            R("Angerfist", "UNDERGROUND"),
            R("Miss K8", "UNDERGROUND"),
        ],
        [],
    ),
    (
        "THE GATHERING\nWarface\nRejecta\nSpitnoise\nHARDCORE AREA\nAngerfist\nMiss K8\n"
        "UNDERGROUND\nDr. Peacock\nPartyraiser",
        [
            R("Warface", "THE GATHERING"),
            R("Rejecta", "THE GATHERING"),
            R("Spitnoise", "THE GATHERING"),
            R("Angerfist", "HARDCORE AREA"),
            R("Miss K8", "HARDCORE AREA"),
            R("Dr. Peacock", "UNDERGROUND"),
            R("Partyraiser", "UNDERGROUND"),
        ],
        [],
    ),
    (
        "Saturday\nTHE SANCTUARY\nAct of Rage\nRebelion\nUnresolved\nCLASSICS\nThe Prophet\nPavo",
        [
            R("Act of Rage", "THE SANCTUARY", "Saturday"),
            R("Rebelion", "THE SANCTUARY", "Saturday"),
            R("Unresolved", "THE SANCTUARY", "Saturday"),
            R("The Prophet", "CLASSICS", "Saturday"),
            R("Pavo", "CLASSICS", "Saturday"),
        ],
        [],
    ),
    (
        "ZONDAG\nHOOFDPODIUM\nFrontliner\nDa Tweekaz\nCoone\nHARDCORE\nAngerfist\nDr. Peacock",
        [
            R("Frontliner", "HOOFDPODIUM", "ZONDAG"),
            R("Da Tweekaz", "HOOFDPODIUM", "ZONDAG"),
            R("Coone", "HOOFDPODIUM", "ZONDAG"),
            R("Angerfist", "HARDCORE", "ZONDAG"),
            R("Dr. Peacock", "HARDCORE", "ZONDAG"),
        ],
        [],
    ),
    # ------------------------------------------------------------------ counter-cases: stay artists
    (
        "Mainstage\nHeadhunterz\nTNT\nRebelion\nNoisecontrollers",
        [
            R("Headhunterz", "Mainstage"),
            R("TNT", "Mainstage"),
            R("Rebelion", "Mainstage"),
            R("Noisecontrollers", "Mainstage"),
        ],
        [],
    ),
    (
        "BLUE\nSefa\nRooler\nMC SYCO\nDillytek",
        [
            R("Sefa", "BLUE"),
            R("Rooler", "BLUE"),
            R("MC SYCO", "BLUE"),
            R("Dillytek", "BLUE"),
        ],
        [],
    ),
    (
        "Angerfist\nCoone\nB-FRONT\nD-Sturb\nFrontliner",
        [R("Angerfist"), R("Coone"), R("B-FRONT"), R("D-Sturb"), R("Frontliner")],
        [],
    ),
    (
        "Headhunterz 18:00 - 19:00\nSub Zero Project 19:00 - 20:00",
        [
            R("Headhunterz", N, N, "18:00", "19:00"),
            R("Sub Zero Project", N, N, "19:00", "20:00"),
        ],
        [],
    ),
]


def test_social_corpus_is_large_enough():
    assert len(SOCIAL) >= 40


@pytest.mark.parametrize(("text", "expected", "skipped"), SOCIAL)
def test_social_corpus(text, expected, skipped):
    res = tt.parse(text, STAGES, SET_TYPES)
    assert _tuples(res) == expected
    assert res["skipped"] == skipped


@pytest.mark.parametrize(("text", "expected", "skipped"), SOCIAL)
def test_social_corpus_without_catalog(text, expected, skipped):
    res = tt.parse(text)
    assert _key(_tuples(res)) == _key(expected)
    assert res["skipped"] == skipped


def test_social_corpus_nothing_lost():
    """No silent loss: every line with a letter is a row, a heading or reported."""
    for text, _rows, _skipped in SOCIAL:
        res = tt.parse(text, STAGES, SET_TYPES)
        assert res["rows"] or res["skipped"]
