import type { AgentDescriptor, InferenceRequest, InferenceResponse, ProviderAdapter, ProviderHealth } from '../../../../../src/shared/index.js';

export interface AzureOpenAiAdapterOptions {
  endpoint: string;
  deploymentName: string;
  apiKey: string;
  apiVersion: string;
}

/** Provider adapter for Azure OpenAI chat completions. */
export class AzureOpenAiAdapter implements ProviderAdapter {
  readonly providerId = 'azure-openai';
  readonly displayName = 'Azure OpenAI';

  constructor(private readonly options: AzureOpenAiAdapterOptions) {}

  async discover(): Promise<AgentDescriptor[]> {
    return [
      {
        descriptorId: `azure-openai:${this.options.deploymentName}`,
        providerId: this.providerId,
        modelId: this.options.deploymentName,
        displayName: this.options.deploymentName,
        capabilities: ['text-generation', 'chat']
      }
    ];
  }

  async run(request: InferenceRequest): Promise<InferenceResponse> {
    const deployment = request.agentDescriptorId.split(':')[1] ?? this.options.deploymentName;
    const started = Date.now();
    const url = `${this.options.endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${this.options.apiVersion}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': this.options.apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
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
      const url = `${this.options.endpoint}/openai/deployments/${this.options.deploymentName}/chat/completions?api-version=${this.options.apiVersion}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': this.options.apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 })
      });
      return {
        status: response.ok ? 'healthy' : 'degraded',
        latencyMs: Date.now() - started,
        message: response.ok ? 'Azure OpenAI reachable' : `HTTP ${response.status}`
      };
    } catch (error) {
      return { status: 'unreachable', latencyMs: Date.now() - started, message: String(error) };
    }
  }
}
