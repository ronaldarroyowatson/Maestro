import { describe, expect, it } from 'vitest';
import type { Pipeline, ProviderAdapter } from '../../../src/shared/index.js';
import { ContextEngine } from '../../context-engine/index.js';
import { PromptEngine } from '../../prompt-engine/index.js';
import { ProviderRegistry } from '../../provider-registry/index.js';
import { Reviewer } from '../../reviewer/index.js';
import { RulesEngine } from '../../rules-engine/index.js';
import { Conductor } from '../index.js';

function routingPipeline(): Pipeline {
  const now = new Date();
  return {
    id: 'p-routing',
    version: '1.0.0',
    contentHash: 'hash',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    changelog: 'init',
    metadata: { name: 'routing-test', description: 'provider routing test', tags: [], createdAt: now, updatedAt: now },
    graph: {
      graphId: 'g-routing',
      nodes: [
        { instanceId: 'n1', nodeTypeId: 'trigger', config: { role: 'entry' }, position: { x: 0, y: 0 } },
        { instanceId: 'n2', nodeTypeId: 'service', config: {}, position: { x: 1, y: 0 } },
        {
          instanceId: 'n3',
          nodeTypeId: 'agent',
          config: {
            providerId: 'preferred',
            fallbackProviderId: 'alpha',
            agentDescriptorId: 'alpha:model-a',
            promptTemplateId: 't1'
          },
          position: { x: 2, y: 0 }
        },
        { instanceId: 'n4', nodeTypeId: 'trigger', config: { role: 'exit' }, position: { x: 3, y: 0 } },
        { instanceId: 'r1', nodeTypeId: 'reviewer', config: { schema: { type: 'object' }, ruleIds: [], ruleStrategy: 'all', maxRevisionAttempts: 1 }, position: { x: 2, y: 1 } }
      ],
      edges: [
        { edgeId: 'e1', fromNodeId: 'n1', fromPort: 'out', toNodeId: 'n2', toPort: 'in' },
        { edgeId: 'e2', fromNodeId: 'n2', fromPort: 'out', toNodeId: 'n3', toPort: 'in', reviewerNodeId: 'r1' }
      ]
    }
  };
}

function providerAdapter(providerId: string, latencyMs: number): ProviderAdapter {
  return {
    providerId,
    displayName: providerId,
    discover: async () => [],
    run: async () => ({
      text: `response:${providerId}`,
      tokensUsed: 1,
      latencyMs: 1,
      rawResponse: { providerId }
    }),
    healthCheck: async () => ({ status: 'healthy', latencyMs })
  };
}

