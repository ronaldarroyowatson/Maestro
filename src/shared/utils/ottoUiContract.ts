import { readFileSync } from 'node:fs';
import path from 'node:path';

interface MaestroPanels {
  entries: Array<{
    id: string;
    panel: string;
    label: string;
  }>;
}

interface MaestroUiSettings {
  defaults: {
    startView: string;
  };
  availableViews: string[];
}

interface MaestroNodeGraphs {
  graphs: Array<{
    id: string;
  }>;
}

export interface MaestroOttoUiContractPage {
  id: string;
  label: string;
  route: string;
  panel: string;
}

export interface MaestroOttoUiContract {
  schemaVersion: string;
  contractId: string;
  version: string;
  runtime: string;
  entryPageId: string;
  source: {
    navigation: string;
    nodeGraphs: string;
    settings: string;
  };
  pages: MaestroOttoUiContractPage[];
}

export interface OttoUiContractValidationResult {
  ok: boolean;
  entryPageRoute: string | null;
  problems: string[];
}

export function loadMaestroOttoUiContract(repoRoot: string): MaestroOttoUiContract {
  const contractPath = path.join(repoRoot, 'otto', 'manifests', 'maestro-ui-contract.json');
  return JSON.parse(readFileSync(contractPath, 'utf8')) as MaestroOttoUiContract;
}

export function validateMaestroOttoUiContract(repoRoot: string): OttoUiContractValidationResult {
  const problems: string[] = [];
  const contract = loadMaestroOttoUiContract(repoRoot);

  if (contract.runtime !== 'maestro') {
    problems.push(`Invalid runtime '${contract.runtime}'. Expected 'maestro'.`);
  }

  const panelsPath = path.join(repoRoot, contract.source.navigation);
  const nodeGraphsPath = path.join(repoRoot, contract.source.nodeGraphs);
  const settingsPath = path.join(repoRoot, contract.source.settings);

  const panels = JSON.parse(readFileSync(panelsPath, 'utf8')) as MaestroPanels;
  const nodeGraphs = JSON.parse(readFileSync(nodeGraphsPath, 'utf8')) as MaestroNodeGraphs;
  const settings = JSON.parse(readFileSync(settingsPath, 'utf8')) as MaestroUiSettings;

  const entryPage = contract.pages.find((page) => page.id === contract.entryPageId);
  if (!entryPage) {
    problems.push(`Missing entry page '${contract.entryPageId}' in contract pages.`);
  }

  const panelSet = new Set(panels.entries.map((entry) => entry.panel));
  for (const page of contract.pages) {
    if (!panelSet.has(page.panel)) {
      problems.push(`Contract page '${page.id}' references unknown panel '${page.panel}'.`);
    }
    if (!page.route.startsWith('/maestro/')) {
      problems.push(`Contract page '${page.id}' route must start with '/maestro/'.`);
    }
  }

  const hasNodeGraphPage = contract.pages.some((page) => page.id === 'maestro.node-graph');
  if (!hasNodeGraphPage) {
    problems.push("Missing required page 'maestro.node-graph'.");
  }

  if (nodeGraphs.graphs.length === 0) {
    problems.push('Node graph definitions are empty.');
  }

  if (!settings.availableViews.includes(settings.defaults.startView)) {
    problems.push(
      `UI settings default start view '${settings.defaults.startView}' is not declared in availableViews.`
    );
  }

  return {
    ok: problems.length === 0,
    entryPageRoute: entryPage ? entryPage.route : null,
    problems
  };
}
