import { describe, expect, it } from 'vitest';
import { MaestroOttoNodeEngineService } from '../../features/node-graph/services/otto-node-engine-integration/index.js';

describe('node-graph phase n client loader tests', () => {
  it('Missing Configuration Test', async () => {
    const created = await MaestroOttoNodeEngineService.create({
      featureFlags: { enableOttoNodeEngine: true },
      moduleName: '@otto/not-installed'
    });

    expect(created.clientStatus).toBe('unavailable');
    expect(typeof created.reason).toBe('string');
  });

  it('Graceful Fallback Test', async () => {
    const created = await MaestroOttoNodeEngineService.create({
      featureFlags: { enableOttoNodeEngine: true },
      moduleName: '@otto/not-installed'
    });

    const graph = await created.service.generateGraphFromDiscovery([]);
    expect(graph.nodes).toHaveLength(0);
  });
});
