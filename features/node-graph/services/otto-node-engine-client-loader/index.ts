import type { OttoNodeEngineClient } from '../otto-node-engine-integration/index.js';

export interface OttoNodeEngineClientFactoryModule {
  createMaestroClient?: () => OttoNodeEngineClient;
  apiVersion?: string;
}

export interface OttoNodeEngineClientLoaderResult {
  status: 'available' | 'unavailable';
  moduleName: string;
  client?: OttoNodeEngineClient;
  reason?: string;
}

export interface OttoNodeEngineClientLoaderOptions {
  moduleName?: string;
  requiredApiVersion?: string;
  importModule?: (moduleName: string) => Promise<unknown>;
}

const DEFAULT_MODULE_NAME = '@otto/node-engine';
const DEFAULT_REQUIRED_API_VERSION = '1.0.0';

export class OttoNodeEngineClientLoader {
  private readonly moduleName: string;
  private readonly requiredApiVersion: string;
  private readonly importModule: (moduleName: string) => Promise<unknown>;

  constructor(options: OttoNodeEngineClientLoaderOptions = {}) {
    this.moduleName = options.moduleName ?? DEFAULT_MODULE_NAME;
    this.requiredApiVersion = options.requiredApiVersion ?? DEFAULT_REQUIRED_API_VERSION;
    this.importModule = options.importModule ?? (async (moduleName: string) => import(moduleName));
  }

  async load(): Promise<OttoNodeEngineClientLoaderResult> {
    try {
      const loaded = (await this.importModule(this.moduleName)) as OttoNodeEngineClientFactoryModule;
      if (!isApiVersionCompatible(loaded.apiVersion, this.requiredApiVersion)) {
        return {
          status: 'unavailable',
          moduleName: this.moduleName,
          reason: `Module '${this.moduleName}' apiVersion '${loaded.apiVersion ?? 'missing'}' is incompatible with required '${this.requiredApiVersion}'.`
        };
      }
      if (typeof loaded.createMaestroClient !== 'function') {
        return {
          status: 'unavailable',
          moduleName: this.moduleName,
          reason: `Module '${this.moduleName}' does not export createMaestroClient().`
        };
      }
      const client = loaded.createMaestroClient();
      if (typeof client.healthCheck === 'function') {
        const health = await client.healthCheck();
        if (!health.ok) {
          return {
            status: 'unavailable',
            moduleName: this.moduleName,
            reason: `Module '${this.moduleName}' health check failed: ${health.details ?? 'unknown failure'}.`
          };
        }
      }

      return {
        status: 'available',
        moduleName: this.moduleName,
        client
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

function isApiVersionCompatible(moduleVersion: string | undefined, requiredVersion: string): boolean {
  if (!moduleVersion) {
    return false;
  }

  return readMajor(moduleVersion) === readMajor(requiredVersion);
}

function readMajor(version: string): number {
  const first = version.split('.')[0];
  const parsed = Number.parseInt(first, 10);
  if (Number.isNaN(parsed)) {
    return -1;
  }
  return parsed;
}
