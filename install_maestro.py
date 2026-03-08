#!/usr/bin/env python
"""Minimal Maestro installer.

- Verifies Python version
- Installs required AutoGen version
- Installs backend dependencies
- Prints path to run_maestro.py
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

MIN_PYTHON = (3, 11)
AUTOGEN_VERSION = "0.6.0"


def ensure_python_version() -> None:
    if sys.version_info < MIN_PYTHON:
        major, minor = MIN_PYTHON
        current = f"{sys.version_info.major}.{sys.version_info.minor}"
        raise SystemExit(
            f"Python {major}.{minor}+ is required. Current version: {current}"
        )


def run(cmd: list[str]) -> None:
    print("[install]", " ".join(cmd))
    subprocess.check_call(cmd)


def main() -> int:
    ensure_python_version()

    root = Path(__file__).resolve().parent
    requirements_file = root / "backend" / "requirements.txt"
    run_entrypoint = root / "run_maestro.py"

    pip_cmd = [sys.executable, "-m", "pip"]

    run(pip_cmd + ["install", "--upgrade", "pip"])
    run(pip_cmd + ["install", f"pyautogen=={AUTOGEN_VERSION}"])

    if requirements_file.exists():
        run(pip_cmd + ["install", "-r", str(requirements_file)])
    else:
        print(f"[install] WARNING: requirements file not found: {requirements_file}")

    print("[install] Maestro installation complete.")
    print(f"[install] Run Maestro with: {run_entrypoint}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
