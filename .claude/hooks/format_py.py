"""PostToolUse-Hook: formatiert geänderte Python-Dateien mit ruff (still, Fehler ignoriert)."""

import json
import shutil
import subprocess
import sys

try:
    data = json.load(sys.stdin)
    path = (data.get("tool_input") or {}).get("file_path", "")
    if path.endswith(".py"):
        ruff = shutil.which("ruff") or ".venv/Scripts/ruff.exe"
        subprocess.run([ruff, "format", "--quiet", path], check=False, timeout=30)
except Exception:
    pass
sys.exit(0)
