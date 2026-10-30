import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export type HistoryEngineOptions = {
  storagePath?: string;
};

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
  private readonly storagePath?: string;

  constructor(options: HistoryEngineOptions = {}) {
    this.storagePath = options.storagePath ? resolve(options.storagePath) : undefined;
    this.loadState();
  }

  private loadState(): void {
    if (!this.storagePath || !existsSync(this.storagePath)) {
      return;
    }

    try {
      const content = readFileSync(this.storagePath, 'utf8');
      if (!content.trim()) {
        return;
      }

      const parsed = JSON.parse(content) as {
        snapshots?: Array<SandboxStateSnapshot & { createdAt: string }>;
        auditLog?: Array<SecurityAuditEntry & { timestamp: string }>;
      };

      this.snapshots.clear();
      for (const snapshot of parsed.snapshots ?? []) {
        this.snapshots.set(snapshot.id, {
          ...snapshot,
          createdAt: new Date(snapshot.createdAt)
        });
      }

      this.auditLog.length = 0;
      this.auditLog.push(
        ...(parsed.auditLog ?? []).map((entry) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }))
      );
    } catch {
      // Ignore corrupt persisted history and start cleanly.
    }
  }

  private persistState(): void {
    if (!this.storagePath) {
      return;
    }

    try {
      mkdirSync(dirname(this.storagePath), { recursive: true });
      const existing = this.tryReadMergedState();
      const state = {
        ...existing,
        snapshots: [...this.snapshots.values()].map((snapshot) => ({
          ...snapshot,
          createdAt: snapshot.createdAt.toISOString()
        })),
        auditLog: this.auditLog.map((entry) => ({
          ...entry,
          timestamp: entry.timestamp.toISOString()
        }))
      };
      writeFileSync(this.storagePath, JSON.stringify(state, null, 2));
    } catch {
      // Ignore disk-write failures and keep runtime behavior deterministic in-memory.
    }
  }

  private tryReadMergedState(): Record<string, unknown> {
    if (!this.storagePath || !existsSync(this.storagePath)) {
      return {};
    }

    try {
      const content = readFileSync(this.storagePath, 'utf8');
      if (!content.trim()) {
        return {};
      }
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  snapshot(label: string, state: Record<string, unknown>): SandboxStateSnapshot {
    const snapshot: SandboxStateSnapshot = {
      id: `snapshot-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      label,
      createdAt: new Date(),
      checksum: this.hashState(state),
      state
    };

    this.snapshots.set(snapshot.id, snapshot);
    this.persistState();
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
    this.persistState();
    return entry;
  }

  getAuditLog(): SecurityAuditEntry[] {
    return [...this.auditLog];
  }

  hashState(state: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(state)).digest('hex');
  }
}
