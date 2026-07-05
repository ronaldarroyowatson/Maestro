#!/usr/bin/env bash
set -euo pipefail

echo "[maestro][hook] post-update: running smoke checks"
pnpm -s typecheck
