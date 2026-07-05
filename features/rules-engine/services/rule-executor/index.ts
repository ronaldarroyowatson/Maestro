import type { RuleCondition, RuleDefinition, RuleEvaluationResult } from '../../models/types.js';

function evaluateCondition(condition: RuleCondition, payload: Record<string, unknown>): boolean {
  const actual = payload[condition.field];

  switch (condition.operator) {
    case 'equals':
      return actual === condition.value;
    case 'contains':
      return String(actual ?? '').includes(String(condition.value));
    case 'regex':
      return new RegExp(String(condition.value)).test(String(actual ?? ''));
    case 'gt':
      return Number(actual) > Number(condition.value);
    case 'lt':
      return Number(actual) < Number(condition.value);
    default:
      return false;
  }
}

/** Evaluates individual rules against a payload object. */
export class RuleExecutor {
  /** Evaluates a rule and returns structured pass/fail details. */
  execute(rule: RuleDefinition, payload: Record<string, unknown>): RuleEvaluationResult {
    const matchedConditions: RuleCondition[] = [];
    const failedConditions: RuleCondition[] = [];

    for (const condition of rule.conditions) {
      if (evaluateCondition(condition, payload)) {
        matchedConditions.push(condition);
      } else {
        failedConditions.push(condition);
      }
    }

    return {
      passed: failedConditions.length === 0,
      matchedConditions,
      failedConditions
    };
  }
}
