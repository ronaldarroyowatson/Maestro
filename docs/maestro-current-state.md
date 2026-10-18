# Maestro Current State

## Repository Validation

The workspace root appears to be the active Maestro runtime repository based on:

- `package.json` package name `maestro` and active runtime scripts (`build`, `typecheck`, `test`)
- Feature-first runtime modules under `features/`
- Shared contracts under `src/shared`
- Integration and feature tests under `tests/` and `features/**/tests`

## What Works Today

- Modular runtime feature stack is present and compiled as TypeScript.
- Conductor runtime can execute DAG pipelines with retry and event-bus emission.
- Node graph feature validates graph structure and computes topological order.
- Pipeline feature supports building, validating, storing, snapshotting, and descriptor import/export.
- Provider registry supports adapter-based inference and discovery.
- Reviewer/rules/context/prompt engines are present with explicit contracts.
- Test scaffolding and integration fixtures are present for runtime validation.
- The Otto-first contract core is now explicitly modeled in `src/shared/types/platform.ts` with event envelopes, graph-service contracts, workflow runtime states, checkpoint shapes, and the first pass of discovery/registry/context scaffolding.
- The product-shell UI contract has been upgraded from a tracer-bullet installation page into a feature catalog with real orchestration-focused page definitions and validation.

## Existing Otto Alignment

- Architecture docs already define Maestro as a runtime behind an external command service layer.
- `ARCHIVE.md` and integration checklist describe Otto-oriented architecture direction.
- Shared conductor event names provide a good baseline for telemetry/tracing adapters.

## Stubbed, Missing, or Incomplete for Production

- Otto payload specification exists, but should continue to be validated against the Otto workspace contracts.
- Platform bootstrap installers are present, and release workflows now package durable macOS, Linux, and Windows artifacts.
- Durable installer links are published in repository docs.
- The existing Maestro UI is still a tracer-bullet shell: it verifies Otto installation and runtime wiring, but it does not yet expose a complete set of product features.
- The next implementation phase is converting the shell into a real Maestro feature catalog: workflow builder, runtime status/runtime monitor, registry browser, execution timeline, and diagnostics pages are now the target set.
- The shell remains intentionally minimal while preserving compatibility with the established `runtime-status` route so Otto bootstrapping and runtime health checks continue to work during the product-layer expansion.
- The first real product-layer milestone has been reached: the feature roster is now represented in both a shared TypeScript catalog and a machine-readable Otto manifest under `otto/manifests/` so it can be validated as part of the UI contract lifecycle.
- The next architectural milestone is the Otto-first service-contract core: event envelopes, shared graph definitions, graph service API contracts, event bus subscription contracts, workflow runtime state shapes, and checkpoint contracts are being formalized before the deeper runtime graph implementation begins.
- No dedicated Maestro-to-Otto extension bridge module for logging/tracing/telemetry.
- No end-to-end local Otto install runbook/report in this repo.

## Risks and Constraints

- Current `readme.md` content is partially archival and needs production-readiness sections for Otto integration.
- Cross-repo dependencies (Otto command service and Otto UI internals) are external; this repo can only define compatible manifests/contracts and bootstrap hooks.
