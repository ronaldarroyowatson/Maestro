import type { DetectedResource, LocalAiDiscoveryResourceType } from '../../../../src/shared/index.js';

export interface RemoteDiscoveryTarget {
  id: string;
  name: string;
  kind: 'server' | 'container' | 'device' | 'cluster' | 'cloud';
  address: string;
  metadata?: Record<string, unknown>;
}

export interface RemoteDiscoveryScanContext {
  targets: RemoteDiscoveryTarget[];
  timeoutMs?: number;
  environment?: Record<string, string | undefined>;
}

export interface RemoteDiscoveryScanner {
  readonly id: string;
  scanTarget(target: RemoteDiscoveryTarget, context: RemoteDiscoveryScanContext): Promise<DetectedResource[]>;
}

export interface RemoteDiscoveryScanFailure {
  scannerId: string;
  targetId: string;
  error: string;
}

export interface RemoteDiscoveryScanResult {
  resources: DetectedResource[];
  failures: RemoteDiscoveryScanFailure[];
  scannedAt: Date;
}

const ALLOWED_TYPES = new Set<LocalAiDiscoveryResourceType>([
  'device',
  'runtime',
  'model',
  'agent',
  'tool',
  'endpoint',
  'workflow',
  'container',
  'service',
  'repository',
  'dataset',
  'vector-db',
  'gpu',
  'other',
  'mcp',
  'ollama',
  'lmstudio'
]);

export class RemoteDiscoveryOrchestrator {
  private readonly scanners = new Map<string, RemoteDiscoveryScanner>();

  registerScanner(scanner: RemoteDiscoveryScanner): void {
    this.scanners.set(scanner.id, scanner);
  }

  listScanners(): RemoteDiscoveryScanner[] {
    return Array.from(this.scanners.values());
  }

  async scanTargets(context: RemoteDiscoveryScanContext): Promise<RemoteDiscoveryScanResult> {
    const resources: DetectedResource[] = [];
    const failures: RemoteDiscoveryScanFailure[] = [];

    for (const scanner of this.scanners.values()) {
      for (const target of context.targets) {
        try {
          const discovered = await scanner.scanTarget(target, context);
          for (const resource of discovered) {
            if (!ALLOWED_TYPES.has(resource.type)) {
              failures.push({
                scannerId: scanner.id,
                targetId: target.id,
                error: `Unsupported resource type '${resource.type}' from resource '${resource.id}'.`
              });
              continue;
            }

            resources.push({
              ...resource,
              metadata: {
                ...resource.metadata,
                remoteTarget: {
                  id: target.id,
                  name: target.name,
                  kind: target.kind,
                  address: target.address
                }
              }
            });
          }
        } catch (error) {
          failures.push({
            scannerId: scanner.id,
            targetId: target.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    return {
      resources: this.dedupeResources(resources),
      failures,
      scannedAt: new Date()
    };
  }

  private dedupeResources(resources: DetectedResource[]): DetectedResource[] {
    const byId = new Map<string, DetectedResource>();
    for (const resource of resources) {
      const current = byId.get(resource.id);
      if (!current) {
        byId.set(resource.id, resource);
        continue;
      }

      if (resource.lastSeen.getTime() >= current.lastSeen.getTime()) {
        byId.set(resource.id, {
          ...resource,
          metadata: {
            ...current.metadata,
            ...resource.metadata
          }
        });
      }
    }

    return Array.from(byId.values()).sort((left, right) => left.id.localeCompare(right.id));
  }
}
