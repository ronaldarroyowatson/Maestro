import { describe, expect, it } from 'vitest';
import { NodeGraphUiStateBuilder } from '../../features/node-graph/services/ui-integration/index.js';

describe('node-graph common failure mode tests', () => {
  it('Missing Configuration Test', () => {
    const builder = new NodeGraphUiStateBuilder();
    const state = builder.build({
      graph: {
        graphId: 'missing-node-reference',
        version: '1.0.0',
        name: 'missing-node-reference',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        nodes: [{ id: 'entry', type: 'trigger', label: 'Entry' }],
        edges: [{ id: 'edge-unknown', from: 'entry', to: 'service' }]
      }
    });

    expect(state.validation.valid).toBe(false);
    expect(state.validation.errors.some((error) => error.includes("Edge 'edge-unknown' references an unknown node."))).toBe(
      true
    );
  });

  it('Invalid Endpoint Test', () => {
    const builder = new NodeGraphUiStateBuilder();
    const state = builder.build({
      graph: {
        graphId: 'invalid-connection',
        version: '1.0.0',
        name: 'invalid-connection',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        nodes: [
          { id: 'entry', type: 'trigger', label: 'Entry' },
          { id: 'worker', type: 'service', label: 'Worker' }
        ],
        edges: [{ id: 'edge-invalid-port', from: 'entry', to: 'worker', condition: 'unexpected' }]
      },
      nodeDefinitions: {
        trigger: {
          nodeTypeId: 'trigger',
          shape: 'trigger',
          displayName: 'Trigger',
          configSchema: { type: 'object' },
          inputPorts: [],
          outputPorts: [{ portId: 'out', portType: 'signal', schema: {}, required: false }]
        },
        service: {
          nodeTypeId: 'service',
          shape: 'service',
          displayName: 'Service',
          configSchema: { type: 'object' },
          inputPorts: [{ portId: 'in', portType: 'text', schema: {}, required: true }],
          outputPorts: [{ portId: 'out', portType: 'json', schema: {}, required: false }]
        }
      }
    });

    expect(state.validation.valid).toBe(false);
    expect(state.validation.errors.some((error) => error.includes("Edge 'edge-invalid-port' has incompatible ports"))).toBe(
      true
    );
  });
});
