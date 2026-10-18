import { EVENT_NAMES } from '../../../../src/shared/index.js';
import type { ConductorEventPayloads, EventBus } from '../event-bus/index.js';
import {
  type OttoBridgeErrorRecord,
  OttoObservabilityExtensionBridge
} from '../../../otto-observability-bridge/index.js';
export type {
  OttoLoggingExtension,
  OttoTelemetryExtension,
  OttoTraceSpan,
  OttoTracingExtension
} from '../../../otto-observability-bridge/index.js';
import type {
  OttoLoggingExtension,
  OttoTelemetryExtension,
  OttoTracingExtension
} from '../../../otto-observability-bridge/index.js';

export interface OttoObservabilityBridgeDependencies {
  logging: OttoLoggingExtension;
  tracing: OttoTracingExtension;
  telemetry: OttoTelemetryExtension;
  runtimeContext?: OttoObservabilityRuntimeContext;
  onBridgeError?: (record: OttoBridgeErrorRecord) => void;
}

export interface OttoObservabilityRuntimeContext {
  environment?: string;
  deploymentChannel?: string;
  hostOs?: string;
}

/**
 * Bridges Maestro runtime events into Otto extension modules.
 * The bridge is best-effort and never throws into conductor flow.
 */
export class OttoObservabilityBridge {
  private readonly extensionBridge: OttoObservabilityExtensionBridge;

  constructor(deps: OttoObservabilityBridgeDependencies) {
    this.extensionBridge = new OttoObservabilityExtensionBridge({
      logging: deps.logging,
      tracing: deps.tracing,
      telemetry: deps.telemetry,
      runtimeContext: deps.runtimeContext,
      onBridgeError: deps.onBridgeError
    });
  }

  bind(eventBus: EventBus): void {
    eventBus.subscribe(EVENT_NAMES.PIPELINE_STARTED, (payload) => {
      this.enqueueEvent('maestro.pipeline.started', payload, EVENT_NAMES.PIPELINE_STARTED);
    });

    eventBus.subscribe(EVENT_NAMES.NODE_STARTED, (payload) => {
      this.enqueueEvent('maestro.node.started', payload, EVENT_NAMES.NODE_STARTED);
    });

    eventBus.subscribe(EVENT_NAMES.NODE_COMPLETED, (payload) => {
      this.enqueueEvent('maestro.node.completed', payload, EVENT_NAMES.NODE_COMPLETED);
    });

    eventBus.subscribe(EVENT_NAMES.NODE_FAILED, (payload) => {
      this.enqueueEvent('maestro.node.failed', payload, EVENT_NAMES.NODE_FAILED);
    });

    eventBus.subscribe(EVENT_NAMES.REVIEWER_DECISION, (payload) => {
      this.enqueueEvent('maestro.reviewer.decision', payload, EVENT_NAMES.REVIEWER_DECISION);
    });

    eventBus.subscribe(EVENT_NAMES.PIPELINE_COMPLETED, (payload) => {
      this.enqueueEvent('maestro.pipeline.completed', payload, EVENT_NAMES.PIPELINE_COMPLETED);
    });

    eventBus.subscribe(EVENT_NAMES.PIPELINE_FAILED, (payload) => {
      this.enqueueEvent('maestro.pipeline.failed', payload, EVENT_NAMES.PIPELINE_FAILED);
    });
  }

  async emitInstallerEvent(eventName: string, payload: Record<string, unknown>): Promise<void> {
    await this.extensionBridge.forwardEvent(
      this.extensionBridge.createEventEnvelope({
        eventType: eventName,
        source: 'maestro',
        payload: {
          scope: 'installer',
          ...payload
        },
        correlationId: typeof payload.correlationId === 'string' ? payload.correlationId : undefined
      })
    );
  }

  async flush(): Promise<void> {
    await this.extensionBridge.flush();
  }

  private handleEvent(
    telemetryEventName: string,
    payload: ConductorEventPayloads[keyof ConductorEventPayloads],
    eventName: string
  ): void {
    const pipelineId = 'pipelineId' in payload ? payload.pipelineId : undefined;
    this.extensionBridge.enqueueForward(
      this.extensionBridge.createEventEnvelope({
        eventType: telemetryEventName,
        source: 'maestro',
        correlationId: payload.runId,
        runId: payload.runId,
        pipelineId,
        payload: {
          sourceEvent: eventName,
          ...toTelemetryPayload(payload),
          ...toLogPayload(payload)
        }
      })
    );
  }

  private enqueueEvent(telemetryEventName: string, payload: ConductorEventPayloads[keyof ConductorEventPayloads], eventName: string): void {
    this.handleEvent(telemetryEventName, payload, eventName);
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
    const { error: _error, ...rest } = payload;
    return {
      ...rest,
      errorName: payload.error.name,
      errorMessage: payload.error.message
    };
  }
  return { ...payload };
}