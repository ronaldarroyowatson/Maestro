import { levenshteinDistance } from '../../models/types.js';

function tokenize(text: string): string[] {
  const trimmed = text.trim();
  return trimmed.length === 0 ? [] : trimmed.split(/\s+/);
}

/** Calculates normalized Word Error Rate. */
export class WerCalculator {
  calculate(groundTruth: string, predictedText: string): number {
    const source = tokenize(groundTruth);
    const target = tokenize(predictedText);
    const distance = levenshteinDistance(source, target);
    const denominator = Math.max(source.length, 1);
    return distance / denominator;
  }
}
