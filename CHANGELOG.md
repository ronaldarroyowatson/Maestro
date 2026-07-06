# Changelog

## Unreleased

## 0.1.9

### Added

- Added embedded Otto runtime launchers and runtime entrypoints:
  - `otto/bin/otto`
  - `otto/bin/command-service`
  - `otto/runtime/otto-bootstrap.mjs`
  - `otto/runtime/command-service-cli.mjs`
  - `otto/payload.json`
- Added dedicated package workflows:
  - `.github/workflows/maestro-packages-linux.yml` for `.deb` and `.rpm`
  - `.github/workflows/maestro-packages-windows-msi.yml` for `.msi`
- Added architecture and validation reports:
  - `docs/maestro-embedded-otto-diagnostic-report.md`
  - `docs/maestro-embedded-otto-final-report.md`

### Changed

- Reworked platform bootstrap scripts to use embedded Otto pathing and payloads only (no PATH-based Otto lookup).
- Updated installer workflows to embed Otto runtime components and publish durable `latest` release assets with idempotent GitHub CLI upload/create logic.
- Updated installer docs and durable URL docs to include MSI/DEB/RPM targets.

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
- Revalidated Maestro command-service contract against the standalone `Otto/otto-command-service` repo.
