import type { VersionedArtifact } from '../shared/index.js';

/** Supported artifact buckets persisted by the component registry. */
export type ArtifactType =
  | 'prompt-template'
  | 'context-config'
  | 'vocabulary-registry'
  | 'schema'
  | 'rule-set'
  | 'adapter-package'
  | 'pipeline-config';

/** Stored registry row projection. */
export interface RegistryEntry {
  artifactId: string;
  version: string;
  contentHash: string;
  artifactType: ArtifactType;
  status: 'draft' | 'active' | 'deprecated' | 'archived';
  serializedArtifact: string;
  registeredAt: string;
  activatedAt?: string;
  activatedBy?: string;
  updatedAt: string;
}

/** Manifest artifact payload used by update processing. */
export interface ManifestArtifact {
  artifactType: ArtifactType;
  artifact: VersionedArtifact;
}

/** Update bundle from otto kernel update channel. */
export interface UpdateManifest {
  manifestId: string;
  checksum: string;
  signature?: string;
  minMaestroVersion: string;
  artifacts: ManifestArtifact[];
}

/** Update processing policy by artifact type. */
export type UpdatePolicy = 'auto' | 'supervised';

/** Update event emitted by update-manager. */
export interface UpdateEvent {
  eventId: string;
  action: 'activated' | 'held-as-draft' | 'requires-confirmation' | 'rejected';
  artifactType: ArtifactType;
  artifactId: string;
  version: string;
  reason?: string;
  timestamp: string;
}

/** Changelog event persisted for artifact transitions. */
export interface ChangelogEntry {
  transitionId: string;
  artifactType: ArtifactType;
  artifactId: string;
  fromVersion?: string;
  toVersion: string;
  action: 'registered' | 'activated' | 'held-as-draft' | 'rejected' | 'rollback';
  triggeredBy: 'auto-update' | 'manual' | 'rollback' | 'install';
  timestamp: string;
  reason?: string;
}

/** Versioned pipeline config artifact. */
export interface PipelineConfig extends VersionedArtifact {
  pipelineId: string;
}
