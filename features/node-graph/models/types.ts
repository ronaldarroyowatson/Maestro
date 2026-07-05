import type {
  Edge,
  Graph,
  NodeDefinition,
  NodeInstance,
  ValidationError,
  ValidationResult
} from '../../../src/shared/index.js';

/** A single topological execution layer of node instance IDs. */
export type ExecutionLayer = string[];

/** Topological ordering represented as parallelizable execution layers. */
export type TopologicalOrder = ExecutionLayer[];

export type { Edge, Graph, NodeDefinition, NodeInstance, ValidationError, ValidationResult };
