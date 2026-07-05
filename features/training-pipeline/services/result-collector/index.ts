import { randomUUID } from 'node:crypto';
import type { ExperimentResult } from '../../../eval-suite/index.js';
import type { CaseTextResolverResult, TrainingSample } from '../../models/types.js';

/** Collects low-confidence eval outcomes as training samples. */
export class ResultCollector {
  collect(
    experiment: ExperimentResult,
    resolveCaseText?: (caseId: string) => CaseTextResolverResult | undefined,
    minConfidence = 0.9
  ): TrainingSample[] {
    return experiment.measurements
      .filter((measurement) => measurement.confidence < minConfidence)
      .map((measurement) => {
        const resolved = resolveCaseText?.(measurement.caseId);
        return {
          sampleId: randomUUID(),
          sourceCaseId: measurement.caseId,
          inputText: resolved?.inputText ?? '',
          targetText: resolved?.targetText ?? '',
          confidence: measurement.confidence
        };
      });
  }
}
