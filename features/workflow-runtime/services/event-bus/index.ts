import { randomUUID } from 'node:crypto';
import type {
  EventBusPublishRequest,
  EventBusSubscription,
  MaestroEventEnvelope
} from '../../../../src/shared/index.js';

export class WorkflowEventBus {
  private readonly subscriptions = new Map<string, EventBusSubscription<any>[]>();

  subscribe<TEvent = Record<string, unknown>>(
    eventType: string,
    handler: (event: MaestroEventEnvelope<TEvent>) => void | Promise<void>
  ): () => void {
    const entry: EventBusSubscription<TEvent> = {
      subscriptionId: randomUUID(),
      eventType,
      handler: handler as (event: MaestroEventEnvelope<TEvent>) => void | Promise<void>
    };

    const handlers = this.subscriptions.get(eventType) ?? [];
    handlers.push(entry as EventBusSubscription<any>);
    this.subscriptions.set(eventType, handlers);

    return () => this.unsubscribe(entry.subscriptionId, eventType);
  }

  unsubscribe(subscriptionId: string, eventType: string): boolean {
    const handlers = this.subscriptions.get(eventType);
    if (!handlers) {
      return false;
    }

    const next = handlers.filter((subscription) => subscription.subscriptionId !== subscriptionId);
    if (next.length === 0) {
      this.subscriptions.delete(eventType);
      return true;
    }

    this.subscriptions.set(eventType, next);
    return true;
  }

  async publish<TEvent = Record<string, unknown>>(request: EventBusPublishRequest<TEvent>): Promise<MaestroEventEnvelope<TEvent>> {
    const envelope: MaestroEventEnvelope<TEvent> = {
      eventId: randomUUID(),
      eventType: request.eventType,
      source: request.source,
      occurredAt: new Date(),
      correlationId: request.correlationId,
      runId: request.runId,
      pipelineId: request.pipelineId,
      payload: request.payload
    };

    const handlers = this.subscriptions.get(request.eventType) ?? [];
    if (handlers.length === 0) {
      return envelope;
    }

    for (const subscription of [...handlers]) {
      try {
        await subscription.handler(envelope as MaestroEventEnvelope<Record<string, unknown>>);
      } catch {
        // Best-effort event propagation: subscriber failures never stop the workflow state machine.
      }
    }

    return envelope;
  }

  listSubscriptions(eventType: string): EventBusSubscription<any>[] {
    return [...(this.subscriptions.get(eventType) ?? [])];
  }
}
