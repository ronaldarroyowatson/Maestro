# Maestro Installation via Otto

## Overview

Maestro is installed and managed through Otto. Bootstrap installers launch embedded Otto and hand off lifecycle management to Otto using `otto/maestro-payload.json`.

## Prerequisites

- Node.js 22+ and npm tooling for local validation.
- Git for repository hydration in minimal installer mode.
- Python 3.11+ for optional OCR and extended pipelines.

## Install Paths

- Otto-managed Maestro runtime root: `{otto.dataDir}/maestro`
- Otto-managed Maestro config root: `{otto.configDir}/maestro`

## Install Methods

### Bootstrap Installer

- Linux: `installer/linux/bootstrap.sh`
- macOS: `installer/macos/bootstrap.sh`
- Windows: `installer/windows/bootstrap.ps1`
- Windows minimal manifest-driven installer: `installer/windows/minimal-installer.ps1`

### Durable Release Installers

- Windows: https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-windows.exe
- Windows (MSI): https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-windows.msi
- Linux: https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-linux.sh
- Linux (DEB): https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-linux.deb
- Linux (RPM): https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-linux.rpm
- macOS: https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-macos.pkg

Bootstrap entrypoints run embedded Otto with:

1. embedded Otto payload (`otto/payload.json`)
2. Maestro payload (`otto/maestro-payload.json`)
3. stable channel install/update semantics

### Direct Otto Commands

- Install: `otto maestro install --payload otto/maestro-payload.json`
- Update: `otto maestro update --payload otto/maestro-payload.json`
- Repair: `otto maestro repair --payload otto/maestro-payload.json`
- Uninstall: `otto maestro uninstall`

### Windows minimal installer commands

```powershell
# Validate and print the full repo/file/contract manifest
powershell -NoProfile -ExecutionPolicy Bypass -File .\installer\windows\minimal-installer.ps1 `
  -InstallRoot "$env:TEMP\maestro-otto-e2e" `
  -PrintManifest `
  -Mode Validate
```

```powershell
# Install or refresh the Otto + Maestro workspace set
powershell -NoProfile -ExecutionPolicy Bypass -File .\installer\windows\minimal-installer.ps1 `
  -InstallRoot "$env:TEMP\maestro-otto-e2e" `
  -Mode Install
```

```powershell
# Repair failed/corrupt local install state
powershell -NoProfile -ExecutionPolicy Bypass -File .\installer\windows\minimal-installer.ps1 `
  -InstallRoot "$env:TEMP\maestro-otto-e2e" `
  -Mode Repair
```

```powershell
# Tracer bullet: install/deploy integrity + UI entry-route readiness
npm run validate:otto-ui-contract
```

## Lifecycle Hooks

- Pre-install: `installer/hooks/pre-install.sh`
- Post-install: `installer/hooks/post-install.sh`
- Pre-update: `installer/hooks/pre-update.sh`
- Post-update: `installer/hooks/post-update.sh`

These hooks are declared in `otto/maestro-payload.json` and executed by Otto.

## Troubleshooting

- If install path is not writable (for example `C:\Program Files`), run elevated or choose a user-writable install root.
- Use `-TracePath` on `minimal-installer.ps1` to capture full transcript logs for failure triage.
- Use `-VerifySignatures` to report current Authenticode status for Windows bootstrap script.
- For non-invasive validation, set `OTTO_DRY_RUN=1` and run platform bootstrap scripts.
- Validate repository runtime health with:
  - `npm run typecheck`
  - `npm test`
- Validate install/deploy/UI contract readiness with:
  - `npm run validate:otto-ui-contract`
  - includes module registration contract checks (`otto/manifests/maestro-module-registration.json`)

## Otto ecosystem modules currently wired for backend bootstrap

Current install artifacts/manifest coverage includes:

- `otto-systems/otto-command-service`
- `otto-systems/otto-server`
- `otto-systems/otto-update`
- `otto-systems/otto-kernel`
- `otto-systems/otto-protocol`
- `otto-systems/otto-ui`
- `otto-systems/otto-extensions`
- `otto-extensions/otto-extension-index`
- `otto-extensions/otto-debug-extension`

Maestro-specific orchestration/runtime logic remains in this repository; shared backend concerns should preferentially evolve in Otto modules.
