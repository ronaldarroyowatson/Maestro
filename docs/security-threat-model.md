# Threat Model

## Assets

- user-controlled file system state
- in-memory workflow state
- model execution context
- approval records and audit records
- tool and MCP execution boundaries

## Threats

1. Hidden modification: an agent writes to a path outside the approved sandbox.
2. State corruption: a write operation alters state without a known-good snapshot.
3. Permission overreach: an agent executes a tool or node outside its assigned role.
4. Privilege escalation: one agent grants permissions to another or self-grants.
5. Approval spoofing: an approval record is mutated or forged.
6. Replay attack: the same approval record is reused multiple times.
7. MCP bypass: a tool or MCP server is used outside the allowed allowlist.

## Mitigations

- sandbox root validation with traversal rejection
- signed approval records with single-use ledger enforcement
- explicit allowlists for tools, nodes, and MCP servers
- policy registration and permission checks before execution
- snapshot and audit trail for every risky action
