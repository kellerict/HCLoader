# ruff: noqa: E501
"""v0.3.0 festivals & series: migration, built-in sync, detection (table-driven), storage,
assign pass, grouping, paths, tags, bridge API and the end-to-end flow. No network."""

from __future__ import annotations

import shutil
import sqlite3
import threading
from pathlib import Path

import pytest
from mutagen.id3 import ID3
from test_api import env  # noqa: F401  (fixture)
from test_integration_queue import world  # noqa: F401  (fixture)
from test_tagging import make_mp3, needs_ffmpeg

from app.core import config, library, paths, series, sidecar, tagging
from app.core import db as dbmod
from app.core import festivals as fx
from app.core.config import Settings
from app.core.db import Database

UPLOAD = "20230630"


@pytest.fixture
def settings(tmp_path):
    s = Settings()
    s.storage.target_dir = str(tmp_path / "music")
    return s


@pytest.fixture
def cat(db, settings):
    return series.catalog(db, settings)


def add_video(db, vid, title, *, status="new", **kw):
    db.upsert_video(
        {
            "id": vid,
            "title": title,
            "channel_id": kw.pop("channel_id", "UC1"),
            "channel_name": kw.pop("channel_name", "Some Channel"),
            "upload_date": kw.pop("upload_date", UPLOAD),
            "status": status if status != "done" else "new",
            **kw,
        }
    )
    if status == "done":
        db.set_status(vid, "done", file_path=kw.get("file_path") or f"/x/{vid}.mp3")


# =========================================================================== migration


def test_migration_v7_adds_tables_and_columns_and_keeps_rows(tmp_path):
    path = tmp_path / "old.db"
    conn = sqlite3.connect(path, isolation_level=None)
    dbmod.migrate(conn, dbmod.MIGRATIONS[:6])
    conn.execute("INSERT INTO videos(id, title, status) VALUES ('abcdefghijk', 'Alt', 'done')")
    conn.close()
    with Database(path) as d:
        assert d.schema_version() == len(dbmod.MIGRATIONS) == 7
        row = d.get_video("abcdefghijk")
        assert row["title"] == "Alt" and row["edition_id"] is None
        assert row["festival_manual"] == 0 and row["stage"] is None
        cols = {r["name"] for r in d.query("PRAGMA table_info(series)")}
        assert {"key", "name", "kind", "aliases", "builtin", "enabled", "hidden"} <= cols
        cols = {r["name"] for r in d.query("PRAGMA table_info(editions)")}
        assert cols == {"id", "series_id", "year", "variant"}
    backups = list((tmp_path / "backups").glob("hcloader-premigrate-v6-to-v7-*.db"))
    assert len(backups) == 1  # automatic pre-migration backup


def test_kind_is_checked_and_editions_cascade(db):
    with pytest.raises(sqlite3.IntegrityError):
        db.execute("INSERT INTO series(key, name, kind) VALUES ('x', 'X', 'party')")
    db.execute("INSERT INTO series(key, name, kind) VALUES ('u-x', 'X', 'festival')")
    sid = db.query_one("SELECT id FROM series WHERE key='u-x'")["id"]
    eid = series.ensure_edition(db, sid, 2020, "")
    assert series.ensure_edition(db, sid, 2020, "") == eid  # unique per series/year/variant
    add_video(db, "abcdefghijk", "x")
    db.execute("UPDATE videos SET edition_id=? WHERE id='abcdefghijk'", (eid,))
    db.execute("DELETE FROM series WHERE id=?", (sid,))
    assert db.get_video("abcdefghijk")["edition_id"] is None  # ON DELETE SET NULL
    assert db.query("SELECT * FROM editions") == []


# =========================================================================== built-in data


def test_builtin_file_is_valid_and_unambiguous():
    data, digest = series.builtin_data()
    assert digest and data["version"] == 1
    items = data["series"]
    assert 25 <= len(items) <= 45
    keys = [s["key"] for s in items]
    assert len(keys) == len(set(keys)) and not any(k.startswith("u-") for k in keys)
    seen: dict[str, str] = {}
    for raw in items:
        d = fx.series_from(raw)
        assert d.kind in fx.KINDS and d.name
        for alias in (d.name, *d.aliases, *d.weak_aliases):
            n = fx.norm(alias)
            assert seen.setdefault(n, d.key) == d.key, f"alias {alias!r} twice"
    kinds = {fx.series_from(r).kind for r in items}
    assert kinds == {"festival", "radio", "podcast"}
    codes = [s["code"] for s in data["set_types"]]
    assert sorted(codes) == sorted(fx.SET_TYPES)
    assert sorted(codes) == sorted(config.SET_TYPE_CODES)
    stages = [s["name"] for s in data["stages"]]
    assert {"RED", "BLUE", "BLACK", "UV", "YELLOW", "INDIGO", "MAGENTA", "Mainstage"} <= set(stages)


