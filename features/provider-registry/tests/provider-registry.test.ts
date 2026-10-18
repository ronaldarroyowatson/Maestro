import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProviderAdapter } from '../../../src/shared/index.js';
import { AdapterFactory } from '../services/adapter-factory/index.js';
import { AzureOpenAiAdapter } from '../services/adapters/azure-openai/index.js';
import { LmStudioAdapter } from '../services/adapters/lm-studio/index.js';
import { McpAdapter } from '../services/adapters/mcp/index.js';
import { OllamaAdapter } from '../services/adapters/ollama/index.js';
import { OpenAiAdapter } from '../services/adapters/openai/index.js';
import { PaddleOcrAdapter } from '../services/adapters/paddleocr/index.js';
import { AgentDiscovery } from '../services/discovery/index.js';
import { ProviderRegistry } from '../index.js';

function installFetchMock(handlers: Record<string, unknown>) {
  const originalFetch = globalThis.fetch;
  const mockedFetch = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    for (const [suffix, payload] of Object.entries(handlers)) {
      if (url.endsWith(suffix)) {
        return new Response(JSON.stringify(payload), { status: 200 });
      }
    }
    return new Response('{}', { status: 200 });
  });
  globalThis.fetch = mockedFetch as unknown as typeof fetch;

  return {
    mockedFetch,
    restore: () => {
      globalThis.fetch = originalFetch;
    }
  };
}

