# Maestro Architecture

## Purpose
Maestro is a modular, feature-based AI orchestration runtime with deterministic execution, explicit contracts, and versioned artifacts.

## Core Principles
- Feature-based structure by domain.
- Deterministic behavior for equal inputs/context.
- Minimal external dependencies.
- No direct API/CLI surface in Maestro runtime.
- Test-first and explicit validation boundaries.

## Feature Map
- `src/shared`: shared types, constants, and utilities.
- `src/component-registry`: immutable versioned artifact registry.
- `features/node-graph`: node definitions, graph validation, topological ordering.
- `features/prompt-engine`: prompt templates and rendering.
- `features/context-engine`: document/context shaping and serialization.
- `features/rules-engine`: rule storage, composition, and evaluation.
- `features/provider-registry`: inference providers and adapter factory.
- `features/reviewer`: schema and rules-based output review.
- `features/conductor`: runtime execution scheduler/executor/retry/event-bus.
- `features/pipeline`: build/store/validate/snapshot/descriptor lifecycle.
- `features/eval-suite`: CER/WER/confidence experiment pipeline.
- `features/training-pipeline`: sample collection, packaging, sync, distribution.

## Runtime Data Flow
1. Pipeline definition is built/loaded.
2. Node graph validates and computes topological layers.
3. Conductor schedules layers and executes nodes.
4. Reviewer gates configured edges and revisions.
5. Outputs and events are emitted for downstream consumers.
6. Pipeline snapshots/descriptors capture immutable deliverables.

## Extension Boundaries
- Provider-specific logic is isolated to adapter modules.
- Orchestration logic does not own HTTP route definitions.
- Command/API exposure belongs to external command service layers.

## Quality Model
- Unit tests per feature.
- Integration tests for cross-feature and fixture-driven flows.
- Type safety enforced by strict TypeScript checks.
