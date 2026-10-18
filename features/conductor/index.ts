import { randomUUID } from 'node:crypto';
import { EVENT_NAMES } from '../../src/shared/index.js';
import type {
  ExecutablePipeline,
  ConductorDependencies,
  ConductorRuntimeOptions,
  ExecutionContext,
  ExecutionResult,
  RetryConfig
} from './models/types.js';
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

export type {
  ConductorDependencies,
  ConductorRuntimeOptions,
  ExecutionContext,
  ExecutionResult,
  NodeResult,
  ProviderRoutingStrategy,
  RetryConfig
} from './models/types.js';

/** Conductor runtime for DAG pipeline execution with event streaming. */
export class Conductor {
  readonly eventBus: EventBus;
  readonly scheduler: Scheduler;
  private readonly runs = new Map<string, ExecutionResult>();
  private readonly nodeGraph = new NodeGraph();
  private readonly runtimeOptions: Required<Pick<ConductorRuntimeOptions, 'generateRunId' | 'now'>>;

  constructor(private readonly deps: ConductorDependencies, runtimeOptions: ConductorRuntimeOptions = {}) {
    this.eventBus = new EventBus();
    this.scheduler = new Scheduler(this.eventBus, new Executor(this.deps, this.eventBus));
    this.runtimeOptions = {
      generateRunId: runtimeOptions.generateRunId ?? (() => randomUUID()),
      now: runtimeOptions.now ?? (() => Date.now())
    };
  }

  /** Executes a pipeline (or snapshot) against input payload and returns execution result. */
  async run(pipelineInput: ExecutablePipeline, input: unknown): Promise<ExecutionResult> {
    const pipeline = 'pipeline' in pipelineInput ? pipelineInput.pipeline : pipelineInput;
    const runId = this.runtimeOptions.generateRunId();
    const started = this.runtimeOptions.now();

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

    this.eventBus.emit(EVENT_NAMES.PIPELINE_STARTED, {
      runId,
      pipelineId: pipeline.id,
      metadata: runtimeTelemetryMetadata(context.metadata)
    });

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
        durationMs: this.runtimeOptions.now() - started
      };

      if (outcome.status === 'failed') {
        this.eventBus.emit(EVENT_NAMES.PIPELINE_FAILED, {
          runId,
          pipelineId: pipeline.id,
          error: new Error('Pipeline execution failed'),
          metadata: runtimeTelemetryMetadata(context.metadata)
        });
      } else {
        this.eventBus.emit(EVENT_NAMES.PIPELINE_COMPLETED, {
          runId,
          pipelineId: pipeline.id,
          metadata: runtimeTelemetryMetadata(context.metadata)
        });
      }

      this.runs.set(runId, result);
      return result;
    } catch (error) {
      const failure: ExecutionResult = {
        runId,
        status: 'failed',
        error: error instanceof Error ? error : new Error(String(error)),
        nodeResults: context.nodeResults,
        durationMs: this.runtimeOptions.now() - started
      };
      this.eventBus.emit(EVENT_NAMES.PIPELINE_FAILED, {
        runId,
        pipelineId: pipeline.id,
        error: failure.error ?? new Error('Unknown pipeline failure'),
        metadata: runtimeTelemetryMetadata(context.metadata)
      });
      this.runs.set(runId, failure);
      return failure;
    }

    function runtimeTelemetryMetadata(metadata: Record<string, unknown>): Record<string, unknown> | undefined {
      const providerEntries = Object.entries(metadata)
        .filter(([key, value]) => key.startsWith('provider:') && typeof value === 'string')
        .map(([key, value]) => [key.replace('provider:', ''), value] as const);

      const selectedProvidersByNode = Object.fromEntries(providerEntries);
      const output: Record<string, unknown> = {};

      if (typeof metadata.providerRoutingWarning === 'string') {
        output.providerRoutingWarning = metadata.providerRoutingWarning;
      }
      if (metadata.governanceState && typeof metadata.governanceState === 'object') {
        output.governanceState = metadata.governanceState;
      }
      if (metadata.governancePolicy && typeof metadata.governancePolicy === 'object') {
        output.governancePolicy = metadata.governancePolicy;
      }
      if (providerEntries.length > 0) {
        output.selectedProvidersByNode = selectedProvidersByNode;
      }

      return Object.keys(output).length > 0 ? output : undefined;
    }
  }

  /** Returns execution status/result by run id if available. */
  getStatus(runId: string): ExecutionResult | undefined {
    return this.runs.get(runId);
  }
}
