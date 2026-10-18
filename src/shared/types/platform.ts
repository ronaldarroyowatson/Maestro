export type WorkflowRunState =
  | 'pending'
  | 'running'
  | 'waiting'
  | 'paused'
  | 'complete'
  | 'failed'
  | 'cancelled'
  | 'skipped';

export type RuntimeNodeKind = 'trigger' | 'service' | 'agent' | 'tool' | 'reviewer' | 'condition' | 'gateway';

export interface MaestroEventEnvelope<TPayload = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  source: 'otto' | 'maestro' | 'external';
  occurredAt: Date;
  correlationId?: string;
  runId?: string;
  pipelineId?: string;
  payload: TPayload;
}

export interface GraphNodeDefinition {
  id: string;
  type: RuntimeNodeKind;
  label: string;
  description?: string;
  config?: Record<string, unknown>;
  resources?: Array<{
    kind: 'agent' | 'model' | 'mcp' | 'tool' | 'prompt' | 'context';
    id: string;
    name?: string;
    capability?: string;
  }>;
  routing?: {
    onSuccess?: string;
    onFailure?: string;
    onRetry?: string;
    onApproval?: string;
    conditions?: Array<{
      field: string;
      op: 'equals' | 'not_equals' | 'gt' | 'lt' | 'contains' | 'exists';
      value?: unknown;
      targetNodeId?: string;
    }>;
  };
}

export interface GraphEdgeDefinition {
  id: string;
  from: string;
  to: string;
  label?: string;
  condition?: string;
  weight?: number;
}

export interface GraphLayoutMetadata {
  nodeId: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  locked?: boolean;
}

export interface GraphVersionRecord {
  version: string;
  createdAt: Date;
  createdBy?: string;
  summary?: string;
  checksum?: string;
  serializedFormat?: 'json' | 'yaml' | 'msgpack';
}

export interface GraphDefinition {
  graphId: string;
  version: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  nodes: GraphNodeDefinition[];
  edges: GraphEdgeDefinition[];
  layout?: Record<string, GraphLayoutMetadata>;
  versions?: GraphVersionRecord[];
  serialized?: string;
}

export interface GraphPersistenceRequest {
  graph: GraphDefinition;
  persistSnapshot?: boolean;
  summary?: string;
}

export interface GraphPersistenceResult {
  graphId: string;
  version: string;
  persistedAt: Date;
  checksum?: string;
  snapshotCreated: boolean;
}

export interface GraphSerializer {
  serialize(graph: GraphDefinition): string;
  deserialize(input: string): GraphDefinition;
  format: 'json' | 'yaml' | 'msgpack';
}

export interface GraphStorageAdapter {
  createGraph(graph: GraphDefinition): Promise<GraphPersistenceResult>;
  getGraph(graphId: string, version?: string): Promise<GraphDefinition | undefined>;
  listGraphs(): Promise<GraphDefinition[]>;
  saveVersion(graph: GraphDefinition, summary?: string): Promise<GraphPersistenceResult>;
  deleteGraph(graphId: string): Promise<boolean>;
}

export interface GraphServiceAdapter {
  createGraph(graph: GraphDefinition): Promise<GraphPersistenceResult>;
  queryGraph(request: GraphQueryRequest): Promise<GraphDefinition | GraphNodeDefinition[] | GraphEdgeDefinition[]>;
  traverseGraph(request: GraphTraversalRequest): Promise<GraphTraversalResult>;
  persistGraph(request: GraphPersistenceRequest): Promise<GraphPersistenceResult>;
  getGraph(graphId: string, version?: string): Promise<GraphDefinition | undefined>;
}

export interface GraphQueryRequest {
  graphId?: string;
  nodeId?: string;
  traversal?: 'breadth' | 'depth';
  includeMetadata?: boolean;
  fromNodeId?: string;
  toNodeId?: string;
}

export interface GraphTraversalRequest extends GraphQueryRequest {
  maxDepth?: number;
  includeVisited?: boolean;
  path?: string[];
}

export interface GraphTraversalResult {
  graphId: string;
  traversedNodeIds: string[];
  traversedEdgeIds: string[];
  path?: string[];
  depth?: number;
  found: boolean;
  metadata?: Record<string, unknown>;
}

export interface WorkflowExecutionPolicy {
  maxRetries?: number;
  timeoutMs?: number;
  approvalRequired?: boolean;
  confidenceThreshold?: number;
  allowAlternatePaths?: boolean;
  allowHumanIntervention?: boolean;
}

export interface EventBusPublishRequest<TEvent = Record<string, unknown>> {
  eventType: string;
  source: MaestroEventEnvelope['source'];
  correlationId?: string;
  runId?: string;
  pipelineId?: string;
  payload: TEvent;
}

export interface WorkflowRuntimeState {
  state: WorkflowRunState;
  startedAt?: Date;
  updatedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  timeoutMs?: number;
  currentNodeId?: string;
  lastError?: string;
  checkpointId?: string;
}

export interface EventBusSubscription<TEvent = Record<string, unknown>> {
  subscriptionId: string;
  eventType: string;
  handler: (event: MaestroEventEnvelope<TEvent>) => void | Promise<void>;
}