def test_sync_inserts_once_and_never_overwrites_user_changes(db, settings, tmp_path):
    n = series.sync_builtin(db)
    assert n >= 25
    assert series.sync_builtin(db) == 0  # unchanged file: nothing to do
    rows = {r["key"]: r for r in db.query("SELECT * FROM series")}
    assert rows["defqon1"]["builtin"] == 1 and rows["defqon1"]["user_modified"] == 0

    # user edits a built-in (alias added) and hides another one
    dq = series.series_dict(rows["defqon1"])
    saved = series.save_series(db, settings, {**dq, "aliases": [*dq["aliases"], "Defcon One"]})
    assert saved["user_modified"] is True and "Defcon One" in saved["aliases"]
    series.delete_series(db, rows["qlimax"]["id"])
    # a new release of the data file renames both and adds a new series
    data, _ = series.builtin_data()
    text = series.DATA_FILE.read_text(encoding="utf-8")
    text = text.replace("name: Defqon.1\n", "name: Defqon.1 (new)\n")
    text = text.replace("name: Qlimax\n", "name: Qlimax (new)\n")
    text = text.replace(
        "\nseries:\n", "\nseries:\n  - {key: brand-new, name: Brand New Fest, kind: festival}\n", 1
    )
    newer = tmp_path / "series.yaml"
    newer.write_text(text, encoding="utf-8")
    assert series.sync_builtin(db, newer) >= 1
    rows = {r["key"]: r for r in db.query("SELECT * FROM series")}
    assert rows["defqon1"]["name"] == "Defqon.1"  # user-modified: untouched
    assert "Defcon One" in rows["defqon1"]["aliases"]
    assert rows["qlimax"]["hidden"] == 1 and rows["qlimax"]["name"] == "Qlimax"
    assert rows["brand-new"]["builtin"] == 1
    assert rows["reverze"]["name"] == "Reverze"
    # reset restores the shipped state (from the real file)
    restored = series.reset_series(db, rows["defqon1"]["id"])
    assert restored[0]["user_modified"] is False and "Defcon One" not in restored[0]["aliases"]
    series.reset_series(db)
    assert db.query_one("SELECT hidden FROM series WHERE key='qlimax'")["hidden"] == 0


def test_broken_data_file_does_not_break_start(db, tmp_path, caplog):
    bad = tmp_path / "series.yaml"
    bad.write_text("series: [unclosed\n", encoding="utf-8")
    assert series.sync_builtin(db, bad) == 0
    assert "series.yaml" in caplog.text


# =========================================================================== detection

