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
    enableOttoNodeEngine?: boolean;
  };
  availableViews: string[];
}

interface MaestroNodeGraphs {
  canvas: {
    pan: boolean;
    zoom: boolean;
    grid: boolean;
    minimap: boolean;
    theme: 'dark' | 'light' | 'system';
    nodeSelection: boolean;
  };
  nodeTypes: Array<{
    id: string;
    ports: Array<{ id: string; direction: 'in' | 'out'; dataType: string; required: boolean }>;
  }>;
  graphs: Array<{
    id: string;
    nodes: Array<{ id: string; type: string }>;
    edges: Array<{ id: string; from: string; to: string; fromPort: string; toPort: string }>;
  }>;
}

interface MaestroFeatureCatalog {
  features: Array<{
    id: string;
    label: string;
    route: string;
    panel: string;
    category: string;
    status: string;
  }>;
}

interface MaestroAiDiscoveryPanelSpec {
  panel: string;
  actions: Array<{ id: string; label: string; type: string }>;
  statusFields: string[];
  logField: string;
  groups: string[];
  resourceItemFields: string[];
}

interface MaestroNodeGraphPanelSpec {
  panel: string;
  actions: Array<{ id: string; label: string; type: string }>;
  canvasFeatures: string[];
  statusFields: string[];
  nodeFields: string[];
  edgeFields: string[];
}

interface MaestroNodeInspectorPanelSpec {
  panel: string;
  sourcePanel: string;
  statusFields: string[];
  propertyFields: string[];
  connectionFields: string[];
  actions: Array<{ id: string; label: string; type: string }>;
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
    featureCatalog: string;
    discoveryPanelSpec: string;
    nodeGraphPanelSpec: string;
    nodeInspectorPanelSpec: string;
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
  const featureCatalogPath = path.join(repoRoot, contract.source.featureCatalog);
  const discoveryPanelSpecPath = path.join(repoRoot, contract.source.discoveryPanelSpec);
  const nodeGraphPanelSpecPath = path.join(repoRoot, contract.source.nodeGraphPanelSpec);
  const nodeInspectorPanelSpecPath = path.join(repoRoot, contract.source.nodeInspectorPanelSpec);

  const panels = JSON.parse(readFileSync(panelsPath, 'utf8')) as MaestroPanels;
  const nodeGraphs = JSON.parse(readFileSync(nodeGraphsPath, 'utf8')) as MaestroNodeGraphs;
  const settings = JSON.parse(readFileSync(settingsPath, 'utf8')) as MaestroUiSettings;
  const featureCatalog = JSON.parse(readFileSync(featureCatalogPath, 'utf8')) as MaestroFeatureCatalog;
  const discoveryPanelSpec = JSON.parse(readFileSync(discoveryPanelSpecPath, 'utf8')) as MaestroAiDiscoveryPanelSpec;
  const nodeGraphPanelSpec = JSON.parse(readFileSync(nodeGraphPanelSpecPath, 'utf8')) as MaestroNodeGraphPanelSpec;
  const nodeInspectorPanelSpec = JSON.parse(readFileSync(nodeInspectorPanelSpecPath, 'utf8')) as MaestroNodeInspectorPanelSpec;

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

  const hasAiDiscoveryPage = contract.pages.some((page) => page.id === 'maestro.ai-discovery');
  if (!hasAiDiscoveryPage) {
    problems.push("Missing required page 'maestro.ai-discovery'.");
  }

  const featureIds = new Set(featureCatalog.features.map((feature) => feature.id));
  for (const page of contract.pages) {
    if (!featureIds.has(page.id)) {
      problems.push(`Feature catalog is missing UI page '${page.id}'.`);
    }
  }

  if (nodeGraphs.graphs.length === 0) {
    problems.push('Node graph definitions are empty.');
  }
  if (!nodeGraphs.canvas.pan || !nodeGraphs.canvas.zoom || !nodeGraphs.canvas.grid || !nodeGraphs.canvas.minimap) {
    problems.push('Node graph canvas must enable pan, zoom, grid, and minimap.');
  }
  if (!['dark', 'light', 'system'].includes(nodeGraphs.canvas.theme)) {
    problems.push(`Node graph theme '${nodeGraphs.canvas.theme}' is invalid.`);
  }
  if (!nodeGraphs.canvas.nodeSelection) {
    problems.push('Node graph canvas must support nodeSelection.');
  }
  if (nodeGraphs.nodeTypes.length === 0) {
    problems.push('Node graph node types are empty.');
  }

