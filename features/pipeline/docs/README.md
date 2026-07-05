# Pipeline Feature

This feature manages pipeline construction, persistence, validation,
snapshot materialization, and XML descriptor export/import.

## Structure
- models/: pipeline validation and error contracts
- services/: builder, store, validator, snapshot, descriptor exporter/importer
- tests/: feature and round-trip tests
- docs/: feature docs
