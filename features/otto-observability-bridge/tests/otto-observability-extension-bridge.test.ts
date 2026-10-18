import { describe, expect, it } from 'vitest';
import { OttoObservabilityExtensionBridge, verifyInstallerRuntimeParity } from '../index.js';

describe('OttoObservabilityExtensionBridge', () => {
  it('forwards deterministic envelopes with runtime context to telemetry/logging/tracing', async () => {
    const telemetryPayloads: Array<Record<string, unknown> | undefined> = [];
    const traces: string[] = [];
    const logs: Array<Record<string, unknown> | undefined> = [];

    const bridge = new OttoObservabilityExtensionBridge({
      runtimeContext: {
        environment: 'test',
        deploymentChannel: 'stable',
        hostOs: 'windows'
      },
      now: () => new Date('2026-01-01T00:00:00.000Z'),
      generateEventId: () => 'evt-1',
      logging: {
        info: async (_message, attributes) => {
          logs.push(attributes);
        },
        error: async (_message, attributes) => {
          logs.push(attributes);
        }
      },
      tracing: {
        startSpan: async (name) => {
          traces.push(name);
          return {
            annotate: async () => {},
            end: async () => {}
          };
        }
      },
      telemetry: {
        emit: async (_eventName, payload) => {
          telemetryPayloads.push(payload);
        }
      }
    });

    await bridge.forwardEvent(
      bridge.createEventEnvelope({
        eventType: 'maestro.pipeline.started',
        source: 'maestro',
        correlationId: 'run-1',
        runId: 'run-1',
        pipelineId: 'pipeline-1',
        payload: {
          sourceEvent: 'PipelineStarted',
          pipelineId: 'pipeline-1'
        }
      })
    );

    expect(traces).toEqual(['maestro.pipeline.started']);
    expect(logs[0]?.eventId).toBe('evt-1');
    expect(logs[0]?.runId).toBe('run-1');
    expect(telemetryPayloads[0]?.environment).toBe('test');
    expect(telemetryPayloads[0]?.deploymentChannel).toBe('stable');
    expect(telemetryPayloads[0]?.hostOs).toBe('windows');
  });

  it('surfaces bridge failures via onBridgeError callback', async () => {
    const stages: string[] = [];
    const bridge = new OttoObservabilityExtensionBridge({
      logging: {
        info: async () => {},
        error: async () => {
          throw new Error('log failed');
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
        stages.push(record.stage);
      }
    });

    await bridge.forwardEvent(
      bridge.createEventEnvelope({
        eventType: 'maestro.pipeline.failed',
        source: 'maestro',
        runId: 'run-2',
        payload: {
          sourceEvent: 'PipelineFailed',
          error: 'boom'
        }
      })
    );

    expect(stages).toContain('log');
  });

  it('produces diagnostics snapshot and validates installer/runtime parity', async () => {
    const bridge = new OttoObservabilityExtensionBridge({
      logging: {
        info: async () => {},
        error: async () => {
          throw new Error('forced-log-error');
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
        runId: 'run-parity',
        pipelineId: 'pipeline-parity',
        payload: {
          sourceEvent: 'PipelineStarted'
        }
      })
    );

    await bridge.forwardEvent(
      bridge.createEventEnvelope({
        eventType: 'maestro.pipeline.failed',
        source: 'maestro',
        runId: 'run-parity',
        pipelineId: 'pipeline-parity',
        payload: {
          sourceEvent: 'PipelineFailed',
          error: 'forced'
        }
      })
    );

    const snapshot = bridge.getDiagnosticsSnapshot();
    const parity = verifyInstallerRuntimeParity(snapshot);

    expect(snapshot.totalForwarded).toBe(3);
    expect(snapshot.forwardedByChannel.installer).toBe(1);
    expect(snapshot.forwardedByChannel.runtime).toBe(2);
    expect(snapshot.totalFailures).toBeGreaterThanOrEqual(1);
    expect(snapshot.failuresByStage.log).toBeGreaterThanOrEqual(1);
    expect(parity.ok).toBe(true);
    expect(parity.problems).toEqual([]);
  });
});
