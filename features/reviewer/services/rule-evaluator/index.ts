import type { RulesEngine } from '../../../rules-engine/index.js';

/** Evaluates reviewer rule sets against payload output. */
export class ReviewerRuleEvaluator {
  constructor(private readonly rulesEngine: RulesEngine) {}

  /** Evaluates all configured rules and returns aggregate pass/fail result. */
  evaluate(ruleIds: string[], payload: Record<string, unknown>, strategy: 'all' | 'any') {
    if (ruleIds.length === 0) {
      return { passed: true, matchedConditions: [], failedConditions: [] };
    }

    return this.rulesEngine.evaluateSet(ruleIds, payload, strategy);
  }
}
