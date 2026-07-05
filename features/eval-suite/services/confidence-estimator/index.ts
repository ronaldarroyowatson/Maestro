export interface ConfidenceInput {
  cer: number;
  wer: number;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

/** Estimates confidence from CER/WER quality signals. */
export class ConfidenceEstimator {
  estimate(input: ConfidenceInput): number {
    const penalty = input.cer * 0.4 + input.wer * 0.6;
    return clamp(1 - penalty);
  }
}
