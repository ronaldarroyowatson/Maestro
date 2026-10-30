# Sandbox Architecture

## Scope

The sandbox is the execution boundary for AI agents, tools, and MCP connections. Nothing outside the approved root may be read, written, or executed without a policy match and user approval.

## Guarantees

- absolute path escape is rejected
- parent-directory traversal is rejected
- path normalization is applied before authorizing the target
- risky actions require approval metadata
- all outcomes are logged to the audit trail
- snapshots allow recovery from failed or corrupted state

## Process

1. register a security policy
2. create an approval record
3. validate scope and allowlists
4. execute the action
5. record the audit result
6. retain a snapshot for rollback if required
