import type { EvalCase, ExperimentResult } from './models/types.js';
import { CerCalculator } from './services/cer-calculator/index.js';
import { ConfidenceEstimator } from './services/confidence-estimator/index.js';
import { ExperimentRunner } from './services/experiment-runner/index.js';
import { ResultLogger } from './services/result-logger/index.js';
import { WerCalculator } from './services/wer-calculator/index.js';

export type { EvalCase, EvalMeasurement, ExperimentResult, ExperimentSummary } from './models/types.js';

/** Eval-suite facade for quality measurement and result logging. */
export class EvalSuite {
  readonly cerCalculator: CerCalculator;
  readonly werCalculator: WerCalculator;
  readonly confidenceEstimator: ConfidenceEstimator;
  readonly experimentRunner: ExperimentRunner;
  readonly resultLogger: ResultLogger;

  constructor(passThreshold = 0.8, outputFilePath?: string) {
    this.cerCalculator = new CerCalculator();
    this.werCalculator = new WerCalculator();
    this.confidenceEstimator = new ConfidenceEstimator();
    this.experimentRunner = new ExperimentRunner(
      this.cerCalculator,
      this.werCalculator,
      this.confidenceEstimator,
      passThreshold
    );
    this.resultLogger = new ResultLogger(outputFilePath);
  }

  runAndLog(cases: EvalCase[]): ExperimentResult {
    const result = this.experimentRunner.run(cases);
    this.resultLogger.log(result);
    return result;
  }
}
