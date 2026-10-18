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

export interface OttoBridgeDiagnosticsSnapshot {
  totalForwarded: number;
  totalFailures: number;
  forwardedByChannel: {
    installer: number;
    runtime: number;
    other: number;
  };
  failuresByStage: Record<OttoBridgeErrorRecord['stage'], number>;
  eventTypeCounts: Record<string, number>;
  lastFailure?: {
    stage: OttoBridgeErrorRecord['stage'];
    eventType: string;
    occurredAt: string;
    message: string;
  };
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
const RUNTIME_EVENT_PREFIX = 'maestro.';
const INSTALLER_EVENT_PREFIX = 'maestro.install';

export class OttoObservabilityExtensionBridge implements ObservabilityBridgeAdapter {
  private queue: Promise<void> = Promise.resolve();
  private readonly now: () => Date;
  private readonly generateEventId: () => string;
  private readonly onBridgeError: (record: OttoBridgeErrorRecord) => void;
  private readonly diagnostics = {
    totalForwarded: 0,
    totalFailures: 0,
    forwardedByChannel: {
      installer: 0,
      runtime: 0,
      other: 0
    },
    failuresByStage: {
      'start-span': 0,
      log: 0,
      telemetry: 0,
      annotate: 0,
      'end-span': 0
    } as Record<OttoBridgeErrorRecord['stage'], number>,
    eventTypeCounts: {} as Record<string, number>,
    lastFailure: undefined as OttoBridgeDiagnosticsSnapshot['lastFailure']
  };

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
    const channel = classifyObservabilityChannel(enriched);
    this.diagnostics.totalForwarded += 1;
    this.diagnostics.forwardedByChannel[channel] += 1;
    this.diagnostics.eventTypeCounts[enriched.eventType] = (this.diagnostics.eventTypeCounts[enriched.eventType] ?? 0) + 1;

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

  getDiagnosticsSnapshot(): OttoBridgeDiagnosticsSnapshot {
    return {
      totalForwarded: this.diagnostics.totalForwarded,
      totalFailures: this.diagnostics.totalFailures,
      forwardedByChannel: { ...this.diagnostics.forwardedByChannel },
      failuresByStage: { ...this.diagnostics.failuresByStage },
      eventTypeCounts: { ...this.diagnostics.eventTypeCounts },
      lastFailure: this.diagnostics.lastFailure ? { ...this.diagnostics.lastFailure } : undefined
    };
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
      this.recordFailure(stage, event, error);
      this.onBridgeError({ error, stage, event });
      return undefined;
    }
  }

  private recordFailure(stage: OttoBridgeErrorRecord['stage'], event: MaestroEventEnvelope<Record<string, unknown>>, error: unknown): void {
    this.diagnostics.totalFailures += 1;
    this.diagnostics.failuresByStage[stage] += 1;
    this.diagnostics.lastFailure = {
      stage,
      eventType: event.eventType,
      occurredAt: this.now().toISOString(),
      message: error instanceof Error ? error.message : String(error)
    };
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

function classifyObservabilityChannel(event: MaestroEventEnvelope<Record<string, unknown>>): 'installer' | 'runtime' | 'other' {
  if (event.eventType.startsWith(INSTALLER_EVENT_PREFIX)) {
    return 'installer';
  }

  if (event.payload.scope === 'installer') {
    return 'installer';
  }

  if (event.runId || event.pipelineId) {
    return 'runtime';
  }

  if (event.eventType.startsWith(RUNTIME_EVENT_PREFIX)) {
    return 'runtime';
  }

  return 'other';
}

export function verifyInstallerRuntimeParity(snapshot: OttoBridgeDiagnosticsSnapshot): {
  ok: boolean;
  problems: string[];
} {
  const problems: string[] = [];

  if (snapshot.forwardedByChannel.installer === 0) {
    problems.push('No installer-channel events were forwarded.');
  }

  if (snapshot.forwardedByChannel.runtime === 0) {
    problems.push('No runtime-channel events were forwarded.');
  }

  const channelSum =
    snapshot.forwardedByChannel.installer + snapshot.forwardedByChannel.runtime + snapshot.forwardedByChannel.other;
  if (channelSum !== snapshot.totalForwarded) {
    problems.push(`Channel-forwarded sum mismatch: channels=${channelSum}, totalForwarded=${snapshot.totalForwarded}.`);
  }

  const eventTypeSum = Object.values(snapshot.eventTypeCounts).reduce((sum, count) => sum + count, 0);
  if (eventTypeSum !== snapshot.totalForwarded) {
    problems.push(`Event-type-forwarded sum mismatch: eventTypes=${eventTypeSum}, totalForwarded=${snapshot.totalForwarded}.`);
  }

  return {
    ok: problems.length === 0,
    problems
  };
}
