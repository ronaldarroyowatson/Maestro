# Maestro ↔ Otto Ecosystem Capability Map

## Purpose

This document records the Otto-ecosystem-first backend mapping for Maestro so integration work reuses Otto modules before introducing Maestro-local backend modules.

## Scope scanned

- `otto-systems/*`
- `otto-extensions/*`
- `ronaldarroyowatson/otto-*`
- Maestro local contracts/docs for alignment context

## Core backend capability mapping

| Capability area | Primary Otto module(s) | Maestro integration surface | Ownership decision |
| --- | --- | --- | --- |
| Command contract + routing | `otto-systems/otto-command-service` (`@otto/command-service`) | command manifests, command validation bridge, install command invocation | Extend Otto module first |
| Runtime process orchestration | `otto-systems/otto-kernel` (`@otto/kernel`) | bootstrap/runtime lifecycle boundaries | Extend Otto module first |
| Service host / backend runtime shell | `otto-systems/otto-server` (`@otto/server`) | backend host wiring for Maestro runtime integration | Extend Otto module first |
| Update/repair/healing engine | `otto-systems/otto-update` (`@otto/update`) | install/update/repair lifecycle and self-heal behavior | Extend Otto module first |
| Protocol and schema contracts | `otto-systems/otto-protocol` (`@otto/protocol`) | payload/command contract compatibility | Extend Otto module first |
| UI shell integration | `otto-systems/otto-ui` (`@otto/ui`) | Maestro node graph/log/telemetry panels via contracts | Extend Otto module first |
| Extension loader/runtime | `otto-systems/otto-extensions` (`@otto/extensions`) | required logging/tracing/metrics modules | Extend Otto module first |
| Extension discovery/index | `otto-extensions/otto-extension-index` | module discovery/compatibility metadata | Extend Otto module first |
| Diagnostics/debugging support | `otto-extensions/otto-debug-extension` | runtime diagnostics and issue triage support | Extend Otto extension first |
| Auth/API/CLI/Data extension surfaces | `otto-extensions/otto-auth-extension`, `otto-extensions/otto-api-extension`, `otto-extensions/otto-cli-extension`, `otto-extensions/otto-data-extension` | optional feature integration points as Maestro requirements expand | Add as needed via Otto extension model |
| Edge profile/service/tls extension surfaces | `ronaldarroyowatson/otto-edge-profile-extension`, `ronaldarroyowatson/otto-edge-service-extension`, `ronaldarroyowatson/otto-tls-automation-extension` | optional deployment/runtime profiles for specialized environments | Add as needed via Otto extension model |

## Wiring now applied in Maestro

### Windows minimal installer manifest

`installer/windows/maestro-install-manifest.json` now includes core repo hydration entries for:

- Maestro
- Otto command-service, server, update, kernel, protocol, UI
- Otto extensions core
- Otto extension index
- Otto debug extension

### Maestro Otto payload

`otto/maestro-payload.json` now includes git artifact wiring for:

- `otto-server`
- `otto-kernel`
- `otto-ui`
- `otto-extensions-core`
- `otto-extension-index`
- existing `otto-protocol`, `otto-command-service`, and Maestro source/build artifacts

### Otto UI contract tracer bullet

- Contract artifact: `otto/manifests/maestro-ui-contract.json`
- Validation utility: `src/shared/utils/ottoUiContract.ts`
- End-to-end tracer command: `npm run validate:otto-ui-contract`

## Gap classification policy

When a backend capability is missing:

1. extend an existing Otto module when possible;
2. if reuse is broader than Maestro, create a new Otto ecosystem module;
3. keep logic in Maestro only if it is Maestro-specific orchestration behavior.

## Maestro-local only boundary (current)

Keep these in Maestro unless they become cross-product:

- feature orchestration semantics
- pipeline/domain models and business-specific execution flow
- Maestro-specific UI graph semantics and review logic

## Next wiring tasks

1. Validate `otto/maestro-payload.json` against live Otto install flows with the expanded artifact set.
2. Define contract-level integration tests that assert Otto module presence/compatibility for Maestro bootstrap.
3. Add adapter-level integration points where Maestro currently relies on local assumptions instead of Otto contracts.
