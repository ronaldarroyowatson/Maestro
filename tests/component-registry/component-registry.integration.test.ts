import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { ComponentRegistry } from '../../src/component-registry/index.js';
import type { VersionedArtifact } from '../../src/shared/index.js';

function artifact(id: string, version: string, rollbackToId?: string): VersionedArtifact {
  const now = new Date();
  return {
    id,
    version,
    contentHash: randomUUID().replaceAll('-', ''),
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    changelog: `version ${version}`,
    rollbackToId
  };
}

describe('component-registry integration', () => {
  const dbPath = `./tests/component-registry/tmp-${Date.now()}.db`;
  const registry = new ComponentRegistry(dbPath, { maestroVersion: '1.0.0', devMode: true });

  afterEach(() => {
    registry.registryStore.database.close();
  });

  it('register -> activate -> resolve -> rollback workflow', () => {
    const v1 = artifact('prompt-a', '1.0.0');
    const v2 = artifact('prompt-a', '1.1.0', 'prompt-a@1.0.0');

    registry.register('prompt-template', v1, true);
    registry.register('prompt-template', v2, true);

    const activeBefore = registry.versionResolver.resolve<VersionedArtifact>('prompt-template', 'prompt-a');
    expect(activeBefore.version).toBe('1.1.0');

    const rolledBack = registry.rollbackManager.rollback<VersionedArtifact>('prompt-a', 'prompt-template');
    expect(rolledBack.version).toBe('1.0.0');

    const activeAfter = registry.versionResolver.resolve<VersionedArtifact>('prompt-template', 'prompt-a');
    expect(activeAfter.version).toBe('1.0.0');

    const changelog = registry.changelogTracker.queryByArtifact('prompt-a');
    expect(changelog.some((entry) => entry.action === 'rollback')).toBe(true);
  });
});
