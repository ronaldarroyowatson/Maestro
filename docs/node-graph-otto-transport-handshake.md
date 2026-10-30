# Node Graph Otto Transport Handshake (Phase S)

## Objective

Add runtime transport handshake checks for loaded node-engine clients.

## Implementation

- Client contract update:
  - `features/node-graph/services/otto-node-engine-integration/index.ts`
  - Adds optional `healthCheck()` on `OttoNodeEngineClient`.
- Loader update:
  - `features/node-graph/services/otto-node-engine-client-loader/index.ts`
  - Runs `healthCheck()` when available and fails loading if transport is not healthy.
  - Returns explicit unavailable reason for failed handshakes.
