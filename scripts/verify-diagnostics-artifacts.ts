import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Pipeline, ProviderAdapter } from '../src/shared/index.js';
import { Conductor, OttoObservabilityBridge } from '../features/conductor/index.js';
import { ContextEngine } from '../features/context-engine/index.js';
import { PromptEngine } from '../features/prompt-engine/index.js';
import { ProviderRegistry } from '../features/provider-registry/index.js';
import { Reviewer } from '../features/reviewer/index.js';
import { RulesEngine } from '../features/rules-engine/index.js';

function diagnosticsPipeline(): Pipeline {
  const now = new Date();
  return {
    id: 'p-diagnostics',
    version: '1.0.0',
    contentHash: 'hash',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    changelog: 'init',
    metadata: { name: 'diagnostics', description: 'diagnostics verification', tags: [], createdAt: now, updatedAt: now },
    graph: {
      graphId: 'g-diagnostics',
      nodes: [
        { instanceId: 'n1', nodeTypeId: 'trigger', config: { role: 'entry' }, position: { x: 0, y: 0 } },
        { instanceId: 'n2', nodeTypeId: 'service', config: {}, position: { x: 1, y: 0 } },
        {
          instanceId: 'n3',
          nodeTypeId: 'agent',
          config: {
            providerId: 'preferred',
            fallbackProviderId: 'diag-alpha',
            agentDescriptorId: 'diag-alpha:model-a',
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

function adapter(providerId: string, latencyMs: number): ProviderAdapter {
  return {
    providerId,
    displayName: providerId,
    discover: async () => [],
    run: async () => ({
      text: `diag:${providerId}`,
      tokensUsed: 1,
      latencyMs: 1,
      rawResponse: { providerId }
    }),
    healthCheck: async () => ({ status: 'healthy', latencyMs })
  };
}

async function main(): Promise<void> {
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
    title: 'diagnostics-template',
    template: 'Echo: {{output}}',
    variables: ['output']
  });

  const providerRegistry = new ProviderRegistry();
  providerRegistry.register(adapter('diag-alpha', 15));
  providerRegistry.register(adapter('diag-beta', 5));

  const snapshot = await providerRegistry.getHealthSnapshot(['diag-alpha', 'diag-beta']);
  const policyPreferredProviderId = await providerRegistry.resolvePreferredProviderId(
    {
      selectionStrategy: 'weighted',
      allowedStatuses: ['healthy'],
      maxLatencyMs: 20,
      providerCostByProviderId: {
        'diag-alpha': 10,
        'diag-beta': 1
      },
      budgetRemaining: 5,
      reserveBudget: 1,
      evaluationTime: new Date('2026-10-18T00:00:00.000Z'),
      cooldownUntilByProviderId: {
        'diag-alpha': '2026-10-18T00:10:00.000Z'
      },
      latencyWeight: 1,
      costWeight: 2
    },
    ['diag-alpha', 'diag-beta']
  );
  if (!policyPreferredProviderId) {
    throw new Error('Diagnostics verification failed: policyPreferredProviderId is missing.');
  }

  const telemetryEvents: string[] = [];
  const bridge = new OttoObservabilityBridge({
    runtimeContext: {
      environment: 'ci',
      deploymentChannel: 'stable',
      hostOs: process.platform
    },
    logging: {
      info: async () => {},
      error: async () => {}
    },
    tracing: {
      startSpan: async () => ({
        annotate: async () => {},
        end: async () => {}
      })
    },
    telemetry: {
      emit: async (eventName) => {
        telemetryEvents.push(eventName);
      }
    }
  });

  const routedProviders: string[] = [];
  const conductor = new Conductor(
    {
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
              allowedStatuses: ['healthy'],
              maxLatencyMs: 20,
              providerCostByProviderId: {
                'diag-alpha': 10,
                'diag-beta': 1
              },
              budgetRemaining: 5,
              reserveBudget: 1,
              evaluationTime: new Date('2026-10-18T00:00:00.000Z'),
              cooldownUntilByProviderId: {
                'diag-alpha': '2026-10-18T00:10:00.000Z'
              },
              latencyWeight: 1,
              costWeight: 2
            },
            ['diag-alpha', 'diag-beta']
          )
      },
      serviceRegistry: new Map([['service', async (_config, executionContext) => String(executionContext.metadata.input ?? '').toUpperCase()]])
    },
    {
      generateRunId: () => 'run-diagnostics-001'
    }
  );

  bridge.bind(conductor.eventBus);
  const result = await conductor.run(diagnosticsPipeline(), 'hello');
  await bridge.flush();

  if (!(result.status === 'completed' || result.status === 'partial')) {
    throw new Error(`Diagnostics verification failed: conductor run status=${result.status}`);
  }
  if (!telemetryEvents.includes('maestro.pipeline.started') || !telemetryEvents.includes('maestro.pipeline.completed')) {
    throw new Error('Diagnostics verification failed: missing critical observability events.');
  }
  if (!routedProviders.includes(policyPreferredProviderId)) {
    throw new Error('Diagnostics verification failed: policy-preferred provider was not used by conductor routing.');
  }

  const diagnosticsDir = path.resolve('dist', 'diagnostics');
  await mkdir(diagnosticsDir, { recursive: true });

  await writeFile(
    path.join(diagnosticsDir, 'provider-health-snapshot.json'),
    `${JSON.stringify(snapshot, null, 2)}\n`,
    'utf8'
  );
  await writeFile(
    path.join(diagnosticsDir, 'observability-trace.json'),
    `${JSON.stringify(
      {
        runId: result.runId,
        status: result.status,
        policyPreferredProviderId,
        telemetryEvents,
        routedProviders
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  console.log(`[diagnostics] wrote artifacts to ${diagnosticsDir}`);
}

await main();
