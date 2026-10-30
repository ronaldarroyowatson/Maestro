# Node Graph Discovery Integration (Phase M)

## Objective

Connect local discovery outputs directly into node-graph generation and persistence through the Otto node-engine adapter boundary.

## Implementation

- Service: `features/node-graph/services/discovery-graph-sync/index.ts`
  - Scans discovery resources through a discovery source contract.
  - Pulls normalized registry resources and de-duplicates by resource ID.
  - Generates graph definitions through `MaestroOttoNodeEngineService`.
  - Persists generated graphs through the same adapter boundary.
  - Emits PASS/FAIL assertions for scan, dedupe, graph generation, and registry-update readiness.

## Behavior

- Works with Otto-node-engine-enabled mode and with Maestro fallback mode.
- Keeps discovery-to-graph generation deterministic by preserving first-seen resource IDs when duplicates are present.
- Preserves explicit contract boundaries:
  - discovery remains in `features/local-ai-discovery`
  - graph generation/persistence remains in `features/node-graph`

## Constraints

- This phase validates adapter-level generation and persistence contracts.
- Real remote runtime transport and published package integration are deferred to the next phase.
