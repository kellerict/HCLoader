"""Process exit codes of the CLI modes (`--smoke`, `--headless --run-watchlist`)."""

EXIT_OK = 0
EXIT_FAILED = 1  # errors during the run (sources, downloads, unexpected error, local problem)
EXIT_BLOCKED = 2  # backoff (active at start or triggered during the run) / throttle refusal
EXIT_USAGE = 3  # wrong command line
EXIT_BUSY = 4  # another run holds the run or watchlist lock (GUI or headless)
