import { randomUUID } from 'node:crypto';
import type { Edge, Graph, NodeInstance } from '../../../../src/shared/index.js';
import type { ConductorDependencies, ExecutionContext, NodeResult } from '../../models/types.js';
import type { EventBus } from '../event-bus/index.js';

function shapeFromNodeType(nodeTypeId: string): 'trigger' | 'service' | 'agent' | 'conductor' | 'reviewer' {
  if (nodeTypeId.includes('trigger')) return 'trigger';
  if (nodeTypeId.includes('agent')) return 'agent';
  if (nodeTypeId.includes('conductor')) return 'conductor';
  if (nodeTypeId.includes('reviewer')) return 'reviewer';
  return 'service';
}

/** Executes one node instance based on inferred shape and dependencies. */
export class Executor {
  constructor(private readonly deps: ConductorDependencies, private readonly eventBus: EventBus) {}

  /** Executes a single node and stores result in execution context. */
  async execute(node: NodeInstance, context: ExecutionContext): Promise<NodeResult> {
    const startedAt = new Date();
    const shape = shapeFromNodeType(node.nodeTypeId);

    const result: NodeResult = {
      instanceId: node.instanceId,
      status: 'running',
      startedAt,
      latencyMs: 0
    };

    try {
      if (shape === 'trigger') {
        const role = String(node.config.role ?? 'entry');
        if (role === 'entry') {
          result.output = context.metadata.input;
        } else {
          result.output = context.metadata.lastOutput;
          context.metadata.output = result.output;
        }
      } else if (shape === 'service') {
        const handler = this.deps.serviceRegistry.get(node.nodeTypeId);
        if (!handler) {
          throw new Error(`No service handler registered for nodeTypeId ${node.nodeTypeId}`);
        }
        result.output = await handler(node.config, context);
      } else if (shape === 'agent') {
        const promptTemplateId = String(node.config.promptTemplateId ?? 'default');
        const descriptorId = String(node.config.agentDescriptorId ?? 'unknown');
        const providerId = String(node.config.providerId ?? 'ollama');

        const contextPayload = this.deps.contextEngine.build({
          documentId: String(context.metadata.documentId ?? randomUUID()),
          text: String(context.metadata.documentText ?? JSON.stringify(context.metadata.input ?? ''))
        });

        const rendered = this.deps.promptEngine.render(promptTemplateId, { output: JSON.stringify(context.metadata.lastOutput ?? {}) }, { task: ['Generate next node output'] });
        result.output = await this.deps.providerRegistry.run(providerId, {
          agentDescriptorId: descriptorId,
          prompt: rendered.prompt,
          context: contextPayload.context,
          imageBuffer: node.config.imageBuffer as Buffer | undefined
        });
      } else if (shape === 'conductor') {
        result.output = context.metadata.lastOutput;
      }

      result.status = 'completed';
      result.completedAt = new Date();
      result.latencyMs = result.completedAt.getTime() - startedAt.getTime();
      context.metadata.lastOutput = result.output;
      context.nodeResults.set(node.instanceId, result);
      return result;
    } catch (error) {
      result.status = 'failed';
      result.completedAt = new Date();
      result.latencyMs = result.completedAt.getTime() - startedAt.getTime();
      result.error = error instanceof Error ? error : new Error(String(error));
      context.nodeResults.set(node.instanceId, result);
      return result;
    }
  }

  /** Applies reviewer decisions for guarded edges and yields filtered branch edges. */
  applyReviewerDecisions(runId: string, graph: Graph, context: ExecutionContext, edges: Edge[]): Edge[] {
    const accepted: Edge[] = [];

    for (const edge of edges) {
      if (!edge.reviewerNodeId) {
        accepted.push(edge);
        continue;
      }

      const reviewerNode = graph.nodes.find((node) => node.instanceId === edge.reviewerNodeId);
      if (!reviewerNode) {
        continue;
      }

      const upstream = context.nodeResults.get(edge.fromNodeId);
      const decision = this.deps.reviewer.review({
        output: upstream?.output,
        config: {
          schema: (reviewerNode.config.schema as Record<string, unknown>) ?? { type: 'object' },
          ruleIds: (reviewerNode.config.ruleIds as string[]) ?? [],
          ruleStrategy: (reviewerNode.config.ruleStrategy as 'all' | 'any') ?? 'all',
          maxRevisionAttempts: Number(reviewerNode.config.maxRevisionAttempts ?? 1),
          revisionTemplateId: reviewerNode.config.revisionTemplateId as string | undefined
        },
        revisionAttempt: Number(context.metadata[`revision:${edge.edgeId}`] ?? 0)
      });

      this.eventBus.emit('ReviewerDecision', {
        runId,
        edgeId: edge.edgeId,
        decision: decision.decision
      });

      if (decision.decision === 'accepted') {
        accepted.push(edge);
      } else if (decision.decision === 'revision-requested') {
        const attempts = Number(context.metadata[`revision:${edge.edgeId}`] ?? 0) + 1;
        context.metadata[`revision:${edge.edgeId}`] = attempts;
        context.metadata[`correction:${edge.edgeId}`] = decision.correctionPrompt;
      }
    }

    return accepted;
  }
}
