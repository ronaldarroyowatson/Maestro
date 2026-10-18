import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Pipeline, ProviderAdapter } from '../src/shared/index.js';
import { Conductor, OttoObservabilityBridge } from '../features/conductor/index.js';
import { ContextEngine } from '../features/context-engine/index.js';
import { PromptEngine } from '../features/prompt-engine/index.js';
import { ProviderRegistry, type ProviderGovernanceState, type ProviderSelectionPolicy } from '../features/provider-registry/index.js';
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
  const basePolicy: ProviderSelectionPolicy = {
    selectionStrategy: 'weighted',
    allowedStatuses: ['healthy'],
    maxLatencyMs: 20,
    providerCostByProviderId: {
      'diag-alpha': 10,
      'diag-beta': 1
    },
    budgetRemaining: 5,
    reserveBudget: 1,
    cooldownUntilByProviderId: {
      'diag-alpha': '2026-10-18T00:10:00.000Z'
    },
    latencyWeight: 1,
    costWeight: 2
  };
  const initialGovernanceState: ProviderGovernanceState = {
    blockedProviderIds: [],
    cooldownUntilByProviderId: {},
    budgetRemaining: 5,
    reserveBudget: 1
  };

  const snapshot = await providerRegistry.getHealthSnapshot(['diag-alpha', 'diag-beta']);
  const firstPolicy = providerRegistry.createSelectionPolicyWithGovernance(
    basePolicy,
    initialGovernanceState,
    new Date('2026-10-18T00:00:00.000Z')
  );
  const policyPreferredProviderId = await providerRegistry.resolvePreferredProviderId(firstPolicy, ['diag-alpha', 'diag-beta']);
  if (!policyPreferredProviderId) {
    throw new Error('Diagnostics verification failed: policyPreferredProviderId is missing.');
  }
  const nextGovernanceState = providerRegistry.createNextGovernanceState({
    previousState: initialGovernanceState,
    policy: firstPolicy,
    selectedProviderId: policyPreferredProviderId,
    evaluatedAt: new Date('2026-10-18T00:00:00.000Z')
  });
  if ((nextGovernanceState.budgetRemaining ?? 0) >= (initialGovernanceState.budgetRemaining ?? 0)) {
    throw new Error('Diagnostics verification failed: governance budget did not decrease after provider selection.');
  }

  const telemetryEvents: string[] = [];
  let emittedGovernanceMetadata: Record<string, unknown> | undefined;
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
      emit: async (eventName, payload) => {
        telemetryEvents.push(eventName);
        if (eventName === 'maestro.pipeline.completed' && payload?.metadata && typeof payload.metadata === 'object') {
          emittedGovernanceMetadata = payload.metadata as Record<string, unknown>;
        }
      }
    }
  });

  const routedProviders: string[] = [];
  let governanceStateForRun: ProviderGovernanceState = initialGovernanceState;
  let governanceStateAfterSelection: ProviderGovernanceState | undefined;
  let selectedProviderIdFromRouting: string | undefined;
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
        resolvePreferredProviderId: async ({ context: executionContext }) => {
          const policy = providerRegistry.createSelectionPolicyWithGovernance(
            basePolicy,
            governanceStateForRun,
            new Date('2026-10-18T00:00:00.000Z')
          );
          executionContext.metadata.governancePolicy = policy;
          executionContext.metadata.governanceState = governanceStateForRun;

          const selectedProviderId = await providerRegistry.resolvePreferredProviderId(policy, ['diag-alpha', 'diag-beta']);
          governanceStateAfterSelection = providerRegistry.createNextGovernanceState({
            previousState: governanceStateForRun,
            policy,
            selectedProviderId,
            evaluatedAt: new Date('2026-10-18T00:00:00.000Z')
          });
          governanceStateForRun = governanceStateAfterSelection;
          selectedProviderIdFromRouting = selectedProviderId;
          executionContext.metadata.governanceState = governanceStateAfterSelection;
          return selectedProviderId;
        }
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
  if (!governanceStateAfterSelection) {
    throw new Error('Diagnostics verification failed: governance state was not captured from routing.');
  }
  assertGovernanceStateShape(initialGovernanceState, 'initialGovernanceState');
  assertGovernanceStateShape(governanceStateAfterSelection, 'governanceStateAfterSelection');
  if (
    !emittedGovernanceMetadata ||
    typeof emittedGovernanceMetadata.selectedProvidersByNode !== 'object' ||
    emittedGovernanceMetadata.selectedProvidersByNode === null
  ) {
    throw new Error('Diagnostics verification failed: missing emitted governance metadata in pipeline completed event.');
  }
  if (selectedProviderIdFromRouting !== policyPreferredProviderId) {
    throw new Error('Diagnostics verification failed: routing selection diverged from policy selection baseline.');
  }

  const diagnosticsDir = path.resolve('dist', 'diagnostics');
  await mkdir(diagnosticsDir, { recursive: true });

  await writeFile(
    path.join(diagnosticsDir, 'provider-health-snapshot.json'),
    `${JSON.stringify(snapshot, null, 2)}\n`,
    'utf8'
  );
  const observabilityTrace = {
    runId: result.runId,
    status: result.status,
    policyPreferredProviderId,
    governanceState: {
      initial: initialGovernanceState,
      afterSelection: governanceStateAfterSelection
    },
    emittedMetadata: emittedGovernanceMetadata,
    telemetryEvents,
    routedProviders
  };
  assertObservabilityTraceShape(observabilityTrace);

  await writeFile(
    path.join(diagnosticsDir, 'observability-trace.json'),
    `${JSON.stringify(observabilityTrace, null, 2)}\n`,
    'utf8'
  );

  console.log(`[diagnostics] wrote artifacts to ${diagnosticsDir}`);
}

