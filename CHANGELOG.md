# Changelog

## Unreleased

### Added

- Added Windows manifest-driven installer assets:
  - `installer/windows/minimal-installer.ps1`
  - `installer/windows/maestro-install-manifest.json`
- Added Otto UI contract + tracer bullet validation assets:
  - `otto/manifests/maestro-ui-contract.json`
  - `otto/manifests/maestro-module-registration.json`
  - `src/shared/utils/ottoUiContract.ts`
  - `src/shared/utils/ottoModuleRegistration.ts`
  - `scripts/otto-ui-tracer-bullet.ts`
  - `tests/shared/otto-ui-contract.test.ts`
  - `tests/shared/otto-module-registration.test.ts`
- Added observability baseline validation test:
  - `tests/shared/otto-observability-modules.test.ts`
- Added Otto ecosystem capability mapping doc:
  - `docs/maestro-otto-ecosystem-capability-map.md`
- Added repository-level Copilot source-of-truth instructions:
  - `.github/copilot-instructions.md`

### Changed

- Converted the tracer-bullet Otto UI surface into a real first-pass Maestro feature shell:
  - expanded the navigation contract to workflow-builder, runtime-status/runtime-monitor, registry-browser, execution-timeline, and diagnostics pages
  - preserved compatibility with the existing `runtime-status` entry while expanding the feature catalog beyond the install smoke path
  - updated UI settings and node graph metadata to represent the actual Maestro runtime flow
  - promoted the feature roster into a machine-readable Otto manifest at `otto/manifests/maestro-feature-catalog.json`
  - added a structured feature catalog helper in `src/shared/utils/maestroFeatureCatalog.ts` and exported it from `src/shared/index.ts`
  - extended the shared UI contract test to assert the feature set beyond the installation smoke path and validate the catalog manifest as part of the UI contract lifecycle
- Formalized the Otto-first platform contract core for the next architecture phase:
  - added shared runtime and event contracts in `src/shared/types/platform.ts`
  - introduced event-envelope, graph-definition, workflow-runtime-state, checkpoint, and run-request interfaces to anchor the upcoming Graph/Workflow service work
- Expanded Otto backend module wiring in install contracts to include:
  - `otto-systems/otto-server`
  - `otto-systems/otto-kernel`
  - `otto-systems/otto-ui`
  - `otto-systems/otto-extensions`
  - `otto-extensions/otto-extension-index`
  - `otto-extensions/otto-debug-extension`
- Hardened Windows minimal installer diagnostics with:
  - install-root writeability preflight
  - transcript tracing (`-TracePath`)
  - signature status reporting (`-VerifySignatures`)
- Updated installer and Otto installation docs to reflect current Windows minimal installer flow and ecosystem-first backend reuse strategy.
- Added `validate:otto-ui-contract` npm script for install/deploy/module/UI-entry tracer bullet checks.
- Expanded Maestro Otto payload observability baseline with required `debug.module` and diagnostics path contract.
- Updated Otto integration planning/reporting docs with 2026-10-17 phase progress:
  - Otto UI preload contract ingestion implemented in `otto-ui`
  - initial Maestro contract-driven navigation/page surface validated
  - dynamic Maestro route navigation sourced from `maestro-ui-contract.pages` with passing test/typecheck/build validation
  - richer contract-panel route surfaces added for install/runtime/node-graph/logs/telemetry views
  - live Otto UI Electron launch verification completed; contract-ingestion phase promoted to completed
- Began Maestro backbone implementation in conductor feature:
  - added deterministic runtime options (`generateRunId`, `now`)
  - added deterministic conductor execution test coverage
- Improved Otto bootstrap resilience for local Windows development:
  - added degraded service-stage handling in `@otto/update` bootstrap
  - enabled degraded-stage diagnostics in Otto UI Electron bootstrap (`OTTO_BOOTSTRAP_DEGRADED`)
