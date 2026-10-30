import { describe, expect, it } from 'vitest';
import type { ResourceNode } from '../../src/shared/index.js';
import { buildPhaseIGraph } from '../../features/node-graph/services/end-to-end-validation/index.js';
import { MaestroOttoIntegrationService } from '../../features/node-graph/services/maestro-otto-integration/index.js';

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

describe('node-graph phase i end-to-end tests', () => {
  it('End-to-End Discovery to Registration Test', () => {
    const graph = buildPhaseIGraph([resource('model:ollama:tinyllama', 'model')]);
    expect(graph.nodes.some((node) => node.id === 'model-step')).toBe(true);
    expect(graph.edges).toHaveLength(2);
  });

  it('Graph Execution Trace Test', () => {
    const service = new MaestroOttoIntegrationService();
    const graph = buildPhaseIGraph([resource('model:ollama:tinyllama', 'model')]);
    const plan = service.buildExecutionPlan(graph, [resource('model:ollama:tinyllama', 'model')]);
    expect(plan.validation.valid).toBe(true);
    expect(plan.layers).toEqual([['start'], ['model-step'], ['finish']]);
  });

  it('Missing Configuration Test', () => {
    const service = new MaestroOttoIntegrationService();
    const graph = buildPhaseIGraph([]);
    const plan = service.buildExecutionPlan(graph, []);
    expect(plan.validation.warnings.some((warning) => warning.includes('No resource match found'))).toBe(true);
  });
});
