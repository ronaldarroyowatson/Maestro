import { describe, expect, it } from 'vitest';
import { WorkflowEventBus } from '../services/event-bus/index.js';
import { WorkflowRuntimeService } from '../index.js';

describe('workflow event bus', () => {
  it('publishes matching envelopes to subscribers and supports unsubscribe', async () => {
    const bus = new WorkflowEventBus();
    const seen: string[] = [];
    const unsub = bus.subscribe('workflow.state.changed', (event) => {
      seen.push(`${event.runId}:${event.payload.state}`);
    });

    await bus.publish({
      eventType: 'workflow.state.changed',
      source: 'maestro',
      runId: 'run-1',
      pipelineId: 'pipeline-1',
      payload: { state: 'running' }
    });

    expect(seen).toEqual(['run-1:running']);

    unsub();
    await bus.publish({
      eventType: 'workflow.state.changed',
      source: 'maestro',
      runId: 'run-1',
      pipelineId: 'pipeline-1',
      payload: { state: 'paused' }
    });

    expect(seen).toHaveLength(1);
  });

  it('emits lifecycle events when a runtime transition occurs', async () => {
    const runtime = new WorkflowRuntimeService();
    const seen: Array<{ eventType: string; state: string }> = [];

    runtime.eventBus.subscribe('workflow.created', (event) => {
      seen.push({ eventType: event.eventType, state: String((event.payload as { stateName?: string }).stateName ?? '') });
    });

    runtime.eventBus.subscribe('workflow.state.changed', (event) => {
      seen.push({ eventType: event.eventType, state: String((event.payload as { nextState?: string }).nextState ?? event.payload.state ?? '') });
    });

    const run = await runtime.createRun({
      pipelineId: 'pipeline-2',
      graphId: 'graph-2',
      input: { ok: true }
    });

    await runtime.pauseRun(run.runId);

    expect(seen.some((item) => item.eventType === 'workflow.created')).toBe(true);
    expect(seen.some((item) => item.eventType === 'workflow.state.changed' && item.state === 'paused')).toBe(true);
  });
});
