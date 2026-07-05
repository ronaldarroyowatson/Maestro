import { describe, expect, it } from 'vitest';
import { ContextEngine } from '../../src/context-engine/index.js';

describe('context-engine', () => {
  it('serializes document, vocabulary, hints, and history', () => {
    const engine = new ContextEngine();
    engine.vocabulary.upsert({ term: 'CER', definition: 'Character Error Rate' });
    engine.layoutHint.set({ name: 'grid', value: '2x2' });
    engine.historicalContext.append({ runId: 'r1', summary: 'Last run improved confidence', timestamp: new Date('2026-01-01T00:00:00.000Z') });

    const result = engine.build({ documentId: 'doc-1', text: 'Hello world', pageNumber: 1 });

    expect(result.context).toContain('DOCUMENT_ID: doc-1');
    expect(result.context).toContain('CER: Character Error Rate');
    expect(result.metadata.vocabularyCount).toBe(1);
  });
});
