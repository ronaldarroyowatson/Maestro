import { randomUUID } from 'node:crypto';
import type {
  StateCheckpointServiceAdapter,
  WorkflowCheckpoint,
  WorkflowRuntimeState,
  WorkflowStateSnapshot
} from '../../../../src/shared/index.js';

export class StateCheckpointService implements StateCheckpointServiceAdapter {
  private readonly snapshots = new Map<string, WorkflowStateSnapshot>();
  private readonly checkpoints = new Map<string, WorkflowCheckpoint>();

  async saveState(runId: string, snapshot: WorkflowStateSnapshot): Promise<WorkflowStateSnapshot> {
    const normalized: WorkflowStateSnapshot = {
      ...snapshot,
      createdAt: snapshot.createdAt ?? new Date(),
      state: snapshot.state ?? { state: 'pending', retryCount: 0, updatedAt: new Date() }
    };

    this.snapshots.set(runId, normalized);
    return normalized;
  }

  async getState(runId: string): Promise<WorkflowStateSnapshot | undefined> {
    return this.snapshots.get(runId);
  }

  async createCheckpoint(runId: string): Promise<WorkflowCheckpoint | undefined> {
    const snapshot = this.snapshots.get(runId);
    if (!snapshot) {
      return undefined;
    }

    const checkpointId = randomUUID();
    const checkpoint: WorkflowCheckpoint = {
      checkpointId,
      runId,
      pipelineId: snapshot.pipelineId,
      createdAt: new Date(),
      state: { ...snapshot.state, updatedAt: new Date(), startedAt: snapshot.state.startedAt ? new Date(snapshot.state.startedAt) : undefined },
      graphVersion: '1.0.0',
      nodeStates: snapshot.nodeStates,
      output: undefined
    };

    this.checkpoints.set(checkpointId, checkpoint);
    return checkpoint;
  }

  async restoreCheckpoint(runId: string, checkpointId: string): Promise<boolean> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      return false;
    }

    this.snapshots.set(runId, {
      snapshotId: randomUUID(),
      runId,
      pipelineId: checkpoint.pipelineId,
      createdAt: new Date(),
      checkpointId,
      nodeStates: checkpoint.nodeStates,
      state: { ...checkpoint.state, updatedAt: new Date() }
    });
    return true;
  }

  async rollbackRun(runId: string, checkpointId: string): Promise<boolean> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      return false;
    }

    const restored = await this.restoreCheckpoint(runId, checkpointId);
    if (!restored) {
      return false;
    }

    const snapshot = this.snapshots.get(runId);
    if (!snapshot) {
      return false;
    }

    snapshot.state.state = 'paused';
    snapshot.state.updatedAt = new Date();
    return true;
  }

  getCheckpoint(checkpointId: string): WorkflowCheckpoint | undefined {
    return this.checkpoints.get(checkpointId);
  }
}

export function makeSnapshot(runId: string, pipelineId: string, state: WorkflowRuntimeState): WorkflowStateSnapshot {
  return {
    snapshotId: randomUUID(),
    runId,
    pipelineId,
    createdAt: new Date(),
    checkpointId: state.checkpointId,
    nodeStates: {
      [state.currentNodeId ?? 'root']: { ...state, updatedAt: new Date() }
    },
    state: { ...state, updatedAt: new Date() }
  };
}
