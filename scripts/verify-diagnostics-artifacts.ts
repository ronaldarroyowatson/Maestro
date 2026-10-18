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

function diagnosticsInvalidPipelineWithGovernanceMetadata(): Pipeline {
  const now = new Date();
  return {
    id: 'p-diagnostics-invalid',
    version: '1.0.0',
    contentHash: 'hash-invalid',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    changelog: 'init',
    metadata: {
      name: 'diagnostics-invalid',
      description: 'diagnostics invalid pipeline metadata continuity check',
      tags: [],
      createdAt: now,
      updatedAt: now,
      governanceState: {
        budgetRemaining: 3,
        reserveBudget: 1
      },
      governancePolicy: {
        selectionStrategy: 'weighted'
      },
      providerRoutingWarning: 'seeded-warning'
    } as unknown as Pipeline['metadata'],
    graph: {
      graphId: 'g-diagnostics-invalid',
      nodes: [{ instanceId: 'n1', nodeTypeId: 'trigger', config: { role: 'entry' }, position: { x: 0, y: 0 } }],
      edges: [{ edgeId: 'e-invalid', fromNodeId: 'n1', fromPort: 'out', toNodeId: 'missing-node', toPort: 'in' }]
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
  assertEmittedGovernanceMetadataShape(emittedGovernanceMetadata, {
    expectedSelectedProviderId: policyPreferredProviderId
  });
  if (selectedProviderIdFromRouting !== policyPreferredProviderId) {
    throw new Error('Diagnostics verification failed: routing selection diverged from policy selection baseline.');
  }

  const failureTelemetryPayloads: Array<Record<string, unknown> | undefined> = [];
  const failureBridge = new OttoObservabilityBridge({
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
      emit: async (_eventName, payload) => {
        failureTelemetryPayloads.push(payload);
      }
    }
  });
  const failureConductor = new Conductor({
    promptEngine: prompt,
    contextEngine: context,
    reviewer,
    providerRegistry: {
      run: async (providerId, request) => providerRegistry.run(providerId, request)
    },
    serviceRegistry: new Map([['service', async (_config, executionContext) => String(executionContext.metadata.input ?? '').toUpperCase()]])
  });
  failureBridge.bind(failureConductor.eventBus);
  const failureResult = await failureConductor.run(diagnosticsInvalidPipelineWithGovernanceMetadata(), 'hello');
  await failureBridge.flush();
  if (failureResult.status !== 'failed') {
    throw new Error('Diagnostics verification failed: invalid pipeline did not produce failed result.');
  }
  const failedPayload = failureTelemetryPayloads.find(
    (payload) => typeof payload?.error === 'string' && String(payload.error).includes('Pipeline graph validation failed')
  );
  assertEarlyFailureGovernanceMetadataShape(failedPayload);

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
    earlyFailure: failedPayload,
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

function assertEmittedGovernanceMetadataShape(
  metadata: Record<string, unknown> | undefined,
  options: { expectedSelectedProviderId: string }
): void {
  if (!metadata) {
    throw new Error('Diagnostics verification failed: emitted governance metadata is missing.');
  }

  const selectedProvidersByNode = metadata.selectedProvidersByNode;
  if (!selectedProvidersByNode || typeof selectedProvidersByNode !== 'object') {
    throw new Error('Diagnostics verification failed: emitted metadata selectedProvidersByNode is missing.');
  }
  const selectedN3 = (selectedProvidersByNode as Record<string, unknown>).n3;
  if (selectedN3 !== options.expectedSelectedProviderId) {
    throw new Error('Diagnostics verification failed: emitted metadata selectedProvidersByNode.n3 mismatch.');
  }

  const governanceState = metadata.governanceState;
  if (!governanceState || typeof governanceState !== 'object') {
    throw new Error('Diagnostics verification failed: emitted metadata governanceState is missing.');
  }
  assertGovernanceStateShape(governanceState as ProviderGovernanceState, 'emittedMetadata.governanceState');

  const governancePolicy = metadata.governancePolicy;
  if (!governancePolicy || typeof governancePolicy !== 'object') {
    throw new Error('Diagnostics verification failed: emitted metadata governancePolicy is missing.');
  }
  const policyBudgetRemaining = (governancePolicy as Record<string, unknown>).budgetRemaining;
  if (typeof policyBudgetRemaining !== 'number') {
    throw new Error('Diagnostics verification failed: emitted metadata governancePolicy.budgetRemaining must be a number.');
  }
}

function assertEarlyFailureGovernanceMetadataShape(payload: Record<string, unknown> | undefined): void {
  if (!payload) {
    throw new Error('Diagnostics verification failed: missing telemetry payload for invalid pipeline failure.');
  }
  if (typeof payload.runId !== 'string' || payload.runId.length === 0) {
    throw new Error('Diagnostics verification failed: invalid pipeline runId is missing in failure telemetry.');
  }
  if (payload.pipelineId !== 'p-diagnostics-invalid') {
    throw new Error('Diagnostics verification failed: invalid pipelineId in failure telemetry payload.');
  }
  if (payload.environment !== 'ci' || payload.deploymentChannel !== 'stable' || typeof payload.hostOs !== 'string') {
    throw new Error('Diagnostics verification failed: runtime context metadata is incomplete in failure telemetry payload.');
  }
  if (typeof payload.error !== 'string' || !payload.error.includes('Pipeline graph validation failed')) {
    throw new Error('Diagnostics verification failed: invalid pipeline failure error payload mismatch.');
  }
  const metadata = payload.metadata;
  if (!metadata || typeof metadata !== 'object') {
    throw new Error('Diagnostics verification failed: invalid pipeline failure metadata is missing.');
  }
  const metadataRecord = metadata as Record<string, unknown>;
  if (metadataRecord.providerRoutingWarning !== 'seeded-warning') {
    throw new Error('Diagnostics verification failed: invalid pipeline providerRoutingWarning mismatch.');
  }
  const governanceState = metadataRecord.governanceState;
  if (!governanceState || typeof governanceState !== 'object') {
    throw new Error('Diagnostics verification failed: invalid pipeline governanceState metadata is missing.');
  }
  if ((governanceState as Record<string, unknown>).budgetRemaining !== 3) {
    throw new Error('Diagnostics verification failed: invalid pipeline governanceState budget mismatch.');
  }
}
