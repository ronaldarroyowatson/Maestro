import type { DetectedResource, DiscoveryScanContext, DiscoveryScanResult, LocalAiDiscoveryService } from '../../index.js';

export interface ContinuousDiscoveryOptions {
  intervalMs: number;
  minIntervalMs?: number;
  maxChangeSetSize?: number;
  autoStart?: boolean;
}

export interface DiscoveryChangeSet {
  added: DetectedResource[];
  updated: DetectedResource[];
  removed: Array<{ id: string; previous: DetectedResource }>;
  unchangedCount: number;
  throttled: boolean;
}

export interface ContinuousDiscoveryEvent {
  reason: string;
  scanNumber: number;
  status: 'complete' | 'failed';
  durationMs: number;
  scannedAt: Date;
  resourceCount: number;
  changeSet: DiscoveryChangeSet;
  error?: string;
}

export interface ContinuousDiscoverySnapshot {
  active: boolean;
  paused: boolean;
  intervalMs: number;
  minIntervalMs: number;
  scanCount: number;
  lastScanAt: Date | null;
  lastScanDurationMs: number | null;
  lastError: string | null;
  pendingTriggerCount: number;
}

interface TimerFunctions {
  setTimeout: (callback: () => void, delay: number) => NodeJS.Timeout;
  clearTimeout: (timeoutId: NodeJS.Timeout) => void;
}

export class ContinuousDiscoveryService {
  private readonly discovery: LocalAiDiscoveryService;
  private readonly timerFns: TimerFunctions;
  private readonly listeners = new Set<(event: ContinuousDiscoveryEvent) => void>();
  private readonly options: Required<Omit<ContinuousDiscoveryOptions, 'autoStart'>> & { autoStart: boolean };
  private timer: NodeJS.Timeout | null = null;
  private context: DiscoveryScanContext = {};
  private active = false;
  private paused = false;
  private scanInProgress = false;
  private pendingTriggerCount = 0;
  private scanCount = 0;
  private lastScanAt: Date | null = null;
  private lastScanDurationMs: number | null = null;
  private lastError: string | null = null;
  private previousResources = new Map<string, DetectedResource>();

  constructor(discovery: LocalAiDiscoveryService, options: ContinuousDiscoveryOptions, timerFns: TimerFunctions = {
    setTimeout: (callback, delay) => setTimeout(callback, delay),
    clearTimeout: (timeoutId) => clearTimeout(timeoutId)
  }) {
    const intervalMs = Math.max(1000, Math.trunc(options.intervalMs));
    const minIntervalMs = Math.max(500, Math.trunc(options.minIntervalMs ?? Math.min(5000, intervalMs)));
    this.discovery = discovery;
    this.timerFns = timerFns;
    this.options = {
      intervalMs,
      minIntervalMs,
      maxChangeSetSize: Math.max(1, Math.trunc(options.maxChangeSetSize ?? 100)),
      autoStart: Boolean(options.autoStart)
    };

    if (this.options.autoStart) {
      void this.start();
    }
  }

  async start(context: DiscoveryScanContext = {}): Promise<void> {
    this.context = context;
    if (this.active) {
      return;
    }

    this.active = true;
    this.paused = false;
    await this.runScan('startup');
    this.scheduleNext(this.options.intervalMs);
  }

