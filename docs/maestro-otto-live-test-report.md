# Maestro Otto Live Test Report

Date: 2026-07-05
Environment: macOS local development workspace

## Objective

Validate Otto-managed Maestro bootstrap flow and document full end-to-end expectations including splash, self-update, payload install, telemetry, and UI surfaces.

## Test Preconditions

- Maestro payload and installer scaffolding present.
- Otto component repos available locally for contract verification.
- Otto production binary and GUI runtime not provisioned in this workspace session.

## Executed Steps

1. Verified bootstrap scripts and payload files exist.
2. Verified extension module IDs and command envelope contracts against cloned Otto reference repos.
3. Executed bootstrap dry-run validations on Linux and macOS scripts:
	- `OTTO_DRY_RUN=1 installer/linux/bootstrap.sh`
	- `OTTO_DRY_RUN=1 installer/macos/bootstrap.sh`
4. Ran Maestro repository sanity checks after integration changes:
	- `pnpm typecheck`
	- `pnpm test`

## Direct Local Observations

- Bootstrap scripts resolve payload path and construct expected Otto command sequence.
- Payload declares required extension modules and telemetry event taxonomy.
- Maestro observability bridge forwards runtime events to logging/tracing/telemetry extension interfaces.
- Dry-run output showed expected sequence:
	- `otto ui splash --product maestro`
	- `otto self-update --channel stable`
	- `otto maestro install --payload .../otto/maestro-payload.json --channel stable`
- Typecheck passed.
- Test suite passed (`57` files, `116` tests).

## Blockers for Full Visual Validation in This Session

The following require a runnable Otto GUI/CLI distribution rather than repository source references:

- Otto splash screen rendering confirmation.
- Otto self-update live execution and restart behavior.
- Otto UI panels displaying live Maestro telemetry/log streams.

## Reproducible Full E2E Procedure

1. Install or build Otto CLI/UI distribution.
2. Run one bootstrap installer for the target platform.
3. Confirm splash appears.
4. Confirm self-update flow completes.
5. Confirm `otto maestro install` executes with `otto/maestro-payload.json`.
6. Confirm telemetry stream shows download/install lifecycle events.
7. Confirm Maestro navigation section appears with node graph/log/telemetry panels.

## Follow-up Tasks

- Execute the full GUI-backed E2E run on a machine with installable Otto binary.
- Capture screenshots for splash, install telemetry, node graph panel, and Maestro settings panel.
- Append screenshot evidence and exact Otto build/version IDs to this report.

---

## Windows Minimal Installer Live Test (2026-10-16)

Environment: Windows local development workspace

### Goal

Validate a Windows-first minimal installer flow that:

1. opens/prints the installation manifest listing all repos/files/contracts,
2. fetches and installs all declared repositories,
3. validates declared contract files,
4. detects failure modes and self-heals.

### Installer and Manifest Under Test

- `installer/windows/minimal-installer.ps1`
- `installer/windows/maestro-install-manifest.json`

### Commands Executed

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\installer\windows\minimal-installer.ps1 `
  -InstallRoot "$env:TEMP\maestro-otto-e2e" `
  -PrintManifest `
  -Mode Validate
```

```powershell
# Failure simulation 1: delete required contract file
Remove-Item -Force "$env:TEMP\maestro-otto-e2e\repos\maestro\otto\maestro-payload.json"
powershell -NoProfile -ExecutionPolicy Bypass -File .\installer\windows\minimal-installer.ps1 `
  -InstallRoot "$env:TEMP\maestro-otto-e2e" `
  -Mode Repair
```

```powershell
# Failure simulation 2: corrupt repo metadata
Remove-Item -Recurse -Force "$env:TEMP\maestro-otto-e2e\repos\otto-update\.git"
powershell -NoProfile -ExecutionPolicy Bypass -File .\installer\windows\minimal-installer.ps1 `
  -InstallRoot "$env:TEMP\maestro-otto-e2e" `
  -Mode Repair
```

