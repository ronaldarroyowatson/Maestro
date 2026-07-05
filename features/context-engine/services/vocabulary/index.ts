import type { VocabularyEntry } from '../../models/types.js';

/** Manages vocabulary entries used during context assembly. */
export class VocabularyStore {
  private readonly entries = new Map<string, VocabularyEntry>();

  /** Upserts a vocabulary entry by term. */
  upsert(entry: VocabularyEntry): void {
    this.entries.set(entry.term, entry);
  }

  /** Lists all vocabulary entries in lexical order. */
  list(): VocabularyEntry[] {
    return [...this.entries.values()].sort((a, b) => a.term.localeCompare(b.term));
  }
}
