# Maestro UI and Node Graphs in Otto

## UI Integration Artifacts

- Node graph definitions: `ui/nodes/maestro-node-graphs.json`
- Node graph panel spec: `ui/panels/maestro-node-graph-panel.json`
- Node inspector panel spec: `ui/panels/maestro-node-inspector-panel.json`
- UI settings defaults: `ui/settings/maestro-ui-settings.json`
- Navigation entries: `ui/navigation/maestro-panels.json`

These files are referenced by `otto/maestro-payload.json` under the `ui` section.

## Node Graph Model

`ui/nodes/maestro-node-graphs.json` defines:

- Canvas interaction capabilities (`pan`, `zoom`, `grid`, `minimap`, `theme`, `nodeSelection`).
- Node types for agents, tools, pipeline, and reviewer stages with typed port contracts.
- Visual metadata including labels, icons, and colors.
- A default runtime graph with explicit port-bound edges, node status defaults, and grouping metadata.

## Node Graph Runtime Projection

`features/node-graph/services/ui-integration/index.ts` provides `NodeGraphUiStateBuilder`, which:

- Projects runtime graph definitions into deterministic UI state.
- Applies node/edge execution statuses.
- Groups nodes for graph panel display.
- Validates typed port compatibility and returns structured validation errors/warnings.

## Node Property Inspector

`features/node-graph/services/property-inspector/index.ts` provides `NodePropertyInspector`, which:

- Builds selected-node inspector state (name, type, status, properties, validation, I/O connections).
- Applies live node property updates into graph snapshots.
- Emits explicit validation errors/warnings for invalid node states.

## Settings Model

`ui/settings/maestro-ui-settings.json` provides:

- Default startup view (`graph`).
- Logs/telemetry/tracing panel defaults.
- Verbosity and trace sampling defaults.
- Session persistence flags.

## Navigation Model

`ui/navigation/maestro-panels.json` declares a dedicated Maestro section with links to:

- Install status
- Runtime status
- Node graph
- Logs
- Telemetry

## Otto UI Wiring Expectations

Otto UI should:

1. Load Maestro node graph and settings metadata through payload configuration.
2. Render Maestro section entries in navigation.
3. Persist user-modified settings in Otto-managed config storage.
4. Bind logs and telemetry panels to extension module output streams.
