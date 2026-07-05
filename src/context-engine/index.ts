import { DocumentContextBuilder } from './document-context/index.js';
import { HistoricalContextStore } from './historical-context/index.js';
import { LayoutHintStore } from './layout-hint/index.js';
import { ContextSerializer } from './serializer/index.js';
import { VocabularyStore } from './vocabulary/index.js';

export type {
  DocumentContext,
  HistoricalContext,
  LayoutHint,
  SerializedContext,
  VocabularyEntry
} from './types.js';

/** Context-engine facade for collecting and serializing prompt context inputs. */
export class ContextEngine {
  readonly documentContext: DocumentContextBuilder;
  readonly vocabulary: VocabularyStore;
  readonly layoutHint: LayoutHintStore;
  readonly historicalContext: HistoricalContextStore;
  readonly serializer: ContextSerializer;

  constructor() {
    this.documentContext = new DocumentContextBuilder();
    this.vocabulary = new VocabularyStore();
    this.layoutHint = new LayoutHintStore();
    this.historicalContext = new HistoricalContextStore();
    this.serializer = new ContextSerializer();
  }

  /** Builds final serialized context from current engine state and document input. */
  build(input: { documentId: string; text: string; pageNumber?: number }) {
    const document = this.documentContext.build(input);

    return this.serializer.serialize({
      document,
      vocabulary: this.vocabulary.list(),
      hints: this.layoutHint.list(),
      history: this.historicalContext.list()
    });
  }
}
