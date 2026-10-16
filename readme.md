# Maestro Runtime

Maestro is a modular runtime for agent orchestration, pipelines, provider adapters, and reviewer-driven execution control.

## Install Maestro via Otto

Maestro installers now embed a minimal Otto core and do not require a separate Otto installation.

1. Download and install Maestro using the platform installer.
2. Launch Maestro.
3. Embedded Otto boots from `/opt/maestro/otto/bin/otto`, loads `otto/payload.json`, and installs/configures Maestro runtime.

Primary lifecycle commands:

- `/opt/maestro/otto/bin/otto --payload /opt/maestro/otto/payload.json`
- `/opt/maestro/installer/macos/bootstrap.sh`

## Download Installers

These installers are published as durable latest-release assets. Otto completes runtime downloads and setup after launch.

- Windows: https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-windows.exe
- Windows (MSI): https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-windows.msi
- Linux: https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-linux.sh
- Linux (DEB): https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-linux.deb
- Linux (RPM): https://github.com/ronaldarroyowatson/Maestro/releases/latest/download/maestro-installer-linux.rpm
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

## Mirror-Ready Workspace Setup

This repository is designed to be reproduced across machines with a consistent setup flow. The mirrored environment should preserve:

- the Maestro repo and feature layout
- the Otto runtime backbone and embedded payload contracts
- the toolchain and validation commands
- any required MCP server integrations and local extension repos
- the recovery procedure needed for machine replacement

The full setup and recovery playbook lives at `docs/MAESTRO-SETUP-PLAYBOOK.md`.
The toolchain and MCP inventory lives at `docs/MAESTRO-TOOLCHAIN-MCP-REGISTRY.md`.

Core setup principles:

- treat Otto as the backbone runtime and extension platform
- keep Maestro feature modules modular and explicit
- use TypeScript as the default for orchestration and feature logic
- reserve Rust for measured hot paths only
- document every tool, repo, and configuration change so it can be replayed on another machine
