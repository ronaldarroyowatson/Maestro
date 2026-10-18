import type {
  GraphDefinition,
  GraphEdgeDefinition,
  GraphNodeDefinition,
  GraphPersistenceRequest,
  GraphPersistenceResult,
  GraphQueryRequest,
  GraphServiceAdapter,
  GraphStorageAdapter,
  GraphTraversalRequest,
  GraphTraversalResult,
  GraphVersionRecord
} from '../../../../src/shared/index.js';

export class InMemoryGraphService implements GraphServiceAdapter, GraphStorageAdapter {
  private readonly graphs = new Map<string, GraphDefinition>();

  async createGraph(graph: GraphDefinition): Promise<GraphPersistenceResult> {
    const result = this.upsertGraph(graph);
    return {
      graphId: result.graphId,
      version: result.version,
      persistedAt: new Date(),
      checksum: result.serialized,
      snapshotCreated: true
    };
  }

  async getGraph(graphId: string, version?: string): Promise<GraphDefinition | undefined> {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      return undefined;
    }

    if (!version || version === graph.version) {
      return graph;
    }

    const versionEntry = graph.versions?.find((entry) => entry.version === version);
    if (!versionEntry) {
      return undefined;
    }

    if (graph.serialized) {
      try {
        return JSON.parse(graph.serialized) as GraphDefinition;
      } catch {
        return graph;
      }
    }

    return graph;
  }

  async listGraphs(): Promise<GraphDefinition[]> {
    return Array.from(this.graphs.values());
  }

  async saveVersion(graph: GraphDefinition, summary?: string): Promise<GraphPersistenceResult> {
    const result = this.upsertGraph(graph, summary);
    return {
      graphId: result.graphId,
      version: result.version,
      persistedAt: new Date(),
      checksum: result.serialized,
      snapshotCreated: true
    };
  }

  async deleteGraph(graphId: string): Promise<boolean> {
    return this.graphs.delete(graphId);
  }

  async queryGraph(request: GraphQueryRequest): Promise<GraphDefinition | GraphNodeDefinition[] | GraphEdgeDefinition[]> {
    const graphId = request.graphId;
    if (!graphId) {
      return [];
    }

    const graph = this.graphs.get(graphId);
    if (!graph) {
      return [];
    }

    if (request.nodeId) {
      return graph.nodes.filter((node) => node.id === request.nodeId);
    }

    if (request.fromNodeId || request.toNodeId) {
      return graph.edges.filter((edge) => {
        const fromMatch = request.fromNodeId ? edge.from === request.fromNodeId : true;
        const toMatch = request.toNodeId ? edge.to === request.toNodeId : true;
        return fromMatch && toMatch;
      });
    }

    return graph;
  }

  async traverseGraph(request: GraphTraversalRequest): Promise<GraphTraversalResult> {
    const graphId = request.graphId ?? '';
    const graph = this.graphs.get(graphId);
    if (!graph) {
      return {
        graphId,
        traversedNodeIds: [],
        traversedEdgeIds: [],
        found: false,
        metadata: { reason: 'graph-not-found' }
      };
    }

    const startNodeId = request.fromNodeId ?? graph.nodes[0]?.id;
    if (!startNodeId) {
      return {
        graphId,
        traversedNodeIds: [],
        traversedEdgeIds: [],
        found: false,
        metadata: { reason: 'empty-graph' }
      };
    }

    const visited = new Set<string>();
    const queue: string[] = [startNodeId];
    const traversedEdgeIds: string[] = [];
    const traversedNodeIds: string[] = [];
    const maxDepth = request.maxDepth ?? Number.MAX_SAFE_INTEGER;
    let currentDepth = 0;

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) {
        continue;
      }

      visited.add(current);
      traversedNodeIds.push(current);

      const edgesFromNode = graph.edges.filter((edge) => edge.from === current);
      for (const edge of edgesFromNode) {
        traversedEdgeIds.push(edge.id);
        if (!visited.has(edge.to)) {
          queue.push(edge.to);
        }
      }

      if (currentDepth >= maxDepth) {
        break;
      }
      currentDepth += 1;
    }

    return {
      graphId,
      traversedNodeIds,
      traversedEdgeIds,
      found: traversedNodeIds.includes(startNodeId),
      depth: Math.max(0, traversedNodeIds.length - 1),
      metadata: {
        startNodeId,
        traversal: request.traversal ?? 'breadth',
        maxDepth
      }
    };
  }

  async persistGraph(request: GraphPersistenceRequest): Promise<GraphPersistenceResult> {
    const graph = request.graph;
    const result = this.upsertGraph(graph, request.summary);
    return {
      graphId: result.graphId,
      version: result.version,
      persistedAt: new Date(),
      checksum: result.serialized,
      snapshotCreated: Boolean(request.persistSnapshot)
    };
  }

  private upsertGraph(graph: GraphDefinition, summary?: string): GraphDefinition & { version: string; serialized: string } {
    const workingGraph = {
      ...graph,
      updatedAt: new Date(),
      versions: graph.versions ?? []
    };

    const nextVersion = workingGraph.version?.trim() ? workingGraph.version : '1.0.0';
    const versionRecord: GraphVersionRecord = {
      version: nextVersion,
      createdAt: new Date(),
      summary,
      checksum: workingGraph.serialized ?? JSON.stringify(workingGraph),
      serializedFormat: 'json'
    };

    const existing = this.graphs.get(workingGraph.graphId);
    const mergedVersions = [...(existing?.versions ?? []), versionRecord].filter((entry, index, arr) => arr.findIndex((candidate) => candidate.version === entry.version) === index);
    const nextGraph: GraphDefinition = {
      ...workingGraph,
      version: nextVersion,
      versions: mergedVersions
    };

    this.graphs.set(workingGraph.graphId, nextGraph);
    return { ...nextGraph, version: nextVersion, serialized: JSON.stringify(nextGraph) };
  }
}
