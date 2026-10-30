import { randomUUID } from 'node:crypto';
import type { DiscoveryScanContext } from '../../../local-ai-discovery/index.js';
import type { GraphDefinition, MaestroEventEnvelope, ObservabilityBridgeAdapter } from '../../../../src/shared/index.js';
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
    requiredApiVersion?: string;
    observabilityBridge?: ObservabilityBridgeAdapter;
  }): Promise<OttoNodeEngineOrchestratorResult> {
    const runId = randomUUID();
    await emitTelemetry(input.observabilityBridge, {
      eventType: 'maestro.node-engine.sync.started',
      source: 'maestro',
      runId,
      payload: {
        featureFlagEnabled: input.featureFlags.enableOttoNodeEngine,
        moduleName: input.moduleName ?? '@otto/node-engine'
      }
    });

    const initialized = await MaestroOttoNodeEngineService.create({
      featureFlags: input.featureFlags,
      moduleName: input.moduleName,
      requiredApiVersion: input.requiredApiVersion
    });
    try {
      const sync = new DiscoveryGraphSyncService(initialized.service);
      const syncResult = await sync.generateAndPersistFromDiscovery({
        discovery: input.discovery,
        context: input.context
      });

      await emitTelemetry(input.observabilityBridge, {
        eventType: 'maestro.node-engine.sync.completed',
        source: 'maestro',
        runId,
        payload: {
          clientStatus: initialized.clientStatus,
          resourcesConsidered: syncResult.resourcesConsidered,
          graphNodeCount: syncResult.graph.nodes.length,
          graphEdgeCount: syncResult.graph.edges.length
        }
      });

      return {
        graph: syncResult.graph,
        resourcesConsidered: syncResult.resourcesConsidered,
        clientStatus: initialized.clientStatus,
        reason: initialized.reason
      };
    } catch (error) {
      await emitTelemetry(input.observabilityBridge, {
        eventType: 'maestro.node-engine.sync.failed',
        source: 'maestro',
        runId,
        payload: {
          clientStatus: initialized.clientStatus,
          reason: initialized.reason,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }
}

async function emitTelemetry(
  bridge: ObservabilityBridgeAdapter | undefined,
  event: Omit<MaestroEventEnvelope<Record<string, unknown>>, 'eventId' | 'occurredAt'>
): Promise<void> {
  if (!bridge) {
    return;
  }

  await bridge.forwardEvent({
    eventId: randomUUID(),
    occurredAt: new Date(),
    ...event
  });
}
