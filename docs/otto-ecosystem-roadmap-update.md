# Otto Ecosystem Roadmap Update

## Added capability

The current roadmap now includes a first security/control layer for Otto AI execution:

- sandbox isolation boundary
- approval enforcement
- permission policies by agent
- audit and state recovery
- cross-tool and MCP scope enforcement

## Repository dependency map

- Maestro consumes the security contract through `features/security`.
- `otto-sandbox-engine` provides the first standalone sandbox boundary contract.
- `otto-history-engine` provides snapshots and rollback capability.
- `otto-ai-security-engine` provides approval and policy enforcement.

## Recommended next phase

1. bind these engines into a secure execution runner
2. add OS-level sandbox containers for real isolation
3. persist policy state and approval ledger to durable storage
4. enable read-only session windows by default
5. add signed commit or patch approval workflows for repository changes
