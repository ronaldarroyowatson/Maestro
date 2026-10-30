# Maestro Security Architecture

## Feature

Maestro now includes a sandboxed security layer that prevents hidden modifications, scope escapes, approval abuse, and agent-to-agent privilege elevation.

## Core components

- `features/security/services/sandbox-engine/index.ts` enforces sandbox root boundaries and rejects path traversal.
- `features/security/services/history-engine/index.ts` maintains state snapshots and audit history for every security decision.
- `features/security/services/security-engine/index.ts` evaluates permissions, validation, and approval policy before allowing a risky action.
- `features/security/services/maestro-security-integration/index.ts` provides the orchestration boundary for Maestro-managed agent execution.

## Permission model

Each agent is assigned a `SecurityPolicy` with:

- explicit allowed paths
- allowed tools
- allowed nodes
- allowed MCP servers
- permission flags (`read`, `write`, `execute`, `approve`, `managePermissions`)

The engine rejects requests that:

- escape the sandbox root
- target disallowed tools or servers
- attempt to self-grant privileges
- bypass scope boundaries
- use expired or replayed approvals
- attempt to elevate another agent without permission

## Recovery and auditability

Every successful or denied action is recorded in the history engine. Snapshots are created for stateful operations so the system can restore pre-change state when a policy violation or corrupted state is detected.

## Validation results

- Tests executed: `features/security/tests/security-engine.test.ts`
- Result: PASS
- Failure modes tested: hidden path traversal, approval spoofing, replay detection, tool/MCP scope escaping, agent self-elevation, write approval denial
- Edge cases tested: path traversal, absolute path bypass attempts, replayed approval tokens, out-of-scope tool execution
