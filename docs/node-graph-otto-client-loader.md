# Node Graph Otto Client Loader (Phase N)

## Objective

Enable runtime loading of an external Otto node-engine client package while preserving deterministic fallback behavior.

## Implementation

- Service: `features/node-graph/services/otto-node-engine-client-loader/index.ts`
  - Attempts dynamic import of an Otto node-engine module (default `@otto/node-engine`).
  - Validates export contract (`createMaestroClient`).
  - Returns explicit availability status and reason when unavailable.
- Integration update: `MaestroOttoNodeEngineService.create(...)`
  - Builds a service instance from feature flags plus optional module name.
  - When disabled or unavailable, preserves fallback execution path.

## Constraints

- This phase introduces package/runtime load contracts, not full remote transport orchestration.
- Real published `@otto/node-engine` package adoption remains a follow-up rollout task.
