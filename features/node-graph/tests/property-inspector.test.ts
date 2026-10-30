import { describe, expect, it } from 'vitest';
import type { GraphDefinition } from '../../../src/shared/index.js';
import { NodePropertyInspector } from '../services/property-inspector/index.js';

function createGraph(): GraphDefinition {
  return {
    graphId: 'inspector-graph',
    version: '1.0.0',
    name: 'Inspector Graph',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    nodes: [
      { id: 'start', type: 'trigger', label: 'Start', config: { retry: 1 } },
      { id: 'worker', type: 'service', label: 'Worker', description: 'Performs work', config: { timeoutMs: 1000 } },
      { id: 'review', type: 'reviewer', label: 'Review' }
    ],
    edges: [
      { id: 'e1', from: 'start', to: 'worker' },
      { id: 'e2', from: 'worker', to: 'review' }
    ]
  };
}

describe('node property inspector', () => {
  it('Node Property Inspector Test', () => {
    const inspector = new NodePropertyInspector();
    const state = inspector.inspect({
      graph: createGraph(),
      nodeId: 'worker',
      nodeStatusById: { worker: 'running' }
    });

    expect(state.selectedNodeId).toBe('worker');
    expect(state.name).toBe('Worker');
    expect(state.type).toBe('service');
    expect(state.status).toBe('running');
    expect(state.connections.incoming).toHaveLength(1);
    expect(state.connections.outgoing).toHaveLength(1);
    expect(state.validation.valid).toBe(true);
  });

  it('Live Property Update Test', () => {
    const inspector = new NodePropertyInspector();
    const update = inspector.applyUpdates({
      graph: createGraph(),
      nodeId: 'worker',
      updates: {
        name: 'Worker Updated',
        config: {
          timeoutMs: 2000,
          batchSize: 8
        }
      }
    });

    expect(update.changed).toBe(true);
    expect(update.graph.nodes.find((node) => node.id === 'worker')?.label).toBe('Worker Updated');
    expect(update.graph.nodes.find((node) => node.id === 'worker')?.config?.timeoutMs).toBe(2000);
    expect(update.inspector.configuration.batchSize).toBe(8);
  });
});
