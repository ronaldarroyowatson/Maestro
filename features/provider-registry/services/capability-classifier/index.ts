import type {
  AgentDescriptor,
  CapabilityProfile,
  DiscoveryResourceRecord,
  ResourceCapabilityTag,
  ResourceHealthRecord,
  ResourceLifecycleStatus,
  ResourcePerformanceSnapshot
} from '../../../../src/shared/index.js';

export type ClassificationKind = 'model' | 'agent' | 'mcp' | 'tool' | 'api' | 'resource' | 'runtime';

export interface ResourceCandidate {
  resourceId: string;
  name: string;
  kind: ClassificationKind;
  version?: string;
  source: DiscoveryResourceRecord['source'];
  capabilities?: string[];
  status?: ResourceLifecycleStatus;
  metadata?: Record<string, unknown>;
  healthScore?: number;
}

export class CapabilityClassifier {
  classifyDescriptor(descriptor: AgentDescriptor): CapabilityProfile {
    const tags = this.normalizeCapabilities(descriptor.capabilities ?? []);
    return {
      capabilityId: descriptor.descriptorId,
      name: descriptor.displayName,
      category: this.primaryCategory(tags),
      tags,
      confidence: Math.min(1, Math.max(0.4, 0.55 + tags.length * 0.08)),
      source: 'discovery',
      lastUpdatedAt: new Date()
    };
  }

  classifyResource(resource: ResourceCandidate): DiscoveryResourceRecord {
    const tags = this.normalizeCapabilities(resource.capabilities ?? []);
    const status = resource.status ?? 'current';
    return {
      resourceId: resource.resourceId,
      kind: resource.kind,
      name: resource.name,
      version: resource.version,
      source: resource.source,
      capabilities: tags,
      status,
      healthScore: resource.healthScore ?? 0.8,
      lastSeenAt: new Date(),
      metadata: resource.metadata ?? {}
    };
  }

  classifyMany(resources: ResourceCandidate[]): { profiles: CapabilityProfile[]; records: DiscoveryResourceRecord[] } {
    const profiles = resources.map((resource) => this.classifyDescriptor({
      descriptorId: resource.resourceId,
      providerId: resource.source,
      modelId: resource.resourceId,
      displayName: resource.name,
      capabilities: resource.capabilities ?? []
    }));

    const records = resources.map((resource) => this.classifyResource(resource));
    return { profiles, records };
  }

  private normalizeCapabilities(capabilities: string[]): ResourceCapabilityTag[] {
    const tokenMap: Record<string, ResourceCapabilityTag> = {
      coding: 'coding',
      code: 'coding',
      research: 'research',
      vision: 'vision',
      reasoning: 'reasoning',
      multimodal: 'multimodal',
      local: 'local',
      cloud: 'cloud',
      offline: 'offline',
      'fast inference': 'fast_inference',
      'fast-inference': 'fast_inference',
      'long context': 'long_context',
      'long-context': 'long_context',
      'large memory': 'large_memory',
      'large-memory': 'large_memory',
      'model context': 'long_context',
      query: 'research'
    };

    const seen = new Set<ResourceCapabilityTag>();
    for (const capability of capabilities) {
      const key = capability.toLowerCase();
      const tag = tokenMap[key];
      if (tag) {
        seen.add(tag);
      }
    }

    if (seen.size === 0) {
      return ['reasoning'];
    }

    return Array.from(seen);
  }

  private primaryCategory(tags: ResourceCapabilityTag[]): CapabilityProfile['category'] {
    if (tags.includes('vision')) return 'vision';
    if (tags.includes('coding')) return 'coding';
    if (tags.includes('research')) return 'research';
    if (tags.includes('multimodal')) return 'multimodal';
    if (tags.includes('reasoning')) return 'reasoning';
    return 'local';
  }
}

export class ResourceRegistry {
  private readonly resources = new Map<string, DiscoveryResourceRecord>();
  private readonly performanceByResourceId = new Map<string, ResourcePerformanceSnapshot>();
  private readonly healthByResourceId = new Map<string, ResourceHealthRecord>();

  upsert(record: DiscoveryResourceRecord): DiscoveryResourceRecord {
    const next = {
      ...record,
      lastSeenAt: record.lastSeenAt ?? new Date()
    };
    this.resources.set(record.resourceId, next);
    return next;
  }

