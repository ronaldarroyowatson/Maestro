import { describe, expect, it } from 'vitest';
import { EvalSuite } from '../index.js';

describe('eval-suite feature', () => {
  it('computes zero CER/WER for exact match', () => {
    const evalSuite = new EvalSuite();
    expect(evalSuite.cerCalculator.calculate('abc', 'abc')).toBe(0);
    expect(evalSuite.werCalculator.calculate('one two', 'one two')).toBe(0);
  });

  it('runs experiment and produces summary metrics', () => {
    const evalSuite = new EvalSuite(0.5);
    const result = evalSuite.runAndLog([
      { caseId: 'c1', groundTruth: 'alpha beta', predictedText: 'alpha beta' },
      { caseId: 'c2', groundTruth: 'alpha beta', predictedText: 'alpha' }
    ]);

    expect(result.measurements.length).toBe(2);
    expect(result.summary.totalCases).toBe(2);
    expect(result.summary.averageConfidence).toBeGreaterThanOrEqual(0);
    expect(result.summary.averageConfidence).toBeLessThanOrEqual(1);
  });

  it('stores logged results in memory', () => {
    const evalSuite = new EvalSuite();
    evalSuite.runAndLog([{ caseId: 'c1', groundTruth: 'x', predictedText: 'x' }]);
    expect(evalSuite.resultLogger.list().length).toBe(1);
  });
});