# (title, series key | None, year, variant, stage, set_type, episode, assigned)
CASES = [
    ("Defqon.1 2019 | Headhunterz | RED", "defqon1", 2019, "", "RED", None, None, True),
    ("Qlimax 2013 - Live Registration", "qlimax", 2013, "", None, "full_show", None, True),
    ("Q-dance Radio #312", "q-dance-radio", 2023, "", None, "episode", 312, True),
    ("DOMINATOR 2024 - Maze of Martyr | Endshow", "dominator", 2024, "", None, "endshow", None, True),
    ("Defqon.1 anthem remake", "defqon1", 2023, "", None, "anthem", None, False),
    ("Defqon.1 Weekend Festival 2023 | Sub Zero Project | BLUE", "defqon1", 2023, "", "BLUE", None, None, True),
    ("Defqon.1 Australia 2019 | Brennan Heart | BLUE", "defqon1", 2019, "Australia", "BLUE", None, None, True),
    ("Defqon.1 Chile 2015 | Wildstylez", "defqon1", 2015, "Chile", None, None, None, True),
    ("Defqon.1 at Home 2020 | Ran-D", "defqon1", 2020, "at Home", None, None, None, True),
    ("DEFQON.1 '19 | Sub Zero Project", "defqon1", 2019, "", None, None, None, True),
    ("Defqon 1 2018 | Closing Ceremony", "defqon1", 2018, "", None, "closing_ceremony", None, True),
    ("DQ1 2022 | Warm-up mix", "defqon1", 2022, "", None, "warm_up", None, True),
    ("Defqon.1 2024 | BLACK | Warface", "defqon1", 2024, "", "BLACK", None, None, True),
    ("Defqon.1 2023 | UV | Dr. Peacock", "defqon1", 2023, "", "UV", None, None, True),
    ("Defqon.1 2022 | YELLOW | D-Block & S-te-Fan", "defqon1", 2022, "", "YELLOW", None, None, True),
    ("Defqon.1 2019 | INDIGO | Atmozfears", "defqon1", 2019, "", "INDIGO", None, None, True),
    ("Defqon.1 2019 | MAGENTA | Hard Driver", "defqon1", 2019, "", "MAGENTA", None, None, True),
    ("Defqon.1 2017 | Gold stage | Showtek", "defqon1", 2017, "", "GOLD", None, None, True),
    ("Defqon.1 2024 | Official Q-dance Anthem | Rejecta", "defqon1", 2024, "", None, "anthem", None, True),
    ("Defqon.1 2023 aftermovie", "defqon1", 2023, "", None, None, None, False),
    ("Defqon.1 2025 line-up announcement", "defqon1", 2025, "", None, None, None, False),
    ("Defqon.1 2019 tickets", "defqon1", 2019, "", None, None, None, False),
    ("Defqon.1 2k19 | Frontliner", "defqon1", 2019, "", None, None, None, True),
    ("Qlimax 2023 | Warm-up mix", "qlimax", 2023, "", None, "warm_up", None, True),
    ("QLIMAX 2019 - Endshow", "qlimax", 2019, "", None, "endshow", None, True),
    ("Qlimax 2016 | Brennan Heart - Live Set", "qlimax", 2016, "", None, "live_set", None, True),
    ("Qlimax 2011 - The Source Code Of Creation | Full Show", "qlimax", 2011, "", None, "full_show", None, True),
    ("X-Qlusive Headhunterz 2022 | Full Show", "x-qlusive", 2022, "", None, "full_show", None, True),
    ("Q-BASE 2019 | Warface", "q-base", 2019, "", None, None, None, True),
    ("QBASE 2018 - Hardcore warm up", "q-base", 2018, "", None, "warm_up", None, True),
    ("Qapital 2018 | Coone", "qapital", 2018, "", None, None, None, True),
    ("The Qontinent 2019 | Da Tweekaz", "the-qontinent", 2019, "", None, None, None, True),
    ("Decibel outdoor 2022 | Mainstage | Brennan Heart", "decibel-outdoor", 2022, "", "Mainstage", None, None, True),
    ("Decibel 2019 | Main stage | Coone", "decibel-outdoor", 2019, "", "Mainstage", None, None, True),
    ("Hard Bass 2020 | Team Blue", "hard-bass", 2020, "", None, None, None, True),
    ("Hard Bass mix 2020", "hard-bass", 2020, "", None, None, None, False),
    ("Russian hard bass mix 2021", "hard-bass", 2021, "", None, None, None, False),
    ("Reverze 2020 | Closing Ceremony", "reverze", 2020, "", None, "closing_ceremony", None, True),
    ("Supremacy 2019 | Warm up mix", "supremacy", 2019, "", None, "warm_up", None, True),
    ("Supremacy - Ascension of the chosen", "supremacy", 2023, "", None, None, None, False),
    ("Rebirth Festival 2019 | Sefa", "rebirth", 2019, "", None, None, None, True),
    ("REBiRTH 2018 | Noisecontrollers", "rebirth", 2018, "", None, None, None, True),
    ("Intents Festival 2023 | Liveset Sub Zero Project", "intents", 2023, "", None, "live_set", None, True),
    ("Hardshock 2019 | Angerfist", "hardshock", 2019, "", None, None, None, True),
    ("Loudness 2022 | Liveset", "loudness", 2022, "", None, "live_set", None, True),
    ("Snowtopia 2023 | Brennan Heart", "snowtopia", 2023, "", None, None, None, True),
    ("Free Festival 2019 | Zatox", "free-festival", 2019, "", None, None, None, True),
    ("Masters of Hardcore 2019 | Angerfist", "masters-of-hardcore", 2019, "", None, None, None, True),
    ("Masters of Hardcore 2023 - Closing Ceremony", "masters-of-hardcore", 2023, "", None, "closing_ceremony", None, True),
    ("Masters of Hardcore Podcast 199", "masters-of-hardcore-podcast", 2023, "", None, "episode", 199, True),
    ("MOH Podcast episode 210", "masters-of-hardcore-podcast", 2023, "", None, "episode", 210, True),
    ("Thunderdome 2019 | Warm up mix", "thunderdome", 2019, "", None, "warm_up", None, True),
    ("Thunderdome 2023 - Endshow", "thunderdome", 2023, "", None, "endshow", None, True),
    ("Thunderdome Radio #45", "thunderdome-radio", 2023, "", None, "episode", 45, True),
    ("Ground Zero Festival 2019 | Mainstage", "ground-zero", 2019, "", "Mainstage", None, None, True),
    ("Ground Zero hardcore mix", "ground-zero", 2023, "", None, None, None, False),
    ("Hardcore Italia 2018 | Live set", "hardcore-italia", 2018, "", None, "live_set", None, True),
    ("Army of Hardcore 2019 | Liveset Mad Dog", "army-of-hardcore", 2019, "", None, "live_set", None, True),
    ("Toxicator 2020 | Spitnoise", "toxicator", 2020, "", None, None, None, True),
    ("Hardstyle Mag Podcast | Episode 157", "hardstyle-mag-podcast", 2023, "", None, "episode", 157, True),
    ("WE R Hardstyle | December 2023", "we-r-hardstyle", 2023, "", None, None, None, True),
    ("Hard with Style episode 45", "hard-with-style", 2023, "", None, "episode", 45, True),
    ("Q-dance Radio | Episode 401", "q-dance-radio", 2023, "", None, "episode", 401, True),
    ("Bassleader 2020 | Coone", "bassleader", 2020, "", None, None, None, True),
    ("Wish Outdoor 2019 | Mainstage", "wish-outdoor", 2019, "", "Mainstage", None, None, True),
    ("Shockerz 2019 | Ran-D", "shockerz", 2019, "", None, None, None, True),
    ("Dominator 2019 - Riders of Retribution | Angerfist liveset", "dominator", 2019, "", None, "live_set", None, True),
    ("Syndicate Festival 2018 | Liveset", "syndicate", 2018, "", None, "live_set", None, True),
    ("Syndicate mix 2018", "syndicate", 2018, "", None, None, None, False),
    # no series at all (false positives must not happen)
    ("Partyraiser liveset 2020", None, None, "", None, None, None, False),
    ("Hardstyle mix 2024 | Best of Hardstyle", None, None, "", None, None, None, False),
    ("Angerfist - Raise Your Fist (Official Video)", None, None, "", None, None, None, False),
    ("Red Bull Hardcore Mix", None, None, "", None, None, None, False),
    ("Black Mirror Hardstyle Mix 2023", None, None, "", None, None, None, False),
]  # fmt: skip


def test_case_table_is_large_enough():
    assert len(CASES) >= 60


