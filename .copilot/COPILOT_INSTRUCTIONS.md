# Maestro - Copilot Instructions

## Mandatory Behavior

1. ALWAYS create a failing test before fixing any bug.
2. ALWAYS verify the failing test fails before writing the fix.
3. ALWAYS write the fix only after the failing test is confirmed.
4. ALWAYS re-run tests to confirm the fix.
5. ALWAYS add edge-case tests, boundary-condition tests, and common failure-mode tests after the fix.
6. ALWAYS integrate installer lifecycle tests into the test suite.

## Installer Rules

1. When working on installer code, ALWAYS run:
   - install
   - repair
   - reinstall
   - uninstall
   - corrupted install simulation
   - version upgrade simulation
2. ALWAYS verify registry keys, file paths, and uninstall completeness.

## Refusal Rules

If the user asks to fix a bug without a failing test, respond exactly:
"I must create a failing test first. This is required by the Maestro Codex."

## Required Behavior

1. Always use MemPalace for context retrieval.
   - Use search_memories, navigate_palace, and other MCP tools whenever context, architecture, or historical reasoning is needed.

2. MemPalace is the authoritative source of truth for:
   - architecture
   - design systems
   - deleted or historical subsystems
   - debug logs
   - layout engines
   - card behavior
   - UI choreography
   - past decisions

3. When uncertain, query MemPalace before generating code.

4. Always store new architectural decisions into MemPalace using add_memory.

5. Treat MemPalace as part of the deterministic workflow:
   - reconstruction tasks
   - refactors
   - bugfixes
   - architectural changes
   - design system updates

6. All restored or reconstructed systems must be validated against MemPalace memories.

## Summary Rule

If you need context, use MemPalace.
If you create new context, store it in MemPalace.

## Problems Pane Management Rule

1. ALWAYS clear the VS Code Problems pane after any code change, investigation, or bugfix workflow.
2. If the Problems pane reports false positives or incorrect diagnostics, identify and fix the diagnostic source.
3. ALWAYS ensure the Problems pane shows only accurate, current diagnostics.
4. Clearing the Problems pane is part of every workflow's completion checklist.

## Version Bumping and Git Push Rule

1. After every bugfix workflow is completed (all tests passing), ALWAYS bump the bugfix version number.
2. Bugfix version is the last digit (e.g., 1.1.9 → 1.1.10, not 1.2.0).
3. ALWAYS stage, commit, and push all modified files and the updated VERSION file to git.
4. ALWAYS use a commit message that references the bugfix, test failure, and fix applied.
5. ALWAYS verify the git repository is in a clean state (no uncommitted changes) before concluding work.

## Permanent Enforcement Rule

"Test-first bugfixing, installer lifecycle testing, edge-case expansion, problems pane management, and version bumping with git push are permanent, non-optional requirements for all future development. Agents MUST enforce these rules at all times."