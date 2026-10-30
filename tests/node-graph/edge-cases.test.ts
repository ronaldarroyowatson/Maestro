import { describe, expect, it } from 'vitest';
import { NodeGraphUiStateBuilder } from '../../features/node-graph/services/ui-integration/index.js';

describe('node-graph edge-case tests', () => {
  it('Empty Resource List Test', () => {
    const builder = new NodeGraphUiStateBuilder();
    const state = builder.build({
      graph: {
        graphId: 'empty-graph',
        version: '1.0.0',
        name: 'empty-graph',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        nodes: [],
        edges: []
      }
    });

    expect(state.validation.valid).toBe(true);
    expect(state.nodes).toEqual([]);
    expect(state.edges).toEqual([]);
  });

  it('Very Long Resource Name Test', () => {
    const builder = new NodeGraphUiStateBuilder();
    const veryLongLabel = `node-${'x'.repeat(140)}`;
    const state = builder.build({
      graph: {
        graphId: 'long-label-graph',
        version: '1.0.0',
        name: 'long-label-graph',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        nodes: [{ id: 'entry', type: 'trigger', label: veryLongLabel }],
        edges: []
      }
    });

    expect(state.validation.valid).toBe(true);
    expect(state.validation.warnings.some((warning) => warning.includes("label length exceeds 120 characters"))).toBe(true);
  });
});
