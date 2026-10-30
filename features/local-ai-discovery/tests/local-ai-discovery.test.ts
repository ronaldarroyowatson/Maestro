import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { AiRepositoryScanner, EndpointScanner, LocalAiDiscoveryService, LocalModelScanner, OllamaScanner } from '../index.js';
import { ResourceRegistry } from '../services/registry/index.js';

describe('local AI discovery framework', () => {
  it('detects an Ollama installation and local model files in a temp workspace', async () => {
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

  it('normalizes local endpoint URLs and deduplicates repeated scanner results', async () => {
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
});
