"""Entry point for the Windows task scheduler: `pythonw.exe scripts\\run_watchlist.pyw`.

schtasks has no working-directory option. This wrapper puts the repo root on sys.path (and
makes it the working directory), then runs `app.main --headless --run-watchlist`.
Created and removed from the GUI (Einstellungen > Zeitplan), see app/core/scheduler.py.
"""

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

from app.main import main  # noqa: E402

sys.exit(main(["--headless", "--run-watchlist"]))