@pytest.mark.parametrize(
    ("title", "key", "year", "variant", "stage", "set_type", "episode", "assigned"), CASES
)
def test_detection(cat, title, key, year, variant, stage, set_type, episode, assigned):
    det = fx.detect(title, cat, upload_date=UPLOAD)
    if key is None:
        assert det is None
        return
    assert det is not None, title
    got = (det.series_key, det.year, det.variant, det.stage, det.set_type, det.episode)
    assert got == (key, year, variant, stage, set_type, episode), det.reasons
    assert (det.confidence >= 0.65) is assigned, (det.confidence, det.reasons)
    assert 0.0 <= det.confidence <= 1.0


def test_detection_year_sources(cat):
    det = fx.detect("Defqon.1 | Sub Zero Project", cat, upload_date="2024-06-30")
    assert det.year == 2024 and det.year_source == "upload" and det.confidence < 0.65
    det = fx.detect("Defqon.1 | Sub Zero Project", cat, upload_date=UPLOAD, year_from_upload=False)
    assert det.year is None and det.year_source is None and det.edition_name == "Defqon.1"
    det = fx.detect("Defqon.1 2019 | Sub Zero Project", cat, upload_date="20240630")
    assert det.year == 2019 and det.year_source == "title"  # the title wins
    det = fx.detect("Top 100 of 2019: Defqon.1 2018 classics", cat)
    assert det.year == 2018  # the year right after the name
    assert fx.detect("Defqon.1 3019 | x", cat, year_from_upload=False).year is None


def test_channel_boost_and_description(cat):
    plain = fx.detect("Defqon.1 | Sub Zero Project | RED", cat, upload_date=UPLOAD)
    boosted = fx.detect(
        "Defqon.1 | Sub Zero Project | RED", cat, upload_date=UPLOAD, channel_name="Q-dance"
    )
    assert boosted.confidence == round(plain.confidence + fx.W_CHANNEL, 2)
    assert "channel" in boosted.reasons
    det = fx.detect("Brennan Heart | RED", cat, description="Live at Defqon.1 2019, Biddinghuizen")
    assert det.series_key == "defqon1" and det.confidence < 0.65
    assert "alias:description" in det.reasons
    # weak aliases never count from a description
    assert fx.detect("Some set", cat, description="pure supremacy of sound") is None


def test_stage_needs_segment_or_caps(cat):
    assert fx.detect("Defqon.1 2019 | Headhunterz | red", cat).stage == "RED"  # own segment
    assert fx.detect("Defqon.1 2019 Headhunterz RED", cat).stage == "RED"  # caps word
    assert fx.detect("Defqon.1 2019 Blue Monday tribute", cat).stage is None
    assert fx.detect("DEFQON.1 2019 HEADHUNTERZ RED", cat).stage is None  # all caps title


def test_user_series_extra_stage_and_set_type(db, settings):
    settings.festivals.extra_stages = ["Pandemonium"]
    settings.festivals.extra_set_types = [
        config.SetTypeKeyword(keyword="afterburner", set_type="endshow")
    ]
    series.save_series(
        db, settings, {"name": "My Rave", "kind": "festival", "aliases": ["MyRave Fest"]}
    )
    cat = series.catalog(db, settings)
    det = fx.detect("MyRave Fest 2024 | Pandemonium | Afterburner", cat)
    assert (det.series_name, det.year, det.stage, det.set_type) == (
        "My Rave",
        2024,
        "Pandemonium",
        "endshow",
    )


def test_disabled_and_hidden_series_are_not_detected(db, settings):
    row = db.query_one("SELECT * FROM series WHERE key='qlimax'") or {}
    if not row:
        series.sync_builtin(db)
        row = db.query_one("SELECT * FROM series WHERE key='qlimax'")
    series.save_series(db, settings, {**series.series_dict(row), "enabled": False})
    assert fx.detect("Qlimax 2019", series.catalog(db, settings)) is None
    dom = db.query_one("SELECT id FROM series WHERE key='dominator'")["id"]
    series.delete_series(db, dom)
    assert fx.detect("Dominator 2019", series.catalog(db, settings)) is None


def test_norm_and_names():
    assert fx.norm("Défqon.1 – WEEKEND") == "defqon 1 weekend"
    assert fx.edition_name("Defqon.1", 2019, "Australia") == "Defqon.1 Australia 2019"
    assert fx.edition_name("Q-dance Radio", None) == "Q-dance Radio"
    assert fx.festival_label("Defqon.1", "Chile") == "Defqon.1 Chile"
    assert fx.find_episode("Q-dance Radio #312") == 312
    assert fx.find_episode("Show without number") is None


# =========================================================================== storage


