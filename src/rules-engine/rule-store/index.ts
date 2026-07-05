import type { RuleDefinition } from '../types.js';

/** Stores versioned rules in memory for execution and composition. */
export class RuleStore {
  private readonly rules = new Map<string, RuleDefinition>();

  /** Registers or replaces a rule definition by id. */
  register(rule: RuleDefinition): void {
    this.rules.set(rule.id, rule);
  }

  /** Returns a rule definition by id. */
  get(ruleId: string): RuleDefinition {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }
    return rule;
  }

  /** Lists all registered rules. */
  list(): RuleDefinition[] {
    return [...this.rules.values()];
  }
}
