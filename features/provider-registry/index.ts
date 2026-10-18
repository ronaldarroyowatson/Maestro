import type { AgentCatalog, InferenceRequest, InferenceResponse, ProviderAdapter, ProviderHealth } from '../../src/shared/index.js';
import type { ProviderHealthSnapshot, ProviderSelectionPolicy } from './models/types.js';
import { AdapterFactory } from './services/adapter-factory/index.js';
import { AzureOpenAiAdapter, type AzureOpenAiAdapterOptions } from './services/adapters/azure-openai/index.js';
import { LmStudioAdapter, type LmStudioAdapterOptions } from './services/adapters/lm-studio/index.js';
import { McpAdapter, type McpAdapterOptions } from './services/adapters/mcp/index.js';
import { OllamaAdapter, type OllamaAdapterOptions } from './services/adapters/ollama/index.js';
import { OpenAiAdapter, type OpenAiAdapterOptions } from './services/adapters/openai/index.js';
import { PaddleOcrAdapter, type PaddleOcrAdapterOptions } from './services/adapters/paddleocr/index.js';
import { AgentDiscovery } from './services/discovery/index.js';

export type {
  AdapterRegistration,
  ArtifactType,
  PipelineConfig,
  ProviderHealthEntry,
  ProviderHealthSnapshot,
  ProviderHealthSummary,
  ProviderSelectionPolicy,
  ProviderRegistryOptions,
  UpdatePolicy
} from './models/types.js';
export {
  AzureOpenAiAdapter,
  LmStudioAdapter,
  McpAdapter,
  OllamaAdapter,
  OpenAiAdapter,
  PaddleOcrAdapter
};

export interface ProviderRegistryBootOptions {
  ollama?: OllamaAdapterOptions;
  lmStudio?: LmStudioAdapterOptions;
  openai?: OpenAiAdapterOptions;
  azureOpenai?: AzureOpenAiAdapterOptions;
  mcp?: McpAdapterOptions;
  paddleocr?: PaddleOcrAdapterOptions;
  discoveryTtlMs?: number;
}

/** Provider-registry facade for adapter management and unified inference. */
export class ProviderRegistry {
  readonly adapterFactory: AdapterFactory;
  readonly discovery: AgentDiscovery;
  private lastKnownHealthySnapshot?: ProviderHealthSnapshot;

  constructor(options: ProviderRegistryBootOptions = {}) {
    this.adapterFactory = new AdapterFactory();
    this.discovery = new AgentDiscovery(options.discoveryTtlMs);

    this.adapterFactory.register(new OllamaAdapter(options.ollama));
    this.adapterFactory.register(new LmStudioAdapter(options.lmStudio));

    if (options.openai) {
      this.adapterFactory.register(new OpenAiAdapter(options.openai));
    }
    if (options.azureOpenai) {
      this.adapterFactory.register(new AzureOpenAiAdapter(options.azureOpenai));
    }
    if (options.mcp) {
      this.adapterFactory.register(new McpAdapter(options.mcp));
    }

    this.adapterFactory.register(new PaddleOcrAdapter(options.paddleocr));

    // Startup discovery should run opportunistically and never block construction.
    void this.discovery.refresh(this.adapterFactory.listAdapters());
  }

  /** Registers a custom provider adapter at runtime. */
  register(adapter: ProviderAdapter): void {
    this.adapterFactory.register(adapter);
  }

  /** Refreshes discovery across all registered adapters. */
  async refreshDiscovery(): Promise<AgentCatalog> {
    return this.discovery.refresh(this.adapterFactory.listAdapters());
  }

  /** Returns discovered descriptors for one provider. */
  async listByProvider(providerId: string) {
    return this.discovery.getByProvider(providerId, this.adapterFactory.listAdapters());
  }

  /** Returns full discovered catalog, using TTL cache. */
  async listAll(): Promise<AgentCatalog> {
    return this.discovery.getAll(this.adapterFactory.listAdapters());
  }

  /** Executes inference via specified provider adapter. */
  async run(providerId: string, request: InferenceRequest): Promise<InferenceResponse> {
    return this.adapterFactory.get(providerId).run(request);
  }

  /** Runs provider health check by provider id. */
  async health(providerId: string): Promise<ProviderHealth> {
    return this.adapterFactory.get(providerId).healthCheck();
  }

