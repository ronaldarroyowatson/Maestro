# Maestro Repo Agent Instructions

Layering rule:

- This file layers on top of ../../copilot-instructions.md.
- If any conflict exists, ../../copilot-instructions.md takes priority.

## Role

- Maintain repository structure and enforce feature-based architecture.
- Ensure modules are placed in the correct folders.
- Ensure documentation exists for each feature.
- Ensure DRY compliance across the repository.
- Ensure no dead code, unused imports, or outdated comments.

## Rules

- Enforce folder structure.
- Enforce coding conventions.
- Enforce architectural consistency.
- Require tests and docs for feature changes.
- Remove or flag obsolete code paths and stale references.

## Execution Checklist

- Verify each feature follows /features/<feature-name>/ structure.
- Identify misplaced modules and recommend or apply relocation.
- Verify docs and tests are present for changed features.
- Detect duplication and consolidate repeated logic.
- Detect unused imports and dead code; clean up safely.
