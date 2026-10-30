# Maestro Otto Integration Plan

> Architecture supersession note: the long-range source-of-truth architecture and phased execution strategy is now captured in [maestro-master-architecture-plan.md](./maestro-master-architecture-plan.md). This integration plan remains the operational tracker for ongoing incremental execution.

## Initial Plan (Pre-Implementation)

This section is intentionally added before major implementation changes.

1. Complete discovery output and confirm current runtime boundaries.
2. Add explicit Otto payload specification under `otto/` and document semantics.
3. Scaffold bootstrap installer architecture for Windows/Linux/macOS with lifecycle hook entrypoints.
4. Add command manifest contracts for `otto maestro install|update|repair|uninstall`.
5. Add Otto extension bridge module for logging/tracing/telemetry event forwarding.
6. Add Otto UI integration artifacts (node graph metadata and UI settings).
7. Add cross-platform installer GitHub Actions workflows and durable artifact naming.
8. Update top-level documentation (README + installation/logging/UI docs).
9. Add live local test report template and run sanity checks.
10. Record all integration changes in `CHANGELOG.md`.

## Integration Gaps

### Missing Installer Logic

- No bootstrap installer scripts currently exist for any platform.
- No lifecycle hook scripts for install/update phases.
- No repository-level installer architecture documentation.

### Missing Otto Payload Definition

- No `otto/maestro-payload.json` or equivalent payload contract.
- No declared runtime requirements, assets, extension dependencies, or lifecycle hooks in a machine-readable format.

### Missing Extension Wiring

- No Maestro-side adapter layer forwarding conductor/runtime events to Otto logging/tracing/telemetry extensions.
- No standardized event map for installer telemetry and runtime telemetry in this repo.

### Missing UI Integration

- ~~No Maestro node graph UI definition file for Otto UI consumption.~~
- ~~No Maestro-specific UI settings schema/defaults file for Otto UI persistence.~~
- Remaining: full Otto UI module registration consumption and live Maestro panel rendering from contract metadata.

### Missing Installer CI/CD

- Installer workflows exist for Windows, Linux, and macOS packaging and durable release publication.
- Durable `releases/latest/download/*` links are documented and aligned with release asset names.

## External Dependencies and Boundaries

- Otto command service registration remains external to this repo.
- Otto UI internals remain external to this repo.
- This repo will provide stable contracts, bootstrap scripts, payload metadata, and docs for clean Otto-side integration.

## Current Phase Status (2026-10-18)

## Execution Rule (Active)

- For ongoing implementation sessions, when instructed to "continue", update relevant project docs first, then proceed with the next implementation step unless explicitly overridden.

### Completed

1. Otto module manifest scaffold completed for Maestro: concrete module definition and bootstrap metadata now live under `otto/modules/maestro/manifest.json`, with validation in `src/shared/utils/ottoModuleDefinition.ts`.
2. Installer/bootstrap baseline with repair/healing and live validation.
2. Otto ecosystem-first artifact wiring for core backend modules.
3. Otto UI tracer-bullet validation path with explicit UI contract and entry route verification.
4. Observability baseline contracts (logging/tracing/metrics/debug + diagnostics path).
5. Maestro module registration contract + registration validation.
6. Otto UI contract-ingestion step completed: preload contract loading, dynamic route generation, and panel-level contract surfaces validated.
7. Otto-first service contract core expansion: shared event envelopes, graph-service contracts, workflow runtime state, checkpoint interfaces, and discovery/registry/context scaffolding defined in `src/shared/types/platform.ts`.
8. Maestro feature-catalog expansion and validation: product surfaces are now represented as a stable catalog/manifest pair and checked for contract consistency.
9. Contract refinement pass: discovery/resource lifecycle, context entities, and state snapshot primitives added to the shared Otto-first contract layer to support the eventual Graph Service and Workflow Runtime implementation.
10. First concrete graph service implementation completed in `features/node-graph/services/graph-service`: in-memory graph persistence, query, traversal, and contract validation are now passing in targeted tests.
11. First concrete workflow runtime state machine implemented in `features/workflow-runtime`: create/pause/resume/cancel lifecycle and checkpoint restore behavior are passing targeted tests.
12. First concrete state/checkpoint service implemented in `features/workflow-runtime/services/state-checkpoint`: workflow snapshot persistence, checkpoint creation, restore, and rollback behavior are now passing targeted tests.
13. First concrete discovery/classification slice implemented in `features/provider-registry/services/capability-classifier`: provider capability normalization, capability profiles, and resource registry upserts are now passing targeted tests.
14. Health/performance-aware policy routing is now implemented in `features/provider-registry/services/resource-selector`: the registry can select the best resource for a capability request across health, cost, and performance thresholds.
15. Workflow runtime event publication is now implemented in `features/workflow-runtime/services/event-bus`: lifecycle transitions are pub/sub observable and decoupled from state updates, with targeted tests validating the event envelope flow.
16. Otto upstream handoff contract is now implemented and validated: `otto/modules/maestro/upstream-handoff.json` plus `src/shared/utils/ottoUpstreamIntegrationContract.ts` provide deterministic mapping from local Maestro manifests into external `otto-command-service` and `otto-ui` target paths.
17. External bridge execution automation is now implemented and exercised locally: `scripts/sync-otto-upstreams.ts` performs drift detection + apply sync for the handoff mappings and has been run successfully against sibling `otto-command-service` and `otto-ui` repositories.
18. Upstream publication + live verification completed: `otto-systems/otto-command-service#1` and `otto-systems/otto-ui#1` are merged, and `scripts/verify-otto-upstreams-live.ts` confirms that upstream `main` content matches Maestro handoff sources for all mapped artifacts.
19. Maestro-to-Otto observability bridge adapter completed: `features/otto-observability-bridge/index.ts` now provides a deterministic event-envelope forwarder (logging/tracing/telemetry) and conductor observability now routes through this adapter boundary.
20. Otto UI Maestro surfaces are now contract-wired beyond placeholder bindings: panel rendering for workflow/runtime/registry/timeline/diagnostics uses contract/bootstrap/module metadata via `maestroPanelBindingService` and `MaestroModulePage` rather than static panel stubs.
21. Observability hardening diagnostics parity completed: bridge diagnostics snapshots and installer/runtime parity verification are now implemented in `features/otto-observability-bridge/index.ts` and `scripts/verify-observability-bridge-diagnostics.ts`, with artifact output under `dist/diagnostics/observability-bridge-diagnostics.json`.
22. Post-Phase-A local discovery validation completed on a real machine with Ollama installed: `scripts/run-local-ai-discovery-validation.ts` + `docs/local-ai-discovery-validation-report.md` now capture scanner/registry/graph evidence and confirm next-gap priorities (runtime/model normalization and runtime->model edge completeness).
23. Phase B validation hardening completed: Ollama runtime/model scanners now emit runtime and model Resource Nodes, repeated scans remain deduped, runtime->model relationships are created, and local validation output follows concise PASS/FAIL standards with evidence in `docs/local-ai-discovery-validation.latest.json`.
24. Phase C registry hardening completed: local discovery `ResourceRegistry` now includes deterministic upsert semantics, search/filtering, categorization/tagging, status+health lifecycle APIs, stale-resource marking/removal, inventory snapshots, and duplicate relationship suppression with targeted tests and validation artifacts.
25. Phase D initial UI integration completed: `maestro.ai-discovery` is now a contract-backed surface across feature catalog, UI contract, panel navigation/settings, module registration, and panel spec assets, with runtime-backed state projection from discovery resources and dedicated validation tests.

