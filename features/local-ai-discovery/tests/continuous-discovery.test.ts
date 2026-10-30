import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DetectedResource, DiscoveryScanResult, LocalAiDiscoveryService } from '../index.js';
import { ContinuousDiscoveryService } from '../services/continuous-discovery/index.js';

function buildResource(id: string): DetectedResource {
  return {
    id,
    name: id,
    type: 'model',
    status: 'detected',
    metadata: { id },
    discoveredBy: 'test-scanner',
    lastSeen: new Date('2026-10-30T00:00:00.000Z'),
    path: `C:\\models\\${id}.gguf`
  };
}

function buildResult(ids: string[]): DiscoveryScanResult {
  const resources = ids.map((id) => buildResource(id));
  return {
    resources,
    graph: {
      graphId: `graph-${ids.join('-')}`,
      nodes: [],
      edges: [],
      scannedAt: new Date()
    },
    scannedAt: new Date()
  };
}

describe('continuous discovery service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Scheduler Interval Test', async () => {
    const scanAll = vi.fn().mockResolvedValue(buildResult(['model-1']));
    const discovery = { scanAll } as unknown as LocalAiDiscoveryService;
    const service = new ContinuousDiscoveryService(discovery, { intervalMs: 1000, minIntervalMs: 100 });

    await service.start();
    await vi.advanceTimersByTimeAsync(2200);
    service.stop();

    expect(scanAll).toHaveBeenCalledTimes(3);
  });

  it('Pause Resume Test', async () => {
    const scanAll = vi.fn().mockResolvedValue(buildResult(['model-1']));
    const discovery = { scanAll } as unknown as LocalAiDiscoveryService;
    const service = new ContinuousDiscoveryService(discovery, { intervalMs: 1000, minIntervalMs: 100 });

    await service.start();
    service.pause();
    await vi.advanceTimersByTimeAsync(3000);
    const callsDuringPause = scanAll.mock.calls.length;

    service.resume();
    await vi.advanceTimersByTimeAsync(1200);
    service.stop();

    expect(callsDuringPause).toBe(1);
    expect(scanAll).toHaveBeenCalledTimes(2);
  });

  it('Event Driven Update Test', async () => {
    const scanAll = vi.fn().mockResolvedValue(buildResult(['model-1']));
    const discovery = { scanAll } as unknown as LocalAiDiscoveryService;
    const service = new ContinuousDiscoveryService(discovery, { intervalMs: 60000, minIntervalMs: 500 });

    await service.start();
    service.triggerRescan('filesystem-change');
    await vi.advanceTimersByTimeAsync(700);
    service.stop();

    expect(scanAll).toHaveBeenCalledTimes(2);
  });

  it('Resource Throttling Test', async () => {
    const scanAll = vi
      .fn()
        .mockResolvedValueOnce(buildResult([]))
        .mockResolvedValueOnce(buildResult(['a', 'b', 'c', 'd']));
    const discovery = { scanAll } as unknown as LocalAiDiscoveryService;
    const service = new ContinuousDiscoveryService(discovery, {
      intervalMs: 1000,
      minIntervalMs: 100,
      maxChangeSetSize: 2
    });
    const events: string[] = [];

    service.onEvent((event) => {
      if (event.changeSet.throttled) {
        events.push('throttled');
      }
    });

    await service.start();
    await vi.advanceTimersByTimeAsync(1200);
    service.stop();

    expect(events).toEqual(['throttled']);
  });

  it('Disconnected Service Test', async () => {
    const scanAll = vi
      .fn()
        .mockRejectedValueOnce(new Error('service disconnected'))
        .mockResolvedValueOnce(buildResult(['model-1']));
    const discovery = { scanAll } as unknown as LocalAiDiscoveryService;
    const service = new ContinuousDiscoveryService(discovery, { intervalMs: 1000, minIntervalMs: 100 });
    const statuses: string[] = [];

    service.onEvent((event) => {
      statuses.push(event.status);
    });

    await service.start();
    await vi.advanceTimersByTimeAsync(1200);
    service.stop();

    expect(statuses).toEqual(['failed', 'complete']);
    expect(service.getSnapshot().lastError).toBeNull();
  });

  it('Empty Resource List Test', async () => {
    const scanAll = vi.fn().mockResolvedValue(buildResult([]));
    const discovery = { scanAll } as unknown as LocalAiDiscoveryService;
    const service = new ContinuousDiscoveryService(discovery, { intervalMs: 1000, minIntervalMs: 100 });
    const events: Array<{ unchangedCount: number; changes: number }> = [];

    service.onEvent((event) => {
      events.push({
        unchangedCount: event.changeSet.unchangedCount,
        changes: event.changeSet.added.length + event.changeSet.updated.length + event.changeSet.removed.length
      });
    });

    await service.start();
    service.stop();

    expect(events[0]?.changes).toBe(0);
    expect(events[0]?.unchangedCount).toBe(0);
  });

  it('Rapid Repeated Scanning Test', async () => {
    const scanAll = vi.fn().mockResolvedValue(buildResult(['model-1']));
    const discovery = { scanAll } as unknown as LocalAiDiscoveryService;
    const service = new ContinuousDiscoveryService(discovery, { intervalMs: 60000, minIntervalMs: 500 });

    await service.start();
    service.triggerRescan('a');
    service.triggerRescan('b');
    service.triggerRescan('c');
    await vi.advanceTimersByTimeAsync(700);
    service.stop();

    expect(scanAll).toHaveBeenCalledTimes(2);
    expect(service.getSnapshot().pendingTriggerCount).toBe(0);
  });
});
