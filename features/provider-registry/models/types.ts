import type { AgentDescriptor, ProviderAdapter, VersionedArtifact } from '../../../src/shared/index.js';
import type { ProviderHealth } from '../../../src/shared/index.js';

/** Discrete artifact types managed by component registry. */
export type ArtifactType =
  | 'prompt-template'
  | 'context-config'
  | 'vocabulary-registry'
  | 'schema'
  | 'rule-set'
  | 'adapter-package'
  | 'pipeline-config';

/** Provider registration options shared across adapters. */
export interface ProviderRegistryOptions {
  discoveryTtlMs?: number;
}

/** Adapter registration item for bootstrapping provider-registry. */
export interface AdapterRegistration {
  providerId: string;
  adapter: ProviderAdapter;
}

/** Optional metadata carried with inference requests for adapter routing. */
export interface InferenceRequestMetadata {
  providerId?: string;
  modelId?: string;
  imageMimeType?: string;
}

/** Update policy applied to artifact updates by type. */
export type UpdatePolicy = 'auto' | 'supervised';

/** Versioned pipeline config artifact. */
export interface PipelineConfig extends VersionedArtifact {
  pipelineId: string;
}

/** Discovery cache representation for adapters. */
export interface DiscoveryCache {
  catalog: { entries: AgentDescriptor[]; lastDiscoveredAt: Date };
  expiresAt: number;
}

/** Provider health entry normalized for deterministic snapshots. */
export interface ProviderHealthEntry {
  providerId: string;
  displayName: string;
  health: ProviderHealth;
}

/** Aggregated provider health summary counts. */
export interface ProviderHealthSummary {
  total: number;
  healthy: number;
  degraded: number;
  unreachable: number;
}

/** Deterministic provider health snapshot for orchestration routing decisions. */
export interface ProviderHealthSnapshot {
  generatedAt: Date;
  entries: ProviderHealthEntry[];
  summary: ProviderHealthSummary;
  preferredProviderId?: string;
}

/** Optional policy constraints for preferred-provider selection. */
export interface ProviderSelectionPolicy {
  allowedStatuses?: Array<'healthy' | 'degraded'>;
  maxLatencyMs?: number;
  providerPriority?: string[];
  selectionStrategy?: 'latency-first' | 'weighted';
  providerCostByProviderId?: Record<string, number>;
  maxCost?: number;
  latencyWeight?: number;
  costWeight?: number;
  degradedPenalty?: number;
  unknownCostPenalty?: number;
  allowLastKnownHealthySnapshot?: boolean;
  lastKnownSnapshotMaxAgeMs?: number;
}
