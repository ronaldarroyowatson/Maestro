import type { HistoricalContext } from '../../models/types.js';

/** Stores bounded historical context entries for prompt grounding. */
export class HistoricalContextStore {
  private readonly items: HistoricalContext[] = [];

  constructor(private readonly maxEntries = 20) {}

  /** Appends a historical context entry, keeping most recent bounded set. */
  append(entry: HistoricalContext): void {
    this.items.push(entry);
    this.items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    while (this.items.length > this.maxEntries) {
      this.items.shift();
    }
  }

  /** Returns historical entries in ascending timestamp order. */
  list(): HistoricalContext[] {
    return [...this.items];
  }
}