### Observed Results

- Manifest was printed successfully and included:
  - all required repos for minimal Maestro/Otto setup,
  - required files per repo,
  - contract files and descriptions.
- Validate mode successfully cloned and verified all manifest repositories:
  - maestro
  - otto-command-service
  - otto-protocol
  - otto-update
  - otto-kernel
  - otto-ui
- Contract validation passed for:
  - `otto/maestro-payload.json`
  - `otto/maestro-commands.json`
  - payload and command schemas
- Self-heal behavior was confirmed:
  - deleted required file was restored during repair via git reset/update,
  - corrupted repository metadata (missing `.git`) triggered rebuild and fresh clone,
  - repair run completed with successful contract validation.

### Additional Failure/Trace Coverage (2026-10-16 Follow-up)

- **Manifest open verification:**
  - Ran installer with `-OpenManifest` and confirmed Notepad launched the manifest file path.
- **Permission failure (Program Files, non-elevated):**
  - Running install root under `C:\Program Files\Maestro-Otto-Live` failed as expected.
  - Installer now fails fast with explicit remediation guidance:
    - run elevated (Administrator), or
    - choose a user-writable path (for example under `%USERPROFILE%`).
- **Manifest integrity failure:**
  - Injected an invalid required file (`docs/DOES-NOT-EXIST.md`) into a temporary manifest.
  - Validate mode correctly failed with a clear missing-file error.
- **Transcript tracing:**
  - Installer supports `-TracePath` and writes a full PowerShell transcript for each run.
- **Signing trace:**
  - Installer supports `-VerifySignatures` and logs Authenticode status for the Windows bootstrap script.
  - Current local status observed: `NotSigned` (warning surfaced as expected, installation still succeeds in local development).

### Conclusion

Windows-first minimal installer flow is operational for repo hydration + contract validation + recovery from common local install failure modes, with traceable diagnostics for permissions, manifest integrity, and signature status.

---

## Otto Ecosystem Wiring Follow-up (2026-10-16)

Expanded installer/payload wiring to align with Otto-first backend reuse:

- Added core Otto backend modules to Windows install manifest:
  - `otto-command-service`
  - `otto-server`
  - `otto-update`
  - `otto-kernel`
  - `otto-protocol`
  - `otto-ui`
  - `otto-extensions`
  - `otto-extension-index`
- Added corresponding Otto artifact wiring in `otto/maestro-payload.json`.
- Added capability/ownership mapping document:
  - `docs/maestro-otto-ecosystem-capability-map.md`

This aligns local bootstrap/install contracts with the policy of extending Otto ecosystem modules first and limiting Maestro-local backend logic to Maestro-specific orchestration behavior.

---

## Otto UI Contract Tracer Bullet (2026-10-16)

Objective:
- verify install + deploy integrity with the expanded Otto module set, and
- confirm Maestro resolves to a concrete Otto UI entry route.

Command:

```powershell
npm run validate:otto-ui-contract
```

What the tracer validates:
- runs Windows minimal installer in `Validate` and `Install` modes,
- verifies all manifest repositories and required files are installed,
- validates payload/command/schema contract files,
- validates Maestro Otto UI contract coherence against navigation/settings/node graph assets,
- resolves and prints UI entry page route.

Observed result:
- tracer passed end-to-end,
- install/deploy checks passed with all modules intact,
- UI entry route resolved to:
  - `/maestro/install-status`

Signing note:
- current local script signature status remains `NotSigned` (warning), expected in local development and non-blocking for tracer bullet validation.

Observability baseline update:
- Otto debug/diagnostics support is now explicitly wired into install contracts:
  - `otto-extensions/otto-debug-extension`
  - required payload module contract: `debug.module` (alias: `diagnostics.module`)
  - diagnostics path contract: `{otto.dataDir}/diagnostics/maestro`

Maestro module registration update:
- Added explicit module registration contract:
  - `otto/manifests/maestro-module-registration.json`
