import { randomUUID } from 'node:crypto';
import type { MaestroEventEnvelope, ObservabilityBridgeAdapter } from '../../src/shared/index.js';

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

export interface OttoObservabilityRuntimeContext {
  environment?: string;
  deploymentChannel?: string;
  hostOs?: string;
}

export interface OttoBridgeErrorRecord {
  error: unknown;
  stage: 'start-span' | 'log' | 'telemetry' | 'annotate' | 'end-span';
  event: MaestroEventEnvelope<Record<string, unknown>>;
}

export interface OttoObservabilityExtensionBridgeDependencies {
  logging: OttoLoggingExtension;
  tracing: OttoTracingExtension;
  telemetry: OttoTelemetryExtension;
  runtimeContext?: OttoObservabilityRuntimeContext;
  now?: () => Date;
  generateEventId?: () => string;
  onBridgeError?: (record: OttoBridgeErrorRecord) => void;
}

const ERROR_EVENTS = new Set(['maestro.node.failed', 'maestro.pipeline.failed']);

export class OttoObservabilityExtensionBridge implements ObservabilityBridgeAdapter {
  private queue: Promise<void> = Promise.resolve();
  private readonly now: () => Date;
  private readonly generateEventId: () => string;
  private readonly onBridgeError: (record: OttoBridgeErrorRecord) => void;

  constructor(private readonly deps: OttoObservabilityExtensionBridgeDependencies) {
    this.now = deps.now ?? (() => new Date());
    this.generateEventId = deps.generateEventId ?? (() => randomUUID());
    this.onBridgeError = deps.onBridgeError ?? ((record) => {
      const errorMessage = record.error instanceof Error ? record.error.message : String(record.error);
      console.error(`Otto observability bridge error at stage '${record.stage}': ${errorMessage}`);
    });
  }

  async forwardEvent(event: MaestroEventEnvelope<Record<string, unknown>>): Promise<void> {
    const enriched = enrichEventEnvelope(event, this.deps.runtimeContext);
    const isErrorEvent = ERROR_EVENTS.has(enriched.eventType);
    const span = await this.safe('start-span', enriched, async () =>
      this.deps.tracing.startSpan(enriched.eventType, {
        eventId: enriched.eventId,
        source: enriched.source,
        correlationId: enriched.correlationId,
        runId: enriched.runId,
        pipelineId: enriched.pipelineId
      })
    );
    if (!span) {
      return;
    }

    await this.safe('log', enriched, async () => {
      const attributes = {
        eventId: enriched.eventId,
        eventType: enriched.eventType,
        source: enriched.source,
        runId: enriched.runId,
        pipelineId: enriched.pipelineId,
        correlationId: enriched.correlationId,
        ...enriched.payload
      };
      if (isErrorEvent) {
        await this.deps.logging.error('runtime event', attributes);
      } else {
        await this.deps.logging.info('runtime event', attributes);
      }
    });

    await this.safe('telemetry', enriched, async () => {
      await this.deps.telemetry.emit(enriched.eventType, enriched.payload);
    });

    await this.safe('annotate', enriched, async () => {
      await span.annotate(enriched.payload);
    });

    await this.safe('end-span', enriched, async () => {
      await span.end(isErrorEvent ? 'error' : 'ok');
    });
  }

  enqueueForward(event: MaestroEventEnvelope<Record<string, unknown>>): void {
    this.queue = this.queue.then(() => this.forwardEvent(event));
  }

  async flush(): Promise<void> {
    await this.queue;
  }

  createEventEnvelope(input: {
    eventType: string;
    source: MaestroEventEnvelope['source'];
    payload: Record<string, unknown>;
    correlationId?: string;
    runId?: string;
    pipelineId?: string;
  }): MaestroEventEnvelope<Record<string, unknown>> {
    return {
      eventId: this.generateEventId(),
      eventType: input.eventType,
      source: input.source,
      occurredAt: this.now(),
      correlationId: input.correlationId,
      runId: input.runId,
      pipelineId: input.pipelineId,
      payload: input.payload
    };
  }

  private async safe<T>(
    stage: OttoBridgeErrorRecord['stage'],
    event: MaestroEventEnvelope<Record<string, unknown>>,
    operation: () => Promise<T>
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      this.onBridgeError({ error, stage, event });
      return undefined;
    }
  }
}

function enrichEventEnvelope(
  event: MaestroEventEnvelope<Record<string, unknown>>,
  runtimeContext: OttoObservabilityRuntimeContext | undefined
): MaestroEventEnvelope<Record<string, unknown>> {
  if (!runtimeContext) {
    return event;
  }

  return {
    ...event,
    payload: {
      ...event.payload,
      environment: runtimeContext.environment,
      deploymentChannel: runtimeContext.deploymentChannel,
      hostOs: runtimeContext.hostOs
    }
  };
}
