import { describe, expect, it } from 'vitest';
import { WorkflowRuntimeService } from '../index.js';

describe('workflow runtime service', () => {
  it('creates a pending run and pauses/resumes it', async () => {
    const runtime = new WorkflowRuntimeService();
    const run = await runtime.createRun({
      pipelineId: 'pipeline-1',
      graphId: 'graph-1',
      input: { hello: 'world' },
      policy: { timeoutMs: 5000, maxRetries: 2 }
    });

    expect(run.state.state).toBe('pending');
    expect(run.output).toEqual({ hello: 'world' });

    const paused = await runtime.pauseRun(run.runId);
    expect(paused).toBe(true);
    expect((await runtime.getRun(run.runId))?.state.state).toBe('paused');

    const resumed = await runtime.resumeRun(run.runId);
    expect(resumed).toBe(true);
    expect((await runtime.getRun(run.runId))?.state.state).toBe('running');
  });

  it('creates and restores checkpoints', async () => {
    const runtime = new WorkflowRuntimeService();
    const run = await runtime.createRun({
      pipelineId: 'pipeline-2',
      graphId: 'graph-2',
      input: { step: 1 }
    });

    run.output = { step: 2 };
    run.state.currentNodeId = 'node-3';
    run.state.state = 'running';

    const checkpoint = await runtime.createCheckpoint(run.runId);
    expect(checkpoint).toBeTruthy();
    expect(checkpoint?.state.currentNodeId).toBe('node-3');

    run.output = { step: 99 };
    run.state.state = 'waiting';

    const restored = await runtime.restoreCheckpoint(run.runId, checkpoint!.checkpointId);
    expect(restored).toBe(true);
    expect((await runtime.getRun(run.runId))?.output).toEqual({ step: 2 });
    expect((await runtime.getRun(run.runId))?.state.state).toBe('running');
  });

  it('cancels a run and records completion state', async () => {
    const runtime = new WorkflowRuntimeService();
    const run = await runtime.createRun({
      pipelineId: 'pipeline-3',
      graphId: 'graph-3',
      input: { cancelled: true }
    });

    const cancelled = await runtime.cancelRun(run.runId);
    expect(cancelled).toBe(true);
    expect((await runtime.getRun(run.runId))?.state.state).toBe('cancelled');
    expect((await runtime.getRun(run.runId))?.completedAt).toBeTruthy();
  });
});
