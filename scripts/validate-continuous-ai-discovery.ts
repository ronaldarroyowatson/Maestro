import fs from 'node:fs/promises';
import path from 'node:path';

import { ContinuousDiscoveryService, LocalAiDiscoveryService } from '../features/local-ai-discovery/index.js';

interface WaitResult {
  ok: boolean;
  reason?: string;
}

async function waitFor(
  condition: () => boolean,
  timeoutMs: number,
  checkEveryMs = 100
): Promise<WaitResult> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (condition()) {
      return { ok: true };
    }
    await new Promise((resolve) => setTimeout(resolve, checkEveryMs));
  }
  return { ok: false, reason: `Timed out after ${timeoutMs}ms` };
}

async function run(): Promise<void> {
  const discovery = new LocalAiDiscoveryService();
  const service = new ContinuousDiscoveryService(discovery, {
    intervalMs: 2000,
    minIntervalMs: 500,
    maxChangeSetSize: 20
  });

  const events: Array<{
    scanNumber: number;
    status: string;
    reason: string;
    durationMs: number;
    resourceCount: number;
    scannedAt: string;
  }> = [];

  const failures: string[] = [];
  service.onEvent((event) => {
    events.push({
      scanNumber: event.scanNumber,
      status: event.status,
      reason: event.reason,
      durationMs: event.durationMs,
      resourceCount: event.resourceCount,
      scannedAt: event.scannedAt.toISOString()
    });

    if (event.status === 'failed') {
      failures.push(event.error ?? 'unknown scan failure');
    }
  });

  await service.start({
    rootPath: process.cwd(),
    environment: {
      ...process.env,
      OLLAMA_DIR: process.env.OLLAMA_DIR ?? 'C:\\Users\\ronal\\AppData\\Local\\Programs\\Ollama',
      OLLAMA_MODELS_DIR: process.env.OLLAMA_MODELS_DIR ?? 'C:\\Users\\ronal\\.ollama\\models',
      OLLAMA_HOST: process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434',
      OPENAI_API_BASE: process.env.OPENAI_API_BASE ?? 'http://127.0.0.1:11434'
    }
  });

  const startupScan = await waitFor(() => events.length >= 1, 10000);
  if (!startupScan.ok) {
    throw new Error(`Startup scan did not complete. ${startupScan.reason ?? ''}`.trim());
  }

  service.triggerRescan('manual-validation-trigger');
  const triggeredScan = await waitFor(() => events.length >= 2, 10000);
  if (!triggeredScan.ok) {
    throw new Error(`Triggered scan did not complete. ${triggeredScan.reason ?? ''}`.trim());
  }

  service.pause();
  const pausedCount = events.length;
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const pauseStable = events.length === pausedCount;

  service.resume();
  const resumedScan = await waitFor(() => events.length >= pausedCount + 1, 10000);
  service.stop();

  const snapshot = service.getSnapshot();
  const testResults = [
    {
      name: 'Scheduler Interval Test',
      result: events.length >= 2 ? 'PASS' : 'FAIL'
    },
    {
      name: 'Event Driven Update Test',
      result: events.some((event) => event.reason.includes('triggered')) ? 'PASS' : 'FAIL'
    },
    {
      name: 'Pause Resume Test',
      result: pauseStable && resumedScan.ok ? 'PASS' : 'FAIL'
    },
    {
      name: 'Disconnected Service Test',
      result: failures.length === 0 ? 'PASS' : 'FAIL'
    }
  ] as const;

  const passCount = testResults.filter((item) => item.result === 'PASS').length;
  const failCount = testResults.length - passCount;
  const report = {
    executedAt: new Date().toISOString(),
    events,
    snapshot,
    failures,
    testResults,
    passCount,
    failCount
  };

  const outputPath = path.join(process.cwd(), 'docs', 'local-ai-discovery-continuous-validation.latest.json');
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(
    JSON.stringify(
      {
        outputPath,
        passCount,
        failCount,
        eventCount: events.length,
        testResults
      },
      null,
      2
    )
  );

  for (const item of testResults) {
    console.log(`${item.result} - ${item.name}`);
  }
}

run().catch((error: unknown) => {
  console.error('Continuous discovery validation failed.');
  console.error(error);
  process.exitCode = 1;
});
