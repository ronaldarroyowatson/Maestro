#!/usr/bin/env bash
set -euo pipefail

echo "[maestro][hook] pre-install: validating runtime prerequisites"
command -v node >/dev/null 2>&1 || { echo "node is required" >&2; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "pnpm is required" >&2; exit 1; }
