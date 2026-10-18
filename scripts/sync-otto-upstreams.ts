import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  loadMaestroOttoUpstreamHandoffContract,
  validateMaestroOttoUpstreamHandoffContract
} from '../src/shared/utils/ottoUpstreamIntegrationContract.js';

interface SyncResult {
  id: string;
  sourcePath: string;
  targetPath: string;
  targetRepo: string;
  status: 'synced' | 'unchanged' | 'drift';
}

function resolveRepoPath(repoRoot: string, relativePath: string): string {
  return path.resolve(repoRoot, relativePath);
}

function resolveManifestPath(repoRoot: string, slashPath: string): string {
  return path.join(repoRoot, ...slashPath.split('/'));
}

function normalizeContent(content: string): string {
  return content.replace(/\r\n/g, '\n');
}

function main(): void {
  const repoRoot = process.cwd();
  const applyMode = process.argv.includes('--apply');
  const validation = validateMaestroOttoUpstreamHandoffContract(repoRoot);
  if (!validation.ok) {
    throw new Error(`Upstream handoff contract is invalid:\n${validation.problems.join('\n')}`);
  }

  const contract = loadMaestroOttoUpstreamHandoffContract(repoRoot);
  const results: SyncResult[] = [];
  let driftCount = 0;

  for (const mapping of contract.upstreams) {
    const sourcePath = resolveManifestPath(repoRoot, mapping.sourcePath);
    if (!existsSync(sourcePath)) {
      throw new Error(`Source file not found for mapping '${mapping.id}': ${mapping.sourcePath}`);
    }

    const targetRepoPath = resolveRepoPath(repoRoot, mapping.targetRepo);
    if (!existsSync(targetRepoPath)) {
      throw new Error(`Target repository path not found for mapping '${mapping.id}': ${targetRepoPath}`);
    }

    const targetPath = path.join(targetRepoPath, ...mapping.targetPath.split('/'));
    const sourceContent = readFileSync(sourcePath, 'utf8');
    const sourceNormalized = normalizeContent(sourceContent);
    const targetExists = existsSync(targetPath);
    const targetContent = targetExists ? readFileSync(targetPath, 'utf8') : '';
    const targetNormalized = normalizeContent(targetContent);

    if (targetExists && targetNormalized === sourceNormalized) {
      results.push({
        id: mapping.id,
        sourcePath,
        targetPath,
        targetRepo: targetRepoPath,
        status: 'unchanged'
      });
      continue;
    }

    if (!applyMode) {
      driftCount += 1;
      results.push({
        id: mapping.id,
        sourcePath,
        targetPath,
        targetRepo: targetRepoPath,
        status: 'drift'
      });
      continue;
    }

    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, sourceContent, 'utf8');
    results.push({
      id: mapping.id,
      sourcePath,
      targetPath,
      targetRepo: targetRepoPath,
      status: targetExists ? 'synced' : 'synced'
    });
  }

  for (const result of results) {
    console.log(
      `[${result.status}] ${result.id}\n  source: ${result.sourcePath}\n  target: ${result.targetPath}\n  repo:   ${result.targetRepo}`
    );
  }

  if (!applyMode && driftCount > 0) {
    throw new Error(`Detected ${driftCount} upstream mapping drift item(s). Re-run with --apply to sync.`);
  }

  if (!applyMode) {
    console.log('No upstream drift detected.');
    return;
  }

  console.log('Upstream sync completed.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
