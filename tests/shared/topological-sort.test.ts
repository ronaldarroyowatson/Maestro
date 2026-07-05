import { describe, expect, it } from 'vitest';
import { CycleDetectedError, topoSort } from '../../src/shared/index.js';
import type { Graph } from '../../src/shared/index.js';

describe('topoSort', () => {
  it('returns layered order for acyclic graph', () => {
    const graph: Graph = {
      graphId: 'g1',
      nodes: [
        { instanceId: 'A', nodeTypeId: 'trigger', config: {}, position: { x: 0, y: 0 } },
        { instanceId: 'B', nodeTypeId: 'service', config: {}, position: { x: 1, y: 0 } },
        { instanceId: 'C', nodeTypeId: 'service', config: {}, position: { x: 2, y: 0 } }
      ],
      edges: [
        { edgeId: 'e1', fromNodeId: 'A', fromPort: 'out', toNodeId: 'B', toPort: 'in' },
        { edgeId: 'e2', fromNodeId: 'B', fromPort: 'out', toNodeId: 'C', toPort: 'in' }
      ]
    };

    expect(topoSort(graph)).toEqual([['A'], ['B'], ['C']]);
  });

  it('throws on cyclic graph', () => {
    const graph: Graph = {
      graphId: 'g2',
      nodes: [
        { instanceId: 'A', nodeTypeId: 'service', config: {}, position: { x: 0, y: 0 } },
        { instanceId: 'B', nodeTypeId: 'service', config: {}, position: { x: 1, y: 0 } }
      ],
      edges: [
        { edgeId: 'e1', fromNodeId: 'A', fromPort: 'out', toNodeId: 'B', toPort: 'in' },
        { edgeId: 'e2', fromNodeId: 'B', fromPort: 'out', toNodeId: 'A', toPort: 'in' }
      ]
    };

    expect(() => topoSort(graph)).toThrowError(CycleDetectedError);
  });
});