### In Progress

- Active phase: deepen product-surface integration from contract-driven UI panels to richer runtime-backed data sources.
- Current execution step: replace remaining static panel data in Otto UI bindings with runtime snapshots/events from Maestro services where safe adapter boundaries already exist.
- Nightly checkpoint (2026-10-17): Maestro repository is synced on `main`; upstream UI contract-wiring publication remains active in `otto-systems/otto-ui#2`.
- Backbone feature implementation phase in Maestro.
- Phase 1 contract core refinement: finalize service boundary contracts for discovery, state checkpointing, capability classification, and resource lifecycle metadata before introducing the first functional Otto graph service.
- Active execution objective: introduce explicit Workflow Runtime adapter contracts for run lifecycle, state transitions, checkpointing, and pause/resume/cancel operations, then wire the shared types into the public index and validate with TypeScript checks.
- Status update: the Graph Service slice is complete in-memory and validated; Workflow Runtime service logic is now implemented in `features/workflow-runtime` and is the current active execution focus for the next orchestration milestone.
- Completed this cycle: event-bus publish semantics, graph traversal contracts, graph persistence/versioning adapters, capability classification primitives, health/performance snapshots, and context/resource metadata contracts were added to the shared Otto-first platform layer.
- First backbone slice started in `features/conductor`: deterministic runtime options for run ID/time and reproducible execution checks.
- Otto UI bootstrap diagnostics surfaced in Maestro panel with degraded-stage badges for local service failure visibility.
- Conductor observability runtime trace wiring and deterministic event-trace integration coverage implemented with passing integration tests.
- Conductor observability payload contracts now include runtime/deployment metadata for environment-aware diagnostics.
- Second backbone slice implemented in `features/provider-registry`: deterministic provider-health snapshot contract with failure isolation and preferred-provider selection.
- Conductor-to-provider-registry routing integration test implemented using preferred-provider health snapshot selection with fallback recovery coverage.
- Workflow diagnostics artifact verification is implemented in Windows installer workflow (targeted tests + diagnostics artifact generation/upload).
- Conductor-provider orchestration policy hardening is implemented (latency/status constrained preferred-provider selection and fallback recovery coverage).
- Additional hardening implemented: weighted latency/cost provider selection, transient outage recovery via last-known healthy snapshots with max-age constraints, budget/circuit-breaker policy controls (`blockedProviderIds`, `budgetRemaining`, `reserveBudget`) with fallback recovery coverage, deterministic cooldown/decay-window policy controls (`cooldownUntilByProviderId`, `evaluationTime`), and cross-run governance state handoff scaffolding.
- Additional governance trace hardening implemented: fallback/error permutation metadata assertions and workflow-level governance trace contract checks in diagnostics verification.
- Additional governance trace hardening implemented: early pipeline-failure metadata continuity coverage with seeded governance metadata in failure telemetry, plus failure telemetry contract assertions for runtime context (`environment`, `deploymentChannel`, `hostOs`) and failure identifiers (`runId`, `pipelineId`).
- Additional governance trace hardening implemented: cycle-validation failure telemetry coverage with governance-metadata continuity assertions and workflow-level diagnostics checks.
- Additional governance trace hardening implemented: runtime service/node-failure telemetry coverage with governance metadata continuity assertions on `maestro.node.failed` payloads.
- Additional governance trace hardening implemented: retry-exhaustion + mixed-outcome runtime telemetry coverage with `retriesExhausted` and continuity-metadata assertions.
- Additional governance trace hardening implemented: multi-failure layer telemetry coverage with deterministic `maestro.node.failed` cardinality and continuity-metadata assertions.
- Additional governance trace hardening implemented: fallback-cascade failure telemetry coverage when preferred-provider resolution fails and fallback provider execution fails.
- Additional governance trace hardening implemented: governance policy-state drift telemetry coverage across repeated failure runs with deterministic budget-sequence assertions.
- Additional governance trace hardening implemented: cooldown/blocked-state transition telemetry coverage under repeated failure pressure with deterministic transition-shape assertions.
- Additional governance trace hardening implemented: mixed governance mutation telemetry coverage for `reserveBudget` interactions with cooldown/blocked transitions and deterministic budget-preservation assertions under reserve pressure.
- Additional governance trace hardening implemented: cross-run mixed-mutation telemetry coverage with consistent fallback warning assertions across cooldown/blocked/budget-reserve permutations.
- Otto UI startup hardening implemented in local `otto-ui`: preload bridge compatibility fix (`preload.cjs`) plus renderer-readiness startup gating before Electron `loadURL` to avoid blank-shell launches.
- Additional governance trace hardening implemented: deterministic warning-shape coverage across resolver-error vs resolver-unavailable fallback permutations (integration + diagnostics verifier).
- Current execution focus: resumed with governance telemetry expansion and validation sweep after the resolver warning-shape hardening checkpoint.
- Active objective: convert the existing tracer-bullet Otto UI shell into a feature-oriented Maestro runtime surface with real product pages and a stable runtime feature catalog while preserving compatibility with the existing runtime-status entry point.
- This phase explicitly moves beyond installation smoke validation and into a first real feature set: workflow-builder, runtime-status/runtime-monitor, registry-browser, execution-timeline, and diagnostics status pages.
- Product-layer milestone: the feature catalog is now represented as both a shared TypeScript helper and a machine-readable Otto manifest so the shell is no longer just a smoke test contract.
- Architecture transition milestone: the next execution phase begins with the Otto-first service contract core — event envelopes, graph service contracts, event bus subscription contracts, and workflow runtime state definitions are now being formalized before feature implementation begins.