  stop(): void {
    this.active = false;
    this.paused = false;
    this.pendingTriggerCount = 0;
    if (this.timer) {
      this.timerFns.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  pause(): void {
    this.paused = true;
    if (this.timer) {
      this.timerFns.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  resume(): void {
    if (!this.active) {
      return;
    }

    this.paused = false;
    this.scheduleNext(this.options.minIntervalMs);
  }

  triggerRescan(reason = 'manual-trigger'): void {
    if (!this.active || this.paused) {
      return;
    }

    this.pendingTriggerCount += 1;
    if (this.timer) {
      this.timerFns.clearTimeout(this.timer);
      this.timer = null;
    }

    if (!this.scanInProgress) {
      this.scheduleNext(this.options.minIntervalMs);
    }
  }

  updateInterval(intervalMs: number): void {
    this.options.intervalMs = Math.max(1000, Math.trunc(intervalMs));
  }

  onEvent(listener: (event: ContinuousDiscoveryEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): ContinuousDiscoverySnapshot {
    return {
      active: this.active,
      paused: this.paused,
      intervalMs: this.options.intervalMs,
      minIntervalMs: this.options.minIntervalMs,
      scanCount: this.scanCount,
      lastScanAt: this.lastScanAt,
      lastScanDurationMs: this.lastScanDurationMs,
      lastError: this.lastError,
      pendingTriggerCount: this.pendingTriggerCount
    };
  }

  private scheduleNext(delayMs: number): void {
    if (!this.active || this.paused) {
      return;
    }

    if (this.timer) {
      this.timerFns.clearTimeout(this.timer);
    }

    this.timer = this.timerFns.setTimeout(() => {
      void this.runScan('scheduled');
    }, Math.max(this.options.minIntervalMs, Math.trunc(delayMs)));
  }

  private async runScan(reason: string): Promise<void> {
    if (!this.active || this.paused) {
      return;
    }

    if (this.scanInProgress) {
      this.pendingTriggerCount += 1;
      return;
    }

    this.scanInProgress = true;
    const startedAtMs = Date.now();
    const nextReason = this.pendingTriggerCount > 0 ? `${reason}+triggered` : reason;
    this.pendingTriggerCount = 0;

    try {
      const result = await this.discovery.scanAll(this.context);
      const changeSet = this.computeChangeSet(result);
      this.scanCount += 1;
      this.lastScanAt = result.scannedAt;
      this.lastScanDurationMs = Date.now() - startedAtMs;
      this.lastError = null;
      this.emit({
        reason: nextReason,
        scanNumber: this.scanCount,
        status: 'complete',
        durationMs: this.lastScanDurationMs,
        scannedAt: result.scannedAt,
        resourceCount: result.resources.length,
        changeSet
      });
    } catch (error) {
      this.scanCount += 1;
      this.lastScanAt = new Date();
      this.lastScanDurationMs = Date.now() - startedAtMs;
      this.lastError = error instanceof Error ? error.message : String(error);
      this.emit({
        reason: nextReason,
        scanNumber: this.scanCount,
        status: 'failed',
        durationMs: this.lastScanDurationMs,
        scannedAt: this.lastScanAt,
        resourceCount: 0,
        changeSet: {
          added: [],
          updated: [],
          removed: [],
          unchangedCount: 0,
          throttled: false
        },
        error: this.lastError
      });
    } finally {
      this.scanInProgress = false;
      if (this.active && !this.paused) {
        if (this.pendingTriggerCount > 0) {
          this.scheduleNext(this.options.minIntervalMs);
        } else {
          this.scheduleNext(this.options.intervalMs);
        }
      }
    }
  }

  private computeChangeSet(result: DiscoveryScanResult): DiscoveryChangeSet {
    const nextResources = new Map(result.resources.map((resource) => [resource.id, resource]));
    const added: DetectedResource[] = [];
    const updated: DetectedResource[] = [];
    const removed: Array<{ id: string; previous: DetectedResource }> = [];
    let unchangedCount = 0;

    for (const [id, resource] of nextResources.entries()) {
      const previous = this.previousResources.get(id);
      if (!previous) {
        added.push(resource);
        continue;
      }

      if (resourceFingerprint(previous) !== resourceFingerprint(resource)) {
        updated.push(resource);
      } else {
        unchangedCount += 1;
      }
    }

    for (const [id, previous] of this.previousResources.entries()) {
      if (!nextResources.has(id)) {
        removed.push({ id, previous });
      }
    }

    this.previousResources = nextResources;
    return this.applyThrottling({
      added,
      updated,
      removed,
      unchangedCount,
      throttled: false
    });
  }

  private applyThrottling(changeSet: DiscoveryChangeSet): DiscoveryChangeSet {
    const limit = this.options.maxChangeSetSize;
    const totalChanges = changeSet.added.length + changeSet.updated.length + changeSet.removed.length;
    if (totalChanges <= limit) {
      return changeSet;
    }

    let remaining = limit;
    const added = changeSet.added.slice(0, remaining);
    remaining -= added.length;
    const updated = changeSet.updated.slice(0, Math.max(0, remaining));
    remaining -= updated.length;
    const removed = changeSet.removed.slice(0, Math.max(0, remaining));

    return {
      ...changeSet,
      added,
      updated,
      removed,
      throttled: true
    };
  }

  private emit(event: ContinuousDiscoveryEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

function resourceFingerprint(resource: DetectedResource): string {
  return JSON.stringify({
    id: resource.id,
    name: resource.name,
    type: resource.type,
    path: resource.path,
    status: resource.status,
    metadata: sortRecord(resource.metadata)
  });
}

function sortRecord(input: Record<string, unknown>): Record<string, unknown> {
  const entries = Object.entries(input).sort(([left], [right]) => left.localeCompare(right));
  const output: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    output[key] = normalizeValue(value);
  }
  return output;
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (value && typeof value === 'object') {
    return sortRecord(value as Record<string, unknown>);
  }

  return value;
}
