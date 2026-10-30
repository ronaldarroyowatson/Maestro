import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { HistoryEngine, type SecurityAuditEntry } from '../history-engine/index.js';
import { SandboxEngine, type SandboxScope } from '../sandbox-engine/index.js';

export type { SandboxScope, SandboxSession } from '../sandbox-engine/index.js';

export type SandboxPermission = 'read' | 'write' | 'execute' | 'approve' | 'managePermissions';
export type SandboxActionType = 'read' | 'write' | 'execute' | 'approve' | 'revoke';
export type SecurityRole = 'agent' | 'tool' | 'mcp' | 'node' | 'admin';

export type SecurityPolicy = {
  agentId: string;
  role: SecurityRole;
  allowedPaths: string[];
  allowedTools: string[];
  allowedNodes: string[];
  allowedMcpServers: string[];
  permissions: Record<SandboxPermission, boolean>;
};

export type SandboxAction = {
  agentId: string;
  actorId: string;
  actionType: SandboxActionType;
  target: string;
  toolId?: string;
  nodeId?: string;
  mcpServerId?: string;
  payload?: Record<string, unknown>;
  scope?: string[];
  metadata?: Record<string, unknown>;
};

export type SecurityApproval = {
  approvalId: string;
  userId: string;
  subject: string;
  action: string;
  nonce: string;
  expiresAt: number;
  scope: string[];
  signature: string;
};

export type ApprovalDecision = {
  allowed: boolean;
  reason?: string;
};

export type AiSecurityEngineOptions = {
  statePath?: string;
};

export class AiSecurityEngine {
  readonly sandboxEngine: SandboxEngine;
  readonly historyEngine: HistoryEngine;
  private readonly policies = new Map<string, SecurityPolicy>();
  private readonly approvalLedger = new Map<string, boolean>();
  private readonly statePath?: string;

  constructor(sandboxEngine = new SandboxEngine(), historyEngine = new HistoryEngine(), options: AiSecurityEngineOptions = {}) {
    this.sandboxEngine = sandboxEngine;
    this.historyEngine = historyEngine;
    this.statePath = options.statePath ? resolve(options.statePath) : undefined;
    this.loadPersistedState();
  }

  private loadPersistedState(): void {
    if (!this.statePath || !existsSync(this.statePath)) {
      return;
    }

    try {
      const parsed = JSON.parse(readFileSync(this.statePath, 'utf8')) as {
        security?: {
          policies?: SecurityPolicy[];
          approvalLedger?: Array<[string, boolean]>;
        };
        policies?: SecurityPolicy[];
        approvalLedger?: Array<[string, boolean]>;
      };

      const persistedSecurity = parsed.security ?? parsed;

      for (const policy of persistedSecurity.policies ?? []) {
        this.policies.set(policy.agentId, policy);
      }

      for (const [approvalId, used] of persistedSecurity.approvalLedger ?? []) {
        this.approvalLedger.set(approvalId, used);
      }
    } catch {
      // Ignore corrupt persisted state and start a clean in-memory state.
    }
  }

  private persistState(): void {
    if (!this.statePath) {
      return;
    }

    try {
      mkdirSync(dirname(this.statePath), { recursive: true });
      const existing = this.readPersistedStateFile();
      const payload = {
        ...existing,
        security: {
          policies: [...this.policies.values()],
          approvalLedger: [...this.approvalLedger.entries()]
        }
      };
      writeFileSync(this.statePath, JSON.stringify(payload, null, 2));
    } catch {
      // Ignore durable storage failures while preserving runtime safety.
    }
  }

