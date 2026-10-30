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

## Phase M Extension: Discovery Graph Sync

- Service: `features/node-graph/services/discovery-graph-sync/index.ts`
  - Connects `LocalAiDiscoveryService` output to `MaestroOttoNodeEngineService`.
  - De-duplicates discovery resources before graph generation.
  - Generates and persists graph snapshots from discovery registry output.
- Validation:
  - `features/node-graph/tests/discovery-graph-sync.test.ts`
  - `tests/node-graph/phase-m-discovery-graph-sync.test.ts`

## Phase N Extension: Runtime Client Loading

- Service: `features/node-graph/services/otto-node-engine-client-loader/index.ts`
  - Adds dynamic module loading for Otto node-engine clients with explicit availability diagnostics.
  - Validates required module export contract (`createMaestroClient`) before integration.
- Integration update:
  - `MaestroOttoNodeEngineService.create(...)` now bootstraps feature-flag-aware client loading and fallback-safe service initialization.
- Validation:
  - `features/node-graph/tests/otto-node-engine-client-loader.test.ts`
  - `tests/node-graph/phase-n-client-loader.test.ts`

## Phase O Extension: Orchestration Entrypoint

- Service: `features/node-graph/services/otto-node-engine-orchestrator/index.ts`
  - Composes runtime client loading, fallback-safe adapter initialization, and discovery graph sync execution.
  - Returns explicit client availability status alongside graph sync results.
- Validation:
  - `features/node-graph/tests/otto-node-engine-orchestrator.test.ts`

## Phase P Extension: Orchestrator Telemetry Wiring

- Service update: `features/node-graph/services/otto-node-engine-orchestrator/index.ts`
  - Emits observability events for start/success/failure paths when an observability bridge is supplied.
  - Preserves deterministic fallback behavior and explicit failure propagation.
- Validation:
  - `features/node-graph/tests/otto-node-engine-orchestrator.test.ts`

## Phase Q Extension: Sync Diagnostics Artifacts

- Service: `features/node-graph/services/node-engine-diagnostics/index.ts`
  - Builds node-engine sync event summaries and verifies start/completed/failed sequence integrity.
- Script: `scripts/verify-node-engine-sync-diagnostics.ts`
  - Runs deterministic success/failure orchestration paths and writes diagnostics artifact output.
- Validation:
  - `features/node-graph/tests/node-engine-diagnostics.test.ts`
  - `npm run verify:node-engine-sync-diagnostics`
