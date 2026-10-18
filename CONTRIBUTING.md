# Contributing to Maestro

Thanks for helping improve Maestro.

## Project boundaries

This project intentionally follows the Otto architecture boundary:

- Otto owns reusable platform capabilities, command-service registration, and platform lifecycle.
- Maestro contributes orchestration runtime logic, graph contracts, workflow state management, provider discovery, and runtime intelligence.
- CLI/API command exposure should not be implemented ad hoc in Maestro; it should be surfaced through the Otto command-service layer.

## Development workflow

1. Fork or branch from the latest `main` branch.
2. Keep changes narrow and feature-oriented.
3. Add or update tests for behavior changes.
4. Run the smallest relevant validation commands before submitting a PR.

## Validation commands

```bash
npm install
npm run typecheck
npm test
```

## Pull request guidance

- Keep PRs focused on a single capability or fix.
- Update related docs when behavior or architecture changes.
- Include a brief explanation of how the change fits the Otto/Maestro boundary.

## Code of conduct

Be respectful, constructive, and collaborative. Treat others like peers, not obstacles.