- Added bootstrap diagnostics visibility in Otto UI Maestro panel:
  - preload + IPC bridge for bootstrap status
  - degraded-stage badges rendered in-app for operator visibility
- Extended conductor observability runtime behavior:
  - in-order queued event forwarding for deterministic trace sequencing
  - new conductor + observability integration test for deterministic run/event propagation
- Extended conductor observability telemetry contract payloads with runtime context metadata:
  - `environment`, `deploymentChannel`, and `hostOs`
  - updated observability tests to validate metadata propagation
- Added provider-registry deterministic health snapshots:
  - `getHealthSnapshot(providerIds?)` with sorted entries, isolated failures, summary counts
  - deterministic preferred-provider selection (latency, then provider id tie-break)
- Added end-of-day documentation checkpoint updates for integration status and next-session execution handoff.
- Added conductor/provider-registry routing integration coverage:
  - agent routing support for `providerId: "preferred"` with `fallbackProviderId` recovery behavior
  - new conductor integration test validating preferred-provider and fallback error-mode recovery
- Added workflow diagnostics artifact verification:
  - `verify:diagnostics-artifacts` script generates provider-health and observability-trace diagnostics outputs
  - Windows installer workflow now runs targeted backbone tests and uploads diagnostics artifact JSONs
- Hardened orchestration provider-policy selection:
  - added `resolvePreferredProviderId(policy, providerIds?)` in provider-registry
  - added policy constraints for status, latency threshold, and priority ordering
  - expanded routing tests for policy-excluded candidates and fallback recovery behavior
  - added weighted latency/cost policy strategy with deterministic tie-break behavior
  - added transient outage recovery via last-known healthy snapshot with max-age guardrails
  - added budget and circuit-breaker governance controls (`blockedProviderIds`, `budgetRemaining`, `reserveBudget`)
  - added conductor fallback regression coverage when circuit-breaker policy blocks all preferred candidates
  - added deterministic cooldown/decay-window controls (`cooldownUntilByProviderId`, `evaluationTime`) and recovery tests
  - added cross-run governance state handoff scaffolding (`createSelectionPolicyWithGovernance`, `createNextGovernanceState`)
  - added routing integration coverage for multi-run budget handoff and fallback recovery
  - added governance metadata shape assertions in diagnostics artifact verification
  - added conductor pipeline-event governance metadata emission for runtime trace visibility
  - expanded routing integration assertions for fallback warning metadata and non-preferred selected-provider visibility
  - expanded observability bridge tests for pipeline-failure governance metadata forwarding
  - expanded resolver-error fallback assertions to require emitted `providerRoutingWarning` + selected provider metadata
  - tightened diagnostics artifact governance-contract checks for emitted metadata shape and policy/state presence
  - seeded governance metadata from pipeline metadata into conductor runtime context for early failure-path telemetry continuity
  - added invalid-pipeline observability regression coverage for governance metadata propagation on `PipelineFailed`
  - expanded diagnostics artifact verification with invalid-pipeline failure metadata contract assertions
  - added runtime-context + identifier assertions on failure telemetry payloads (`environment`, `deploymentChannel`, `hostOs`, `runId`, `pipelineId`)
  - expanded failure telemetry permutation coverage for cycle-validation errors with governance-metadata continuity checks
  - added runtime node-failure telemetry assertions (`maestro.node.failed`) for governance metadata continuity
  - expanded diagnostics artifact verification for runtime service-failure telemetry invariants
  - added runtime retry-exhaustion telemetry assertions (`retriesExhausted`) with mixed-outcome partial-status coverage
  - expanded diagnostics artifact verification for retry-exhaustion and mixed-node-outcome telemetry invariants
  - added multi-failure layer telemetry assertions for deterministic `maestro.node.failed` cardinality and continuity metadata
  - added fallback-cascade failure telemetry assertions for preferred-routing failure + fallback-provider execution failure
  - expanded diagnostics artifact verification for multi-failure and fallback-cascade telemetry invariants
  - added governance policy-state drift telemetry assertions across repeated failure runs with deterministic budget-sequence checks
  - expanded diagnostics artifact verification for policy-state drift continuity invariants
  - added cooldown/blocked-state transition telemetry assertions under repeated failure pressure with deterministic mutation-shape checks
  - expanded diagnostics artifact verification for cooldown/blocked governance-mutation continuity invariants
  - added reserve-budget mutation telemetry assertions (`reserveBudget`) for deterministic budget-preservation under fallback pressure
  - expanded diagnostics artifact verification for reserve-budget continuity invariants across repeated mutation failures
  - added cross-run mixed-mutation telemetry assertions for consistent fallback warning shape across cooldown/blocked/budget-reserve permutations
  - expanded diagnostics artifact verification for warning consistency across mixed governance mutation permutations
  - added resolver warning-shape determinism assertions for `preferred-provider-error` vs `preferred-provider-unavailable` fallback permutations
  - expanded diagnostics artifact verification for resolver warning-shape continuity across fallback failure paths

