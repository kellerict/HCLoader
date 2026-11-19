"""v0.10.2 timetable parser, QA round 2 (docs/qa/v0.10.2.md): the 30 independent QA pastes as
regression fixtures (25/30 before the fix) and 20 new pastes of the failing families:
festival-app cards with an unknown one-word stage line before the name or after the time,
unknown ALL-CAPS area headings in line-ups without times, and info/marketing lines in English,
German, Dutch and French (entry, doors, parking, tickets, sponsors, age limits, lockers,
shuttles), also with a time («Last entry 21:30»). Parsed without a stage catalog, as the QA did.

Rows are (artist, stage, day, start, end, set_type); `skipped` must list every unparsed line."""

from __future__ import annotations

import pytest

from app.core import timetable as tt
from tests.test_timetable_corpus import SET_TYPES, STAGES, N, R, _key, _tuples

QA_V0102 = [
    # 01 IG post emoji+hashtags
    (
        (
            "🔥🔥 TIMETABLE IS OUT 🔥🔥\n"
            "Who are you most excited for?? 😍\n"
            "SATURDAY 🎪\n"
            "🕓 16:00 - 17:00 Rooler\n"
            "🕔 17:00 - 18:00 Sefa\n"
            "🕕 18:00 - 19:30 Sub Zero Project\n"
            "Tickets in bio 🎟️\n"
            "#hardstyle #defqon1 #festival\n"
            "Tag your festival buddy 👇"
        ),
        [
            R("Rooler", N, "SATURDAY", "16:00", "17:00"),
            R("Sefa", N, "SATURDAY", "17:00", "18:00"),
            R("Sub Zero Project", N, "SATURDAY", "18:00", "19:30"),
        ],
        [
            "🔥🔥 TIMETABLE IS OUT 🔥🔥",
            "Who are you most excited for?? 😍",
            "Tickets in bio 🎟️",
            "#hardstyle #defqon1 #festival",
            "Tag your festival buddy 👇",
        ],
    ),
    # 02 FB multi-stage inline
    (
        (
            "RED: 18:00 Headhunterz, 19:00 Wildstylez, 20:00 Zatox\n"
            "BLUE: 18:00 Angerfist, 19:30 Dr. Peacock\n"
            "Don't miss it! Get your tickets now at www.example.com"
        ),
        [
            R("Headhunterz", "RED", N, "18:00"),
            R("Wildstylez", "RED", N, "19:00"),
            R("Zatox", "RED", N, "20:00"),
            R("Angerfist", "BLUE", N, "18:00"),
            R("Dr. Peacock", "BLUE", N, "19:30"),
        ],
        ["Don't miss it! Get your tickets now at www.example.com"],
    ),
    # 03 festival app export cards
    (
        (
            "Mainstage\n"
            "Frontliner\n"
            "22:00 - 23:00\n"
            "Mainstage\n"
            "Brennan Heart\n"
            "23:00 - 00:00\n"
            "Undergound\n"
            "Ran-D\n"
            "21:00 - 22:30"
        ),
        [
            R("Frontliner", "Mainstage", N, "22:00", "23:00"),
            R("Brennan Heart", "Mainstage", N, "23:00", "00:00"),
            R("Ran-D", "Undergound", N, "21:00", "22:30"),
        ],
        [],
    ),
    # 04 website table remnants
    (
        (
            "Time | Artist | Stage\n"
            "Friday\n"
            "20:00 – 21:00 | Phuture Noize | Red\n"
            "21:00 – 22:00 | D-Block & S-te-Fan | Red\n"
            "22:00 – 23:00 | Villain | Blue\n"
            "Load more\n"
            "© 2025 Festival BV"
        ),
        [
            R("Phuture Noize", "Red", "Friday", "20:00", "21:00"),
            R("D-Block & S-te-Fan", "Red", "Friday", "21:00", "22:00"),
            R("Villain", "Blue", "Friday", "22:00", "23:00"),
        ],
        ["Load more", "© 2025 Festival BV"],
    ),
    # 05 reddit list
    (
        (
            "Here's my planned schedule, thoughts?\n"
            "\n"
            "Sat\n"
            "- 14:00 Deadly Guns\n"
            "- 15:00 Max Enforcer\n"
            "- 16:00 Vertile b2b Bright Visions\n"
            "Sun\n"
            "- 14:00 Rebelion\n"
            "- 15:00 Rejecta\n"
            "\n"
            "Edit: typo"
        ),
        [
            R("Deadly Guns", N, "Sat", "14:00"),
            R("Max Enforcer", N, "Sat", "15:00"),
            R("Vertile b2b Bright Visions", N, "Sat", "16:00"),
            R("Rebelion", N, "Sun", "14:00"),
            R("Rejecta", N, "Sun", "15:00"),
        ],
        ["Here's my planned schedule, thoughts?", "Edit: typo"],
    ),
    # 06 German heading date+day
    (
        (
            "Samstag, 12.07.\n"
            "Bühne ROT\n"
            "18:00–19:00 Atmozfears\n"
            "19:00–20:00 Crypsis\n"
            "Bühne BLAU\n"
            "18:00–19:30 Mad Dog\n"
            "Sonntag, 13.07.\n"
            "Bühne ROT\n"
            "17:00–18:00 Rooler"
        ),
        [
            R("Atmozfears", "ROT", "Samstag, 12.07.", "18:00", "19:00"),
            R("Crypsis", "ROT", "Samstag, 12.07.", "19:00", "20:00"),
            R("Mad Dog", "BLAU", "Samstag, 12.07.", "18:00", "19:30"),
            R("Rooler", "ROT", "Sonntag, 13.07.", "17:00", "18:00"),
        ],
        [],
    ),
    # 07 Dutch zaterdag
    (
        (
            "ZATERDAG\n"
            "Mainstage\n"
            "14.00 - 15.00 Coone\n"
            "15.00 - 16.00 Hard Driver\n"
            "Bijna uitverkocht! Koop nu je tickets"
        ),
        [
            R("Coone", "Mainstage", "ZATERDAG", "14:00", "15:00"),
            R("Hard Driver", "Mainstage", "ZATERDAG", "15:00", "16:00"),
        ],
        ["Bijna uitverkocht! Koop nu je tickets"],
    ),
    # 08 French
    (
        (
            "Samedi 5 juillet\n"
            "Scène PURPLE\n"
            "18h00 - 19h00 Angerfist\n"
            "19h00 - 20h30 Sefa\n"
            "Entrée gratuite avant 17h"
        ),
        [
            R("Angerfist", "PURPLE", "Samedi 5 juillet", "18:00", "19:00"),
            R("Sefa", "PURPLE", "Samedi 5 juillet", "19:00", "20:30"),
        ],
        ["Entrée gratuite avant 17h"],
    ),
    # 09 CSV with header
    (
        (
            "Artist,Stage,Day,Start,End\n"
            "Headhunterz,Red,Saturday,18:00,19:00\n"
            "Wildstylez,Red,Saturday,19:00,20:00\n"
            "Noisecontrollers,Blue,Sunday,15:00,16:00"
        ),
        [
            R("Headhunterz", "Red", "Saturday", "18:00", "19:00"),
            R("Wildstylez", "Red", "Saturday", "19:00", "20:00"),
            R("Noisecontrollers", "Blue", "Sunday", "15:00", "16:00"),
        ],
        [],
    ),
    # 10 TSV no header
    (
        (
            "Day 1\tRED\t18:00\t19:00\tDJ Isaac\n"
            "Day 1\tRED\t19:00\t20:00\tTNT\n"
            "Day 1\tBLUE\t18:00\t19:00\tKeltek"
        ),
        [
            R("DJ Isaac", "RED", "Day 1", "18:00", "19:00"),
            R("TNT", "RED", "Day 1", "19:00", "20:00"),
            R("Keltek", "BLUE", "Day 1", "18:00", "19:00"),
        ],
        [],
    ),
    # 11 pipe no header
    (
        (
            "Warface | 20:00-21:00 | Mainstage\n"
            "Digital Punk | 21:00-22:00 | Mainstage\n"
            "Dither | 20:00-21:00 | Garden"
        ),
        [
            R("Warface", "Mainstage", N, "20:00", "21:00"),
            R("Digital Punk", "Mainstage", N, "21:00", "22:00"),
            R("Dither", "Garden", N, "20:00", "21:00"),
        ],
        [],
    ),
    # 12 several sets per line
    (
        ("RED STAGE\n18:00 Lady Faith · 19:00 Pavo · 20:00 Sound Rush"),
        [
            R("Lady Faith", "RED STAGE", N, "18:00"),
            R("Pavo", "RED STAGE", N, "19:00"),
            R("Sound Rush", "RED STAGE", N, "20:00"),
        ],
        [],
    ),
    # 13 lineup no times
    (
        ("MAINSTAGE\nHeadhunterz\nWildstylez\nCoone\n\nUNDERGROUND\nRan-D\nAngerfist"),
        [
            R("Headhunterz", "MAINSTAGE"),
            R("Wildstylez", "MAINSTAGE"),
            R("Coone", "MAINSTAGE"),
            R("Ran-D", "UNDERGROUND"),
            R("Angerfist", "UNDERGROUND"),
        ],
        [],
    ),
    # 14 am/pm
    (
        ("Friday\n8:00pm - 9:00pm Rebelion\n9:00pm - 10:30pm Sefa\n10:30pm - 12:00am Angerfist"),
        [
            R("Rebelion", N, "Friday", "20:00", "21:00"),
            R("Sefa", N, "Friday", "21:00", "22:30"),
            R("Angerfist", N, "Friday", "22:30", "00:00"),
        ],
        [],
    ),
    # 15 X post marketing + bullets
    (
        (
            "⚡ SET TIMES ⚡\n"
            "Saturday 🌙\n"
            "• 20:00 – 21:00 Evil Activities\n"
            "• 21:00 – 22:00 Ghost Stories\n"
            "• 22:00 – 23:30 Dimitri K\n"
            "Swipe for more ➡️\n"
            "Follow us for updates"
        ),
        [
            R("Evil Activities", N, "Saturday", "20:00", "21:00"),
            R("Ghost Stories", N, "Saturday", "21:00", "22:00"),
            R("Dimitri K", N, "Saturday", "22:00", "23:30"),
        ],
        ["⚡ SET TIMES ⚡", "Swipe for more ➡️", "Follow us for updates"],
    ),
    # 16 stage prefix per line
    (
        ("RED - 18:00-19:00 Sefa\nRED - 19:00-20:00 Rebelion\nBLUE - 18:00-19:00 Ophidian"),
        [
            R("Sefa", "RED", N, "18:00", "19:00"),
            R("Rebelion", "RED", N, "19:00", "20:00"),
            R("Ophidian", "BLUE", N, "18:00", "19:00"),
        ],
        [],
    ),
    # 17 combined heading
    (
        (
            "Saturday – RED\n"
            "18:00 - 19:00 Sefa\n"
            "Saturday – BLUE\n"
            "18:00 - 19:00 Ophidian\n"
            "Sunday – RED\n"
            "16:00 - 17:00 Rooler"
        ),
        [
            R("Sefa", "RED", "Saturday", "18:00", "19:00"),
            R("Ophidian", "BLUE", "Saturday", "18:00", "19:00"),
            R("Rooler", "RED", "Sunday", "16:00", "17:00"),
        ],
        [],
    ),
    # 18 ALL-CAPS areas mixed names
    (
        ("Saturday\nENDSHOW\nDr Phunk\nSub Zero Project\nBEYOND\nMc Lean\nSound Rush"),
        [
            R("Dr Phunk", "ENDSHOW", "Saturday"),
            R("Sub Zero Project", "ENDSHOW", "Saturday"),
            R("Mc Lean", "BEYOND", "Saturday"),
            R("Sound Rush", "BEYOND", "Saturday"),
        ],
        [],
    ),
    # 19 dotted times en dash
    (
        (
            "Sunday\n"
            "15.30 – 16.30 D-Sturb\n"
            "16.30 – 17.45 Radical Redemption\n"
            "17.45 – 19.00 Partyraiser"
        ),
        [
            R("D-Sturb", N, "Sunday", "15:30", "16:30"),
            R("Radical Redemption", N, "Sunday", "16:30", "17:45"),
            R("Partyraiser", N, "Sunday", "17:45", "19:00"),
        ],
        [],
    ),
    # 20 em dash, x collab
    (
        (
            "Day 2\n"
            "19:00 — 20:00 Sefa x Rooler\n"
            "20:00 — 21:00 Rebelion vs. Sub Zero Project\n"
            "21:00 — 22:00 Warface & Digital Punk"
        ),
        [
            R("Sefa x Rooler", N, "Day 2", "19:00", "20:00"),
            R("Rebelion vs. Sub Zero Project", N, "Day 2", "20:00", "21:00"),
            R("Warface & Digital Punk", N, "Day 2", "21:00", "22:00"),
        ],
        [],
    ),
    # 21 start-only times
    (
        ("Friday\n18:00 Rooler\n19:00 Sefa\n20:00 Atmozfears"),
        [
            R("Rooler", N, "Friday", "18:00"),
            R("Sefa", N, "Friday", "19:00"),
            R("Atmozfears", N, "Friday", "20:00"),
        ],
        [],
    ),
    # 22 artist then time
    (
        ("Rooler 18:00-19:00\nSefa 19:00-20:00\nAngerfist 20:00-21:30\nParking info: see website"),
        [
            R("Rooler", N, N, "18:00", "19:00"),
            R("Sefa", N, N, "19:00", "20:00"),
            R("Angerfist", N, N, "20:00", "21:30"),
        ],
        ["Parking info: see website"],
    ),
    # 23 bracket stage tag
    (
        ("[RED] 18:00 Sefa\n[RED] 19:00 Rebelion\n[BLUE] 20:00 Angerfist"),
        [
            R("Sefa", "RED", N, "18:00"),
            R("Rebelion", "RED", N, "19:00"),
            R("Angerfist", "BLUE", N, "20:00"),
        ],
        [],
    ),
    # 24 markdown headings
    (
        (
            "## Zaterdag\n"
            "### Mainstage\n"
            "- 13:00 - 14:00 Lil Texas\n"
            "- 14:00 - 15:00 Rebelion\n"
            "### Hardcore Stage\n"
            "- 13:00 - 14:00 Mind Dimension"
        ),
        [
            R("Lil Texas", "Mainstage", "Zaterdag", "13:00", "14:00"),
            R("Rebelion", "Mainstage", "Zaterdag", "14:00", "15:00"),
            R("Mind Dimension", "Hardcore Stage", "Zaterdag", "13:00", "14:00"),
        ],
        [],
    ),
    # 25 doors/marketing heavy
    (
        (
            "🚨 TIMETABLE 🚨\n"
            "Doors open 17:00\n"
            "Friday 25 April\n"
            "17:30 - 18:30 Vertile\n"
            "18:30 - 19:30 Bright Visions\n"
            "19:30 - 21:00 Miss K8\n"
            "Last entry 21:30\n"
            "Buy tickets: link in bio!\n"
            "Sponsored by Monster Energy"
        ),
        [
            R("Vertile", N, "Friday 25 April", "17:30", "18:30"),
            R("Bright Visions", N, "Friday 25 April", "18:30", "19:30"),
            R("Miss K8", N, "Friday 25 April", "19:30", "21:00"),
        ],
        [
            "🚨 TIMETABLE 🚨",
            "Doors open 17:00",
            "Last entry 21:30",
            "Buy tickets: link in bio!",
            "Sponsored by Monster Energy",
        ],
    ),
    # 26 CSV semicolon german header
    (
        (
            "Künstler;Bühne;Tag;Beginn;Ende\n"
            "Atmozfears;Rot;Samstag;18:00;19:00\n"
            "Crypsis;Blau;Samstag;18:30;19:30"
        ),
        [
            R("Atmozfears", "Rot", "Samstag", "18:00", "19:00"),
            R("Crypsis", "Blau", "Samstag", "18:30", "19:30"),
        ],
        [],
    ),
    # 27 labelled list
    (
        ("FRIDAY: Rooler, Sefa, Angerfist\nSATURDAY: Rebelion, Warface"),
        [
            R("Rooler", N, "FRIDAY"),
            R("Sefa", N, "FRIDAY"),
            R("Angerfist", N, "FRIDAY"),
            R("Rebelion", N, "SATURDAY"),
            R("Warface", N, "SATURDAY"),
        ],
        [],
    ),
    # 28 numbered list with hardcore names
    (
        (
            "Sat 12 July\n"
            "1. 20:00 Neophyte\n"
            "2. 21:00 Partyraiser\n"
            "3. 22:00 Drokz\n"
            "Share this with your crew!"
        ),
        [
            R("Neophyte", N, "Sat 12 July", "20:00"),
            R("Partyraiser", N, "Sat 12 July", "21:00"),
            R("Drokz", N, "Sat 12 July", "22:00"),
        ],
        ["Share this with your crew!"],
    ),
    # 29 stage colon heading + times
    (
        (
            "Stage: PURPLE\n"
            "20:00-21:00 Tha Playah\n"
            "21:00-22:00 Dither\n"
            "Stage: ORANGE\n"
            "20:00-21:00 Sickddk"
        ),
        [
            R("Tha Playah", "PURPLE", N, "20:00", "21:00"),
            R("Dither", "PURPLE", N, "21:00", "22:00"),
            R("Sickddk", "ORANGE", N, "20:00", "21:00"),
        ],
        [],
    ),
    # 30 time then dash name with times to
    (
        (
            "Saturday\n"
            "18:00 to 19:00 Zatox\n"
            "19:00 bis 20:00 Evil Activities\n"
            "20:00 until 21:00 Pavo\n"
            "Check the app for changes"
        ),
        [
            R("Zatox", N, "Saturday", "18:00", "19:00"),
            R("Evil Activities", N, "Saturday", "19:00", "20:00"),
            R("Pavo", N, "Saturday", "20:00", "21:00"),
        ],
        ["Check the app for changes"],
    ),
]


