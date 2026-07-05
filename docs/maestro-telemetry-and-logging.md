# Maestro Telemetry and Logging

## Otto Extension Modules

From Otto extension manifests, Maestro integrates with:

- `logging.module` for structured logs.
- `tracing.module` for span creation and event correlation.
- `metrics.module` as telemetry signal sink.

These dependencies are declared in `otto/maestro-payload.json`.

## Maestro Integration Points

Maestro runtime observability bridge:

- `features/conductor/services/otto-observability/index.ts`

Bridge behavior:

- Subscribes to conductor events on `EventBus`.
- Emits structured runtime logs to `logging.module`.
- Creates spans and annotations via `tracing.module`.
- Emits lifecycle and runtime telemetry events via `metrics.module`.

## Event Coverage

Runtime event forwarding:

- `PipelineStarted` -> `maestro.pipeline.started`
- `NodeStarted` -> `maestro.node.started`
- `NodeCompleted` -> `maestro.node.completed`
- `NodeFailed` -> `maestro.node.failed`
- `ReviewerDecision` -> `maestro.reviewer.decision`
- `PipelineCompleted` -> `maestro.pipeline.completed`
- `PipelineFailed` -> `maestro.pipeline.failed`

Installer event forwarding:

- `maestro.download.started`
- `maestro.download.completed`
- `maestro.install.started`
- `maestro.install.completed`
- `maestro.install.failed`
- `maestro.install.retry`

## Log and Telemetry Paths

Configured in `otto/maestro-payload.json`:

- Logs: `{otto.dataDir}/logs/maestro`
- Traces: `{otto.dataDir}/traces/maestro`
- Telemetry: `{otto.dataDir}/telemetry/maestro`

## Operational Notes

- Observability bridge is best-effort and never throws into runtime execution flow.
- Otto UI should surface logs and telemetry through its module dashboards and panel integrations.
