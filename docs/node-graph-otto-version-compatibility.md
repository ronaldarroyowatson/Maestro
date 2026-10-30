# Node Graph Otto Version Compatibility (Phase R)

## Objective

Add explicit node-engine API-version compatibility checks during runtime client loading.

## Implementation

- Loader update: `features/node-graph/services/otto-node-engine-client-loader/index.ts`
  - Adds `requiredApiVersion` option (default `1.0.0`).
  - Requires module export `apiVersion` and validates major-version compatibility.
  - Returns explicit unavailable status with compatibility reason when mismatched.
- Integration update:
  - `MaestroOttoNodeEngineService.create(...)` accepts and forwards `requiredApiVersion`.
  - `OttoNodeEngineOrchestrator` accepts `requiredApiVersion` for end-to-end bootstrap consistency.
