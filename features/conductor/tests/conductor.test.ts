import { describe, expect, it } from 'vitest';
import type { Pipeline } from '../../../src/shared/index.js';
import { PromptEngine } from '../../prompt-engine/index.js';
import { ContextEngine } from '../../context-engine/index.js';
import { RulesEngine } from '../../rules-engine/index.js';
import { Reviewer } from '../../reviewer/index.js';
import { Conductor } from '../index.js';

function samplePipeline(): Pipeline {
  const now = new Date();
  return {
    id: 'p1',
    version: '1.0.0',
    contentHash: 'hash',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    changelog: 'init',
    metadata: { name: 'test', description: 'd', tags: [], createdAt: now, updatedAt: now },
    graph: {
      graphId: 'g1',
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

describe('conductor', () => {
  it('runs pipeline and emits completion events', async () => {
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
          async (_config, executionContext) => String(executionContext.metadata.input ?? '').toUpperCase()
        ]
      ])
    });

    const events: string[] = [];
    conductor.eventBus.subscribe('PipelineStarted', () => events.push('PipelineStarted'));
    conductor.eventBus.subscribe('NodeCompleted', () => events.push('NodeCompleted'));
    conductor.eventBus.subscribe('ReviewerDecision', () => events.push('ReviewerDecision'));
    conductor.eventBus.subscribe('PipelineCompleted', () => events.push('PipelineCompleted'));

    const result = await conductor.run(samplePipeline(), 'hello');

    expect(result.status === 'completed' || result.status === 'partial').toBe(true);
    expect(events[0]).toBe('PipelineStarted');
    expect(events).toContain('PipelineCompleted');
  });

  it('supports deterministic runtime options for run id and duration', async () => {
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

    let tick = 1000;
    const conductor = new Conductor(
      {
        promptEngine: prompt,
        contextEngine: context,
        reviewer,
        providerRegistry: {
          run: async () => ({ text: 'agent-output', tokensUsed: 1, latencyMs: 1, rawResponse: {} })
        },
        serviceRegistry: new Map([
          [
            'service',
            async (_config, executionContext) => String(executionContext.metadata.input ?? '').toUpperCase()
          ]
        ])
      },
      {
        generateRunId: () => 'run-deterministic-001',
        now: () => {
          tick += 10;
          return tick;
        }
      }
    );

    const result = await conductor.run(samplePipeline(), 'hello');

    expect(result.runId).toBe('run-deterministic-001');
    expect(result.durationMs).toBe(10);
  });
});
