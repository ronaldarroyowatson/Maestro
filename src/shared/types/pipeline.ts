import type { Graph } from './nodes.js';
import type { VersionedArtifact } from './versioning.js';

/** User-facing metadata for a pipeline. */
export interface PipelineMetadata {
  name: string;
  description: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** Executable pipeline artifact. */
export interface Pipeline extends VersionedArtifact {
  graph: Graph;
  metadata: PipelineMetadata;
}

/** Embedded component payloads included in a snapshot. */
export interface SnapshotComponents {
  promptTemplates: VersionedArtifact[];
  contextConfigs: VersionedArtifact[];
  vocabularyRegistries: VersionedArtifact[];
  schemas: VersionedArtifact[];
  ruleSets: VersionedArtifact[];
}

/** Immutable execution snapshot of a pipeline and all dependencies. */
export interface PipelineSnapshot {
  snapshotId: string;
  contentHash: string;
  pipeline: Pipeline;
  components: SnapshotComponents;
  maestroVersion: string;
  createdAt: Date;
}
