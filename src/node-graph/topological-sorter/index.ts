import { CycleDetectedError, topoSort, type Graph, type NodeDefinition } from '../../shared/index.js';
import type { TopologicalOrder } from '../types.js';

/** Produces layered topological order with reviewer nodes excluded from execution layers. */
export class TopologicalSorter {
  constructor(private readonly getDefinition: (nodeTypeId: string) => NodeDefinition) {}

  /** Returns parallel execution layers for the provided graph. */
  sort(graph: Graph): TopologicalOrder {
    const reviewerIds = new Set(
      graph.nodes
        .filter((node) => this.getDefinition(node.nodeTypeId).shape === 'reviewer')
        .map((node) => node.instanceId)
    );

    const filteredGraph: Graph = {
      graphId: graph.graphId,
      nodes: graph.nodes.filter((node) => !reviewerIds.has(node.instanceId)),
      edges: graph.edges.filter((edge) => !reviewerIds.has(edge.fromNodeId) && !reviewerIds.has(edge.toNodeId))
    };

    try {
      return topoSort(filteredGraph);
    } catch (error) {
      if (error instanceof CycleDetectedError) {
        throw error;
      }
      throw new CycleDetectedError(String(error));
    }
  }
}
