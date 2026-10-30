export interface MaestroFeature {
  id: string;
  label: string;
  route: string;
  panel: string;
  category: 'install' | 'workflow' | 'runtime' | 'registry' | 'diagnostics' | 'discovery';
  status: 'stable' | 'preview' | 'legacy';
  description?: string;
}

export const MAESTRO_FEATURE_CATALOG: MaestroFeature[] = [
  {
    id: 'maestro.install-status',
    label: 'Install Status',
    route: '/maestro/install-status',
    panel: 'install-status',
    category: 'install',
    status: 'stable',
    description: 'Tracks install state and Otto bootstrap health.'
  },
  {
    id: 'maestro.runtime-status',
    label: 'Runtime Status',
    route: '/maestro/runtime-status',
    panel: 'runtime-status',
    category: 'runtime',
    status: 'legacy',
    description: 'Compatibility view retained for existing Otto runtime status checks.'
  },
  {
    id: 'maestro.workflow-builder',
    label: 'Workflow Builder',
    route: '/maestro/workflow-builder',
    panel: 'workflow-builder',
    category: 'workflow',
    status: 'preview',
    description: 'Entry point for graph authoring and orchestration design.'
  },
  {
    id: 'maestro.runtime-monitor',
    label: 'Runtime Monitor',
    route: '/maestro/runtime-monitor',
    panel: 'runtime-monitor',
    category: 'runtime',
    status: 'preview',
    description: 'Operational health and execution-state monitoring for live workflows.'
  },
  {
    id: 'maestro.registry-browser',
    label: 'Registry Browser',
    route: '/maestro/registry-browser',
    panel: 'registry-browser',
    category: 'registry',
    status: 'preview',
    description: 'Explores discovered resources, versions, health, and capability metadata.'
  },
  {
    id: 'maestro.ai-discovery',
    label: 'AI Discovery',
    route: '/maestro/ai-discovery',
    panel: 'ai-discovery',
    category: 'discovery',
    status: 'preview',
    description: 'Runs discovery scans, monitors scan status, and groups discovered resources by type.'
  },
  {
    id: 'maestro.node-graph',
    label: 'Node Graph',
    route: '/maestro/node-graph',
    panel: 'node-graph',
    category: 'workflow',
    status: 'preview',
    description: 'Visualizes and validates graph structure, typed node ports, and runtime execution state.'
  },
  {
    id: 'maestro.execution-timeline',
    label: 'Execution Timeline',
    route: '/maestro/execution-timeline',
    panel: 'execution-timeline',
    category: 'runtime',
    status: 'preview',
    description: 'Tracks event order and execution continuity across workflow runs.'
  },
  {
    id: 'maestro.diagnostics',
    label: 'Diagnostics',
    route: '/maestro/diagnostics',
    panel: 'diagnostics',
    category: 'diagnostics',
    status: 'preview',
    description: 'Root-cause diagnostics for runtime, provider, and governance failures.'
  },
  {
    id: 'maestro.logs',
    label: 'Logs',
    route: '/maestro/logs',
    panel: 'logs',
    category: 'diagnostics',
    status: 'stable',
    description: 'Streaming log view for install, runtime, and debugging events.'
  },
  {
    id: 'maestro.telemetry',
    label: 'Telemetry',
    route: '/maestro/telemetry',
    panel: 'telemetry',
    category: 'diagnostics',
    status: 'stable',
    description: 'Operational telemetry and metrics for health and performance analysis.'
  }
];

export function getMaestroFeatureCatalog(): MaestroFeature[] {
  return MAESTRO_FEATURE_CATALOG.map((feature) => ({ ...feature }));
}

export function getMaestroEntryFeature(): MaestroFeature {
  return getMaestroFeatureCatalog().find((feature) => feature.id === 'maestro.install-status') ?? MAESTRO_FEATURE_CATALOG[0];
}
