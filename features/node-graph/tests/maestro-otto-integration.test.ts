import { describe, expect, it } from 'vitest';
import type { GraphDefinition, ResourceNode } from '../../../src/shared/index.js';
import { MaestroOttoIntegrationService } from '../services/maestro-otto-integration/index.js';

function sampleGraph(): GraphDefinition {
  return {
    graphId: 'phase-h-graph',
    version: '1.0.0',
    name: 'Phase H Graph',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    nodes: [
      { id: 'start', type: 'trigger', label: 'Start' },
      {
        id: 'model-step',
        type: 'service',
        label: 'Model Step',
        resources: [{ kind: 'model', id: 'model:ollama:tinyllama', name: 'tinyllama', capability: 'fast_inference' }]
      },
      { id: 'finish', type: 'reviewer', label: 'Finish' }
    ],
    edges: [
      { id: 'e1', from: 'start', to: 'model-step' },
      { id: 'e2', from: 'model-step', to: 'finish' }
    ]
  };
}

function sampleResources(): ResourceNode[] {
  return [
    {
      id: 'model:ollama:tinyllama',
      name: 'tinyllama',
      type: 'model',
      status: 'healthy',
      tags: ['fast_inference', 'local'],
      metadata: { provider: 'ollama' },
      relationships: [],
      discoveredBy: 'ollama-model-scanner',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      lastSeen: new Date('2026-01-01T00:00:00Z')
    }
  ];
}

describe('maestro otto integration service', () => {
  it('Graph to Runtime Execution Test', async () => {
    const service = new MaestroOttoIntegrationService();
    const result = await service.executeGraphRun({
      pipelineId: 'pipeline-h-1',
      graph: sampleGraph(),
      resources: sampleResources(),
      requestInput: { prompt: 'hello world' },
      strictResourceMapping: true
    });

    expect(result.run.pipelineId).toBe('pipeline-h-1');
    expect(result.plan.validation.valid).toBe(true);
    expect(result.plan.layers).toEqual([['start'], ['model-step'], ['finish']]);
    expect(result.uiState.graphId).toBe('phase-h-graph');
  });

  it('Registry Resource Mapping Test', () => {
    const service = new MaestroOttoIntegrationService();
    const plan = service.buildExecutionPlan(sampleGraph(), sampleResources());
    const mapped = plan.executionNodes.find((node) => node.nodeId === 'model-step')?.resources[0];

    expect(plan.validation.valid).toBe(true);
    expect(mapped?.matchedResource?.id).toBe('model:ollama:tinyllama');
  });

  it('Missing Resource Mapping Test', async () => {
    const service = new MaestroOttoIntegrationService();
    await expect(
      service.executeGraphRun({
        pipelineId: 'pipeline-h-2',
        graph: sampleGraph(),
        resources: [],
        requestInput: {},
        strictResourceMapping: true
      })
    ).rejects.toThrow('Resource mappings missing');
  });
});
