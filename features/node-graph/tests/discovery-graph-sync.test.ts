import { describe, expect, it } from 'vitest';
import type { GraphDefinition, GraphPersistenceResult, ResourceNode, WorkflowRunResult } from '../../../src/shared/index.js';
import { DiscoveryGraphSyncService } from '../services/discovery-graph-sync/index.js';
import { MaestroOttoNodeEngineService } from '../services/otto-node-engine-integration/index.js';

function resource(id: string, type: ResourceNode['type'], name: string): ResourceNode {
  const now = new Date('2026-01-01T00:00:00Z');
  return {
    id,
    name,
    type,
    status: 'healthy',
    tags: [type],
    metadata: {},
    relationships: [],
    discoveredBy: 'test-discovery',
    createdAt: now,
    lastSeen: now
  };
}

function graph(): GraphDefinition {
  const now = new Date('2026-01-01T00:00:00Z');
  return {
    graphId: 'graph:sync',
    version: '1.0.0',
    name: 'sync',
    createdAt: now,
    updatedAt: now,
    nodes: [],
    edges: []
  };
}

function createOttoService(captured: { saved: GraphDefinition[] }): MaestroOttoNodeEngineService {
  return new MaestroOttoNodeEngineService(
    { enableOttoNodeEngine: true },
    {
      async createGraph(input): Promise<GraphPersistenceResult> {
        return { graphId: input.graphId, version: input.version, persistedAt: new Date(), snapshotCreated: true };
      },
      async persistGraph(request): Promise<GraphPersistenceResult> {
        captured.saved.push(request.graph);
        return {
          graphId: request.graph.graphId,
          version: request.graph.version,
          persistedAt: new Date(),
          snapshotCreated: true
        };
      },
      async getGraph(): Promise<GraphDefinition | undefined> {
        return graph();
      },
      async executeGraph(): Promise<WorkflowRunResult> {
        return {
          runId: 'run',
          pipelineId: 'pipeline',
          state: { state: 'complete', retryCount: 0, startedAt: new Date(), updatedAt: new Date() }
        };
      },
      async buildGraphFromDiscovery(resources): Promise<GraphDefinition> {
        return {
          ...graph(),
          nodes: resources.map((entry) => ({ id: `node:${entry.id}`, type: 'service', label: entry.name })),
          edges: []
        };
      }
    }
  );
}

describe('discovery graph sync', () => {
  it('Discovered Model to Node Generation Test', async () => {
    const captured = { saved: [] as GraphDefinition[] };
    const service = new DiscoveryGraphSyncService(createOttoService(captured));
    const result = await service.generateAndPersistFromDiscovery({
      discovery: {
        async scanAll() {
          return { resources: [{ id: 'model:ollama:tinyllama' }] };
        },
        registry: {
          list: () => [resource('model:ollama:tinyllama', 'model', 'tinyllama')]
        }
      }
    });

    expect(result.graph.nodes).toHaveLength(1);
    expect(captured.saved).toHaveLength(1);
  });

  it('Duplicate Resource Test', async () => {
    const captured = { saved: [] as GraphDefinition[] };
    const service = new DiscoveryGraphSyncService(createOttoService(captured));
    const result = await service.generateAndPersistFromDiscovery({
      discovery: {
        async scanAll() {
          return { resources: [{ id: 'model:ollama:tinyllama' }] };
        },
        registry: {
          list: () => [
            resource('model:ollama:tinyllama', 'model', 'tinyllama'),
            resource('model:ollama:tinyllama', 'model', 'tinyllama')
          ]
        }
      }
    });

    expect(result.resourcesConsidered).toBe(1);
    expect(result.graph.nodes).toHaveLength(1);
  });

  it('Empty Resource List Test', async () => {
    const captured = { saved: [] as GraphDefinition[] };
    const service = new DiscoveryGraphSyncService(createOttoService(captured));
    const result = await service.generateAndPersistFromDiscovery({
      discovery: {
        async scanAll() {
          return { resources: [] };
        },
        registry: {
          list: () => []
        }
      }
    });

    expect(result.graph.nodes).toHaveLength(0);
    expect(result.assertions.every((entry) => entry.result === 'PASS')).toBe(true);
  });
});
