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
- The first concrete Otto-first service implementation has been added in the `node-graph` feature: an in-memory `GraphService` that persists graph definitions, supports query/traversal, and matches the Otto-first graph contracts.
- The next concrete runtime service layer is now implemented: `features/workflow-runtime` includes a workflow lifecycle manager with pause/resume/cancel state transitions and a `StateCheckpointService` that persists snapshots, creates checkpoints, restores them, and supports rollback behavior.
- The next discovery/registry capability slice is implemented in `features/provider-registry`: a `CapabilityClassifier` and `ResourceRegistry` now normalize discovered provider capabilities into `CapabilityProfile` and `DiscoveryResourceRecord` structures, enabling resource classification and inventory tracking before the full Scout service is introduced.
- The next service advancement is health/performance-aware resource selection: the registry now tracks `ResourcePerformanceSnapshot` and `ResourceHealthRecord` values so orchestration can rank the best-capable, healthiest, and most economical resource before dispatch.
- The registry selection layer includes a `selectBestMatch()` heuristic that combines capability overlap, health status, success-rate quality, and cost to return the right resource candidate for a given request.
- The Provider Registry facade now integrates discovery with classification and selection, which means the registry stores discovered descriptors, classifies them, and can return the best-fit capability match directly from the high-level `ProviderRegistry` API.
- The routing policy layer is now implemented as a first-class service: `features/provider-registry/services/resource-selector/index.ts` adds a `ResourcePolicyRouter` that chooses the best resource for a capability request while honoring health, performance, and cost constraints.
- The next orchestration milestone is a workflow event bus: `features/workflow-runtime` now publishes lifecycle events (`workflow.created`, `workflow.state.changed`, `workflow.checkpointed`, and `workflow.cancelled`) through an in-memory event bus so runtime transitions are observable and decoupled from the state machine itself.
- The browser-facing UI is still not a runnable app in this repo: the current implementation is a contract-driven shell that Otto consumes, not a standalone React/Vite/Electron front-end. There is no local browser entry point to launch from this workspace yet.
- The next concrete Otto integration milestone is now formalized as a real module definition: Maestro now has a concrete module manifest under `otto/modules/maestro/manifest.json` plus validation logic in `src/shared/utils/ottoModuleDefinition.ts`. This closes the missing gap between the UI/registration contracts and an actual Otto module package definition.
- Phase A is implemented and validated in the codebase: `features/local-ai-discovery/index.ts` now provides the modular discovery framework, the normalized `DetectedResource` and `ResourceNode` contracts, and the scanner registry pattern for Ollama, local models, LM Studio, MCP config, local endpoints, and AI repository detection. This is the first real implementation slice for the Local AI Discovery initiative and forms the graph-first foundation for subsequent registry and UI phases.
- The discovery layer now enforces the unified `Everything is a Resource Node` principle: all discovered entities are normalized into a common node structure with `id`, `name`, `type`, `status`, `tags`, `metadata`, `relationships`, `discoveredBy`, `createdAt`, and `lastSeen`, then assembled into a relationship graph that is the graph source of truth rather than a sidecar list. This makes the discovery engine ready to feed the Otto graph ecosystem and future workflow execution natively.
- Phase B is now implemented as a concrete local AI environment harness: `features/local-ai-discovery/services/test-environment/index.ts` defines the local validation plan for Ollama, starter model candidates (`TinyLlama`, `Phi`, `Gemma`), runtime detection, install commands, and model metadata validation. The companion script `scripts/verify-local-ai-discovery-env.ts` makes the environment check runnable directly from the project and gives us a repeatable local dev/test setup for the next registry and UI phases.
- The command-service rule remains intact: the module manifest explicitly declares the external `otto-command-service` layer as the source of command exposure, while Maestro provides the contract package, runtime logic, and manifest bootstrap metadata that Otto consumes.
- Repository hygiene and public release readiness are now being standardized to the broader Otto ecosystem norm: canonical docs, a permissive MIT license, contribution/security policies, and a public GitHub visibility pass are being completed so the project is ready for broader adoption and open-source collaboration.
- Repository hygiene/public release readiness has been completed for the current phase: MIT licensing, canonical OSS docs, and public repository visibility are now in place.
- The upstream handoff contract phase is complete in-repo: `otto/modules/maestro/upstream-handoff.json` defines deterministic source-to-target sync mappings for `otto-command-service` and `otto-ui`, and `src/shared/utils/ottoUpstreamIntegrationContract.ts` validates mapping integrity and command-boundary consistency.
- External bridge execution is now automated and validated locally: `scripts/sync-otto-upstreams.ts` can check drift and apply sync mappings to sibling Otto repos, and a local apply+recheck run has completed successfully.
- Upstream publication + live verification is complete: `otto-systems/otto-command-service#1` and `otto-systems/otto-ui#1` are merged, and live default-branch parity is now machine-verified by `scripts/verify-otto-upstreams-live.ts`.
- The dedicated Maestro-to-Otto observability bridge is now implemented as a first-class adapter in `features/otto-observability-bridge/index.ts`, and conductor observability forwarding has been refactored to route through this shared bridge boundary.
- UI wiring parity milestone is now completed in Otto UI: Maestro module panels for workflow/runtime/registry/timeline/diagnostics are contract-backed and no longer rely on static placeholder panel stubs.
- Observability hardening parity milestone is completed: bridge diagnostics snapshots now capture forwarding/failure telemetry, and installer/runtime parity verification is automated through `scripts/verify-observability-bridge-diagnostics.ts` with emitted diagnostics artifacts.
- Active integration focus now shifts to richer runtime-backed UI data sources behind the contract-driven panel surfaces.
- Nightly checkpoint (2026-10-17): Maestro `main` is synced to GitHub, and the current upstream UI wiring work is tracked in `otto-systems/otto-ui#2` for merge review.

