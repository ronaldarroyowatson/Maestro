import { randomUUID } from 'node:crypto';
import type {
  GraphDefinition,
  GraphPersistenceRequest,
  GraphPersistenceResult,
  GraphNodeDefinition,
  ResourceNode,
  RuntimeNodeKind,
  WorkflowExecutionPolicy,
  WorkflowRunResult
} from '../../../../src/shared/index.js';
import { InMemoryGraphService } from '../../../node-graph/services/graph-service/index.js';
import { MaestroOttoIntegrationService } from '../maestro-otto-integration/index.js';
import { OttoNodeEngineClientLoader } from '../otto-node-engine-client-loader/index.js';

export interface OttoNodeEngineClient {
  createGraph(graph: GraphDefinition): Promise<GraphPersistenceResult>;
  persistGraph(request: GraphPersistenceRequest): Promise<GraphPersistenceResult>;
  getGraph(graphId: string, version?: string): Promise<GraphDefinition | undefined>;
  executeGraph(input: {
    pipelineId: string;
    graph: GraphDefinition;
    resources: ResourceNode[];
    requestInput: unknown;
    policy?: WorkflowExecutionPolicy;
  }): Promise<WorkflowRunResult>;
  buildGraphFromDiscovery(resources: ResourceNode[]): Promise<GraphDefinition>;
}

export interface OttoNodeEngineFeatureFlags {
  enableOttoNodeEngine: boolean;
}

export class MaestroOttoNodeEngineService {
  private readonly fallbackGraphService = new InMemoryGraphService();
  private readonly fallbackIntegration = new MaestroOttoIntegrationService();

  constructor(
    private readonly featureFlags: OttoNodeEngineFeatureFlags,
    private readonly client?: OttoNodeEngineClient
  ) {}

  static async create(input: {
    featureFlags: OttoNodeEngineFeatureFlags;
    moduleName?: string;
  }): Promise<{ service: MaestroOttoNodeEngineService; clientStatus: 'available' | 'unavailable'; reason?: string }> {
    if (!input.featureFlags.enableOttoNodeEngine) {
      return {
        service: new MaestroOttoNodeEngineService(input.featureFlags),
        clientStatus: 'unavailable',
        reason: 'Otto node engine is disabled by feature flag.'
      };
    }

    const loader = new OttoNodeEngineClientLoader({ moduleName: input.moduleName });
    const loaded = await loader.load();
    return {
      service: new MaestroOttoNodeEngineService(input.featureFlags, loaded.client),
      clientStatus: loaded.status,
      reason: loaded.reason
    };
  }

  async loadGraph(graphId: string, version?: string): Promise<GraphDefinition | undefined> {
    if (this.featureFlags.enableOttoNodeEngine && this.client) {
      return this.client.getGraph(graphId, version);
    }
    return this.fallbackGraphService.getGraph(graphId, version);
  }

  async saveGraph(graph: GraphDefinition): Promise<GraphPersistenceResult> {
    if (this.featureFlags.enableOttoNodeEngine && this.client) {
      return this.client.persistGraph({
        graph,
        persistSnapshot: true,
        summary: 'Saved from Maestro'
      });
    }

    return this.fallbackGraphService.persistGraph({
      graph,
      persistSnapshot: true,
      summary: 'Saved from Maestro fallback graph service'
    });
  }

  async createNode(graph: GraphDefinition, node: GraphDefinition['nodes'][number]): Promise<GraphDefinition> {
    const existing = await this.loadGraph(graph.graphId, graph.version);
    const next: GraphDefinition = {
      ...(existing ?? graph),
      nodes: [...(existing?.nodes ?? graph.nodes), node],
      updatedAt: new Date()
    };
    await this.saveGraph(next);
    return next;
  }

  async createConnection(graph: GraphDefinition, edge: GraphDefinition['edges'][number]): Promise<GraphDefinition> {
    const existing = await this.loadGraph(graph.graphId, graph.version);
    const next: GraphDefinition = {
      ...(existing ?? graph),
      edges: [...(existing?.edges ?? graph.edges), edge],
      updatedAt: new Date()
    };
    await this.saveGraph(next);
    return next;
  }

  async executeGraph(input: {
    pipelineId: string;
    graph: GraphDefinition;
    resources: ResourceNode[];
    requestInput: unknown;
    policy?: WorkflowExecutionPolicy;
  }): Promise<WorkflowRunResult> {
    if (this.featureFlags.enableOttoNodeEngine && this.client) {
      return this.client.executeGraph(input);
    }

    const result = await this.fallbackIntegration.executeGraphRun({
      pipelineId: input.pipelineId,
      graph: input.graph,
      resources: input.resources,
      requestInput: input.requestInput,
      policy: input.policy,
      strictResourceMapping: false
    });
    return result.run;
  }

  async generateGraphFromDiscovery(resources: ResourceNode[]): Promise<GraphDefinition> {
    if (this.featureFlags.enableOttoNodeEngine && this.client) {
      return this.client.buildGraphFromDiscovery(resources);
    }

    const now = new Date();
    const mapNodeType = (type: ResourceNode['type']): RuntimeNodeKind => {
      if (type === 'model' || type === 'service') {
        return 'service';
      }
      if (type === 'tool') {
        return 'tool';
      }
      if (type === 'agent') {
        return 'agent';
      }
      return 'condition';
    };
    const mapResourceKind = (type: ResourceNode['type']): NonNullable<GraphNodeDefinition['resources']>[number]['kind'] => {
      if (type === 'model') {
        return 'model';
      }
      if (type === 'tool') {
        return 'tool';
      }
      if (type === 'agent') {
        return 'agent';
      }
      if (type === 'mcp') {
        return 'mcp';
      }
      return 'context';
    };

    const nodes: GraphNodeDefinition[] = resources.map((resource) => ({
      id: `discovered-node:${resource.id}`,
      type: mapNodeType(resource.type),
      label: resource.name,
      description: `Generated from discovered ${resource.type}`,
      resources: [
        {
          kind: mapResourceKind(resource.type),
          id: resource.id,
          name: resource.name
        }
      ]
    }));
    const edges = nodes.slice(0, Math.max(nodes.length - 1, 0)).map((node, index) => ({
      id: `generated-edge:${index + 1}`,
      from: node.id,
      to: nodes[index + 1].id
    }));

    return {
      graphId: `graph:discovery:${randomUUID()}`,
      version: '1.0.0',
      name: 'Discovery Generated Graph',
      description: 'Fallback discovery graph generated by Maestro.',
      createdAt: now,
      updatedAt: now,
      nodes,
      edges,
      layout: {},
      versions: [],
      serialized: undefined
    };
  }
}
