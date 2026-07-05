/** Lifecycle status for a versioned artifact. */
export type ArtifactStatus = 'draft' | 'active' | 'deprecated' | 'archived';

/** Common base type for all versioned Maestro artifacts. */
export interface VersionedArtifact {
  id: string;
  version: string;
  contentHash: string;
  status: ArtifactStatus;
  createdAt: Date;
  updatedAt: Date;
  changelog: string;
  rollbackToId?: string;
  tags?: string[];
}
