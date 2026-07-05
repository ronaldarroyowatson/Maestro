#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PAYLOAD_PATH="${ROOT_DIR}/otto/maestro-payload.json"
OTTO_BIN="${OTTO_BIN:-otto}"

run() {
  if [[ "${OTTO_DRY_RUN:-0}" == "1" ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

if [[ ! -f "${PAYLOAD_PATH}" ]]; then
  echo "Missing payload file: ${PAYLOAD_PATH}" >&2
  exit 1
fi

if [[ "${OTTO_DRY_RUN:-0}" != "1" ]] && ! command -v "${OTTO_BIN}" >/dev/null 2>&1; then
  echo "Otto CLI not found. Set OTTO_BIN or install Otto first." >&2
  exit 1
fi

run "${OTTO_BIN}" ui splash --product maestro
run "${OTTO_BIN}" self-update --channel stable
run "${OTTO_BIN}" maestro install --payload "${PAYLOAD_PATH}" --channel stable

echo "Maestro bootstrap install flow completed."
