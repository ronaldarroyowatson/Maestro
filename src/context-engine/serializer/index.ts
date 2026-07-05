import type { DocumentContext, HistoricalContext, LayoutHint, SerializedContext, VocabularyEntry } from '../types.js';

/** Serializes structured context blocks into deterministic prompt text. */
export class ContextSerializer {
  /** Serializes context components into a unified string payload. */
  serialize(input: {
    document: DocumentContext;
    vocabulary: VocabularyEntry[];
    hints: LayoutHint[];
    history: HistoricalContext[];
  }): SerializedContext {
    const vocabularyText = input.vocabulary.map((entry) => `${entry.term}: ${entry.definition}`).join('\n');
    const hintsText = input.hints.map((hint) => `${hint.name}: ${hint.value}`).join('\n');
    const historyText = input.history.map((item) => `${item.timestamp.toISOString()} ${item.summary}`).join('\n');

    const context = [
      `DOCUMENT_ID: ${input.document.documentId}`,
      `PAGE_NUMBER: ${input.document.pageNumber ?? ''}`,
      'DOCUMENT_TEXT:',
      input.document.text,
      'VOCABULARY:',
      vocabularyText,
      'LAYOUT_HINTS:',
      hintsText,
      'HISTORY:',
      historyText
    ].join('\n');

    return {
      context,
      metadata: {
        vocabularyCount: input.vocabulary.length,
        hintCount: input.hints.length,
        historyCount: input.history.length
      }
    };
  }
}
