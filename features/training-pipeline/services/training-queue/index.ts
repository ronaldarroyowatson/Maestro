import { randomUUID } from 'node:crypto';
import type { TrainingJob } from '../../models/types.js';

/** In-memory FIFO queue for training jobs. */
export class TrainingQueue {
  private readonly jobs: TrainingJob[] = [];

  enqueue(blobId: string, sampleCount: number): TrainingJob {
    const job: TrainingJob = {
      jobId: randomUUID(),
      blobId,
      sampleCount,
      queuedAt: new Date()
    };
    this.jobs.push(job);
    return job;
  }

  dequeue(): TrainingJob | undefined {
    return this.jobs.shift();
  }

  size(): number {
    return this.jobs.length;
  }
}
