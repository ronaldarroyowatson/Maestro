# Maestro Current State

## Repository Validation

The workspace root appears to be the active Maestro runtime repository based on:

- `package.json` package name `maestro` and active runtime scripts (`build`, `typecheck`, `test`)
- Feature-first runtime modules under `features/`
- Shared contracts under `src/shared`
- Integration and feature tests under `tests/` and `features/**/tests`
- Current minor release baseline is `0.6.0`.

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
- Post-Phase-A real-machine validation is now documented in `docs/local-ai-discovery-validation-report.md` and captured by `scripts/run-local-ai-discovery-validation.ts` (`npm run validate:ai-discovery-local`) with output snapshots in `docs/local-ai-discovery-validation.latest.json`.
- Phase B revalidation is now complete under the mandatory validation framework: Ollama runtime detection, executable detection, model detection, metadata extraction, registry dedupe/update checks, and runtime-model relationship checks now pass in both automated tests and real-machine validation.
- Discovery now emits first-class runtime and Ollama model Resource Nodes (`runtime:ollama`, `model:ollama:*`) and creates runtime->model plus runtime->endpoint relationships in graph output.
- Discovery remains graph-first and resource-node-first; remaining gaps are now concentrated in expansion scanners (Python environments, Docker workloads, agent frameworks, richer MCP runtime detection).
- Phase C is now completed for the registry objective in `features/local-ai-discovery/services/registry/index.ts`: deterministic CRUD/upsert behavior, search/filtering, categorization/tagging, health/status lifecycle APIs, stale-resource marking/removal, duplicate-relationship suppression, and inventory snapshots are implemented and validated.
- Phase C validation artifacts are documented in `docs/local-ai-discovery-phase-c-registry-validation.md` and `docs/local-ai-discovery-registry.md`, with supporting automated and real-machine validation evidence.
- Phase D is now completed for initial UI integration: `maestro.ai-discovery` is added as a contract-backed UI surface with route/panel definitions, AI discovery panel action/status contracts, and a runtime-backed `AiDiscoveryUiStateBuilder` in `features/local-ai-discovery/services/ui-integration/index.ts`.
- Phase D validation artifacts are documented in `docs/local-ai-discovery-phase-d-ui-validation.md` and `docs/local-ai-discovery-ui-integration.md`, including failure-mode and edge-case test coverage.
- Phase E is now completed for continuous discovery scheduling: `features/local-ai-discovery/services/continuous-discovery/index.ts` implements configurable interval scheduling, pause/resume controls, trigger-driven rescans, incremental diffing, throttled change-sets, and runtime snapshots.
- Phase E validation artifacts are documented in `docs/local-ai-discovery-phase-e-validation.md` and `docs/local-ai-discovery-continuous-discovery-policy.md`, with real-machine evidence in `docs/local-ai-discovery-continuous-validation.latest.json`.
- Phase F is now completed for Otto node graph foundation in repository scope: node graph contract metadata now includes canvas capabilities and typed ports, `features/node-graph/services/ui-integration/index.ts` provides runtime-backed graph UI state projection, and panel contract metadata is now defined in `ui/panels/maestro-node-graph-panel.json`.
- Phase F validation artifacts are documented in `docs/node-graph-phase-f-validation.md` and `docs/node-graph-foundation.md`.
- Phase G is now completed for node property inspector in repository scope: `features/node-graph/services/property-inspector/index.ts` now provides selected-node inspection, node-level validation, connection summaries, and live property update projection for graph snapshots.
- Phase G validation artifacts are documented in `docs/node-graph-phase-g-validation.md` and `docs/node-graph-property-inspector.md`.
- Phase H is now completed for Maestro + Otto integration in repository scope: `features/node-graph/services/maestro-otto-integration/index.ts` now builds registry-aware graph execution plans, validates graph-to-runtime readiness, maps node resource bindings to unified `ResourceNode` inventory, and executes runtime-backed workflow runs.
- Phase H validation artifacts are documented in `docs/node-graph-phase-h-validation.md` and `docs/node-graph-maestro-otto-integration.md`.
- Phase I is now completed for first end-to-end validation in repository scope: `features/node-graph/services/end-to-end-validation/index.ts` now validates discovery-to-registration-to-graph-runtime flow and produces a deterministic lifecycle execution trace with PASS/FAIL assertions.
- Phase I validation artifacts are documented in `docs/node-graph-phase-i-validation.md`, `docs/node-graph-phase-i-walkthrough.md`, and `docs/phase-i-end-to-end-validation.latest.json`.
- Phase J is now completed for future-state planning in repository scope: `docs/maestro-phase-j-future-vision.md` captures remote/distributed discovery and orchestration expansion goals while preserving unified Resource Node and graph-first constraints.
- Phase J validation artifact is documented in `docs/node-graph-phase-j-validation.md`.
- Phase K is now completed for remote discovery contract foundation: `features/local-ai-discovery/services/remote-discovery/index.ts` introduces deterministic target-based scanner orchestration with explicit failure reporting and unified resource normalization.
- Phase K validation artifacts are documented in `docs/local-ai-discovery-phase-k-validation.md` and `docs/local-ai-remote-discovery-foundation.md`.
- Phase L is now completed for Otto node engine adapter integration: `features/node-graph/services/otto-node-engine-integration/index.ts` introduces feature-flagged delegation (`enableOttoNodeEngine`) with graceful fallback to native Maestro services for graph persistence, execution, and discovery-driven graph generation.
- Phase L validation artifact is documented in `docs/node-graph-phase-l-validation.md`.
- Phase M is now completed for discovery-driven node generation: `features/node-graph/services/discovery-graph-sync/index.ts` now converts local discovery registry output into persisted node graphs through the Otto node-engine adapter boundary with deterministic duplicate suppression.
- Phase M validation artifacts are documented in `docs/node-graph-phase-m-validation.md` and `docs/node-graph-discovery-integration.md`.
- Phase N is now completed for Otto node-engine runtime client loading: `features/node-graph/services/otto-node-engine-client-loader/index.ts` introduces explicit module loading diagnostics and `MaestroOttoNodeEngineService.create(...)` bootstrapping with fallback-safe behavior when disabled or unavailable.
- Phase N validation artifacts are documented in `docs/node-graph-phase-n-validation.md` and `docs/node-graph-otto-client-loader.md`.
- Phase O is now completed for Otto orchestration composition: `features/node-graph/services/otto-node-engine-orchestrator/index.ts` provides a single entrypoint that composes client loading, fallback-safe service initialization, and discovery graph sync execution.
- Phase O validation artifacts are documented in `docs/node-graph-phase-o-validation.md` and `docs/node-graph-otto-orchestrator.md`.
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
