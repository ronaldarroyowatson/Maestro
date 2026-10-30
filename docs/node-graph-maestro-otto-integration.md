# Node Graph Maestro + Otto Integration (Phase H)

## Objective

Integrate node graph execution contracts with runtime and discovery registry data so graph workflows can execute through a unified Maestro/Otto orchestration path.

## Implementation

- Service: `features/node-graph/services/maestro-otto-integration/index.ts`
  - Builds execution plans from `GraphDefinition` with topological execution layers.
  - Maps node resource bindings (`model`, `agent`, `tool`, `mcp`, etc.) to discovered `ResourceNode` inventory.
  - Produces explicit plan validation (`errors` and `warnings`) for cycles, edge integrity, and unmapped resources.
  - Executes graph runs through `WorkflowRuntimeServiceAdapter` using a runtime-backed request payload.
  - Projects graph UI state through `NodeGraphUiStateBuilder` for orchestration/monitoring surfaces.

## Integration Boundaries

- Graph structure source: node graph contracts/runtime graph definitions.
- Resource source: local AI discovery unified `ResourceNode` registry.
- Execution source: workflow runtime service adapter.
- UI source: contract-backed node graph state projection.

## Current Constraints

- Execution currently creates workflow runs and execution plans; node-by-node execution engines remain future work.
- Resource mapping is deterministic and explicit, but still metadata/tag-driven for inferred matches.
- Downstream Otto UI rendering remains external to this repository.

## Phase L Extension: Otto Node Engine Adapter

- Service: `features/node-graph/services/otto-node-engine-integration/index.ts`
  - Adds `MaestroOttoNodeEngineService` for feature-flagged delegation to external Otto node-engine clients.
  - Preserves graceful fallback when `enableOttoNodeEngine` is disabled or no client is configured.
  - Keeps Maestro graph persistence, execution, and discovery-to-graph generation behavior deterministic in fallback mode.
- Feature flag:
  - `ui/settings/maestro-ui-settings.json` now includes `defaults.enableOttoNodeEngine`.
- Validation:
  - `features/node-graph/tests/otto-node-engine-integration.test.ts` verifies enabled delegation and disabled fallback behavior.
