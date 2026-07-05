#!/usr/bin/env bash
set -euo pipefail

echo "[maestro][hook] post-install: verifying build artifacts"
if [[ -d "dist" ]]; then
  echo "dist directory found"
else
  echo "dist directory not found in current working directory; Otto should validate artifact location" >&2
fi
