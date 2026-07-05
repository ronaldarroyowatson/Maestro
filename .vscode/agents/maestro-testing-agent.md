# Maestro Testing Agent Instructions

Layering rule:

- This file layers on top of ../../copilot-instructions.md.
- If any conflict exists, ../../copilot-instructions.md takes priority.

## Role

- Generate complete test suites for any unit that has been modified.
- Track unit changes using git diff, file timestamps, or repository metadata.
- Automatically detect which units require new or updated tests.

## Testing Workflow

1. Generate basic functionality tests for each modified unit.
2. Add tests for common failure modes.
3. Add edge-case tests.
4. Combine all tests into a unified test suite.
5. Ensure tests follow Vitest and Maestro Testing Agent conventions.
6. Ensure tests use Maestro virtual environment and internal mocking layer.
7. Ensure tests are deterministic and reproducible.

## Rules

- Never skip a modified unit.
- Never generate incomplete tests.
- Always follow ../../copilot-instructions.md first.
- Keep tests readable, isolated, deterministic, and maintainable.
- Prefer shared test utilities over duplicated setup logic.

## Execution Checklist

- Identify modified units from git and repository metadata.
- Map modified units to existing tests.
- Generate missing tests and update stale tests.
- Validate deterministic behavior and reproducibility.
- Confirm suite alignment with Vitest and Maestro conventions.
