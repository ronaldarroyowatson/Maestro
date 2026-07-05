import type { ReviewerDecision, ReviewerDecisionInput } from '../../models/types.js';
import { ReviewerRuleEvaluator } from '../rule-evaluator/index.js';
import { RevisionPrompter } from '../revision-prompter/index.js';
import { ReviewerSchemaValidator } from '../schema-validator/index.js';

/** Computes reviewer decisions from schema/rule checks and revision policy. */
export class ReviewerDecisionEngine {
  constructor(
    private readonly schemaValidator: ReviewerSchemaValidator,
    private readonly ruleEvaluator: ReviewerRuleEvaluator,
    private readonly revisionPrompter: RevisionPrompter
  ) {}

  /** Produces accepted/revision-requested/rejected decision for one output payload. */
  decide(input: ReviewerDecisionInput): ReviewerDecision {
    const schemaResult = this.schemaValidator.validate(input.config.schema, input.output);
    if (!schemaResult.valid) {
      return {
        decision: 'rejected',
        reason: `Schema validation failed: ${schemaResult.errors.map((error) => error.message).join('; ')}`
      };
    }

    const payload = (input.output && typeof input.output === 'object' ? input.output : { value: input.output }) as Record<string, unknown>;
    const ruleResult = this.ruleEvaluator.evaluate(input.config.ruleIds, payload, input.config.ruleStrategy);

    if (ruleResult.passed) {
      return {
        decision: 'accepted',
        reason: 'Schema and rules satisfied'
      };
    }

    const maxRevisionAttempts = input.config.maxRevisionAttempts ?? 1;
    if (input.revisionAttempt >= maxRevisionAttempts) {
      return {
        decision: 'rejected',
        reason: 'Revision attempts exhausted'
      };
    }

    const reason = `Rule checks failed (${ruleResult.failedConditions.length} condition(s))`;
    const correctionPrompt = this.revisionPrompter.render(input.config.revisionTemplateId, reason, input.output);

    return {
      decision: 'revision-requested',
      reason,
      correctionPrompt
    };
  }
}
