import { describe, expect, it } from 'vitest';
import { CapabilityClassifier, ProviderRegistry, ResourceRegistry } from '../index.js';

describe('capability classifier', () => {
  it('classifies coding and local capabilities for a discovered model', () => {
    const classifier = new CapabilityClassifier();
    const profile = classifier.classifyDescriptor({
      descriptorId: 'ollama:llama3.1',
      providerId: 'ollama',
      modelId: 'llama3.1',
      displayName: 'Llama 3.1',
      capabilities: ['coding', 'local', 'fast inference']
    });

    expect(profile.category).toBe('coding');
    expect(profile.tags).toContain('coding');
    expect(profile.tags).toContain('local');
    expect(profile.tags).toContain('fast_inference');
    expect(profile.confidence).toBeGreaterThan(0.5);
  });

  it('stores and lists classified resources in the registry', () => {
    const registry = new ResourceRegistry();
    const record = registry.applyClassification({
      descriptorId: 'mcp:agent-a',
      providerId: 'mcp',
      modelId: 'agent-a',
      displayName: 'Agent A',
      capabilities: ['research', 'cloud', 'offline']
    }, {
      kind: 'agent',
      source: 'local',
      status: 'current',
      healthScore: 0.92
    });

    expect(record.resourceId).toBe('mcp:agent-a');
    expect(record.capabilities).toContain('research');
    expect(record.capabilities).toContain('cloud');
    expect(record.capabilities).toContain('offline');
    expect(registry.list()).toHaveLength(1);
    expect(registry.get('mcp:agent-a')?.status).toBe('current');
  });

  it('selects the best matching resource through the provider-registry facade', () => {
    const registry = new ProviderRegistry();

    registry.resourceRegistry.upsert({
      resourceId: 'resource:analysis',
      kind: 'agent',
      name: 'Analysis Agent',
      source: 'local',
      capabilities: ['research', 'cloud'],
      status: 'current',
      healthScore: 0.8
    });

    registry.resourceRegistry.recordPerformance({
      resourceId: 'resource:analysis',
      observedAt: new Date(),
      successRate: 0.97,
      failureRate: 0.03,
      cost: 1.5,
      frequencyOfUse: 4
    });

    registry.resourceRegistry.recordHealth({
      resourceId: 'resource:analysis',
      status: 'current',
      healthy: true,
      reason: 'good',
      updatedAt: new Date()
    });

    const winner = registry.selectBestMatchingResource(['research', 'cloud']);
    expect(winner?.resourceId).toBe('resource:analysis');
  });

  it('picks the healthiest matching resource using performance and health signals', () => {
    const registry = new ResourceRegistry();

    registry.upsert({
      resourceId: 'model:alpha',
      kind: 'model',
      name: 'Alpha',
      source: 'local',
      capabilities: ['research', 'cloud'],
      status: 'current',
      healthScore: 0.66,
      metadata: { tier: 'small' }
    });

    registry.upsert({
      resourceId: 'model:beta',
      kind: 'model',
      name: 'Beta',
      source: 'local',
      capabilities: ['research', 'cloud', 'reasoning'],
      status: 'current',
      healthScore: 0.95,
      metadata: { tier: 'large' }
    });

    registry.recordPerformance({
      resourceId: 'model:alpha',
      observedAt: new Date(),
      successRate: 0.72,
      failureRate: 0.28,
      runtimeMs: 520,
      cost: 2,
      frequencyOfUse: 3
    });

    registry.recordPerformance({
      resourceId: 'model:beta',
      observedAt: new Date(),
      successRate: 0.98,
      failureRate: 0.02,
      runtimeMs: 240,
      cost: 3,
      frequencyOfUse: 8
    });

    registry.recordHealth({
      resourceId: 'model:alpha',
      status: 'current',
      healthy: true,
      reason: 'stable',
      updatedAt: new Date()
    });

    registry.recordHealth({
      resourceId: 'model:beta',
      status: 'current',
      healthy: true,
      reason: 'preferred',
      updatedAt: new Date()
    });

    const winner = registry.selectBestMatch(['research', 'cloud']);
    expect(winner?.resourceId).toBe('model:beta');
    expect(registry.getHealth('model:beta')?.healthy).toBe(true);
  });
});