await main();

function assertGovernanceStateShape(state: ProviderGovernanceState, label: string): void {
  if (state.budgetRemaining !== undefined && typeof state.budgetRemaining !== 'number') {
    throw new Error(`Diagnostics verification failed: ${label}.budgetRemaining must be a number when defined.`);
  }
  if (state.reserveBudget !== undefined && typeof state.reserveBudget !== 'number') {
    throw new Error(`Diagnostics verification failed: ${label}.reserveBudget must be a number when defined.`);
  }
  if (state.blockedProviderIds !== undefined && !Array.isArray(state.blockedProviderIds)) {
    throw new Error(`Diagnostics verification failed: ${label}.blockedProviderIds must be an array when defined.`);
  }
  if (
    state.cooldownUntilByProviderId !== undefined &&
    (typeof state.cooldownUntilByProviderId !== 'object' || state.cooldownUntilByProviderId === null)
  ) {
    throw new Error(`Diagnostics verification failed: ${label}.cooldownUntilByProviderId must be an object when defined.`);
  }
}

function assertObservabilityTraceShape(trace: {
  runId: string;
  status: string;
  policyPreferredProviderId: string;
  governanceState: { initial: ProviderGovernanceState; afterSelection: ProviderGovernanceState };
  emittedMetadata?: Record<string, unknown>;
  telemetryEvents: string[];
  routedProviders: string[];
}): void {
  if (!trace.runId) {
    throw new Error('Diagnostics verification failed: observability trace runId is missing.');
  }
  if (!Array.isArray(trace.telemetryEvents) || trace.telemetryEvents.length === 0) {
    throw new Error('Diagnostics verification failed: observability trace telemetryEvents is empty.');
  }
  if (!Array.isArray(trace.routedProviders) || trace.routedProviders.length === 0) {
    throw new Error('Diagnostics verification failed: observability trace routedProviders is empty.');
  }
  assertGovernanceStateShape(trace.governanceState.initial, 'observabilityTrace.governanceState.initial');
  assertGovernanceStateShape(trace.governanceState.afterSelection, 'observabilityTrace.governanceState.afterSelection');
}
