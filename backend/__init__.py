# backend/__init__.py
# ============================================================
# Maestro 2.0 Backend Package Init (Drop‑in Replacement)
# ------------------------------------------------------------
# Responsibilities:
# - Mark backend/ as a Python package
# - Provide a clean initialization point
# - Add a debug banner so we always know when the backend loads
# ============================================================

import time

def debug(msg: str):
    print(f"[MAESTRO-BACKEND][{time.strftime('%H:%M:%S')}] {msg}")

debug("Backend package initialized")