  list(): DiscoveryResourceRecord[] {
    return Array.from(this.resources.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  get(resourceId: string): DiscoveryResourceRecord | undefined {
    return this.resources.get(resourceId);
  }

  getPerformance(resourceId: string): ResourcePerformanceSnapshot | undefined {
    return this.performanceByResourceId.get(resourceId);
  }

  getHealth(resourceId: string): ResourceHealthRecord | undefined {
    return this.healthByResourceId.get(resourceId);
  }

  recordPerformance(snapshot: ResourcePerformanceSnapshot): ResourcePerformanceSnapshot {
    const next = {
      ...snapshot,
      observedAt: snapshot.observedAt ?? new Date()
    };

    this.performanceByResourceId.set(snapshot.resourceId, next);
    const existing = this.get(snapshot.resourceId);
    if (existing) {
      const blendedHealth = Math.min(1, Math.max(0, (next.successRate * 0.75) + (existing.healthScore * 0.25)));
      this.resources.set(snapshot.resourceId, {
        ...existing,
        healthScore: Number(blendedHealth.toFixed(4))
      });
    }

    return next;
  }

  recordHealth(record: ResourceHealthRecord): ResourceHealthRecord {
    const next = {
      ...record,
      updatedAt: record.updatedAt ?? new Date()
    };

    this.healthByResourceId.set(record.resourceId, next);
    const existing = this.get(record.resourceId);
    if (existing) {
      const healthScore = record.healthy ? 0.9 : 0.2;
      this.resources.set(record.resourceId, {
        ...existing,
        status: record.status,
        healthScore: Number((existing.healthScore * 0.4 + healthScore * 0.6).toFixed(4))
      });
    }

    return next;
  }

  selectBestMatch(
    requestedCapabilities: ResourceCapabilityTag[],
    options: {
      minHealthScore?: number;
      minSuccessRate?: number;
      allowUnhealthy?: boolean;
      maxCost?: number;
    } = {}
  ): DiscoveryResourceRecord | undefined {
    const requested = new Set(requestedCapabilities);
    const candidates = this.list().filter((record) => {
      if (record.status === 'missing' || record.status === 'broken') {
        return false;
      }
      if (options.minHealthScore !== undefined && record.healthScore < options.minHealthScore) {
        return false;
      }
      const performance = this.getPerformance(record.resourceId);
      if (options.minSuccessRate !== undefined && (performance?.successRate ?? record.healthScore) < options.minSuccessRate) {
        return false;
      }
      if (options.maxCost !== undefined && performance?.cost !== undefined && performance.cost > options.maxCost) {
        return false;
      }
      const health = this.getHealth(record.resourceId);
      if (!options.allowUnhealthy && health && !health.healthy) {
        return false;
      }
      return true;
    });

    if (candidates.length === 0) {
      return undefined;
    }

    return candidates.sort((left, right) => {
      const leftScore = this.scoreCandidate(left, requested);
      const rightScore = this.scoreCandidate(right, requested);
      return rightScore - leftScore;
    })[0];
  }

  private scoreCandidate(record: DiscoveryResourceRecord, requested: Set<ResourceCapabilityTag>): number {
    const capabilityOverlap = requested.size === 0
      ? 0.5
      : record.capabilities.reduce((total, tag) => total + (requested.has(tag) ? 2 : 0), 0) / requested.size;

    const performance = this.getPerformance(record.resourceId);
    const successRate = performance?.successRate ?? record.healthScore;
    const costPenalty = performance?.cost !== undefined ? Math.min(0.2, performance.cost / 20) : 0;
    const health = this.getHealth(record.resourceId);
    const healthyBoost = health?.healthy ? 0.6 : 0;
    const statusPenalty = record.status === 'deprecated' ? -0.8 : record.status === 'update_available' ? -0.2 : 0;

    return (capabilityOverlap * 2) + successRate + healthyBoost + (record.healthScore * 0.5) + statusPenalty - costPenalty;
  }

  applyClassification(descriptor: AgentDescriptor, overrides: Partial<ResourceCandidate> = {}): DiscoveryResourceRecord {
    const classifier = new CapabilityClassifier();
    const candidate: ResourceCandidate = {
      resourceId: descriptor.descriptorId,
      name: descriptor.displayName,
      kind: 'agent',
      version: undefined,
      source: 'local',
      capabilities: descriptor.capabilities,
      status: 'current',
      metadata: { providerId: descriptor.providerId, modelId: descriptor.modelId },
      healthScore: 0.9,
      ...overrides
    };

    const record = classifier.classifyResource(candidate);
    return this.upsert(record);
  }
}
