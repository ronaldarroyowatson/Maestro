import type { OttoNodeEngineClient } from '../otto-node-engine-integration/index.js';

export interface OttoNodeEngineClientFactoryModule {
  createMaestroClient?: () => OttoNodeEngineClient;
}

export interface OttoNodeEngineClientLoaderResult {
  status: 'available' | 'unavailable';
  moduleName: string;
  client?: OttoNodeEngineClient;
  reason?: string;
}

export interface OttoNodeEngineClientLoaderOptions {
  moduleName?: string;
  importModule?: (moduleName: string) => Promise<unknown>;
}

const DEFAULT_MODULE_NAME = '@otto/node-engine';

export class OttoNodeEngineClientLoader {
  private readonly moduleName: string;
  private readonly importModule: (moduleName: string) => Promise<unknown>;

  constructor(options: OttoNodeEngineClientLoaderOptions = {}) {
    this.moduleName = options.moduleName ?? DEFAULT_MODULE_NAME;
    this.importModule = options.importModule ?? (async (moduleName: string) => import(moduleName));
  }

  async load(): Promise<OttoNodeEngineClientLoaderResult> {
    try {
      const loaded = (await this.importModule(this.moduleName)) as OttoNodeEngineClientFactoryModule;
      if (typeof loaded.createMaestroClient !== 'function') {
        return {
          status: 'unavailable',
          moduleName: this.moduleName,
          reason: `Module '${this.moduleName}' does not export createMaestroClient().`
        };
      }

      return {
        status: 'available',
        moduleName: this.moduleName,
        client: loaded.createMaestroClient()
      };
    } catch (error) {
      return {
        status: 'unavailable',
        moduleName: this.moduleName,
        reason: `Failed to load '${this.moduleName}': ${formatError(error)}`
      };
    }
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Unknown error';
}
