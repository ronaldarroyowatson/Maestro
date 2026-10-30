import { describe, expect, it } from 'vitest';

import type { ResourceNode } from '../../../src/shared/index.js';
import { ResourceRegistry } from '../services/registry/index.js';

function buildNode(id: string, name: string, type: 'runtime' | 'model', status: 'healthy' | 'missing' | 'detected' = 'healthy'): ResourceNode {
  return {
    id,
    name,
    type,
    status,
    tags: [type, status],
    metadata: { source: 'test' },
    relationships: [],
    discoveredBy: 'registry-test',
    createdAt: new Date('2026-10-29T00:00:00.000Z'),
    lastSeen: new Date('2026-10-29T00:00:00.000Z'),
    path: `C:\\test\\${name}`
  };
}

describe('local AI resource registry', () => {
  it('Registry Update Test', () => {
    const registry = new ResourceRegistry();
    registry.create(buildNode('runtime:ollama', 'Ollama Runtime', 'runtime'));

    const updated = registry.updateStatus('runtime:ollama', 'detected', 'runtime probe degraded');
    expect(updated?.status).toBe('detected');
    expect(String(updated?.metadata.statusReason)).toContain('degraded');
  });

  it('Duplicate Resource Relationship Test', () => {
    const registry = new ResourceRegistry();
    registry.create(buildNode('runtime:ollama', 'Ollama Runtime', 'runtime'));
    registry.create(buildNode('model:tinyllama', 'tinyllama:latest', 'model'));

    registry.addRelationship('runtime:ollama', 'model:tinyllama', 'contains');
    registry.addRelationship('runtime:ollama', 'model:tinyllama', 'contains');

    const runtime = registry.lookup('runtime:ollama');
    expect(runtime?.relationships.length).toBe(1);
  });

  it('Resource Search Test', () => {
    const registry = new ResourceRegistry();
    registry.create(buildNode('runtime:ollama', 'Ollama Runtime', 'runtime'));
    registry.create(buildNode('model:tinyllama', 'tinyllama:latest', 'model'));

    const results = registry.search('tinyllama');
    expect(results.map((result) => result.id)).toEqual(['model:tinyllama']);
  });

  it('Status Filter Test', () => {
    const registry = new ResourceRegistry();
    registry.create(buildNode('runtime:ollama', 'Ollama Runtime', 'runtime', 'healthy'));
    registry.create(buildNode('model:tinyllama', 'tinyllama:latest', 'model', 'missing'));

    const results = registry.filter({ status: 'missing' });
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('model:tinyllama');
  });

  it('Missing Resource Remove Test', () => {
    const registry = new ResourceRegistry();
    const missingNode = {
      ...buildNode('model:missing', 'missing-model', 'model', 'missing'),
      lastSeen: new Date('2020-01-01T00:00:00.000Z')
    };
    registry.create(missingNode);
    registry.create(buildNode('runtime:ollama', 'Ollama Runtime', 'runtime', 'healthy'));

    const removed = registry.removeMissing(new Date('2021-01-01T00:00:00.000Z'));
    expect(removed).toBe(1);
    expect(registry.lookup('model:missing')).toBeUndefined();
    expect(registry.lookup('runtime:ollama')).toBeDefined();
  });

  it('Health State Transition Test', () => {
    const registry = new ResourceRegistry();
    registry.create(buildNode('runtime:ollama', 'Ollama Runtime', 'runtime', 'healthy'));

    const degraded = registry.updateHealth('runtime:ollama', { healthy: false, reason: 'probe timeout' });
    expect(degraded?.status).toBe('degraded');
    const healthRecord = degraded?.metadata.health as { reason?: string } | undefined;
    expect(healthRecord?.reason).toBe('probe timeout');

    const healthy = registry.updateHealth('runtime:ollama', { healthy: true });
    expect(healthy?.status).toBe('healthy');
  });

  it('Categorization and Tagging Test', () => {
    const registry = new ResourceRegistry();
    registry.create(buildNode('model:tinyllama', 'tinyllama:latest', 'model'));

    registry.assignCategory('model:tinyllama', 'llm');
    registry.addTags('model:tinyllama', ['local', 'favorite', 'favorite']);
    registry.removeTags('model:tinyllama', ['healthy']);

    const filtered = registry.filter({ category: 'llm', tags: ['local'] });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.tags.includes('healthy')).toBe(false);
  });

  it('Missing Status Marking Test', () => {
    const registry = new ResourceRegistry();
    registry.create(buildNode('runtime:ollama', 'Ollama Runtime', 'runtime', 'healthy'));
    registry.create(buildNode('model:tinyllama', 'tinyllama:latest', 'model', 'healthy'));

    const marked = registry.markMissingForAbsent(['runtime:ollama']);
    expect(marked).toBe(1);
    expect(registry.lookup('model:tinyllama')?.status).toBe('missing');
  });

  it('Inventory Snapshot Test', () => {
    const registry = new ResourceRegistry();
    registry.create(buildNode('runtime:ollama', 'Ollama Runtime', 'runtime', 'healthy'));
    registry.create(buildNode('model:tinyllama', 'tinyllama:latest', 'model', 'detected'));
    registry.assignCategory('model:tinyllama', 'llm');

    const snapshot = registry.getInventorySnapshot();
    expect(snapshot.total).toBe(2);
    expect(snapshot.byType.runtime).toBe(1);
    expect(snapshot.byStatus.detected).toBe(1);
    expect(snapshot.byCategory.llm).toBe(1);
  });

  it('Duplicate Resource Merge Test', () => {
    const registry = new ResourceRegistry();
    registry.create(buildNode('model:tinyllama', 'tinyllama:latest', 'model'));

    registry.upsert({
      ...buildNode('model:tinyllama', 'tinyllama:latest', 'model'),
      tags: ['model', 'favorite'],
      metadata: { source: 'new-source', note: 'updated' }
    });

    const node = registry.lookup('model:tinyllama');
    expect(node?.tags.includes('favorite')).toBe(true);
    expect(node?.metadata.note).toBe('updated');
    expect(node?.createdAt.toISOString()).toBe('2026-10-29T00:00:00.000Z');
  });
});
