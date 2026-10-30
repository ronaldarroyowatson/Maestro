import { describe, expect, it } from 'vitest';
import type { GraphDefinition } from '../../src/shared/index.js';
import { NodePropertyInspector } from '../../features/node-graph/services/property-inspector/index.js';

function baseGraph(): GraphDefinition {
  return {
    graphId: 'phase-g-graph',
    version: '1.0.0',
    name: 'Phase G',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    nodes: [
      { id: 'trigger-a', type: 'trigger', label: 'Trigger A' },
      { id: 'service-a', type: 'service', label: 'Service A', config: { mode: 'fast' } }
    ],
    edges: [{ id: 'edge-a', from: 'trigger-a', to: 'service-a' }]
  };
}

describe('node-graph phase g property inspector tests', () => {
  it('Missing Configuration Test', () => {
    const inspector = new NodePropertyInspector();
    const state = inspector.inspect({
      graph: baseGraph(),
      nodeId: 'missing-node'
    });

    expect(state.validation.valid).toBe(false);
    expect(state.validation.errors.some((error) => error.includes("was not found"))).toBe(true);
  });

  it('Invalid State Transition Test', () => {
    const inspector = new NodePropertyInspector();
    const graph = baseGraph();
    graph.edges.push({ id: 'edge-self', from: 'service-a', to: 'service-a' });
    const state = inspector.inspect({ graph, nodeId: 'service-a' });

    expect(state.validation.valid).toBe(false);
    expect(state.validation.errors.some((error) => error.includes('self-referential connection'))).toBe(true);
  });

  it('Empty Resource List Test', () => {
    const inspector = new NodePropertyInspector();
    const state = inspector.inspect({
      graph: baseGraph(),
      nodeId: null
    });

    expect(state.validation.valid).toBe(true);
    expect(state.selectedNodeId).toBeNull();
    expect(state.properties).toEqual([]);
  });

  it('Rapid Repeated Update Test', () => {
    const inspector = new NodePropertyInspector();
    let graph = baseGraph();

    for (let index = 0; index < 10; index += 1) {
      const result = inspector.applyUpdates({
        graph,
        nodeId: 'service-a',
        updates: {
          config: {
            counter: index
          }
        }
      });
      graph = result.graph;
    }

    expect(graph.nodes.find((node) => node.id === 'service-a')?.config?.counter).toBe(9);
  });
});
