import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

interface IterationFailureReport {
  iteration: number;
  failedAt: string;
  command: string;
  output: string;
}

function runCommand(command: string): { ok: true; output: string } | { ok: false; output: string } {
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, output };
  } catch (error) {
    const details = error as { stdout?: string; stderr?: string };
    return {
      ok: false,
      output: `${details.stdout ?? ''}\n${details.stderr ?? ''}`.trim()
    };
  }
}

async function waitForFixes(iteration: number): Promise<void> {
  const rl = createInterface({ input, output });
  try {
    await rl.question(`Iteration ${iteration} failed. Apply fixes, then press Enter to re-run tests.`);
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const maxIterations = Number(process.env.MAESTRO_MAX_ITERATIONS ?? '10');
  const command = process.env.MAESTRO_TEST_COMMAND ?? 'pnpm test';

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    console.log(`Running iteration ${iteration}/${maxIterations}: ${command}`);
    const result = runCommand(command);

    if (result.ok) {
      console.log('All tests passed green.');
      process.exit(0);
    }

    const report: IterationFailureReport = {
      iteration,
      failedAt: new Date().toISOString(),
      command,
      output: result.output
    };

    writeFileSync('scripts/.maestro-test-failures.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.error('MAIN_AGENT_FAILURE_REPORT scripts/.maestro-test-failures.json');
    console.error(result.output);

    if (iteration === maxIterations) {
      console.error('Reached maximum iterations with failing tests.');
      process.exit(1);
    }

    await waitForFixes(iteration);
  }
}

void main();
