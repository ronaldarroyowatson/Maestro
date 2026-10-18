import type { ResourceCapabilityTag } from '../../../../src/shared/index.js';
import type { ProviderRegistry } from '../../index.js';

export interface CapabilitySelectionOptions {
  minHealthScore?: number;
  minSuccessRate?: number;
  allowUnhealthy?: boolean;
  maxCost?: number;
  preferredResourceIds?: string[];
}

export interface CapabilitySelectionDecision {
  resourceId?: string;
  score: number;
  reason: string;
  capabilityTags: ResourceCapabilityTag[];
}

export class ResourcePolicyRouter {
  constructor(private readonly registry: ProviderRegistry) {}

  decideForCapabilities(
    capabilities: Array<string | ResourceCapabilityTag>,
    options: CapabilitySelectionOptions = {}
  ): CapabilitySelectionDecision {
    const normalized = this.normalize(capabilities);
    const resource = this.registry.selectBestMatchingResource(normalized, {
      minHealthScore: options.minHealthScore,
      minSuccessRate: options.minSuccessRate,
      allowUnhealthy: options.allowUnhealthy,
      maxCost: options.maxCost
    });

    if (!resource) {
      return {
        score: 0,
        reason: 'No eligible resource met the requested capability and health constraints.',
        capabilityTags: normalized
      };
    }

    const score = this.score(resource.resourceId, normalized, options);
    return {
      resourceId: resource.resourceId,
      score,
      reason: `Selected ${resource.name} because it best matches ${normalized.join(', ') || 'the requested capabilities'}.`,
      capabilityTags: normalized
    };
  }

  private normalize(capabilities: Array<string | ResourceCapabilityTag>): ResourceCapabilityTag[] {
    const tags = new Set<ResourceCapabilityTag>();
    for (const capability of capabilities) {
      const value = String(capability).toLowerCase();
      if (value === 'coding' || value === 'code') tags.add('coding');
      if (value === 'research') tags.add('research');
      if (value === 'vision') tags.add('vision');
      if (value === 'reasoning') tags.add('reasoning');
      if (value === 'multimodal') tags.add('multimodal');
      if (value === 'local') tags.add('local');
      if (value === 'cloud') tags.add('cloud');
      if (value === 'offline') tags.add('offline');
      if (value === 'fast inference' || value === 'fast-inference') tags.add('fast_inference');
      if (value === 'long context' || value === 'long-context') tags.add('long_context');
      if (value === 'large memory' || value === 'large-memory') tags.add('large_memory');
    }

    return Array.from(tags);
  }

  private score(resourceId: string, requested: ResourceCapabilityTag[], options: CapabilitySelectionOptions): number {
    const record = this.registry.resourceRegistry.get(resourceId);
    if (!record) {
      return 0;
    }

    const overlap = requested.reduce((total, tag) => total + (record.capabilities.includes(tag) ? 1 : 0), 0);
    const health = this.registry.resourceRegistry.getHealth(resourceId)?.healthy ?? true;
    const performance = this.registry.resourceRegistry.getPerformance(resourceId);
    const successRate = performance?.successRate ?? record.healthScore;
    const costPenalty = performance?.cost !== undefined && options.maxCost !== undefined ? Math.max(0, performance.cost / options.maxCost) : 0;
    const preferredBoost = options.preferredResourceIds?.includes(resourceId) ? 0.3 : 0;
    const healthBoost = health ? 0.4 : -0.5;

    return Number((overlap * 0.8 + successRate + healthBoost + preferredBoost - costPenalty).toFixed(4));
  }
}
