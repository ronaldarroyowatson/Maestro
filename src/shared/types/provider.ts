import type { JSONSchema } from './nodes.js';

/** Discoverable model/agent descriptor provided by an adapter. */
export interface AgentDescriptor {
  descriptorId: string;
  providerId: string;
  modelId: string;
  displayName: string;
  capabilities: string[];
  contextWindow?: number;
}

/** Cached provider discovery catalog. */
export interface AgentCatalog {
  entries: AgentDescriptor[];
  lastDiscoveredAt: Date;
}

/** Tool schema exposed to inference providers. */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

/** Unified inference request sent to providers. */
export interface InferenceRequest {
  agentDescriptorId: string;
  prompt: string;
  context: string;
  tools?: ToolDefinition[];
  maxTokens?: number;
  imageBuffer?: Buffer;
}

/** Unified inference response received from providers. */
export interface InferenceResponse {
  text: string;
  tokensUsed: number;
  latencyMs: number;
  confidence?: number;
  rawResponse: unknown;
}

/** Provider liveness and latency health response. */
export interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'unreachable';
  latencyMs: number;
  message?: string;
}

/** Adapter boundary interface implemented by all providers. */
export interface ProviderAdapter {
  providerId: string;
  displayName: string;
  discover(): Promise<AgentDescriptor[]>;
  run(request: InferenceRequest): Promise<InferenceResponse>;
  healthCheck(): Promise<ProviderHealth>;
}
