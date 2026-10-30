# Node Graph Otto Orchestrator (Phase O)

## Objective

Provide a single Maestro entrypoint that composes Otto client loading, fallback-safe node-engine service creation, and discovery-driven graph sync execution.

## Implementation

- Service: `features/node-graph/services/otto-node-engine-orchestrator/index.ts`
  - Calls `MaestroOttoNodeEngineService.create(...)` for feature-flag/module-aware initialization.
  - Runs `DiscoveryGraphSyncService` using the initialized node-engine service.
  - Returns graph output, resource count, and explicit client availability status.

## Constraints

- This phase focuses on orchestration composition and deterministic fallback behavior.
- It does not yet include remote worker distribution or multi-user synchronization.
