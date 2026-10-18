import type { Edge, Graph, NodeInstance } from '../../../../src/shared/index.js';
import type { ExecutionContext, RetryConfig } from '../../models/types.js';
import { EventBus } from '../event-bus/index.js';
import type { ConductorRuntimeTelemetryMetadata } from '../event-bus/index.js';
import { Executor } from '../executor/index.js';
import { RetryManager } from '../retry-manager/index.js';

/** Schedules layered graph execution with per-layer concurrency. */
export class Scheduler {
  private readonly retryManager: RetryManager;

  constructor(private readonly eventBus: EventBus, private readonly executor: Executor) {
    this.retryManager = new RetryManager((node, context) => this.executor.execute(node, context));
  }

  /** Executes all nodes in each layer concurrently and applies reviewer-gated edges. */
  async run(
    runId: string,
    graph: Graph,
    layers: string[][],
    context: ExecutionContext,
    retryConfigByNode: Map<string, RetryConfig>
  ): Promise<{ status: 'completed' | 'partial' | 'failed'; activeEdges: Edge[] }> {
    let activeEdges = [...graph.edges];
    let hadFailures = false;

    for (const layer of layers) {
      const nodes = layer
        .map((id) => graph.nodes.find((item) => item.instanceId === id))
        .filter((node): node is NodeInstance => Boolean(node));

      const results = await Promise.all(
        nodes.map(async (node) => {
          this.eventBus.emit('NodeStarted', { runId, nodeId: node.instanceId });
          const result = await this.retryManager.execute(node, context, retryConfigByNode.get(node.instanceId) ?? {});

          if (result.status === 'completed') {
            this.eventBus.emit('NodeCompleted', { runId, nodeId: node.instanceId, output: result.output });
          } else {
            hadFailures = true;
            this.eventBus.emit('NodeFailed', {
              runId,
              nodeId: node.instanceId,
              error: result.error ?? new Error('Node execution failed'),
              retriesExhausted: true,
              metadata: runtimeTelemetryMetadata(context.metadata)
            });
          }

          return result;
        })
      );

      const failedNodeIds = new Set(results.filter((result) => result.status === 'failed').map((result) => result.instanceId));
      activeEdges = activeEdges.filter((edge) => !failedNodeIds.has(edge.fromNodeId));
      activeEdges = this.executor.applyReviewerDecisions(runId, graph, context, activeEdges);
    }

    function runtimeTelemetryMetadata(metadata: Record<string, unknown>): ConductorRuntimeTelemetryMetadata | undefined {
      const providerEntries = Object.entries(metadata)
        .filter(([key, value]) => key.startsWith('provider:') && typeof value === 'string')
        .map(([key, value]) => [key.replace('provider:', ''), value] as const);
      const output: ConductorRuntimeTelemetryMetadata = {};

      if (typeof metadata.providerRoutingWarning === 'string') {
        output.providerRoutingWarning = metadata.providerRoutingWarning;
      }
      if (metadata.governanceState && typeof metadata.governanceState === 'object') {
        output.governanceState = metadata.governanceState as Record<string, unknown>;
      }
      if (metadata.governancePolicy && typeof metadata.governancePolicy === 'object') {
        output.governancePolicy = metadata.governancePolicy as Record<string, unknown>;
      }
      if (providerEntries.length > 0) {
        output.selectedProvidersByNode = Object.fromEntries(providerEntries) as Record<string, string>;
      }

      return Object.keys(output).length > 0 ? output : undefined;
    }

    if (hadFailures && context.nodeResults.size === 0) {
      return { status: 'failed', activeEdges };
    }

    return { status: hadFailures ? 'partial' : 'completed', activeEdges };
  }
}
