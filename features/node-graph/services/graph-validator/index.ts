import type { Graph, NodeDefinition, NodeInstance, ValidationError, ValidationResult } from '../../../../src/shared/index.js';

function findCycle(graph: Graph): string[] | undefined {
  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) {
    adjacency.set(node.instanceId, []);
  }
  for (const edge of graph.edges) {
    if (adjacency.has(edge.fromNodeId) && adjacency.has(edge.toNodeId)) {
      adjacency.get(edge.fromNodeId)!.push(edge.toNodeId);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  const dfs = (nodeId: string): string[] | undefined => {
    visiting.add(nodeId);
    stack.push(nodeId);

    for (const next of adjacency.get(nodeId) ?? []) {
      if (visiting.has(next)) {
        const cycleStart = stack.indexOf(next);
        return stack.slice(cycleStart).concat(next);
      }
      if (!visited.has(next)) {
        const cycle = dfs(next);
        if (cycle) {
          return cycle;
        }
      }
    }

    visiting.delete(nodeId);
    visited.add(nodeId);
    stack.pop();
    return undefined;
  };

  for (const node of graph.nodes) {
    if (!visited.has(node.instanceId)) {
      const cycle = dfs(node.instanceId);
      if (cycle) {
        return cycle;
      }
    }
  }

  return undefined;
}

/** Validates graph structure and runtime constraints, collecting all errors. */
export class GraphValidator {
  constructor(private readonly getDefinition: (nodeTypeId: string) => NodeDefinition) {}

  /** Validates a complete graph and returns all collected errors/warnings. */
  validate(graph: Graph): ValidationResult {
    const errors: ValidationError[] = [];
    const nodeMap = new Map<string, NodeInstance>(graph.nodes.map((node) => [node.instanceId, node]));

    const cycle = findCycle(graph);
    if (cycle) {
      errors.push({
        code: 'CYCLE_DETECTED',
        message: `Cycle detected: ${cycle.join(' -> ')}`
      });
    }

    for (const node of graph.nodes) {
      const definition = this.getDefinition(node.nodeTypeId);
      for (const requiredPort of definition.inputPorts.filter((port) => port.required)) {
        const connected = graph.edges.some((edge) => edge.toNodeId === node.instanceId && edge.toPort === requiredPort.portId);
        if (!connected) {
          errors.push({
            code: 'MISSING_REQUIRED_INPUT_PORT',
            message: `Required input port ${requiredPort.portId} is not connected`,
            nodeId: node.instanceId
          });
        }
      }
    }

    for (const edge of graph.edges) {
      const fromNode = nodeMap.get(edge.fromNodeId);
      const toNode = nodeMap.get(edge.toNodeId);
      if (!fromNode || !toNode) {
        errors.push({
          code: 'EDGE_REFERENCES_UNKNOWN_NODE',
          message: `Edge ${edge.edgeId} references unknown node`,
          edgeId: edge.edgeId
        });
        continue;
      }

      const fromDefinition = this.getDefinition(fromNode.nodeTypeId);
      const toDefinition = this.getDefinition(toNode.nodeTypeId);
      const hasFromPort = fromDefinition.outputPorts.some((port) => port.portId === edge.fromPort);
      const hasToPort = toDefinition.inputPorts.some((port) => port.portId === edge.toPort);

      if (!hasFromPort || !hasToPort) {
        errors.push({
          code: 'EDGE_REFERENCES_UNKNOWN_PORT',
          message: `Edge ${edge.edgeId} references invalid ports`,
          edgeId: edge.edgeId
        });
      }

      if (edge.reviewerNodeId) {
        const reviewerNode = nodeMap.get(edge.reviewerNodeId);
        if (!reviewerNode) {
          errors.push({
            code: 'INVALID_REVIEWER_REFERENCE',
            message: `Reviewer node ${edge.reviewerNodeId} not found`,
            edgeId: edge.edgeId
          });
        } else {
          const reviewerDefinition = this.getDefinition(reviewerNode.nodeTypeId);
          if (reviewerDefinition.shape !== 'reviewer') {
            errors.push({
              code: 'INVALID_REVIEWER_SHAPE',
              message: `Reviewer node ${edge.reviewerNodeId} is not shape=reviewer`,
              edgeId: edge.edgeId,
              nodeId: reviewerNode.instanceId
            });
          }
        }
      }
    }

    const triggerNodes = graph.nodes.filter((node) => this.getDefinition(node.nodeTypeId).shape === 'trigger');
    const hasEntryTrigger = triggerNodes.some((node) => !graph.edges.some((edge) => edge.toNodeId === node.instanceId));
    const hasExitTrigger = triggerNodes.some((node) => !graph.edges.some((edge) => edge.fromNodeId === node.instanceId));

    if (!hasEntryTrigger) {
      errors.push({
        code: 'MISSING_ENTRY_TRIGGER',
        message: 'At least one trigger node must have zero incoming edges'
      });
    }

    if (!hasExitTrigger) {
      errors.push({
        code: 'MISSING_EXIT_TRIGGER',
        message: 'At least one trigger node must have zero outgoing edges'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }
}
