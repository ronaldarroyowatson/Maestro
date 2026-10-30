# Local AI Discovery Coverage & Gap Analysis

## Scope

Phase A revalidation and Phase B real-machine testing.

## Coverage Summary

### Verified coverage

- Ollama runtime detection (binary + endpoint)
- Ollama model detection via runtime metadata API
- Model metadata extraction
- Registry population and duplicate prevention
- Runtime/model/endpoint relationship creation
- Graph generation from unified Resource Nodes

### Partial coverage

- Local model filesystem scanning (works for extension-based files; runtime API now covers Ollama models)
- AI repository scanning (manifest-marker based heuristic)
- MCP detection (config path existence only)

### Not yet implemented

- Python virtual environment scanner
- Docker workload scanner
- Agent framework scanner
- Rich runtime health history/status transitions

## False Positive / False Negative Notes

- False-positive risk: Endpoint scanner can detect duplicated endpoint candidates before dedupe (dedupe currently resolves this).
- Remaining false-negative risk: repository and MCP scanners may miss non-standard paths/config layouts.

## Priority Improvements

1. Add Python and Docker scanners.
2. Add agent framework scanner.
3. Improve MCP scanning beyond static path checks.
4. Add scanner confidence/recall metrics and thresholds.
5. Add periodic drift checks comparing runtime API resources against registry state.

## Phase C Recommendations

- Focus Phase C on registry semantics and lifecycle:
  - resource confidence,
  - relationship quality,
  - stale node retirement,
  - health and sync status tracking.
