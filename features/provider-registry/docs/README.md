# Provider Registry Feature

This feature implements the provider adapter boundary for Maestro.
It contains adapter registration, model discovery, and unified inference execution.
It also exposes deterministic provider-health snapshots for runtime routing decisions.
Preferred-provider resolution supports policy constraints (status, latency, priority ordering)
for conductor-provider orchestration hardening.
Policy selection now supports weighted latency/cost routing to enforce deterministic,
cost-aware provider decisions with explicit fallback behavior.
Transient provider-health outages can recover via optional last-known healthy snapshot
selection with max-age limits for safe deterministic fallback.
Policy governance also supports circuit-breaker exclusions (`blockedProviderIds`)
and runtime budget controls (`budgetRemaining`, `reserveBudget`).
Cooldown/decay-window controls are supported through
`cooldownUntilByProviderId` + `evaluationTime` to keep provider re-entry deterministic.
Cross-run governance handoff is available through
`createSelectionPolicyWithGovernance(...)` and `createNextGovernanceState(...)`
for deterministic budget/circuit-breaker/cooldown state propagation between runs.

## Structure
- models/: public feature types
- services/: adapters, discovery, and adapter-factory
- tests/: feature tests
- docs/: feature docs
