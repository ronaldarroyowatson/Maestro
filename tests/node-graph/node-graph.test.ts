import { describe, expect, it } from 'vitest';
import { NodeGraph } from '../../src/node-graph/index.js';
import type { Graph, NodeDefinition, NodeInstance } from '../../src/shared/index.js';

function baseNode(type: string, id: string): NodeInstance {
  return {
    instanceId: id,
    nodeTypeId: type,
    config: {},
    position: { x: 0, y: 0 }
  };
}

function graphWith(nodes: NodeInstance[], edges: Graph['edges']): Graph {
  return { graphId: 'g', nodes, edges };
}

function typedDefinition(nodeTypeId: string, shape: NodeDefinition['shape']): NodeDefinition {
  const isEntryTrigger = shape === 'trigger' && nodeTypeId.includes('entry');
  const isExitTrigger = shape === 'trigger' && nodeTypeId.includes('exit');

  return {
    nodeTypeId,
    shape,
    displayName: nodeTypeId,
    configSchema: { type: 'object' },
    inputPorts: shape === 'trigger'
      ? (isExitTrigger ? [{ portId: 'in', portType: 'any', schema: {}, required: true }] : [])
      : [{ portId: 'in', portType: 'any', schema: {}, required: true }],
    outputPorts: shape === 'trigger'
      ? (isEntryTrigger ? [{ portId: 'out', portType: 'any', schema: {}, required: false }] : [])
      : [{ portId: 'out', portType: 'any', schema: {}, required: false }]
  };
}

describe('node-graph', () => {
  const feature = new NodeGraph();

  feature.registerNode(typedDefinition('trigger-entry', 'trigger'));
  feature.registerNode(typedDefinition('trigger-exit', 'trigger'));
  feature.registerNode(typedDefinition('service-a', 'service'));
  feature.registerNode(typedDefinition('service-b', 'service'));
  feature.registerNode(typedDefinition('service-c', 'service'));
  feature.registerNode(typedDefinition('service-d', 'service'));
  feature.registerNode(typedDefinition('reviewer-good', 'reviewer'));
  feature.registerNode(typedDefinition('reviewer-bad', 'service'));

  it('validates a linear pipeline A -> B -> C', () => {
    const g = graphWith(
      [baseNode('trigger-entry', 'A'), baseNode('service-a', 'B'), baseNode('trigger-exit', 'C')],
      [
        { edgeId: 'e1', fromNodeId: 'A', fromPort: 'out', toNodeId: 'B', toPort: 'in' },
        { edgeId: 'e2', fromNodeId: 'B', fromPort: 'out', toNodeId: 'C', toPort: 'in' }
      ]
    );

    expect(feature.validate(g).valid).toBe(true);
    expect(feature.topologicalOrder(g)).toEqual([['A'], ['B'], ['C']]);
  });

  it('validates a two-branch graph A -> B, A -> C, B -> D, C -> D', () => {
    const g = graphWith(
      [baseNode('trigger-entry', 'A'), baseNode('service-a', 'B'), baseNode('service-b', 'C'), baseNode('trigger-exit', 'D')],
      [
        { edgeId: 'e1', fromNodeId: 'A', fromPort: 'out', toNodeId: 'B', toPort: 'in' },
        { edgeId: 'e2', fromNodeId: 'A', fromPort: 'out', toNodeId: 'C', toPort: 'in' },
        { edgeId: 'e3', fromNodeId: 'B', fromPort: 'out', toNodeId: 'D', toPort: 'in' },
        { edgeId: 'e4', fromNodeId: 'C', fromPort: 'out', toNodeId: 'D', toPort: 'in' }
      ]
    );

    expect(feature.validate(g).valid).toBe(true);
    expect(feature.topologicalOrder(g)).toEqual([['A'], ['B', 'C'], ['D']]);
  });

  it('detects cycle A -> B -> A', () => {
    const g = graphWith(
      [baseNode('trigger-entry', 'A'), baseNode('trigger-exit', 'B')],
      [
        { edgeId: 'e1', fromNodeId: 'A', fromPort: 'out', toNodeId: 'B', toPort: 'in' },
        { edgeId: 'e2', fromNodeId: 'B', fromPort: 'out', toNodeId: 'A', toPort: 'in' }
      ]
    );

    const result = feature.validate(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.code === 'CYCLE_DETECTED')).toBe(true);
  });

  it('detects missing required input port connection', () => {
    const g = graphWith(
      [baseNode('trigger-entry', 'A'), baseNode('service-a', 'B'), baseNode('trigger-exit', 'C')],
      [{ edgeId: 'e1', fromNodeId: 'A', fromPort: 'out', toNodeId: 'C', toPort: 'in' }]
    );

    const result = feature.validate(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.code === 'MISSING_REQUIRED_INPUT_PORT' && error.nodeId === 'B')).toBe(true);
  });

  it('detects edge references non-existent node instance id', () => {
    const g = graphWith(
      [baseNode('trigger-entry', 'A'), baseNode('trigger-exit', 'C')],
      [{ edgeId: 'e1', fromNodeId: 'A', fromPort: 'out', toNodeId: 'Z', toPort: 'in' }]
    );

    const result = feature.validate(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.code === 'EDGE_REFERENCES_UNKNOWN_NODE')).toBe(true);
  });

  it('detects invalid reviewer assignment shape', () => {
    const g = graphWith(
      [baseNode('trigger-entry', 'A'), baseNode('service-a', 'B'), baseNode('trigger-exit', 'C'), baseNode('reviewer-bad', 'R')],
      [
        { edgeId: 'e1', fromNodeId: 'A', fromPort: 'out', toNodeId: 'B', toPort: 'in', reviewerNodeId: 'R' },
        { edgeId: 'e2', fromNodeId: 'B', fromPort: 'out', toNodeId: 'C', toPort: 'in' }
      ]
    );

    const result = feature.validate(g);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.code === 'INVALID_REVIEWER_SHAPE')).toBe(true);
  });

  it('fails entry trigger validation when no trigger has zero incoming edges', () => {
    const g = graphWith(
      [baseNode('trigger-entry', 'A'), baseNode('trigger-exit', 'B')],
      [
        { edgeId: 'e1', fromNodeId: 'A', fromPort: 'out', toNodeId: 'B', toPort: 'in' },
        { edgeId: 'e2', fromNodeId: 'B', fromPort: 'out', toNodeId: 'A', toPort: 'in' }
      ]
    );

    const result = feature.validate(g);
    expect(result.errors.some((error) => error.code === 'MISSING_ENTRY_TRIGGER')).toBe(true);
  });
});
