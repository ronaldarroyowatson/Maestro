import { describe, expect, it } from 'vitest';
import type { ResourceNode } from '../../../src/shared/index.js';
import { WorkflowRuntimeService } from '../../workflow-runtime/index.js';
import { MaestroOttoIntegrationService } from '../services/maestro-otto-integration/index.js';
import { buildPhaseIGraph, runPhaseIEndToEndValidation } from '../services/end-to-end-validation/index.js';

function resource(id: string, type: ResourceNode['type']): ResourceNode {
  return {
    id,
    name: id,
    type,
    status: 'healthy',
    tags: ['local'],
    metadata: {},
    relationships: [],
    discoveredBy: 'test',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    lastSeen: new Date('2026-01-01T00:00:00Z')
  };
}

describe('phase i end-to-end validation helpers', () => {
  it('builds a graph that binds the discovered model', () => {
    const graph = buildPhaseIGraph([resource('model:ollama:tinyllama', 'model')]);
    const modelNode = graph.nodes.find((node) => node.id === 'model-step');
    expect(modelNode?.resources?.[0].id).toBe('model:ollama:tinyllama');
  });

  it('executes discovery-to-runtime validation flow', async () => {
    const resources = [resource('runtime:ollama', 'runtime'), resource('model:ollama:tinyllama', 'model')];
    const discovery = {
      registry: {
        list: () => resources
      },
      scanAll: async () => ({
        resources: [
          {
            id: 'runtime:ollama',
            name: 'Ollama Runtime',
            type: 'runtime' as const,
            status: 'healthy' as const,
            metadata: {},
            discoveredBy: 'runtime-scanner',
            lastSeen: new Date()
          },
          {
            id: 'model:ollama:tinyllama',
            name: 'tinyllama',
            type: 'model' as const,
            status: 'healthy' as const,
            metadata: {},
            discoveredBy: 'model-scanner',
            lastSeen: new Date()
          }
        ],
        graph: {
          graphId: 'g',
          nodes: [],
          edges: [],
          scannedAt: new Date()
        },
        scannedAt: new Date()
      })
    };

    const runtime = new WorkflowRuntimeService();
    const integration = new MaestroOttoIntegrationService(runtime);
    const report = await runPhaseIEndToEndValidation({
      discovery: discovery as never,
      integration,
      runtime,
      context: {}
    });

    expect(report.assertions.every((assertion) => assertion.result === 'PASS')).toBe(true);
    expect(report.executionTrace.states).toEqual(['pending', 'paused', 'running', 'cancelled']);
  });
});
