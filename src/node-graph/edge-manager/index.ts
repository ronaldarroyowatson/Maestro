import type { Edge, NodeDefinition, ValidationError } from '../../shared/index.js';

/** Manages graph edges with compatibility validation. */
export class EdgeManager {
  private readonly edges = new Map<string, Edge>();

  /** Adds an edge after validating port existence and type compatibility. */
  addEdge(edge: Edge, fromDefinition: NodeDefinition, toDefinition: NodeDefinition): Edge {
    const fromPort = fromDefinition.outputPorts.find((port) => port.portId === edge.fromPort);
    const toPort = toDefinition.inputPorts.find((port) => port.portId === edge.toPort);

    if (!fromPort || !toPort) {
      const err: ValidationError = {
        code: 'INVALID_PORT_REFERENCE',
        message: `Invalid edge port reference for edge ${edge.edgeId}`,
        edgeId: edge.edgeId
      };
      throw new Error(err.message);
    }

    const compatible = fromPort.portType === toPort.portType || fromPort.portType === 'any' || toPort.portType === 'any';
    if (!compatible) {
      const err: ValidationError = {
        code: 'INCOMPATIBLE_PORT_TYPES',
        message: `Port type mismatch for edge ${edge.edgeId}: ${fromPort.portType} -> ${toPort.portType}`,
        edgeId: edge.edgeId
      };
      throw new Error(err.message);
    }

    this.edges.set(edge.edgeId, edge);
    return edge;
  }

  /** Removes an edge by id. */
  removeEdge(edgeId: string): void {
    this.edges.delete(edgeId);
  }

  /** Returns all outgoing edges from a node instance. */
  getEdgesFrom(nodeInstanceId: string): Edge[] {
    return [...this.edges.values()].filter((edge) => edge.fromNodeId === nodeInstanceId);
  }

  /** Returns all incoming edges to a node instance. */
  getEdgesTo(nodeInstanceId: string): Edge[] {
    return [...this.edges.values()].filter((edge) => edge.toNodeId === nodeInstanceId);
  }

  /** Assigns a reviewer node id to an existing edge. */
  setReviewer(edgeId: string, reviewerNodeId: string): void {
    const edge = this.edges.get(edgeId);
    if (!edge) {
      throw new Error(`Edge not found: ${edgeId}`);
    }

    this.edges.set(edgeId, { ...edge, reviewerNodeId });
  }

  /** Bulk load of edges into manager state. */
  setEdges(edges: Edge[]): void {
    this.edges.clear();
    for (const edge of edges) {
      this.edges.set(edge.edgeId, edge);
    }
  }

  /** Lists all edges in manager state. */
  listAll(): Edge[] {
    return [...this.edges.values()];
  }
}
