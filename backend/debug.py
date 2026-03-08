# =====================================================================
# backend/debug.py
# Simple, centralized debug logging utility for Maestro.
# =====================================================================

import datetime
import os

# DEBUG flag can be controlled via environment variable or left True for dev.
DEBUG = os.getenv("MAESTRO_DEBUG", "true").lower() == "true"


def log_debug(source: str, message: str) -> None:
    """
    Log a debug message with a timestamp and source tag.
    """
    if not DEBUG:
        return
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{source}] {message}")
