import { execSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

type UnitSource = 'features' | 'src';

interface UnitInfo {
  name: string;
  source: UnitSource;
  path: string;
}

interface ScanResult {
  scannedAt: string;
  rewriteStart: string;
  units: UnitInfo[];
  modifiedUnits: UnitInfo[];
  signals: {
    gitDiff: string[];
    uncommitted: string[];
    commitHistory: string[];
    timestamp: string[];
  };
}

function safeExec(command: string): string {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function listUnitDirectories(root: string, source: UnitSource): UnitInfo[] {
  if (!existsSync(root)) {
    return [];
  }

  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      source,
      path: join(root, entry.name)
    }));
}

function toPaths(output: string): string[] {
  if (!output) {
    return [];
  }

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function collectSignalPaths(rewriteStart: Date): { gitDiff: string[]; uncommitted: string[]; commitHistory: string[]; timestamp: string[] } {
  const mergeBase = safeExec('git merge-base HEAD origin/main');
  const gitDiff = toPaths(safeExec(mergeBase ? `git diff --name-only ${mergeBase}..HEAD` : 'git diff --name-only HEAD~1..HEAD'));
  const uncommitted = toPaths(safeExec('git status --porcelain'))
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
  const commitHistory = toPaths(safeExec('git log --since="2026-01-01" --name-only --pretty=format: -n 200'));

  const timestamp: string[] = [];
  for (const base of ['features', 'src']) {
    if (!existsSync(base)) {
      continue;
    }

    const stack: string[] = [base];
    while (stack.length > 0) {
      const current = stack.pop() as string;
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        const nextPath = join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(nextPath);
          continue;
        }

        if (!entry.isFile() || !entry.name.endsWith('.ts')) {
          continue;
        }

        const mtime = statSync(nextPath).mtime;
        if (mtime >= rewriteStart) {
          timestamp.push(nextPath);
        }
      }
    }
  }

  return { gitDiff, uncommitted, commitHistory, timestamp };
}

function unitOwnsPath(unit: UnitInfo, path: string): boolean {
  const normalized = path.replaceAll('\\\\', '/');
  const relativeUnitPath = relative(process.cwd(), unit.path).replaceAll('\\\\', '/');
  return normalized.startsWith(relativeUnitPath + '/') || normalized === relativeUnitPath;
}

function triggerTestingAgent(unit: UnitInfo): void {
  console.log(`TRIGGER Maestro Testing Agent -> ${unit.name} (${unit.source})`);
}

function main(): void {
  const rewriteStartIso = process.env.MAESTRO_REWRITE_START ?? '2026-01-01T00:00:00.000Z';
  const rewriteStart = new Date(rewriteStartIso);

  const units = [
    ...listUnitDirectories(join(process.cwd(), 'features'), 'features'),
    ...listUnitDirectories(join(process.cwd(), 'src'), 'src')
  ];

  const signals = collectSignalPaths(rewriteStart);
  const allSignalPaths = new Set<string>([
    ...signals.gitDiff,
    ...signals.uncommitted,
    ...signals.commitHistory,
    ...signals.timestamp
  ]);

  const modifiedUnits = units.filter((unit) => {
    for (const signalPath of allSignalPaths) {
      if (unitOwnsPath(unit, signalPath)) {
        return true;
      }
    }
    return false;
  });

  const result: ScanResult = {
    scannedAt: new Date().toISOString(),
    rewriteStart: rewriteStart.toISOString(),
    units,
    modifiedUnits,
    signals
  };

  console.log(JSON.stringify(result, null, 2));
  console.log('');

  for (const unit of modifiedUnits) {
    triggerTestingAgent(unit);
  }
}

main();
