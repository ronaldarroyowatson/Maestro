import { randomUUID } from 'node:crypto';
import type { EvalCase, EvalMeasurement, ExperimentResult, ExperimentSummary } from '../../models/types.js';
import { CerCalculator } from '../cer-calculator/index.js';
import { ConfidenceEstimator } from '../confidence-estimator/index.js';
import { WerCalculator } from '../wer-calculator/index.js';

/** Runs full evaluation experiments and aggregates metrics. */
export class ExperimentRunner {
  constructor(
    private readonly cerCalculator: CerCalculator,
    private readonly werCalculator: WerCalculator,
    private readonly confidenceEstimator: ConfidenceEstimator,
    private readonly passThreshold = 0.8
  ) {}

  run(cases: EvalCase[]): ExperimentResult {
    const measurements: EvalMeasurement[] = cases.map((testCase) => {
      const cer = this.cerCalculator.calculate(testCase.groundTruth, testCase.predictedText);
      const wer = this.werCalculator.calculate(testCase.groundTruth, testCase.predictedText);
      const confidence = this.confidenceEstimator.estimate({ cer, wer });
      return {
        caseId: testCase.caseId,
        cer,
        wer,
        confidence,
        passed: confidence >= this.passThreshold
      };
    });

    const summary = this.summarize(measurements);
    return {
      experimentId: randomUUID(),
      createdAt: new Date(),
      measurements,
      summary
    };
  }

  private summarize(measurements: EvalMeasurement[]): ExperimentSummary {
    const totalCases = measurements.length;
    if (totalCases === 0) {
      return {
        totalCases,
        averageCer: 0,
        averageWer: 0,
        averageConfidence: 0,
        passRate: 0
      };
    }

    const totalCer = measurements.reduce((sum, measurement) => sum + measurement.cer, 0);
    const totalWer = measurements.reduce((sum, measurement) => sum + measurement.wer, 0);
    const totalConfidence = measurements.reduce((sum, measurement) => sum + measurement.confidence, 0);
    const passedCount = measurements.filter((measurement) => measurement.passed).length;

    return {
      totalCases,
      averageCer: totalCer / totalCases,
      averageWer: totalWer / totalCases,
      averageConfidence: totalConfidence / totalCases,
      passRate: passedCount / totalCases
    };
  }
}
