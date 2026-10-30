import { describe, expect, it } from 'vitest';
import type { GraphDefinition, GraphPersistenceResult, ResourceNode, WorkflowRunResult } from '../../../src/shared/index.js';
import { MaestroOttoNodeEngineService } from '../services/otto-node-engine-integration/index.js';

function graph(): GraphDefinition {
  const now = new Date('2026-01-01T00:00:00Z');
  return {
    graphId: 'graph-otto-engine',
    version: '1.0.0',
    name: 'Otto Engine Graph',
    createdAt: now,
    updatedAt: now,
    nodes: [],
    edges: []
  };
}

function resource(): ResourceNode {
  const now = new Date('2026-01-01T00:00:00Z');
  return {
    id: 'model:ollama:tinyllama',
    name: 'tinyllama',
    type: 'model',
    status: 'healthy',
    tags: ['local'],
    metadata: {},
    relationships: [],
    discoveredBy: 'test',
    createdAt: now,
    lastSeen: now
  };
}

describe('otto node engine integration', () => {
  it('falls back gracefully when feature flag is disabled', async () => {
    const service = new MaestroOttoNodeEngineService({ enableOttoNodeEngine: false });
    const generated = await service.generateGraphFromDiscovery([resource()]);
    expect(generated.nodes).toHaveLength(1);
  });

  it('uses Otto node engine client when enabled', async () => {
    const saved: GraphDefinition[] = [];
    const service = new MaestroOttoNodeEngineService(
      { enableOttoNodeEngine: true },
      {
        async createGraph(input): Promise<GraphPersistenceResult> {
          return { graphId: input.graphId, version: input.version, persistedAt: new Date(), snapshotCreated: true };
        },
        async persistGraph(request): Promise<GraphPersistenceResult> {
          saved.push(request.graph);
          return { graphId: request.graph.graphId, version: request.graph.version, persistedAt: new Date(), snapshotCreated: true };
        },
        async getGraph(): Promise<GraphDefinition | undefined> {
          return graph();
        },
        async executeGraph(): Promise<WorkflowRunResult> {
          return {
            runId: 'run-1',
            pipelineId: 'pipe-1',
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

    await service.saveGraph(graph());
    const run = await service.executeGraph({
      pipelineId: 'pipe-1',
      graph: graph(),
      resources: [resource()],
      requestInput: {}
    });

    expect(saved).toHaveLength(1);
    expect(run.state.state).toBe('complete');
  });
});
