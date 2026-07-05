import type { AgentDescriptor, InferenceRequest, InferenceResponse, ProviderAdapter, ProviderHealth } from '../../../../../src/shared/index.js';

export interface PaddleOcrAdapterOptions {
  containerHost?: string;
  containerPort?: number;
}

/** Provider adapter for external PaddleOCR container service. */
export class PaddleOcrAdapter implements ProviderAdapter {
  readonly providerId = 'paddleocr';
  readonly displayName = 'PaddleOCR';
  private readonly baseUrl: string;

  constructor(options: PaddleOcrAdapterOptions = {}) {
    const host = options.containerHost ?? 'localhost';
    const port = options.containerPort ?? 8100;
    this.baseUrl = `http://${host}:${port}`;
  }

  async discover(): Promise<AgentDescriptor[]> {
    const health = await this.healthCheck();
    if (health.status === 'unreachable') {
      return [];
    }

    return [
      {
        descriptorId: 'paddleocr:paddle-v4',
        providerId: this.providerId,
        modelId: 'paddle-v4',
        displayName: 'PaddleOCR v4',
        capabilities: ['ocr', 'text-detection', 'text-recognition']
      }
    ];
  }

  async run(request: InferenceRequest): Promise<InferenceResponse> {
    const started = Date.now();
    const form = new FormData();
    if (request.imageBuffer) {
      const bytes = new Uint8Array(request.imageBuffer);
      form.append('image', new Blob([bytes], { type: 'image/png' }), 'image.png');
    }
    form.append('context', request.context);
    form.append('prompt', request.prompt);

    const response = await fetch(`${this.baseUrl}/paddle`, {
      method: 'POST',
      body: form
    });

    const payload = (await response.json()) as { text?: string; regions?: unknown[] };
    return {
      text: payload.text ?? '',
      tokensUsed: 0,
      latencyMs: Date.now() - started,
      rawResponse: payload
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return {
        status: response.ok ? 'healthy' : 'degraded',
        latencyMs: Date.now() - started,
        message: response.ok ? 'PaddleOCR reachable' : `HTTP ${response.status}`
      };
    } catch (error) {
      return { status: 'unreachable', latencyMs: Date.now() - started, message: String(error) };
    }
  }
}
