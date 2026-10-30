import type { ResourceNode } from '../../../../src/shared/index.js';

export interface DiscoveryUiLogEntry {
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
}

export interface AiDiscoveryUiControls {
  runFirstScanEnabled: boolean;
  rescanDeviceEnabled: boolean;
  continuousDiscoveryEnabled: boolean;
}

export interface AiDiscoveryResourceItem {
  id: string;
  name: string;
  description: string;
  status: ResourceNode['status'];
  version?: string;
  path?: string;
  metadata: Record<string, unknown>;
  expandableDetails: Record<string, unknown>;
}

export interface AiDiscoveryUiGroup {
  type: string;
  count: number;
  items: AiDiscoveryResourceItem[];
}

export interface AiDiscoveryUiState {
  scanStatus: 'idle' | 'running' | 'complete' | 'failed';
  lastScanTime: Date | null;
  discoveryLogs: DiscoveryUiLogEntry[];
  resourceCounts: Record<string, number>;
  groups: AiDiscoveryUiGroup[];
  controls: AiDiscoveryUiControls;
}

const GROUP_LABELS: Record<string, string> = {
  model: 'Models',
  agent: 'Agents',
  mcp: 'MCP Servers',
  tool: 'Tools',
  endpoint: 'Endpoints',
  other: 'Other'
};

export class AiDiscoveryUiStateBuilder {
  build(input: {
    resources: ResourceNode[];
    scanStatus: AiDiscoveryUiState['scanStatus'];
    lastScanTime?: Date | null;
    continuousDiscoveryEnabled?: boolean;
    logs?: DiscoveryUiLogEntry[];
  }): AiDiscoveryUiState {
    const resources = input.resources ?? [];
    const resourceCounts = this.buildCounts(resources);
    const groups = this.buildGroups(resources);
    const logs = [...(input.logs ?? [])].sort(
      (left, right) => right.timestamp.getTime() - left.timestamp.getTime()
    );

    return {
      scanStatus: input.scanStatus,
      lastScanTime: input.lastScanTime ?? null,
      discoveryLogs: logs,
      resourceCounts,
      groups,
      controls: {
        runFirstScanEnabled: resources.length === 0 && input.scanStatus !== 'running',
        rescanDeviceEnabled: input.scanStatus !== 'running',
        continuousDiscoveryEnabled: Boolean(input.continuousDiscoveryEnabled)
      }
    };
  }

  private buildCounts(resources: ResourceNode[]): Record<string, number> {
    const counts: Record<string, number> = {
      models: 0,
      agents: 0,
      mcpServers: 0,
      tools: 0,
      endpoints: 0,
      other: 0
    };

    for (const resource of resources) {
      switch (resource.type) {
        case 'model':
          counts.models += 1;
          break;
        case 'agent':
          counts.agents += 1;
          break;
        case 'mcp':
          counts.mcpServers += 1;
          break;
        case 'tool':
          counts.tools += 1;
          break;
        case 'endpoint':
          counts.endpoints += 1;
          break;
        default:
          counts.other += 1;
          break;
      }
    }

    return counts;
  }

  private buildGroups(resources: ResourceNode[]): AiDiscoveryUiGroup[] {
    const map = new Map<string, AiDiscoveryResourceItem[]>();
    for (const resource of resources) {
      const key = GROUP_LABELS[resource.type] ?? 'Other';
      const current = map.get(key) ?? [];
      current.push({
        id: resource.id,
        name: resource.name,
        description: String(resource.metadata.description ?? `${resource.type} resource`),
        status: resource.status,
        version: typeof resource.metadata.version === 'string' ? resource.metadata.version : undefined,
        path: resource.path,
        metadata: resource.metadata,
        expandableDetails: {
          discoveredBy: resource.discoveredBy,
          lastSeen: resource.lastSeen.toISOString(),
          tags: resource.tags,
          relationships: resource.relationships
        }
      });
      map.set(key, current);
    }

    return Array.from(map.entries())
      .map(([type, items]) => ({
        type,
        count: items.length,
        items: items.sort((left, right) => left.name.localeCompare(right.name))
      }))
      .sort((left, right) => left.type.localeCompare(right.type));
  }
}

export const DEFAULT_AI_DISCOVERY_UI_STATE_BUILDER = new AiDiscoveryUiStateBuilder();
