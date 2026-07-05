import type { AgentDescriptor, InferenceRequest, InferenceResponse, ProviderAdapter, ProviderHealth } from '../../../../../src/shared/index.js';

export interface LmStudioAdapterOptions {
  baseUrl?: string;
}

/** Provider adapter for LM Studio OpenAI-compatible local server. */
export class LmStudioAdapter implements ProviderAdapter {
  readonly providerId = 'lm-studio';
  readonly displayName = 'LM Studio';
  private readonly baseUrl: string;

  constructor(options: LmStudioAdapterOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'http://localhost:1234';
  }

  async discover(): Promise<AgentDescriptor[]> {
    const response = await fetch(`${this.baseUrl}/v1/models`);
    const payload = (await response.json()) as { data?: Array<{ id: string }> };

    return (payload.data ?? []).map((model) => ({
      descriptorId: `lm-studio:${model.id}`,
      providerId: this.providerId,
      modelId: model.id,
      displayName: model.id,
      capabilities: ['text-generation', 'chat']
    }));
  }

  async run(request: InferenceRequest): Promise<InferenceResponse> {
    const modelId = request.agentDescriptorId.split(':')[1] ?? request.agentDescriptorId;
    const started = Date.now();
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: `${request.context}\n\n${request.prompt}` }]
      })
    });

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };

    return {
      text: payload.choices?.[0]?.message?.content ?? '',
      tokensUsed: payload.usage?.total_tokens ?? 0,
      latencyMs: Date.now() - started,
      rawResponse: payload
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`);
      return {
        status: response.ok ? 'healthy' : 'degraded',
        latencyMs: Date.now() - started,
        message: response.ok ? 'LM Studio reachable' : `HTTP ${response.status}`
      };
    } catch (error) {
      return { status: 'unreachable', latencyMs: Date.now() - started, message: String(error) };
    }
  }
}
