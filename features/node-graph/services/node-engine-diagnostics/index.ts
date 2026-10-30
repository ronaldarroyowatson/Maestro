import type { MaestroEventEnvelope } from '../../../../src/shared/index.js';

export interface NodeEngineSyncRunDiagnostics {
  started: number;
  completed: number;
  failed: number;
  lastEventAt?: string;
}

export interface NodeEngineSyncDiagnosticsSnapshot {
  totalEvents: number;
  startedEvents: number;
  completedEvents: number;
  failedEvents: number;
  sequenceViolations: string[];
  runs: Record<string, NodeEngineSyncRunDiagnostics>;
}

export interface NodeEngineSyncDiagnosticsVerification {
  ok: boolean;
  problems: string[];
}

const START_EVENT = 'maestro.node-engine.sync.started';
const COMPLETE_EVENT = 'maestro.node-engine.sync.completed';
const FAIL_EVENT = 'maestro.node-engine.sync.failed';

export function buildNodeEngineSyncDiagnosticsSnapshot(
  events: Array<MaestroEventEnvelope<Record<string, unknown>>>
): NodeEngineSyncDiagnosticsSnapshot {
  const filtered = events.filter((event) =>
    event.eventType === START_EVENT || event.eventType === COMPLETE_EVENT || event.eventType === FAIL_EVENT
  );
  const runs: Record<string, NodeEngineSyncRunDiagnostics> = {};
  const sequenceViolations: string[] = [];
  let startedEvents = 0;
  let completedEvents = 0;
  let failedEvents = 0;

  for (const event of filtered) {
    const runId = event.runId ?? 'unknown-run';
    const run = runs[runId] ?? { started: 0, completed: 0, failed: 0 };

    if (event.eventType === START_EVENT) {
      run.started += 1;
      startedEvents += 1;
    } else if (event.eventType === COMPLETE_EVENT) {
      run.completed += 1;
      completedEvents += 1;
      if (run.started === 0) {
        sequenceViolations.push(`Run '${runId}' completed before start.`);
      }
    } else if (event.eventType === FAIL_EVENT) {
      run.failed += 1;
      failedEvents += 1;
      if (run.started === 0) {
        sequenceViolations.push(`Run '${runId}' failed before start.`);
      }
    }

    run.lastEventAt = event.occurredAt.toISOString();
    runs[runId] = run;
  }

  return {
    totalEvents: filtered.length,
    startedEvents,
    completedEvents,
    failedEvents,
    sequenceViolations,
    runs
  };
}

export function verifyNodeEngineSyncDiagnostics(snapshot: NodeEngineSyncDiagnosticsSnapshot): NodeEngineSyncDiagnosticsVerification {
  const problems: string[] = [];

  if (snapshot.totalEvents === 0) {
    problems.push('No node-engine sync telemetry events were captured.');
  }
  if (snapshot.startedEvents === 0) {
    problems.push('No node-engine sync start events were captured.');
  }
  if (snapshot.sequenceViolations.length > 0) {
    problems.push(...snapshot.sequenceViolations);
  }

  for (const [runId, run] of Object.entries(snapshot.runs)) {
    if (run.completed > 0 && run.failed > 0) {
      problems.push(`Run '${runId}' contains both completed and failed terminal events.`);
    }
  }

  return {
    ok: problems.length === 0,
    problems
  };
}
