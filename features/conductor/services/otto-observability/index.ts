import { EVENT_NAMES } from '../../../../src/shared/index.js';
import type { ConductorEventPayloads, EventBus } from '../event-bus/index.js';

export interface OttoLoggingExtension {
  info(message: string, attributes?: Record<string, unknown>): Promise<void>;
  error(message: string, attributes?: Record<string, unknown>): Promise<void>;
}

export interface OttoTraceSpan {
  annotate(attributes?: Record<string, unknown>): Promise<void>;
  end(status?: 'ok' | 'error'): Promise<void>;
}

export interface OttoTracingExtension {
  startSpan(name: string, attributes?: Record<string, unknown>): Promise<OttoTraceSpan>;
}

export interface OttoTelemetryExtension {
  emit(eventName: string, payload?: Record<string, unknown>): Promise<void>;
}

export interface OttoObservabilityBridgeDependencies {
  logging: OttoLoggingExtension;
  tracing: OttoTracingExtension;
  telemetry: OttoTelemetryExtension;
}

/**
 * Bridges Maestro runtime events into Otto extension modules.
 * The bridge is best-effort and never throws into conductor flow.
 */
export class OttoObservabilityBridge {
  constructor(private readonly deps: OttoObservabilityBridgeDependencies) {}

  bind(eventBus: EventBus): void {
    eventBus.subscribe(EVENT_NAMES.PIPELINE_STARTED, async (payload) => {
      await this.handleEvent('maestro.pipeline.started', payload, EVENT_NAMES.PIPELINE_STARTED);
    });

    eventBus.subscribe(EVENT_NAMES.NODE_STARTED, async (payload) => {
      await this.handleEvent('maestro.node.started', payload, EVENT_NAMES.NODE_STARTED);
    });

    eventBus.subscribe(EVENT_NAMES.NODE_COMPLETED, async (payload) => {
      await this.handleEvent('maestro.node.completed', payload, EVENT_NAMES.NODE_COMPLETED);
    });

    eventBus.subscribe(EVENT_NAMES.NODE_FAILED, async (payload) => {
      await this.handleEvent('maestro.node.failed', payload, EVENT_NAMES.NODE_FAILED);
    });

    eventBus.subscribe(EVENT_NAMES.REVIEWER_DECISION, async (payload) => {
      await this.handleEvent('maestro.reviewer.decision', payload, EVENT_NAMES.REVIEWER_DECISION);
    });

    eventBus.subscribe(EVENT_NAMES.PIPELINE_COMPLETED, async (payload) => {
      await this.handleEvent('maestro.pipeline.completed', payload, EVENT_NAMES.PIPELINE_COMPLETED);
    });

    eventBus.subscribe(EVENT_NAMES.PIPELINE_FAILED, async (payload) => {
      await this.handleEvent('maestro.pipeline.failed', payload, EVENT_NAMES.PIPELINE_FAILED);
    });
  }

  async emitInstallerEvent(eventName: string, payload: Record<string, unknown>): Promise<void> {
    await this.safe(async () => {
      const span = await this.deps.tracing.startSpan(eventName, { scope: 'installer', ...payload });
      await this.deps.logging.info('installer event', { eventName, ...payload });
      await this.deps.telemetry.emit(eventName, payload);
      await span.annotate(payload);
      await span.end('ok');
    });
  }

  private async handleEvent(
    telemetryEventName: string,
    payload: ConductorEventPayloads[keyof ConductorEventPayloads],
    eventName: string
  ): Promise<void> {
    await this.safe(async () => {
      const span = await this.deps.tracing.startSpan(telemetryEventName, {
        sourceEvent: eventName,
        runId: payload.runId
      });

      if (eventName === EVENT_NAMES.NODE_FAILED || eventName === EVENT_NAMES.PIPELINE_FAILED) {
        await this.deps.logging.error('runtime event', { sourceEvent: eventName, ...toLogPayload(payload) });
      } else {
        await this.deps.logging.info('runtime event', { sourceEvent: eventName, ...toLogPayload(payload) });
      }

      await this.deps.telemetry.emit(telemetryEventName, toTelemetryPayload(payload));
      await span.annotate(toTelemetryPayload(payload));
      await span.end(eventName === EVENT_NAMES.NODE_FAILED || eventName === EVENT_NAMES.PIPELINE_FAILED ? 'error' : 'ok');
    });
  }

  private async safe(operation: () => Promise<void>): Promise<void> {
    try {
      await operation();
    } catch {
      // Observability must not break runtime execution.
    }
  }
}

function toTelemetryPayload(payload: ConductorEventPayloads[keyof ConductorEventPayloads]): Record<string, unknown> {
  if ('error' in payload) {
    return {
      ...payload,
      error: payload.error.message
    };
  }
  return { ...payload };
}

function toLogPayload(payload: ConductorEventPayloads[keyof ConductorEventPayloads]): Record<string, unknown> {
  if ('error' in payload) {
    return {
      ...payload,
      errorName: payload.error.name,
      errorMessage: payload.error.message
    };
  }
  return { ...payload };
}