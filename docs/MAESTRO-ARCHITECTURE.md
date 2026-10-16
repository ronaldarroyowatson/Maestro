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

## Toolchain and Platform Baseline

Maestro is intentionally designed to be reproducible across environments while remaining speed-oriented.

### Runtime and Tooling
- Node.js + TypeScript for orchestration, validation, and feature logic
- pnpm or repo-equivalent package manager for install and script execution
- Git and GitHub workflows for repo synchronization and release management
- Rust toolchain for selected hot paths and performance-sensitive components
- local or hosted MCP services for command execution, runtime integration, and tooling adapters

### Otto as the Backbone
- Otto provides execution bootstrapping and extension lifecycle hooks.
- Maestro consumes Otto contracts rather than reinventing runtime plumbing.
- Logging, tracing, telemetry, and payload-driven setup remain contractually Otto-adjacent.
- Installer and runtime behavior should remain stable enough to be mirrored across machines.

### Performance Strategy
The speed requirement should be satisfied with intentional profiling and selective optimization:

- keep the feature orchestration model in TypeScript for maintainability and iteration speed
- identify hot paths with benchmarks and profiling before introducing Rust
- prefer Rust only for CPU-heavy or serialization-heavy tasks such as parsing, validation, graph transforms, and large-volume data processing
- maintain a single, clear boundary between the TypeScript orchestration layer and any Rust acceleration layer

## Mirror-Ready Setup Expectations

The setup should be reproducible without ad hoc machine state. Each repository, tool, and integration step should be documented and versioned enough to reconstruct the environment on another machine.

Required machine-replacement checks:
- repo inventory and clone order
- dependency installation commands
- toolchain installation and validation
- local MCP server registration and configuration
- runtime contract checks for Otto and Maestro
- verification and recovery steps to ensure continuity after failure or relocation
