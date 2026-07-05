import type { VersionedArtifact } from '../../../src/shared/index.js';

/** Supported condition operators for deterministic rule evaluation. */
export type RuleOperator = 'equals' | 'contains' | 'regex' | 'gt' | 'lt';

/** Atomic condition inside a rule definition. */
export interface RuleCondition {
  field: string;
  operator: RuleOperator;
  value: string | number;
}

/** Versioned rules artifact definition. */
export interface RuleDefinition extends VersionedArtifact {
  name: string;
  conditions: RuleCondition[];
}

/** Rule set composition strategy. */
export type RuleSetStrategy = 'all' | 'any';

/** Result from evaluating a rule or rule set. */
export interface RuleEvaluationResult {
  passed: boolean;
  matchedConditions: RuleCondition[];
  failedConditions: RuleCondition[];
}
