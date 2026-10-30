# Local AI Discovery Test Suite

## Purpose

Defines the repeatable validation commands and expected outputs for Phase B discovery testing.

## Commands

- `npm run typecheck`
- `npm test -- --run features/local-ai-discovery/tests`
- `npm run validate:ai-discovery-local`

## Expected Output Standard

- Machine validation prints concise lines:
  - `PASS - <Test Name>`
  - `FAIL - <Test Name>`
- Full evidence is written to:
  - `docs/local-ai-discovery-validation.latest.json`

## Automated Tests (Vitest)

### Core discovery tests

- Ollama Detection Test
- Duplicate Resource Test
- Resource Relationship Test
- Ollama Runtime Detection Test
- Ollama Model Metadata Test

### Failure mode tests

- Missing Configuration Test
- Invalid Endpoint Test
- Malformed JSON Test

### Edge case tests

- Empty Resource List Test
- Large Scale Resource Scan Test

## Real-machine validation checks

- Ollama executable detection
- Ollama runtime endpoint health
- Installed model discovery
- Metadata extraction
- Registry dedupe and update behavior
- Graph relationship creation

## Artifacts

- Validation report: `docs/local-ai-discovery-validation-report.md`
- Latest machine output: `docs/local-ai-discovery-validation.latest.json`
