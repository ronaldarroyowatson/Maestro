import { describe, expect, it } from 'vitest';
import { PromptEngine } from '../../prompt-engine/index.js';
import { RulesEngine } from '../../rules-engine/index.js';
import { Reviewer } from '../index.js';

function activeRule(id: string, field: string, operator: 'equals' | 'contains' | 'regex' | 'gt' | 'lt', value: string | number) {
  const now = new Date();
  return {
    id,
    version: '1.0.0',
    contentHash: 'hash',
    status: 'active' as const,
    createdAt: now,
    updatedAt: now,
    changelog: 'init',
    name: id,
    conditions: [{ field, operator, value }]
  };
}

describe('reviewer', () => {
  it('returns accepted when schema and rules pass', () => {
    const rules = new RulesEngine();
    const prompt = new PromptEngine();
    rules.register(activeRule('r1', 'confidence', 'gt', 0.8));
    const reviewer = new Reviewer(rules, prompt);

    const decision = reviewer.review({
      output: { confidence: 0.9 },
      config: {
        schema: { type: 'object', properties: { confidence: { type: 'number' } }, required: ['confidence'] },
        ruleIds: ['r1'],
        ruleStrategy: 'all',
        maxRevisionAttempts: 1
      },
      revisionAttempt: 0
    });

    expect(decision.decision).toBe('accepted');
  });

  it('returns revision-requested before max attempts', () => {
    const rules = new RulesEngine();
    const prompt = new PromptEngine();
    prompt.registerTemplate({
      id: 'revise-template',
      version: '1.0.0',
      contentHash: 'h',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      changelog: 'init',
      title: 'revise',
      template: 'Reason: {{reason}}\nOutput: {{output}}',
      variables: ['reason', 'output']
    });
    rules.register(activeRule('r1', 'confidence', 'gt', 0.8));
    const reviewer = new Reviewer(rules, prompt);

    const decision = reviewer.review({
      output: { confidence: 0.2 },
      config: {
        schema: { type: 'object', properties: { confidence: { type: 'number' } }, required: ['confidence'] },
        ruleIds: ['r1'],
        ruleStrategy: 'all',
        maxRevisionAttempts: 2,
        revisionTemplateId: 'revise-template'
      },
      revisionAttempt: 0
    });

    expect(decision.decision).toBe('revision-requested');
    expect(decision.correctionPrompt).toContain('Reason:');
  });

  it('returns rejected when revision attempts are exhausted', () => {
    const rules = new RulesEngine();
    const prompt = new PromptEngine();
    rules.register(activeRule('r1', 'confidence', 'gt', 0.8));
    const reviewer = new Reviewer(rules, prompt);

    const decision = reviewer.review({
      output: { confidence: 0.2 },
      config: {
        schema: { type: 'object', properties: { confidence: { type: 'number' } }, required: ['confidence'] },
        ruleIds: ['r1'],
        ruleStrategy: 'all',
        maxRevisionAttempts: 1
      },
      revisionAttempt: 1
    });

    expect(decision.decision).toBe('rejected');
  });
});
