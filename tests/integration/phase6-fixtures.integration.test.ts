import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ComponentRegistry } from '../../src/component-registry/index.js';
import { ContextEngine } from '../../features/context-engine/index.js';
import { Conductor } from '../../features/conductor/index.js';
import { PipelineFeature } from '../../features/pipeline/index.js';
import { PromptEngine } from '../../features/prompt-engine/index.js';
import { Reviewer } from '../../features/reviewer/index.js';
import { RulesEngine } from '../../features/rules-engine/index.js';
import type { ServiceHandler } from '../../features/conductor/models/types.js';

interface PageInput {
  imagePath: string;
  fixtureId: 'single-col' | 'two-col' | 'grid-2x2';
}

interface ParsedPageResult {
  fixtureId: string;
  extractedText: string;
  lineCount: number;
}

function fixturePath(...segments: string[]): string {
  return resolve(process.cwd(), 'fixtures', ...segments);
}

describe('phase 6 fixtures integration', () => {
  it('runs full pipeline from PageInput to ParsedPageResult using fixture assets', async () => {
    const xml = readFileSync(fixturePath('pipelines', 'page-ocr-pipeline.xml'), 'utf8');

    const componentRegistry = new ComponentRegistry(':memory:');
    const pipelineFeature = new PipelineFeature(
      componentRegistry,
      {
        listAll: async () => ({ entries: [], lastDiscoveredAt: new Date() })
      } as unknown as import('../../features/provider-registry/index.js').ProviderRegistry
    );

    const snapshot = pipelineFeature.descriptorImporter.import(xml);

    const promptEngine = new PromptEngine();
    const contextEngine = new ContextEngine();
    const rulesEngine = new RulesEngine();
    const reviewer = new Reviewer(rulesEngine, promptEngine);

    const serviceRegistry = new Map<string, ServiceHandler>();
    serviceRegistry.set('service', async (config, context) => {
      const purpose = String(config.purpose ?? '');

      if (purpose === 'load-image') {
        const input = context.metadata.input as PageInput;
        const imageBuffer = readFileSync(input.imagePath);
        context.metadata.pageInput = input;
        context.metadata.imageBuffer = imageBuffer;
        return {
          fixtureId: input.fixtureId,
          imageBytes: imageBuffer.byteLength
        };
      }

      if (purpose === 'ocr-read') {
        const pageInput = context.metadata.pageInput as PageInput;
        const text = readFileSync(fixturePath('transcriptions', `${pageInput.fixtureId}.txt`), 'utf8').trim();
        context.metadata.ocrText = text;
        return {
          fixtureId: pageInput.fixtureId,
          text
        };
      }

      if (purpose === 'parse-page') {
        const pageInput = context.metadata.pageInput as PageInput;
        const extractedText = String(context.metadata.ocrText ?? '');
        const parsed: ParsedPageResult = {
          fixtureId: pageInput.fixtureId,
          extractedText,
          lineCount: extractedText.length === 0 ? 0 : extractedText.split(/\n+/).length
        };
        context.metadata.output = parsed;
        return parsed;
      }

      throw new Error(`Unhandled service purpose: ${purpose}`);
    });

    const conductor = new Conductor({
      promptEngine,
      contextEngine,
      reviewer,
      providerRegistry: {
        run: async () => ({ text: '', tokensUsed: 0, latencyMs: 1, rawResponse: {} })
      },
      serviceRegistry
    });

    const cases: Array<{ fixtureId: PageInput['fixtureId']; imageFile: string }> = [
      { fixtureId: 'single-col', imageFile: 'single-col.png' },
      { fixtureId: 'two-col', imageFile: 'two-col.png' },
      { fixtureId: 'grid-2x2', imageFile: 'grid-2x2.png' }
    ];

    for (const testCase of cases) {
      const input: PageInput = {
        fixtureId: testCase.fixtureId,
        imagePath: fixturePath('images', testCase.imageFile)
      };

      const result = await conductor.run(snapshot, input);
      expect(result.status === 'completed' || result.status === 'partial').toBe(true);

      const parsed = result.output as ParsedPageResult;
      const expected = readFileSync(fixturePath('transcriptions', `${testCase.fixtureId}.txt`), 'utf8').trim();
      expect(parsed.fixtureId).toBe(testCase.fixtureId);
      expect(parsed.extractedText).toBe(expected);
      expect(parsed.lineCount).toBeGreaterThan(0);
    }
  });
});
