import type { AgentDescriptor, InferenceRequest, InferenceResponse, ProviderAdapter, ProviderHealth } from '../../../../../src/shared/index.js';

export interface OllamaAdapterOptions {
  baseUrl?: string;
}

/** Provider adapter for local Ollama server. */
export class OllamaAdapter implements ProviderAdapter {
  readonly providerId = 'ollama';
  readonly displayName = 'Ollama';
  private readonly baseUrl: string;

  constructor(options: OllamaAdapterOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'http://localhost:11434';
  }

  async discover(): Promise<AgentDescriptor[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    const payload = (await response.json()) as { models?: Array<{ name: string; details?: { parameter_size?: string } }> };
    return (payload.models ?? []).map((model) => ({
      descriptorId: `ollama:${model.name}`,
      providerId: this.providerId,
      modelId: model.name,
      displayName: model.name,
      capabilities: ['text-generation', 'chat']
    }));
  }

  async run(request: InferenceRequest): Promise<InferenceResponse> {
    const modelId = request.agentDescriptorId.split(':')[1] ?? request.agentDescriptorId;
    const started = Date.now();
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: `${request.context}\n\n${request.prompt}` }],
        stream: false
      })
    });
    const payload = (await response.json()) as { message?: { content?: string }; prompt_eval_count?: number };

    return {
      text: payload.message?.content ?? '',
      tokensUsed: payload.prompt_eval_count ?? 0,
      latencyMs: Date.now() - started,
      rawResponse: payload
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/`);
      return {
        status: response.ok ? 'healthy' : 'degraded',
        latencyMs: Date.now() - started,
        message: response.ok ? 'Ollama reachable' : `HTTP ${response.status}`
      };
    } catch (error) {
      return { status: 'unreachable', latencyMs: Date.now() - started, message: String(error) };
    }
  }
}
