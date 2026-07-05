# Scaffold Guide

## Language Decision
- Active implementation language: TypeScript.

## Build Order
1. `src/shared`
2. `src/component-registry`
3. `features/node-graph`
4. `features/prompt-engine`
5. `features/context-engine`
6. `features/rules-engine`
7. `features/provider-registry`
8. `features/reviewer`
9. `features/conductor`
10. `features/pipeline`
11. `features/eval-suite`
12. `features/training-pipeline`
13. `fixtures` + integration tests

## Current Completion
- Steps 1-13 are implemented in this repository.
- Full typecheck/test suite passes.

## Required Commands
- Install: `pnpm install`
- Typecheck: `pnpm typecheck`
- Test: `pnpm test`
- Build: `pnpm build`

## Conventions
- Feature-first folder layout.
- No Maestro-owned API route handlers.
- No Maestro CLI parser surface.
- Keep module contracts explicit and testable.

## Stage Exit Criteria
A stage is complete when:
1. Feature modules are implemented in expected order.
2. Unit tests for the feature pass.
3. Cross-feature integration expectations hold.
4. Typecheck and test suites are green.
