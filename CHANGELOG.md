# Changelog

## Unreleased

### Added

- Added Otto integration discovery and planning docs:
  - `docs/maestro-current-state.md`
  - `docs/maestro-otto-integration-plan.md`
- Added initial Otto payload and command contract files:
  - `otto/maestro-payload.json`
  - `otto/maestro-commands.json`
- Added installer architecture and cross-platform bootstrap scripts:
  - `installer/README.md`
  - `installer/linux/bootstrap.sh`
  - `installer/macos/bootstrap.sh`
  - `installer/windows/bootstrap.ps1`
  - `installer/hooks/pre-install.sh`
  - `installer/hooks/post-install.sh`
  - `installer/hooks/pre-update.sh`
  - `installer/hooks/post-update.sh`
- Added Maestro observability bridge for Otto logging/tracing/telemetry modules:
  - `features/conductor/services/otto-observability/index.ts`
  - `features/conductor/tests/otto-observability.test.ts`
- Added Otto UI integration artifacts:
  - `ui/nodes/maestro-node-graphs.json`
  - `ui/settings/maestro-ui-settings.json`
  - `ui/navigation/maestro-panels.json`
- Added GitHub Actions workflows for platform installer artifacts:
  - `.github/workflows/maestro-installers-windows.yml`
  - `.github/workflows/maestro-installers-linux.yml`
  - `.github/workflows/maestro-installers-macos.yml`
- Added operational docs:
  - `docs/maestro-otto-payload.md`
  - `docs/maestro-installation-via-otto.md`
  - `docs/maestro-telemetry-and-logging.md`
  - `docs/maestro-ui-and-node-graphs.md`
  - `docs/maestro-otto-live-test-report.md`

### Changed

- Rewrote `readme.md` for Otto-managed install, durable installer links, and production integration documentation.
- Extracted command service layer into standalone repo and rewired all Otto repos to use it.
