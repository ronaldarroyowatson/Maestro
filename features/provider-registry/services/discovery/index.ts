import type { AgentCatalog, AgentDescriptor, ProviderAdapter } from '../../../../src/shared/index.js';

/** Aggregates model discovery across adapters with TTL caching. */
export class AgentDiscovery {
  private catalog: AgentCatalog = { entries: [], lastDiscoveredAt: new Date(0) };
  private expiresAt = 0;

  constructor(private readonly ttlMs = 5 * 60 * 1000) {}

  /** Refreshes discovery for all adapters in parallel with failure isolation. */
  async refresh(adapters: ProviderAdapter[]): Promise<AgentCatalog> {
    const results = await Promise.all(
      adapters.map(async (adapter) => {
        try {
          return await adapter.discover();
        } catch (error) {
          // Discovery failures must not block startup or other providers.
          console.error(`Provider discovery failed for ${adapter.providerId}`, error);
          return [] as AgentDescriptor[];
        }
      })
    );

    this.catalog = {
      entries: results.flat(),
      lastDiscoveredAt: new Date()
    };
    this.expiresAt = Date.now() + this.ttlMs;
    return this.catalog;
  }

  /** Returns all discovered descriptors, refreshing if cache expired. */
  async getAll(adapters: ProviderAdapter[]): Promise<AgentCatalog> {
    if (Date.now() >= this.expiresAt) {
      return this.refresh(adapters);
    }
    return this.catalog;
  }

  /** Returns descriptors for one provider id. */
  async getByProvider(providerId: string, adapters: ProviderAdapter[]): Promise<AgentDescriptor[]> {
    const catalog = await this.getAll(adapters);
    return catalog.entries.filter((entry) => entry.providerId === providerId);
  }

  /** Returns cached catalog without triggering refresh. */
  getCachedCatalog(): AgentCatalog {
    return this.catalog;
  }
}
