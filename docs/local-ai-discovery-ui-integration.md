# AI Discovery UI Integration Contract

## Scope

Phase D introduces the `AI Discovery` section as a contract-backed Maestro surface.

## New UI Surface

- Feature ID: `maestro.ai-discovery`
- Route: `/maestro/ai-discovery`
- Panel: `ai-discovery`

Configured in:

- `otto/manifests/maestro-feature-catalog.json`
- `otto/manifests/maestro-ui-contract.json`
- `ui/navigation/maestro-panels.json`
- `ui/settings/maestro-ui-settings.json`
- `ui/panels/maestro-ai-discovery-panel.json`

## Required Panel Actions

- Run First Scan
- Rescan Device
- Continuous Discovery Toggle

## Required Panel Status/Output Fields

- `scanStatus`
- `resourceCounts`
- `lastScanTime`
- `discoveryLogs`

## Grouped Resource Output

The state builder groups discovered resources by type for UI rendering:

- Models
- Agents
- MCP Servers
- Tools
- Endpoints
- Other

Each item includes:

- name
- description
- status
- version
- path
- metadata
- expandable details

## Runtime-backed State Builder

`features/local-ai-discovery/services/ui-integration/index.ts` provides `AiDiscoveryUiStateBuilder` to project discovered `ResourceNode` inventory into deterministic UI state.

This keeps the graph/resource registry as the source of truth while supporting the required discovery dashboard shape.
