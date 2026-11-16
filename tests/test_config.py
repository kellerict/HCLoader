from pathlib import Path

import pytest

from app.core import config

ROOT = Path(__file__).resolve().parent.parent


def test_defaults_match_schema():
    s = config.defaults()
    assert s.general.start_view == "discover"
    assert s.filters.min_duration == 600
    assert "live set" in s.filters.include_keywords
    assert "fl studio" in s.filters.exclude_keywords
    assert [g.name for g in s.genres.items] == ["Uptempo", "Hardcore", "Hardstyle", "Unsortiert"]
    assert s.storage.path_template == "{genre}/{artist}/{year}/{date} - {title} [{id}]"
    assert s.throttle.sleep_interval == 30 and s.throttle.max_sleep_interval == 120
    assert s.network.po_token_port == 4416
    assert s.schedule.task_time == "03:00"
    assert s.appearance.pulse_bpm == 200


def test_app_home_env_override(tmp_path):
    assert config.app_home() == tmp_path / "home"
    assert config.config_path().name == "config.yaml"


def test_load_missing_file_gives_defaults(tmp_path):
    s, warnings = config.load_with_warnings(tmp_path / "nope.yaml")
    assert s == config.defaults() and warnings == []


def test_save_and_load_roundtrip(tmp_path):
    p = tmp_path / "c.yaml"
    s = config.defaults()
    s.search.results_count = 50
    s.filters.include_keywords = ["mix", "ärger"]
    config.save(s, p)
    loaded = config.load(p)
    assert loaded.search.results_count == 50
    assert loaded.filters.include_keywords == ["mix", "ärger"]
    assert loaded == s


def test_save_preserves_user_comments(tmp_path):
    p = tmp_path / "c.yaml"
    p.write_text("# mein Kommentar\nsearch:\n  # wichtig\n  results_count: 12\n", encoding="utf-8")
    s = config.load(p)
    assert s.search.results_count == 12
    s.search.results_count = 40
    config.save(s, p)
    text = p.read_text(encoding="utf-8")
    assert "# mein Kommentar" in text and "# wichtig" in text
    assert config.load(p).search.results_count == 40
    assert "throttle:" in text  # other sections added


def test_partial_file_uses_defaults(tmp_path):
    p = tmp_path / "c.yaml"
    p.write_text("throttle:\n  sleep_requests: 5\n", encoding="utf-8")
    s = config.load(p)
    assert s.throttle.sleep_requests == 5
    assert s.throttle.max_downloads_per_day == 25


def test_invalid_yaml_falls_back(tmp_path):
    p = tmp_path / "c.yaml"
    p.write_text("a: [unclosed\n  - : :", encoding="utf-8")
    s, warnings = config.load_with_warnings(p)
    assert s == config.defaults() and warnings


def test_invalid_value_falls_back_per_key(tmp_path):
    p = tmp_path / "c.yaml"
    p.write_text("search:\n  results_count: 999\nfilters:\n  min_duration: 60\n", encoding="utf-8")
    s, warnings = config.load_with_warnings(p)
    assert s.search.results_count == 30
    assert s.filters.min_duration == 60
    assert any("search.results_count" in w for w in warnings)


def test_non_mapping_yaml(tmp_path):
    p = tmp_path / "c.yaml"
    p.write_text("- just\n- a list\n", encoding="utf-8")
    s, warnings = config.load_with_warnings(p)
    assert s == config.defaults() and warnings


def test_validation_errors_german_with_keys():
    errs = config.validate_settings(
        {
            "search": {"results_count": 0},
            "filters": {"min_duration": -1, "upload_period": "2y"},
            "schedule": {"task_time": "25:00"},
            "throttle": {"sleep_interval": 100, "max_sleep_interval": 50},
            "network": {"po_token_port": 80},
            "storage": {"title_cleanup_patterns": ["(unclosed"], "max_path_length": 300},
        }
    )
    assert errs["search.results_count"] == "Muss mindestens 1 sein"
    assert "filters.min_duration" in errs
    assert "Erlaubte Werte" in errs["filters.upload_period"]
    assert "HH:MM" in errs["schedule.task_time"]
    assert "throttle.max_sleep_interval" in errs
    assert errs["network.po_token_port"] == "Muss mindestens 1024 sein"
    assert "storage.title_cleanup_patterns" in errs
    assert errs["storage.max_path_length"] == "Darf höchstens 259 sein"


def test_validate_ok_and_bad_types():
    assert config.validate_settings({}) == {}
    assert config.validate_settings(config.defaults_dict()) == {}
    errs = config.validate_settings({"search": {"results_count": "abc"}})
    assert errs["search.results_count"] == "Muss eine ganze Zahl sein"
    assert config.validate_settings("x")


def test_backoff_max_must_be_ge_initial():
    errs = config.validate_settings(
        {"throttle": {"backoff_initial_hours": 10, "backoff_max_hours": 5}}
    )
    assert "throttle.backoff_max_hours" in errs


def test_genre_validation():
    ok = config.defaults_dict()
    ok["genres"]["items"] = [g for g in ok["genres"]["items"] if g["name"] != "Unsortiert"]
    s, errs = config.parse_settings(ok)
    assert not errs and s.genres.items[-1].name == "Unsortiert"
    dup = config.defaults_dict()
    dup["genres"]["items"].append({"name": "hardcore", "color": "#112233"})
    assert "genres.items" in config.validate_settings(dup)
    bad = config.defaults_dict()
    bad["genres"]["items"][0]["color"] = "red"
    assert "genres.items.0.color" in config.validate_settings(bad)


def test_template_validation():
    assert "storage.path_template" in config.validate_settings(
        {"storage": {"path_template": "{foo}/{id}"}}
    )
    assert "storage.path_template" in config.validate_settings(
        {"storage": {"path_template": "{title}"}}
    )


def test_keywords_cleaned():
    s, _ = config.parse_settings({"filters": {"include_keywords": [" mix ", "", "set"]}})
    assert s.filters.include_keywords == ["mix", "set"]


def test_reset():
    s = config.defaults()
    s.search.results_count = 77
    s.throttle.sleep_requests = 9
    r = config.reset(s, "search")
    assert r.search.results_count == 30 and r.throttle.sleep_requests == 9
    assert config.reset(s) == config.defaults()
    with pytest.raises(KeyError):
        config.reset(s, "nope")


def test_expand_target_dir(monkeypatch, tmp_path):
    monkeypatch.setenv("USERPROFILE", str(tmp_path))
    p = config.expand_path(r"%USERPROFILE%\Music\HCLoader")
    assert p.parts[-2:] == ("Music", "HCLoader") and str(p).startswith(str(tmp_path))
    assert config.defaults().target_dir_path().name == "HCLoader"


def test_example_yaml_matches_model():
    example = ROOT / "config.example.yaml"
    assert config.load(example) == config.defaults()
    assert example.read_text(encoding="utf-8") == config.render_yaml(config.defaults())


def test_every_setting_has_comment():
    for sec, model in config.SECTION_MODELS.items():
        for key in model.model_fields:
            assert f"{sec}.{key}" in config.COMMENTS
