import { describe, expect, it } from 'vitest';

import { LocalAiTestEnvironment } from '../services/test-environment/index.js';

describe('local AI discovery test environment', () => {
  it('Starter Model Plan Test', () => {
    const env = new LocalAiTestEnvironment();
    const results = env.buildPlan();

    expect(results.starterModels.map((model) => model.id)).toEqual(['tinyllama', 'phi', 'gemma']);
    expect(results.installSteps.length).toBeGreaterThan(0);
  });

  it('Model Metadata Validation Test', () => {
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

  it('Runtime Detection Test', () => {
    const env = new LocalAiTestEnvironment();
    const result = env.detectRuntime();

    expect(result.runtime).toBe('ollama');
    expect(['available', 'missing']).toContain(result.status);
  });

  it('Missing Configuration Test', () => {
    const env = new LocalAiTestEnvironment();
    const result = env.verifyModelMetadata({
      id: 'model:missing',
      name: 'missing',
      type: 'model',
      status: 'detected',
      metadata: {},
      discoveredBy: 'test-scanner',
      lastSeen: new Date()
    });

    expect(result.valid).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('Empty Resource List Test', () => {
    const env = new LocalAiTestEnvironment();
    const result = env.verifyModelMetadata({
      id: 'runtime:ollama',
      name: 'Ollama Runtime',
      type: 'runtime',
      status: 'healthy',
      metadata: {},
      discoveredBy: 'test-scanner',
      lastSeen: new Date()
    });

    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
  });
});
