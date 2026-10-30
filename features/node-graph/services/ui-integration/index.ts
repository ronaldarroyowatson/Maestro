import type {
  GraphDefinition,
  GraphEdgeDefinition,
  GraphNodeDefinition,
  NodeDefinition,
  RuntimeNodeKind
} from '../../../../src/shared/index.js';

export type NodeGraphExecutionStatus = 'idle' | 'running' | 'complete' | 'failed' | 'paused' | 'skipped';

export interface NodeGraphCanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface NodeGraphCanvasFeatures {
  pan: boolean;
  zoom: boolean;
  grid: boolean;
  minimap: boolean;
  theme: 'dark' | 'light' | 'system';
  nodeSelection: boolean;
}

export interface NodeGraphUiPort {
  id: string;
  direction: 'in' | 'out';
  dataType: string;
  required: boolean;
}

export interface NodeGraphUiNode {
  id: string;
  type: RuntimeNodeKind;
  label: string;
  description?: string;
  status: NodeGraphExecutionStatus;
  position: { x: number; y: number };
  group: string;
  comments: string[];
  ports: NodeGraphUiPort[];
}

export interface NodeGraphUiEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromPort: string;
  toPort: string;
  label?: string;
  condition?: string;
  status: NodeGraphExecutionStatus;
}

export interface NodeGraphUiGroup {
  id: string;
  label: string;
  nodeIds: string[];
}

export interface NodeGraphUiValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface NodeGraphUiState {
  graphId: string;
  name: string;
  canvas: {
    viewport: NodeGraphCanvasViewport;
    features: NodeGraphCanvasFeatures;
    selectedNodeIds: string[];
  };
  groups: NodeGraphUiGroup[];
  nodes: NodeGraphUiNode[];
  edges: NodeGraphUiEdge[];
  validation: NodeGraphUiValidation;
}

export interface NodeGraphUiStateBuildInput {
  graph: GraphDefinition;
  nodeDefinitions?: Record<string, NodeDefinition>;
  nodeStatusById?: Record<string, NodeGraphExecutionStatus>;
  edgeStatusById?: Record<string, NodeGraphExecutionStatus>;
  selectedNodeIds?: string[];
  viewport?: NodeGraphCanvasViewport;
  features?: Partial<NodeGraphCanvasFeatures>;
}

const DEFAULT_VIEWPORT: NodeGraphCanvasViewport = {
  x: 0,
  y: 0,
  zoom: 1
};

const DEFAULT_FEATURES: NodeGraphCanvasFeatures = {
  pan: true,
  zoom: true,
  grid: true,
  minimap: true,
  theme: 'system',
  nodeSelection: true
};

function defaultNodePortsForKind(kind: RuntimeNodeKind): NodeGraphUiPort[] {
  if (kind === 'trigger') {
    return [{ id: 'out', direction: 'out', dataType: 'any', required: false }];
  }

  if (kind === 'condition' || kind === 'gateway') {
    return [
      { id: 'in', direction: 'in', dataType: 'any', required: true },
      { id: 'true', direction: 'out', dataType: 'any', required: false },
      { id: 'false', direction: 'out', dataType: 'any', required: false }
    ];
  }

  return [
    { id: 'in', direction: 'in', dataType: 'any', required: true },
    { id: 'out', direction: 'out', dataType: 'any', required: false }
  ];
}

function resolvePorts(node: GraphNodeDefinition, nodeDefinitions?: Record<string, NodeDefinition>): NodeGraphUiPort[] {
  const definition = nodeDefinitions?.[node.type];
  if (!definition) {
    return defaultNodePortsForKind(node.type);
  }

  const inputPorts = definition.inputPorts.map((port) => ({
    id: port.portId,
    direction: 'in' as const,
    dataType: port.portType,
    required: port.required
  }));
  const outputPorts = definition.outputPorts.map((port) => ({
    id: port.portId,
    direction: 'out' as const,
    dataType: port.portType,
    required: port.required
  }));

  return [...inputPorts, ...outputPorts];
}

function resolveGroup(type: RuntimeNodeKind): string {
  switch (type) {
    case 'trigger':
      return 'Triggers';
    case 'agent':
      return 'Agents';
    case 'tool':
      return 'Tools';
    case 'reviewer':
      return 'Reviewers';
    case 'condition':
    case 'gateway':
      return 'Routing';
    default:
      return 'Services';
  }
}

function resolveFromPort(edge: GraphEdgeDefinition, fromNode: GraphNodeDefinition): string {
  if ((fromNode.type === 'condition' || fromNode.type === 'gateway') && edge.condition) {
    const normalized = edge.condition.trim().toLowerCase();
    if (normalized.includes('false')) {
      return 'false';
    }
    if (normalized.includes('true')) {
      return 'true';
    }
  }
  return 'out';
}

function resolveToPort(toNode: GraphNodeDefinition): string {
  if (toNode.type === 'trigger') {
    return 'out';
  }
  return 'in';
}

