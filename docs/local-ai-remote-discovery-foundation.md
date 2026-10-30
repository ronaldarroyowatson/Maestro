# Local AI Remote Discovery Foundation (Phase K)

## Objective

Introduce deterministic remote-target discovery contracts without breaking the unified `ResourceNode` architecture.

## Implementation

- Added remote discovery orchestration service:
  - `features/local-ai-discovery/services/remote-discovery/index.ts`
- Added registration/export wiring from:
  - `features/local-ai-discovery/index.ts`
- Added remote discovery tests:
  - `features/local-ai-discovery/tests/remote-discovery.test.ts`

## Core Contracts

- `RemoteDiscoveryTarget`: normalized remote scan target shape.
- `RemoteDiscoveryScanner`: scanner contract for target-based remote discovery.
- `RemoteDiscoveryScanResult`: deterministic result shape with:
  - normalized resources
  - explicit scanner failures
  - scan timestamp

## Behavior

- scanner orchestration runs per scanner x target
- unsupported resource types are rejected into explicit failures
- duplicate resources are merged deterministically by id and latest `lastSeen`
- remote target metadata is attached to every discovered resource

## Architecture Alignment

- preserves “Everything is a Resource Node”
- keeps graph-first model by returning normalized discovery resources
- avoids adding a parallel remote-specific registry
