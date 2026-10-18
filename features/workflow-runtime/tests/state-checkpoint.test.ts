import { describe, expect, it } from 'vitest';
import { StateCheckpointService, makeSnapshot } from '../services/state-checkpoint/index.js';

describe('state checkpoint service', () => {
  it('saves state and creates checkpoints for a run', async () => {
    const service = new StateCheckpointService();
    const state = {
      state: 'running' as const,
      startedAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:05Z'),
      retryCount: 1,
      timeoutMs: 5000,
      currentNodeId: 'node-2'
    };

    const snapshot = makeSnapshot('run-1', 'pipeline-1', state);
    await service.saveState('run-1', snapshot);

    const checkpoint = await service.createCheckpoint('run-1');
    expect(checkpoint).toBeTruthy();
    expect(checkpoint?.runId).toBe('run-1');
    expect(service.getCheckpoint(checkpoint!.checkpointId)).toBeTruthy();
  });

  it('restores a checkpoint and rolls back to a paused state', async () => {
    const service = new StateCheckpointService();
    const state = {
      state: 'waiting' as const,
      startedAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:10Z'),
      retryCount: 0,
      timeoutMs: 10000,
      currentNodeId: 'node-4'
    };

    const snapshot = makeSnapshot('run-2', 'pipeline-2', state);
    await service.saveState('run-2', snapshot);

    const checkpoint = await service.createCheckpoint('run-2');
    const restored = await service.restoreCheckpoint('run-2', checkpoint!.checkpointId);
    expect(restored).toBe(true);

    const rolledBack = await service.rollbackRun('run-2', checkpoint!.checkpointId);
    expect(rolledBack).toBe(true);
    const current = await service.getState('run-2');
    expect(current?.state.state).toBe('paused');
  });
});
