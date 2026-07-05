import { describe, expect, it } from 'vitest';
import { PromptEngine } from '../../src/prompt-engine/index.js';
import type { PromptTemplate } from '../../src/prompt-engine/index.js';

function template(): PromptTemplate {
  const now = new Date();
  return {
    id: 'parse-page',
    version: '1.0.0',
    contentHash: 'hash',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    changelog: 'initial',
    title: 'Parse page',
    template: 'Document:\n{{document}}\nHints:\n{{hints}}',
    variables: ['document', 'hints']
  };
}

describe('prompt-engine', () => {
  it('renders merged instructions and context', () => {
    const engine = new PromptEngine();
    engine.registerTemplate(template());

    const rendered = engine.render(
      'parse-page',
      { document: 'Invoice #1', hints: 'table' },
      { system: ['You are deterministic'], task: ['Extract structured data'] }
    );

    expect(rendered.templateId).toBe('parse-page');
    expect(rendered.prompt).toContain('SYSTEM:');
    expect(rendered.prompt).toContain('Invoice #1');
  });

  it('creates deterministic prompt version ordering', () => {
    const engine = new PromptEngine();
    const version = engine.promptVersioning.create('p1', [
      { artifactType: 'context-config', artifactId: 'b', artifactVersion: '1.0.0' },
      { artifactType: 'prompt-template', artifactId: 'a', artifactVersion: '2.0.0' }
    ]);

    expect(version.promptId).toBe('p1');
    expect(version.components[0].artifactType).toBe('context-config');
  });
});
