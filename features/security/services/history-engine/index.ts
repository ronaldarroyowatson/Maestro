import { createHash } from 'node:crypto';

export type SandboxStateSnapshot = {
  id: string;
  label: string;
  createdAt: Date;
  checksum: string;
  state: Record<string, unknown>;
};

export type SecurityAuditEntry = {
  id: string;
  timestamp: Date;
  actorId: string;
  action: string;
  target: string;
  result: 'allowed' | 'denied';
  reason?: string;
  metadata?: Record<string, unknown>;
  stateHash?: string;
};

export class HistoryEngine {
  private readonly snapshots = new Map<string, SandboxStateSnapshot>();
  private readonly auditLog: SecurityAuditEntry[] = [];

  snapshot(label: string, state: Record<string, unknown>): SandboxStateSnapshot {
    const snapshot: SandboxStateSnapshot = {
      id: `snapshot-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      label,
      createdAt: new Date(),
      checksum: this.hashState(state),
      state
    };

    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  restore(snapshotId: string): SandboxStateSnapshot | undefined {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      return undefined;
    }
    return { ...snapshot, createdAt: new Date(snapshot.createdAt) };
  }

  record(entry: SecurityAuditEntry): SecurityAuditEntry {
    this.auditLog.push(entry);
    return entry;
  }

  getAuditLog(): SecurityAuditEntry[] {
    return [...this.auditLog];
  }

  hashState(state: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(state)).digest('hex');
  }
}
