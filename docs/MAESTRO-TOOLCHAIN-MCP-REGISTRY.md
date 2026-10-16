# Maestro Toolchain and MCP Registry

This registry captures the tool and service layer for the Maestro workspace so the setup can be mirrored faithfully on another machine.

## Core Toolchain

| Tool | Purpose | Notes |
| --- | --- | --- |
| Git | repository management and synchronization | required for all machine-to-machine continuity |
| GitHub CLI | repo and release operations | useful for release automation and PR tracking |
| Node.js | JavaScript/TypeScript runtime | required for the Maestro orchestration workspace |
| npm / pnpm | dependency install and scripts | use the repo's supported package manager |
| TypeScript | compile-time validation and typings | required to preserve the contract model |
| Rust | hot-path optimization and performance-sensitive modules | use only where justified by profiling |
| Shell / OS toolchain | installer and bootstrap validation | platform-specific requirements apply |

## MCP and Runtime Service Layer

| Service / Integration | Role | Responsibility |
| --- | --- | --- |
| Otto runtime | backbone execution layer | provides installer lifecycle and embedded runtime coordination |
| telemetry services | logging and metrics | should remain externally bridged and versioned |
| tracing services | execution diagnostics | must stay contract-driven and non-invasive |
| command service layer | runtime agent interaction | should remain clear and externally registered |
| provider adapters | external model or runtime connections | isolated behind explicit contracts |

## Workspace Rules

- record every newly added tool in this registry
- add any repo dependencies to the setup playbook
- keep runtime integrations contract-driven rather than hard-wired
- prefer local capability wrappers when the Otto ecosystem is incomplete

## Setup Change Log

Every environment change should be mirrored here with:

- the tool name or service
- why it is required
- where it is configured
- validation command used
- whether it is required for local development or deployment

This registry is part of the reproducibility contract for the project.
