# Maestro Otto Integration Plan

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

1. Installer/bootstrap baseline with repair/healing and live validation.
2. Otto ecosystem-first artifact wiring for core backend modules.
3. Otto UI tracer-bullet validation path with explicit UI contract and entry route verification.
4. Observability baseline contracts (logging/tracing/metrics/debug + diagnostics path).
5. Maestro module registration contract + registration validation.
6. Otto UI contract-ingestion step completed: preload contract loading, dynamic route generation, and panel-level contract surfaces validated.

### In Progress

- Backbone feature implementation phase in Maestro.
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
- Current execution focus: continuing governance warning/error-shape invariants and packaging the next sync checkpoint.

### Next Step

1. Expand telemetry assertions for remaining governance mutation combinations not yet represented in workflow diagnostics artifacts.
2. Extend diagnostics artifact checks for warning/error-shape consistency across additional fallback and policy-pressure permutations.
3. Run integrated validation pass and prepare commit/push checkpoint.

## End-of-Day Checkpoint (2026-10-17)

Session stop state:

- Otto UI contract-ingestion + degraded bootstrap diagnostics are implemented and validated.
- Backbone Slice 1 (`features/conductor`) deterministic runtime and observability trace coverage is implemented and validated.
- Backbone Slice 2 (`features/provider-registry`) deterministic health snapshot contract is implemented and validated.

Resume-first actions for next session:

1. Implement conductor-to-provider-registry routing integration test using `preferredProviderId`.
2. Add workflow-level diagnostics artifact verification for observability and provider-health outputs.
3. Prepare consolidated commit/push batch once integrated validation passes.
