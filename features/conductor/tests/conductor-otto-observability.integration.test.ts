import { describe, expect, it } from 'vitest';
import type { Pipeline } from '../../../src/shared/index.js';
import { ContextEngine } from '../../context-engine/index.js';
import { PromptEngine } from '../../prompt-engine/index.js';
import type { ProviderGovernanceState } from '../../provider-registry/index.js';
import { ProviderRegistry } from '../../provider-registry/index.js';
import { Reviewer } from '../../reviewer/index.js';
import { RulesEngine } from '../../rules-engine/index.js';
import { Conductor, OttoObservabilityBridge } from '../index.js';

function observabilityPipeline(): Pipeline {
  const now = new Date();
  return {
    id: 'p-observability',
    version: '1.0.0',
    contentHash: 'hash',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    changelog: 'init',
    metadata: { name: 'observability-test', description: 'deterministic observability trace', tags: [], createdAt: now, updatedAt: now },
    graph: {
      graphId: 'g-observability',
      nodes: [
        { instanceId: 'n1', nodeTypeId: 'trigger', config: { role: 'entry' }, position: { x: 0, y: 0 } },
        { instanceId: 'n2', nodeTypeId: 'service', config: {}, position: { x: 1, y: 0 } },
        { instanceId: 'n3', nodeTypeId: 'agent', config: { providerId: 'mock', agentDescriptorId: 'mock:a', promptTemplateId: 't1' }, position: { x: 2, y: 0 } },
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

function invalidObservabilityPipelineWithGovernanceMetadata(): Pipeline {
  const now = new Date();
  return {
    id: 'p-observability-invalid',
    version: '1.0.0',
    contentHash: 'hash-invalid',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    changelog: 'init',
    metadata: {
      name: 'observability-invalid',
      description: 'invalid pipeline for failure metadata checks',
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
      graphId: 'g-observability-invalid',
      nodes: [{ instanceId: 'n1', nodeTypeId: 'trigger', config: { role: 'entry' }, position: { x: 0, y: 0 } }],
      edges: [{ edgeId: 'e-invalid', fromNodeId: 'n1', fromPort: 'out', toNodeId: 'missing-node', toPort: 'in' }]
    }
  };
}

function invalidObservabilityCyclePipelineWithGovernanceMetadata(): Pipeline {
  const now = new Date();
  return {
    id: 'p-observability-invalid-cycle',
    version: '1.0.0',
    contentHash: 'hash-invalid-cycle',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    changelog: 'init',
    metadata: {
      name: 'observability-invalid-cycle',
      description: 'cyclic pipeline for failure metadata checks',
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
      graphId: 'g-observability-invalid-cycle',
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

function runtimeFailureObservabilityPipelineWithGovernanceMetadata(): Pipeline {
  const now = new Date();
  return {
    id: 'p-observability-runtime-failure',
    version: '1.0.0',
    contentHash: 'hash-runtime-failure',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    changelog: 'init',
    metadata: {
      name: 'observability-runtime-failure',
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
      graphId: 'g-observability-runtime-failure',
      nodes: [
        { instanceId: 'n1', nodeTypeId: 'trigger', config: { role: 'entry' }, position: { x: 0, y: 0 } },
        { instanceId: 'n2', nodeTypeId: 'service', config: {}, position: { x: 1, y: 0 } },
        { instanceId: 'n3', nodeTypeId: 'agent', config: { providerId: 'mock', agentDescriptorId: 'mock:a', promptTemplateId: 't1' }, position: { x: 2, y: 0 } },
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

function runtimeRetryExhaustionMixedOutcomePipelineWithGovernanceMetadata(): Pipeline {
  const now = new Date();
  return {
    id: 'p-observability-runtime-retry-exhaustion',
    version: '1.0.0',
    contentHash: 'hash-runtime-retry-exhaustion',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    changelog: 'init',
    metadata: {
      name: 'observability-runtime-retry-exhaustion',
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
      graphId: 'g-observability-runtime-retry-exhaustion',
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

function runtimeMultiFailureLayerPipelineWithGovernanceMetadata(): Pipeline {
  const now = new Date();
  return {
    id: 'p-observability-runtime-multi-failure',
    version: '1.0.0',
    contentHash: 'hash-runtime-multi-failure',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    changelog: 'init',
    metadata: {
      name: 'observability-runtime-multi-failure',
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
      graphId: 'g-observability-runtime-multi-failure',
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

function runtimeFallbackCascadeFailurePipelineWithGovernanceMetadata(): Pipeline {
  const now = new Date();
  return {
    id: 'p-observability-runtime-fallback-cascade',
    version: '1.0.0',
    contentHash: 'hash-runtime-fallback-cascade',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    changelog: 'init',
    metadata: { name: 'observability-runtime-fallback-cascade', description: 'fallback cascade failure telemetry checks', tags: [], createdAt: now, updatedAt: now } as Pipeline['metadata'],
    graph: {
      graphId: 'g-observability-runtime-fallback-cascade',
      nodes: [
        { instanceId: 'n1', nodeTypeId: 'trigger', config: { role: 'entry' }, position: { x: 0, y: 0 } },
        {
          instanceId: 'n2',
          nodeTypeId: 'agent',
          config: { providerId: 'preferred', fallbackProviderId: 'alpha', agentDescriptorId: 'alpha:model-a', promptTemplateId: 't1', maxRetries: 0 },
          position: { x: 1, y: 0 }
        },
        { instanceId: 'n3', nodeTypeId: 'trigger', config: { role: 'exit' }, position: { x: 2, y: 0 } }
      ],
      edges: [{ edgeId: 'e1', fromNodeId: 'n1', fromPort: 'out', toNodeId: 'n2', toPort: 'in' }]
    }
  };
}

function runtimePolicyStateDriftFailurePipelineWithGovernanceMetadata(): Pipeline {
  const now = new Date();
  return {
    id: 'p-observability-runtime-policy-state-drift',
    version: '1.0.0',
    contentHash: 'hash-runtime-policy-state-drift',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    changelog: 'init',
    metadata: {
      name: 'observability-runtime-policy-state-drift',
      description: 'governance policy-state drift telemetry checks across repeated failure runs',
      tags: [],
      createdAt: now,
      updatedAt: now
    } as Pipeline['metadata'],
    graph: {
      graphId: 'g-observability-runtime-policy-state-drift',
      nodes: [
        { instanceId: 'n1', nodeTypeId: 'trigger', config: { role: 'entry' }, position: { x: 0, y: 0 } },
        {
          instanceId: 'n2',
          nodeTypeId: 'agent',
          config: { providerId: 'preferred', fallbackProviderId: 'alpha', agentDescriptorId: 'alpha:model-a', promptTemplateId: 't1', maxRetries: 0 },
          position: { x: 1, y: 0 }
        },
        { instanceId: 'n3', nodeTypeId: 'trigger', config: { role: 'exit' }, position: { x: 2, y: 0 } }
      ],
      edges: [{ edgeId: 'e1', fromNodeId: 'n1', fromPort: 'out', toNodeId: 'n2', toPort: 'in' }]
    }
  };
}

describe('conductor + otto observability bridge', () => {
  it('emits deterministic runtime observability traces for conductor execution', async () => {
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
      title: 't',
      template: 'Echo: {{output}}',
      variables: ['output']
    });

    const telemetryEvents: string[] = [];
    const telemetryRunIds: string[] = [];
    const telemetryEnvironments: string[] = [];
    const telemetryMetadata: Array<Record<string, unknown> | undefined> = [];
    const traceEvents: string[] = [];
    const logEvents: string[] = [];

    const bridge = new OttoObservabilityBridge({
      runtimeContext: {
        environment: 'test',
        deploymentChannel: 'stable',
        hostOs: 'windows'
      },
      logging: {
        info: async (_message, attributes) => {
          logEvents.push(String(attributes?.sourceEvent ?? 'unknown'));
        },
        error: async (_message, attributes) => {
          logEvents.push(String(attributes?.sourceEvent ?? 'unknown'));
        }
      },
      tracing: {
        startSpan: async (name) => {
          traceEvents.push(name);
          return {
            annotate: async () => {},
            end: async () => {}
          };
        }
      },
      telemetry: {
        emit: async (eventName, payload) => {
          telemetryEvents.push(eventName);
          telemetryRunIds.push(String(payload?.runId ?? 'missing'));
          telemetryEnvironments.push(String(payload?.environment ?? 'missing'));
          telemetryMetadata.push(payload?.metadata as Record<string, unknown> | undefined);
        }
      }
    });

    const conductor = new Conductor(
      {
        promptEngine: prompt,
        contextEngine: context,
        reviewer,
        providerRegistry: {
          run: async () => ({ text: 'agent-output', tokensUsed: 1, latencyMs: 1, rawResponse: {} })
        },
        serviceRegistry: new Map([['service', async (_config, executionContext) => String(executionContext.metadata.input ?? '').toUpperCase()]])
      },
      {
        generateRunId: () => 'run-obs-001'
      }
    );

    bridge.bind(conductor.eventBus);
    const result = await conductor.run(observabilityPipeline(), 'hello');
    await bridge.flush();

    expect(result.status === 'completed' || result.status === 'partial').toBe(true);
    expect(telemetryEvents[0]).toBe('maestro.pipeline.started');
    expect(telemetryEvents[telemetryEvents.length - 1]).toBe('maestro.pipeline.completed');
    expect(telemetryEvents).toContain('maestro.reviewer.decision');
    expect(telemetryEvents).not.toContain('maestro.pipeline.failed');
    expect(traceEvents).toEqual(telemetryEvents);
    expect(logEvents[0]).toBe('PipelineStarted');
    expect(logEvents[logEvents.length - 1]).toBe('PipelineCompleted');
    expect(logEvents).toContain('ReviewerDecision');
    expect(telemetryRunIds.every((id) => id === 'run-obs-001')).toBe(true);
    expect(telemetryEnvironments.every((value) => value === 'test')).toBe(true);
    expect(
      telemetryMetadata.some(
        (metadata) =>
          typeof metadata === 'object' &&
          metadata !== null &&
          typeof (metadata.selectedProvidersByNode as Record<string, unknown> | undefined)?.n3 === 'string'
      )
    ).toBe(true);
  });

  it('preserves seeded governance metadata in early pipeline-failure observability traces', async () => {
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
      title: 't',
      template: 'Echo: {{output}}',
      variables: ['output']
    });

    const telemetryEvents: string[] = [];
    const telemetryPayloads: Array<Record<string, unknown> | undefined> = [];
    const bridge = new OttoObservabilityBridge({
      runtimeContext: {
        environment: 'test',
        deploymentChannel: 'stable',
        hostOs: 'windows'
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
          telemetryPayloads.push(payload);
        }
      }
    });

    const conductor = new Conductor({
      promptEngine: prompt,
      contextEngine: context,
      reviewer,
      providerRegistry: {
        run: async () => ({ text: 'agent-output', tokensUsed: 1, latencyMs: 1, rawResponse: {} })
      },
      serviceRegistry: new Map([['service', async (_config, executionContext) => String(executionContext.metadata.input ?? '').toUpperCase()]])
    });

    bridge.bind(conductor.eventBus);
    const result = await conductor.run(invalidObservabilityPipelineWithGovernanceMetadata(), 'hello');
    await bridge.flush();

    expect(result.status).toBe('failed');
    expect(telemetryEvents).toContain('maestro.pipeline.failed');

    const failedPayload = telemetryPayloads.find(
      (payload) => typeof payload?.error === 'string' && String(payload.error).includes('Pipeline graph validation failed')
    );
    expect(failedPayload).toBeDefined();
    expect(failedPayload?.runId).toBe(result.runId);
    expect(failedPayload?.pipelineId).toBe('p-observability-invalid');
    expect(failedPayload?.environment).toBe('test');
    expect(failedPayload?.deploymentChannel).toBe('stable');
    expect(failedPayload?.hostOs).toBe('windows');
    expect((failedPayload?.metadata as Record<string, unknown> | undefined)?.providerRoutingWarning).toBe('seeded-warning');
    expect(
      ((failedPayload?.metadata as Record<string, unknown> | undefined)?.governanceState as Record<string, unknown> | undefined)
        ?.budgetRemaining
    ).toBe(3);
    expect(
      ((failedPayload?.metadata as Record<string, unknown> | undefined)?.governancePolicy as Record<string, unknown> | undefined)
        ?.selectionStrategy
    ).toBe('weighted');
  });

  it('preserves seeded governance metadata for cycle-validation failures', async () => {
    const prompt = new PromptEngine();
    const context = new ContextEngine();
    const rules = new RulesEngine();
    const reviewer = new Reviewer(rules, prompt);

    const telemetryPayloads: Array<Record<string, unknown> | undefined> = [];
    const bridge = new OttoObservabilityBridge({
      runtimeContext: {
        environment: 'test',
        deploymentChannel: 'stable',
        hostOs: 'windows'
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
          telemetryPayloads.push(payload);
        }
      }
    });

    const conductor = new Conductor({
      promptEngine: prompt,
      contextEngine: context,
      reviewer,
      providerRegistry: {
        run: async () => ({ text: 'agent-output', tokensUsed: 1, latencyMs: 1, rawResponse: {} })
      },
      serviceRegistry: new Map([['service', async (_config, executionContext) => String(executionContext.metadata.input ?? '').toUpperCase()]])
    });

    bridge.bind(conductor.eventBus);
    const result = await conductor.run(invalidObservabilityCyclePipelineWithGovernanceMetadata(), 'hello');
    await bridge.flush();

    expect(result.status).toBe('failed');
    const failedPayload = telemetryPayloads.find((payload) => typeof payload?.error === 'string' && String(payload.error).includes('CYCLE_DETECTED'));
    expect(failedPayload).toBeDefined();
    expect((failedPayload?.metadata as Record<string, unknown> | undefined)?.providerRoutingWarning).toBe('seeded-cycle-warning');
    expect(
      ((failedPayload?.metadata as Record<string, unknown> | undefined)?.governanceState as Record<string, unknown> | undefined)
        ?.budgetRemaining
    ).toBe(2);
    expect(
      ((failedPayload?.metadata as Record<string, unknown> | undefined)?.governancePolicy as Record<string, unknown> | undefined)
        ?.selectionStrategy
    ).toBe('latency-first');
  });

  it('includes governance metadata in node-failed telemetry for runtime service failures', async () => {
    const prompt = new PromptEngine();
    const context = new ContextEngine();
    const rules = new RulesEngine();
    const reviewer = new Reviewer(rules, prompt);

    const telemetryEvents: Array<{ eventName: string; payload: Record<string, unknown> | undefined }> = [];
    const bridge = new OttoObservabilityBridge({
      runtimeContext: {
        environment: 'test',
        deploymentChannel: 'stable',
        hostOs: 'windows'
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
          telemetryEvents.push({ eventName, payload });
        }
      }
    });

    const conductor = new Conductor({
      promptEngine: prompt,
      contextEngine: context,
      reviewer,
      providerRegistry: {
        run: async () => ({ text: 'agent-output', tokensUsed: 1, latencyMs: 1, rawResponse: {} })
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

    bridge.bind(conductor.eventBus);
    const result = await conductor.run(runtimeFailureObservabilityPipelineWithGovernanceMetadata(), 'hello');
    await bridge.flush();

    expect(result.status).toBe('partial');
    const nodeFailedEvent = telemetryEvents.find(
      (event) => event.eventName === 'maestro.node.failed' && String(event.payload?.nodeId ?? '') === 'n2'
    );
    expect(nodeFailedEvent).toBeDefined();
    expect(String(nodeFailedEvent?.payload?.error ?? '')).toContain('intentional runtime service failure');
    expect(nodeFailedEvent?.payload?.environment).toBe('test');
    expect(nodeFailedEvent?.payload?.deploymentChannel).toBe('stable');
    expect(nodeFailedEvent?.payload?.hostOs).toBe('windows');
    expect(
      ((nodeFailedEvent?.payload?.metadata as Record<string, unknown> | undefined)?.governanceState as Record<string, unknown> | undefined)
        ?.budgetRemaining
    ).toBe(4);
    expect((nodeFailedEvent?.payload?.metadata as Record<string, unknown> | undefined)?.providerRoutingWarning).toBe('seeded-runtime-warning');
  });

  it('emits retry-exhaustion node telemetry while preserving mixed-outcome runtime continuity metadata', async () => {
    const prompt = new PromptEngine();
    const context = new ContextEngine();
    const rules = new RulesEngine();
    const reviewer = new Reviewer(rules, prompt);

    let failingAttempts = 0;
    const telemetryEvents: Array<{ eventName: string; payload: Record<string, unknown> | undefined }> = [];
    const bridge = new OttoObservabilityBridge({
      runtimeContext: {
        environment: 'test',
        deploymentChannel: 'stable',
        hostOs: 'windows'
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
          telemetryEvents.push({ eventName, payload });
        }
      }
    });

    const conductor = new Conductor({
      promptEngine: prompt,
      contextEngine: context,
      reviewer,
      providerRegistry: {
        run: async () => ({ text: 'agent-output', tokensUsed: 1, latencyMs: 1, rawResponse: {} })
      },
      serviceRegistry: new Map([
        [
          'service',
          async (nodeConfig) => {
            if (String(nodeConfig.mode ?? '') === 'fail') {
              failingAttempts += 1;
              throw new Error('intentional retry exhaustion failure');
            }
            return 'service-success-output';
          }
        ]
      ])
    });

    bridge.bind(conductor.eventBus);
    const result = await conductor.run(runtimeRetryExhaustionMixedOutcomePipelineWithGovernanceMetadata(), 'hello');
    await bridge.flush();

    expect(result.status).toBe('partial');
    expect(failingAttempts).toBe(3);
    expect(result.nodeResults.get('n2')?.status).toBe('failed');
    expect(result.nodeResults.get('n3')?.status).toBe('completed');
    expect(telemetryEvents.some((event) => event.eventName === 'maestro.pipeline.completed')).toBe(true);
    expect(telemetryEvents.some((event) => event.eventName === 'maestro.pipeline.failed')).toBe(false);

    const nodeFailedEvent = telemetryEvents.find(
      (event) => event.eventName === 'maestro.node.failed' && String(event.payload?.nodeId ?? '') === 'n2'
    );
    expect(nodeFailedEvent).toBeDefined();
    expect(nodeFailedEvent?.payload?.retriesExhausted).toBe(true);
    expect(String(nodeFailedEvent?.payload?.error ?? '')).toContain('intentional retry exhaustion failure');
    expect(nodeFailedEvent?.payload?.environment).toBe('test');
    expect(nodeFailedEvent?.payload?.deploymentChannel).toBe('stable');
    expect(nodeFailedEvent?.payload?.hostOs).toBe('windows');
    expect((nodeFailedEvent?.payload?.metadata as Record<string, unknown> | undefined)?.providerRoutingWarning).toBe(
      'seeded-runtime-retry-warning'
    );
    expect(
      ((nodeFailedEvent?.payload?.metadata as Record<string, unknown> | undefined)?.governanceState as
        | Record<string, unknown>
        | undefined)?.budgetRemaining
    ).toBe(6);
  });

  it('emits deterministic telemetry for multi-failure layer combinations', async () => {
    const prompt = new PromptEngine();
    const context = new ContextEngine();
    const rules = new RulesEngine();
    const reviewer = new Reviewer(rules, prompt);

    let failAAttempts = 0;
    let failBAttempts = 0;
    const telemetryEvents: Array<{ eventName: string; payload: Record<string, unknown> | undefined }> = [];
    const bridge = new OttoObservabilityBridge({
      runtimeContext: {
        environment: 'test',
        deploymentChannel: 'stable',
        hostOs: 'windows'
      },
      logging: { info: async () => {}, error: async () => {} },
      tracing: {
        startSpan: async () => ({
          annotate: async () => {},
          end: async () => {}
        })
      },
      telemetry: {
        emit: async (eventName, payload) => {
          telemetryEvents.push({ eventName, payload });
        }
      }
    });

    const conductor = new Conductor({
      promptEngine: prompt,
      contextEngine: context,
      reviewer,
      providerRegistry: {
        run: async () => ({ text: 'agent-output', tokensUsed: 1, latencyMs: 1, rawResponse: {} })
      },
      serviceRegistry: new Map([
        [
          'service',
          async (nodeConfig) => {
            const mode = String(nodeConfig.mode ?? '');
            if (mode === 'fail-a') {
              failAAttempts += 1;
              throw new Error('intentional multi failure A');
            }
            if (mode === 'fail-b') {
              failBAttempts += 1;
              throw new Error('intentional multi failure B');
            }
            return 'ok';
          }
        ]
      ])
    });

    bridge.bind(conductor.eventBus);
    const result = await conductor.run(runtimeMultiFailureLayerPipelineWithGovernanceMetadata(), 'hello');
    await bridge.flush();

    expect(result.status).toBe('partial');
    expect(failAAttempts).toBe(2);
    expect(failBAttempts).toBe(1);
    expect(result.nodeResults.get('n2')?.status).toBe('failed');
    expect(result.nodeResults.get('n3')?.status).toBe('failed');
    expect(telemetryEvents.some((event) => event.eventName === 'maestro.pipeline.completed')).toBe(true);
    expect(telemetryEvents.some((event) => event.eventName === 'maestro.pipeline.failed')).toBe(false);

    const nodeFailedEvents = telemetryEvents.filter((event) => event.eventName === 'maestro.node.failed');
    expect(nodeFailedEvents).toHaveLength(2);
    expect(
      nodeFailedEvents.every(
        (event) =>
          event.payload?.retriesExhausted === true &&
          event.payload?.environment === 'test' &&
          event.payload?.deploymentChannel === 'stable' &&
          event.payload?.hostOs === 'windows'
      )
    ).toBe(true);
    expect(
      nodeFailedEvents.every(
        (event) =>
          (event.payload?.metadata as Record<string, unknown> | undefined)?.providerRoutingWarning === 'seeded-multi-failure-warning'
      )
    ).toBe(true);
  });

  it('emits fallback-cascade failure telemetry when preferred routing fails and fallback provider run fails', async () => {
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
      title: 't',
      template: 'Echo: {{output}}',
      variables: ['output']
    });

    const telemetryEvents: Array<{ eventName: string; payload: Record<string, unknown> | undefined }> = [];
    const bridge = new OttoObservabilityBridge({
      runtimeContext: { environment: 'test', deploymentChannel: 'stable', hostOs: 'windows' },
      logging: { info: async () => {}, error: async () => {} },
      tracing: {
        startSpan: async () => ({
          annotate: async () => {},
          end: async () => {}
        })
      },
      telemetry: {
        emit: async (eventName, payload) => {
          telemetryEvents.push({ eventName, payload });
        }
      }
    });

    const conductor = new Conductor({
      promptEngine: prompt,
      contextEngine: context,
      reviewer,
      providerRegistry: {
        run: async (providerId) => {
          if (providerId === 'alpha') {
            throw new Error('fallback provider execution failed');
          }
          return { text: 'agent-output', tokensUsed: 1, latencyMs: 1, rawResponse: {} };
        }
      },
      providerRouting: {
        resolvePreferredProviderId: async () => {
          throw new Error('preferred resolver unavailable');
        }
      },
      serviceRegistry: new Map([['service', async () => 'noop']])
    });

    bridge.bind(conductor.eventBus);
    const result = await conductor.run(runtimeFallbackCascadeFailurePipelineWithGovernanceMetadata(), 'hello');
    await bridge.flush();

    expect(result.status).toBe('partial');
    const nodeFailedEvent = telemetryEvents.find((event) => event.eventName === 'maestro.node.failed');
    expect(nodeFailedEvent).toBeDefined();
    expect(nodeFailedEvent?.payload?.nodeId).toBe('n2');
    expect(nodeFailedEvent?.payload?.retriesExhausted).toBe(true);
    expect(String(nodeFailedEvent?.payload?.error ?? '')).toContain('fallback provider execution failed');
    expect(String((nodeFailedEvent?.payload?.metadata as Record<string, unknown> | undefined)?.providerRoutingWarning ?? '')).toContain(
      'preferred-provider-error'
    );
    expect(String((nodeFailedEvent?.payload?.metadata as Record<string, unknown> | undefined)?.providerRoutingWarning ?? '')).toContain(
      'fallback=alpha'
    );
  });

  it('emits governance policy-state drift telemetry across repeated failure runs', async () => {
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
      title: 't',
      template: 'Echo: {{output}}',
      variables: ['output']
    });

    const providerRegistry = new ProviderRegistry();
    providerRegistry.register({
      providerId: 'alpha',
      displayName: 'alpha',
      discover: async () => [],
      run: async () => ({ text: 'ignored', tokensUsed: 1, latencyMs: 1, rawResponse: {} }),
      healthCheck: async () => ({ status: 'healthy', latencyMs: 5 })
    });

    let governanceState: ProviderGovernanceState = {
      blockedProviderIds: [],
      cooldownUntilByProviderId: {},
      budgetRemaining: 6,
      reserveBudget: 1
    };

    const nodeFailedBudgets: number[] = [];
    const telemetryEvents: Array<{ eventName: string; payload: Record<string, unknown> | undefined }> = [];
    const bridge = new OttoObservabilityBridge({
      runtimeContext: { environment: 'test', deploymentChannel: 'stable', hostOs: 'windows' },
      logging: { info: async () => {}, error: async () => {} },
      tracing: {
        startSpan: async () => ({
          annotate: async () => {},
          end: async () => {}
        })
      },
      telemetry: {
        emit: async (eventName, payload) => {
          telemetryEvents.push({ eventName, payload });
          if (eventName === 'maestro.node.failed' && String(payload?.nodeId ?? '') === 'n2') {
            const budget = Number(
              ((payload?.metadata as Record<string, unknown> | undefined)?.governanceState as Record<string, unknown> | undefined)
                ?.budgetRemaining
            );
            if (Number.isFinite(budget)) {
              nodeFailedBudgets.push(budget);
            }
          }
        }
      }
    });

    const conductor = new Conductor({
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
              providerCostByProviderId: { alpha: 2 }
            },
            governanceState,
            new Date('2026-10-18T00:00:00.000Z')
          );
          executionContext.metadata.governancePolicy = policy;
          executionContext.metadata.governanceState = governanceState;

          const selectedProviderId = await providerRegistry.resolvePreferredProviderId(policy, ['alpha']);
          governanceState = providerRegistry.createNextGovernanceState({
            previousState: governanceState,
            policy,
            selectedProviderId,
            evaluatedAt: new Date('2026-10-18T00:00:00.000Z')
          });
          executionContext.metadata.governanceState = governanceState;
          return selectedProviderId;
        }
      },
      serviceRegistry: new Map([['service', async () => 'noop']])
    });

    bridge.bind(conductor.eventBus);
    const first = await conductor.run(runtimePolicyStateDriftFailurePipelineWithGovernanceMetadata(), 'hello-1');
    const second = await conductor.run(runtimePolicyStateDriftFailurePipelineWithGovernanceMetadata(), 'hello-2');
    await bridge.flush();

    expect(first.status).toBe('partial');
    expect(second.status).toBe('partial');
    expect(nodeFailedBudgets).toEqual([4, 2]);
    expect(governanceState.budgetRemaining).toBe(2);
    expect(telemetryEvents.filter((event) => event.eventName === 'maestro.node.failed')).toHaveLength(2);
    expect(telemetryEvents.filter((event) => event.eventName === 'maestro.pipeline.completed')).toHaveLength(2);
    expect(telemetryEvents.some((event) => event.eventName === 'maestro.pipeline.failed')).toBe(false);
  });
});
