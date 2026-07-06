#!/usr/bin/env bash
set -euo pipefail

echo "[maestro][hook] pre-install: validating runtime prerequisites"
command -v node >/dev/null 2>&1 || { echo "node is required" >&2; exit 1; }

# Embedded installer mode provides an internal runtime; pnpm may not be present
# in installer PATH and is optional for this hook.
if ! command -v pnpm >/dev/null 2>&1; then
	echo "[maestro][hook] pnpm not found in current PATH; continuing in embedded mode"
fi
