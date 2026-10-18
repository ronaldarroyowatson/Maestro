# Provider Registry Feature

This feature implements the provider adapter boundary for Maestro.
It contains adapter registration, model discovery, and unified inference execution.
It also exposes deterministic provider-health snapshots for runtime routing decisions.
Preferred-provider resolution supports policy constraints (status, latency, priority ordering)
for conductor-provider orchestration hardening.

## Structure
- models/: public feature types
- services/: adapters, discovery, and adapter-factory
- tests/: feature tests
- docs/: feature docs
