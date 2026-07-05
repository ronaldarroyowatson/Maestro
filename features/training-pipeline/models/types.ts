export interface TrainingSample {
  sampleId: string;
  sourceCaseId: string;
  inputText: string;
  targetText: string;
  confidence: number;
}

export interface PackagedBlob {
  blobId: string;
  createdAt: Date;
  sampleCount: number;
  checksum: string;
  payload: Buffer;
}

export interface TrainingJob {
  jobId: string;
  blobId: string;
  sampleCount: number;
  queuedAt: Date;
}

export interface TrainingLoopResult {
  iterations: number;
  processedJobs: number;
  uploadedBlobIds: string[];
}

export interface DistributionRecord {
  distributionId: string;
  blobId: string;
  modelTarget: string;
  distributedAt: Date;
}

export interface CaseTextResolverResult {
  inputText: string;
  targetText: string;
}
