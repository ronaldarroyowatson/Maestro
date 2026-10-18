# Maestro

Maestro is the orchestration runtime for graph-based workflows, provider discovery, execution routing, and workflow observability inside the Otto ecosystem. It is designed to keep Otto as the reusable substrate while Maestro provides the orchestration logic, runtime state management, and operational intelligence that sit above it.

## Project status

This repository is in the contract-first runtime foundation phase:

- Otto remains the external platform/service backbone.
- Maestro owns orchestration contracts, graph/runtime services, and workflow routing logic.
- Commands, CLI/API exposure, and UI registration remain routed through Otto's command-service layer rather than being implemented ad hoc in Maestro.

## Why this repo exists

Maestro is not a standalone frontend app by itself. It is a runtime and service layer that provides:

- graph persistence and traversal contracts
- workflow runtime lifecycle management
- checkpoint and restore semantics
- provider registry and capability classification
- health/performance-aware resource selection
- Otto-compatible manifests and module registration metadata

## Repository layout

- `features/` - runtime feature modules (graph, workflow runtime, provider registry, etc.)
- `src/shared/` - shared platform contracts and validation utilities
- `otto/` - Otto integration manifests, payloads, and module metadata
- `docs/` - architecture, state, and integration documentation
- `installer/` - installer/bootstrap assets
- `tests/` - focused validation and integration coverage

## Quick start

```bash
npm install
npm run typecheck
npm test
```

Otto integration validation and bridge helpers:

```bash
npm run validate:otto-upstream-contract
npm run check:otto-upstreams
npm run sync:otto-upstreams
npm run verify:otto-upstreams-live
```

## Otto integration boundaries

The architectural rule for this project is explicit:

- Otto owns reusable platform capabilities and command service registration.
- Maestro consumes those platforms via contracts and manifests.
- Maestro does not create a separate CLI/API surface outside the Otto command-service layer.

This means the source tree may contain manifests, service contracts, and runtime implementations, but the final command surface is still expected to be registered and exposed by Otto's upstream command-service layer.

## Documentation

- `docs/maestro-master-architecture-plan.md` - architecture and execution roadmap
- `docs/maestro-current-state.md` - current status and implementation milestones
- `docs/maestro-otto-integration-plan.md` - integration execution tracker
- `docs/maestro-otto-payload.md` - payload and runtime contract details
- `docs/maestro-installation-via-otto.md` - install and bootstrap sequence
- `docs/MAESTRO-ARCHITECTURE.md` - architecture notes

## Contributing

Please read `CONTRIBUTING.md` before opening a pull request.

## Security

Please report vulnerabilities in accordance with `SECURITY.md`.

## License

This project is licensed under the MIT License. See `LICENSE` for details.
