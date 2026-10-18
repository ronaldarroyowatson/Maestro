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

function diagnosticsInvalidCyclePipelineWithGovernanceMetadata(): Pipeline {
  const now = new Date();
  return {
    id: 'p-diagnostics-invalid-cycle',
    version: '1.0.0',
    contentHash: 'hash-invalid-cycle',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    changelog: 'init',
    metadata: {
      name: 'diagnostics-invalid-cycle',
      description: 'diagnostics invalid cycle pipeline metadata continuity check',
      tags: [],
      createdAt: now,
      updatedAt: now,
      governanceState: {
        budgetRemaining: 2,
        reserveBudget: 1
      },
      governancePolicy: {
        selectionStrategy: 'latency-first'
      },
      providerRoutingWarning: 'seeded-cycle-warning'
    } as unknown as Pipeline['metadata'],
    graph: {
      graphId: 'g-diagnostics-invalid-cycle',
      nodes: [
        { instanceId: 'n1', nodeTypeId: 'trigger', config: { role: 'entry' }, position: { x: 0, y: 0 } },
        { instanceId: 'n2', nodeTypeId: 'service', config: {}, position: { x: 1, y: 0 } }
      ],
      edges: [
        { edgeId: 'e1', fromNodeId: 'n1', fromPort: 'out', toNodeId: 'n2', toPort: 'in' },
        { edgeId: 'e2', fromNodeId: 'n2', fromPort: 'out', toNodeId: 'n1', toPort: 'in' }
      ]
    }
  };
}

