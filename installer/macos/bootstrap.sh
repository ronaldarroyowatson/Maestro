#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OTTO_EMBEDDED_PAYLOAD="${ROOT_DIR}/otto/payload.json"
MAESTRO_PAYLOAD="${ROOT_DIR}/otto/maestro-payload.json"
OTTO_BIN="${ROOT_DIR}/otto/bin/otto"

run() {
  if [[ "${OTTO_DRY_RUN:-0}" == "1" ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

if [[ ! -f "${OTTO_EMBEDDED_PAYLOAD}" ]]; then
  echo "Missing embedded Otto payload file: ${OTTO_EMBEDDED_PAYLOAD}" >&2
  exit 1
fi

if [[ ! -f "${MAESTRO_PAYLOAD}" ]]; then
  echo "Missing Maestro payload file: ${MAESTRO_PAYLOAD}" >&2
  exit 1
fi

if [[ "${OTTO_DRY_RUN:-0}" != "1" ]] && [[ ! -x "${OTTO_BIN}" ]]; then
  echo "Embedded Otto binary is missing or not executable: ${OTTO_BIN}" >&2
  exit 1
fi

run "${OTTO_BIN}" --payload "${OTTO_EMBEDDED_PAYLOAD}" --maestro-payload "${MAESTRO_PAYLOAD}" --channel stable

echo "Maestro embedded Otto bootstrap flow completed."
