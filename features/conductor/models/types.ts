import type { Pipeline, PipelineSnapshot } from '../../../src/shared/index.js';

/** Runtime status for an executed node instance. */
export type NodeExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/** Runtime result record for a single node execution. */
export interface NodeResult {
  instanceId: string;
  status: NodeExecutionStatus;
  output?: unknown;
  error?: Error;
  latencyMs: number;
  startedAt: Date;
  completedAt?: Date;
}

/** Mutable execution context carried during pipeline execution. */
export interface ExecutionContext {
  pipelineId: string;
  runId: string;
  startedAt: Date;
  nodeResults: Map<string, NodeResult>;
  metadata: Record<string, unknown>;
}

/** Finalized pipeline execution result. */
export interface ExecutionResult {
  runId: string;
  status: 'completed' | 'failed' | 'partial';
  output?: unknown;
  error?: Error;
  nodeResults: Map<string, NodeResult>;
  durationMs: number;
}

/** Retry configuration for node execution. */
export interface RetryConfig {
  maxRetries?: number;
  backoffStrategy?: 'fixed' | 'exponential' | 'jitter';
  retryableFailureTypes?: string[];
}

/** Service function type for service-node execution. */
export type ServiceHandler = (nodeConfig: Record<string, unknown>, context: ExecutionContext) => Promise<unknown>;

/** Registry of service handlers by node type id. */
export type ServiceRegistry = Map<string, ServiceHandler>;

/** Minimal conductor runtime dependencies. */
export interface ConductorDependencies {
  providerRegistry: { run: (providerId: string, request: { agentDescriptorId: string; prompt: string; context: string; imageBuffer?: Buffer }) => Promise<{ text: string; tokensUsed: number; latencyMs: number; rawResponse: unknown }> };
  promptEngine: { render: (templateId: string, contextValues: Record<string, string>, instructionInput: { system?: string[]; policy?: string[]; task?: string[] }) => { prompt: string } };
  contextEngine: { build: (input: { documentId: string; text: string; pageNumber?: number }) => { context: string } };
  reviewer: { review: (input: { output: unknown; config: { schema: Record<string, unknown>; ruleIds: string[]; ruleStrategy: 'all' | 'any'; maxRevisionAttempts?: number; revisionTemplateId?: string }; revisionAttempt: number }) => { decision: 'accepted' | 'revision-requested' | 'rejected'; correctionPrompt?: string } };
  serviceRegistry: ServiceRegistry;
}

export type ExecutablePipeline = Pipeline | PipelineSnapshot;