- Added validation to enforce consistency between:
  - module registration entry route/panels,
  - UI contract pages,
  - observability path contracts.

---

## Otto UI Contract Ingestion Progress (2026-10-17)

Implementation progress in `otto-ui`:

- Added Electron preload bridge loading for:
  - `otto/manifests/maestro-module-registration.json`
  - `otto/manifests/maestro-ui-contract.json`
- Added renderer service wrapper for contract loading.
- Added conditional Maestro navigation surface in Otto UI when contract loading succeeds.
- Added Maestro module page that renders:
  - module display metadata,
  - resolved entry route,
  - registered routes from contract pages.

Validation run:

- `npm --prefix D:\OneDrive\Documents\GitHub\otto-ui run typecheck` ✅
- `npm --prefix D:\OneDrive\Documents\GitHub\otto-ui test` ✅
- `npm --prefix D:\OneDrive\Documents\GitHub\otto-ui run build` ✅

Current status:

- Contract ingestion path is operational and visible in the UI shell.
- Remaining for full completion: wire contract pages into full route dispatch and add smoke tests for success/failure loading states.

### Dynamic contract-route mapping update

Otto UI progress update:

- navigation now derives Maestro page items from `maestro-ui-contract.pages`,
- selection of a contract route renders a route-specific Maestro panel surface,
- base "Maestro" view remains available for load/error status visibility.

Validation rerun after route updates:

- `npm --prefix D:\OneDrive\Documents\GitHub\otto-ui test` ✅ (includes preload success/failure + route derivation checks)
- `npm --prefix D:\OneDrive\Documents\GitHub\otto-ui run typecheck` ✅
- `npm --prefix D:\OneDrive\Documents\GitHub\otto-ui run build` ✅
- `npm --prefix D:\OneDrive\Documents\GitHub\Maestro run validate:otto-ui-contract` ✅
  - tracer route resolution remains stable: `/maestro/install-status`

### Rich panel-level binding update

Otto UI progress update:

- added contract-panel binding service to provide route-specific panel data,
- `install-status` and `telemetry` routes now render timeline surfaces,
- `runtime-status` and `node-graph` routes now render module-state surfaces,
- `logs` route now renders recent event surfaces.

Validation rerun after panel-level binding updates:

- `npm --prefix D:\OneDrive\Documents\GitHub\otto-ui test` ✅ (9 tests total)
- `npm --prefix D:\OneDrive\Documents\GitHub\otto-ui run typecheck` ✅
- `npm --prefix D:\OneDrive\Documents\GitHub\otto-ui run build` ✅
- `npm --prefix D:\OneDrive\Documents\GitHub\Maestro run validate:otto-ui-contract` ✅
  - tracer route resolution remains stable: `/maestro/install-status`

### Otto UI live launch verification

Validation executed:

- launched Electron app via `npm --prefix D:\OneDrive\Documents\GitHub\otto-ui run electron`,
- verified active Electron process tree includes main, renderer, and utility process roles for `otto-ui`,
- re-ran tracer bullet validation after launch verification.

Observed result:

- Otto UI launch is operational for current contract-ingestion implementation.
- Tracer bullet remains passing with stable route resolution to `/maestro/install-status`.

### Otto UI bootstrap degradation handling update

Issue observed during launch:

- local Windows service operations (`service.status`, `service.install`, `service.start`) can fail in dev environments where the Otto service is not installed or elevation is unavailable.

Fix implemented:

- `@otto/update` bootstrap now supports `allowDegradedServiceStages` and normalizes known local service/permission failures to degraded-success stage results.
- Otto UI Electron bootstrap now enables degraded mode in development and emits explicit `OTTO_BOOTSTRAP_DEGRADED` diagnostics with affected stage names.

Validation:

- Otto UI startup now reports `OTTO_BOOTSTRAP_RESULT` with stage `ok: true` and per-stage `degraded: true` markers for expected local-service failure modes.
- Degraded summary log emitted:
  - `OTTO_BOOTSTRAP_DEGRADED {"degradedStageCount":5,...}`
