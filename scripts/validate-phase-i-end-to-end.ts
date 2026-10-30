import fs from 'node:fs/promises';
import path from 'node:path';
import {
  LocalAiDiscoveryService
} from '../features/local-ai-discovery/index.js';
import { WorkflowRuntimeService } from '../features/workflow-runtime/index.js';
import {
  MaestroOttoIntegrationService
} from '../features/node-graph/services/maestro-otto-integration/index.js';
import { runPhaseIEndToEndValidation } from '../features/node-graph/services/end-to-end-validation/index.js';

async function run(): Promise<void> {
  const discovery = new LocalAiDiscoveryService();
  const runtime = new WorkflowRuntimeService();
  const integration = new MaestroOttoIntegrationService(runtime);

  const report = await runPhaseIEndToEndValidation({
    discovery,
    integration,
    runtime,
    context: {
      rootPath: process.cwd(),
      environment: {
        ...process.env,
        OLLAMA_HOST: process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434',
        OPENAI_API_BASE: process.env.OPENAI_API_BASE ?? 'http://127.0.0.1:11434'
      }
    }
  });

  const outputPath = path.join(process.cwd(), 'docs', 'phase-i-end-to-end-validation.latest.json');
  await fs.writeFile(
    outputPath,
    JSON.stringify(
      {
        executedAt: new Date().toISOString(),
        report
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(
    JSON.stringify(
      {
        outputPath,
        assertionCount: report.assertions.length,
        passCount: report.assertions.filter((assertion) => assertion.result === 'PASS').length,
        failCount: report.assertions.filter((assertion) => assertion.result === 'FAIL').length,
        executionTrace: report.executionTrace.states
      },
      null,
      2
    )
  );

  for (const assertion of report.assertions) {
    const suffix = assertion.details ? ` (${assertion.details})` : '';
    console.log(`${assertion.result} - ${assertion.name}${suffix}`);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