def test_detect_and_store_threshold_suggestion_manual(db, settings):
    add_video(db, "aaaaaaaaaaa", "Defqon.1 2019 | Headhunterz | RED")
    add_video(db, "bbbbbbbbbbb", "Defqon.1 anthem remake")
    add_video(db, "ccccccccccc", "Partyraiser liveset 2020")
    counts = series.detect_and_store(db, settings, ["aaaaaaaaaaa", "bbbbbbbbbbb", "ccccccccccc"])
    assert counts["assigned"] == 1 and counts["suggested"] == 1 and counts["none"] == 1
    a = db.get_video("aaaaaaaaaaa")
    assert a["edition_id"] and a["stage"] == "RED" and a["festival_confidence"] == 0.9
    b = db.get_video("bbbbbbbbbbb")
    assert b["edition_id"] is None and b["suggested_edition_id"]
    eds = series.edition_map(db)
    assert eds[a["edition_id"]]["edition"] == "Defqon.1 2019"
    # a second run changes nothing
    again = series.detect_and_store(db, settings, ["aaaaaaaaaaa"])
    assert again["unchanged"] == 1
    # manual values are never overwritten
    series.set_manual(db, "aaaaaaaaaaa", {"series_id": eds[a["edition_id"]]["series_id"],
                                          "event_year": 2020, "stage": "BLUE"})  # fmt: skip
    assert series.detect_and_store(db, settings, ["aaaaaaaaaaa"])["manual"] == 1
    a = db.get_video("aaaaaaaaaaa")
    assert a["stage"] == "BLUE" and eds.get(a["edition_id"]) is None  # new edition 2020
    assert series.edition_map(db)[a["edition_id"]]["event_year"] == 2020
    # threshold from the settings
    settings.festivals.min_confidence = 0.3
    series.detect_and_store(db, settings, ["bbbbbbbbbbb"])
    assert db.get_video("bbbbbbbbbbb")["edition_id"] is None  # 0.2 < 0.3: still a suggestion
    settings.festivals.detect = False
    assert series.detect_and_store(db, settings, ["ccccccccccc"]) == {
        "assigned": 0, "suggested": 0, "none": 0, "manual": 0, "unchanged": 0
    }  # fmt: skip


def test_default_genre_only_for_unsorted_and_unlocked(db, settings):
    add_video(db, "aaaaaaaaaaa", "Masters of Hardcore 2019 | Angerfist", genre="Unsortiert")
    add_video(db, "bbbbbbbbbbb", "Masters of Hardcore 2018 | Angerfist", genre="Uptempo")
    add_video(db, "ccccccccccc", "Masters of Hardcore 2017 | Angerfist", status="done")
    series.detect_and_store(db, settings, ["aaaaaaaaaaa", "bbbbbbbbbbb", "ccccccccccc"])
    assert db.get_video("aaaaaaaaaaa")["genre"] == "Hardcore"
    assert db.get_video("bbbbbbbbbbb")["genre"] == "Uptempo"
    assert db.get_video("ccccccccccc")["genre"] in (None, "Unsortiert")  # done: genre locked


def test_set_manual_validation_and_reset(db, settings):
    add_video(db, "aaaaaaaaaaa", "Qlimax 2013 - Live Registration")
    with pytest.raises(series.SeriesError) as e:
        series.set_manual(db, "aaaaaaaaaaa", {"series_id": 99999, "set_type": "polka"})
    assert set(e.value.errors) == {"series_id", "set_type"}
    with pytest.raises(series.SeriesError) as e:
        series.set_manual(db, "aaaaaaaaaaa", {"edition_id": 4242})
    assert "edition_id" in e.value.errors
    with pytest.raises(series.SeriesError):
        series.set_manual(db, "zzzzzzzzzzz", None)
    series.set_manual(db, "aaaaaaaaaaa", None)  # «no festival», manual
    row = db.get_video("aaaaaaaaaaa")
    assert row["festival_manual"] == 1 and row["edition_id"] is None
    assert series.detect_and_store(db, settings, ["aaaaaaaaaaa"])["manual"] == 1
    assert series.reset_manual(db, settings, "aaaaaaaaaaa") == "assigned"
    row = db.get_video("aaaaaaaaaaa")
    assert row["festival_manual"] == 0 and row["set_type"] == "full_show"


def test_series_crud_validation(db, settings):
    with pytest.raises(series.SeriesError) as e:
        series.save_series(db, settings, {"name": "", "kind": "rave", "default_genre": "Polka"})
    assert set(e.value.errors) == {"name", "kind", "default_genre"}
    with pytest.raises(series.SeriesError) as e:
        series.save_series(db, settings, {"name": "Copycat", "aliases": ["Defqon 1"]})
    assert "Defqon.1" in e.value.errors["aliases"]
    s = series.save_series(
        db,
        settings,
        {
            "name": "Hardcore Radio X",
            "kind": "radio",
            "aliases": ["HRX", "hrx", " "],
            "variants": ["Summer", {"name": "Winter", "aliases": ["XMAS"]}],
            "default_genre": "Hardcore",
        },
    )
    assert s["key"] == "u-hardcore-radio-x" and s["aliases"] == ["HRX"] and not s["builtin"]
    assert s["variants"][1] == {"name": "Winter", "aliases": ["XMAS"]}
    same = series.save_series(db, settings, {"name": "Hardcore Radio X 2", "kind": "radio"})
    assert same["key"] == "u-hardcore-radio-x-2"
    add_video(db, "aaaaaaaaaaa", "HRX #12", status="done")
    series.detect_and_store(db, settings, ["aaaaaaaaaaa"])
    assert db.get_video("aaaaaaaaaaa")["episode"] == 12
    assert series.get_series(db, s["id"])["count"] == 1
    with pytest.raises(series.SeriesError):
        series.reset_series(db, s["id"])  # not a built-in
    res = series.delete_series(db, s["id"])
    assert res == {"hidden": False, "cleared": 1}
    assert series.get_series(db, s["id"]) is None
    assert db.get_video("aaaaaaaaaaa")["edition_id"] is None


# =========================================================================== assign pass + groups


