export interface EvalCase {
  caseId: string;
  groundTruth: string;
  predictedText: string;
  metadata?: Record<string, unknown>;
}

export interface EvalMeasurement {
  caseId: string;
  cer: number;
  wer: number;
  confidence: number;
  passed: boolean;
}

export interface ExperimentSummary {
  totalCases: number;
  averageCer: number;
  averageWer: number;
  averageConfidence: number;
  passRate: number;
}

export interface ExperimentResult {
  experimentId: string;
  createdAt: Date;
  measurements: EvalMeasurement[];
  summary: ExperimentSummary;
}

/** Computes Levenshtein edit distance for two string arrays. */
export function levenshteinDistance(source: string[], target: string[]): number {
  const rows = source.length + 1;
  const cols = target.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i += 1) {
    matrix[i][0] = i;
  }
  for (let j = 0; j < cols; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const substitutionCost = source[i - 1] === target[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + substitutionCost
      );
    }
  }

  return matrix[rows - 1][cols - 1];
}
