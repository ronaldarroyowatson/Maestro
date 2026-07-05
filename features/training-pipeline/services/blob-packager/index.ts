import { randomUUID } from 'node:crypto';
import { sha256 } from '../../../../src/shared/index.js';
import type { PackagedBlob, TrainingSample } from '../../models/types.js';

/** Packages training samples into immutable binary blobs. */
export class BlobPackager {
  package(samples: TrainingSample[]): PackagedBlob {
    const serialized = JSON.stringify(
      {
        schema: 'maestro.training.v1',
        createdAt: new Date().toISOString(),
        samples
      },
      null,
      0
    );

    const payload = Buffer.from(serialized, 'utf8');
    return {
      blobId: randomUUID(),
      createdAt: new Date(),
      sampleCount: samples.length,
      checksum: sha256(payload),
      payload
    };
  }
}
