# Maestro Runtime

Maestro is a modular, deterministic runtime for agent orchestration, pipelines, provider adapters, and reviewer-driven execution control.

## Install Maestro via Otto

Maestro is installed and managed by Otto.

1. Install Otto from your Otto distribution channel.
2. Run one of the bootstrap installers in this repository, or install directly via Otto CLI.
3. Otto performs self-update, reads `otto/maestro-payload.json`, and installs/configures Maestro.

Primary lifecycle commands:

- `otto maestro install --payload otto/maestro-payload.json`
- `otto maestro update --payload otto/maestro-payload.json`
- `otto maestro repair --payload otto/maestro-payload.json`
- `otto maestro uninstall`

## Download Installers

These installers are published as durable latest-release assets. Otto completes runtime downloads and setup after launch.

- Windows: https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-windows.exe
- Linux: https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-linux.sh
- macOS: https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-macos.pkg

## Telemetry and Logs

Maestro integrates with Otto extension modules for:

- Logging (`logging.module`)
- Tracing (`tracing.module`)
- Telemetry (`metrics.module`)

Configured runtime paths (resolved by Otto):

- Logs: `{otto.dataDir}/logs/maestro`
- Traces: `{otto.dataDir}/traces/maestro`
- Telemetry: `{otto.dataDir}/telemetry/maestro`

## Installer and Payload Files

- Payload: `otto/maestro-payload.json`
- Command manifest: `otto/maestro-commands.json`
- Installer architecture: `installer/README.md`
- Linux bootstrap: `installer/linux/bootstrap.sh`
- macOS bootstrap: `installer/macos/bootstrap.sh`
- Windows bootstrap: `installer/windows/bootstrap.ps1`

## Documentation

- Current state: `docs/maestro-current-state.md`
- Integration plan: `docs/maestro-otto-integration-plan.md`
- Payload semantics: `docs/maestro-otto-payload.md`
- Installation guide: `docs/maestro-installation-via-otto.md`
- Telemetry and logging: `docs/maestro-telemetry-and-logging.md`
- UI and node graphs: `docs/maestro-ui-and-node-graphs.md`
- Live test report: `docs/maestro-otto-live-test-report.md`

## Development Validation

- `pnpm typecheck`
- `pnpm test`
- Installer dry-run instructions are in `installer/README.md`