  /** Returns deterministic provider-health snapshot, optionally scoped to selected providers. */
  async getHealthSnapshot(providerIds?: string[]): Promise<ProviderHealthSnapshot> {
    const providerIdFilter = providerIds ? new Set(providerIds) : undefined;
    const adapters = this.adapterFactory
      .listAdapters()
      .filter((adapter) => !providerIdFilter || providerIdFilter.has(adapter.providerId));

    const entries = await Promise.all(
      adapters.map(async (adapter) => {
        try {
          const health = await adapter.healthCheck();
          return {
            providerId: adapter.providerId,
            displayName: adapter.displayName,
            health
          };
        } catch (error) {
          return {
            providerId: adapter.providerId,
            displayName: adapter.displayName,
            health: {
              status: 'unreachable' as const,
              latencyMs: Number.POSITIVE_INFINITY,
              message: error instanceof Error ? error.message : String(error)
            }
          };
        }
      })
    );

    entries.sort((a, b) => a.providerId.localeCompare(b.providerId));

    const summary = entries.reduce(
      (acc, entry) => {
        acc.total += 1;
        if (entry.health.status === 'healthy') {
          acc.healthy += 1;
        } else if (entry.health.status === 'degraded') {
          acc.degraded += 1;
        } else {
          acc.unreachable += 1;
        }
        return acc;
      },
      { total: 0, healthy: 0, degraded: 0, unreachable: 0 }
    );

    const healthyOrDegraded = entries
      .filter((entry) => entry.health.status === 'healthy' || entry.health.status === 'degraded')
      .sort((a, b) => {
        const latencyDelta = a.health.latencyMs - b.health.latencyMs;
        if (latencyDelta !== 0) {
          return latencyDelta;
        }
        return a.providerId.localeCompare(b.providerId);
      });

    const snapshot: ProviderHealthSnapshot = {
      generatedAt: new Date(),
      entries,
      summary,
      preferredProviderId: healthyOrDegraded[0]?.providerId
    };
    if (snapshot.summary.healthy + snapshot.summary.degraded > 0) {
      this.lastKnownHealthySnapshot = snapshot;
    }
    return snapshot;
  }

