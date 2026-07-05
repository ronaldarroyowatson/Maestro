# Maestro Source-of-Truth Instructions

This file is the global instruction set for Maestro and all Maestro agents.
All agent-specific instructions are layered on top of this file and must never contradict it.

## 1) Coding Philosophy

All contributors and agents must follow these principles:

- DRY (Don't Repeat Yourself): avoid duplicate logic, duplicate business rules, and duplicated process definitions.
- Pragmatic Programmer principles: prioritize practical, resilient, maintainable solutions and continuous improvement.
- SOLID design principles: maintain composable, testable, and replaceable modules.
- Feature-based folder architecture: organize code by feature, not by technical layer across the whole app.
- Modularity and replaceability: design components so implementations can be swapped with minimal impact.
- Deterministic behavior: ensure consistent outputs for the same inputs and execution context.
- Minimal external dependencies: prefer internal implementations when feasible and reliable.
- Explicit contracts between modules: use clear interfaces, models, and validation boundaries.
- Strict separation of concerns: isolate UI, orchestration, domain logic, infrastructure, and test utilities.
- Clean, readable, maintainable code: prefer clarity over cleverness.
- Self-documenting code practices: use meaningful names, simple control flow, and explicit intent.
- Test-first mindset: design for testability, then implement with validation in mind.

## 2) Architectural Rules

### 2.1 System Model

- Maestro is a modular, agent-driven system.
- All agents must obey this file first.
- Agent-specific rules are layered on top of this file.

### 2.2 Repository Structure

Maestro uses this feature-based structure:

```text
/features/<feature-name>/
    /components/
    /services/
    /models/
    /tests/
    /docs/
```

Rules:

- New feature code must live inside the matching feature folder.
- Tests and documentation are required parts of each feature.
- Cross-feature dependencies must go through explicit contracts.

### 2.3 Platform and Capability Rules

- Maestro uses extension-based capabilities (similar to Otto).
- External libraries should be avoided unless absolutely required.
- Maestro uses internal providers for persistence, schema validation, hashing, and mocking.
- Maestro uses deterministic update manifests and release metadata.
- Maestro uses a unified testing architecture.

## 3) Agent Behavior Rules

Every Maestro agent must obey the following execution order and constraints:

1. Follow this source-of-truth file first.
2. Follow role-specific instructions second.
3. Never contradict this source-of-truth file.
4. Maintain DRY compliance across all repositories.
5. Maintain consistent coding style and architecture.

## 4) Decision Priority

When rules conflict, use this priority order:

1. Maestro source-of-truth instructions (this file)
2. Role-specific agent instructions
3. Task-local execution details

If a lower-priority rule conflicts with a higher-priority rule, the higher-priority rule wins.
