import type { ExperimentResult } from '../eval-suite/index.js';
import type { DistributionRecord, TrainingLoopResult, TrainingSample } from './models/types.js';
import { BlobPackager } from './services/blob-packager/index.js';
import { ModelDistributor } from './services/model-distributor/index.js';
import { InMemoryRemoteSync } from './services/remote-sync/index.js';
import { ResultCollector } from './services/result-collector/index.js';
import { TrainingLoop } from './services/training-loop/index.js';
import { TrainingQueue } from './services/training-queue/index.js';

export type { DistributionRecord, PackagedBlob, TrainingJob, TrainingLoopResult, TrainingSample } from './models/types.js';

/** Training pipeline facade for collecting eval outcomes and syncing training blobs. */
export class TrainingPipeline {
  readonly resultCollector: ResultCollector;
  readonly trainingQueue: TrainingQueue;
  readonly blobPackager: BlobPackager;
  readonly remoteSync: InMemoryRemoteSync;
  readonly trainingLoop: TrainingLoop;
  readonly modelDistributor: ModelDistributor;

  constructor() {
    this.resultCollector = new ResultCollector();
    this.trainingQueue = new TrainingQueue();
    this.blobPackager = new BlobPackager();
    this.remoteSync = new InMemoryRemoteSync();
    this.trainingLoop = new TrainingLoop(this.blobPackager, this.trainingQueue, this.remoteSync);
    this.modelDistributor = new ModelDistributor(this.remoteSync);
  }

  collect(experiment: ExperimentResult, minConfidence = 0.9): TrainingSample[] {
    return this.resultCollector.collect(experiment, undefined, minConfidence);
  }

  async run(samples: TrainingSample[], batchSize = 16): Promise<TrainingLoopResult> {
    return this.trainingLoop.run(samples, batchSize);
  }

  async distribute(modelTarget: string): Promise<DistributionRecord> {
    return this.modelDistributor.distribute(modelTarget);
  }
}
