import { describe, expect, it } from 'vitest';
import type { DetectedResource } from '../../../src/shared/index.js';
import {
  RemoteDiscoveryOrchestrator,
  type RemoteDiscoveryScanContext,
  type RemoteDiscoveryScanner,
  type RemoteDiscoveryTarget
} from '../services/remote-discovery/index.js';

function target(overrides: Partial<RemoteDiscoveryTarget> = {}): RemoteDiscoveryTarget {
  return {
    id: 'target-1',
    name: 'Remote Host',
    kind: 'server',
    address: '10.0.0.10',
    ...overrides
  };
}

function resource(overrides: Partial<DetectedResource> = {}): DetectedResource {
  return {
    id: 'runtime:remote:ollama',
    name: 'Remote Ollama Runtime',
    type: 'runtime',
    status: 'healthy',
    metadata: {},
    discoveredBy: 'remote-test-scanner',
    lastSeen: new Date('2026-01-01T00:00:00Z'),
    ...overrides
  };
}

describe('remote discovery orchestrator', () => {
  it('Remote Scanner Registration Test', () => {
    const orchestrator = new RemoteDiscoveryOrchestrator();
    const scanner: RemoteDiscoveryScanner = {
      id: 'remote-scanner',
      scanTarget: async () => []
    };
    orchestrator.registerScanner(scanner);
    expect(orchestrator.listScanners().map((entry) => entry.id)).toEqual(['remote-scanner']);
  });

  it('Remote Discovery Execution Test', async () => {
    const orchestrator = new RemoteDiscoveryOrchestrator();
    const scanner: RemoteDiscoveryScanner = {
      id: 'remote-scanner',
      scanTarget: async () => [resource()]
    };
    orchestrator.registerScanner(scanner);

    const context: RemoteDiscoveryScanContext = {
      targets: [target()]
    };
    const result = await orchestrator.scanTargets(context);

    expect(result.resources).toHaveLength(1);
    expect(result.failures).toEqual([]);
    expect((result.resources[0].metadata.remoteTarget as { id: string }).id).toBe('target-1');
  });

  it('Duplicate Resource Test', async () => {
    const orchestrator = new RemoteDiscoveryOrchestrator();
    const scanner: RemoteDiscoveryScanner = {
      id: 'remote-scanner',
      scanTarget: async () => [
        resource({ lastSeen: new Date('2026-01-01T00:00:00Z') }),
        resource({ lastSeen: new Date('2026-01-01T00:01:00Z'), metadata: { version: 'latest' } })
      ]
    };
    orchestrator.registerScanner(scanner);
    const result = await orchestrator.scanTargets({ targets: [target()] });

    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].metadata.version).toBe('latest');
  });

  it('Disconnected Service Test', async () => {
    const orchestrator = new RemoteDiscoveryOrchestrator();
    const scanner: RemoteDiscoveryScanner = {
      id: 'remote-scanner',
      scanTarget: async () => {
        throw new Error('Connection refused');
      }
    };
    orchestrator.registerScanner(scanner);
    const result = await orchestrator.scanTargets({ targets: [target()] });

    expect(result.resources).toEqual([]);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].error).toContain('Connection refused');
  });
});
