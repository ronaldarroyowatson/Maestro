import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { MaestroEventEnvelope, ResourceNode } from '../src/shared/index.js';
import {
  OttoNodeEngineOrchestrator,
  buildNodeEngineSyncDiagnosticsSnapshot,
  verifyNodeEngineSyncDiagnostics
} from '../features/node-graph/index.js';

function resource(id: string, type: ResourceNode['type']): ResourceNode {
  const now = new Date();
  return {
    id,
    name: id,
    type,
    status: 'healthy',
    tags: [type],
    metadata: {},
    relationships: [],
    discoveredBy: 'node-engine-sync-diagnostics-script',
    createdAt: now,
    lastSeen: now
  };
}

async function main(): Promise<void> {
  const orchestrator = new OttoNodeEngineOrchestrator();
  const events: Array<MaestroEventEnvelope<Record<string, unknown>>> = [];
  const bridge = {
    async forwardEvent(event: MaestroEventEnvelope<Record<string, unknown>>): Promise<void> {
      events.push(event);
    }
  };

  await orchestrator.runDiscoverySync({
    featureFlags: { enableOttoNodeEngine: false },
    discovery: {
      async scanAll() {
        return { resources: [{ id: 'model:ollama:tinyllama' }] };
      },
      registry: {
        list: () => [resource('model:ollama:tinyllama', 'model')]
      }
    },
    observabilityBridge: bridge
  });

  try {
    await orchestrator.runDiscoverySync({
      featureFlags: { enableOttoNodeEngine: false },
      discovery: {
        async scanAll() {
          throw new Error('diagnostics failure simulation');
        },
        registry: {
          list: () => []
        }
      },
      observabilityBridge: bridge
    });
  } catch {
    // expected for failure-path telemetry verification
  }

  const snapshot = buildNodeEngineSyncDiagnosticsSnapshot(events);
  const verification = verifyNodeEngineSyncDiagnostics(snapshot);
  if (!verification.ok) {
    throw new Error(`Node-engine sync diagnostics verification failed: ${verification.problems.join('; ')}`);
  }

  if (snapshot.failedEvents === 0) {
    throw new Error('Node-engine sync diagnostics did not capture a failure event.');
  }

  const outputDir = path.resolve(process.cwd(), 'dist', 'diagnostics');
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'node-engine-sync-diagnostics.json');
  await writeFile(
    outputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        snapshot,
        verification
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(`PASS - Node engine sync diagnostics written: ${outputPath}`);
}

await main();
