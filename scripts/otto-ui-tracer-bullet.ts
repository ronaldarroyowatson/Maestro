import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateMaestroOttoUiContract } from '../src/shared/utils/ottoUiContract.js';

interface InstallManifest {
  repositories: Array<{
    id: string;
    url: string;
    ref?: string;
    installSubPath: string;
    requiredFiles: string[];
  }>;
}

function createLocalDevelopmentManifest(repoRoot: string, targetPath: string): InstallManifest {
  const manifestPath = path.join(repoRoot, 'installer', 'windows', 'maestro-install-manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as InstallManifest;
  const updated: InstallManifest = {
    ...manifest,
    repositories: manifest.repositories.map((repo) => {
      if (repo.id !== 'maestro') {
        return repo;
      }
      return {
        ...repo,
        url: repoRoot
      };
    })
  };
  writeFileSync(targetPath, JSON.stringify(updated, null, 2), 'utf8');
  return updated;
}

function runPowerShellScript(repoRoot: string, args: string[]): void {
  const proc = spawnSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(repoRoot, 'installer', 'windows', 'minimal-installer.ps1'), ...args],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: false
    }
  );
  if (proc.status !== 0) {
    throw new Error(`PowerShell installer invocation failed with exit code ${proc.status ?? -1}.`);
  }
}

function assertManifestInstallIntegrity(manifest: InstallManifest, installRoot: string): void {
  for (const repo of manifest.repositories) {
    const repoPath = path.join(installRoot, repo.installSubPath);
    if (!existsSync(repoPath)) {
      throw new Error(`Missing installed repository path for '${repo.id}': ${repoPath}`);
    }
    for (const requiredFile of repo.requiredFiles) {
      const target = path.join(repoPath, requiredFile);
      if (!existsSync(target)) {
        throw new Error(`Missing required file for '${repo.id}': ${target}`);
      }
    }
  }
}

function main(): void {
  if (process.platform !== 'win32') {
    throw new Error('otto-ui-tracer-bullet is currently implemented for Windows-only installer flow.');
  }

  const repoRoot = process.cwd();
  const installRoot = path.join(os.tmpdir(), 'maestro-otto-tracer-bullet');
  const manifestOverridePath = path.join(os.tmpdir(), 'maestro-otto-tracer-manifest.local.json');
  if (existsSync(installRoot)) {
    rmSync(installRoot, { recursive: true, force: true });
  }
  if (existsSync(manifestOverridePath)) {
    rmSync(manifestOverridePath, { force: true });
  }

  const localManifest = createLocalDevelopmentManifest(repoRoot, manifestOverridePath);

  console.log(`[tracer] install root: ${installRoot}`);
  runPowerShellScript(repoRoot, ['-InstallRoot', installRoot, '-ManifestPath', manifestOverridePath, '-Mode', 'Validate']);
  runPowerShellScript(repoRoot, ['-InstallRoot', installRoot, '-ManifestPath', manifestOverridePath, '-Mode', 'Install', '-VerifySignatures']);

  assertManifestInstallIntegrity(localManifest, installRoot);

  const installedMaestroRoot = path.join(installRoot, 'repos', 'maestro');
  const uiContract = validateMaestroOttoUiContract(installedMaestroRoot);
  if (!uiContract.ok) {
    throw new Error(`Otto UI contract validation failed: ${uiContract.problems.join(' | ')}`);
  }
  if (!uiContract.entryPageRoute) {
    throw new Error('Otto UI contract resolved no entry page route.');
  }

  console.log(`[tracer] UI entry page route resolved: ${uiContract.entryPageRoute}`);
  console.log('[tracer] Otto + Maestro tracer bullet validation passed.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
