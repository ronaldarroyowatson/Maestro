import { describe, expect, it } from 'vitest';
import type { GraphDefinition, NodeDefinition } from '../../../src/shared/index.js';
import { NodeGraphUiStateBuilder } from '../services/ui-integration/index.js';

function buildGraph(overrides?: Partial<GraphDefinition>): GraphDefinition {
  return {
    graphId: 'phase-f-graph',
    version: '1.0.0',
    name: 'Phase F Demo',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    nodes: [
      { id: 'n1', type: 'trigger', label: 'Start' },
      { id: 'n2', type: 'service', label: 'Process' },
      { id: 'n3', type: 'reviewer', label: 'Review' }
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2' },
      { id: 'e2', from: 'n2', to: 'n3' }
    ],
    layout: {
      n1: { nodeId: 'n1', x: 0, y: 0 },
      n2: { nodeId: 'n2', x: 160, y: 0 },
      n3: { nodeId: 'n3', x: 320, y: 0 }
    },
    ...overrides
  };
}

function buildDefinitions(): Record<string, NodeDefinition> {
  return {
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
      inputPorts: [{ portId: 'in', portType: 'signal', schema: {}, required: true }],
      outputPorts: [{ portId: 'out', portType: 'signal', schema: {}, required: false }]
    },
    reviewer: {
      nodeTypeId: 'reviewer',
      shape: 'reviewer',
      displayName: 'Reviewer',
      configSchema: { type: 'object' },
      inputPorts: [{ portId: 'in', portType: 'signal', schema: {}, required: true }],
      outputPorts: [{ portId: 'out', portType: 'signal', schema: {}, required: false }]
    }
  };
}

describe('node graph ui integration', () => {
  it('builds graph ui state with canvas, groups, typed ports, and runtime statuses', () => {
    const builder = new NodeGraphUiStateBuilder();
    const state = builder.build({
      graph: buildGraph(),
      nodeDefinitions: buildDefinitions(),
      nodeStatusById: { n2: 'running' },
      edgeStatusById: { e1: 'complete', e2: 'running' },
      selectedNodeIds: ['n2']
    });

    expect(state.validation.valid).toBe(true);
    expect(state.canvas.features.minimap).toBe(true);
    expect(state.canvas.selectedNodeIds).toEqual(['n2']);
    expect(state.nodes.find((node) => node.id === 'n2')?.status).toBe('running');
    expect(state.edges.find((edge) => edge.id === 'e2')?.status).toBe('running');
  });

  it('detects invalid connection when target node is missing', () => {
    const builder = new NodeGraphUiStateBuilder();
    const state = builder.build({
      graph: buildGraph({
        edges: [{ id: 'e-missing', from: 'n1', to: 'missing-node' }]
      }),
      nodeDefinitions: buildDefinitions()
    });

    expect(state.validation.valid).toBe(false);
    expect(state.validation.errors.some((error) => error.includes("Edge 'e-missing' references an unknown node."))).toBe(
      true
    );
  });

  it('detects incompatible port data types', () => {
    const definitions = buildDefinitions();
    definitions.service.outputPorts = [{ portId: 'out', portType: 'json', schema: {}, required: false }];
    definitions.reviewer.inputPorts = [{ portId: 'in', portType: 'text', schema: {}, required: true }];

    const builder = new NodeGraphUiStateBuilder();
    const state = builder.build({
      graph: buildGraph(),
      nodeDefinitions: definitions
    });

    expect(state.validation.valid).toBe(false);
    expect(state.validation.errors.some((error) => error.includes("Edge 'e2' has incompatible ports"))).toBe(true);
  });
});
