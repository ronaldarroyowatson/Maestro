import { PromptEngine } from '../prompt-engine/index.js';
import { RulesEngine } from '../rules-engine/index.js';
import type { ReviewerDecisionInput } from './models/types.js';
import { ReviewerDecisionEngine } from './services/decision-engine/index.js';
import { ReviewerRuleEvaluator } from './services/rule-evaluator/index.js';
import { RevisionPrompter } from './services/revision-prompter/index.js';
import { ReviewerSchemaValidator } from './services/schema-validator/index.js';

export type { ReviewerConfig, ReviewerDecision, ReviewerDecisionInput, ReviewerDecisionType } from './models/types.js';

/** Reviewer feature facade for schema/rule validation and revision prompting. */
export class Reviewer {
  readonly schemaValidator: ReviewerSchemaValidator;
  readonly ruleEvaluator: ReviewerRuleEvaluator;
  readonly revisionPrompter: RevisionPrompter;
  readonly decisionEngine: ReviewerDecisionEngine;

  constructor(private readonly rulesEngine: RulesEngine, private readonly promptEngine: PromptEngine) {
    this.schemaValidator = new ReviewerSchemaValidator();
    this.ruleEvaluator = new ReviewerRuleEvaluator(this.rulesEngine);
    this.revisionPrompter = new RevisionPrompter(this.promptEngine);
    this.decisionEngine = new ReviewerDecisionEngine(this.schemaValidator, this.ruleEvaluator, this.revisionPrompter);
  }

  /** Evaluates output payload and returns reviewer decision. */
  review(input: ReviewerDecisionInput) {
    return this.decisionEngine.decide(input);
  }
}
