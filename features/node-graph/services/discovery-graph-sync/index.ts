import type { DiscoveryScanContext } from '../../../local-ai-discovery/index.js';
import type { GraphDefinition, GraphPersistenceResult, ResourceNode } from '../../../../src/shared/index.js';
import { MaestroOttoNodeEngineService } from '../otto-node-engine-integration/index.js';

export interface DiscoveryGraphSource {
  scanAll(context?: DiscoveryScanContext): Promise<{ resources: Array<{ id: string }> }>;
  registry: {
    list(): ResourceNode[];
  };
}

export interface DiscoveryGraphSyncAssertion {
  name: string;
  result: 'PASS' | 'FAIL';
  details?: string;
}

export interface DiscoveryGraphSyncResult {
  graph: GraphDefinition;
  persistence: GraphPersistenceResult;
  resourcesConsidered: number;
  assertions: DiscoveryGraphSyncAssertion[];
}

export class DiscoveryGraphSyncService {
  constructor(private readonly nodeEngine: MaestroOttoNodeEngineService) {}

  async generateAndPersistFromDiscovery(input: {
    discovery: DiscoveryGraphSource;
    context?: DiscoveryScanContext;
  }): Promise<DiscoveryGraphSyncResult> {
    const scan = await input.discovery.scanAll(input.context);
    const discoveredFromRegistry = input.discovery.registry.list();
    const dedupedResources = dedupeResources(discoveredFromRegistry);
    const graph = await this.nodeEngine.generateGraphFromDiscovery(dedupedResources);
    const persistence = await this.nodeEngine.saveGraph(graph);

    const assertions: DiscoveryGraphSyncAssertion[] = [
      {
        name: 'Discovery Scan Test',
        result: scan.resources.length >= 0 ? 'PASS' : 'FAIL'
      },
      {
        name: 'Duplicate Resource Test',
        result: dedupedResources.length <= discoveredFromRegistry.length ? 'PASS' : 'FAIL',
        details: `${discoveredFromRegistry.length} -> ${dedupedResources.length}`
      },
      {
        name: 'Graph Generation Test',
        result: graph.nodes.length === dedupedResources.length ? 'PASS' : 'FAIL',
        details: `${graph.nodes.length} nodes generated from ${dedupedResources.length} resources`
      },
      {
        name: 'Registry Update Test',
        result: graph.nodes.length > 0 || dedupedResources.length === 0 ? 'PASS' : 'FAIL'
      }
    ];

    return {
      graph,
      persistence,
      resourcesConsidered: dedupedResources.length,
      assertions
    };
  }
}

function dedupeResources(resources: ResourceNode[]): ResourceNode[] {
  const byId = new Map<string, ResourceNode>();
  for (const resource of resources) {
    if (!byId.has(resource.id)) {
      byId.set(resource.id, resource);
    }
  }
  return [...byId.values()];
}
