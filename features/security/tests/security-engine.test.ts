import { describe, expect, it } from 'vitest';
import { AiSecurityEngine } from '../index.js';
import { HistoryEngine } from '../services/history-engine/index.js';
import { SandboxEngine } from '../services/sandbox-engine/index.js';
import type { SecurityPolicy, SandboxAction } from '../services/security-engine/index.js';

function buildPolicy(agentId: string): SecurityPolicy {
  return {
    agentId,
    role: 'agent',
    allowedPaths: ['/workspace/sandbox/agent-a', '/workspace/sandbox/agent-a/docs'],
    allowedTools: ['tool-read', 'tool-write'],
    allowedNodes: ['node-1', 'node-2'],
    allowedMcpServers: ['mcp-local'],
    permissions: {
      read: true,
      write: true,
      execute: true,
      approve: false,
      managePermissions: false
    }
  };
}

function buildAllowedWriteAction(agentId: string): SandboxAction {
  return {
    agentId,
    actorId: 'user-1',
    actionType: 'write',
    target: `${agentId}/docs/report.md`,
    toolId: 'tool-write',
    nodeId: 'node-1',
    mcpServerId: 'mcp-local',
    metadata: { summary: 'allowed write in scope' }
  };
}

describe('Maestro security sandbox validation', () => {
  it('Sandbox Engine blocks hidden path traversal and path escape attempts', () => {
    const sandboxEngine = new SandboxEngine();
    expect(() => sandboxEngine.normalizeTarget('../.ssh/id_rsa')).toThrow();
    expect(() => sandboxEngine.normalizeTarget('/etc/passwd')).toThrow();

    const scope = {
      agentId: 'agent-a',
      root: '/workspace/sandbox',
      allowedPaths: ['/workspace/sandbox/agent-a'],
      allowedTools: ['tool-read'],
      allowedNodes: ['node-1'],
      allowedMcpServers: ['mcp-local'],
      permissions: { read: true, write: true, execute: true, approve: false, managePermissions: false }
    };

    expect(sandboxEngine.validateScope(scope, 'agent-a/docs/report.md')).toBe(true);
    expect(sandboxEngine.validateScope(scope, '../outside.md')).toBe(false);
  });

  it('State corruption is prevented with snapshot recovery and audit logging', () => {
    const history = new HistoryEngine();
    const before = { documents: ['draft.md'], status: 'draft' };
    const snapshot = history.snapshot('before-edit', before);

    expect(history.restore(snapshot.id)?.checksum).toBe(history.hashState(before));
    expect(history.getAuditLog()).toHaveLength(0);
  });

  it('Agent cannot exceed scope or self-grant permissions', () => {
    const security = new AiSecurityEngine();
    const policy = buildPolicy('agent-a');
    security.registerPolicy(policy);

    const selfGrantAction: SandboxAction = {
      agentId: 'agent-a',
      actorId: 'agent-a',
      actionType: 'approve',
      target: 'docs/report.md',
      toolId: 'tool-write',
      nodeId: 'node-1',
      mcpServerId: 'mcp-local'
    };

    const selfGrantResult = security.executeAction(selfGrantAction, security.createApproval(selfGrantAction, 'user-1'));
    expect(selfGrantResult.allowed).toBe(false);
    expect(selfGrantResult.reason).toContain('self-grant');

    const overScopeAction: SandboxAction = {
      agentId: 'agent-a',
      actorId: 'user-1',
      actionType: 'write',
      target: '../other/report.md',
      toolId: 'tool-write',
      nodeId: 'node-1',
      mcpServerId: 'mcp-local'
    };

    const overScopeResult = security.executeAction(overScopeAction, security.createApproval(overScopeAction, 'user-1'));
    expect(overScopeResult.allowed).toBe(false);
    expect(overScopeResult.reason).toMatch(/outside the permitted sandbox scope|Sandbox violation/i);
  });

  it('Tool and MCP calls outside allowed scope are denied', () => {
    const security = new AiSecurityEngine();
    security.registerPolicy(buildPolicy('agent-a'));

    const toolBypassAction: SandboxAction = {
      agentId: 'agent-a',
      actorId: 'user-1',
      actionType: 'execute',
      target: 'tools/remote-shell.sh',
      toolId: 'tool-admin-shell',
      nodeId: 'node-1',
      mcpServerId: 'mcp-local',
      scope: ['/workspace/sandbox/agent-a']
    };

    const toolResult = security.executeAction(toolBypassAction, security.createApproval(toolBypassAction, 'user-1'));
    expect(toolResult.allowed).toBe(false);
    expect(toolResult.reason).toContain('outside the agent scope');

    const mcpBypassAction: SandboxAction = {
      agentId: 'agent-a',
      actorId: 'user-1',
      actionType: 'execute',
      target: 'mcp/remote-admin',
      toolId: 'tool-read',
      nodeId: 'node-1',
      mcpServerId: 'mcp-privileged',
      scope: ['/workspace/sandbox/agent-a']
    };

    const mcpResult = security.executeAction(mcpBypassAction, security.createApproval(mcpBypassAction, 'user-1'));
    expect(mcpResult.allowed).toBe(false);
    expect(mcpResult.reason).toContain('outside the agent scope');
  });

  it('Approval spoofing and replay are rejected', () => {
    const security = new AiSecurityEngine();
    const policy = buildPolicy('agent-a');
    security.registerPolicy(policy);

    const action = buildAllowedWriteAction('agent-a');
    const approval = security.createApproval(action, 'user-1');
    const valid = security.executeAction(action, approval, { status: 'draft' });
    expect(valid.allowed).toBe(true);

    const replay = security.executeAction(action, approval, { status: 'draft' });
    expect(replay.allowed).toBe(false);
    expect(replay.reason).toContain('replay');

    const spoofedApproval = { ...approval, signature: 'spoofed-signature' };
    const spoofed = security.executeAction(action, spoofedApproval, { status: 'draft' });
    expect(spoofed.allowed).toBe(false);
    expect(spoofed.reason).toMatch(/invalid or spoofed/i);
  });

  it('Approval is required for privileged operations and missing approvals are denied', () => {
    const security = new AiSecurityEngine();
    security.registerPolicy(buildPolicy('agent-a'));

    const action = buildAllowedWriteAction('agent-a');
    const withoutApproval = security.executeAction(action);
    expect(withoutApproval.allowed).toBe(false);
    expect(withoutApproval.reason).toMatch(/approval|valid approval/i);
  });

  it('Different agents cannot elevate each other without managePermissions', () => {
    const security = new AiSecurityEngine();
    security.registerPolicy(buildPolicy('agent-a'));
    security.registerPolicy({
      ...buildPolicy('agent-b'),
      agentId: 'agent-b',
      permissions: {
        read: true,
        write: true,
        execute: true,
        approve: false,
        managePermissions: false
      }
    });

    const elevateAction: SandboxAction = {
      agentId: 'agent-b',
      actorId: 'agent-a',
      actionType: 'approve',
      target: 'workspace/agent-b/permissions',
      toolId: 'tool-write',
      nodeId: 'node-1',
      mcpServerId: 'mcp-local',
      scope: ['/workspace/sandbox/agent-b']
    };

    const result = security.executeAction(elevateAction, security.createApproval(elevateAction, 'user-1'));
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('permission');
  });
});
