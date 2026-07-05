import { EVENT_NAMES } from '../../../../src/shared/index.js';

export interface ConductorEventPayloads {
  [EVENT_NAMES.NODE_STARTED]: { runId: string; nodeId: string };
  [EVENT_NAMES.NODE_COMPLETED]: { runId: string; nodeId: string; output: unknown };
  [EVENT_NAMES.NODE_FAILED]: { runId: string; nodeId: string; error: Error; retriesExhausted?: boolean };
  [EVENT_NAMES.REVIEWER_DECISION]: { runId: string; edgeId: string; decision: 'accepted' | 'revision-requested' | 'rejected' };
  [EVENT_NAMES.PIPELINE_STARTED]: { runId: string; pipelineId: string };
  [EVENT_NAMES.PIPELINE_COMPLETED]: { runId: string; pipelineId: string };
  [EVENT_NAMES.PIPELINE_FAILED]: { runId: string; pipelineId: string; error: Error };
}

/** Synchronous in-process event bus used by conductor runtime. */
export class EventBus {
  private readonly handlers = new Map<string, Array<(payload: unknown) => void>>();

  /** Subscribes a handler to an event name. */
  subscribe<K extends keyof ConductorEventPayloads>(eventName: K, handler: (payload: ConductorEventPayloads[K]) => void): void {
    const current = this.handlers.get(eventName) ?? [];
    current.push(handler as (payload: unknown) => void);
    this.handlers.set(eventName, current);
  }

  /** Emits an event synchronously without interrupting other handlers on failure. */
  emit<K extends keyof ConductorEventPayloads>(eventName: K, payload: ConductorEventPayloads[K]): void {
    for (const handler of this.handlers.get(eventName) ?? []) {
      try {
        handler(payload);
      } catch {
        // Best-effort observation bus; handler failures never change flow.
      }
    }
  }
}