## 0.1.9

### Added

- Added embedded Otto runtime launchers and runtime entrypoints:
  - `otto/bin/otto`
  - `otto/bin/command-service`
  - `otto/runtime/otto-bootstrap.mjs`
  - `otto/runtime/command-service-cli.mjs`
  - `otto/payload.json`
- Added dedicated package workflows:
  - `.github/workflows/maestro-packages-linux.yml` for `.deb` and `.rpm`
  - `.github/workflows/maestro-packages-windows-msi.yml` for `.msi`
- Added architecture and validation reports:
  - `docs/maestro-embedded-otto-diagnostic-report.md`
  - `docs/maestro-embedded-otto-final-report.md`

### Changed

- Reworked platform bootstrap scripts to use embedded Otto pathing and payloads only (no PATH-based Otto lookup).
- Updated installer workflows to embed Otto runtime components and publish durable `latest` release assets with idempotent GitHub CLI upload/create logic.
- Updated installer docs and durable URL docs to include MSI/DEB/RPM targets.

### Added

- Added Otto integration discovery and planning docs:
  - `docs/maestro-current-state.md`
  - `docs/maestro-otto-integration-plan.md`
- Added initial Otto payload and command contract files:
  - `otto/maestro-payload.json`
  - `otto/maestro-commands.json`
- Added installer architecture and cross-platform bootstrap scripts:
  - `installer/README.md`
  - `installer/linux/bootstrap.sh`
  - `installer/macos/bootstrap.sh`
  - `installer/windows/bootstrap.ps1`
  - `installer/hooks/pre-install.sh`
  - `installer/hooks/post-install.sh`
  - `installer/hooks/pre-update.sh`
  - `installer/hooks/post-update.sh`
- Added Maestro observability bridge for Otto logging/tracing/telemetry modules:
  - `features/conductor/services/otto-observability/index.ts`
  - `features/conductor/tests/otto-observability.test.ts`
- Added Otto UI integration artifacts:
  - `ui/nodes/maestro-node-graphs.json`
  - `ui/settings/maestro-ui-settings.json`
  - `ui/navigation/maestro-panels.json`
- Added GitHub Actions workflows for platform installer artifacts:
  - `.github/workflows/maestro-installers-windows.yml`
  - `.github/workflows/maestro-installers-linux.yml`
  - `.github/workflows/maestro-installers-macos.yml`
- Added operational docs:
  - `docs/maestro-otto-payload.md`
  - `docs/maestro-installation-via-otto.md`
  - `docs/maestro-telemetry-and-logging.md`
  - `docs/maestro-ui-and-node-graphs.md`
  - `docs/maestro-otto-live-test-report.md`

### Changed

- Rewrote `readme.md` for Otto-managed install, durable installer links, and production integration documentation.
- Extracted command service layer into standalone repo and rewired all Otto repos to use it.
- Revalidated Maestro command-service contract against the standalone `Otto/otto-command-service` repo.
