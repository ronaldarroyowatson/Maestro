import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export interface MaestroOttoModuleDefinition {
  schemaVersion: string;
  moduleId: string;
  displayName: string;
  version: string;
  runtime: string;
  entryPoint: string;
  entryRoute: string;
  uiContract: string;
  registrationContract: string;
  commandServiceLayer: string;
  ownsCommandSurface: boolean;
  dependencies: string[];
  capabilities: string[];
  bootstrap: {
    type: 'manifest';
    requiredFiles: string[];
    registersWith: string;
  };
}

export function loadMaestroOttoModuleDefinition(repoRoot: string): MaestroOttoModuleDefinition {
  const manifestPath = path.join(repoRoot, 'otto', 'modules', 'maestro', 'manifest.json');

  if (!existsSync(manifestPath)) {
    throw new Error(`Maestro Otto module manifest not found at ${manifestPath}`);
  }

  return JSON.parse(readFileSync(manifestPath, 'utf8')) as MaestroOttoModuleDefinition;
}

export function validateMaestroOttoModuleDefinition(repoRoot: string): {
  ok: boolean;
  problems: string[];
} {
  const problems: string[] = [];
  const manifestPath = path.join(repoRoot, 'otto', 'modules', 'maestro', 'manifest.json');

  if (!existsSync(manifestPath)) {
    problems.push(`Missing Otto Maestro module manifest at '${manifestPath}'.`);
    return { ok: false, problems };
  }

  const definition = loadMaestroOttoModuleDefinition(repoRoot);

  if (definition.moduleId !== 'maestro') {
    problems.push(`Invalid moduleId '${definition.moduleId}'. Expected 'maestro'.`);
  }

  if (definition.runtime !== 'maestro') {
    problems.push(`Unexpected runtime '${definition.runtime}'. Expected 'maestro'.`);
  }

  if (definition.entryRoute !== '/maestro/install-status') {
    problems.push(`Unexpected entryRoute '${definition.entryRoute}'.`);
  }

  if (definition.commandServiceLayer !== 'otto-command-service') {
    problems.push(`Unexpected commandServiceLayer '${definition.commandServiceLayer}'. Expected 'otto-command-service'.`);
  }

  if (definition.uiContract !== 'otto/manifests/maestro-ui-contract.json') {
    problems.push(`Unexpected uiContract reference '${definition.uiContract}'.`);
  }

  if (definition.registrationContract !== 'otto/manifests/maestro-module-registration.json') {
    problems.push(`Unexpected registrationContract reference '${definition.registrationContract}'.`);
  }

  if (!definition.dependencies.includes('otto-command-service')) {
    problems.push('Module definition must depend on the Otto command-service layer.');
  }

  if (!definition.bootstrap.requiredFiles.includes('otto/manifests/maestro-ui-contract.json')) {
    problems.push('Module bootstrap manifest should include the Otto UI contract file.');
  }

  if (!definition.bootstrap.requiredFiles.includes('otto/manifests/maestro-module-registration.json')) {
    problems.push('Module bootstrap manifest should include the Otto module registration file.');
  }

  return {
    ok: problems.length === 0,
    problems
  };
}
