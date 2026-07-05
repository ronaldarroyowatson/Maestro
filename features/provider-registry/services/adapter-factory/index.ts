import type { ProviderAdapter } from '../../../../src/shared/index.js';

/** Factory and registry for provider adapters keyed by provider id. */
export class AdapterFactory {
  private readonly adapters = new Map<string, ProviderAdapter>();

  /** Registers an adapter implementation. */
  register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.providerId, adapter);
  }

  /** Returns adapter by provider id or throws if missing. */
  get(providerId: string): ProviderAdapter {
    const adapter = this.adapters.get(providerId);
    if (!adapter) {
      throw new Error(`Provider adapter not found: ${providerId}`);
    }
    return adapter;
  }

  /** Lists registered provider ids. */
  listRegistered(): string[] {
    return [...this.adapters.keys()];
  }

  /** Lists adapter instances. */
  listAdapters(): ProviderAdapter[] {
    return [...this.adapters.values()];
  }
}