  /** Resolves preferred provider id using health snapshot and optional orchestration policy constraints. */
  async resolvePreferredProviderId(policy: ProviderSelectionPolicy = {}, providerIds?: string[]): Promise<string | undefined> {
    const snapshot = await this.getHealthSnapshot(providerIds);
    const allowedStatuses = new Set(policy.allowedStatuses ?? ['healthy', 'degraded']);
    const priorityIndex = new Map((policy.providerPriority ?? []).map((providerId, index) => [providerId, index]));
    const strategy = policy.selectionStrategy ?? 'latency-first';
    const costByProviderId = policy.providerCostByProviderId ?? {};
    const latencyWeight = policy.latencyWeight ?? 1;
    const costWeight = policy.costWeight ?? 1;
    const degradedPenalty = policy.degradedPenalty ?? 5;
    const unknownCostPenalty = policy.unknownCostPenalty ?? 25;

    const candidates = snapshot.entries
      .filter((entry) => {
        if (!allowedStatuses.has(entry.health.status)) {
          return false;
        }
        if (policy.maxLatencyMs !== undefined && entry.health.latencyMs > policy.maxLatencyMs) {
          return false;
        }
        if (policy.maxCost !== undefined) {
          const providerCost = costByProviderId[entry.providerId];
          if (providerCost === undefined || providerCost > policy.maxCost) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (strategy === 'weighted') {
          const aScore = weightedScore(a.providerId, a.health.status, a.health.latencyMs, {
            latencyWeight,
            costWeight,
            degradedPenalty,
            unknownCostPenalty,
            providerCostByProviderId: costByProviderId
          });
          const bScore = weightedScore(b.providerId, b.health.status, b.health.latencyMs, {
            latencyWeight,
            costWeight,
            degradedPenalty,
            unknownCostPenalty,
            providerCostByProviderId: costByProviderId
          });
          if (aScore !== bScore) {
            return aScore - bScore;
          }
        }

        const priorityA = priorityIndex.get(a.providerId);
        const priorityB = priorityIndex.get(b.providerId);

        if (priorityA !== undefined || priorityB !== undefined) {
          if (priorityA === undefined) return 1;
          if (priorityB === undefined) return -1;
          if (priorityA !== priorityB) return priorityA - priorityB;
        }

        const latencyDelta = a.health.latencyMs - b.health.latencyMs;
        if (latencyDelta !== 0) {
          return latencyDelta;
        }
        return a.providerId.localeCompare(b.providerId);
      });

    if (candidates[0]) {
      return candidates[0].providerId;
    }

    if (policy.allowLastKnownHealthySnapshot) {
      return this.resolveFromLastKnownHealthySnapshot(policy, snapshot.generatedAt, providerIds);
    }

    return undefined;
  }

  private resolveFromLastKnownHealthySnapshot(
    policy: ProviderSelectionPolicy,
    currentSnapshotTime: Date,
    providerIds?: string[]
  ): string | undefined {
    if (!this.lastKnownHealthySnapshot) {
      return undefined;
    }

    const maxAgeMs = policy.lastKnownSnapshotMaxAgeMs ?? 300000;
    const snapshotAgeMs = currentSnapshotTime.getTime() - this.lastKnownHealthySnapshot.generatedAt.getTime();
    if (snapshotAgeMs > maxAgeMs) {
      return undefined;
    }

    const providerFilter = providerIds ? new Set(providerIds) : undefined;
    const allowedStatuses = new Set(policy.allowedStatuses ?? ['healthy', 'degraded']);
    const priorityIndex = new Map((policy.providerPriority ?? []).map((providerId, index) => [providerId, index]));
    const strategy = policy.selectionStrategy ?? 'latency-first';
    const costByProviderId = policy.providerCostByProviderId ?? {};
    const latencyWeight = policy.latencyWeight ?? 1;
    const costWeight = policy.costWeight ?? 1;
    const degradedPenalty = policy.degradedPenalty ?? 5;
    const unknownCostPenalty = policy.unknownCostPenalty ?? 25;

    const candidates = this.lastKnownHealthySnapshot.entries
      .filter((entry) => {
        if (providerFilter && !providerFilter.has(entry.providerId)) {
          return false;
        }
        if (!allowedStatuses.has(entry.health.status)) {
          return false;
        }
        if (policy.maxLatencyMs !== undefined && entry.health.latencyMs > policy.maxLatencyMs) {
          return false;
        }
        if (policy.maxCost !== undefined) {
          const providerCost = costByProviderId[entry.providerId];
          if (providerCost === undefined || providerCost > policy.maxCost) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (strategy === 'weighted') {
          const aScore = weightedScore(a.providerId, a.health.status, a.health.latencyMs, {
            latencyWeight,
            costWeight,
            degradedPenalty,
            unknownCostPenalty,
            providerCostByProviderId: costByProviderId
          });
          const bScore = weightedScore(b.providerId, b.health.status, b.health.latencyMs, {
            latencyWeight,
            costWeight,
            degradedPenalty,
            unknownCostPenalty,
            providerCostByProviderId: costByProviderId
          });
          if (aScore !== bScore) {
            return aScore - bScore;
          }
        }

        const priorityA = priorityIndex.get(a.providerId);
        const priorityB = priorityIndex.get(b.providerId);
        if (priorityA !== undefined || priorityB !== undefined) {
          if (priorityA === undefined) return 1;
          if (priorityB === undefined) return -1;
          if (priorityA !== priorityB) return priorityA - priorityB;
        }

        const latencyDelta = a.health.latencyMs - b.health.latencyMs;
        if (latencyDelta !== 0) {
          return latencyDelta;
        }
        return a.providerId.localeCompare(b.providerId);
      });

    return candidates[0]?.providerId;
  }
}

function weightedScore(
  providerId: string,
  status: 'healthy' | 'degraded' | 'unreachable',
  latencyMs: number,
  options: {
    latencyWeight: number;
    costWeight: number;
    degradedPenalty: number;
    unknownCostPenalty: number;
    providerCostByProviderId: Record<string, number>;
  }
): number {
  const providerCost = options.providerCostByProviderId[providerId];
  const costComponent = providerCost === undefined ? options.unknownCostPenalty : providerCost;
  const statusComponent = status === 'degraded' ? options.degradedPenalty : 0;
  return latencyMs * options.latencyWeight + costComponent * options.costWeight + statusComponent;
}