NEW_V0102 = [
    # new 01
    (
        (
            "Hangar\n"
            "Deadly Guns\n"
            "20:00 - 21:00\n"
            "Hangar\n"
            "Angerfist\n"
            "21:00 - 22:00\n"
            "Cave\n"
            "Drokz\n"
            "20:30 - 21:30"
        ),
        [
            R("Deadly Guns", "Hangar", N, "20:00", "21:00"),
            R("Angerfist", "Hangar", N, "21:00", "22:00"),
            R("Drokz", "Cave", N, "20:30", "21:30"),
        ],
        [],
    ),
    # new 02
    (
        (
            "Saturday\n"
            "Pyramid\n"
            "Sefa\n"
            "19:00 - 20:00\n"
            "Pyramid\n"
            "Rooler\n"
            "20:00 - 21:00\n"
            "Swamp\n"
            "Miss K8\n"
            "19:30 - 20:30\n"
            "Swipe for more ➡️"
        ),
        [
            R("Sefa", "Pyramid", "Saturday", "19:00", "20:00"),
            R("Rooler", "Pyramid", "Saturday", "20:00", "21:00"),
            R("Miss K8", "Swamp", "Saturday", "19:30", "20:30"),
        ],
        ["Swipe for more ➡️"],
    ),
    # new 03
    (
        (
            "Bunker\n"
            "Radical Redemption\n"
            "23:00–00:00\n"
            "Bunker\n"
            "E-Force\n"
            "00:00–01:00\n"
            "Jungle\n"
            "Atmozfears\n"
            "23:30–00:30\n"
            "Jungle\n"
            "Crypsis\n"
            "00:30–01:30"
        ),
        [
            R("Radical Redemption", "Bunker", N, "23:00", "00:00"),
            R("E-Force", "Bunker", N, "00:00", "01:00"),
            R("Atmozfears", "Jungle", N, "23:30", "00:30"),
            R("Crypsis", "Jungle", N, "00:30", "01:30"),
        ],
        [],
    ),
    # new 04
    (
        (
            "Frontliner\n"
            "22:00 - 23:00\n"
            "Kathedraal\n"
            "Brennan Heart\n"
            "23:00 - 00:00\n"
            "Kathedraal\n"
            "Ran-D\n"
            "21:00 - 22:30\n"
            "Warehouse"
        ),
        [
            R("Frontliner", "Kathedraal", N, "22:00", "23:00"),
            R("Brennan Heart", "Kathedraal", N, "23:00", "00:00"),
            R("Ran-D", "Warehouse", N, "21:00", "22:30"),
        ],
        [],
    ),
    # new 05
    (
        (
            "Zaterdag\n"
            "Coone\n"
            "14.00 - 15.00\n"
            "Vallei\n"
            "Hard Driver\n"
            "15.00 - 16.00\n"
            "Vallei\n"
            "Mind Dimension\n"
            "14.00 - 15.00\n"
            "Kelder\n"
            "Deel dit bericht met je vrienden"
        ),
        [
            R("Coone", "Vallei", "Zaterdag", "14:00", "15:00"),
            R("Hard Driver", "Vallei", "Zaterdag", "15:00", "16:00"),
            R("Mind Dimension", "Kelder", "Zaterdag", "14:00", "15:00"),
        ],
        ["Deel dit bericht met je vrienden"],
    ),
    # new 06
    (
        ("Sunday\nOPENING\nB-Front\nFrontliner\nFINALE\nHeadhunterz\nWildstylez"),
        [
            R("B-Front", "OPENING", "Sunday"),
            R("Frontliner", "OPENING", "Sunday"),
            R("Headhunterz", "FINALE", "Sunday"),
            R("Wildstylez", "FINALE", "Sunday"),
        ],
        [],
    ),
    # new 07
    (
        ("NIGHTSHIFT\nDr. Peacock\nSefa\nRooler\nSUNRISE\nCoone\nDa Tweekaz"),
        [
            R("Dr. Peacock", "NIGHTSHIFT"),
            R("Sefa", "NIGHTSHIFT"),
            R("Rooler", "NIGHTSHIFT"),
            R("Coone", "SUNRISE"),
            R("Da Tweekaz", "SUNRISE"),
        ],
        [],
    ),
    # new 08
    (
        ("Freitag\nKELLER\nPartyraiser\nDrokz\nDOME\nMiss K8\nAngerfist\nTickets: link in bio"),
        [
            R("Partyraiser", "KELLER", "Freitag"),
            R("Drokz", "KELLER", "Freitag"),
            R("Miss K8", "DOME", "Freitag"),
            R("Angerfist", "DOME", "Freitag"),
        ],
        ["Tickets: link in bio"],
    ),
    # new 09
    (
        ("Saturday\nTHE CAGE\nSickddk\nDeadly Guns\nHARDCORE GARDEN\nTha Playah\nNeophyte"),
        [
            R("Sickddk", "THE CAGE", "Saturday"),
            R("Deadly Guns", "THE CAGE", "Saturday"),
            R("Tha Playah", "HARDCORE GARDEN", "Saturday"),
            R("Neophyte", "HARDCORE GARDEN", "Saturday"),
        ],
        [],
    ),
    # new 10
    (
        (
            "Saturday\n"
            "Doors 12:00\n"
            "13:00 - 14:00 Sound Rush\n"
            "14:00 - 15:00 Atmozfears\n"
            "Last entry 18:00\n"
            "Lockers available at the entrance\n"
            "Cashless payment only"
        ),
        [
            R("Sound Rush", N, "Saturday", "13:00", "14:00"),
            R("Atmozfears", N, "Saturday", "14:00", "15:00"),
        ],
        [
            "Doors 12:00",
            "Last entry 18:00",
            "Lockers available at the entrance",
            "Cashless payment only",
        ],
    ),
    # new 11
    (
        (
            "Presented by\n"
            "Friday\n"
            "20:00 Warface\n"
            "21:00 Digital Punk\n"
            "Free entry before 14:00\n"
            "Shuttle from Central Station every 15 min\n"
            "Sponsored by Red Bull"
        ),
        [R("Warface", N, "Friday", "20:00"), R("Digital Punk", N, "Friday", "21:00")],
        [
            "Presented by",
            "Free entry before 14:00",
            "Shuttle from Central Station every 15 min",
            "Sponsored by Red Bull",
        ],
    ),
    # new 12
    (
        (
            "MAINSTAGE\n"
            "18:00-19:00 Rebelion\n"
            "19:00-20:00 Sub Zero Project\n"
            "Info & tickets\n"
            "Line-up subject to change\n"
            "18+ only, ID required"
        ),
        [
            R("Rebelion", "MAINSTAGE", N, "18:00", "19:00"),
            R("Sub Zero Project", "MAINSTAGE", N, "19:00", "20:00"),
        ],
        ["Info & tickets", "Line-up subject to change", "18+ only, ID required"],
    ),
    # new 13
    (
        (
            "Headhunterz 21:00-22:00\n"
            "Parking: P1 and P2, follow the signs\n"
            "Wildstylez 22:00-23:00\n"
            "Powered by Monster Energy"
        ),
        [R("Headhunterz", N, N, "21:00", "22:00"), R("Wildstylez", N, N, "22:00", "23:00")],
        ["Parking: P1 and P2, follow the signs", "Powered by Monster Energy"],
    ),
    # new 14
    (
        (
            "Samstag\n"
            "Einlass 14:00\n"
            "15:00 – 16:00 Atmozfears\n"
            "16:00 – 17:00 Crypsis\n"
            "Letzter Einlass 22:00\n"
            "Parkplatz kostenlos\n"
            "Präsentiert von Monster Energy\n"
            "Eintritt ab 18 Jahren"
        ),
        [
            R("Atmozfears", N, "Samstag", "15:00", "16:00"),
            R("Crypsis", N, "Samstag", "16:00", "17:00"),
        ],
        [
            "Einlass 14:00",
            "Letzter Einlass 22:00",
            "Parkplatz kostenlos",
            "Präsentiert von Monster Energy",
            "Eintritt ab 18 Jahren",
        ],
    ),
    # new 15
    (
        (
            "Türöffnung 13:00\n"
            "Bühne BLAU\n"
            "14:00 – 15:00 Mad Dog\n"
            "15:00 – 16:00 Dr. Peacock\n"
            "Garderobe & Schliessfächer vorhanden\n"
            "Shuttlebus ab Bahnhof"
        ),
        [R("Mad Dog", "BLAU", N, "14:00", "15:00"), R("Dr. Peacock", "BLAU", N, "15:00", "16:00")],
        ["Türöffnung 13:00", "Garderobe & Schliessfächer vorhanden", "Shuttlebus ab Bahnhof"],
    ),
    # new 16
    (
        (
            "Zondag\n"
            "Deuren open 12:00\n"
            "13.00 - 14.00 Da Tweekaz\n"
            "14.00 - 15.00 Phuture Noize\n"
            "Laatste toegang 20:00\n"
            "Parkeren alleen met parkeerticket\n"
            "Gratis entree tot 14:00"
        ),
        [
            R("Da Tweekaz", N, "Zondag", "13:00", "14:00"),
            R("Phuture Noize", N, "Zondag", "14:00", "15:00"),
        ],
        [
            "Deuren open 12:00",
            "Laatste toegang 20:00",
            "Parkeren alleen met parkeerticket",
            "Gratis entree tot 14:00",
        ],
    ),
    # new 17
    (
        (
            "HOOFDPODIUM\n"
            "20:00 Brennan Heart\n"
            "21:00 Coone\n"
            "Kluisjes beschikbaar\n"
            "Toegang vanaf 18 jaar\n"
            "Mogelijk gemaakt door Bavaria"
        ),
        [R("Brennan Heart", "HOOFDPODIUM", N, "20:00"), R("Coone", "HOOFDPODIUM", N, "21:00")],
        ["Kluisjes beschikbaar", "Toegang vanaf 18 jaar", "Mogelijk gemaakt door Bavaria"],
    ),
    # new 18
    (
        (
            "Samedi\n"
            "Ouverture des portes 16h00\n"
            "17h00 - 18h00 Rooler\n"
            "18h00 - 19h00 Sefa\n"
            "Dernière entrée 23h00\n"
            "Parking gratuit\n"
            "Billets en vente sur place"
        ),
        [R("Rooler", N, "Samedi", "17:00", "18:00"), R("Sefa", N, "Samedi", "18:00", "19:00")],
        [
            "Ouverture des portes 16h00",
            "Dernière entrée 23h00",
            "Parking gratuit",
            "Billets en vente sur place",
        ],
    ),
    # new 19
    (
        (
            "Scène ROUGE\n"
            "20h00 - 21h00 Angerfist\n"
            "21h00 - 22h00 Miss K8\n"
            "Présenté par Monster Energy\n"
            "Navette gratuite depuis la gare\n"
            "Vestiaire et consignes disponibles"
        ),
        [R("Angerfist", "ROUGE", N, "20:00", "21:00"), R("Miss K8", "ROUGE", N, "21:00", "22:00")],
        [
            "Présenté par Monster Energy",
            "Navette gratuite depuis la gare",
            "Vestiaire et consignes disponibles",
        ],
    ),
    # new 20
    (
        (
            "Arena\n"
            "Vertile\n"
            "17:30 - 18:30\n"
            "Arena\n"
            "Bright Visions\n"
            "18:30 - 19:30\n"
            "Loods\n"
            "Adrenalize\n"
            "17:30 - 18:30\n"
            "Last entry 21:30\n"
            "Cashless only"
        ),
        [
            R("Vertile", "Arena", N, "17:30", "18:30"),
            R("Bright Visions", "Arena", N, "18:30", "19:30"),
            R("Adrenalize", "Loods", N, "17:30", "18:30"),
        ],
        ["Last entry 21:30", "Cashless only"],
    ),
]


