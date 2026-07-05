import type { Graph } from '../types/nodes.js';

/** Error raised when a cycle is detected in a graph. */
export class CycleDetectedError extends Error {
  constructor(message = 'Graph contains a cycle') {
    super(message);
    this.name = 'CycleDetectedError';
  }
}

/** Produces execution layers using Kahn's algorithm for DAGs. */
export function topoSort(graph: Graph): string[][] {
  const nodeIds = new Set(graph.nodes.map((node) => node.instanceId));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) {
      continue;
    }

    adjacency.get(edge.fromNodeId)!.push(edge.toNodeId);
    inDegree.set(edge.toNodeId, (inDegree.get(edge.toNodeId) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  const layers: string[][] = [];
  let visited = 0;

  while (queue.length > 0) {
    const size = queue.length;
    const layer: string[] = [];

    for (let i = 0; i < size; i += 1) {
      const nodeId = queue.shift()!;
      layer.push(nodeId);
      visited += 1;

      for (const neighbor of adjacency.get(nodeId) ?? []) {
        const nextDegree = (inDegree.get(neighbor) ?? 0) - 1;
        inDegree.set(neighbor, nextDegree);
        if (nextDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    layers.push(layer);
  }

  if (visited !== nodeIds.size) {
    throw new CycleDetectedError();
  }

  return layers;
}
