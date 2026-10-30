# Node Property Inspector (Phase G)

## Objective

Provide a deterministic property-inspector side-panel contract for selected node instances so graph edits are immediately reflected in runtime graph state.

## Implementation

- Service: `features/node-graph/services/property-inspector/index.ts`
  - Inspects selected node details (name, type, status, config, validation, I/O connections).
  - Applies node updates (`name`, `description`, `config`) and returns updated graph snapshots.
  - Performs node-level validation checks and emits explicit errors/warnings.
- Panel contract: `ui/panels/maestro-node-inspector-panel.json`
  - Required status fields
  - Property fields
  - Connection fields
  - Inspector actions
- UI contract wiring: `otto/manifests/maestro-ui-contract.json`
- Payload distribution wiring: `otto/maestro-payload.json`

## Node-level Validation Scope

- missing/unknown selected node detection
- empty node name detection
- missing node type detection
- self-referential node connection detection
- trigger-node incoming edge warning

## Live Update Semantics

- Updates are applied to graph snapshots in-memory.
- Updated graph output is returned immediately for panel/state refresh.
- No silent fallback: unresolved nodes produce explicit validation errors.
