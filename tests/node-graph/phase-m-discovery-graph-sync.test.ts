import { describe, expect, it } from 'vitest';
import type { ResourceNode } from '../../src/shared/index.js';
import { DiscoveryGraphSyncService } from '../../features/node-graph/services/discovery-graph-sync/index.js';
import { MaestroOttoNodeEngineService } from '../../features/node-graph/services/otto-node-engine-integration/index.js';

function resource(id: string, type: ResourceNode['type']): ResourceNode {
  const now = new Date('2026-01-01T00:00:00Z');
  return {
    id,
    name: id,
    type,
    status: 'healthy',
    tags: [type],
    metadata: {},
    relationships: [],
    discoveredBy: 'phase-m-test',
    createdAt: now,
    lastSeen: now
  };
}

describe('node-graph phase m discovery sync tests', () => {
  it('Registry Update Test', async () => {
    const nodeEngine = new MaestroOttoNodeEngineService({ enableOttoNodeEngine: false });
    const sync = new DiscoveryGraphSyncService(nodeEngine);
    const result = await sync.generateAndPersistFromDiscovery({
      discovery: {
        async scanAll() {
          return { resources: [{ id: 'model:ollama:tinyllama' }] };
        },
        registry: {
          list: () => [resource('model:ollama:tinyllama', 'model')]
        }
      }
    });

    const registryAssertion = result.assertions.find((entry) => entry.name === 'Registry Update Test');
    expect(registryAssertion?.result).toBe('PASS');
    expect(result.graph.nodes.length).toBe(1);
  });

  it('Empty Resource List Test', async () => {
    const nodeEngine = new MaestroOttoNodeEngineService({ enableOttoNodeEngine: false });
    const sync = new DiscoveryGraphSyncService(nodeEngine);

    const result = await sync.generateAndPersistFromDiscovery({
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
