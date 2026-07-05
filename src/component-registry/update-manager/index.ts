import { randomUUID } from 'node:crypto';
import { compare, sha256 } from '../../shared/index.js';
import { ChangelogTracker } from '../changelog-tracker/index.js';
import { RegistryStore } from '../registry-store/index.js';
import type { ArtifactType, UpdateEvent, UpdateManifest, UpdatePolicy } from '../types.js';
import { VersionResolver } from '../version-resolver/index.js';

export interface UpdateManagerOptions {
  maestroVersion: string;
  devMode?: boolean;
  policies?: Partial<Record<ArtifactType, UpdatePolicy>>;
  verifySignature?: (manifest: UpdateManifest) => boolean;
}

/** Processes incoming update manifests and applies policy-based promotion. */
export class UpdateManager {
  private readonly events: UpdateEvent[] = [];
  private readonly policies: Partial<Record<ArtifactType, UpdatePolicy>>;

  constructor(
    private readonly registryStore: RegistryStore,
    private readonly versionResolver: VersionResolver,
    private readonly changelogTracker: ChangelogTracker,
    private readonly options: UpdateManagerOptions
  ) {
    this.policies = options.policies ?? {};
  }

  private policyFor(type: ArtifactType): UpdatePolicy {
    return this.policies[type] ?? 'supervised';
  }

  /** Returns a copy of update events emitted during processing. */
  getEvents(): UpdateEvent[] {
    return [...this.events];
  }

  private emit(event: Omit<UpdateEvent, 'eventId' | 'timestamp'>): void {
    this.events.push({
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
      ...event
    });
  }

  /** Validates and processes update manifest entries. */
  process(manifest: UpdateManifest): void {
    const calculatedChecksum = sha256(JSON.stringify(manifest.artifacts));
    if (calculatedChecksum !== manifest.checksum) {
      throw new Error('Manifest checksum validation failed');
    }

    if (!this.options.devMode && manifest.signature && this.options.verifySignature && !this.options.verifySignature(manifest)) {
      throw new Error('Manifest signature validation failed');
    }

    if (compare(this.options.maestroVersion, manifest.minMaestroVersion) < 0) {
      throw new Error('Manifest requires newer Maestro version');
    }

    for (const { artifactType, artifact } of manifest.artifacts) {
      const majorBump = this.registryStore
        .getAll(artifact.id, artifactType)
        .some((existing) => existing.version.split('.')[0] !== artifact.version.split('.')[0]);

      this.registryStore.register(artifact, artifactType);

      const policy = this.policyFor(artifactType);
      const forcedSupervised = artifactType === 'adapter-package' || (artifactType === 'schema' && majorBump);

      if (policy === 'auto' && !forcedSupervised) {
        this.registryStore.activate(artifact.id, artifactType, artifact.version, 'auto-update');
        this.versionResolver.invalidate(artifactType, artifact.id);
        this.changelogTracker.record({
          artifactType,
          artifactId: artifact.id,
          toVersion: artifact.version,
          action: 'activated',
          triggeredBy: 'auto-update'
        });
        this.emit({
          action: 'activated',
          artifactType,
          artifactId: artifact.id,
          version: artifact.version
        });
      } else {
        const action = forcedSupervised && artifactType === 'schema' && majorBump ? 'requires-confirmation' : 'held-as-draft';
        this.changelogTracker.record({
          artifactType,
          artifactId: artifact.id,
          toVersion: artifact.version,
          action: 'held-as-draft',
          triggeredBy: 'auto-update'
        });
        this.emit({
          action,
          artifactType,
          artifactId: artifact.id,
          version: artifact.version
        });
      }
    }
  }

  /** Promotes a stored artifact version to active manually. */
  promote(artifactId: string, artifactType: ArtifactType, version?: string): void {
    this.registryStore.activate(artifactId, artifactType, version, 'manual');
    this.versionResolver.invalidate(artifactType, artifactId);

    const active = this.registryStore.getActive(artifactId, artifactType);
    this.changelogTracker.record({
      artifactType,
      artifactId,
      toVersion: active.version,
      action: 'activated',
      triggeredBy: 'manual'
    });
    this.emit({
      action: 'activated',
      artifactType,
      artifactId,
      version: active.version
    });
  }
}