describe('provider-registry modules', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adapter-factory registers, resolves, and throws on missing provider', () => {
    const factory = new AdapterFactory();
    const adapter: ProviderAdapter = {
      providerId: 'custom',
      displayName: 'Custom',
      discover: async () => [],
      run: async () => ({ text: 'ok', tokensUsed: 0, latencyMs: 1, rawResponse: {} }),
      healthCheck: async () => ({ status: 'healthy', latencyMs: 1 })
    };

    factory.register(adapter);
    expect(factory.get('custom').displayName).toBe('Custom');
    expect(factory.listRegistered()).toContain('custom');
    expect(() => factory.get('missing')).toThrowError(/Provider adapter not found/);
  });

  it('discovery runs in parallel and isolates failures', async () => {
    const discovery = new AgentDiscovery(1000);
    const okA: ProviderAdapter = {
      providerId: 'ok-a',
      displayName: 'OK A',
      discover: async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
        return [{ descriptorId: 'ok-a:m1', providerId: 'ok-a', modelId: 'm1', displayName: 'm1', capabilities: [] }];
      },
      run: async () => ({ text: '', tokensUsed: 0, latencyMs: 0, rawResponse: {} }),
      healthCheck: async () => ({ status: 'healthy', latencyMs: 1 })
    };
    const okB: ProviderAdapter = {
      providerId: 'ok-b',
      displayName: 'OK B',
      discover: async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
        return [{ descriptorId: 'ok-b:m2', providerId: 'ok-b', modelId: 'm2', displayName: 'm2', capabilities: [] }];
      },
      run: async () => ({ text: '', tokensUsed: 0, latencyMs: 0, rawResponse: {} }),
      healthCheck: async () => ({ status: 'healthy', latencyMs: 1 })
    };
    const bad: ProviderAdapter = {
      providerId: 'bad',
      displayName: 'BAD',
      discover: async () => {
        throw new Error('boom');
      },
      run: async () => ({ text: '', tokensUsed: 0, latencyMs: 0, rawResponse: {} }),
      healthCheck: async () => ({ status: 'unreachable', latencyMs: 1 })
    };

    const started = Date.now();
    const catalog = await discovery.refresh([okA, okB, bad]);
    const elapsed = Date.now() - started;

    expect(elapsed).toBeLessThan(150);
    expect(catalog.entries).toHaveLength(2);
    expect(catalog.entries.map((entry) => entry.providerId).sort()).toEqual(['ok-a', 'ok-b']);
  });

  it('ollama adapter discover and run parse responses', async () => {
    const mock = installFetchMock({
      '/api/tags': { models: [{ name: 'llama3.1' }] },
      '/api/chat': { message: { content: 'hello' }, prompt_eval_count: 12 },
      '/': {}
    });

    const adapter = new OllamaAdapter({ baseUrl: 'http://localhost:11434' });
    const models = await adapter.discover();
    const response = await adapter.run({ agentDescriptorId: 'ollama:llama3.1', prompt: 'Say hi', context: 'ctx' });

    expect(models[0].modelId).toBe('llama3.1');
    expect(response.text).toBe('hello');
    expect(response.tokensUsed).toBe(12);
    expect(mock.mockedFetch).toHaveBeenCalled();
    mock.restore();
  });

  it('lm-studio adapter discover and run parse responses', async () => {
    const mock = installFetchMock({
      '/v1/models': { data: [{ id: 'qwen2.5' }] },
      '/v1/chat/completions': { choices: [{ message: { content: 'done' } }], usage: { total_tokens: 22 } }
    });

    const adapter = new LmStudioAdapter({ baseUrl: 'http://localhost:1234' });
    const models = await adapter.discover();
    const response = await adapter.run({ agentDescriptorId: 'lm-studio:qwen2.5', prompt: 'p', context: 'c' });

    expect(models[0].modelId).toBe('qwen2.5');
    expect(response.text).toBe('done');
    expect(response.tokensUsed).toBe(22);
    mock.restore();
  });

  it('openai adapter discover and run parse responses', async () => {
    const mock = installFetchMock({
      '/v1/chat/completions': { choices: [{ message: { content: 'ok' } }], usage: { total_tokens: 15 } },
      '/v1/models': { data: [] }
    });

    const adapter = new OpenAiAdapter({ apiKey: 'k', modelIds: ['gpt-4o'] });
    const models = await adapter.discover();
    const response = await adapter.run({ agentDescriptorId: 'openai:gpt-4o', prompt: 'p', context: 'c' });

    expect(models[0].modelId).toBe('gpt-4o');
    expect(response.text).toBe('ok');
    expect(response.tokensUsed).toBe(15);
    mock.restore();
  });

  it('azure-openai adapter discover and run parse responses', async () => {
    const mock = installFetchMock({
      '/openai/deployments/deploy1/chat/completions?api-version=2024-02-15-preview': {
        choices: [{ message: { content: 'azure-ok' } }],
        usage: { total_tokens: 9 }
      }
    });

    const adapter = new AzureOpenAiAdapter({
      endpoint: 'https://example.openai.azure.com',
      deploymentName: 'deploy1',
      apiKey: 'key',
      apiVersion: '2024-02-15-preview'
    });

    const models = await adapter.discover();
    const response = await adapter.run({ agentDescriptorId: 'azure-openai:deploy1', prompt: 'p', context: 'c' });

    expect(models[0].modelId).toBe('deploy1');
    expect(response.text).toBe('azure-ok');
    expect(response.tokensUsed).toBe(9);
    mock.restore();
  });

  it('mcp adapter discover and run parse responses', async () => {
    const mock = installFetchMock({
      '/agents': { agents: [{ id: 'agent-a', name: 'Agent A', capabilities: ['chat'] }] },
      '/sample': { text: 'sampled', usage: { totalTokens: 7 } },
      '/health': {}
    });

    const adapter = new McpAdapter({ mcpServers: [{ url: 'http://mcp.local', name: 'srv1' }] });
    const models = await adapter.discover();
    const response = await adapter.run({ agentDescriptorId: 'mcp:srv1:agent-a', prompt: 'p', context: 'c' });

    expect(models[0].descriptorId).toBe('mcp:srv1:agent-a');
    expect(response.text).toBe('sampled');
    expect(response.tokensUsed).toBe(7);
    mock.restore();
  });

  it('paddleocr adapter discover and run parse responses', async () => {
    const mock = installFetchMock({
      '/health': {},
      '/paddle': { text: 'ocr-output', regions: [{ x: 1, y: 2 }] }
    });

    const adapter = new PaddleOcrAdapter({ containerHost: 'localhost', containerPort: 8100 });
    const models = await adapter.discover();
    const response = await adapter.run({
      agentDescriptorId: 'paddleocr:paddle-v4',
      prompt: 'p',
      context: 'c',
      imageBuffer: Buffer.from([1, 2, 3])
    });

    expect(models[0].modelId).toBe('paddle-v4');
    expect(response.text).toBe('ocr-output');
    expect(response.rawResponse).toEqual({ text: 'ocr-output', regions: [{ x: 1, y: 2 }] });
    mock.restore();
  });

  it('provider-registry health snapshot is deterministic and isolates adapter failures', async () => {
    const registry = new ProviderRegistry();

    const alpha: ProviderAdapter = {
      providerId: 'alpha',
      displayName: 'Alpha',
      discover: async () => [],
      run: async () => ({ text: 'ok', tokensUsed: 0, latencyMs: 1, rawResponse: {} }),
      healthCheck: async () => ({ status: 'healthy', latencyMs: 12 })
    };
    const beta: ProviderAdapter = {
      providerId: 'beta',
      displayName: 'Beta',
      discover: async () => [],
      run: async () => ({ text: 'ok', tokensUsed: 0, latencyMs: 1, rawResponse: {} }),
      healthCheck: async () => ({ status: 'healthy', latencyMs: 12 })
    };
    const gamma: ProviderAdapter = {
      providerId: 'gamma',
      displayName: 'Gamma',
      discover: async () => [],
      run: async () => ({ text: 'ok', tokensUsed: 0, latencyMs: 1, rawResponse: {} }),
      healthCheck: async () => {
        throw new Error('network unavailable');
      }
    };

    registry.register(alpha);
    registry.register(beta);
    registry.register(gamma);

    const snapshot = await registry.getHealthSnapshot(['gamma', 'beta', 'alpha']);

    expect(snapshot.entries.map((entry) => entry.providerId)).toEqual(['alpha', 'beta', 'gamma']);
    expect(snapshot.summary).toEqual({
      total: 3,
      healthy: 2,
      degraded: 0,
      unreachable: 1
    });
    expect(snapshot.preferredProviderId).toBe('alpha');
    expect(snapshot.entries.find((entry) => entry.providerId === 'gamma')?.health.message).toContain('network unavailable');
  });

  it('resolvePreferredProviderId enforces orchestration policy constraints', async () => {
    const registry = new ProviderRegistry();

    registry.register({
      providerId: 'alpha',
      displayName: 'Alpha',
      discover: async () => [],
      run: async () => ({ text: 'ok', tokensUsed: 0, latencyMs: 1, rawResponse: {} }),
      healthCheck: async () => ({ status: 'degraded', latencyMs: 6 })
    });
    registry.register({
      providerId: 'beta',
      displayName: 'Beta',
      discover: async () => [],
      run: async () => ({ text: 'ok', tokensUsed: 0, latencyMs: 1, rawResponse: {} }),
      healthCheck: async () => ({ status: 'healthy', latencyMs: 15 })
    });
    registry.register({
      providerId: 'gamma',
      displayName: 'Gamma',
      discover: async () => [],
      run: async () => ({ text: 'ok', tokensUsed: 0, latencyMs: 1, rawResponse: {} }),
      healthCheck: async () => ({ status: 'healthy', latencyMs: 8 })
    });

    const preferredFromPolicy = await registry.resolvePreferredProviderId(
      {
        allowedStatuses: ['healthy'],
        maxLatencyMs: 10,
        providerPriority: ['gamma', 'beta']
      },
      ['alpha', 'beta', 'gamma']
    );

    expect(preferredFromPolicy).toBe('gamma');
  });

  it('resolvePreferredProviderId returns undefined when policy excludes all providers', async () => {
    const registry = new ProviderRegistry();

    registry.register({
      providerId: 'alpha',
      displayName: 'Alpha',
      discover: async () => [],
      run: async () => ({ text: 'ok', tokensUsed: 0, latencyMs: 1, rawResponse: {} }),
      healthCheck: async () => ({ status: 'degraded', latencyMs: 50 })
    });
    registry.register({
      providerId: 'beta',
      displayName: 'Beta',
      discover: async () => [],
      run: async () => ({ text: 'ok', tokensUsed: 0, latencyMs: 1, rawResponse: {} }),
      healthCheck: async () => ({ status: 'healthy', latencyMs: 40 })
    });

    const preferredFromPolicy = await registry.resolvePreferredProviderId(
      {
        allowedStatuses: ['healthy'],
        maxLatencyMs: 20
      },
      ['alpha', 'beta']
    );

    expect(preferredFromPolicy).toBeUndefined();
  });

  it('resolvePreferredProviderId supports weighted latency/cost strategy', async () => {
    const registry = new ProviderRegistry();

    registry.register({
      providerId: 'alpha',
      displayName: 'Alpha',
      discover: async () => [],
      run: async () => ({ text: 'ok', tokensUsed: 0, latencyMs: 1, rawResponse: {} }),
      healthCheck: async () => ({ status: 'healthy', latencyMs: 10 })
    });
    registry.register({
      providerId: 'beta',
      displayName: 'Beta',
      discover: async () => [],
      run: async () => ({ text: 'ok', tokensUsed: 0, latencyMs: 1, rawResponse: {} }),
      healthCheck: async () => ({ status: 'healthy', latencyMs: 4 })
    });

    const preferredFromPolicy = await registry.resolvePreferredProviderId(
      {
        selectionStrategy: 'weighted',
        providerCostByProviderId: {
          alpha: 1,
          beta: 10
        },
        latencyWeight: 1,
        costWeight: 3
      },
      ['alpha', 'beta']
    );

    expect(preferredFromPolicy).toBe('alpha');
  });

  it('resolvePreferredProviderId excludes unknown-cost providers when maxCost is configured', async () => {
    const registry = new ProviderRegistry();

    registry.register({
      providerId: 'alpha',
      displayName: 'Alpha',
      discover: async () => [],
      run: async () => ({ text: 'ok', tokensUsed: 0, latencyMs: 1, rawResponse: {} }),
      healthCheck: async () => ({ status: 'healthy', latencyMs: 10 })
    });
    registry.register({
      providerId: 'beta',
      displayName: 'Beta',
      discover: async () => [],
      run: async () => ({ text: 'ok', tokensUsed: 0, latencyMs: 1, rawResponse: {} }),
      healthCheck: async () => ({ status: 'healthy', latencyMs: 5 })
    });

    const preferredFromPolicy = await registry.resolvePreferredProviderId(
      {
        selectionStrategy: 'weighted',
        providerCostByProviderId: {
          beta: 3
        },
        maxCost: 5
      },
      ['alpha', 'beta']
    );

    expect(preferredFromPolicy).toBe('beta');
  });
});
