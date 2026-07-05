import { describe, expect, it } from 'vitest';
import { RulesEngine } from '../index.js';

function rule(id: string, conditions: Array<{ field: string; operator: 'equals' | 'contains' | 'regex' | 'gt' | 'lt'; value: string | number }>) {
  const now = new Date();
  return {
    id,
    version: '1.0.0',
    contentHash: 'h',
    status: 'active' as const,
    createdAt: now,
    updatedAt: now,
    changelog: 'init',
    name: id,
    conditions
  };
}

describe('rules-engine', () => {
  it('evaluates single rule and composed set', () => {
    const engine = new RulesEngine();
    engine.register(rule('r1', [{ field: 'confidence', operator: 'gt', value: 0.8 }]));
    engine.register(rule('r2', [{ field: 'text', operator: 'contains', value: 'invoice' }]));

    const single = engine.evaluate('r1', { confidence: 0.9 });
    expect(single.passed).toBe(true);

    const set = engine.evaluateSet('r1,r2'.split(','), { confidence: 0.9, text: 'invoice #1' }, 'all');
    expect(set.passed).toBe(true);
  });

  it('fails any/all strategy as expected', () => {
    const engine = new RulesEngine();
    engine.register(rule('r1', [{ field: 'confidence', operator: 'gt', value: 0.8 }]));
    engine.register(rule('r2', [{ field: 'text', operator: 'contains', value: 'invoice' }]));

    const all = engine.evaluateSet('r1,r2'.split(','), { confidence: 0.2, text: 'memo' }, 'all');
    const any = engine.evaluateSet('r1,r2'.split(','), { confidence: 0.9, text: 'memo' }, 'any');

    expect(all.passed).toBe(false);
    expect(any.passed).toBe(true);
  });
});
