import logging

from app.core import logging_setup


def test_file_and_live_stream(tmp_path):
    got = []
    h = logging_setup.live_handler()
    h.add_listener(got.append)
    try:
        path = logging_setup.setup_logging("INFO", tmp_path / "logs")
        logging.getLogger("hc.test").info("Hallo %s", "Welt")
        logging.getLogger("hc.test").debug("hidden")
        for fh in logging.getLogger().handlers:
            fh.flush()
        assert "Hallo Welt" in path.read_text(encoding="utf-8")
        assert got[-1]["message"] == "Hallo Welt" and got[-1]["level"] == "INFO"
        assert all(e["message"] != "hidden" for e in got)
        assert h.backlog[-1]["message"] == "Hallo Welt"
        logging_setup.setup_logging("INFO", tmp_path / "logs")  # idempotent
        n = len([x for x in logging.getLogger().handlers if getattr(x, "_hcloader_file", False)])
        assert n == 1
    finally:
        h.remove_listener(got.append)
        for x in list(logging.getLogger().handlers):
            if getattr(x, "_hcloader_file", False):
                logging.getLogger().removeHandler(x)
                x.close()
        logging.getLogger().removeHandler(h)
