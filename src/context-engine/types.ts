/** Raw document context payload from upstream pipeline nodes. */
export interface DocumentContext {
  documentId: string;
  text: string;
  pageNumber?: number;
}

/** Vocabulary context entries available for domain guidance. */
export interface VocabularyEntry {
  term: string;
  definition: string;
}

/** Layout hint metadata for OCR and parsing guidance. */
export interface LayoutHint {
  name: string;
  value: string;
}

/** Historical context from prior runs, tasks, or revisions. */
export interface HistoricalContext {
  runId: string;
  summary: string;
  timestamp: Date;
}

/** Serialized context payload ready for prompt injection. */
export interface SerializedContext {
  context: string;
  metadata: Record<string, unknown>;
}
