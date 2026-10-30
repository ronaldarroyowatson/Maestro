import type {
  GraphDefinition,
  GraphNodeDefinition,
  ResourceNode,
  WorkflowExecutionPolicy,
  WorkflowRunResult,
  WorkflowRuntimeServiceAdapter
} from '../../../../src/shared/index.js';
import { WorkflowRuntimeService } from '../../../workflow-runtime/index.js';
import { NodeGraphUiStateBuilder } from '../ui-integration/index.js';

export interface IntegratedNodeResource {
  kind: 'agent' | 'model' | 'mcp' | 'tool' | 'prompt' | 'context';
  referenceId: string;
  matchedResource?: ResourceNode;
}

export interface IntegratedExecutionNode {
  nodeId: string;
  nodeType: GraphNodeDefinition['type'];
  label: string;
  resources: IntegratedNodeResource[];
}

export interface MaestroOttoExecutionPlan {
  graphId: string;
  graphVersion: string;
  layers: string[][];
  executionNodes: IntegratedExecutionNode[];
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface MaestroOttoExecutionResult {
  run: WorkflowRunResult;
  plan: MaestroOttoExecutionPlan;
  uiState: ReturnType<NodeGraphUiStateBuilder['build']>;
}

export class MaestroOttoIntegrationService {
  private readonly runtime: WorkflowRuntimeServiceAdapter;
  private readonly uiBuilder = new NodeGraphUiStateBuilder();

  constructor(runtime?: WorkflowRuntimeServiceAdapter) {
    this.runtime = runtime ?? new WorkflowRuntimeService();
  }

  buildExecutionPlan(graph: GraphDefinition, resources: ResourceNode[]): MaestroOttoExecutionPlan {
    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];
    const nodeIds = new Set(graph.nodes.map((node) => node.id));
    const edgeIds = new Set<string>();
    const inDegree = new Map<string, number>(graph.nodes.map((node) => [node.id, 0]));
    const adjacency = new Map<string, string[]>(graph.nodes.map((node) => [node.id, []]));

    for (const edge of graph.edges) {
      if (edgeIds.has(edge.id)) {
        validationErrors.push(`Duplicate edge id '${edge.id}'.`);
      }
      edgeIds.add(edge.id);

      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
        validationErrors.push(`Edge '${edge.id}' references unknown node id.`);
        continue;
      }

      adjacency.get(edge.from)?.push(edge.to);
      inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    }

    const queue: string[] = Array.from(inDegree.entries())
      .filter((entry) => entry[1] === 0)
      .map((entry) => entry[0]);
    const layers: string[][] = [];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const layerSize = queue.length;
      const layer: string[] = [];

      for (let index = 0; index < layerSize; index += 1) {
        const current = queue.shift();
        if (!current || visited.has(current)) {
          continue;
        }
        visited.add(current);
        layer.push(current);

        for (const next of adjacency.get(current) ?? []) {
          const nextCount = (inDegree.get(next) ?? 0) - 1;
          inDegree.set(next, nextCount);
          if (nextCount === 0) {
            queue.push(next);
          }
        }
      }

      if (layer.length > 0) {
        layers.push(layer.sort((left, right) => left.localeCompare(right)));
      }
    }

    if (visited.size !== graph.nodes.length) {
      validationErrors.push(`Graph '${graph.graphId}' contains a cycle or disconnected dependency chain.`);
    }

    const executionNodes: IntegratedExecutionNode[] = graph.nodes.map((node) => ({
      nodeId: node.id,
      nodeType: node.type,
      label: node.label,
      resources: this.mapResources(node, resources, validationWarnings)
    }));

    return {
      graphId: graph.graphId,
      graphVersion: graph.version,
      layers,
      executionNodes: executionNodes.sort((left, right) => left.label.localeCompare(right.label)),
      validation: {
        valid: validationErrors.length === 0,
        errors: validationErrors,
        warnings: validationWarnings
      }
    };
  }

  async executeGraphRun(input: {
    pipelineId: string;
    graph: GraphDefinition;
    resources: ResourceNode[];
    requestInput: unknown;
    policy?: WorkflowExecutionPolicy;
    strictResourceMapping?: boolean;
  }): Promise<MaestroOttoExecutionResult> {
    const plan = this.buildExecutionPlan(input.graph, input.resources);
    if (!plan.validation.valid) {
      throw new Error(`Execution plan is invalid: ${plan.validation.errors.join(' | ')}`);
    }

    if (input.strictResourceMapping) {
      const missingMappings = plan.executionNodes.flatMap((node) =>
        node.resources
          .filter((resource) => !resource.matchedResource)
          .map((resource) => `${node.nodeId}:${resource.kind}:${resource.referenceId}`)
      );
      if (missingMappings.length > 0) {
        throw new Error(`Resource mappings missing for: ${missingMappings.join(', ')}`);
      }
    }

    const run = await this.runtime.createRun({
      pipelineId: input.pipelineId,
      graphId: input.graph.graphId,
      input: {
        payload: input.requestInput,
        plan
      },
      policy: input.policy
    });

    const uiState = this.uiBuilder.build({
      graph: input.graph,
      nodeStatusById: Object.fromEntries(input.graph.nodes.map((node) => [node.id, 'idle' as const]))
    });

    return {
      run,
      plan,
      uiState
    };
  }

  private mapResources(
    node: GraphNodeDefinition,
    resources: ResourceNode[],
    warnings: string[]
  ): IntegratedNodeResource[] {
    const bindings = node.resources ?? [];
    return bindings.map((binding) => {
      const matched = resources.find((resource) => {
        if (resource.id === binding.id) {
          return true;
        }

        const kindMatches =
          (binding.kind === 'mcp' && resource.type === 'mcp') ||
          (binding.kind === 'model' && resource.type === 'model') ||
          (binding.kind === 'agent' && resource.type === 'agent') ||
          (binding.kind === 'tool' && resource.type === 'tool') ||
          (binding.kind === 'context' && (resource.type === 'repository' || resource.type === 'dataset')) ||
          (binding.kind === 'prompt' && resource.type === 'other');

        if (!kindMatches) {
          return false;
        }

        if (binding.capability && !resource.tags.includes(binding.capability)) {
          return false;
        }

        return !binding.name || resource.name.toLowerCase() === binding.name.toLowerCase();
      });

      if (!matched) {
        warnings.push(`No resource match found for node '${node.id}' binding '${binding.kind}:${binding.id}'.`);
      }

      return {
        kind: binding.kind,
        referenceId: binding.id,
        matchedResource: matched
      };
    });
  }
}

export const DEFAULT_MAESTRO_OTTO_INTEGRATION_SERVICE = new MaestroOttoIntegrationService();
