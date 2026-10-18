import { randomUUID } from 'node:crypto';
import type {
  WorkflowCheckpoint,
  WorkflowExecutionPolicy,
  WorkflowRunRequest,
  WorkflowRunResult,
  WorkflowRuntimeServiceAdapter,
  WorkflowRuntimeState,
  WorkflowRunState
} from '../../src/shared/index.js';
import { WorkflowEventBus } from './services/event-bus/index.js';
import { StateCheckpointService } from './services/state-checkpoint/index.js';

export { StateCheckpointService, WorkflowEventBus };
export type { WorkflowRuntimeState };

export class WorkflowRuntimeService implements WorkflowRuntimeServiceAdapter {
  readonly eventBus = new WorkflowEventBus();
  private readonly runs = new Map<string, WorkflowRunResult>();
  private readonly checkpoints = new Map<string, WorkflowCheckpoint>();
  private readonly stateService = new StateCheckpointService();

  async createRun(request: WorkflowRunRequest): Promise<WorkflowRunResult> {
    const runId = randomUUID();
    const startedAt = new Date();
    const state: WorkflowRuntimeState = {
      state: 'pending',
      startedAt,
      updatedAt: startedAt,
      retryCount: 0,
      timeoutMs: request.policy?.timeoutMs,
      checkpointId: undefined,
      currentNodeId: undefined
    };

    const result: WorkflowRunResult = {
      runId,
      pipelineId: request.pipelineId,
      state,
      output: request.input,
      completedAt: undefined
    };

    this.runs.set(runId, result);
    await this.eventBus.publish({
      eventType: 'workflow.created',
      source: 'maestro',
      correlationId: request.graphId,
      runId,
      pipelineId: request.pipelineId,
      payload: {
        graphId: request.graphId,
        input: request.input,
        stateName: state.state,
        state
      }
    });
    return result;
  }

  async getRun(runId: string): Promise<WorkflowRunResult | undefined> {
    return this.runs.get(runId);
  }

  async pauseRun(runId: string): Promise<boolean> {
    const run = this.runs.get(runId);
    if (!run) {
      return false;
    }

    const state = run.state;
    if (state.state === 'pending' || state.state === 'running' || state.state === 'waiting') {
      state.state = 'paused';
      state.updatedAt = new Date();
      await this.eventBus.publish({
        eventType: 'workflow.state.changed',
        source: 'maestro',
        runId,
        pipelineId: run.pipelineId,
        payload: { previousState: 'running', nextState: 'paused', state }
      });
      return true;
    }

    return false;
  }

  async resumeRun(runId: string): Promise<boolean> {
    const run = this.runs.get(runId);
    if (!run) {
      return false;
    }

    if (run.state.state === 'paused' || run.state.state === 'waiting') {
      run.state.state = 'running';
      run.state.updatedAt = new Date();
      await this.eventBus.publish({
        eventType: 'workflow.state.changed',
        source: 'maestro',
        runId,
        pipelineId: run.pipelineId,
        payload: { previousState: 'paused', nextState: 'running', state: run.state }
      });
      return true;
    }

    return false;
  }

  async cancelRun(runId: string): Promise<boolean> {
    const run = this.runs.get(runId);
    if (!run) {
      return false;
    }

    const state = run.state;
    state.state = 'cancelled';
    state.updatedAt = new Date();
    state.completedAt = state.updatedAt;
    run.completedAt = state.updatedAt;
    await this.eventBus.publish({
      eventType: 'workflow.cancelled',
      source: 'maestro',
      runId,
      pipelineId: run.pipelineId,
      payload: { state }
    });
    return true;
  }

  async createCheckpoint(runId: string): Promise<WorkflowCheckpoint | undefined> {
    const run = this.runs.get(runId);
    if (!run) {
      return undefined;
    }

    const checkpointId = randomUUID();
    const checkpoint: WorkflowCheckpoint = {
      checkpointId,
      runId,
      pipelineId: run.pipelineId,
      createdAt: new Date(),
      state: this.cloneState(run.state),
      graphVersion: '1.0.0',
      nodeStates: run.state.currentNodeId ? { [run.state.currentNodeId]: this.cloneState(run.state) } : {},
      output: run.output
    };

    run.state.checkpointId = checkpointId;
    run.state.updatedAt = checkpoint.createdAt;
    this.checkpoints.set(checkpointId, checkpoint);
    await this.stateService.saveState(runId, {
      snapshotId: randomUUID(),
      runId,
      pipelineId: run.pipelineId,
      createdAt: checkpoint.createdAt,
      checkpointId,
      nodeStates: checkpoint.nodeStates,
      state: checkpoint.state
    });
    await this.eventBus.publish({
      eventType: 'workflow.checkpointed',
      source: 'maestro',
      runId,
      pipelineId: run.pipelineId,
      payload: { checkpointId, state: checkpoint.state }
    });
    return checkpoint;
  }

  async restoreCheckpoint(runId: string, checkpointId: string): Promise<boolean> {
    const run = this.runs.get(runId);
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!run || !checkpoint) {
      return false;
    }

    run.state = this.cloneState(checkpoint.state);
    run.state.updatedAt = new Date();
    run.state.checkpointId = checkpointId;
    run.output = checkpoint.output;
    this.stateService.saveState(runId, {
      snapshotId: randomUUID(),
      runId,
      pipelineId: checkpoint.pipelineId,
      createdAt: new Date(),
      checkpointId,
      nodeStates: checkpoint.nodeStates,
      state: this.cloneState(checkpoint.state)
    });
    return true;
  }

  getCheckpoint(checkpointId: string): WorkflowCheckpoint | undefined {
    return this.checkpoints.get(checkpointId);
  }

  private cloneState(state: WorkflowRuntimeState): WorkflowRuntimeState {
    return {
      ...state,
      startedAt: state.startedAt ? new Date(state.startedAt) : undefined,
      updatedAt: state.updatedAt ? new Date(state.updatedAt) : undefined,
      completedAt: state.completedAt ? new Date(state.completedAt) : undefined
    };
  }
}

export function createRetryPolicy(policy?: WorkflowExecutionPolicy): WorkflowExecutionPolicy {
  return {
    maxRetries: policy?.maxRetries ?? 2,
    timeoutMs: policy?.timeoutMs ?? 30000,
    approvalRequired: policy?.approvalRequired ?? false,
    confidenceThreshold: policy?.confidenceThreshold ?? 0.7,
    allowAlternatePaths: policy?.allowAlternatePaths ?? true,
    allowHumanIntervention: policy?.allowHumanIntervention ?? false
  };
}

export function nextRunState(current: WorkflowRunState, options: { force?: WorkflowRunState; retryCount?: number }): WorkflowRunState {
  return options.force ?? current;
}
