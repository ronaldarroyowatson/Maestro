import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  BaseDiscoveryScanner,
  EndpointScanner,
  LocalAiDiscoveryService,
  LocalModelScanner,
  OllamaModelScanner,
  OllamaRuntimeScanner,
  OllamaScanner
} from '../index.js';

describe('local AI discovery framework', () => {
  it('Ollama Detection Test', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-ai-discovery-'));
    const ollamaRoot = path.join(tempRoot, '.ollama', 'models');
    await fs.mkdir(ollamaRoot, { recursive: true });
    const modelPath = path.join(ollamaRoot, 'tinyllama.gguf');
    await fs.writeFile(modelPath, 'fake-model-data');

    const service = new LocalAiDiscoveryService([
      new OllamaScanner(),
      new LocalModelScanner()
    ]);

    const result = await service.scanAll({
      rootPath: tempRoot,
      environment: {
        OLLAMA_MODELS_DIR: ollamaRoot
      }
    });

    expect(result.resources.some((resource) => resource.type === 'ollama')).toBe(true);
    expect(result.resources.some((resource) => resource.type === 'model' && resource.path === modelPath)).toBe(true);
    expect(result.graph.nodes.some((node) => node.type === 'device')).toBe(true);
    expect(result.graph.edges.some((edge) => edge.kind === 'contains')).toBe(true);
  });

  it('Duplicate Resource Test', async () => {
    const service = new LocalAiDiscoveryService([
      new EndpointScanner(),
      new EndpointScanner()
    ]);

    const result = await service.scanAll({
      environment: {
        OLLAMA_HOST: 'localhost:11434',
        OPENAI_API_BASE: 'http://localhost:11434'
      }
    });

    expect(result.resources.filter((resource) => resource.type === 'endpoint')).toHaveLength(1);
    expect(result.resources.some((resource) => resource.path === 'http://localhost:11434')).toBe(true);
  });

  it('Missing Configuration Test', async () => {
    const scanner = new EndpointScanner();
    const resources = await scanner.scan({ environment: {} });
    expect(resources).toEqual([]);
  });

  it('Invalid Endpoint Test', async () => {
    const scanner = new EndpointScanner();
    const resources = await scanner.scan({
      environment: {
        OLLAMA_HOST: 'localhost:11434'
      }
    });

    expect(resources[0]?.path).toBe('http://localhost:11434');
  });

  it('Ollama Runtime Detection Test', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          models: []
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as typeof fetch;

    const scanner = new OllamaRuntimeScanner();
    const resources = await scanner.scan({
      environment: {
        OLLAMA_EXE: process.execPath,
        OLLAMA_HOST: 'http://127.0.0.1:11434'
      }
    });

    globalThis.fetch = originalFetch;

    expect(resources).toHaveLength(1);
    expect(resources[0]?.type).toBe('runtime');
    expect(resources[0]?.metadata.runtime).toBe('ollama');
  });

  it('Ollama Model Metadata Test', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          models: [
            {
              name: 'tinyllama:latest',
              model: 'tinyllama:latest',
              modified_at: '2026-10-29T19:18:35.6645852-05:00',
              size: 637700138,
              digest: 'abc123',
              details: { format: 'gguf' },
              capabilities: ['completion']
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as typeof fetch;

    const scanner = new OllamaModelScanner();
    const resources = await scanner.scan({
      environment: {
        OLLAMA_HOST: 'http://127.0.0.1:11434'
      }
    });

    globalThis.fetch = originalFetch;

    expect(resources).toHaveLength(1);
    expect(resources[0]?.type).toBe('model');
    expect(resources[0]?.metadata.runtimeId).toBe('runtime:ollama');
    expect(resources[0]?.metadata.modelName).toBe('tinyllama:latest');
  });

  it('Malformed JSON Test', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response('not-json', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })) as typeof fetch;

    const scanner = new OllamaModelScanner();
    const resources = await scanner.scan({
      environment: {
        OLLAMA_HOST: 'http://127.0.0.1:11434'
      }
    });

    globalThis.fetch = originalFetch;

    expect(resources).toEqual([]);
  });

  it('Large Scale Resource Scan Test', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-ai-large-scan-'));
    const ollamaRoot = path.join(tempRoot, '.ollama', 'models', 'deep', 'nested');
    await fs.mkdir(ollamaRoot, { recursive: true });

    const writes: Promise<void>[] = [];
    for (let index = 0; index < 120; index += 1) {
      writes.push(fs.writeFile(path.join(ollamaRoot, `model-${index}.gguf`), 'fake-model'));
    }
    await Promise.all(writes);

    const scanner = new LocalModelScanner();
    const resources = await scanner.scan({
      rootPath: tempRoot,
      environment: {
        OLLAMA_MODELS_DIR: path.join(tempRoot, '.ollama', 'models')
      }
    });

    expect(resources.length).toBe(120);
  });

  it('Resource Relationship Test', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          models: [
            {
              name: 'tinyllama:latest',
              model: 'tinyllama:latest',
              size: 637700138,
              digest: 'abc123',
              details: { format: 'gguf' },
              capabilities: ['completion']
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as typeof fetch;

    const service = new LocalAiDiscoveryService([
      new OllamaRuntimeScanner(),
      new OllamaModelScanner(),
      new EndpointScanner()
    ]);
    const result = await service.scanAll({
      environment: {
        OLLAMA_EXE: process.execPath,
        OLLAMA_HOST: 'http://127.0.0.1:11434',
        OPENAI_API_BASE: 'http://127.0.0.1:11434'
      }
    });
    globalThis.fetch = originalFetch;

    expect(result.resources.some((resource) => resource.type === 'runtime' && resource.id === 'runtime:ollama')).toBe(true);
    expect(result.resources.some((resource) => resource.type === 'model' && resource.id === 'model:ollama:tinyllama:latest')).toBe(true);
    expect(result.graph.edges.some((edge) => edge.from === 'runtime:ollama' && edge.to === 'model:ollama:tinyllama:latest')).toBe(true);
  });

  it('Resource Removal Detection Test', async () => {
    class ToggleScanner extends BaseDiscoveryScanner {
      private callCount = 0;

      constructor() {
        super('toggle-scanner', 'model');
      }

      async scan(): Promise<Array<{ id: string; name: string; type: 'model'; path: string; status: 'detected'; metadata: Record<string, unknown>; discoveredBy: string; lastSeen: Date }>> {
        this.callCount += 1;
        if (this.callCount === 1) {
          return [{
            id: 'model:toggle',
            name: 'toggle-model',
            type: 'model',
            path: 'C:\\models\\toggle.gguf',
            status: 'detected',
            metadata: {},
            discoveredBy: this.id,
            lastSeen: new Date()
          }];
        }
        return [];
      }
    }

    const service = new LocalAiDiscoveryService([new ToggleScanner()]);
    await service.scanAll({ rootPath: 'C:\\workspace' });
    const firstNode = service.registry.lookup('model:toggle');
    expect(firstNode?.status).toBe('detected');

    await service.scanAll({ rootPath: 'C:\\workspace' });
    const secondNode = service.registry.lookup('model:toggle');
    expect(secondNode?.status).toBe('missing');
  });
});
