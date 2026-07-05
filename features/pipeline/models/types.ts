import type { Pipeline, ValidationError } from '../../../src/shared/index.js';

/** Missing descriptor issue from provider catalog validation. */
export interface MissingDescriptor {
  nodeId: string;
  agentDescriptorId: string;
  message: string;
}

/** Missing component issue from registry validation. */
export interface MissingComponent {
  nodeId: string;
  componentId: string;
  componentType: 'prompt-template' | 'context-config' | 'vocabulary-registry' | 'schema' | 'rule-set';
  message: string;
}

/** Pipeline validation report including graph, catalog, and component checks. */
export interface PipelineValidationResult {
  valid: boolean;
  graphErrors: ValidationError[];
  catalogIssues: MissingDescriptor[];
  componentIssues: MissingComponent[];
}

/** Builder error that includes all graph validation errors. */
export class PipelineBuilderError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super(`Pipeline build failed with ${errors.length} validation error(s)`);
    this.name = 'PipelineBuilderError';
  }
}

/** Descriptor import error for invalid XML or schema mismatch. */
export class DescriptorImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DescriptorImportError';
  }
}

/** Serialized snapshot XML export artifact. */
export interface DescriptorExportResult {
  xml: string;
}

/** Snapshot store record. */
export interface SnapshotRecord {
  snapshotId: string;
  pipeline: Pipeline;
  xml?: string;
}
