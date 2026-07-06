# Maestro Bootstrap Installers

## Architecture

Maestro installers are bootstrap-only entrypoints. They do not embed full Maestro runtime payloads.

Bootstrap flow:

1. Resolve embedded Otto binary at `/opt/maestro/otto/bin/otto`.
2. Load embedded Otto payload at `/opt/maestro/otto/payload.json`.
3. Run embedded Otto bootstrap/install sequence for Maestro payload.
4. Embedded Otto resolves payload artifacts, installs dependencies, configures extensions, and records telemetry.

## Platform Entry Points

- Windows: `installer/windows/bootstrap.ps1`
- Linux: `installer/linux/bootstrap.sh`
- macOS: `installer/macos/bootstrap.sh`

The packaged release installers are published as durable latest-release assets and wrap these bootstrap entry points.

- Windows: `maestro-installer-windows.exe`
- Linux: `maestro-installer-linux.sh`
- macOS: `maestro-installer-macos.pkg`

## Embedded Otto Core Layout

Install target layout:

`/opt/maestro/otto/`

- `bin/otto`
- `bin/command-service`
- `runtime/`
- `manifests/`
- `extensions/`
- `update/`
- `payload.json`

The embedded boot path intentionally avoids PATH lookups and external Otto dependencies.

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

## macOS Signing and Notarization

The macOS release workflow supports signing, notarization, and stapling when credentials are configured.

Required workflow environment variables (typically injected from GitHub Actions secrets):

- `MAESTRO_APPLE_DEVELOPER_ID_APPLICATION`
- `MAESTRO_APPLE_DEVELOPER_ID_INSTALLER`
- `MAESTRO_NOTARY_APPLE_ID`
- `MAESTRO_NOTARY_TEAM_ID`
- `MAESTRO_NOTARY_APP_PASSWORD`

Behavior:

- If signing secrets are present, the workflow signs Mach-O payload binaries and then signs the `.pkg`.
- If notarization secrets are present, the workflow submits the package for notarization, waits for completion, staples the ticket, and validates stapling.
- If secrets are not present, the workflow still builds an unsigned `.pkg` for internal testing.

## Expected Runtime Commands

- `otto maestro install --payload otto/maestro-payload.json`
- `otto maestro update --payload otto/maestro-payload.json`
- `otto maestro repair --payload otto/maestro-payload.json`
- `otto maestro uninstall`
