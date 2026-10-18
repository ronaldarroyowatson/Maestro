# Conductor Feature

This feature executes DAG pipelines in layered topological order,
emits runtime events, applies retry behavior, and enforces reviewer gates.

The conductor runtime also supports deterministic execution options (`generateRunId`, `now`)
for reproducible tests and controlled orchestration runs.

Otto observability bridging is queued in-order to preserve deterministic event traces
for runtime telemetry/logging/tracing validation.

Observability emissions can include runtime context metadata (environment/channel/host OS)
to keep deployment diagnostics explicit across Otto telemetry surfaces.
Pipeline lifecycle emissions also include optional governance-routing metadata
(`governancePolicy`, `governanceState`, `providerRoutingWarning`, `selectedProvidersByNode`)
for cross-run provider-policy diagnostics.
When provided in pipeline metadata, governance metadata is seeded into runtime context
so early validation failures still emit continuity diagnostics on pipeline-failed events.
Runtime node-failure emissions (`maestro.node.failed`) also propagate optional governance
metadata when available, preserving failure-context visibility for service/node error paths.
Retry-exhaustion node-failure payloads include `retriesExhausted=true`, and mixed-outcome
runtime executions preserve deterministic partial-status semantics with continuity metadata.
Multi-failure same-layer runs preserve deterministic `maestro.node.failed` event cardinality,
and fallback-cascade failures preserve routing-warning context when preferred resolution fails
before fallback-provider execution also fails.
Repeated failure runs can carry governance policy/state metadata that demonstrates deterministic
budget drift continuity across runs (`governanceState.budgetRemaining` sequence assertions).

## Structure
- models/: runtime contracts and execution result models
- services/: event-bus, scheduler, executor, retry-manager
- tests/: feature and integration tests
- docs/: feature docs
