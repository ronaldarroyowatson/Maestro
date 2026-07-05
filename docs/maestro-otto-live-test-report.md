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
