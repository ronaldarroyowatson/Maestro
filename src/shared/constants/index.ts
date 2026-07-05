/** Default retry count for retry-aware execution paths. */
export const DEFAULT_MAX_RETRIES = 3;

/** Default confidence threshold for quality-sensitive outputs. */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.75;

/** Default target DPI for image-related pipelines. */
export const DEFAULT_DPI_TARGET = 300;

/** Typed event names used by conductor event-bus integrations. */
export const EVENT_NAMES = {
  NODE_STARTED: 'NodeStarted',
  NODE_COMPLETED: 'NodeCompleted',
  NODE_FAILED: 'NodeFailed',
  REVIEWER_DECISION: 'ReviewerDecision',
  PIPELINE_STARTED: 'PipelineStarted',
  PIPELINE_COMPLETED: 'PipelineCompleted',
  PIPELINE_FAILED: 'PipelineFailed'
} as const;

/** Typed domain error codes shared across features. */
export const ERROR_CODES = {
  CYCLE_DETECTED: 'CYCLE_DETECTED',
  INVALID_SCHEMA: 'INVALID_SCHEMA',
  ARTIFACT_NOT_FOUND: 'ARTIFACT_NOT_FOUND',
  ACTIVE_VERSION_NOT_FOUND: 'ACTIVE_VERSION_NOT_FOUND',
  INVALID_UPDATE_MANIFEST: 'INVALID_UPDATE_MANIFEST',
  SIGNATURE_VALIDATION_FAILED: 'SIGNATURE_VALIDATION_FAILED',
  VERSION_INCOMPATIBLE: 'VERSION_INCOMPATIBLE',
  ROLLBACK_TARGET_NOT_FOUND: 'ROLLBACK_TARGET_NOT_FOUND'
} as const;
