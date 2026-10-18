import { describe, expect, it } from 'vitest';
import { InMemoryGraphService } from '../index.js';
import type { GraphDefinition } from '../../../src/shared/index.js';

const buildGraph = (): GraphDefinition => ({
  graphId: 'graph-1',
  version: '1.0.0',
  name: 'Demo workflow',
  description: 'Graph service smoke test',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  nodes: [
    { id: 'n1', type: 'trigger', label: 'Start', description: 'Entry', resources: [] },
    { id: 'n2', type: 'service', label: 'Transform', description: 'Work', resources: [] },
    { id: 'n3', type: 'service', label: 'Done', description: 'Exit', resources: [] }
  ],
  edges: [
    { id: 'e1', from: 'n1', to: 'n2', label: 'start-to-transform' },
    { id: 'e2', from: 'n2', to: 'n3', label: 'transform-to-done' }
  ],
  layout: {
    n1: { nodeId: 'n1', x: 0, y: 0 },
    n2: { nodeId: 'n2', x: 100, y: 0 },
    n3: { nodeId: 'n3', x: 200, y: 0 }
  },
  serialized: JSON.stringify({ graphId: 'graph-1', version: '1.0.0' })
});

describe('graph service', () => {
  it('persists and retrieves a graph by id', async () => {
    const service = new InMemoryGraphService();
    const graph = buildGraph();

    const persisted = await service.createGraph(graph);
    expect(persisted.graphId).toBe('graph-1');
    expect(persisted.version).toBe('1.0.0');

    const loaded = await service.getGraph('graph-1');
    expect(loaded?.name).toBe('Demo workflow');
    expect(loaded?.nodes).toHaveLength(3);
  });

  it('queries nodes and traverses from a start node', async () => {
    const service = new InMemoryGraphService();
    const graph = buildGraph();
    await service.createGraph(graph);

    const nodes = await service.queryGraph({ graphId: 'graph-1', nodeId: 'n2' });
    expect(Array.isArray(nodes)).toBe(true);
    expect((nodes as Array<{ id: string }>)[0]?.id).toBe('n2');

    const traversal = await service.traverseGraph({
      graphId: 'graph-1',
      fromNodeId: 'n1',
      traversal: 'breadth',
      maxDepth: 2
    });

    expect(traversal.found).toBe(true);
    expect(traversal.traversedNodeIds).toEqual(['n1', 'n2', 'n3']);
    expect(traversal.traversedEdgeIds).toEqual(['e1', 'e2']);
  });
});