- `npm --prefix D:\OneDrive\Documents\GitHub\Maestro run validate:otto-ui-contract` rerun ✅
  - tracer route remains stable at `/maestro/install-status`

UI diagnostics enhancement:

- Otto UI now exposes bootstrap status from Electron main process to renderer via preload bridge.
- Maestro panel renders bootstrap health section with degraded-stage badges when present.
- This makes expected local-dev service degradation visible in-app instead of only in console output.

---

## Backbone Slice Kickoff: Deterministic Conductor Runtime (2026-10-17)

Objective:

- begin backbone implementation with a deterministic orchestration primitive in `features/conductor`.

Changes:

- added conductor runtime options for deterministic run behavior:
  - `generateRunId`
  - `now`
- wired conductor execution to use runtime options for run ID and duration calculation.
- added conductor test coverage for deterministic run ID and duration.

Validation:

- `npm --prefix D:\OneDrive\Documents\GitHub\Maestro test -- features/conductor/tests/conductor.test.ts` ✅
- `npm --prefix D:\OneDrive\Documents\GitHub\Maestro run typecheck` ✅

### Conductor observability deterministic trace coverage (2026-10-17)

Objective:

- extend conductor observability runtime behavior with deterministic event-trace guarantees and integration coverage.

Changes:

- `OttoObservabilityBridge` now queues runtime event forwarding in-order to preserve deterministic trace sequencing.
- Added bridge `flush()` helper for deterministic integration assertions.
- Added conductor + observability integration test:
  - `features/conductor/tests/conductor-otto-observability.integration.test.ts`
  - validates pipeline/runtime event forwarding ordering invariants and deterministic run ID propagation.

Validation:

- `npm --prefix D:\OneDrive\Documents\GitHub\Maestro test -- features/conductor/tests/conductor.test.ts features/conductor/tests/otto-observability.test.ts features/conductor/tests/conductor-otto-observability.integration.test.ts` ✅
- `npm --prefix D:\OneDrive\Documents\GitHub\Maestro run typecheck` ✅

Runtime metadata extension:

- observability telemetry payloads now carry runtime context metadata:
  - `environment`
  - `deploymentChannel`
  - `hostOs`
- integration tests now assert deterministic run ID propagation and runtime-context propagation through telemetry emissions.

Validation rerun:

- `npm --prefix D:\OneDrive\Documents\GitHub\Maestro test -- features/conductor/tests/otto-observability.test.ts features/conductor/tests/conductor-otto-observability.integration.test.ts` ✅
- `npm --prefix D:\OneDrive\Documents\GitHub\Maestro run typecheck` ✅

---

## Backbone Slice 2: Provider Registry Deterministic Health Snapshot (2026-10-17)

Objective:

- implement deterministic provider-health snapshot behavior with explicit failure isolation and preferred-provider selection.

Changes:

- added provider-health snapshot contracts in provider-registry models:
  - `ProviderHealthEntry`
  - `ProviderHealthSummary`
  - `ProviderHealthSnapshot`
- added `ProviderRegistry.getHealthSnapshot(providerIds?)`:
  - deterministic provider-id sorted output
  - failure isolation (throws converted to `unreachable` health with explicit message)
  - summary counts (`healthy`, `degraded`, `unreachable`, `total`)
  - deterministic `preferredProviderId` selection by latency then provider id.
- added provider-registry test coverage for deterministic ordering and failure isolation.

Validation:

- `npm --prefix D:\OneDrive\Documents\GitHub\Maestro test -- features/provider-registry/tests/provider-registry.test.ts` ✅
- `npm --prefix D:\OneDrive\Documents\GitHub\Maestro run typecheck` ✅

### Conductor-to-provider routing integration + diagnostics workflow verification (2026-10-17)

Objective:

- verify end-to-end routing from conductor agent nodes into provider-registry preferred-provider snapshots and enforce workflow-level diagnostics artifact checks.

