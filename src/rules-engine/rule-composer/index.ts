import type { RuleEvaluationResult, RuleSetStrategy } from '../types.js';

/** Composes multiple rule evaluation results under set strategies. */
export class RuleComposer {
  /** Aggregates evaluation results using all/any strategy semantics. */
  compose(results: RuleEvaluationResult[], strategy: RuleSetStrategy): RuleEvaluationResult {
    const matchedConditions = results.flatMap((result) => result.matchedConditions);
    const failedConditions = results.flatMap((result) => result.failedConditions);

    const passed = strategy === 'all' ? results.every((result) => result.passed) : results.some((result) => result.passed);

    return {
      passed,
      matchedConditions,
      failedConditions
    };
  }
}
