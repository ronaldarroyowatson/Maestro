import { describe, expect, it } from 'vitest';
import { EventBus } from '../services/event-bus/index.js';
import { OttoObservabilityBridge } from '../services/otto-observability/index.js';

describe('OttoObservabilityBridge', () => {
  it('forwards runtime events to logging, tracing, and telemetry extensions', async () => {
    const logCalls: string[] = [];
    const traceCalls: string[] = [];
    const telemetryCalls: string[] = [];
    const telemetryPayloads: Array<Record<string, unknown> | undefined> = [];

    const bridge = new OttoObservabilityBridge({
      runtimeContext: {
        environment: 'local-dev',
        deploymentChannel: 'stable',
        hostOs: 'windows'
      },
      logging: {
        info: async (_message, attributes) => {
          logCalls.push(String(attributes?.sourceEvent ?? 'unknown'));
        },
        error: async (_message, attributes) => {
          logCalls.push(String(attributes?.sourceEvent ?? 'unknown'));
        }
      },
      tracing: {
        startSpan: async (name) => {
          traceCalls.push(name);
          return {
            annotate: async () => {},
            end: async () => {}
          };
        }
      },
      telemetry: {
        emit: async (eventName, payload) => {
          telemetryCalls.push(eventName);
          telemetryPayloads.push(payload);
        }
      }
    });

    const eventBus = new EventBus();
    bridge.bind(eventBus);

    eventBus.emit('PipelineStarted', { runId: 'r1', pipelineId: 'p1' });
    eventBus.emit('PipelineCompleted', { runId: 'r1', pipelineId: 'p1' });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(logCalls).toContain('PipelineStarted');
    expect(logCalls).toContain('PipelineCompleted');
    expect(traceCalls).toContain('maestro.pipeline.started');
    expect(traceCalls).toContain('maestro.pipeline.completed');
    expect(telemetryCalls).toContain('maestro.pipeline.started');
    expect(telemetryCalls).toContain('maestro.pipeline.completed');
    expect(telemetryPayloads.some((payload) => payload?.environment === 'local-dev')).toBe(true);
    expect(telemetryPayloads.some((payload) => payload?.deploymentChannel === 'stable')).toBe(true);
  });

  it('forwards pipeline-failure metadata and normalizes error payloads', async () => {
    const telemetryPayloads: Array<Record<string, unknown> | undefined> = [];
    const bridge = new OttoObservabilityBridge({
      logging: {
        info: async () => {},
        error: async () => {}
      },
      tracing: {
        startSpan: async () => ({
          annotate: async () => {},
          end: async () => {}
        })
      },
      telemetry: {
        emit: async (_eventName, payload) => {
          telemetryPayloads.push(payload);
        }
      }
    });

    const eventBus = new EventBus();
    bridge.bind(eventBus);
    eventBus.emit('PipelineFailed', {
      runId: 'r2',
      pipelineId: 'p2',
      error: new Error('routing failed'),
      metadata: {
        providerRoutingWarning: 'preferred-provider-unavailable: fallback=alpha',
        selectedProvidersByNode: {
          n3: 'alpha'
        }
      }
    });

    await bridge.flush();

    const failedPayload = telemetryPayloads.find((payload) => payload?.pipelineId === 'p2');
    expect(failedPayload?.error).toBe('routing failed');
    expect((failedPayload?.metadata as Record<string, unknown> | undefined)?.providerRoutingWarning).toContain('fallback=alpha');
    expect(((failedPayload?.metadata as Record<string, unknown> | undefined)?.selectedProvidersByNode as Record<string, unknown>)?.n3).toBe('alpha');
  });
});
