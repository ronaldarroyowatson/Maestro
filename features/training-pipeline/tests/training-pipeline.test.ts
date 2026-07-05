import { describe, expect, it } from 'vitest';
import { EvalSuite } from '../../eval-suite/index.js';
import { TrainingPipeline } from '../index.js';

describe('training-pipeline feature', () => {
  it('collects low-confidence samples from eval results', () => {
    const evalSuite = new EvalSuite(0.95);
    const result = evalSuite.runAndLog([
      { caseId: 'c1', groundTruth: 'alpha beta', predictedText: 'alpha beta' },
      { caseId: 'c2', groundTruth: 'alpha beta', predictedText: 'alpha' }
    ]);

    const trainingPipeline = new TrainingPipeline();
    const samples = trainingPipeline.collect(result, 0.95);

    expect(samples.length).toBeGreaterThan(0);
    expect(samples.every((sample) => sample.confidence < 0.95)).toBe(true);
  });

  it('runs training loop and uploads packaged blobs', async () => {
    const trainingPipeline = new TrainingPipeline();
    const samples = [
      { sampleId: 's1', sourceCaseId: 'c1', inputText: 'in1', targetText: 'out1', confidence: 0.3 },
      { sampleId: 's2', sourceCaseId: 'c2', inputText: 'in2', targetText: 'out2', confidence: 0.4 }
    ];

    const loopResult = await trainingPipeline.run(samples, 1);
    const blobIds = await trainingPipeline.remoteSync.listBlobIds();

    expect(loopResult.processedJobs).toBe(2);
    expect(blobIds.length).toBe(2);
  });

  it('distributes the latest uploaded blob', async () => {
    const trainingPipeline = new TrainingPipeline();
    await trainingPipeline.run([
      { sampleId: 's1', sourceCaseId: 'c1', inputText: 'in1', targetText: 'out1', confidence: 0.2 }
    ]);

    const distribution = await trainingPipeline.distribute('ocr-main-model');
    expect(distribution.modelTarget).toBe('ocr-main-model');
    expect(distribution.blobId.length).toBeGreaterThan(0);
  });
});
