import type { AgentDescriptor, InferenceRequest, InferenceResponse, ProviderAdapter, ProviderHealth } from '../../../../../src/shared/index.js';

export interface OpenAiAdapterOptions {
  apiKey: string;
  organizationId?: string;
  modelIds: string[];
  baseUrl?: string;
}

/** Provider adapter for remote OpenAI APIs. */
export class OpenAiAdapter implements ProviderAdapter {
  readonly providerId = 'openai';
  readonly displayName = 'OpenAI';
  private readonly options: OpenAiAdapterOptions;

  constructor(options: OpenAiAdapterOptions) {
    this.options = { ...options, baseUrl: options.baseUrl ?? 'https://api.openai.com' };
  }

  async discover(): Promise<AgentDescriptor[]> {
    return this.options.modelIds.map((modelId) => ({
      descriptorId: `openai:${modelId}`,
      providerId: this.providerId,
      modelId,
      displayName: modelId,
      capabilities: ['text-generation', 'chat', 'vision']
    }));
  }

  async run(request: InferenceRequest): Promise<InferenceResponse> {
    const modelId = request.agentDescriptorId.split(':')[1] ?? this.options.modelIds[0];
    const started = Date.now();

    const imageContent = request.imageBuffer
      ? [{ type: 'image_url', image_url: { url: `data:image/png;base64,${request.imageBuffer.toString('base64')}` } }]
      : [];

    const response = await fetch(`${this.options.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.options.apiKey}`,
        'content-type': 'application/json',
        ...(this.options.organizationId ? { 'OpenAI-Organization': this.options.organizationId } : {})
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: 'user',
            content: imageContent.length > 0 ? [{ type: 'text', text: `${request.context}\n\n${request.prompt}` }, ...imageContent] : `${request.context}\n\n${request.prompt}`
          }
        ]
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
      const response = await fetch(`${this.options.baseUrl}/v1/models`, {
        headers: {
          authorization: `Bearer ${this.options.apiKey}`,
          ...(this.options.organizationId ? { 'OpenAI-Organization': this.options.organizationId } : {})
        }
      });
      return {
        status: response.ok ? 'healthy' : 'degraded',
        latencyMs: Date.now() - started,
        message: response.ok ? 'OpenAI reachable' : `HTTP ${response.status}`
      };
    } catch (error) {
      return { status: 'unreachable', latencyMs: Date.now() - started, message: String(error) };
    }
  }
}