  if (!settings.availableViews.includes(settings.defaults.startView)) {
    problems.push(
      `UI settings default start view '${settings.defaults.startView}' is not declared in availableViews.`
    );
  }
  if (typeof settings.defaults.enableOttoNodeEngine !== 'boolean') {
    problems.push("UI settings defaults must include boolean 'enableOttoNodeEngine'.");
  }

  const requiredActions = new Set(['run-first-scan', 'rescan-device', 'continuous-discovery-toggle']);
  const declaredActions = new Set(discoveryPanelSpec.actions.map((action) => action.id));
  for (const requiredAction of requiredActions) {
    if (!declaredActions.has(requiredAction)) {
      problems.push(`AI discovery panel spec missing required action '${requiredAction}'.`);
    }
  }

  const requiredStatusFields = new Set(['scanStatus', 'resourceCounts', 'lastScanTime']);
  for (const requiredField of requiredStatusFields) {
    if (!discoveryPanelSpec.statusFields.includes(requiredField)) {
      problems.push(`AI discovery panel spec missing status field '${requiredField}'.`);
    }
  }

  if (discoveryPanelSpec.logField !== 'discoveryLogs') {
    problems.push("AI discovery panel spec must expose 'discoveryLogs' as logField.");
  }

  const requiredGraphActions = new Set(['add-node', 'connect-nodes', 'disconnect-nodes', 'validate-graph']);
  const declaredGraphActions = new Set(nodeGraphPanelSpec.actions.map((action) => action.id));
  for (const requiredAction of requiredGraphActions) {
    if (!declaredGraphActions.has(requiredAction)) {
      problems.push(`Node graph panel spec missing required action '${requiredAction}'.`);
    }
  }

  const requiredCanvasFeatures = new Set(['pan', 'zoom', 'grid', 'minimap', 'theme', 'nodeSelection']);
  for (const feature of requiredCanvasFeatures) {
    if (!nodeGraphPanelSpec.canvasFeatures.includes(feature)) {
      problems.push(`Node graph panel spec missing canvas feature '${feature}'.`);
    }
  }

  const requiredNodeFields = new Set(['id', 'type', 'label', 'status', 'group', 'ports', 'position']);
  for (const field of requiredNodeFields) {
    if (!nodeGraphPanelSpec.nodeFields.includes(field)) {
      problems.push(`Node graph panel spec missing node field '${field}'.`);
    }
  }

  const requiredEdgeFields = new Set(['id', 'fromNodeId', 'toNodeId', 'fromPort', 'toPort', 'status']);
  for (const field of requiredEdgeFields) {
    if (!nodeGraphPanelSpec.edgeFields.includes(field)) {
      problems.push(`Node graph panel spec missing edge field '${field}'.`);
    }
  }

  if (nodeInspectorPanelSpec.panel !== 'node-inspector') {
    problems.push(`Node inspector panel id '${nodeInspectorPanelSpec.panel}' is invalid.`);
  }
  if (nodeInspectorPanelSpec.sourcePanel !== 'node-graph') {
    problems.push(`Node inspector source panel '${nodeInspectorPanelSpec.sourcePanel}' must be 'node-graph'.`);
  }

  const requiredInspectorStatusFields = new Set([
    'selectedNodeId',
    'nodeName',
    'nodeType',
    'nodeStatus',
    'validationState'
  ]);
  for (const field of requiredInspectorStatusFields) {
    if (!nodeInspectorPanelSpec.statusFields.includes(field)) {
      problems.push(`Node inspector panel spec missing status field '${field}'.`);
    }
  }

  const requiredInspectorPropertyFields = new Set(['key', 'value', 'source', 'editable']);
  for (const field of requiredInspectorPropertyFields) {
    if (!nodeInspectorPanelSpec.propertyFields.includes(field)) {
      problems.push(`Node inspector panel spec missing property field '${field}'.`);
    }
  }

  const requiredInspectorConnectionFields = new Set(['incoming', 'outgoing']);
  for (const field of requiredInspectorConnectionFields) {
    if (!nodeInspectorPanelSpec.connectionFields.includes(field)) {
      problems.push(`Node inspector panel spec missing connection field '${field}'.`);
    }
  }

  const requiredInspectorActions = new Set([
    'apply-node-property-update',
    'reset-node-property-update',
    'validate-node-properties'
  ]);
  const declaredInspectorActions = new Set(nodeInspectorPanelSpec.actions.map((action) => action.id));
  for (const action of requiredInspectorActions) {
    if (!declaredInspectorActions.has(action)) {
      problems.push(`Node inspector panel spec missing required action '${action}'.`);
    }
  }

  return {
    ok: problems.length === 0,
    entryPageRoute: entryPage ? entryPage.route : null,
    problems
  };
}
