import { ChangelogTracker } from './changelog-tracker/index.js';
import { RegistryStore } from './registry-store/index.js';
import { RollbackManager } from './rollback-manager/index.js';
import type { ArtifactType } from './types.js';
import { UpdateManager, type UpdateManagerOptions } from './update-manager/index.js';
import { VersionResolver } from './version-resolver/index.js';

export type {
  ArtifactType,
  ChangelogEntry,
  PipelineConfig,
  RegistryEntry,
  UpdateEvent,
  UpdateManifest,
  UpdatePolicy
} from './types.js';

/** Facade composing all component-registry modules. */
export class ComponentRegistry {
  readonly registryStore: RegistryStore;
  readonly versionResolver: VersionResolver;
  readonly changelogTracker: ChangelogTracker;
  readonly rollbackManager: RollbackManager;
  readonly updateManager: UpdateManager;

  constructor(dbPath = ':memory:', updateOptions: UpdateManagerOptions = { maestroVersion: '1.0.0', devMode: true }) {
    this.registryStore = new RegistryStore(dbPath);
    this.versionResolver = new VersionResolver(this.registryStore);
    this.changelogTracker = new ChangelogTracker(this.registryStore.database);
    this.rollbackManager = new RollbackManager(this.registryStore, this.versionResolver, this.changelogTracker);
    this.updateManager = new UpdateManager(this.registryStore, this.versionResolver, this.changelogTracker, updateOptions);
  }

  /** Registers and optionally activates an artifact in one call. */
  register(artifactType: ArtifactType, artifact: Parameters<RegistryStore['register']>[0], activate = false): void {
    this.registryStore.register(artifact, artifactType);
    this.changelogTracker.record({
      artifactType,
      artifactId: artifact.id,
      toVersion: artifact.version,
      action: activate ? 'activated' : 'registered',
      triggeredBy: 'install'
    });

    if (activate) {
      this.registryStore.activate(artifact.id, artifactType, artifact.version, 'install');
      this.versionResolver.invalidate(artifactType, artifact.id);
    }
  }
}
