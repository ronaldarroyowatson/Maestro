import { randomUUID } from 'node:crypto';
import { EVENT_NAMES } from '../../src/shared/index.js';
import type { ExecutablePipeline, ConductorDependencies, ExecutionContext, ExecutionResult, RetryConfig } from './models/types.js';
import { EventBus } from './services/event-bus/index.js';
export type {
  OttoLoggingExtension,
  OttoTelemetryExtension,
  OttoTraceSpan,
  OttoTracingExtension
} from './services/otto-observability/index.js';
export { OttoObservabilityBridge } from './services/otto-observability/index.js';
import { Executor } from './services/executor/index.js';
import { Scheduler } from './services/scheduler/index.js';
import { NodeGraph } from '../node-graph/index.js';

export type { ConductorDependencies, ExecutionContext, ExecutionResult, NodeResult, RetryConfig } from './models/types.js';

/** Conductor runtime for DAG pipeline execution with event streaming. */
export class Conductor {
  readonly eventBus: EventBus;
  readonly scheduler: Scheduler;
  private readonly runs = new Map<string, ExecutionResult>();
  private readonly nodeGraph = new NodeGraph();

  constructor(private readonly deps: ConductorDependencies) {
    this.eventBus = new EventBus();
    this.scheduler = new Scheduler(this.eventBus, new Executor(this.deps, this.eventBus));
  }

  /** Executes a pipeline (or snapshot) against input payload and returns execution result. */
  async run(pipelineInput: ExecutablePipeline, input: unknown): Promise<ExecutionResult> {
    const pipeline = 'pipeline' in pipelineInput ? pipelineInput.pipeline : pipelineInput;
    const runId = randomUUID();
    const started = Date.now();

    const context: ExecutionContext = {
      pipelineId: pipeline.id,
      runId,
      startedAt: new Date(started),
      nodeResults: new Map(),
      metadata: {
        input,
        documentId: `${pipeline.id}:${runId}`,
        documentText: typeof input === 'string' ? input : JSON.stringify(input)
      }
    };

    this.eventBus.emit(EVENT_NAMES.PIPELINE_STARTED, { runId, pipelineId: pipeline.id });

    try {
      const valid = this.nodeGraph.validate(pipeline.graph);
      if (!valid.valid) {
        throw new Error(`Pipeline graph validation failed: ${valid.errors.map((error) => error.code).join(', ')}`);
      }

      const layers = this.nodeGraph.topologicalOrder(pipeline.graph);
      const retryConfigByNode = new Map<string, RetryConfig>();
      for (const node of pipeline.graph.nodes) {
        retryConfigByNode.set(node.instanceId, {
          maxRetries: Number(node.config.maxRetries ?? undefined),
          backoffStrategy: (node.config.backoffStrategy as RetryConfig['backoffStrategy']) ?? 'fixed'
        });
      }

      const outcome = await this.scheduler.run(runId, pipeline.graph, layers, context, retryConfigByNode);
      const result: ExecutionResult = {
        runId,
        status: outcome.status,
        output: context.metadata.output,
        nodeResults: context.nodeResults,
        durationMs: Date.now() - started
      };

      if (outcome.status === 'failed') {
        this.eventBus.emit(EVENT_NAMES.PIPELINE_FAILED, {
          runId,
          pipelineId: pipeline.id,
          error: new Error('Pipeline execution failed')
        });
      } else {
        this.eventBus.emit(EVENT_NAMES.PIPELINE_COMPLETED, { runId, pipelineId: pipeline.id });
      }

      this.runs.set(runId, result);
      return result;
    } catch (error) {
      const failure: ExecutionResult = {
        runId,
        status: 'failed',
        error: error instanceof Error ? error : new Error(String(error)),
        nodeResults: context.nodeResults,
        durationMs: Date.now() - started
      };
      this.eventBus.emit(EVENT_NAMES.PIPELINE_FAILED, {
        runId,
        pipelineId: pipeline.id,
        error: failure.error ?? new Error('Unknown pipeline failure')
      });
      this.runs.set(runId, failure);
      return failure;
    }
  }

  /** Returns execution status/result by run id if available. */
  getStatus(runId: string): ExecutionResult | undefined {
    return this.runs.get(runId);
  }
}
