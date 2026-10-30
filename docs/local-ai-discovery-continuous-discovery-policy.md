# Local AI Discovery Continuous Discovery Policy (Phase E)

## Objective

Provide low-impact background discovery with deterministic behavior and controlled resource usage.

## Scheduler Policy

- Default scheduler uses timed scan loops (no busy polling).
- `intervalMs` controls normal scan cadence.
- `minIntervalMs` enforces throttle floor between scans.
- `triggerRescan()` allows event-driven immediate scans while still respecting throttle.

## Runtime Controls

- `start(context)`
- `pause()`
- `resume()`
- `stop()`
- `updateInterval(intervalMs)`
- `getSnapshot()`

## Resource Throttling

- Change-set output is throttled with `maxChangeSetSize`.
- Large change waves are truncated deterministically and flagged as `throttled=true`.

## Incremental Re-scan Behavior

- Each scan computes resource diffs:
  - `added`
  - `updated`
  - `removed`
  - `unchangedCount`
- Fingerprints ignore volatile timestamps and focus on stable resource attributes/metadata.

## Event-driven Updates

- External triggers (filesystem/runtime hints) call `triggerRescan(reason)`.
- Multiple rapid triggers are coalesced to avoid scan storms.

## Operational Considerations

- Keep `intervalMs` conservative for low CPU/RAM impact.
- Use shorter `minIntervalMs` only for active debugging sessions.
- Monitor `lastError` and event stream status for service health.
- Prefer bounded `maxChangeSetSize` when environments may produce large bursts.