def test_assign_pass_progress_cancel_and_groups(db, settings):
    titles = [
        "Defqon.1 2019 | Headhunterz | RED",
        "Defqon.1 2019 | Wildstylez | RED",
        "Defqon.1 2019 | Warface | BLACK",
        "Defqon.1 2023 | Sub Zero Project | BLUE",
        "Qlimax 2013 - Live Registration",
        "Q-dance Radio #312",
        "Defqon.1 anthem remake",
        "Partyraiser liveset 2020",
    ]
    for i, t in enumerate(titles):
        add_video(db, f"vid{i:08d}", t, status="done", channel_name=f"DJ {i % 2}")
    for i in range(30):
        add_video(db, f"new{i:08d}", "Qlimax 2010 | x")  # not in the library
    events = []
    res = series.assign_pass(db, settings, progress=events.append)
    assert res["total"] == res["done"] == 8 and res["assigned"] == 6 and res["suggested"] == 1
    assert res["none"] == 1 and not res["cancelled"]
    assert events[-1]["done"] == 8 and events[-1]["total"] == 8
    assert db.get_video("new00000000")["edition_id"] is None  # scope library only
    assert db.get_state(series.K_LAST_PASS)

    tree = series.festival_tree(db)
    assert tree["total"] == 8 and tree["unassigned"] == 2 and tree["suggested"] == 1
    top = tree["series"][0]
    assert top["name"] == "Defqon.1" and top["count"] == 4 and top["kind"] == "festival"
    assert [e["event_year"] for e in top["editions"]] == [2023, 2019]
    e2019 = top["editions"][1]
    assert e2019["edition"] == "Defqon.1 2019" and e2019["count"] == 3
    assert e2019["stages"] == [{"stage": "BLACK", "count": 1}, {"stage": "RED", "count": 2}]
    assert series.group_counts(db, "event_year")[0] == {"key": "2023", "count": 1 + 1}
    assert series.group_counts(db, "event_year")[-1]["key"] == ""
    assert series.group_counts(db, "artist")[0]["count"] == 4
    assert {g["key"] for g in series.group_counts(db, "stage")} == {"RED", "BLACK", "BLUE", ""}
    assert series.group_counts(db, "year") == [{"key": "2023", "count": 8}]
    with pytest.raises(ValueError):
        series.group_counts(db, "colour")
    st = series.status(db)
    assert st["assigned"] == 6 and st["unassigned"] == 2 and st["last_pass"]

    # scope all + cancel at once
    stop = threading.Event()
    stop.set()
    res = series.assign_pass(db, settings, scope="all", cancel=stop)
    assert res["cancelled"] and res["done"] == 0 and res["total"] == 38
    res = series.assign_pass(db, settings, scope="all")
    assert db.get_video("new00000000")["edition_id"] is not None


def test_library_items_carry_festival_and_filters(db, settings):
    add_video(db, "aaaaaaaaaaa", "Defqon.1 2019 | Headhunterz | RED", status="done")
    add_video(db, "bbbbbbbbbbb", "Defqon.1 anthem remake", status="done")
    add_video(db, "ccccccccccc", "Partyraiser liveset 2020", status="done")
    series.assign_pass(db, settings)
    items = {i["id"]: i for i in library.list_library(db)}
    fest = items["aaaaaaaaaaa"]["festival"]
    assert fest["series"] == "Defqon.1" and fest["event_year"] == 2019 and fest["stage"] == "RED"
    assert fest["edition"] == "Defqon.1 2019" and fest["manual"] is False
    assert items["aaaaaaaaaaa"]["festival_suggestion"] is None
    assert items["bbbbbbbbbbb"]["festival"] is None
    assert items["bbbbbbbbbbb"]["festival_suggestion"]["series"] == "Defqon.1"
    assert items["ccccccccccc"]["festival"] is None
    ids = lambda f: sorted(i["id"] for i in library.list_library(db, f))  # noqa: E731
    assert ids({"festival": "assigned"}) == ["aaaaaaaaaaa"]
    assert ids({"festival": "none"}) == ["bbbbbbbbbbb", "ccccccccccc"]
    assert ids({"festival": "suggested"}) == ["bbbbbbbbbbb"]
    assert ids({"series_id": fest["series_id"]}) == ["aaaaaaaaaaa"]
    assert ids({"event_year": 2019, "stage": "RED"}) == ["aaaaaaaaaaa"]
    assert ids({"stage": "BLUE"}) == []


# =========================================================================== paths


def test_path_placeholders_filled_and_empty(tmp_path):
    root = tmp_path / "m"
    tpl = "{genre}/{festival}/{event_year} - {stage}/{date} - {title} [{id}]"
    meta = {
        "id": "abcdefghijk",
        "title": "Headhunterz",
        "genre": "Hardstyle",
        "upload_date": "20190630",
        "festival": "Defqon.1",
        "event_year": "2019",
        "stage": "RED",
    }
    p = paths.build_target_path(root, tpl, meta)
    assert p.relative_to(root).parts == (
        "Hardstyle",
        "Defqon.1",
        "2019 - RED",
        "2019-06-30 - Headhunterz [abcdefghijk].mp3",
    )
    p = paths.build_target_path(root, tpl, {**meta, "stage": ""})
    assert p.relative_to(root).parts[2] == "2019"  # dangling " - " removed
    p = paths.build_target_path(root, tpl, {**meta, "festival": "", "event_year": "", "stage": ""})
    assert p.relative_to(root).parts == (
        "Hardstyle",
        "2019-06-30 - Headhunterz [abcdefghijk].mp3",
    )  # empty folder levels dropped
    p = paths.build_target_path(root, "{festival} {event_year} - {title} [{id}]", {**meta, "festival": "", "event_year": ""})  # fmt: skip
    assert p.name == "Headhunterz [abcdefghijk].mp3"
    p = paths.build_target_path(root, "({stage}) {title} [{id}]", {**meta, "stage": ""})
    assert p.name == "Headhunterz [abcdefghijk].mp3"
    # the default template is unchanged and ignores festival values
    default = config.defaults().storage.path_template
    assert default == "{genre}/{artist}/{year}/{date} - {title} [{id}]"
    p1 = paths.build_target_path(root, default, meta)
    p2 = paths.build_target_path(root, default, {k: v for k, v in meta.items() if k not in ("festival", "event_year", "stage")})  # fmt: skip
    assert p1 == p2


