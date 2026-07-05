import type { DocumentContext } from '../../models/types.js';

/** Extracts normalized document context from raw input payloads. */
export class DocumentContextBuilder {
  /** Builds document context from unknown source input. */
  build(input: { documentId: string; text: string; pageNumber?: number }): DocumentContext {
    return {
      documentId: input.documentId,
      text: input.text,
      pageNumber: input.pageNumber
    };
  }
}