## Existing Otto Alignment

- Architecture docs already define Maestro as a runtime behind an external command service layer.
- `ARCHIVE.md` and integration checklist describe Otto-oriented architecture direction.
- Shared conductor event names provide a good baseline for telemetry/tracing adapters.

## Stubbed, Missing, or Incomplete for Production

- Otto payload specification exists, but should continue to be validated against the Otto workspace contracts.
- Platform bootstrap installers are present, and release workflows now package durable macOS, Linux, and Windows artifacts.
- Durable installer links are published in repository docs.
- The existing Maestro UI is still a tracer-bullet shell: it verifies Otto installation and runtime wiring, but it does not yet expose a complete set of product features.
- The current UI is intentionally contract-first rather than app-first: the repo presents UI metadata and manifests, not an actual browser app. There is currently no `dev`/`start` server or front-end entrypoint in this workspace to open a live interface from source.
- The next implementation phase is converting the shell into a real Maestro feature catalog: workflow builder, runtime status/runtime monitor, registry browser, execution timeline, and diagnostics pages are now the target set.
- The shell remains intentionally minimal while preserving compatibility with the established `runtime-status` route so Otto bootstrapping and runtime health checks continue to work during the product-layer expansion.
- The first real product-layer milestone has been reached: the feature roster is now represented in both a shared TypeScript catalog and a machine-readable Otto manifest under `otto/manifests/` so it can be validated as part of the UI contract lifecycle.
- Contract-driven Maestro panel binding is now in place in Otto UI for the registered feature surfaces; remaining work is runtime-depth hardening and richer live data sources behind those views.
- The next architectural milestone is the Otto-first service-contract core: event envelopes, shared graph definitions, graph service API contracts, event bus subscription contracts, workflow runtime state shapes, and checkpoint contracts are being formalized before the deeper runtime graph implementation begins.
- The current codebase has crossed from contract-layer work into the first concrete execution layer: graph persistence + traversal is now implemented in-memory and validated; the next service slice is the Workflow Runtime state machine and checkpoint manager.
- Dedicated Maestro-to-Otto extension bridge module now exists (`features/otto-observability-bridge`), but additional diagnostics and production hardening checks are still in progress.
- Dedicated Maestro-to-Otto extension bridge module exists and now includes diagnostics/parity verification; remaining work is production-depth data plumbing for richer live UI panel state.
- No end-to-end local Otto install runbook/report in this repo.

## Risks and Constraints

- Current `readme.md` content is partially archival and needs production-readiness sections for Otto integration.
- Cross-repo dependencies (Otto command service and Otto UI internals) are external; this repo can only define compatible manifests/contracts and bootstrap hooks.
