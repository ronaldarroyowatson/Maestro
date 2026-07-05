import { describe, expect, it } from 'vitest';
import { EventBus } from '../services/event-bus/index.js';
import { OttoObservabilityBridge } from '../services/otto-observability/index.js';

describe('OttoObservabilityBridge', () => {
  it('forwards runtime events to logging, tracing, and telemetry extensions', async () => {
    const logCalls: string[] = [];
    const traceCalls: string[] = [];
    const telemetryCalls: string[] = [];

    const bridge = new OttoObservabilityBridge({
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
        emit: async (eventName) => {
          telemetryCalls.push(eventName);
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
  });
});
