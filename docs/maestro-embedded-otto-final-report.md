# Maestro Embedded Otto Final Report

Date: 2026-07-05

## Summary of Fixes Applied

1. Added embedded Otto core structure to Maestro repo payload model (`otto/bin`, `otto/runtime`, `otto/payload.json`, manifests/extensions/update directories).
2. Rewrote platform bootstrap scripts to execute embedded Otto from repo-local path instead of PATH lookups.
3. Updated macOS installer workflow to:
   - build and embed `otto-update` and `otto-command-service` runtimes,
   - stage manifests into embedded Otto directory,
   - create `/Applications/Maestro.app` launcher bundle,
   - run postinstall bootstrap through embedded Otto.
4. Updated Linux and Windows installer workflows to embed Otto runtime/components.
5. Updated release upload logic to idempotent `gh release` flows where needed.

## Files Modified

- `installer/macos/bootstrap.sh`
- `installer/linux/bootstrap.sh`
- `installer/windows/bootstrap.ps1`
- `.github/workflows/maestro-installers-macos.yml`
- `.github/workflows/maestro-installers-linux.yml`
- `.github/workflows/maestro-installers-windows.yml`
- `readme.md`
- `installer/README.md`

## Files Created

- `otto/bin/otto`
- `otto/bin/command-service`
- `otto/runtime/otto-bootstrap.mjs`
- `otto/runtime/command-service-cli.mjs`
- `otto/payload.json`
- `otto/manifests/README.md`
- `otto/extensions/README.md`
- `otto/update/README.md`
- `docs/maestro-embedded-otto-diagnostic-report.md`
- `docs/maestro-embedded-otto-final-report.md`

## Installer Artifacts Targeted by Workflows

- macOS: `maestro-installer-macos.pkg` (+ `/Applications/Maestro.app` in package payload)
- Linux: `maestro-installer-linux.sh`
- Windows: `maestro-installer-windows.exe`

## Validation Log (Embedded Boot Path)

- Bootstrap scripts now resolve embedded Otto at `<install-root>/otto/bin/otto`.
- Bootstrap scripts now pass embedded Otto payload at `<install-root>/otto/payload.json`.
- PATH-based Otto detection logic removed from bootstrap flow.
- Installer workflows now embed runtime artifacts for `otto-update` and `otto-command-service`.

## Remaining External Preconditions

- macOS signing/notarization requires configured credentials in CI environment variables.
- Windows MSI and Linux DEB/RPM packaging are not yet emitted by current workflows and require dedicated packaging jobs.