ALL = QA_V0102 + NEW_V0102


def test_corpus_sizes():
    assert len(QA_V0102) == 30
    assert len(NEW_V0102) == 20


@pytest.mark.parametrize(("text", "expected", "skipped"), ALL)
def test_qa_corpus(text, expected, skipped):
    res = tt.parse(text)
    assert _tuples(res) == expected
    assert res["skipped"] == skipped


@pytest.mark.parametrize(("text", "expected", "skipped"), ALL)
def test_qa_corpus_with_catalog_keeps_rows_and_skipped(text, expected, skipped):
    """A stage catalog may rename stages, but never adds or loses an artist or a skipped line."""
    res = tt.parse(text, STAGES, SET_TYPES)
    assert sorted(r[0] for r in _tuples(res)) == sorted(r[0] for r in expected)
    assert res["skipped"] == skipped


def test_info_lines_never_become_artists():
    for text in (
        "Last entry 21:30",
        "Free entry before 14:00",
        "Entrée gratuite avant 17h",
        "Parking info: see website",
        "Sponsored by Monster Energy",
        "Presented by",
        "Info & tickets",
        "Letzter Einlass 23:00",
        "Toegang vanaf 18 jaar",
        "Billets en vente sur place",
    ):
        res = tt.parse(f"Saturday\n18:00 Sefa\n{text}")
        assert [r["artist"] for r in res["rows"]] == ["Sefa"], text
        assert res["skipped"] == [text]


@pytest.mark.parametrize(
    "name", ["The Shuttle Crew", "Age Of Love", "Free Gatsby", "Parking Lot Pimps"]
)
def test_names_with_info_words_stay_artists(name):
    res = tt.parse(f"18:00 Sefa\n19:00 {name}")
    assert [r["artist"] for r in res["rows"]] == ["Sefa", name]


def test_card_stage_needs_a_repeating_layout():
    """A single card «Underground / Ran-D / 21:00» is not enough to call «Underground» a stage."""
    res = tt.parse("Underground\nRan-D\n21:00 - 22:00")
    assert _key(_tuples(res)) == _key([R("Underground"), R("Ran-D", N, N, "21:00", "22:00")])
