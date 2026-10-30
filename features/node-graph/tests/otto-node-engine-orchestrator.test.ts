import { describe, expect, it } from 'vitest';
import type { ResourceNode } from '../../../src/shared/index.js';
import { OttoNodeEngineOrchestrator } from '../services/otto-node-engine-orchestrator/index.js';

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
    discoveredBy: 'orchestrator-test',
    createdAt: now,
    lastSeen: now
  };
}

describe('otto node engine orchestrator', () => {
  it('Registry Update Test', async () => {
    const orchestrator = new OttoNodeEngineOrchestrator();
    const result = await orchestrator.runDiscoverySync({
      featureFlags: { enableOttoNodeEngine: false },
      discovery: {
        async scanAll() {
          return { resources: [{ id: 'model:ollama:tinyllama' }] };
        },
        registry: {
          list: () => [resource('model:ollama:tinyllama', 'model')]
        }
      }
    });

    expect(result.resourcesConsidered).toBe(1);
    expect(result.graph.nodes).toHaveLength(1);
  });

  it('Missing Configuration Test', async () => {
    const orchestrator = new OttoNodeEngineOrchestrator();
    const result = await orchestrator.runDiscoverySync({
      featureFlags: { enableOttoNodeEngine: true },
      moduleName: '@otto/not-installed',
      discovery: {
        async scanAll() {
          return { resources: [] };
        },
        registry: {
          list: () => []
        }
      }
    });

    expect(result.clientStatus).toBe('unavailable');
    expect(typeof result.reason).toBe('string');
  });
});
