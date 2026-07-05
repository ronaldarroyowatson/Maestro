import { randomUUID } from 'node:crypto';
import type { DistributionRecord } from '../../models/types.js';
import type { RemoteSync } from '../remote-sync/index.js';

/** Selects uploaded training blob and records model distribution action. */
export class ModelDistributor {
  constructor(private readonly remoteSync: RemoteSync) {}

  async distribute(modelTarget: string): Promise<DistributionRecord> {
    const blobIds = await this.remoteSync.listBlobIds();
    if (blobIds.length === 0) {
      throw new Error('No uploaded training blobs available for distribution');
    }

    const blobId = blobIds[blobIds.length - 1];
    return {
      distributionId: randomUUID(),
      blobId,
      modelTarget,
      distributedAt: new Date()
    };
  }
}
