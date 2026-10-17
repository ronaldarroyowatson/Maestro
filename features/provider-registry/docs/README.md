# Provider Registry Feature

This feature implements the provider adapter boundary for Maestro.
It contains adapter registration, model discovery, and unified inference execution.
It also exposes deterministic provider-health snapshots for runtime routing decisions.

## Structure
- models/: public feature types
- services/: adapters, discovery, and adapter-factory
- tests/: feature tests
- docs/: feature docs
