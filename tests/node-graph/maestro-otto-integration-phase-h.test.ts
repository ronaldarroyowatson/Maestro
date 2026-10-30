import { describe, expect, it } from 'vitest';
import type { GraphDefinition, ResourceNode } from '../../src/shared/index.js';
import { MaestroOttoIntegrationService } from '../../features/node-graph/services/maestro-otto-integration/index.js';

function resource(id: string, type: ResourceNode['type'], tags: string[] = []): ResourceNode {
  return {
    id,
    name: id,
    type,
    status: 'healthy',
    tags,
    metadata: {},
    relationships: [],
    discoveredBy: 'test',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    lastSeen: new Date('2026-01-01T00:00:00Z')
  };
}

describe('node-graph phase h maestro-otto integration tests', () => {
  it('Circular Dependency Test', () => {
    const graph: GraphDefinition = {
      graphId: 'cycle-h',
      version: '1.0.0',
      name: 'cycle-h',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      nodes: [
        { id: 'a', type: 'service', label: 'A' },
        { id: 'b', type: 'service', label: 'B' }
      ],
      edges: [
        { id: 'e1', from: 'a', to: 'b' },
        { id: 'e2', from: 'b', to: 'a' }
      ]
    };

    const service = new MaestroOttoIntegrationService();
    const plan = service.buildExecutionPlan(graph, []);
    expect(plan.validation.valid).toBe(false);
    expect(plan.validation.errors.some((error) => error.includes('contains a cycle'))).toBe(true);
  });

  it('Unexpected Resource Type Test', () => {
    const graph: GraphDefinition = {
      graphId: 'resource-h',
      version: '1.0.0',
      name: 'resource-h',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      nodes: [
        {
          id: 'step-1',
          type: 'service',
          label: 'Step 1',
          resources: [{ kind: 'model', id: 'model-1', capability: 'fast_inference' }]
        }
      ],
      edges: []
    };

    const service = new MaestroOttoIntegrationService();
    const plan = service.buildExecutionPlan(graph, [resource('tool-1', 'tool', ['fast_inference'])]);
    expect(plan.validation.valid).toBe(true);
    expect(plan.validation.warnings.some((warning) => warning.includes('No resource match found'))).toBe(true);
  });

  it('Large Scale Resource Scan Test', () => {
    const nodes = Array.from({ length: 50 }, (_, index) => ({
      id: `node-${index}`,
      type: 'service' as const,
      label: `Node ${index}`
    }));
    const edges = Array.from({ length: 49 }, (_, index) => ({
      id: `edge-${index}`,
      from: `node-${index}`,
      to: `node-${index + 1}`
    }));
    const graph: GraphDefinition = {
      graphId: 'large-h',
      version: '1.0.0',
      name: 'large-h',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      nodes,
      edges
    };

    const service = new MaestroOttoIntegrationService();
    const plan = service.buildExecutionPlan(graph, []);
    expect(plan.validation.valid).toBe(true);
    expect(plan.layers).toHaveLength(50);
  });
});
