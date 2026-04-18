# Maestro Codex

## Project Purpose

Maestro is a local-first multi-agent orchestration studio for planning, coding, critique, and archival workflows. It runs deterministic pipelines and presents real-time state through a backend plus dashboard frontend.

## Architectural Overview

- Backend: FastAPI app and orchestration runtime in backend/
- Frontend: dashboard UI in frontend/
- Pipelines: workflow definitions in pipelines/
- Memory: project memory infrastructure in .mempalace/ and adapters in maestro/memory/
- Tests: regression and smoke tests in tests/

## Memory Usage Rules

- MemPalace is the primary project memory system.
- Query MemPalace before architectural, behavioral, or historical claims.
- Prefer retrieved project context over assumptions.
- New architecture or workflow decisions should be recorded in MemPalace after implementation.

## Agent Behavior Expectations

- Use deterministic, minimal-impact edits.
- Validate assumptions against project files and memory context.
- Avoid speculative answers when context can be retrieved.
- Keep changes aligned with existing architecture and naming patterns.

## MemPalace Context Retrieval Contract

1. Connect to the local MCP server for MemPalace.
2. Retrieve context before proposing refactors, bug fixes, or system explanations.
3. Reconcile retrieved context with current repository state.
4. If ambiguity remains, report uncertainty explicitly and request targeted context.

## Test-First Bugfix Law

1. Any bug reported by the user or discovered by the agent must start by creating a failing test that reproduces the bug.
2. The failing test must be executed and confirmed failing before any production code fix is written.
3. Only after failure is confirmed may implementation code be changed.
4. After the fix, the full relevant test suite must be re-run and pass.
5. Each bugfix must permanently add:
   - edge-case tests
   - boundary-condition tests
   - common failure-mode tests
6. Added tests are permanent parts of the repository test suite and must not be removed unless behavior is intentionally retired.

## Installer Lifecycle Testing

1. Installer (GUI and CLI) coverage is mandatory for these lifecycle states:
   - fresh install
   - reinstall
   - repair
   - uninstall with no orphaned files/paths/registry entries
   - corrupted install detection
   - version upgrade simulation
2. Installer lifecycle tests are part of the bugfix workflow and must run during bugfix validation.
3. Installer-related bugs must follow the same test-first bugfix law.

## Workflow Enforcement

1. Agents must refuse to fix a bug unless a failing test exists and has been executed.
2. Agents must refuse to accept a bugfix unless tests pass after the fix.
3. Tests must be updated whenever behavior changes.
4. Coverage must be maintained for all installer lifecycle states.

## Workflow Rules

1. Gather context from repository and MemPalace.
2. Plan the smallest safe change.
3. Implement and validate using the test-first bugfix law.
4. Record key decisions and bugfix-cycle summaries back into MemPalace.
5. Summarize outcomes with concrete file-level changes and test evidence.

## Problems Pane Management Rule

1. After any code change, investigation, or bugfix workflow, always clear the VS Code Problems pane.
2. If the Problems pane shows false positives or incorrect diagnostic reporting, the diagnostic source must be identified and fixed so that reporting is accurate.
3. The Problems pane must never be left with stale or incorrect diagnostics.
4. Clearing the Problems pane is part of every workflow's completion checklist.

## Version Bumping and Git Push Rule

1. After every bugfix workflow is completed (all tests passing, code validated), the bugfix version number must be bumped.
2. Bugfix version is the last digit of the version number and does not roll over the minor version (e.g., 1.1.9 → 1.1.10, not 1.2.0).
3. All modified files, the updated VERSION file, and any new artifacts must be staged and pushed to git.
4. Commit message must reference the bugfix with clear traceability to the test failure and fix applied.
5. Git repository must be in a clean state (no uncommitted changes) before work concludes.

## Permanent Enforcement Rule

"Test-first bugfixing, installer lifecycle testing, edge-case expansion, problems pane management, and version bumping with git push are permanent, non-optional requirements for all future development. Agents MUST enforce these rules at all times."
