import type { VersionedArtifact } from '../../shared/index.js';
import { ChangelogTracker } from '../changelog-tracker/index.js';
import { RegistryStore } from '../registry-store/index.js';
import { VersionResolver } from '../version-resolver/index.js';
import type { ArtifactType } from '../types.js';

/** Executes atomic rollback based on rollbackToId from active artifact. */
export class RollbackManager {
  constructor(
    private readonly registryStore: RegistryStore,
    private readonly versionResolver: VersionResolver,
    private readonly changelogTracker: ChangelogTracker
  ) {}

  /** Rolls back active artifact to rollback target in a single transaction. */
  rollback<T extends VersionedArtifact>(artifactId: string, artifactType: ArtifactType): T {
    const db = this.registryStore.database;
    const trx = db.transaction(() => {
      const active = this.registryStore.getActive<T>(artifactId, artifactType);
      if (!active.rollbackToId) {
        throw new Error(`No rollbackToId set for ${artifactType}:${artifactId}`);
      }

      const target = this.registryStore
        .getAll<T>(artifactId, artifactType)
        .find((artifact) => artifact.id === active.rollbackToId || `${artifact.id}@${artifact.version}` === active.rollbackToId);

      if (!target) {
        throw new Error(`Rollback target ${active.rollbackToId} not found for ${artifactType}:${artifactId}`);
      }

      this.registryStore.activate(artifactId, artifactType, target.version, 'rollback');
      this.versionResolver.invalidate(artifactType, artifactId);
      this.changelogTracker.record({
        artifactType,
        artifactId,
        fromVersion: active.version,
        toVersion: target.version,
        action: 'rollback',
        triggeredBy: 'rollback'
      });

      return this.registryStore.getActive<T>(artifactId, artifactType);
    });

    return trx();
  }
}