describe('conductor provider routing integration', () => {
  it('routes agent execution using provider-registry preferred provider snapshot', async () => {
    const prompt = new PromptEngine();
    const context = new ContextEngine();
    const rules = new RulesEngine();
    const reviewer = new Reviewer(rules, prompt);
    prompt.registerTemplate({
      id: 't1',
      version: '1.0.0',
      contentHash: 'h',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      changelog: 'init',
      title: 'routing-template',
      template: 'Echo: {{output}}',
      variables: ['output']
    });

    const providerRegistry = new ProviderRegistry();
    providerRegistry.register(providerAdapter('alpha', 20));
    providerRegistry.register(providerAdapter('beta', 5));

    const routedProviders: string[] = [];

    const conductor = new Conductor({
      promptEngine: prompt,
      contextEngine: context,
      reviewer,
      providerRegistry: {
        run: async (providerId, request) => {
          routedProviders.push(providerId);
          return providerRegistry.run(providerId, request);
        }
      },
      providerRouting: {
        resolvePreferredProviderId: async () =>
          providerRegistry.resolvePreferredProviderId(
            {
              allowedStatuses: ['healthy'],
              maxLatencyMs: 10,
              providerPriority: ['beta', 'alpha']
            },
            ['alpha', 'beta']
          )
      },
      serviceRegistry: new Map([['service', async (_config, executionContext) => String(executionContext.metadata.input ?? '').toUpperCase()]])
    });

    const result = await conductor.run(routingPipeline(), 'hello');

    expect(result.status === 'completed' || result.status === 'partial').toBe(true);
    expect(routedProviders).toContain('beta');
    const agentOutput = result.nodeResults.get('n3')?.output as { text: string } | undefined;
    expect(agentOutput?.text).toBe('response:beta');
  });

  it('recovers from preferred-provider resolver failure using fallback provider', async () => {
    const prompt = new PromptEngine();
    const context = new ContextEngine();
    const rules = new RulesEngine();
    const reviewer = new Reviewer(rules, prompt);
    prompt.registerTemplate({
      id: 't1',
      version: '1.0.0',
      contentHash: 'h',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      changelog: 'init',
      title: 'routing-template',
      template: 'Echo: {{output}}',
      variables: ['output']
    });

    const providerRegistry = new ProviderRegistry();
    providerRegistry.register(providerAdapter('alpha', 20));

    const routedProviders: string[] = [];
    const conductor = new Conductor({
      promptEngine: prompt,
      contextEngine: context,
      reviewer,
      providerRegistry: {
        run: async (providerId, request) => {
          routedProviders.push(providerId);
          return providerRegistry.run(providerId, request);
        }
      },
      providerRouting: {
        resolvePreferredProviderId: async () => {
          throw new Error('health snapshot unavailable');
        }
      },
      serviceRegistry: new Map([['service', async (_config, executionContext) => String(executionContext.metadata.input ?? '').toUpperCase()]])
    });

    const result = await conductor.run(routingPipeline(), 'hello');

    expect(result.status === 'completed' || result.status === 'partial').toBe(true);
    expect(routedProviders).toContain('alpha');
    const agentOutput = result.nodeResults.get('n3')?.output as { text: string } | undefined;
    expect(agentOutput?.text).toBe('response:alpha');
  });

  it('recovers to fallback when orchestration policy excludes all preferred providers', async () => {
    const prompt = new PromptEngine();
    const context = new ContextEngine();
    const rules = new RulesEngine();
    const reviewer = new Reviewer(rules, prompt);
    prompt.registerTemplate({
      id: 't1',
      version: '1.0.0',
      contentHash: 'h',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      changelog: 'init',
      title: 'routing-template',
      template: 'Echo: {{output}}',
      variables: ['output']
    });

    const providerRegistry = new ProviderRegistry();
    providerRegistry.register(providerAdapter('alpha', 20));
    providerRegistry.register(providerAdapter('beta', 30));

    const routedProviders: string[] = [];
    const conductor = new Conductor({
      promptEngine: prompt,
      contextEngine: context,
      reviewer,
      providerRegistry: {
        run: async (providerId, request) => {
          routedProviders.push(providerId);
          return providerRegistry.run(providerId, request);
        }
      },
      providerRouting: {
        resolvePreferredProviderId: async () =>
          providerRegistry.resolvePreferredProviderId(
            {
              allowedStatuses: ['healthy'],
              maxLatencyMs: 5
            },
            ['alpha', 'beta']
          )
      },
      serviceRegistry: new Map([['service', async (_config, executionContext) => String(executionContext.metadata.input ?? '').toUpperCase()]])
    });

    const result = await conductor.run(routingPipeline(), 'hello');

    expect(result.status === 'completed' || result.status === 'partial').toBe(true);
    expect(routedProviders).toContain('alpha');
    expect((result.nodeResults.get('n3')?.output as { text: string } | undefined)?.text).toBe('response:alpha');
  });

  it('uses weighted policy selection for preferred provider routing', async () => {
    const prompt = new PromptEngine();
    const context = new ContextEngine();
    const rules = new RulesEngine();
    const reviewer = new Reviewer(rules, prompt);
    prompt.registerTemplate({
      id: 't1',
      version: '1.0.0',
      contentHash: 'h',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      changelog: 'init',
      title: 'routing-template',
      template: 'Echo: {{output}}',
      variables: ['output']
    });

    const providerRegistry = new ProviderRegistry();
    providerRegistry.register(providerAdapter('alpha', 10));
    providerRegistry.register(providerAdapter('beta', 4));

    const routedProviders: string[] = [];
    const conductor = new Conductor({
      promptEngine: prompt,
      contextEngine: context,
      reviewer,
      providerRegistry: {
        run: async (providerId, request) => {
          routedProviders.push(providerId);
          return providerRegistry.run(providerId, request);
        }
      },
      providerRouting: {
        resolvePreferredProviderId: async () =>
          providerRegistry.resolvePreferredProviderId(
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
          )
      },
      serviceRegistry: new Map([['service', async (_config, executionContext) => String(executionContext.metadata.input ?? '').toUpperCase()]])
    });

    const result = await conductor.run(routingPipeline(), 'hello');

    expect(result.status === 'completed' || result.status === 'partial').toBe(true);
    expect(routedProviders).toContain('alpha');
    expect((result.nodeResults.get('n3')?.output as { text: string } | undefined)?.text).toBe('response:alpha');
  });
});
