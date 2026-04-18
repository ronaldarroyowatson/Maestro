# Copilot Instructions For Maestro

## Mandatory Behavior
- ALWAYS create a failing test before fixing any bug.
- ALWAYS verify the new bug-reproduction test fails before writing code.
- ALWAYS write the fix only after failing behavior is confirmed.
- ALWAYS re-run tests to confirm the fix.
- ALWAYS add edge-case tests after the fix.
- ALWAYS integrate installer lifecycle tests into the test suite.

## Installer Rules
- When working on installer code, ALWAYS run lifecycle validations for:
  - install
  - repair
  - reinstall
  - uninstall
  - corrupted install simulation
  - version upgrade simulation
- ALWAYS verify registry keys, file paths, and uninstall completeness.

## Refusal Rules
- If the user asks to fix a bug without a failing test, respond exactly:
  "I must create a failing test first. This is required by the Maestro Codex."

## Required Operating Rules
- Always query MemPalace for context before answering architecture, behavior, history, or workflow questions.
- Use the project-local MemPalace MCP server configured for this workspace.
- Prefer project-local knowledge and retrieved memory over hallucination.
- Treat .maestro/CODEX.md as the authoritative behavioral contract.

## MemPalace MCP Usage
- MCP server: mempalace (configured in .vscode/settings.json)
- Palace path: .mempalace/palace
- Retrieval-first behavior is mandatory before major edits, refactors, or root-cause analysis.

## Response And Editing Rules
- Do not invent missing project facts when retrieval is possible.
- Preserve existing architecture and naming conventions.
- Make minimal, verifiable changes.
- Report uncertainty explicitly when context is incomplete.

## Escalation Rule
- If MemPalace context conflicts with current repository state, surface the conflict and prioritize current code plus explicit user intent.

## Problems Pane Management Rule
- ALWAYS clear the VS Code Problems pane after any code change, investigation, or bugfix workflow.
- If the Problems pane reports false positives or incorrect diagnostics, identify and fix the diagnostic source.
- ALWAYS ensure the Problems pane shows only accurate, current diagnostics.
- Clearing the Problems pane is part of every workflow's completion checklist.

## Version Bumping and Git Push Rule
- After every bugfix workflow is completed (all tests passing), ALWAYS bump the bugfix version number.
- Bugfix version is the last digit (e.g., 1.1.9 → 1.1.10, not 1.2.0).
- ALWAYS stage, commit, and push all modified files and the updated VERSION file to git.
- ALWAYS use a commit message that references the bugfix, test failure, and fix applied.
- ALWAYS verify the git repository is in a clean state (no uncommitted changes) before concluding work.

## Permanent Enforcement Rule
"Test-first bugfixing, installer lifecycle testing, edge-case expansion, problems pane management, and version bumping with git push are permanent, non-optional requirements for all future development. Agents MUST enforce these rules at all times."