function diagnosticsRuntimeFailurePipelineWithGovernanceMetadata(): Pipeline {
  const now = new Date();
  return {
    id: 'p-diagnostics-runtime-failure',
    version: '1.0.0',
    contentHash: 'hash-runtime-failure',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    changelog: 'init',
    metadata: {
      name: 'diagnostics-runtime-failure',
      description: 'runtime service failure telemetry checks',
      tags: [],
      createdAt: now,
      updatedAt: now,
      governanceState: {
        budgetRemaining: 4,
        reserveBudget: 1
      },
      governancePolicy: {
        selectionStrategy: 'weighted'
      },
      providerRoutingWarning: 'seeded-runtime-warning'
    } as unknown as Pipeline['metadata'],
    graph: {
      graphId: 'g-diagnostics-runtime-failure',
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

function diagnosticsRuntimeRetryExhaustionMixedOutcomePipelineWithGovernanceMetadata(): Pipeline {
  const now = new Date();
  return {
    id: 'p-diagnostics-runtime-retry-exhaustion',
    version: '1.0.0',
    contentHash: 'hash-runtime-retry-exhaustion',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    changelog: 'init',
    metadata: {
      name: 'diagnostics-runtime-retry-exhaustion',
      description: 'runtime retry exhaustion and mixed node outcomes telemetry checks',
      tags: [],
      createdAt: now,
      updatedAt: now,
      governanceState: {
        budgetRemaining: 6,
        reserveBudget: 1
      },
      governancePolicy: {
        selectionStrategy: 'weighted'
      },
      providerRoutingWarning: 'seeded-runtime-retry-warning'
    } as unknown as Pipeline['metadata'],
    graph: {
      graphId: 'g-diagnostics-runtime-retry-exhaustion',
      nodes: [
        { instanceId: 'n1', nodeTypeId: 'trigger', config: { role: 'entry' }, position: { x: 0, y: 0 } },
        { instanceId: 'n2', nodeTypeId: 'service', config: { mode: 'fail', maxRetries: 2, backoffStrategy: 'fixed' }, position: { x: 1, y: 0 } },
        { instanceId: 'n3', nodeTypeId: 'service', config: { mode: 'success' }, position: { x: 1, y: 1 } },
        { instanceId: 'n4', nodeTypeId: 'trigger', config: { role: 'exit' }, position: { x: 2, y: 1 } }
      ],
      edges: [
        { edgeId: 'e1', fromNodeId: 'n1', fromPort: 'out', toNodeId: 'n2', toPort: 'in' },
        { edgeId: 'e2', fromNodeId: 'n1', fromPort: 'out', toNodeId: 'n3', toPort: 'in' }
      ]
    }
  };
}

function diagnosticsRuntimeMultiFailureLayerPipelineWithGovernanceMetadata(): Pipeline {
  const now = new Date();
  return {
    id: 'p-diagnostics-runtime-multi-failure',
    version: '1.0.0',
    contentHash: 'hash-runtime-multi-failure',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    changelog: 'init',
    metadata: {
      name: 'diagnostics-runtime-multi-failure',
      description: 'multi-failure layer telemetry checks',
      tags: [],
      createdAt: now,
      updatedAt: now,
      governanceState: {
        budgetRemaining: 7,
        reserveBudget: 1
      },
      governancePolicy: {
        selectionStrategy: 'weighted'
      },
      providerRoutingWarning: 'seeded-multi-failure-warning'
    } as unknown as Pipeline['metadata'],
    graph: {
      graphId: 'g-diagnostics-runtime-multi-failure',
      nodes: [
        { instanceId: 'n1', nodeTypeId: 'trigger', config: { role: 'entry' }, position: { x: 0, y: 0 } },
        { instanceId: 'n2', nodeTypeId: 'service', config: { mode: 'fail-a', maxRetries: 1, backoffStrategy: 'fixed' }, position: { x: 1, y: 0 } },
        { instanceId: 'n3', nodeTypeId: 'service', config: { mode: 'fail-b', maxRetries: 0, backoffStrategy: 'fixed' }, position: { x: 1, y: 1 } },
        { instanceId: 'n4', nodeTypeId: 'trigger', config: { role: 'exit' }, position: { x: 2, y: 1 } }
      ],
      edges: [
        { edgeId: 'e1', fromNodeId: 'n1', fromPort: 'out', toNodeId: 'n2', toPort: 'in' },
        { edgeId: 'e2', fromNodeId: 'n1', fromPort: 'out', toNodeId: 'n3', toPort: 'in' }
      ]
    }
  };
}

function diagnosticsRuntimeFallbackCascadeFailurePipelineWithGovernanceMetadata(): Pipeline {
  const now = new Date();
  return {
    id: 'p-diagnostics-runtime-fallback-cascade',
    version: '1.0.0',
    contentHash: 'hash-runtime-fallback-cascade',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    changelog: 'init',
    metadata: {
      name: 'diagnostics-runtime-fallback-cascade',
      description: 'fallback cascade failure telemetry checks',
      tags: [],
      createdAt: now,
      updatedAt: now
    } as Pipeline['metadata'],
    graph: {
      graphId: 'g-diagnostics-runtime-fallback-cascade',
      nodes: [
        { instanceId: 'n1', nodeTypeId: 'trigger', config: { role: 'entry' }, position: { x: 0, y: 0 } },
        {
          instanceId: 'n2',
          nodeTypeId: 'agent',
          config: { providerId: 'preferred', fallbackProviderId: 'diag-alpha', agentDescriptorId: 'diag-alpha:model-a', promptTemplateId: 't1', maxRetries: 0 },
          position: { x: 1, y: 0 }
        },
        { instanceId: 'n3', nodeTypeId: 'trigger', config: { role: 'exit' }, position: { x: 2, y: 0 } }
      ],
      edges: [{ edgeId: 'e1', fromNodeId: 'n1', fromPort: 'out', toNodeId: 'n2', toPort: 'in' }]
    }
  };
}

function diagnosticsRuntimePolicyStateDriftFailurePipelineWithGovernanceMetadata(): Pipeline {
  const now = new Date();
  return {
    id: 'p-diagnostics-runtime-policy-state-drift',
    version: '1.0.0',
    contentHash: 'hash-runtime-policy-state-drift',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    changelog: 'init',
    metadata: {
      name: 'diagnostics-runtime-policy-state-drift',
      description: 'governance policy-state drift telemetry checks across repeated failure runs',
      tags: [],
      createdAt: now,
      updatedAt: now
    } as Pipeline['metadata'],
    graph: {
      graphId: 'g-diagnostics-runtime-policy-state-drift',
      nodes: [
        { instanceId: 'n1', nodeTypeId: 'trigger', config: { role: 'entry' }, position: { x: 0, y: 0 } },
        {
          instanceId: 'n2',
          nodeTypeId: 'agent',
          config: {
            providerId: 'preferred',
            fallbackProviderId: 'diag-alpha',
            agentDescriptorId: 'diag-alpha:model-a',
            promptTemplateId: 't1',
            maxRetries: 0
          },
          position: { x: 1, y: 0 }
        },
        { instanceId: 'n3', nodeTypeId: 'trigger', config: { role: 'exit' }, position: { x: 2, y: 0 } }
      ],
      edges: [{ edgeId: 'e1', fromNodeId: 'n1', fromPort: 'out', toNodeId: 'n2', toPort: 'in' }]
    }
  };
}

function diagnosticsRuntimeGovernanceMutationFailurePipelineWithGovernanceMetadata(): Pipeline {
  const now = new Date();
  return {
    id: 'p-diagnostics-runtime-governance-mutation',
    version: '1.0.0',
    contentHash: 'hash-runtime-governance-mutation',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    changelog: 'init',
    metadata: {
      name: 'diagnostics-runtime-governance-mutation',
      description: 'cooldown and blocked-state transition telemetry checks under repeated failure pressure',
      tags: [],
      createdAt: now,
      updatedAt: now
    } as Pipeline['metadata'],
    graph: {
      graphId: 'g-diagnostics-runtime-governance-mutation',
      nodes: [
        { instanceId: 'n1', nodeTypeId: 'trigger', config: { role: 'entry' }, position: { x: 0, y: 0 } },
        {
          instanceId: 'n2',
          nodeTypeId: 'agent',
          config: {
            providerId: 'preferred',
            fallbackProviderId: 'diag-alpha',
            agentDescriptorId: 'diag-alpha:model-a',
            promptTemplateId: 't1',
            maxRetries: 0
          },
          position: { x: 1, y: 0 }
        },
        { instanceId: 'n3', nodeTypeId: 'trigger', config: { role: 'exit' }, position: { x: 2, y: 0 } }
      ],
      edges: [{ edgeId: 'e1', fromNodeId: 'n1', fromPort: 'out', toNodeId: 'n2', toPort: 'in' }]
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
  assertEarlyFailureGovernanceMetadataShape(failedPayload, {
    expectedPipelineId: 'p-diagnostics-invalid',
    expectedWarning: 'seeded-warning',
    expectedBudgetRemaining: 3
  });

  const failureCycleResult = await failureConductor.run(diagnosticsInvalidCyclePipelineWithGovernanceMetadata(), 'hello');
  await failureBridge.flush();
  if (failureCycleResult.status !== 'failed') {
    throw new Error('Diagnostics verification failed: invalid cycle pipeline did not produce failed result.');
  }
  const failedCyclePayload = failureTelemetryPayloads.find(
    (payload) => typeof payload?.error === 'string' && String(payload.error).includes('CYCLE_DETECTED')
  );
  assertEarlyFailureGovernanceMetadataShape(failedCyclePayload, {
    expectedPipelineId: 'p-diagnostics-invalid-cycle',
    expectedWarning: 'seeded-cycle-warning',
    expectedBudgetRemaining: 2
  });

  const runtimeFailureTelemetryEvents: Array<{ eventName: string; payload: Record<string, unknown> | undefined }> = [];
  const runtimeFailureBridge = new OttoObservabilityBridge({
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
        runtimeFailureTelemetryEvents.push({ eventName, payload });
      }
    }
  });
  const runtimeFailureConductor = new Conductor({
    promptEngine: prompt,
    contextEngine: context,
    reviewer,
    providerRegistry: {
      run: async (providerId, request) => providerRegistry.run(providerId, request)
    },
    serviceRegistry: new Map([
      [
        'service',
        async () => {
          throw new Error('intentional runtime service failure');
        }
      ]
    ])
  });
  runtimeFailureBridge.bind(runtimeFailureConductor.eventBus);
  const runtimeFailureResult = await runtimeFailureConductor.run(diagnosticsRuntimeFailurePipelineWithGovernanceMetadata(), 'hello');
  await runtimeFailureBridge.flush();
  if (runtimeFailureResult.status !== 'partial') {
    throw new Error('Diagnostics verification failed: runtime failure pipeline did not produce partial status.');
  }
  const runtimeNodeFailedPayload = runtimeFailureTelemetryEvents.find(
    (event) => event.eventName === 'maestro.node.failed' && String(event.payload?.nodeId ?? '') === 'n2'
  )?.payload;
  assertRuntimeFailureNodeTelemetryShape(runtimeNodeFailedPayload, {
    expectedNodeId: 'n2',
    expectedErrorIncludes: 'intentional runtime service failure',
    expectedWarning: 'seeded-runtime-warning',
    expectedBudgetRemaining: 4
  });

  let retryExhaustionAttempts = 0;
  const runtimeRetryTelemetryEvents: Array<{ eventName: string; payload: Record<string, unknown> | undefined }> = [];
  const runtimeRetryBridge = new OttoObservabilityBridge({
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
        runtimeRetryTelemetryEvents.push({ eventName, payload });
      }
    }
  });
  const runtimeRetryConductor = new Conductor({
    promptEngine: prompt,
    contextEngine: context,
    reviewer,
    providerRegistry: {
      run: async (providerId, request) => providerRegistry.run(providerId, request)
    },
    serviceRegistry: new Map([
      [
        'service',
        async (nodeConfig) => {
          if (String(nodeConfig.mode ?? '') === 'fail') {
            retryExhaustionAttempts += 1;
            throw new Error('intentional retry exhaustion failure');
          }
          return 'service-success-output';
        }
      ]
    ])
  });
  runtimeRetryBridge.bind(runtimeRetryConductor.eventBus);
  const runtimeRetryResult = await runtimeRetryConductor.run(
    diagnosticsRuntimeRetryExhaustionMixedOutcomePipelineWithGovernanceMetadata(),
    'hello'
  );
  await runtimeRetryBridge.flush();
  if (runtimeRetryResult.status !== 'partial') {
    throw new Error('Diagnostics verification failed: runtime retry-exhaustion pipeline did not produce partial status.');
  }
  if (retryExhaustionAttempts !== 3) {
    throw new Error('Diagnostics verification failed: runtime retry-exhaustion attempts did not match maxRetries+1.');
  }
  if (runtimeRetryResult.nodeResults.get('n2')?.status !== 'failed') {
    throw new Error('Diagnostics verification failed: runtime retry-exhaustion node n2 did not fail as expected.');
  }
  if (runtimeRetryResult.nodeResults.get('n3')?.status !== 'completed') {
    throw new Error('Diagnostics verification failed: runtime mixed outcome node n3 did not complete as expected.');
  }
  if (!runtimeRetryTelemetryEvents.some((event) => event.eventName === 'maestro.pipeline.completed')) {
    throw new Error('Diagnostics verification failed: runtime retry-exhaustion telemetry missing pipeline completed event.');
  }
  const retryNodeFailedPayload = runtimeRetryTelemetryEvents.find(
    (event) => event.eventName === 'maestro.node.failed' && String(event.payload?.nodeId ?? '') === 'n2'
  )?.payload;
  assertRuntimeFailureNodeTelemetryShape(retryNodeFailedPayload, {
    expectedNodeId: 'n2',
    expectedErrorIncludes: 'intentional retry exhaustion failure',
    expectedWarning: 'seeded-runtime-retry-warning',
    expectedBudgetRemaining: 6
  });

  let multiFailureAAttempts = 0;
  let multiFailureBAttempts = 0;
  const runtimeMultiFailureTelemetryEvents: Array<{ eventName: string; payload: Record<string, unknown> | undefined }> = [];
  const runtimeMultiFailureBridge = new OttoObservabilityBridge({
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
        runtimeMultiFailureTelemetryEvents.push({ eventName, payload });
      }
    }
  });
  const runtimeMultiFailureConductor = new Conductor({
    promptEngine: prompt,
    contextEngine: context,
    reviewer,
    providerRegistry: {
      run: async (providerId, request) => providerRegistry.run(providerId, request)
    },
    serviceRegistry: new Map([
      [
        'service',
        async (nodeConfig) => {
          const mode = String(nodeConfig.mode ?? '');
          if (mode === 'fail-a') {
            multiFailureAAttempts += 1;
            throw new Error('intentional multi failure A');
          }
          if (mode === 'fail-b') {
            multiFailureBAttempts += 1;
            throw new Error('intentional multi failure B');
          }
          return 'ok';
        }
      ]
    ])
  });
  runtimeMultiFailureBridge.bind(runtimeMultiFailureConductor.eventBus);
  const runtimeMultiFailureResult = await runtimeMultiFailureConductor.run(
    diagnosticsRuntimeMultiFailureLayerPipelineWithGovernanceMetadata(),
    'hello'
  );
  await runtimeMultiFailureBridge.flush();
  if (runtimeMultiFailureResult.status !== 'partial') {
    throw new Error('Diagnostics verification failed: runtime multi-failure pipeline did not produce partial status.');
  }
  if (multiFailureAAttempts !== 2 || multiFailureBAttempts !== 1) {
    throw new Error('Diagnostics verification failed: runtime multi-failure retry attempt counts are unexpected.');
  }
  const multiFailureNodeFailedPayloads = runtimeMultiFailureTelemetryEvents
    .filter((event) => event.eventName === 'maestro.node.failed')
    .map((event) => event.payload);
  if (multiFailureNodeFailedPayloads.length !== 2) {
    throw new Error('Diagnostics verification failed: runtime multi-failure telemetry expected exactly two node-failed payloads.');
  }
  for (const payload of multiFailureNodeFailedPayloads) {
    assertRuntimeFailureNodeTelemetryShape(payload, {
      expectedNodeId: String(payload?.nodeId ?? ''),
      expectedErrorIncludes: 'intentional multi failure',
      expectedWarning: 'seeded-multi-failure-warning',
      expectedBudgetRemaining: 7
    });
  }

  const runtimeFallbackCascadeTelemetryEvents: Array<{ eventName: string; payload: Record<string, unknown> | undefined }> = [];
  const runtimeFallbackCascadeBridge = new OttoObservabilityBridge({
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
        runtimeFallbackCascadeTelemetryEvents.push({ eventName, payload });
      }
    }
  });
  const runtimeFallbackCascadeConductor = new Conductor({
    promptEngine: prompt,
    contextEngine: context,
    reviewer,
    providerRegistry: {
      run: async (providerId) => {
        if (providerId === 'diag-alpha') {
          throw new Error('fallback provider execution failed');
        }
        return { text: `diag:${providerId}`, tokensUsed: 1, latencyMs: 1, rawResponse: { providerId } };
      }
    },
    providerRouting: {
      resolvePreferredProviderId: async () => {
        throw new Error('preferred resolver unavailable');
      }
    },
    serviceRegistry: new Map([['service', async () => 'noop']])
  });
  runtimeFallbackCascadeBridge.bind(runtimeFallbackCascadeConductor.eventBus);
  const runtimeFallbackCascadeResult = await runtimeFallbackCascadeConductor.run(
    diagnosticsRuntimeFallbackCascadeFailurePipelineWithGovernanceMetadata(),
    'hello'
  );
  await runtimeFallbackCascadeBridge.flush();
  if (runtimeFallbackCascadeResult.status !== 'partial') {
    throw new Error('Diagnostics verification failed: fallback-cascade pipeline did not produce partial status.');
  }
  const fallbackCascadeNodeFailedPayload = runtimeFallbackCascadeTelemetryEvents.find(
    (event) => event.eventName === 'maestro.node.failed' && String(event.payload?.nodeId ?? '') === 'n2'
  )?.payload;
  if (!fallbackCascadeNodeFailedPayload) {
    throw new Error('Diagnostics verification failed: fallback-cascade node-failed payload was missing.');
  }
  assertRuntimeFailureNodeTelemetryShape(fallbackCascadeNodeFailedPayload, {
    expectedNodeId: 'n2',
    expectedErrorIncludes: 'fallback provider execution failed',
    expectedWarning: String(
      (fallbackCascadeNodeFailedPayload['metadata'] as Record<string, unknown> | undefined)?.providerRoutingWarning ?? ''
    )
  });
  const fallbackWarning = String(
    (fallbackCascadeNodeFailedPayload['metadata'] as Record<string, unknown> | undefined)?.providerRoutingWarning ?? ''
  );
  if (!fallbackWarning.includes('preferred-provider-error') || !fallbackWarning.includes('fallback=diag-alpha')) {
    throw new Error('Diagnostics verification failed: fallback-cascade providerRoutingWarning did not include expected fallback details.');
  }

  let driftGovernanceState: ProviderGovernanceState = {
    blockedProviderIds: [],
    cooldownUntilByProviderId: {},
    budgetRemaining: 6,
    reserveBudget: 1
  };
  const runtimePolicyStateDriftTelemetryEvents: Array<{ eventName: string; payload: Record<string, unknown> | undefined }> = [];
  const runtimePolicyStateDriftBudgets: number[] = [];
  const runtimePolicyStateDriftBridge = new OttoObservabilityBridge({
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
        runtimePolicyStateDriftTelemetryEvents.push({ eventName, payload });
        if (eventName === 'maestro.node.failed' && String(payload?.nodeId ?? '') === 'n2') {
          const budget = Number(
            ((payload?.metadata as Record<string, unknown> | undefined)?.governanceState as Record<string, unknown> | undefined)
              ?.budgetRemaining
          );
          if (Number.isFinite(budget)) {
            runtimePolicyStateDriftBudgets.push(budget);
          }
        }
      }
    }
  });
  const runtimePolicyStateDriftConductor = new Conductor({
    promptEngine: prompt,
    contextEngine: context,
    reviewer,
    providerRegistry: {
      run: async () => {
        throw new Error('intentional governance drift failure');
      }
    },
    providerRouting: {
      resolvePreferredProviderId: async ({ context: executionContext }) => {
        const policy = providerRegistry.createSelectionPolicyWithGovernance(
          {
            providerCostByProviderId: { 'diag-alpha': 2 }
          },
          driftGovernanceState,
          new Date('2026-10-18T00:00:00.000Z')
        );
        executionContext.metadata.governancePolicy = policy;
        executionContext.metadata.governanceState = driftGovernanceState;

        const selectedProviderId = await providerRegistry.resolvePreferredProviderId(policy, ['diag-alpha']);
        driftGovernanceState = providerRegistry.createNextGovernanceState({
          previousState: driftGovernanceState,
          policy,
          selectedProviderId,
          evaluatedAt: new Date('2026-10-18T00:00:00.000Z')
        });
        executionContext.metadata.governanceState = driftGovernanceState;
        return selectedProviderId;
      }
    },
    serviceRegistry: new Map([['service', async () => 'noop']])
  });
  runtimePolicyStateDriftBridge.bind(runtimePolicyStateDriftConductor.eventBus);
  const runtimePolicyStateDriftFirstResult = await runtimePolicyStateDriftConductor.run(
    diagnosticsRuntimePolicyStateDriftFailurePipelineWithGovernanceMetadata(),
    'hello-drift-1'
  );
  const runtimePolicyStateDriftSecondResult = await runtimePolicyStateDriftConductor.run(
    diagnosticsRuntimePolicyStateDriftFailurePipelineWithGovernanceMetadata(),
    'hello-drift-2'
  );
  await runtimePolicyStateDriftBridge.flush();
  if (runtimePolicyStateDriftFirstResult.status !== 'partial' || runtimePolicyStateDriftSecondResult.status !== 'partial') {
    throw new Error('Diagnostics verification failed: policy-state drift failure runs did not produce partial status.');
  }
  if (runtimePolicyStateDriftBudgets.length !== 2 || runtimePolicyStateDriftBudgets[0] !== 4 || runtimePolicyStateDriftBudgets[1] !== 2) {
    throw new Error('Diagnostics verification failed: policy-state drift budgets did not match expected deterministic sequence.');
  }
  if (driftGovernanceState.budgetRemaining !== 2) {
    throw new Error('Diagnostics verification failed: policy-state drift governance budget did not converge to expected value.');
  }
  const runtimePolicyStateDriftNodeFailures = runtimePolicyStateDriftTelemetryEvents.filter(
    (event) => event.eventName === 'maestro.node.failed' && String(event.payload?.nodeId ?? '') === 'n2'
  );
  if (runtimePolicyStateDriftNodeFailures.length !== 2) {
    throw new Error('Diagnostics verification failed: policy-state drift expected exactly two node-failed telemetry events.');
  }
  for (const nodeFailureEvent of runtimePolicyStateDriftNodeFailures) {
    assertRuntimeFailureNodeTelemetryShape(nodeFailureEvent.payload, {
      expectedNodeId: 'n2',
      expectedErrorIncludes: 'intentional governance drift failure',
      expectedBudgetRemaining: Number(
        ((nodeFailureEvent.payload?.metadata as Record<string, unknown> | undefined)?.governanceState as
          | Record<string, unknown>
          | undefined)?.budgetRemaining
      )
    });
  }

  let mutationGovernanceState: ProviderGovernanceState = {
    blockedProviderIds: [],
    cooldownUntilByProviderId: {},
    budgetRemaining: 4,
    reserveBudget: 0
  };
  let mutationRunCount = 0;
  const runtimeGovernanceMutationTelemetryEvents: Array<{ eventName: string; payload: Record<string, unknown> | undefined }> = [];
  const runtimeGovernanceMutationSnapshots: Array<{ budget: number | undefined; blockedCount: number; cooldownCount: number; warning: string }> = [];
  const runtimeGovernanceMutationBridge = new OttoObservabilityBridge({
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
        runtimeGovernanceMutationTelemetryEvents.push({ eventName, payload });
        if (eventName === 'maestro.node.failed' && String(payload?.nodeId ?? '') === 'n2') {
          const metadata = payload?.metadata as Record<string, unknown> | undefined;
          const state = metadata?.governanceState as Record<string, unknown> | undefined;
          const blocked = state?.blockedProviderIds as unknown[] | undefined;
          const cooldown = state?.cooldownUntilByProviderId as Record<string, unknown> | undefined;
          runtimeGovernanceMutationSnapshots.push({
            budget: typeof state?.budgetRemaining === 'number' ? state.budgetRemaining : undefined,
            blockedCount: Array.isArray(blocked) ? blocked.length : 0,
            cooldownCount: cooldown ? Object.keys(cooldown).length : 0,
            warning: String(metadata?.providerRoutingWarning ?? '')
          });
        }
      }
    }
  });
  const runtimeGovernanceMutationConductor = new Conductor({
    promptEngine: prompt,
    contextEngine: context,
    reviewer,
    providerRegistry: {
      run: async () => {
        throw new Error('intentional governance mutation failure');
      }
    },
    providerRouting: {
      resolvePreferredProviderId: async ({ context: executionContext }) => {
        mutationRunCount += 1;
        const evaluatedAt =
          mutationRunCount === 1 ? new Date('2026-10-18T00:00:00.000Z') : new Date('2026-10-18T00:20:00.000Z');
        const basePolicy =
          mutationRunCount === 1
            ? {
                providerCostByProviderId: { 'diag-alpha': 2 },
                cooldownUntilByProviderId: { shadow: '2026-10-18T00:10:00.000Z' }
              }
            : {
                providerCostByProviderId: { 'diag-alpha': 2 },
                blockedProviderIds: ['diag-alpha']
              };

        const policy = providerRegistry.createSelectionPolicyWithGovernance(basePolicy, mutationGovernanceState, evaluatedAt);
        executionContext.metadata.governancePolicy = policy;
        executionContext.metadata.governanceState = mutationGovernanceState;

        const selectedProviderId = await providerRegistry.resolvePreferredProviderId(policy, ['diag-alpha']);
        mutationGovernanceState = providerRegistry.createNextGovernanceState({
          previousState: mutationGovernanceState,
          policy,
          selectedProviderId,
          evaluatedAt
        });
        executionContext.metadata.governanceState = mutationGovernanceState;
        return selectedProviderId;
      }
    },
    serviceRegistry: new Map([['service', async () => 'noop']])
  });
  runtimeGovernanceMutationBridge.bind(runtimeGovernanceMutationConductor.eventBus);
  const runtimeGovernanceMutationFirstResult = await runtimeGovernanceMutationConductor.run(
    diagnosticsRuntimeGovernanceMutationFailurePipelineWithGovernanceMetadata(),
    'hello-mutation-1'
  );
  const runtimeGovernanceMutationSecondResult = await runtimeGovernanceMutationConductor.run(
    diagnosticsRuntimeGovernanceMutationFailurePipelineWithGovernanceMetadata(),
    'hello-mutation-2'
  );
  await runtimeGovernanceMutationBridge.flush();
  if (runtimeGovernanceMutationFirstResult.status !== 'partial' || runtimeGovernanceMutationSecondResult.status !== 'partial') {
    throw new Error('Diagnostics verification failed: governance-mutation failure runs did not produce partial status.');
  }
  if (runtimeGovernanceMutationSnapshots.length !== 2) {
    throw new Error('Diagnostics verification failed: governance-mutation expected exactly two node-failed snapshots.');
  }
  if (
    runtimeGovernanceMutationSnapshots[0].budget !== 2 ||
    runtimeGovernanceMutationSnapshots[0].blockedCount !== 0 ||
    runtimeGovernanceMutationSnapshots[0].cooldownCount !== 1
  ) {
    throw new Error('Diagnostics verification failed: governance-mutation first snapshot mismatch.');
  }
  if (
    runtimeGovernanceMutationSnapshots[1].budget !== 2 ||
    runtimeGovernanceMutationSnapshots[1].blockedCount !== 1 ||
    runtimeGovernanceMutationSnapshots[1].cooldownCount !== 0
  ) {
    throw new Error('Diagnostics verification failed: governance-mutation second snapshot mismatch.');
  }
  if (!runtimeGovernanceMutationSnapshots[1].warning.includes('fallback=diag-alpha')) {
    throw new Error('Diagnostics verification failed: governance-mutation warning did not include expected fallback details.');
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
    earlyFailure: failedPayload,
    earlyFailureCycle: failedCyclePayload,
    runtimeNodeFailure: runtimeNodeFailedPayload,
    runtimeRetryNodeFailure: retryNodeFailedPayload,
    runtimeMultiFailureNodeFailures: multiFailureNodeFailedPayloads,
    runtimeFallbackCascadeNodeFailure: fallbackCascadeNodeFailedPayload,
    runtimePolicyStateDriftNodeFailures: runtimePolicyStateDriftNodeFailures.map((event) => event.payload),
    runtimePolicyStateDriftBudgets,
    runtimeGovernanceMutationNodeFailureSnapshots: runtimeGovernanceMutationSnapshots,
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

function assertEarlyFailureGovernanceMetadataShape(
  payload: Record<string, unknown> | undefined,
  options: { expectedPipelineId: string; expectedWarning: string; expectedBudgetRemaining: number }
): void {
  if (!payload) {
    throw new Error('Diagnostics verification failed: missing telemetry payload for invalid pipeline failure.');
  }
  if (typeof payload.runId !== 'string' || payload.runId.length === 0) {
    throw new Error('Diagnostics verification failed: invalid pipeline runId is missing in failure telemetry.');
  }
  if (payload.pipelineId !== options.expectedPipelineId) {
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
  if (metadataRecord.providerRoutingWarning !== options.expectedWarning) {
    throw new Error('Diagnostics verification failed: invalid pipeline providerRoutingWarning mismatch.');
  }
  const governanceState = metadataRecord.governanceState;
  if (!governanceState || typeof governanceState !== 'object') {
    throw new Error('Diagnostics verification failed: invalid pipeline governanceState metadata is missing.');
  }
  if ((governanceState as Record<string, unknown>).budgetRemaining !== options.expectedBudgetRemaining) {
    throw new Error('Diagnostics verification failed: invalid pipeline governanceState budget mismatch.');
  }
}

function assertRuntimeFailureNodeTelemetryShape(
  payload: Record<string, unknown> | undefined,
  options: {
    expectedNodeId: string;
    expectedErrorIncludes: string;
    expectedWarning?: string;
    expectedBudgetRemaining?: number;
  }
): void {
  if (!payload) {
    throw new Error('Diagnostics verification failed: missing node-failed telemetry payload for runtime service failure.');
  }
  if (payload.pipelineId !== undefined) {
    throw new Error('Diagnostics verification failed: node-failed payload unexpectedly includes pipelineId.');
  }
  if (payload.nodeId !== options.expectedNodeId) {
    throw new Error('Diagnostics verification failed: runtime node-failed payload nodeId mismatch.');
  }
  if (payload.retriesExhausted !== true) {
    throw new Error('Diagnostics verification failed: runtime node-failed retriesExhausted was not true.');
  }
  if (typeof payload.error !== 'string' || !payload.error.includes(options.expectedErrorIncludes)) {
    throw new Error('Diagnostics verification failed: runtime node-failed payload error mismatch.');
  }
  if (payload.environment !== 'ci' || payload.deploymentChannel !== 'stable' || typeof payload.hostOs !== 'string') {
    throw new Error('Diagnostics verification failed: runtime node-failed payload context metadata mismatch.');
  }
  const metadata = payload.metadata;
  if (!metadata || typeof metadata !== 'object') {
    throw new Error('Diagnostics verification failed: runtime node-failed payload metadata missing.');
  }
  const metadataRecord = metadata as Record<string, unknown>;
  if (options.expectedWarning !== undefined && metadataRecord.providerRoutingWarning !== options.expectedWarning) {
    throw new Error('Diagnostics verification failed: runtime node-failed providerRoutingWarning mismatch.');
  }
  if (options.expectedBudgetRemaining !== undefined) {
    const governanceState = metadataRecord.governanceState;
    if (!governanceState || typeof governanceState !== 'object') {
      throw new Error('Diagnostics verification failed: runtime node-failed governanceState missing.');
    }
    if ((governanceState as Record<string, unknown>).budgetRemaining !== options.expectedBudgetRemaining) {
      throw new Error('Diagnostics verification failed: runtime node-failed governanceState budget mismatch.');
    }
  }
}
