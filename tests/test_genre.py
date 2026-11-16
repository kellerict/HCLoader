from app.core import config
from app.core.genre import detect_genre, genre_color, genre_search_terms

G = config.defaults().genres.items


def test_keyword_priority_order():
    assert detect_genre("Hardcore and Uptempo mix", G) == "Uptempo"
    assert detect_genre("Frenchcore Mix", G) == "Hardcore"
    assert detect_genre("Rawstyle Liveset", G) == "Hardstyle"
    assert detect_genre("Terror Mix", G) == "Uptempo"
    assert detect_genre("Early Hardcore Set", G) == "Hardcore"


def test_fallback():
    assert detect_genre("Techno Mix", G) == "Unsortiert"
    assert detect_genre(None, G) == "Unsortiert"


def test_manual_beats_source_beats_keyword():
    assert detect_genre("Uptempo", G, manual="Hardstyle", source_default="Hardcore") == "Hardstyle"
    assert detect_genre("Uptempo", G, source_default="Hardcore") == "Hardcore"


def test_word_boundary_in_genre():
    assert detect_genre("Rawr party", G) == "Unsortiert"
    assert detect_genre("Rotterdam Terror Set", G) == "Uptempo"


def test_accepts_dicts_and_custom_priority():
    gs = [
        {"name": "A", "keywords": ["foo"], "priority": 2},
        {"name": "B", "keywords": ["foo"], "priority": 1},
        {"name": "Unsortiert", "keywords": [], "priority": 99},
    ]
    assert detect_genre("foo", gs) == "B"


def test_description_used():
    assert detect_genre("Mix", G, description="pure gabber") == "Hardcore"


def test_helpers():
    assert genre_color("Uptempo", G) == "#b6ff00"
    assert genre_color("??", G) == "#6b6b78"
    assert "gabber" in genre_search_terms("Hardcore", G)
    assert genre_search_terms("??", G) == []