def test_template_validation_knows_new_placeholders():
    vals = config.defaults_dict()
    vals["storage"]["path_template"] = "{festival}/{event_year}/{stage}/{title} [{id}]"
    assert config.validate_settings(vals) == {}
    vals["storage"]["path_template"] = "{festivalx}/{title} [{id}]"
    assert "storage.path_template" in config.validate_settings(vals)


def test_festival_settings_validation():
    vals = config.defaults_dict()
    assert vals["festivals"]["min_confidence"] == 0.65 and vals["storage"]["album_from_edition"]
    vals["festivals"]["min_confidence"] = 0.1
    vals["festivals"]["extra_set_types"] = [{"keyword": "x", "set_type": "polka"}]
    errors = config.validate_settings(vals)
    assert "festivals.min_confidence" in errors
    assert any(k.startswith("festivals.extra_set_types") for k in errors)


# =========================================================================== tags


@needs_ffmpeg
def test_tag_frames_written_and_removed_on_retag(tmp_path):
    f = make_mp3(tmp_path / "a.mp3")
    meta = {
        "title": "T",
        "artist": "A",
        "album": "Defqon.1 2019",
        "festival": "Defqon.1",
        "event_year": "2019",
        "stage": "RED",
        "set_type": "Closing Ceremony",
        "episode": "",
        "id": "abcdefghijk",
    }
    tagging.write_tags(f, meta)
    tags = ID3(f)
    assert str(tags["TXXX:FESTIVAL"]) == "Defqon.1" and str(tags["TXXX:EVENT_YEAR"]) == "2019"
    assert str(tags["TXXX:STAGE"]) == "RED" and str(tags["TXXX:SET_TYPE"]) == "Closing Ceremony"
    assert "TXXX:EPISODE" not in tags and str(tags["TALB"]) == "Defqon.1 2019"
    from mutagen.id3 import TBPM

    tags.add(TBPM(encoding=3, text=["150"]))  # a foreign frame
    tags.save(f)
    tagging.write_tags(f, {"title": "T", "artist": "A", "id": "abcdefghijk"}, keep_existing=True)
    tags = ID3(f)
    assert "TXXX:FESTIVAL" not in tags and "TXXX:STAGE" not in tags
    assert str(tags["TBPM"]) == "150" and str(tags["TALB"]) == "T"


def test_apply_to_tags_album_switch(db, settings):
    add_video(db, "aaaaaaaaaaa", "Defqon.1 Australia 2019 | x | RED | Closing Ceremony")
    series.detect_and_store(db, settings, ["aaaaaaaaaaa"])
    fields = series.tag_fields(db, "aaaaaaaaaaa")
    assert fields == {
        "festival": "Defqon.1 Australia",
        "event_year": "2019",
        "stage": "RED",
        "set_type": "Closing Ceremony",
        "episode": "",
        "edition": "Defqon.1 Australia 2019",
    }
    meta = series.apply_to_tags({"album": "Title"}, fields, settings)
    assert meta["album"] == "Defqon.1 Australia 2019" and meta["festival"] == "Defqon.1 Australia"
    settings.storage.album_from_edition = False
    assert series.apply_to_tags({"album": "Title"}, fields, settings)["album"] == "Title"
    assert series.tag_fields(db, "zzzzzzzzzzz")["festival"] == ""


@needs_ffmpeg
def test_retag_writes_festival_frames_and_moves_with_template(tmp_path, db, settings):
    root = settings.target_dir_path()
    folder = root / "Unsortiert" / "Q-dance" / "2019"
    folder.mkdir(parents=True)
    f = make_mp3(folder / "old.mp3")
    vid = "abcdefghijk"
    add_video(db, vid, "Defqon.1 2019 | Headhunterz | RED", channel_name="Q-dance",
              status="done", file_path=str(f))  # fmt: skip
    sidecar.write(vid, sidecar.build({"id": vid, "title": "Defqon.1 2019 | Headhunterz | RED",
                                      "channel_name": "Q-dance", "upload_date": "20190630"},
                                     description="Defqon.1 Weekend Festival"))  # fmt: skip
    series.assign_pass(db, settings, description_of=lambda v: sidecar.read(v)["description"])
    settings.storage.path_template = "{festival}/{event_year}/{stage}/{title} [{id}]"
    res = library.retag(db, settings, vid)
    assert res["ok"] and res["moved"]
    new = Path(res["path"])
    assert new.relative_to(root).parts[:3] == ("Defqon.1", "2019", "RED")
    tags = ID3(new)
    assert str(tags["TXXX:FESTIVAL"]) == "Defqon.1" and str(tags["TALB"]) == "Defqon.1 2019"
    # manual «no festival» + retag: frames gone, album back to the title, festival folder gone
    series.set_manual(db, vid, None)
    res = library.retag(db, settings, vid)
    assert res["ok"]
    tags = ID3(res["path"])
    assert "TXXX:FESTIVAL" not in tags and str(tags["TALB"]) == "Defqon.1 2019 | Headhunterz | RED"
    assert Path(res["path"]).parent == root


