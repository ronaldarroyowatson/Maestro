import { describe, expect, it } from 'vitest';
import type { GraphDefinition, GraphPersistenceRequest, GraphPersistenceResult, WorkflowRunResult } from '../../../src/shared/index.js';
import { OttoNodeEngineClientLoader } from '../services/otto-node-engine-client-loader/index.js';
import { MaestroOttoNodeEngineService } from '../services/otto-node-engine-integration/index.js';

function graph(): GraphDefinition {
  const now = new Date('2026-01-01T00:00:00Z');
  return {
    graphId: 'graph-loader',
    version: '1.0.0',
    name: 'loader',
    createdAt: now,
    updatedAt: now,
    nodes: [],
    edges: []
  };
}

describe('otto node engine client loader', () => {
  it('Missing Configuration Test', async () => {
    const loader = new OttoNodeEngineClientLoader({
      moduleName: '@otto/not-installed',
      importModule: async () => {
        throw new Error('module not found');
      }
    });

    const result = await loader.load();
    expect(result.status).toBe('unavailable');
    expect(result.reason).toContain('module not found');
  });

  it('Invalid Module Contract Test', async () => {
    const loader = new OttoNodeEngineClientLoader({
      moduleName: '@otto/invalid-module',
      importModule: async () => ({})
    });

    const result = await loader.load();
    expect(result.status).toBe('unavailable');
    expect(result.reason).toContain('does not export createMaestroClient');
  });

  it('Runtime Detection Test', async () => {
    const loader = new OttoNodeEngineClientLoader({
      moduleName: '@otto/mock-engine',
      importModule: async () => ({
        createMaestroClient: () => ({
          async createGraph(input: GraphDefinition): Promise<GraphPersistenceResult> {
            return { graphId: input.graphId, version: input.version, persistedAt: new Date(), snapshotCreated: true };
          },
          async persistGraph(request: GraphPersistenceRequest): Promise<GraphPersistenceResult> {
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
              runId: 'run-1',
              pipelineId: 'pipe-1',
              state: { state: 'complete', retryCount: 0, startedAt: new Date(), updatedAt: new Date() }
            };
          },
          async buildGraphFromDiscovery(): Promise<GraphDefinition> {
            return graph();
          }
        })
      })
    });

    const result = await loader.load();
    expect(result.status).toBe('available');
    expect(result.client).toBeDefined();
  });

  it('Feature Flag Disabled Test', async () => {
    const created = await MaestroOttoNodeEngineService.create({
      featureFlags: { enableOttoNodeEngine: false }
    });

    expect(created.clientStatus).toBe('unavailable');
    expect(created.reason).toContain('disabled');
  });
});
