import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { validateMaestroNodeGraphContract } from '../../src/shared/index.js';
import { NodeGraphUiStateBuilder } from '../../features/node-graph/services/ui-integration/index.js';

describe('node-graph functionality tests', () => {
  it('Node Graph Contract Test', () => {
    const repoRoot = path.resolve(process.cwd());
    const result = validateMaestroNodeGraphContract(repoRoot);

    expect(result.ok).toBe(true);
    expect(result.problems).toEqual([]);
  });

  it('Node Connection Test', () => {
    const builder = new NodeGraphUiStateBuilder();
    const state = builder.build({
      graph: {
        graphId: 'functional-graph',
        version: '1.0.0',
        name: 'functional',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        nodes: [
          { id: 'entry', type: 'trigger', label: 'Entry' },
          { id: 'service', type: 'service', label: 'Service' }
        ],
        edges: [{ id: 'edge-1', from: 'entry', to: 'service' }]
      }
    });

    expect(state.validation.valid).toBe(true);
    expect(state.edges).toHaveLength(1);
  });
});
