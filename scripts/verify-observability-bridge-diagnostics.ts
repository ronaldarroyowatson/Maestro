import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  OttoObservabilityExtensionBridge,
  verifyInstallerRuntimeParity,
  type OttoBridgeErrorRecord
} from '../features/otto-observability-bridge/index.js';

async function main(): Promise<void> {
  const bridgeErrors: OttoBridgeErrorRecord[] = [];

  const bridge = new OttoObservabilityExtensionBridge({
    runtimeContext: {
      environment: 'diagnostics',
      deploymentChannel: 'stable',
      hostOs: process.platform
    },
    logging: {
      info: async () => {},
      error: async () => {
        throw new Error('diagnostics-forced-log-error');
      }
    },
    tracing: {
      startSpan: async () => ({
        annotate: async () => {},
        end: async () => {}
      })
    },
    telemetry: {
      emit: async () => {}
    },
    onBridgeError: (record) => {
      bridgeErrors.push(record);
    }
  });

  await bridge.forwardEvent(
    bridge.createEventEnvelope({
      eventType: 'maestro.install.start',
      source: 'maestro',
      payload: {
        scope: 'installer',
        stage: 'validate'
      }
    })
  );

  await bridge.forwardEvent(
    bridge.createEventEnvelope({
      eventType: 'maestro.pipeline.started',
      source: 'maestro',
      runId: 'diag-run',
      pipelineId: 'diag-pipeline',
      payload: {
        sourceEvent: 'PipelineStarted'
      }
    })
  );

  await bridge.forwardEvent(
    bridge.createEventEnvelope({
      eventType: 'maestro.pipeline.failed',
      source: 'maestro',
      runId: 'diag-run',
      pipelineId: 'diag-pipeline',
      payload: {
        sourceEvent: 'PipelineFailed',
        error: 'forced'
      }
    })
  );

  const snapshot = bridge.getDiagnosticsSnapshot();
  const parity = verifyInstallerRuntimeParity(snapshot);

  if (!parity.ok) {
    throw new Error(`Observability diagnostics parity failed: ${parity.problems.join(' | ')}`);
  }

  if (snapshot.totalFailures === 0 || bridgeErrors.length === 0) {
    throw new Error('Observability diagnostics expected at least one captured bridge failure record.');
  }

  const diagnosticsDir = path.resolve('dist', 'diagnostics');
  await mkdir(diagnosticsDir, { recursive: true });

  const artifact = {
    generatedAt: new Date().toISOString(),
    snapshot,
    parity,
    bridgeErrorCount: bridgeErrors.length,
    recentBridgeErrors: bridgeErrors.slice(-3).map((record) => ({
      stage: record.stage,
      eventType: record.event.eventType,
      runId: record.event.runId,
      pipelineId: record.event.pipelineId,
      message: record.error instanceof Error ? record.error.message : String(record.error)
    }))
  };

  await writeFile(
    path.join(diagnosticsDir, 'observability-bridge-diagnostics.json'),
    `${JSON.stringify(artifact, null, 2)}\n`,
    'utf8'
  );

  console.log(`[diagnostics] wrote observability bridge diagnostics artifact to ${diagnosticsDir}`);
}

await main();