export interface GraphServiceRequest<TRequest = Record<string, unknown>> {
  operation: 'create' | 'update' | 'get' | 'list' | 'query' | 'traverse' | 'delete';
  requestId: string;
  graphId?: string;
  payload?: TRequest;
}

export interface GraphServiceResult<TResponse = Record<string, unknown>> {
  requestId: string;
  ok: boolean;
  graphId?: string;
  result?: TResponse;
  error?: string;
  timestamp: Date;
}

export interface WorkflowRunRequest {
  pipelineId: string;
  graphId: string;
  input: unknown;
  contextRef?: string[];
  policy?: WorkflowExecutionPolicy;
}

export interface WorkflowRunResult {
  runId: string;
  pipelineId: string;
  state: WorkflowRuntimeState;
  output?: unknown;
  completedAt?: Date;
}

export interface WorkflowCheckpoint {
  checkpointId: string;
  runId: string;
  pipelineId: string;
  createdAt: Date;
  state: WorkflowRuntimeState;
  graphVersion: string;
  nodeStates: Record<string, WorkflowRuntimeState>;
  output?: unknown;
}

export interface WorkflowRuntimeCommand {
  action: 'create' | 'pause' | 'resume' | 'cancel' | 'checkpoint' | 'restore';
  runId?: string;
  checkpointId?: string;
  reason?: string;
}

export interface WorkflowRuntimeServiceAdapter {
  createRun(request: WorkflowRunRequest): Promise<WorkflowRunResult>;
  getRun(runId: string): Promise<WorkflowRunResult | undefined>;
  pauseRun(runId: string): Promise<boolean>;
  resumeRun(runId: string): Promise<boolean>;
  cancelRun(runId: string): Promise<boolean>;
  createCheckpoint(runId: string): Promise<WorkflowCheckpoint | undefined>;
  restoreCheckpoint(runId: string, checkpointId: string): Promise<boolean>;
}

export interface WorkflowRoutingRule {
  id: string;
  sourceNodeId: string;
  condition?: string;
  branchType: 'success' | 'failure' | 'retry' | 'approval' | 'confidence' | 'fallback';
  targetNodeId?: string;
  threshold?: number;
  recoveryNodeId?: string;
}

export interface WorkflowOrchestrationPolicy {
  defaultPolicy: WorkflowExecutionPolicy;
  routingRules: WorkflowRoutingRule[];
  allowedFallbacks?: string[];
  approvalRequiredNodeIds?: string[];
}

export interface CapabilityProfile {
  capabilityId: string;
  name: string;
  category: 'coding' | 'research' | 'vision' | 'reasoning' | 'multimodal' | 'local' | 'cloud';
  tags: ResourceCapabilityTag[];
  confidence: number;
  source: 'discovery' | 'manual' | 'inferred';
  lastUpdatedAt?: Date;
}

export interface ResourcePerformanceSnapshot {
  resourceId: string;
  observedAt: Date;
  successRate: number;
  runtimeMs?: number;
  failureRate: number;
  cost?: number;
  memoryUsageMb?: number;
  gpuUsageMb?: number;
  frequencyOfUse?: number;
}

export interface ResourceHealthRecord {
  resourceId: string;
  status: ResourceLifecycleStatus;
  healthy: boolean;
  reason?: string;
  updatedAt: Date;
  nextRecommendedAction?: string;
}

export type ResourceLifecycleStatus =
  | 'installed'
  | 'missing'
  | 'broken'
  | 'deprecated'
  | 'update_available'
  | 'current';

export type ResourceCapabilityTag =
  | 'coding'
  | 'research'
  | 'vision'
  | 'reasoning'
  | 'long_context'
  | 'multimodal'
  | 'local'
  | 'cloud'
  | 'offline'
  | 'fast_inference'
  | 'large_memory';

export interface DiscoveryResourceRecord {
  resourceId: string;
  kind: 'model' | 'agent' | 'mcp' | 'tool' | 'api' | 'resource' | 'runtime';
  name: string;
  version?: string;
  source: 'local' | 'cloud' | 'docker' | 'vscode' | 'ollama' | 'lmstudio' | 'claude' | 'open-webui' | 'external';
  uri?: string;
  capabilities: ResourceCapabilityTag[];
  status: ResourceLifecycleStatus;
  healthScore: number;
  lastSeenAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface ContextEntity {
  contextId: string;
  name: string;
  type: 'project' | 'repository' | 'documentation' | 'user' | 'preference' | 'knowledge_base' | 'runtime';
  ownerId?: string;
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface WorkflowStateSnapshot {
  snapshotId: string;
  runId: string;
  pipelineId: string;
  createdAt: Date;
  checkpointId?: string;
  nodeStates: Record<string, WorkflowRuntimeState>;
  state: WorkflowRuntimeState;
}

export interface StateCheckpointServiceAdapter {
  saveState(runId: string, snapshot: WorkflowStateSnapshot): Promise<WorkflowStateSnapshot>;
  getState(runId: string): Promise<WorkflowStateSnapshot | undefined>;
  createCheckpoint(runId: string): Promise<WorkflowCheckpoint | undefined>;
  restoreCheckpoint(runId: string, checkpointId: string): Promise<boolean>;
  rollbackRun(runId: string, checkpointId: string): Promise<boolean>;
}
