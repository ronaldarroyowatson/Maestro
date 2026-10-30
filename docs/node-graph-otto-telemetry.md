# Node Graph Otto Telemetry Integration (Phase P)

## Objective

Wire node-engine orchestration into Maestro observability so discovery-sync execution emits runtime telemetry events.

## Implementation

- Service update: `features/node-graph/services/otto-node-engine-orchestrator/index.ts`
  - Adds optional `observabilityBridge` support.
  - Emits:
    - `maestro.node-engine.sync.started`
    - `maestro.node-engine.sync.completed`
    - `maestro.node-engine.sync.failed`
  - Preserves existing behavior when no bridge is supplied.

## Constraints

- Telemetry wiring is event-emission focused; dashboard visualization remains in downstream Otto UI.
- This phase does not add distributed worker telemetry yet.
