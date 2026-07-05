# Maestro Bootstrap Installers

## Architecture

Maestro installers are bootstrap-only entrypoints. They do not embed full Maestro runtime payloads.

Bootstrap flow:

1. Validate Otto CLI availability.
2. Trigger Otto splash/startup surface.
3. Run Otto self-update.
4. Run `otto maestro install` against `otto/maestro-payload.json`.
5. Otto resolves payload artifacts, installs dependencies, configures extensions, and records telemetry.

## Platform Entry Points

- Windows: `installer/windows/bootstrap.ps1`
- Linux: `installer/linux/bootstrap.sh`
- macOS: `installer/macos/bootstrap.sh`

## Lifecycle Hooks

- `installer/hooks/pre-install.sh`
- `installer/hooks/post-install.sh`
- `installer/hooks/pre-update.sh`
- `installer/hooks/post-update.sh`

These are invoked by Otto based on `otto/maestro-payload.json`.

## Dry Run

Use dry-run mode for local checks when Otto binary is unavailable:

- Linux/macOS:
  - `OTTO_DRY_RUN=1 installer/linux/bootstrap.sh`
  - `OTTO_DRY_RUN=1 installer/macos/bootstrap.sh`
- Windows PowerShell:
  - `$env:OTTO_DRY_RUN = "1"; ./installer/windows/bootstrap.ps1`

## Expected Runtime Commands

- `otto maestro install --payload otto/maestro-payload.json`
- `otto maestro update --payload otto/maestro-payload.json`
- `otto maestro repair --payload otto/maestro-payload.json`
- `otto maestro uninstall`
