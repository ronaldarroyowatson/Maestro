# Node Graph Foundation (Phase F)

## Scope

Phase F establishes the Otto node graph foundation in this repository's contract/runtime layer.

## Core Deliverables

- Expanded node graph contract in `ui/nodes/maestro-node-graphs.json`:
  - canvas capabilities (`pan`, `zoom`, `grid`, `minimap`, `theme`, `nodeSelection`)
  - typed port metadata on node types
  - graph nodes with runtime status and grouping
  - graph edges with explicit port bindings
- Node graph panel spec in `ui/panels/maestro-node-graph-panel.json`:
  - required graph actions
  - required canvas features
  - required node/edge/status fields
- Runtime-backed projection service:
  - `features/node-graph/services/ui-integration/index.ts`
  - deterministic graph UI state builder with grouping, typed-port validation, runtime status mapping, and warnings/errors output.
- Shared contract validation utility:
  - `src/shared/utils/maestroNodeGraphContract.ts`

## Validation Model

Graph foundation validation now checks:

- canvas configuration completeness
- node type port declarations
- node and edge uniqueness
- edge endpoint and port validity
- typed connection compatibility

## Current Constraints

- This repository remains contract/runtime-first; rendered browser canvas behavior is consumed downstream by Otto UI.
- Property inspector and full visual editing UX remain a later phase.
