import type { DiscoveryScanContext } from '../../../local-ai-discovery/index.js';
import type { GraphDefinition } from '../../../../src/shared/index.js';
import type { DiscoveryGraphSource } from '../discovery-graph-sync/index.js';
import { DiscoveryGraphSyncService } from '../discovery-graph-sync/index.js';
import { MaestroOttoNodeEngineService } from '../otto-node-engine-integration/index.js';

export interface OttoNodeEngineOrchestratorResult {
  graph: GraphDefinition;
  resourcesConsidered: number;
  clientStatus: 'available' | 'unavailable';
  reason?: string;
}

export class OttoNodeEngineOrchestrator {
  async runDiscoverySync(input: {
    featureFlags: { enableOttoNodeEngine: boolean };
    discovery: DiscoveryGraphSource;
    context?: DiscoveryScanContext;
    moduleName?: string;
  }): Promise<OttoNodeEngineOrchestratorResult> {
    const initialized = await MaestroOttoNodeEngineService.create({
      featureFlags: input.featureFlags,
      moduleName: input.moduleName
    });

    const sync = new DiscoveryGraphSyncService(initialized.service);
    const syncResult = await sync.generateAndPersistFromDiscovery({
      discovery: input.discovery,
      context: input.context
    });

    return {
      graph: syncResult.graph,
      resourcesConsidered: syncResult.resourcesConsidered,
      clientStatus: initialized.clientStatus,
      reason: initialized.reason
    };
  }
}
