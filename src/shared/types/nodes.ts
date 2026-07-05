/** Minimal JSON Schema representation used across Maestro. */
export type JSONSchema = Record<string, unknown>;

/** Supported node execution shapes. */
export type NodeShape = 'service' | 'agent' | 'conductor' | 'reviewer' | 'trigger';

/** Port definition for node IO contracts. */
export interface PortDefinition {
  portId: string;
  portType: string;
  schema: JSONSchema;
  required: boolean;
}

/** Node type registration contract. */
export interface NodeDefinition {
  nodeTypeId: string;
  shape: NodeShape;
  displayName: string;
  configSchema: JSONSchema;
  inputPorts: PortDefinition[];
  outputPorts: PortDefinition[];
}

/** Concrete node instance in a graph. */
export interface NodeInstance {
  instanceId: string;
  nodeTypeId: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

/** Directed edge between two node ports. */
export interface Edge {
  edgeId: string;
  fromNodeId: string;
  fromPort: string;
  toNodeId: string;
  toPort: string;
  reviewerNodeId?: string;
}

/** Directed acyclic graph candidate for execution. */
export interface Graph {
  graphId: string;
  nodes: NodeInstance[];
  edges: Edge[];
}

/** Structured validation error/warning record. */
export interface ValidationError {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

/** Validation result object with both blocking errors and warnings. */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}
