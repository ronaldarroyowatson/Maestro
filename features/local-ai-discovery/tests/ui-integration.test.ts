import { describe, expect, it } from 'vitest';

import type { ResourceNode } from '../../../src/shared/index.js';
import { AiDiscoveryUiStateBuilder } from '../services/ui-integration/index.js';

function node(id: string, type: ResourceNode['type'], name: string): ResourceNode {
  return {
    id,
    name,
    type,
    status: 'healthy',
    tags: [type],
    metadata: { version: '1.0.0', description: `${name} description` },
    relationships: [],
    discoveredBy: 'test-scanner',
    createdAt: new Date('2026-10-29T00:00:00.000Z'),
    lastSeen: new Date('2026-10-29T00:00:00.000Z'),
    path: `C:\\resources\\${name}`
  };
}

describe('AI discovery UI integration', () => {
  it('Discovery Dashboard Snapshot Test', () => {
    const builder = new AiDiscoveryUiStateBuilder();
    const result = builder.build({
      resources: [
        node('runtime:ollama', 'runtime', 'Ollama Runtime'),
        node('model:tinyllama', 'model', 'tinyllama:latest'),
        node('endpoint:ollama', 'endpoint', 'Ollama Endpoint')
      ],
      scanStatus: 'complete',
      lastScanTime: new Date('2026-10-29T01:00:00.000Z'),
      continuousDiscoveryEnabled: true,
      logs: [
        { level: 'info', message: 'Scan completed', timestamp: new Date('2026-10-29T01:00:01.000Z') }
      ]
    });

    expect(result.resourceCounts.models).toBe(1);
    expect(result.resourceCounts.endpoints).toBe(1);
    expect(result.controls.rescanDeviceEnabled).toBe(true);
    expect(result.groups.some((group) => group.type === 'Models')).toBe(true);
  });

  it('Empty Resource List Test', () => {
    const builder = new AiDiscoveryUiStateBuilder();
    const result = builder.build({
      resources: [],
      scanStatus: 'idle',
      continuousDiscoveryEnabled: false
    });

    expect(result.controls.runFirstScanEnabled).toBe(true);
    expect(result.groups).toEqual([]);
    expect(result.resourceCounts.models).toBe(0);
  });

  it('Missing Configuration Test', () => {
    const builder = new AiDiscoveryUiStateBuilder();
    const result = builder.build({
      resources: [node('model:tinyllama', 'model', 'tinyllama:latest')],
      scanStatus: 'failed'
    });

    expect(result.controls.continuousDiscoveryEnabled).toBe(false);
    expect(result.lastScanTime).toBeNull();
  });

  it('Rapid Repeated Scanning Test', () => {
    const builder = new AiDiscoveryUiStateBuilder();
    const result = builder.build({
      resources: [node('model:tinyllama', 'model', 'tinyllama:latest')],
      scanStatus: 'running',
      logs: [
        { level: 'info', message: 'scan-1', timestamp: new Date('2026-10-29T01:00:00.000Z') },
        { level: 'info', message: 'scan-2', timestamp: new Date('2026-10-29T01:00:01.000Z') }
      ]
    });

    expect(result.controls.rescanDeviceEnabled).toBe(false);
    expect(result.discoveryLogs[0]?.message).toBe('scan-2');
  });

  it('Unexpected Resource Type Test', () => {
    const builder = new AiDiscoveryUiStateBuilder();
    const result = builder.build({
      resources: [node('service:unknown', 'service', 'Unknown Service')],
      scanStatus: 'complete'
    });

    expect(result.resourceCounts.other).toBe(1);
    expect(result.groups.some((group) => group.type === 'Other')).toBe(true);
  });
});
