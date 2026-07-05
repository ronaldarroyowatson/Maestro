import type { AgentCatalog, InferenceRequest, InferenceResponse, ProviderAdapter, ProviderHealth } from '../../src/shared/index.js';
import { AdapterFactory } from './services/adapter-factory/index.js';
import { AzureOpenAiAdapter, type AzureOpenAiAdapterOptions } from './services/adapters/azure-openai/index.js';
import { LmStudioAdapter, type LmStudioAdapterOptions } from './services/adapters/lm-studio/index.js';
import { McpAdapter, type McpAdapterOptions } from './services/adapters/mcp/index.js';
import { OllamaAdapter, type OllamaAdapterOptions } from './services/adapters/ollama/index.js';
import { OpenAiAdapter, type OpenAiAdapterOptions } from './services/adapters/openai/index.js';
import { PaddleOcrAdapter, type PaddleOcrAdapterOptions } from './services/adapters/paddleocr/index.js';
import { AgentDiscovery } from './services/discovery/index.js';

export type { AdapterRegistration, ArtifactType, PipelineConfig, ProviderRegistryOptions, UpdatePolicy } from './models/types.js';
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
}
