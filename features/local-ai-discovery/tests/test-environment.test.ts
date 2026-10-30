import { describe, expect, it } from 'vitest';

import { LocalAiTestEnvironment } from '../services/test-environment/index.js';

describe('local AI discovery test environment', () => {
  it('surfaces a starter model set suitable for local validation', () => {
    const env = new LocalAiTestEnvironment();
    const results = env.buildPlan();

    expect(results.starterModels.map((model) => model.id)).toEqual(['tinyllama', 'phi', 'gemma']);
    expect(results.installSteps.length).toBeGreaterThan(0);
  });

  it('verifies metadata for discovered model resources', () => {
    const env = new LocalAiTestEnvironment();

    const result = env.verifyModelMetadata({
      id: 'model:tinyllama.gguf',
      name: 'tinyllama.gguf',
      type: 'model',
      path: '/tmp/tinyllama.gguf',
      status: 'detected',
      metadata: {
        fileName: 'tinyllama.gguf',
        fileExtension: '.gguf',
        sizeBytes: 1024
      },
      discoveredBy: 'local-model-scanner',
      lastSeen: new Date()
    });

    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it('returns a runtime status object even when Ollama is missing', () => {
    const env = new LocalAiTestEnvironment();
    const result = env.detectRuntime();

    expect(result.runtime).toBe('ollama');
    expect(['available', 'missing']).toContain(result.status);
  });
});
