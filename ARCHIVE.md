# Maestro 0.4 — Prototype Archive

> **Status: ARCHIVED**
> **Archived:** 2026-07-04
> **Final Tag:** `v0.4-prototype`
> **Archive Branch:** `archive/v0.4-prototype`

This repository contains the Maestro 0.4 prototype — a proof-of-concept for AI agent
orchestration built on Python, AutoGen 0.6, FastAPI, and Ollama.

It has been formally archived. No further development will occur here.

---

## What This Proved

- XML pipeline definitions are the right deliverable format for portable, self-describing pipelines
- Agent role separation (Composer / Coder / Critic / Archivist) is the correct conceptual model
- Real-time WebSocket monitoring is essential for developer UX in orchestration systems
- Shipping a pipeline descriptor alongside an application (e.g. CourseForge) is the right
  integration pattern
- Ollama is a viable local LLM provider for development and last-resort inference

## Why It Was Rebuilt

- AutoGen 0.6 coupled architecture to framework internals — version changes caused silent breakage
- Round-robin GroupChat is not a DAG — every agent ran on every task regardless of relevance
- Single Ollama provider with no adapter abstraction — no cloud fallback, no provider swap
- No versioning on prompts, contexts, or pipeline configs — no audit trail, no rollback
- No validation layer between agent outputs — errors cascaded silently downstream
- No snapshot/export system — pipelines could not be frozen or shipped as deliverables
- FastAPI endpoints defined inside Maestro — dual source of truth for external interface
- No image processing, OCR, or document intelligence capability

## Architecture -> Greenfield Mapping

| Prototype                      | Greenfield Equivalent                                    |
|-------------------------------|----------------------------------------------------------|
| AutoGen AssistantAgent         | Agent Node (rectangle) in node-graph                     |
| AutoGen GroupChat round-robin  | DAG topological execution in conductor                   |
| FastAPI routes                 | Otto command service commands (otto-extensions repo)     |
| Hardcoded system prompt        | VersionedArtifact PromptTemplate in component-registry   |
| `pipelines/system/*.xml`       | Pipeline Descriptor XML (descriptor-exporter)            |
| WebSocket events               | Conductor event-bus subscriptions -> otto dev UI         |
| Composer / Coder / Critic / Archivist | Named Agent Node configs in pipeline descriptors  |

## Greenfield Rebuild

The Maestro v1.0 greenfield rebuild is in a separate repository.

It implements:
- True DAG node-graph pipelines with topological execution
- Provider + adapter system (Ollama, LM Studio, OpenAI, Azure, MCP, PaddleOCR)
- Conductor supervision with configurable retry and failure routing
- Reviewer validation nodes with schema + rule evaluation and revision-request loops
- PipelineSnapshot + Pipeline Descriptor XML export (fully self-contained deliverable)
- VersionedArtifact component registry with rollback and otto kernel update delivery
- Full OCR pipeline (17 nodes: image prep -> PaddleOCR -> text parser -> structured output)
- Zero direct API/CLI — all commands route through otto's command service layer

## Reference Material

The prototype's XML pipeline definitions, agent role configs, and prompt strings have been
preserved in the greenfield repo under `docs/prototype-reference/` as design reference.

No prototype implementation code was carried forward.

## Post-Archive Reset Record

- Repository cleared to archive documentation only on 2026-07-04.
- Local compressed backup created at:
  `/Users/dev-macbook/Documents/GitHub/archives/Maestro-archive-2026-07-04.tar.gz`
- Backup SHA-256:
  `2a6fc3cb1294332ad429563744d1e108b8b19a60341c3704126586155daa4dd8`
- Release tags removed and versioning reset as part of greenfield transition.
