import type { PackagedBlob, TrainingLoopResult, TrainingSample } from '../../models/types.js';
import { BlobPackager } from '../blob-packager/index.js';
import type { RemoteSync } from '../remote-sync/index.js';
import { TrainingQueue } from '../training-queue/index.js';

/** Runs the package -> queue -> remote upload loop. */
export class TrainingLoop {
  constructor(
    private readonly blobPackager: BlobPackager,
    private readonly trainingQueue: TrainingQueue,
    private readonly remoteSync: RemoteSync
  ) {}

  async run(samples: TrainingSample[], batchSize = 16): Promise<TrainingLoopResult> {
    const blobs = this.toBlobs(samples, batchSize);
    blobs.forEach((blob) => {
      this.trainingQueue.enqueue(blob.blobId, blob.sampleCount);
    });

    let iterations = 0;
    let processedJobs = 0;
    const uploadedBlobIds: string[] = [];

    while (this.trainingQueue.size() > 0) {
      const job = this.trainingQueue.dequeue();
      if (!job) {
        break;
      }
      iterations += 1;
      processedJobs += 1;

      const blob = blobs.find((candidate) => candidate.blobId === job.blobId);
      if (!blob) {
        continue;
      }

      await this.remoteSync.upload(blob);
      uploadedBlobIds.push(blob.blobId);
    }

    return {
      iterations,
      processedJobs,
      uploadedBlobIds
    };
  }

  private toBlobs(samples: TrainingSample[], batchSize: number): PackagedBlob[] {
    if (samples.length === 0) {
      return [];
    }

    const chunks: TrainingSample[][] = [];
    for (let i = 0; i < samples.length; i += batchSize) {
      chunks.push(samples.slice(i, i + batchSize));
    }

    return chunks.map((chunk) => this.blobPackager.package(chunk));
  }
}
