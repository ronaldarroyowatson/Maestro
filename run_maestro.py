#!/usr/bin/env python
"""Unified Maestro entrypoint.

Starts the backend, waits until it is ready, then opens the dashboard.
"""

from __future__ import annotations

import subprocess
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path

BACKEND_URL = "http://127.0.0.1:8000/"
BACKEND_HOST = "127.0.0.1"
BACKEND_PORT = "8000"
READY_TIMEOUT_SECONDS = 30
POLL_INTERVAL_SECONDS = 0.5


def wait_for_backend(url: str, timeout_seconds: int) -> bool:
    """Poll backend URL until it responds with HTTP 200 or timeout."""
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status == 200:
                    return True
        except Exception:
            time.sleep(POLL_INTERVAL_SECONDS)
    return False


def build_dashboard_uri() -> str:
    """Return file:// URI for frontend dashboard."""
    dashboard_path = Path(__file__).resolve().parent / "frontend" / "index.html"
    return dashboard_path.as_uri()


def main() -> int:
    print("[Maestro] Starting backend...")
    cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "backend.main:app",
        "--host",
        BACKEND_HOST,
        "--port",
        BACKEND_PORT,
    ]

    backend_proc = subprocess.Popen(cmd)

    try:
        if not wait_for_backend(BACKEND_URL, READY_TIMEOUT_SECONDS):
            print("[Maestro] Backend did not become ready in time.")
            return 1

        dashboard_uri = build_dashboard_uri()
        print(f"[Maestro] Backend ready at {BACKEND_URL}")
        print(f"[Maestro] Opening dashboard: {dashboard_uri}")
        webbrowser.open(dashboard_uri)

        print("[Maestro] Running. Press Ctrl+C to stop.")
        return backend_proc.wait()

    except KeyboardInterrupt:
        print("\n[Maestro] Stopping...")
        return 0

    finally:
        if backend_proc.poll() is None:
            backend_proc.terminate()
            try:
                backend_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                backend_proc.kill()


if __name__ == "__main__":
    raise SystemExit(main())
