# Maestro UI and Node Graphs in Otto

## UI Integration Artifacts

- Node graph definitions: `ui/nodes/maestro-node-graphs.json`
- UI settings defaults: `ui/settings/maestro-ui-settings.json`
- Navigation entries: `ui/navigation/maestro-panels.json`

These files are referenced by `otto/maestro-payload.json` under the `ui` section.

## Node Graph Model

`ui/nodes/maestro-node-graphs.json` defines:

- Node types for agents, tools, pipeline, and reviewer stages.
- Visual metadata including labels, icons, and colors.
- A default runtime graph with conductor, context, prompt, provider, and reviewer links.

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
