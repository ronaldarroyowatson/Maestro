#!/usr/bin/env bash
set -euo pipefail

echo "[maestro][hook] pre-update: creating runtime checkpoint marker"
date -u +"%Y-%m-%dT%H:%M:%SZ" > .maestro-preupdate.timestamp
