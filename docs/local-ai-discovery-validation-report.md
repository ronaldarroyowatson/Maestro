# Local AI Discovery Validation Report (Post-Phase-A + Phase-B Revalidation)

Date: 2026-10-29  
Evidence artifact: `docs/local-ai-discovery-validation.latest.json`

## Feature

Local AI Discovery Framework revalidation and Phase B local testing environment validation.

## Tests Executed

- Ollama Detection Test
- Ollama Runtime Detection Test
- Ollama Model Metadata Test
- Duplicate Resource Test
- Resource Relationship Test
- Missing Configuration Test
- Invalid Endpoint Test
- Malformed JSON Test
- Empty Resource List Test
- Large Scale Resource Scan Test
- Runtime Detection Test
- Model Metadata Validation Test

## Results

Overall: **PASS**

Real-machine execution (`npm run validate:ai-discovery-local`) now reports:

- PASS - Ollama Runtime Detected
- PASS - Ollama Model Detected
- PASS - Duplicate Resource Test
- PASS - Resource Relationship Test

## Failure Modes Tested

- Missing configuration/env variables
- Invalid endpoint input normalization
- Malformed JSON from runtime API
- Duplicate resource attempts across repeated scans
- Missing model metadata fields

## Edge Cases Tested

- Empty resource list behavior
- Large scale local model scan (120 model files)
- Rapid repeated scanning (two full scans back-to-back)

## Real-Machine Findings

- Ollama executable detected at `C:\Users\ronal\AppData\Local\Programs\Ollama\ollama.exe`.
- Ollama runtime endpoint reachable at `http://127.0.0.1:11434`.
- Installed model detected: `tinyllama:latest`.
- Discovery now produces runtime + model + endpoint + install-root resources.
- Registry remained stable across repeated scans:
  - No duplicate IDs
  - Stable resource count
  - `lastSeen` updates validated
- Graph relationships now include runtime->model and runtime->endpoint links.

## Coverage Analysis

### Successfully detected

- Ollama runtime
- Ollama executable path
- Ollama model metadata via API
- Endpoint
- Registry population and dedupe behavior
- Relationship creation for runtime/model and device/runtime

### Not yet fully covered

- Python virtual environment discovery
- Docker workload discovery (docker not available on this machine path)
- Agent-framework discovery
- MCP servers beyond basic config-path probing

## Resource Node Directive Validation

Directive status: **Satisfied for validated Ollama path**.

- Runtime, model, endpoint, and installation-root entities are now normalized into `ResourceNode` records.
- Registry and graph generation continue to use unified node/relationship structures (no separate special-case storage path).

## Discovery Agent Assessment

Recommendation: keep deterministic rule-based discovery as source-of-truth ingestion, then add optional local agent-assisted classification as a second stage for uncertain resources.

Suggested lightweight model:

- Primary: Phi-family small instruct model (3B–4B quantized)
- Fallback: TinyLlama for very low-resource devices

## Known Limitations

- Ollama storage identity is still represented with two installation-root nodes and can be further consolidated.
- AI repository scanner depends on manifest markers and may miss non-standard project layouts.
- Docker and Python-env scanners are still backlog items.

## Recommended Improvements (Phase C Input)

1. Add `PythonEnvironmentScanner` and `DockerScanner`.
2. Add `AgentFrameworkScanner` and richer MCP runtime detection.
3. Consolidate Ollama installation/storage node identity semantics.
4. Promote `validate:ai-discovery-local` to required CI/PR gate for discovery changes.
5. Add relationship completeness metric thresholds for phase acceptance.
