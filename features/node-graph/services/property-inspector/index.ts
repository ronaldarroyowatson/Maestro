import type { GraphDefinition, GraphEdgeDefinition, GraphNodeDefinition } from '../../../../src/shared/index.js';
import type { NodeGraphExecutionStatus } from '../ui-integration/index.js';

export interface NodeInspectorConnection {
  edgeId: string;
  nodeId: string;
  label?: string;
  condition?: string;
}

export interface NodeInspectorProperty {
  key: string;
  value: unknown;
  source: 'system' | 'config';
  editable: boolean;
}

export interface NodeInspectorValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface NodeInspectorState {
  selectedNodeId: string | null;
  name: string | null;
  type: string | null;
  description: string | null;
  status: NodeGraphExecutionStatus;
  properties: NodeInspectorProperty[];
  configuration: Record<string, unknown>;
  connections: {
    incoming: NodeInspectorConnection[];
    outgoing: NodeInspectorConnection[];
  };
  validation: NodeInspectorValidation;
}

export interface NodePropertyUpdateRequest {
  graph: GraphDefinition;
  nodeId: string;
  updates: {
    name?: string;
    description?: string;
    config?: Record<string, unknown>;
  };
  nodeStatusById?: Record<string, NodeGraphExecutionStatus>;
}

export interface NodePropertyUpdateResult {
  graph: GraphDefinition;
  inspector: NodeInspectorState;
  changed: boolean;
}

function cloneNode(node: GraphNodeDefinition): GraphNodeDefinition {
  return {
    ...node,
    config: node.config ? { ...node.config } : undefined,
    resources: node.resources ? node.resources.map((resource) => ({ ...resource })) : undefined,
    routing: node.routing
      ? {
          ...node.routing,
          conditions: node.routing.conditions ? node.routing.conditions.map((condition) => ({ ...condition })) : undefined
        }
      : undefined
  };
}

function cloneEdge(edge: GraphEdgeDefinition): GraphEdgeDefinition {
  return { ...edge };
}

export class NodePropertyInspector {
  inspect(input: {
    graph: GraphDefinition;
    nodeId: string | null;
    nodeStatusById?: Record<string, NodeGraphExecutionStatus>;
  }): NodeInspectorState {
    if (!input.nodeId) {
      return {
        selectedNodeId: null,
        name: null,
        type: null,
        description: null,
        status: 'idle',
        properties: [],
        configuration: {},
        connections: { incoming: [], outgoing: [] },
        validation: { valid: true, errors: [], warnings: [] }
      };
    }

    const node = input.graph.nodes.find((entry) => entry.id === input.nodeId);
    if (!node) {
      return {
        selectedNodeId: input.nodeId,
        name: null,
        type: null,
        description: null,
        status: 'failed',
        properties: [],
        configuration: {},
        connections: { incoming: [], outgoing: [] },
        validation: {
          valid: false,
          errors: [`Node '${input.nodeId}' was not found in graph '${input.graph.graphId}'.`],
          warnings: []
        }
      };
    }

    const validation = this.validateNode(input.graph, node);
    const properties: NodeInspectorProperty[] = [
      { key: 'name', value: node.label, source: 'system', editable: true },
      { key: 'type', value: node.type, source: 'system', editable: false },
      { key: 'description', value: node.description ?? '', source: 'system', editable: true }
    ];
    for (const [key, value] of Object.entries(node.config ?? {})) {
      properties.push({ key: `config.${key}`, value, source: 'config', editable: true });
    }

    return {
      selectedNodeId: node.id,
      name: node.label,
      type: node.type,
      description: node.description ?? null,
      status: input.nodeStatusById?.[node.id] ?? 'idle',
      properties,
      configuration: { ...(node.config ?? {}) },
      connections: this.getConnections(input.graph, node.id),
      validation
    };
  }

  applyUpdates(request: NodePropertyUpdateRequest): NodePropertyUpdateResult {
    const target = request.graph.nodes.find((entry) => entry.id === request.nodeId);
    if (!target) {
      return {
        graph: {
          ...request.graph,
          nodes: request.graph.nodes.map(cloneNode),
          edges: request.graph.edges.map(cloneEdge)
        },
        inspector: this.inspect({ graph: request.graph, nodeId: request.nodeId, nodeStatusById: request.nodeStatusById }),
        changed: false
      };
    }

    const updatedNode: GraphNodeDefinition = cloneNode(target);
    let changed = false;

    if (typeof request.updates.name === 'string' && request.updates.name !== updatedNode.label) {
      updatedNode.label = request.updates.name;
      changed = true;
    }
    if (typeof request.updates.description === 'string' && request.updates.description !== (updatedNode.description ?? '')) {
      updatedNode.description = request.updates.description;
      changed = true;
    }
    if (request.updates.config) {
      const previousConfig = JSON.stringify(updatedNode.config ?? {});
      const merged = {
        ...(updatedNode.config ?? {}),
        ...request.updates.config
      };
      const mergedConfig = JSON.stringify(merged);
      if (previousConfig !== mergedConfig) {
        updatedNode.config = merged;
        changed = true;
      }
    }

    const nodes = request.graph.nodes.map((node) => (node.id === request.nodeId ? updatedNode : cloneNode(node)));
    const graph: GraphDefinition = {
      ...request.graph,
      nodes,
      edges: request.graph.edges.map(cloneEdge),
      updatedAt: changed ? new Date() : request.graph.updatedAt
    };

    return {
      graph,
      inspector: this.inspect({ graph, nodeId: request.nodeId, nodeStatusById: request.nodeStatusById }),
      changed
    };
  }

  private getConnections(graph: GraphDefinition, nodeId: string): NodeInspectorState['connections'] {
    const incoming = graph.edges
      .filter((edge) => edge.to === nodeId)
      .map((edge) => ({ edgeId: edge.id, nodeId: edge.from, label: edge.label, condition: edge.condition }));
    const outgoing = graph.edges
      .filter((edge) => edge.from === nodeId)
      .map((edge) => ({ edgeId: edge.id, nodeId: edge.to, label: edge.label, condition: edge.condition }));

    return {
      incoming: incoming.sort((left, right) => left.edgeId.localeCompare(right.edgeId)),
      outgoing: outgoing.sort((left, right) => left.edgeId.localeCompare(right.edgeId))
    };
  }

  private validateNode(graph: GraphDefinition, node: GraphNodeDefinition): NodeInspectorValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const relatedEdges = graph.edges.filter((edge) => edge.from === node.id || edge.to === node.id);

    if (!node.label || !node.label.trim()) {
      errors.push(`Node '${node.id}' must have a non-empty name.`);
    }

    if (!node.type || !node.type.trim()) {
      errors.push(`Node '${node.id}' must have a type.`);
    }

    if (node.type === 'trigger' && relatedEdges.filter((edge) => edge.to === node.id).length > 0) {
      warnings.push(`Trigger node '${node.id}' has incoming edges.`);
    }

    if (relatedEdges.some((edge) => edge.from === edge.to)) {
      errors.push(`Node '${node.id}' contains at least one self-referential connection.`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export const DEFAULT_NODE_PROPERTY_INSPECTOR = new NodePropertyInspector();