Changes:

- added conductor integration routing behavior:
  - agent node `providerId: "preferred"` now routes via optional conductor provider-routing strategy,
  - fallback provider recovery path (`fallbackProviderId`) when preferred-provider resolution is unavailable or errors.
- added integration test:
  - `features/conductor/tests/conductor-provider-routing.integration.test.ts`
  - validates preferred-provider selection and fallback recovery on resolver failure.
- added diagnostics artifact verification script:
  - `scripts/verify-diagnostics-artifacts.ts`
  - emits:
    - `dist/diagnostics/provider-health-snapshot.json`
    - `dist/diagnostics/observability-trace.json`
  - fails fast when provider-health/observability invariants are not satisfied.
- updated workflow:
  - `.github/workflows/maestro-installers-windows.yml`
  - adds Node setup, dependency install, targeted backbone tests, diagnostics verification script execution, and diagnostics artifact upload.

Validation:

- `npm --prefix D:\OneDrive\Documents\GitHub\Maestro test -- features/conductor/tests/conductor-provider-routing.integration.test.ts features/conductor/tests/conductor-otto-observability.integration.test.ts features/provider-registry/tests/provider-registry.test.ts` ✅
- `npm --prefix D:\OneDrive\Documents\GitHub\Maestro run typecheck` ✅
- `npm --prefix D:\OneDrive\Documents\GitHub\Maestro run verify:diagnostics-artifacts` ✅
- `npm --prefix D:\OneDrive\Documents\GitHub\Maestro run validate:otto-ui-contract` ✅
  - tracer route remains stable at `/maestro/install-status`

### Orchestration policy hardening follow-up (2026-10-17)

Objective:

- harden provider orchestration policy by introducing explicit selection constraints and validating recovery behavior when policies eliminate candidates.

Changes:

- provider-registry now supports policy-driven preferred-provider resolution:
  - `resolvePreferredProviderId(policy, providerIds?)`
  - policy supports:
    - allowed statuses (`healthy` / `degraded`)
    - max latency threshold
    - explicit provider priority ordering
    - weighted latency/cost strategy (`selectionStrategy: "weighted"`, `providerCostByProviderId`, weights/penalties)
- conductor/provider integration tests now cover:
  - policy-constrained preferred-provider selection,
  - fallback recovery when policy excludes all preferred candidates,
  - weighted policy routing behavior.
- diagnostics artifact verification script now uses policy-driven provider selection invariants.

Validation:

- `npm --prefix D:\OneDrive\Documents\GitHub\Maestro test -- features/provider-registry/tests/provider-registry.test.ts` ✅
- `npm --prefix D:\OneDrive\Documents\GitHub\Maestro test -- features/conductor/tests/conductor-provider-routing.integration.test.ts` ✅
- `npm --prefix D:\OneDrive\Documents\GitHub\Maestro run typecheck` ✅
- `npm --prefix D:\OneDrive\Documents\GitHub\Maestro run verify:diagnostics-artifacts` ✅
- `npm --prefix D:\OneDrive\Documents\GitHub\Maestro run validate:otto-ui-contract` ✅ (route stable: `/maestro/install-status`)

---

## End-of-Day Summary (2026-10-17)

Completed today:

- Otto UI contract-driven navigation/panel surfacing + bootstrap degradation diagnostics.
- Conductor deterministic runtime controls and deterministic observability event-trace coverage.
- Provider-registry deterministic health snapshot capability with failure isolation and preferred-provider selection.

Validated today:

- Otto UI tests/typecheck/build ✅
- Maestro conductor/provider-registry targeted tests ✅
- Maestro typecheck ✅
- Tracer bullet validation (`validate:otto-ui-contract`) ✅

Next-session first actions:

1. Add conductor-to-provider-registry routing integration test based on health snapshot selection.
2. Add diagnostics artifact verification to workflow-level validation.
3. Bundle and push integrated change set after final validation pass.
