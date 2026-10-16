import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadMaestroOttoUiContract } from './ottoUiContract.js';

interface MaestroModuleRegistration {
  moduleId: string;
  entryRoute: string;
  uiContract: string;
  panels: string[];
  observability: {
    logsPath: string;
    tracesPath: string;
    telemetryPath: string;
    diagnosticsPath: string;
  };
}

export function validateMaestroModuleRegistration(repoRoot: string): {
  ok: boolean;
  problems: string[];
} {
  const problems: string[] = [];
  const registrationPath = path.join(repoRoot, 'otto', 'manifests', 'maestro-module-registration.json');
  const registration = JSON.parse(readFileSync(registrationPath, 'utf8')) as MaestroModuleRegistration;
  const uiContract = loadMaestroOttoUiContract(repoRoot);

  if (registration.moduleId !== 'maestro') {
    problems.push(`Invalid moduleId '${registration.moduleId}'. Expected 'maestro'.`);
  }

  if (registration.uiContract !== 'otto/manifests/maestro-ui-contract.json') {
    problems.push(`Unexpected uiContract reference '${registration.uiContract}'.`);
  }

  if (registration.entryRoute !== '/maestro/install-status') {
    problems.push(`Unexpected entryRoute '${registration.entryRoute}'.`);
  }

  const contractPanels = new Set(uiContract.pages.map((page) => page.panel));
  for (const panel of registration.panels) {
    if (!contractPanels.has(panel)) {
      problems.push(`Registration panel '${panel}' not declared in UI contract pages.`);
    }
  }

  if (!registration.observability.diagnosticsPath.includes('/diagnostics/')) {
    problems.push('Registration observability diagnosticsPath must include /diagnostics/.');
  }

  return {
    ok: problems.length === 0,
    problems
  };
}
