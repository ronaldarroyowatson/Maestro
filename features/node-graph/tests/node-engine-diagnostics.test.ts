import { describe, expect, it } from 'vitest';
import type { MaestroEventEnvelope } from '../../../src/shared/index.js';
import { buildNodeEngineSyncDiagnosticsSnapshot, verifyNodeEngineSyncDiagnostics } from '../services/node-engine-diagnostics/index.js';

function event(input: {
  eventType: string;
  runId: string;
  occurredAt: string;
}): MaestroEventEnvelope<Record<string, unknown>> {
  return {
    eventId: `${input.runId}-${input.eventType}`,
    eventType: input.eventType,
    source: 'maestro',
    runId: input.runId,
    pipelineId: undefined,
    correlationId: input.runId,
    occurredAt: new Date(input.occurredAt),
    payload: {}
  };
}

describe('node-engine diagnostics', () => {
  it('Telemetry Summary Test', () => {
    const snapshot = buildNodeEngineSyncDiagnosticsSnapshot([
      event({ eventType: 'maestro.node-engine.sync.started', runId: 'run-1', occurredAt: '2026-01-01T00:00:00.000Z' }),
      event({ eventType: 'maestro.node-engine.sync.completed', runId: 'run-1', occurredAt: '2026-01-01T00:00:01.000Z' })
    ]);
    const verification = verifyNodeEngineSyncDiagnostics(snapshot);

    expect(snapshot.startedEvents).toBe(1);
    expect(snapshot.completedEvents).toBe(1);
    expect(verification.ok).toBe(true);
  });

  it('Invalid State Transition Test', () => {
    const snapshot = buildNodeEngineSyncDiagnosticsSnapshot([
      event({ eventType: 'maestro.node-engine.sync.completed', runId: 'run-1', occurredAt: '2026-01-01T00:00:01.000Z' })
    ]);
    const verification = verifyNodeEngineSyncDiagnostics(snapshot);

    expect(verification.ok).toBe(false);
    expect(verification.problems.some((problem) => problem.includes('completed before start'))).toBe(true);
  });

  it('Empty Resource List Test', () => {
    const snapshot = buildNodeEngineSyncDiagnosticsSnapshot([]);
    const verification = verifyNodeEngineSyncDiagnostics(snapshot);

    expect(verification.ok).toBe(false);
    expect(verification.problems.some((problem) => problem.includes('No node-engine sync telemetry events'))).toBe(true);
  });
});