### Next Step

1. Expand telemetry assertions for remaining governance mutation combinations not yet represented in workflow diagnostics artifacts.
2. Preserve the existing runtime-status entry point while expanding the product-facing feature catalog aligned with the Maestro architecture model.
3. Promote the feature catalog to a machine-readable manifest contract under `otto/manifests/` and validate it against the UI contract.
4. Formalize the cross-service platform contract core (`event envelope`, `graph definition`, `runtime state`, and `checkpoint` interfaces) as shared types for the Otto-first architecture layer.
5. Extend diagnostics artifact checks for warning/error-shape consistency across additional fallback and policy-pressure permutations.
6. Run integrated validation pass and prepare commit/push checkpoint.

## End-of-Day Checkpoint (2026-10-17, Late Session)

Session stop state:

- Resolver warning-shape determinism is implemented and validated for both `preferred-provider-error` and `preferred-provider-unavailable` fallback permutations.
- Workflow-level diagnostics verifier now enforces the same resolver warning-shape continuity contract.
- Otto UI startup order hardening has been validated in local `otto-ui` by launching Electron before Vite and confirming renderer connection after dev-server readiness.
- Maestro `main` is synced with GitHub after the latest governance hardening commit.

Resume-first actions for next session:

1. Continue governance telemetry expansion for remaining warning/error-shape and policy-pressure permutations.
2. Mirror any new integration assertions in `scripts/verify-diagnostics-artifacts.ts`.
3. Run targeted + full validation pass, then publish the next synced checkpoint.

## End-of-Day Checkpoint (2026-10-17)

Session stop state:

- Otto UI contract-ingestion + degraded bootstrap diagnostics are implemented and validated.
- Backbone Slice 1 (`features/conductor`) deterministic runtime and observability trace coverage is implemented and validated.
- Backbone Slice 2 (`features/provider-registry`) deterministic health snapshot contract is implemented and validated.

Resume-first actions for next session:

1. Implement conductor-to-provider-registry routing integration test using `preferredProviderId`.
2. Add workflow-level diagnostics artifact verification for observability and provider-health outputs.
3. Prepare consolidated commit/push batch once integrated validation passes.
