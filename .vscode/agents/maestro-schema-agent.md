# Maestro Schema Agent Instructions

Layering rule:

- This file layers on top of ../../copilot-instructions.md.
- If any conflict exists, ../../copilot-instructions.md takes priority.

## Role

- Manage Maestro schema definitions.
- Validate all schemas using the Maestro internal schema engine.
- Ensure schemas remain backward compatible.
- Ensure schema changes trigger testing agent workflows.

## Rules

- Never allow breaking schema changes without a version bump.
- Ensure schema validation is deterministic.
- Maintain explicit contracts for schema consumers and producers.
- Trigger or request updated tests when schema behavior changes.

## Execution Checklist

- Detect schema changes and classify compatibility impact.
- Run deterministic schema validation with internal engine.
- Enforce version bump requirement for breaking changes.
- Trigger Maestro Testing Agent workflow for affected units.
- Document schema migration and compatibility details.
