# Maestro Otto Payload

## Purpose

`otto/maestro-payload.json` is the source of truth that Otto uses to determine what to download, install, configure, and observe for Maestro runtime lifecycle operations.

## How Otto Uses This Payload

1. Reads `schemaVersion`, `payloadId`, and `payloadVersion` for compatibility checks.
2. Verifies runtime requirements (`node`, `pnpm`, `python`).
3. Resolves and materializes `artifacts` in install order.
4. Ensures required Otto extension modules are available.
5. Applies default config/UI assets to Otto-managed config directories.
6. Registers command metadata from `otto/maestro-commands.json`.
7. Executes lifecycle hooks (`preInstall`, `postInstall`, `preUpdate`, `postUpdate`).
8. Emits and renders telemetry events listed in `telemetryEvents`.

## Components

- Runtime artifacts: source checkout and build output definition.
- Command-service artifact: explicit `otto-command-service` source checkout used during install.
- Config/settings: default node graph and UI settings paths.
- Extension dependencies: `logging.module`, `tracing.module`, and `metrics.module` (telemetry alias).
- UI assets: node graph, settings, and panel navigation metadata.
- Command manifest: install/update/repair/uninstall contract definitions.
- Lifecycle hooks: scripts run around install and update transitions.

## Versioning Rules

- `payloadVersion` should track Maestro release versions for stable channels.
- Backward compatible payload edits should only bump patch versions.
- Breaking payload structure changes require a schema version bump.
- Any command contract changes should update `otto/maestro-commands.json` and be noted in `CHANGELOG.md`.

## Add or Remove Components

1. Edit `otto/maestro-payload.json` in a single cohesive change.
2. Update command handlers or hooks if lifecycle semantics change.
3. Update docs:
   - `docs/maestro-otto-payload.md`
   - `docs/maestro-installation-via-otto.md`
4. Run local sanity checks:
   - `pnpm typecheck`
   - `pnpm test`
   - Installer dry-run commands in `installer/README.md`

## Notes

- External Otto command-service registration remains outside this repository.
- This payload file is designed to be consumed by Otto-managed installers and lifecycle tooling.
