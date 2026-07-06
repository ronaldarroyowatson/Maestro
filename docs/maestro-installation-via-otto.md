# Maestro Installation via Otto

## Overview

Maestro is installed and managed through Otto. Bootstrap installers only launch Otto and hand off lifecycle management to Otto using `otto/maestro-payload.json`.

## Prerequisites

- Otto CLI installed and available in `PATH`.
- Node.js 22+ and pnpm 9+.
- Python 3.11+ for optional OCR and extended pipelines.

## Install Paths

- Otto-managed Maestro runtime root: `{otto.dataDir}/maestro`
- Otto-managed Maestro config root: `{otto.configDir}/maestro`

## Install Methods

### Bootstrap Installer

- Linux: `installer/linux/bootstrap.sh`
- macOS: `installer/macos/bootstrap.sh`
- Windows: `installer/windows/bootstrap.ps1`

### Durable Release Installers

- Windows: https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-windows.exe
- Windows (MSI): https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-windows.msi
- Linux: https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-linux.sh
- Linux (DEB): https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-linux.deb
- Linux (RPM): https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-linux.rpm
- macOS: https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-macos.pkg

Each bootstrap installer runs:

1. `otto ui splash --product maestro`
2. `otto self-update --channel stable`
3. `otto maestro install --payload otto/maestro-payload.json --channel stable`

### Direct Otto Commands

- Install: `otto maestro install --payload otto/maestro-payload.json`
- Update: `otto maestro update --payload otto/maestro-payload.json`
- Repair: `otto maestro repair --payload otto/maestro-payload.json`
- Uninstall: `otto maestro uninstall`

## Lifecycle Hooks

- Pre-install: `installer/hooks/pre-install.sh`
- Post-install: `installer/hooks/post-install.sh`
- Pre-update: `installer/hooks/pre-update.sh`
- Post-update: `installer/hooks/post-update.sh`

These hooks are declared in `otto/maestro-payload.json` and executed by Otto.

## Troubleshooting

- If Otto is not found, set `OTTO_BIN` to the Otto executable path.
- For non-invasive validation, set `OTTO_DRY_RUN=1` and run platform bootstrap scripts.
- Validate repository runtime health with:
  - `pnpm typecheck`
  - `pnpm test`
