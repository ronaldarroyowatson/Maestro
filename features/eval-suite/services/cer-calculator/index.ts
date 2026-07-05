import { levenshteinDistance } from '../../models/types.js';

/** Calculates normalized Character Error Rate. */
export class CerCalculator {
  calculate(groundTruth: string, predictedText: string): number {
    const source = Array.from(groundTruth);
    const target = Array.from(predictedText);
    const distance = levenshteinDistance(source, target);
    const denominator = Math.max(source.length, 1);
    return distance / denominator;
  }
}
