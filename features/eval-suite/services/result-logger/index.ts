import { appendFileSync } from 'node:fs';
import type { ExperimentResult } from '../../models/types.js';

/** Persists experiment results in-memory and optional JSONL log file. */
export class ResultLogger {
  private readonly results: ExperimentResult[] = [];

  constructor(private readonly outputFilePath?: string) {}

  log(result: ExperimentResult): void {
    this.results.push(result);
    if (this.outputFilePath) {
      appendFileSync(this.outputFilePath, `${JSON.stringify(result)}\n`, 'utf8');
    }
  }

  list(): ExperimentResult[] {
    return [...this.results];
  }
}