  private readPersistedStateFile(): Record<string, unknown> {
    if (!this.statePath || !existsSync(this.statePath)) {
      return {};
    }

    try {
      const content = readFileSync(this.statePath, 'utf8');
      if (!content.trim()) {
        return {};
      }
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  registerPolicy(policy: SecurityPolicy): void {
    this.policies.set(policy.agentId, policy);
    this.persistState();
  }

  createApproval(action: SandboxAction, userId: string): SecurityApproval {
    const nonce = randomUUID();
    const subject = `${action.agentId}:${action.actionType}:${action.target}`;
    const signatureData = JSON.stringify({
      userId,
      subject,
      action: action.actionType,
      target: action.target,
      nonce,
      scope: action.scope ?? [],
      expiresAt: Date.now() + 600_000
    });
    const signature = createHash('sha256').update(signatureData).digest('hex');
    return {
      approvalId: `approval-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      userId,
      subject,
      action: action.actionType,
      nonce,
      expiresAt: Date.now() + 600_000,
      scope: action.scope ?? [],
      signature
    };
  }

  verifyApproval(approval: SecurityApproval, action: SandboxAction): ApprovalDecision {
    if (!approval || !approval.approvalId || !approval.signature) {
      return { allowed: false, reason: 'Approval is missing or malformed.' };
    }

    const expectedSubject = `${action.agentId}:${action.actionType}:${action.target}`;
    if (approval.subject !== expectedSubject) {
      return { allowed: false, reason: 'Approval subject does not match the action.' };
    }

    if (approval.action !== action.actionType) {
      return { allowed: false, reason: 'Approval action does not match the requested action.' };
    }

    if (Date.now() > approval.expiresAt) {
      return { allowed: false, reason: 'Approval expired.' };
    }

    const signatureData = JSON.stringify({
      userId: approval.userId,
      subject: approval.subject,
      action: approval.action,
      target: action.target,
      nonce: approval.nonce,
      scope: approval.scope,
      expiresAt: approval.expiresAt
    });
    const expectedSignature = createHash('sha256').update(signatureData).digest('hex');
    if (approval.signature !== expectedSignature) {
      return { allowed: false, reason: 'Approval signature invalid or spoofed.' };
    }

    if (this.approvalLedger.get(approval.approvalId) === true) {
      return { allowed: false, reason: 'Approval replay detected.' };
    }

    this.approvalLedger.set(approval.approvalId, true);
    this.persistState();
    return { allowed: true };
  }

  canExecute(action: SandboxAction, approval?: SecurityApproval): ApprovalDecision {
    const policy = this.policies.get(action.agentId);
    if (!policy) {
      return { allowed: false, reason: `No policy registered for agent ${action.agentId}.` };
    }

    if (action.agentId === action.actorId && action.actionType === 'approve') {
      return { allowed: false, reason: 'Agents cannot self-grant permissions.' };
    }

    if (action.actionType === 'approve' && !policy.permissions.managePermissions) {
      return { allowed: false, reason: 'Agent lacks permission to manage permissions.' };
    }

    if (action.actionType === 'write' || action.actionType === 'execute') {
      if (!policy.permissions.write && action.actionType === 'write') {
        return { allowed: false, reason: 'Agent lacks write permission.' };
      }
      if (!policy.permissions.execute && action.actionType === 'execute') {
        return { allowed: false, reason: 'Agent lacks execute permission.' };
      }
      if (!approval) {
        return { allowed: false, reason: 'Approved action requires a valid approval record.' };
      }
      const approvalDecision = this.verifyApproval(approval, action);
      if (!approvalDecision.allowed) {
        return approvalDecision;
      }
    }

    if (action.toolId && !policy.allowedTools.includes(action.toolId)) {
      return { allowed: false, reason: `Tool ${action.toolId} is outside the agent scope.` };
    }

    if (action.nodeId && !policy.allowedNodes.includes(action.nodeId)) {
      return { allowed: false, reason: `Node ${action.nodeId} is outside the agent scope.` };
    }

    if (action.mcpServerId && !policy.allowedMcpServers.includes(action.mcpServerId)) {
      return { allowed: false, reason: `MCP server ${action.mcpServerId} is outside the agent scope.` };
    }

    try {
      const scope: SandboxScope = {
        agentId: action.agentId,
        root: '/workspace/sandbox',
        allowedPaths: policy.allowedPaths,
        allowedTools: policy.allowedTools,
        allowedNodes: policy.allowedNodes,
        allowedMcpServers: policy.allowedMcpServers,
        permissions: Object.fromEntries(Object.entries(policy.permissions).map(([key, value]) => [key, Boolean(value)]))
      };
      const allowed = this.sandboxEngine.validateScope(scope, action.target);
      if (!allowed) {
        return { allowed: false, reason: `Target ${action.target} is outside the permitted sandbox scope.` };
      }
    } catch {
      return { allowed: false, reason: 'Target validation failed due to sandbox boundary rules.' };
    }

    return { allowed: true };
  }

  executeAction(action: SandboxAction, approval?: SecurityApproval, state?: Record<string, unknown>): { allowed: boolean; result?: unknown; reason?: string } {
    const decision = this.canExecute(action, approval);
    if (!decision.allowed) {
      const auditEntry: SecurityAuditEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        timestamp: new Date(),
        actorId: action.actorId,
        action: action.actionType,
        target: action.target,
        result: 'denied',
        reason: decision.reason,
        metadata: { agentId: action.agentId, toolId: action.toolId, nodeId: action.nodeId, mcpServerId: action.mcpServerId }
      };
      this.historyEngine.record(auditEntry);
      return { allowed: false, reason: decision.reason };
    }

    const normalizedResult = {
      status: 'allowed',
      actionType: action.actionType,
      target: action.target,
      stateHash: state ? this.historyEngine.hashState(state) : undefined
    };

    this.historyEngine.record({
      id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      timestamp: new Date(),
      actorId: action.actorId,
      action: action.actionType,
      target: action.target,
      result: 'allowed',
      metadata: { agentId: action.agentId, toolId: action.toolId, nodeId: action.nodeId, mcpServerId: action.mcpServerId },
      stateHash: normalizedResult.stateHash
    });

    return { allowed: true, result: normalizedResult };
  }
}
