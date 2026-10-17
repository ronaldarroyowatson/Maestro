# Conductor Feature

This feature executes DAG pipelines in layered topological order,
emits runtime events, applies retry behavior, and enforces reviewer gates.

The conductor runtime also supports deterministic execution options (`generateRunId`, `now`)
for reproducible tests and controlled orchestration runs.

Otto observability bridging is queued in-order to preserve deterministic event traces
for runtime telemetry/logging/tracing validation.

Observability emissions can include runtime context metadata (environment/channel/host OS)
to keep deployment diagnostics explicit across Otto telemetry surfaces.

## Structure
- models/: runtime contracts and execution result models
- services/: event-bus, scheduler, executor, retry-manager
- tests/: feature and integration tests
- docs/: feature docs
