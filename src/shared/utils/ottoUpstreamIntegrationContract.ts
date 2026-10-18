import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMaestroOttoModuleDefinition } from './ottoModuleDefinition.js';
import { requiredMaestroCommandNames } from './commandServiceContract.js';

interface OttoUpstreamTarget {
  id: string;
  targetRepo: string;
  targetPath: string;
  sourcePath: string;
  purpose: string;
}

interface MaestroOttoUpstreamHandoffContract {
  schemaVersion: string;
  moduleId: string;
  moduleManifest: string;
  registrationContract: string;
  commandManifest: string;
  uiContract: string;
  upstreams: OttoUpstreamTarget[];
  requiredChecks: string[];
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

export function loadMaestroOttoUpstreamHandoffContract(repoRoot: string): MaestroOttoUpstreamHandoffContract {
  const contractPath = path.join(repoRoot, 'otto', 'modules', 'maestro', 'upstream-handoff.json');
  if (!existsSync(contractPath)) {
    throw new Error(`Maestro Otto upstream handoff contract not found at ${contractPath}`);
  }

  return readJsonFile<MaestroOttoUpstreamHandoffContract>(contractPath);
}

export function validateMaestroOttoUpstreamHandoffContract(repoRoot: string): {
  ok: boolean;
  problems: string[];
} {
  const problems: string[] = [];
  const contractPath = path.join(repoRoot, 'otto', 'modules', 'maestro', 'upstream-handoff.json');
  if (!existsSync(contractPath)) {
    return {
      ok: false,
      problems: [`Missing upstream handoff contract at '${contractPath}'.`]
    };
  }

  const contract = loadMaestroOttoUpstreamHandoffContract(repoRoot);
  const moduleDefinition = loadMaestroOttoModuleDefinition(repoRoot);

  if (contract.moduleId !== moduleDefinition.moduleId || contract.moduleId !== 'maestro') {
    problems.push(`Unexpected moduleId '${contract.moduleId}'. Expected 'maestro'.`);
  }

  if (contract.moduleManifest !== 'otto/modules/maestro/manifest.json') {
    problems.push(`Unexpected moduleManifest '${contract.moduleManifest}'.`);
  }

  if (contract.registrationContract !== moduleDefinition.registrationContract) {
    problems.push(
      `Registration contract mismatch: handoff='${contract.registrationContract}', module='${moduleDefinition.registrationContract}'.`
    );
  }

  if (contract.uiContract !== moduleDefinition.uiContract) {
    problems.push(`UI contract mismatch: handoff='${contract.uiContract}', module='${moduleDefinition.uiContract}'.`);
  }

  const commandManifestPath = path.join(repoRoot, 'otto', 'maestro-commands.json');
  const commandManifest = readJsonFile<{
    commands: Array<{ commandServiceSchema: string }>;
  }>(commandManifestPath);
  const declaredSchemas = new Set(commandManifest.commands.map((command) => command.commandServiceSchema));

  for (const required of requiredMaestroCommandNames) {
    if (!declaredSchemas.has(required)) {
      problems.push(`Command manifest missing required command-service schema '${required}'.`);
    }
  }

  const requiredUpstreamIds = new Set([
    'otto-command-service-module-manifest',
    'otto-command-service-command-manifest',
    'otto-ui-contract-manifest',
    'otto-ui-module-registration'
  ]);
  const upstreamIds = new Set(contract.upstreams.map((upstream) => upstream.id));
  for (const requiredId of requiredUpstreamIds) {
    if (!upstreamIds.has(requiredId)) {
      problems.push(`Missing required upstream mapping '${requiredId}'.`);
    }
  }

  for (const upstream of contract.upstreams) {
    const sourcePath = path.join(repoRoot, ...upstream.sourcePath.split('/'));
    if (!existsSync(sourcePath)) {
      problems.push(`Upstream source path does not exist: '${upstream.sourcePath}'.`);
    }
    if (upstream.targetRepo !== '../otto-command-service' && upstream.targetRepo !== '../otto-ui') {
      problems.push(`Unexpected upstream targetRepo '${upstream.targetRepo}' for '${upstream.id}'.`);
    }
  }

  if (!contract.requiredChecks.includes('command-service-boundary')) {
    problems.push("requiredChecks must include 'command-service-boundary'.");
  }

  return {
    ok: problems.length === 0,
    problems
  };
}

const isMainModule =
  typeof process.argv[1] === 'string' &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  const repoRoot = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../'));
  const result = validateMaestroOttoUpstreamHandoffContract(repoRoot);
  if (!result.ok) {
    console.error(result.problems.join('\n'));
    process.exit(1);
  }
  console.log('Maestro Otto upstream handoff contract is valid');
}
