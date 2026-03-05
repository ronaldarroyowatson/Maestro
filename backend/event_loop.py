# backend/event_loop.py
# ============================================================
# Maestro 2.0 Event Loop Holder (Drop‑in Replacement)
# ------------------------------------------------------------
# Responsibilities:
# - Provide a single global reference to the FastAPI event loop
# - Allow maestro_runner and ws_manager to schedule async work
# - Add debug tracing so we always know if the loop is set
# ============================================================

import time

# ------------------------------------------------------------
# Debug helper
# ------------------------------------------------------------
def debug(msg: str):
    print(f"[MAESTRO-LOOP][{time.strftime('%H:%M:%S')}] {msg}")


# ============================================================
# MAIN_LOOP: set once at FastAPI startup
# ============================================================

MAIN_LOOP = None


def set_loop(loop):
    """Explicit setter for MAIN_LOOP with debug tracing."""
    global MAIN_LOOP
    MAIN_LOOP = loop
    debug(f"MAIN_LOOP updated → {MAIN_LOOP}")


def get_loop():
    """Safe getter with debug tracing."""
    debug(f"MAIN_LOOP accessed → {MAIN_LOOP}")
    return MAIN_LOOP
