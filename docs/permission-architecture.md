# Permission Architecture

## Policy Model

Permissions are expressed as explicit allowlists instead of implicit trust.

Each policy includes:

- `agentId`
- `role`
- `allowedPaths`
- `allowedTools`
- `allowedNodes`
- `allowedMcpServers`
- `permissions`

## Enforcement

Before a write or execute action is allowed:

1. verify the policy exists
2. confirm the tool, node, and MCP server are in the allowlist
3. confirm the target is inside the sandbox root
4. confirm the approval record matches the action
5. reject self-grant or cross-agent elevation without managePermissions
6. mark the approval as used to prevent replay

## Security guarantee

No action is allowed to leave the sandbox without explicit user approval and policy match. All denials are logged and remain auditable.
