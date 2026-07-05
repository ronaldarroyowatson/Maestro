import type { VersionedArtifact } from '../../shared/index.js';
import { RegistryStore } from '../registry-store/index.js';
import type { ArtifactType } from '../types.js';

/** Resolves active artifact versions through a lazy-loaded in-memory cache. */
export class VersionResolver {
  private readonly cache = new Map<string, VersionedArtifact>();

  constructor(private readonly registryStore: RegistryStore) {}

  private key(artifactType: ArtifactType, artifactId: string): string {
    return `${artifactType}:${artifactId}`;
  }

  /** Resolves and caches the active version for the requested artifact. */
  resolve<T extends VersionedArtifact>(artifactType: ArtifactType, artifactId: string): T {
    const cacheKey = this.key(artifactType, artifactId);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached as T;
    }

    const resolved = this.registryStore.getActive<T>(artifactId, artifactType);
    this.cache.set(cacheKey, resolved);
    return resolved;
  }

  /** Lists all stored versions for an artifact. */
  listAll<T extends VersionedArtifact>(artifactType: ArtifactType, artifactId: string): T[] {
    return this.registryStore.getAll<T>(artifactId, artifactType);
  }

  /** Invalidates one cached artifact after activation. */
  invalidate(artifactType: ArtifactType, artifactId: string): void {
    this.cache.delete(this.key(artifactType, artifactId));
  }
}