export class NodeGraphUiStateBuilder {
  build(input: NodeGraphUiStateBuildInput): NodeGraphUiState {
    const nodeMap = new Map(input.graph.nodes.map((node) => [node.id, node]));
    const nodes = input.graph.nodes.map((node) => this.buildNode(node, input));
    const edges = input.graph.edges.map((edge) => this.buildEdge(edge, nodeMap, input));
    const validation = this.validate(nodes, edges);
    const groups = this.buildGroups(nodes);

    return {
      graphId: input.graph.graphId,
      name: input.graph.name,
      canvas: {
        viewport: input.viewport ?? DEFAULT_VIEWPORT,
        features: {
          ...DEFAULT_FEATURES,
          ...(input.features ?? {})
        },
        selectedNodeIds: [...(input.selectedNodeIds ?? [])]
      },
      groups,
      nodes: nodes.sort((left, right) => left.label.localeCompare(right.label)),
      edges: edges.sort((left, right) => left.id.localeCompare(right.id)),
      validation
    };
  }

  private buildNode(node: GraphNodeDefinition, input: NodeGraphUiStateBuildInput): NodeGraphUiNode {
    const layout = input.graph.layout?.[node.id];
    return {
      id: node.id,
      type: node.type,
      label: node.label,
      description: node.description,
      status: input.nodeStatusById?.[node.id] ?? 'idle',
      position: {
        x: layout?.x ?? 0,
        y: layout?.y ?? 0
      },
      group: resolveGroup(node.type),
      comments: typeof node.config?.comment === 'string' ? [node.config.comment] : [],
      ports: resolvePorts(node, input.nodeDefinitions)
    };
  }

  private buildEdge(
    edge: GraphEdgeDefinition,
    nodeMap: Map<string, GraphNodeDefinition>,
    input: NodeGraphUiStateBuildInput
  ): NodeGraphUiEdge {
    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);
    return {
      id: edge.id,
      fromNodeId: edge.from,
      toNodeId: edge.to,
      fromPort: fromNode ? resolveFromPort(edge, fromNode) : 'out',
      toPort: toNode ? resolveToPort(toNode) : 'in',
      label: edge.label,
      condition: edge.condition,
      status: input.edgeStatusById?.[edge.id] ?? 'idle'
    };
  }

  private buildGroups(nodes: NodeGraphUiNode[]): NodeGraphUiGroup[] {
    const grouped = new Map<string, string[]>();
    for (const node of nodes) {
      const entries = grouped.get(node.group) ?? [];
      entries.push(node.id);
      grouped.set(node.group, entries);
    }

    return Array.from(grouped.entries())
      .map(([label, nodeIds]) => ({
        id: label.toLowerCase().replace(/\s+/g, '-'),
        label,
        nodeIds: nodeIds.sort((left, right) => left.localeCompare(right))
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  private validate(nodes: NodeGraphUiNode[], edges: NodeGraphUiEdge[]): NodeGraphUiValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();

    for (const node of nodes) {
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node id '${node.id}'.`);
      }
      nodeIds.add(node.id);
    }

    for (const edge of edges) {
      if (edgeIds.has(edge.id)) {
        errors.push(`Duplicate edge id '${edge.id}'.`);
      }
      edgeIds.add(edge.id);

      const fromNode = nodeMap.get(edge.fromNodeId);
      const toNode = nodeMap.get(edge.toNodeId);
      if (!fromNode || !toNode) {
        errors.push(`Edge '${edge.id}' references an unknown node.`);
        continue;
      }

      const fromPort = fromNode.ports.find((port) => port.id === edge.fromPort && port.direction === 'out');
      const toPort = toNode.ports.find((port) => port.id === edge.toPort && port.direction === 'in');
      if (!fromPort) {
        errors.push(`Edge '${edge.id}' references unknown output port '${edge.fromPort}' on '${edge.fromNodeId}'.`);
        continue;
      }
      if (!toPort) {
        errors.push(`Edge '${edge.id}' references unknown input port '${edge.toPort}' on '${edge.toNodeId}'.`);
        continue;
      }

      const compatible =
        fromPort.dataType === 'any' || toPort.dataType === 'any' || fromPort.dataType === toPort.dataType;
      if (!compatible) {
        errors.push(
          `Edge '${edge.id}' has incompatible ports '${edge.fromNodeId}.${edge.fromPort}' (${fromPort.dataType}) -> '${edge.toNodeId}.${edge.toPort}' (${toPort.dataType}).`
        );
      }
    }

    for (const node of nodes) {
      if (node.type === 'trigger' && node.ports.some((port) => port.direction === 'in')) {
        warnings.push(`Trigger node '${node.id}' declares input ports; verify trigger semantics.`);
      }
      if (node.label.length > 120) {
        warnings.push(`Node '${node.id}' label length exceeds 120 characters.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export const DEFAULT_NODE_GRAPH_UI_STATE_BUILDER = new NodeGraphUiStateBuilder();
