import { describe, expect, it } from 'vitest';
import { ProviderRegistry } from '../index.js';
import { ResourcePolicyRouter } from '../services/resource-selector/index.js';

describe('resource selector policy router', () => {
  it('chooses the best matching healthy resource for a capability request', () => {
    const registry = new ProviderRegistry();
    registry.resourceRegistry.upsert({
      resourceId: 'agent:research-a',
      kind: 'agent',
      name: 'Research A',
      source: 'local',
      capabilities: ['research', 'cloud'],
      status: 'current',
      healthScore: 0.8
    });
    registry.resourceRegistry.upsert({
      resourceId: 'agent:research-b',
      kind: 'agent',
      name: 'Research B',
      source: 'local',
      capabilities: ['research', 'reasoning'],
      status: 'current',
      healthScore: 0.7
    });

    registry.resourceRegistry.recordPerformance({
      resourceId: 'agent:research-a',
      observedAt: new Date(),
      successRate: 0.96,
      failureRate: 0.04,
      cost: 2,
      frequencyOfUse: 10
    });
    registry.resourceRegistry.recordPerformance({
      resourceId: 'agent:research-b',
      observedAt: new Date(),
      successRate: 0.82,
      failureRate: 0.18,
      cost: 1,
      frequencyOfUse: 2
    });

    registry.resourceRegistry.recordHealth({
      resourceId: 'agent:research-a',
      status: 'current',
      healthy: true,
      reason: 'ready',
      updatedAt: new Date()
    });
    registry.resourceRegistry.recordHealth({
      resourceId: 'agent:research-b',
      status: 'current',
      healthy: true,
      reason: 'ready',
      updatedAt: new Date()
    });

    const router = new ResourcePolicyRouter(registry);
    const decision = router.decideForCapabilities(['research', 'cloud'], { maxCost: 5 });

    expect(decision.resourceId).toBe('agent:research-a');
    expect(decision.score).toBeGreaterThan(0);
    expect(decision.reason).toContain('Research A');
  });

  it('returns a no-match decision when the constraints are impossible', () => {
    const registry = new ProviderRegistry();
    registry.resourceRegistry.upsert({
      resourceId: 'agent:weak',
      kind: 'tool',
      name: 'Weak',
      source: 'local',
      capabilities: ['coding'],
      status: 'current',
      healthScore: 0.2
    });

    const router = new ResourcePolicyRouter(registry);
    const decision = router.decideForCapabilities(['research'], { minHealthScore: 0.9 });

    expect(decision.resourceId).toBeUndefined();
    expect(decision.reason).toContain('No eligible resource');
  });
});
