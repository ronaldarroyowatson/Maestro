import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { loadMaestroOttoUpstreamHandoffContract } from '../src/shared/utils/ottoUpstreamIntegrationContract.js';

const UPSTREAM_REPO_MAP: Record<string, string> = {
  '../otto-command-service': 'otto-systems/otto-command-service',
  '../otto-ui': 'otto-systems/otto-ui'
};

interface GitHubContentResponse {
  content: string;
  encoding: 'base64' | string;
}

function normalize(content: string): string {
  return content.replace(/\r\n/g, '\n');
}

function readSource(repoRoot: string, slashPath: string): string {
  const filePath = path.join(repoRoot, ...slashPath.split('/'));
  return readFileSync(filePath, 'utf8');
}

function fetchRemoteContent(repo: string, targetPath: string, ref: string): string {
  const apiPath = `repos/${repo}/contents/${targetPath}?ref=${ref}`;
  const proc = spawnSync('gh', ['api', apiPath], {
    encoding: 'utf8',
    shell: false
  });
  if (proc.status !== 0) {
    throw new Error(`gh api failed for '${apiPath}': ${proc.stderr || proc.stdout}`);
  }

  const payload = JSON.parse(proc.stdout) as GitHubContentResponse;
  if (payload.encoding !== 'base64') {
    throw new Error(`Unexpected encoding '${payload.encoding}' for '${repo}/${targetPath}'.`);
  }

  return Buffer.from(payload.content, 'base64').toString('utf8');
}

function main(): void {
  const repoRoot = process.cwd();
  const ref = process.env.OTTO_UPSTREAM_REF ?? 'main';
  const contract = loadMaestroOttoUpstreamHandoffContract(repoRoot);
  const failures: string[] = [];

  for (const mapping of contract.upstreams) {
    const remoteRepo = UPSTREAM_REPO_MAP[mapping.targetRepo];
    if (!remoteRepo) {
      failures.push(`No remote repository mapping configured for targetRepo '${mapping.targetRepo}'.`);
      continue;
    }

    const source = normalize(readSource(repoRoot, mapping.sourcePath));
    const remote = normalize(fetchRemoteContent(remoteRepo, mapping.targetPath, ref));
    if (source !== remote) {
      failures.push(`Mismatch for '${mapping.id}' at '${remoteRepo}/${mapping.targetPath}' (ref=${ref}).`);
      continue;
    }

    console.log(`[ok] ${mapping.id} -> ${remoteRepo}/${mapping.targetPath} (ref=${ref})`);
  }

  if (failures.length > 0) {
    throw new Error(`Live upstream verification failed:\n${failures.join('\n')}`);
  }

  console.log('Live upstream verification passed.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
