#!/usr/bin/env bash
set -euo pipefail

log() {
  echo "[maestro][hook] $*"
}

ROOT_DIR="${OTTO_MAESTRO_ROOT:-$(pwd)}"
PAYLOAD_PATH="${MAESTRO_PAYLOAD_PATH:-${ROOT_DIR}/otto/maestro-payload.json}"

if [[ -n "${MAESTRO_RUNTIME_DIR:-}" ]]; then
  RUNTIME_DATA_DIR="${MAESTRO_RUNTIME_DIR}"
elif [[ -w "${ROOT_DIR}" ]]; then
  RUNTIME_DATA_DIR="${ROOT_DIR}/runtime-data"
else
  RUNTIME_DATA_DIR="${HOME}/.maestro-runtime"
fi

log "post-install: syncing payload artifacts"
log "root=${ROOT_DIR}"
log "payload=${PAYLOAD_PATH}"
log "runtime-data=${RUNTIME_DATA_DIR}"

mkdir -p "${RUNTIME_DATA_DIR}"

if [[ ! -f "${PAYLOAD_PATH}" ]]; then
  log "WARN: payload not found; skipping artifact sync"
  exit 0
fi

if ! command -v node >/dev/null 2>&1; then
  log "WARN: node not available; skipping artifact sync"
  exit 0
fi

if ! command -v git >/dev/null 2>&1; then
  log "WARN: git not available; skipping artifact sync"
  exit 0
fi

node -e '
  const fs = require("fs");
  const payloadPath = process.argv[1];
  const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
  for (const artifact of payload.artifacts || []) {
    if (artifact.type === "git") {
      process.stdout.write(`${artifact.id || "artifact"}|${artifact.uri || ""}|${artifact.ref || "main"}|${artifact.installPath || ""}\n`);
    }
  }
' "${PAYLOAD_PATH}" | while IFS='|' read -r id uri ref install_path; do
  [[ -z "${id}${uri}${install_path}" ]] && continue
  target_path="${install_path//\{otto.dataDir\}/${RUNTIME_DATA_DIR}}"

  if [[ -z "${uri}" || -z "${target_path}" ]]; then
    log "WARN: skipping malformed git artifact ${id}"
    continue
  fi

  mkdir -p "$(dirname "${target_path}")"

  if [[ -d "${target_path}/.git" ]]; then
    log "updating ${id} at ${target_path}"
    git -C "${target_path}" fetch --depth 1 origin "${ref}" || { log "WARN: fetch failed for ${id}"; continue; }
    git -C "${target_path}" checkout -f FETCH_HEAD || { log "WARN: checkout failed for ${id}"; continue; }
  else
    log "cloning ${id} from ${uri} to ${target_path}"
    git clone --depth 1 --branch "${ref}" "${uri}" "${target_path}" || { log "WARN: clone failed for ${id}"; continue; }
  fi
done

node -e '
  const fs = require("fs");
  const payloadPath = process.argv[1];
  const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
  for (const artifact of payload.artifacts || []) {
    if (artifact.type === "build") {
      process.stdout.write(`${artifact.id || "build"}|${artifact.buildCommand || ""}|${artifact.workingDirectory || ""}\n`);
    }
  }
' "${PAYLOAD_PATH}" | while IFS='|' read -r id build_cmd working_dir; do
  [[ -z "${id}${build_cmd}${working_dir}" ]] && continue
  resolved_workdir="${working_dir//\{otto.dataDir\}/${RUNTIME_DATA_DIR}}"

  if [[ -z "${build_cmd}" || -z "${resolved_workdir}" ]]; then
    log "WARN: skipping malformed build artifact ${id}"
    continue
  fi

  if [[ ! -d "${resolved_workdir}" ]]; then
    log "WARN: build workdir missing for ${id}: ${resolved_workdir}"
    continue
  fi

  if [[ -f "${resolved_workdir}/package.json" && -d "${RUNTIME_DATA_DIR}/otto-command-service" ]]; then
    node -e '
      const fs = require("fs");
      const pkgPath = process.argv[1];
      const cmdSvcPath = process.argv[2].replace(/\\/g, "/");
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (pkg.dependencies && typeof pkg.dependencies["@otto/command-service"] === "string" && pkg.dependencies["@otto/command-service"].startsWith("file:")) {
        pkg.dependencies["@otto/command-service"] = `file:${cmdSvcPath}`;
        fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
      }
    ' "${resolved_workdir}/package.json" "${RUNTIME_DATA_DIR}/otto-command-service"
  fi

  log "building ${id} in ${resolved_workdir}"
  if (cd "${resolved_workdir}" && bash -lc "${build_cmd}"); then
    continue
  fi

  if [[ "${build_cmd}" == *"--frozen-lockfile"* ]]; then
    fallback_cmd="${build_cmd/--frozen-lockfile/--no-frozen-lockfile}"
    log "WARN: retrying ${id} build without frozen lockfile"
    (cd "${resolved_workdir}" && bash -lc "${fallback_cmd}") || log "WARN: build failed for ${id}"
  else
    log "WARN: build failed for ${id}"
  fi
done

log "post-install: artifact sync completed"
