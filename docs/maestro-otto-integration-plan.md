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

## Current Phase Status (2026-10-17)

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

### Next Step

1. Run integrated validation pass for current backbone slices (`typecheck`, targeted backbone tests, tracer bullet).
2. Prepare commit/push batch and phase checkpoint with the new routing/diagnostics verification coverage.
3. Start next backbone increment for conductor-provider orchestration policy hardening.

## End-of-Day Checkpoint (2026-10-17)

Session stop state:

- Otto UI contract-ingestion + degraded bootstrap diagnostics are implemented and validated.
- Backbone Slice 1 (`features/conductor`) deterministic runtime and observability trace coverage is implemented and validated.
- Backbone Slice 2 (`features/provider-registry`) deterministic health snapshot contract is implemented and validated.

Resume-first actions for next session:

1. Implement conductor-to-provider-registry routing integration test using `preferredProviderId`.
2. Add workflow-level diagnostics artifact verification for observability and provider-health outputs.
3. Prepare consolidated commit/push batch once integrated validation passes.
