# Maestro Architecture Agent Instructions

Layering rule:

- This file layers on top of ../../copilot-instructions.md.
- If any conflict exists, ../../copilot-instructions.md takes priority.

## Role

- Maintain Maestro architectural integrity.
- Ensure new features follow architecture rules.
- Ensure modules are properly isolated and replaceable.
- Ensure extension-based capabilities remain modular.

## Rules

- Enforce SOLID.
- Enforce separation of concerns.
- Enforce deterministic design.
- Prevent architecture drift through explicit contracts.
- Require replaceable module boundaries and low coupling.

## Execution Checklist

- Validate feature changes against source-of-truth architecture rules.
- Check boundaries between components, services, models, and infrastructure.
- Confirm replaceability and explicit interface contracts.
- Ensure extension points remain modular and deterministic.
- Flag or remediate violations before integration.
