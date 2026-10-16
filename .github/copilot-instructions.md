# Maestro Copilot Instructions (Source of Truth)

These instructions apply to all AI-assisted changes in this repository.
If a task-specific instruction conflicts with this file, this file wins.

## 1) Engineering Principles

Follow these principles in code and architecture decisions:

- DRY (Don't Repeat Yourself): avoid duplicated logic, business rules, and workflows.
- ETC (Easier To Change): prefer designs that reduce coupling and make future change safe.
- Pragmatic Programmer mindset: choose practical, maintainable solutions over cleverness.
- SOLID principles: keep modules composable, testable, and replaceable.
- Feature-first organization: group by business capability, not global technical layers.
- Determinism first: equal inputs and context should produce equal outputs.
- Explicit contracts: use clear interfaces, models, and boundaries between modules.
- Separation of concerns: keep orchestration, domain logic, infrastructure, and UI isolated.
- Simplicity over novelty: prefer clear code, obvious control flow, and readable intent.
- Testability by design: implement with unit/integration validation in mind.

## 2) Repository Architecture Rules

### 2.1 System model

- Maestro is a modular orchestration runtime with explicit feature boundaries.
- Agent-specific instructions may extend this file, but must not contradict it.

### 2.2 Feature-based folder system

Maestro follows a feature-first structure:

```text
/features/<feature-name>/
    index.ts
    /models/
    /services/
    /tests/
    /docs/
```

Rules:

- New runtime behavior belongs in the relevant feature folder.
- Feature tests and docs are first-class parts of the feature.
- Cross-feature communication must happen through explicit contracts/types.
- Shared code belongs in `src/shared` (or another documented shared boundary), not ad hoc duplication.

### 2.3 Dependency and integration rules

- Prefer internal abstractions before introducing external dependencies.
- Introduce a new dependency only when it clearly improves reliability or maintainability.
- Keep provider- and platform-specific code behind adapters/contracts.
- Preserve deterministic manifests and stable integration boundaries with Otto ecosystem components.

## 3) Implementation Standards

- Make small, cohesive, reversible changes.
- Name things for domain intent, not implementation trivia.
- Avoid hidden side effects and implicit coupling.
- Do not mix unrelated refactors with task-specific fixes.
- Keep error handling explicit; avoid silent fallbacks.
- Keep docs aligned when behavior, setup, or contracts change.

## 4) Quality Gates

Before completion, verify the smallest relevant set of checks:

- Type safety checks (`typecheck`)
- Targeted tests (and integration tests when behavior crosses feature boundaries)
- Build validation when packaging/runtime surfaces are affected

If a check fails, fix root causes or clearly document blockers.

## 5) Decision Priority

When guidance conflicts, use this order:

1. This file (`.github/copilot-instructions.md`)
2. More specific repository instruction files (scoped by path/task)
3. Task-local implementation details

Higher-priority guidance always takes precedence.
