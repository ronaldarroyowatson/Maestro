# Conductor Feature

This feature executes DAG pipelines in layered topological order,
emits runtime events, applies retry behavior, and enforces reviewer gates.

## Structure
- models/: runtime contracts and execution result models
- services/: event-bus, scheduler, executor, retry-manager
- tests/: feature and integration tests
- docs/: feature docs
