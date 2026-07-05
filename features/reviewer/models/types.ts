import type { JSONSchema } from '../../../src/shared/index.js';

/** Reviewer decision outcomes used during edge traversal. */
export type ReviewerDecisionType = 'accepted' | 'revision-requested' | 'rejected';

/** Reviewer node configuration contract. */
export interface ReviewerConfig {
  schema: JSONSchema;
  ruleIds: string[];
  ruleStrategy: 'all' | 'any';
  minConfidence?: number;
  maxRevisionAttempts?: number;
  revisionTemplateId?: string;
}

/** Structured decision response emitted by reviewer decision-engine. */
export interface ReviewerDecision {
  decision: ReviewerDecisionType;
  reason: string;
  correctionPrompt?: string;
}

/** Input payload to reviewer decision-engine. */
export interface ReviewerDecisionInput {
  output: unknown;
  config: ReviewerConfig;
  revisionAttempt: number;
}
