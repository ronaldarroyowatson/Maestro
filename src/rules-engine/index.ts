import { RuleComposer } from './rule-composer/index.js';
import { RuleExecutor } from './rule-executor/index.js';
import { RuleStore } from './rule-store/index.js';
import type { RuleDefinition, RuleEvaluationResult, RuleSetStrategy } from './types.js';

export type { RuleCondition, RuleDefinition, RuleEvaluationResult, RuleOperator, RuleSetStrategy } from './types.js';

/** Rules-engine facade for storing, executing, and composing rules. */
export class RulesEngine {
  readonly ruleStore: RuleStore;
  readonly ruleExecutor: RuleExecutor;
  readonly ruleComposer: RuleComposer;

  constructor() {
    this.ruleStore = new RuleStore();
    this.ruleExecutor = new RuleExecutor();
    this.ruleComposer = new RuleComposer();
  }

  /** Registers a rule definition. */
  register(rule: RuleDefinition): void {
    this.ruleStore.register(rule);
  }

  /** Evaluates a single registered rule by id. */
  evaluate(ruleId: string, payload: Record<string, unknown>): RuleEvaluationResult {
    return this.ruleExecutor.execute(this.ruleStore.get(ruleId), payload);
  }

  /** Evaluates many rules and composes result with all/any strategy. */
  evaluateSet(ruleIds: string[], payload: Record<string, unknown>, strategy: RuleSetStrategy): RuleEvaluationResult {
    const results = ruleIds.map((ruleId) => this.evaluate(ruleId, payload));
    return this.ruleComposer.compose(results, strategy);
  }
}
