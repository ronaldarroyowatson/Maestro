# Phase I End-to-End Walkthrough

## Objective

Validate the full local flow:

Start -> Scan Device -> Detect Ollama -> Locate Models -> Register Resources -> Build Graph -> Execute Runtime Run -> Observe Node Status State

## Implementation Surfaces

- End-to-end validator:
  - `features/node-graph/services/end-to-end-validation/index.ts`
- Real-machine validation script:
  - `scripts/validate-phase-i-end-to-end.ts`
- Runtime integration service:
  - `features/node-graph/services/maestro-otto-integration/index.ts`

## Validation Outputs

- Machine-readable artifact:
  - `docs/phase-i-end-to-end-validation.latest.json`
- Console PASS/FAIL output for each required assertion.

## Success Criteria Mapping

- Local AI resources detected:
  - validated through discovery resource counts and model/runtime assertions.
- Resources registered:
  - validated through registry count and node binding checks.
- Results visible in UI state:
  - validated through integrated node graph UI state output.
- Graph execution observable:
  - validated through run lifecycle trace (`pending -> paused -> running -> cancelled`).
- Node statuses visible and consistent:
  - validated through graph UI-state node status availability checks.
