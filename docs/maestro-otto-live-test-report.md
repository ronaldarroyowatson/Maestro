# Maestro Otto Live Test Report

Date: 2026-07-05
Environment: macOS local development workspace

## Objective

Validate Otto-managed Maestro bootstrap flow and document full end-to-end expectations including splash, self-update, payload install, telemetry, and UI surfaces.

## Test Preconditions

- Maestro payload and installer scaffolding present.
- Otto component repos available locally for contract verification.
- Otto production binary and GUI runtime not provisioned in this workspace session.

## Executed Steps

1. Verified bootstrap scripts and payload files exist.
2. Verified extension module IDs and command envelope contracts against cloned Otto reference repos.
3. Executed bootstrap dry-run validations on Linux and macOS scripts:
	- `OTTO_DRY_RUN=1 installer/linux/bootstrap.sh`
	- `OTTO_DRY_RUN=1 installer/macos/bootstrap.sh`
4. Ran Maestro repository sanity checks after integration changes:
	- `pnpm typecheck`
	- `pnpm test`

## Direct Local Observations

- Bootstrap scripts resolve payload path and construct expected Otto command sequence.
- Payload declares required extension modules and telemetry event taxonomy.
- Maestro observability bridge forwards runtime events to logging/tracing/telemetry extension interfaces.
- Dry-run output showed expected sequence:
	- `otto ui splash --product maestro`
	- `otto self-update --channel stable`
	- `otto maestro install --payload .../otto/maestro-payload.json --channel stable`
- Typecheck passed.
- Test suite passed (`57` files, `116` tests).

## Blockers for Full Visual Validation in This Session

The following require a runnable Otto GUI/CLI distribution rather than repository source references:

- Otto splash screen rendering confirmation.
- Otto self-update live execution and restart behavior.
- Otto UI panels displaying live Maestro telemetry/log streams.

## Reproducible Full E2E Procedure

1. Install or build Otto CLI/UI distribution.
2. Run one bootstrap installer for the target platform.
3. Confirm splash appears.
4. Confirm self-update flow completes.
5. Confirm `otto maestro install` executes with `otto/maestro-payload.json`.
6. Confirm telemetry stream shows download/install lifecycle events.
7. Confirm Maestro navigation section appears with node graph/log/telemetry panels.

## Follow-up Tasks

- Execute the full GUI-backed E2E run on a machine with installable Otto binary.
- Capture screenshots for splash, install telemetry, node graph panel, and Maestro settings panel.
- Append screenshot evidence and exact Otto build/version IDs to this report.

---

## Windows Minimal Installer Live Test (2026-10-16)

Environment: Windows local development workspace

### Goal

Validate a Windows-first minimal installer flow that:

1. opens/prints the installation manifest listing all repos/files/contracts,
2. fetches and installs all declared repositories,
3. validates declared contract files,
4. detects failure modes and self-heals.

### Installer and Manifest Under Test

- `installer/windows/minimal-installer.ps1`
- `installer/windows/maestro-install-manifest.json`

### Commands Executed

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\installer\windows\minimal-installer.ps1 `
  -InstallRoot "$env:TEMP\maestro-otto-e2e" `
  -PrintManifest `
  -Mode Validate
```

```powershell
# Failure simulation 1: delete required contract file
Remove-Item -Force "$env:TEMP\maestro-otto-e2e\repos\maestro\otto\maestro-payload.json"
powershell -NoProfile -ExecutionPolicy Bypass -File .\installer\windows\minimal-installer.ps1 `
  -InstallRoot "$env:TEMP\maestro-otto-e2e" `
  -Mode Repair
```

```powershell
# Failure simulation 2: corrupt repo metadata
Remove-Item -Recurse -Force "$env:TEMP\maestro-otto-e2e\repos\otto-update\.git"
powershell -NoProfile -ExecutionPolicy Bypass -File .\installer\windows\minimal-installer.ps1 `
  -InstallRoot "$env:TEMP\maestro-otto-e2e" `
  -Mode Repair
```

### Observed Results

- Manifest was printed successfully and included:
  - all required repos for minimal Maestro/Otto setup,
  - required files per repo,
  - contract files and descriptions.
- Validate mode successfully cloned and verified all manifest repositories:
  - maestro
  - otto-command-service
  - otto-protocol
  - otto-update
  - otto-kernel
  - otto-ui
- Contract validation passed for:
  - `otto/maestro-payload.json`
  - `otto/maestro-commands.json`
  - payload and command schemas
- Self-heal behavior was confirmed:
  - deleted required file was restored during repair via git reset/update,
  - corrupted repository metadata (missing `.git`) triggered rebuild and fresh clone,
  - repair run completed with successful contract validation.

### Additional Failure/Trace Coverage (2026-10-16 Follow-up)

- **Manifest open verification:**
  - Ran installer with `-OpenManifest` and confirmed Notepad launched the manifest file path.
- **Permission failure (Program Files, non-elevated):**
  - Running install root under `C:\Program Files\Maestro-Otto-Live` failed as expected.
  - Installer now fails fast with explicit remediation guidance:
    - run elevated (Administrator), or
    - choose a user-writable path (for example under `%USERPROFILE%`).
- **Manifest integrity failure:**
  - Injected an invalid required file (`docs/DOES-NOT-EXIST.md`) into a temporary manifest.
  - Validate mode correctly failed with a clear missing-file error.
- **Transcript tracing:**
  - Installer supports `-TracePath` and writes a full PowerShell transcript for each run.
- **Signing trace:**
  - Installer supports `-VerifySignatures` and logs Authenticode status for the Windows bootstrap script.
  - Current local status observed: `NotSigned` (warning surfaced as expected, installation still succeeds in local development).

### Conclusion

Windows-first minimal installer flow is operational for repo hydration + contract validation + recovery from common local install failure modes, with traceable diagnostics for permissions, manifest integrity, and signature status.