# =========================================================================== bridge API


def test_api_series_and_festival_methods(env):  # noqa: F811
    a = env.make()
    db = a._db
    listed = a.get_series()
    assert len(listed) >= 25 and all(s["count"] == 0 for s in listed)
    opts = a.get_festival_options()
    assert opts["kinds"] == ["festival", "radio", "podcast"] and "RED" in opts["stages"]
    assert {"code": "closing_ceremony", "label": "Closing Ceremony"} in opts["set_types"]

    bad = a.save_series({"name": "", "kind": "festival"})
    assert bad["ok"] is False and "name" in bad["errors"]
    ok = a.save_series({"name": "My Rave", "kind": "festival", "aliases": ["MyRave"]})
    assert ok["ok"] and ok["series"]["key"] == "u-my-rave"

    add_video(db, "aaaaaaaaaaa", "Defqon.1 2019 | Headhunterz | RED", status="done")
    add_video(db, "bbbbbbbbbbb", "Partyraiser liveset", status="done")
    det = a.detect_festival("Defqon.1 2019 | Headhunterz | RED")
    assert det["assigned"] and det["detection"]["edition"] == "Defqon.1 2019"
    assert a.detect_festival("nothing here") == {"ok": True, "detection": None, "assigned": False}

    assert a.assign_festivals({"scope": "library"})["started"] in (True, False)
    a._worker.run("wait", lambda: None, timeout=10)  # FIFO: the pass has finished
    a._bus.flush()
    phases = [e["phase"] for e in env.window.events_of("festival_assign")]
    assert phases[0] == "start" and phases[-1] == "done"
    done = env.window.events_of("festival_assign")[-1]
    assert done["assigned"] == 1 and done["total"] == 2
    st = a.get_festival_status()
    assert st["assigned"] == 1 and st["running"] is False and st["last_pass"]

    groups = a.get_library_groups("festival")
    assert groups["ok"] and groups["series"][0]["name"] == "Defqon.1"
    assert a.get_library_groups("artist")["groups"]
    assert a.get_library_groups("colour")["ok"] is False

    dq = groups["series"][0]["id"]
    res = a.set_festival(
        "bbbbbbbbbbb", {"series_id": dq, "event_year": 2020, "set_type": "endshow"}
    )
    assert res["ok"] and res["festival"]["edition"] == "Defqon.1 2020" and res["festival"]["manual"]
    a._bus.flush()
    ev = [e for e in env.window.events_of("video") if e["id"] == "bbbbbbbbbbb"][-1]
    assert ev["festival"]["set_type"] == "endshow"
    assert a.set_festival("bbbbbbbbbbb", {"series_id": dq, "set_type": "x"})["ok"] is False
    res = a.reset_festival("bbbbbbbbbbb")
    assert res["ok"] and res["outcome"] == "none" and res["festival"] is None
    lib = {i["id"]: i for i in a.get_library()}
    assert lib["aaaaaaaaaaa"]["festival"]["stage"] == "RED"

    assert a.delete_series(dq) == {"ok": True, "hidden": True, "cleared": 1}
    assert all(s["id"] != dq for s in a.get_series())
    assert any(s["id"] == dq and s["hidden"] for s in a.get_series(True))
    assert a.reset_series(dq)["ok"] and any(s["id"] == dq for s in a.get_series())
    assert a.delete_series(424242)["ok"] is False
    assert a.cancel_assign_festivals()["ok"]


def test_api_assign_refused_while_other_maintenance_job(env):  # noqa: F811
    a = env.make()
    gate = threading.Event()
    a._worker.submit("backup", gate.wait, 5)
    try:
        res = a.assign_festivals()
        assert res["ok"] is False and res["error"]
    finally:
        gate.set()


# =========================================================================== end to end


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg fehlt")
def test_search_detect_download_tag_db(world):  # noqa: F811
    """Search (mocked yt-dlp) -> detection on the flat hits -> enqueue -> download -> tags with
    TXXX:FESTIVAL + album = edition -> DB status done with the edition."""
    w = world
    if True:
        res = w.api.search("hardcore", {"genre": "Hardcore", "year": None})
        assert res["ok"]
        by_id = {v["id"]: v for v in res["results"]}
        dom = by_id["prDominat08"]  # «Partyraiser @ Dominator 2024»
        assert dom["edition_id"] and dom["festival_confidence"] >= 0.65
        assert by_id["agDefqon109"]["edition_id"]  # «Angerfist @ Defqon.1 2025»
        assert by_id["hcLiveset01"]["edition_id"] is None
        assert w.api.enqueue(["prDominat08"])["ids"] == ["prDominat08"]
        w.api._queue.run_pending()
        row = w.db.get_video("prDominat08")
        assert row["status"] == "done" and row["edition_id"] == dom["edition_id"]
        tags = ID3(row["file_path"])
        assert str(tags["TXXX:FESTIVAL"]) == "Dominator"
        assert str(tags["TXXX:EVENT_YEAR"]) == "2024"
        assert str(tags["TALB"]) == "Dominator 2024"
        lib = {i["id"]: i for i in w.api.get_library()}
        assert lib["prDominat08"]["festival"]["edition"] == "Dominator 2024"
