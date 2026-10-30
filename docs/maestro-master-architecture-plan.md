# Maestro Master Architecture & Execution Plan

Status: Draft v1.5 (architecture-first plan + Otto-first contract-core iteration in progress)
Date: 2026-10-17  
Scope: Preserve all completed Otto↔Maestro foundation work and define the next long-range build phases for Maestro as a graph-based orchestration platform on Otto, while progressively formalizing the contract layer for graph, runtime, discovery, and checkpoint services.

## 1) Architecture Overview

### Strategic Positioning

- **Otto** is the reusable platform substrate (install/update/runtime/discovery/registry/state/events/graph/workflow services).
- **Maestro** is the orchestration product surface (workflow authoring, execution operations, visualization, and policy control).
- Existing Otto integration work is **foundational infrastructure**, not disposable tracer work.
- The current repo is still in the contract-and-shell layer. It defines the Maestro orchestration surface and validation metadata, but it does not yet include a standalone browser app or a live UI server to open directly from source.
- The project has now crossed into the first concrete service implementation slice: the graph layer is implemented in-memory and tested against the shared Otto-first contracts; the workflow runtime state machine and checkpoint manager are now in place; the discovery/registry capability classification layer has been implemented as a concrete first pass with resource classification and registry tracking; the next phase adds health/performance-aware ranking and provider selection heuristics so the registry can choose the right resource based on capability, quality, and operational fitness. That phase is now implemented in the registry layer via resource performance snapshots, health records, best-match scoring, and a dedicated `ResourcePolicyRouter` service; the high-level `ProviderRegistry` facade now exposes the best-fit classifying path directly. The next orchestration layer after that is runtime event publication via a workflow event bus so orchestration state transitions become observable and externally subscribed without tightly coupling listeners to the runtime class itself.

### North-Star Objective

Build a deterministic orchestration platform where users define intent and capabilities, while Otto services provide execution, state, discovery, health, and telemetry.

---

## 2) Existing Work to Preserve (Now Treated as Foundation)

The following are accepted as completed/in-progress infrastructure and remain in the target architecture:

- Otto installation and bootstrap flows
- Otto update / package retrieval / repair-healing paths
- Otto runtime monitoring and degraded-mode diagnostics
- Otto module lifecycle integration
- Maestro install/runtime management and dashboards
- Manifest/contract plumbing
- Registry and service wiring between Otto and Maestro
- Conductor/provider-governance observability hardening and diagnostics artifacts

These become **Phase 0 platform baseline** for all future work.

---

## 3) Service Boundary Diagram (Otto vs Maestro)

```mermaid
flowchart LR
    subgraph Otto["Otto Reusable Platform Services"]
        GS["Graph Service"]
        WRS["Workflow Runtime Service"]
        SS["State & Checkpoint Service"]
        DS["Discovery/Scout Service"]
        RS["Registry Service"]
        CS["Capability Classification Service"]
        HS["Health & Lifecycle Service"]
        PS["Performance Metrics Service"]
        CTS["Context Service"]
        EBS["Event Bus Service"]
        IMS["Install/Update/Recovery Services (existing)"]
    end

    subgraph Maestro["Maestro Product Layer"]
        WB["Workflow Builder UI"]
        RM["Runtime Monitor UI"]
        DD["Discovery Dashboard UI"]
        RE["Resource Explorer UI"]
        RB["Registry Browser UI"]
        SM["State Manager UI"]
        ET["Execution Timeline UI"]
        LD["Logging/Diagnostics UI"]
        MAPI["Maestro API Gateway / BFF"]
        MPOL["Maestro Policy & Orchestration Domain"]
    end

    WB --> MAPI
    RM --> MAPI
    DD --> MAPI
    RE --> MAPI
    RB --> MAPI
    SM --> MAPI
    ET --> MAPI
    LD --> MAPI

    MAPI --> GS
    MAPI --> WRS
    MAPI --> SS
    MAPI --> DS
    MAPI --> RS
    MAPI --> CTS
    MAPI --> EBS

    MPOL --> WRS
    MPOL --> CS
    MPOL --> HS
    MPOL --> PS

    DS --> RS
    RS --> CS
    HS --> RS
    PS --> RS
    WRS --> SS
    WRS --> EBS
    GS --> EBS
    IMS --> EBS
```

Boundary rule: business logic stays in Otto services and Maestro domain policy modules; UI remains orchestration/visualization only.

---

## 4) Data Flow Diagrams

## 4.1 Workflow Execution Flow

```mermaid
sequenceDiagram
    participant UI as Maestro Workflow Builder
    participant API as Maestro API/BFF
    participant GS as Otto Graph Service
    participant WRS as Otto Workflow Runtime
    participant CTS as Otto Context Service
    participant SS as Otto State Service
    participant EBS as Otto Event Bus
    participant REG as Otto Registry/Capability Services

    UI->>API: Save/Version workflow
    API->>GS: Validate + persist graph definition
    UI->>API: Start workflow run
    API->>WRS: Create run(runConfig, graphVersion, contextRefs)
    WRS->>CTS: Resolve attached contexts
    WRS->>REG: Resolve resources by capability/policy
    WRS->>SS: Create checkpoint(runId, state=Pending)
    WRS->>EBS: Publish WorkflowStarted
    loop per node/edge routing
      WRS->>EBS: NodeStarted/NodeCompleted/NodeFailed
      WRS->>SS: Persist node state + checkpoint
    end
    WRS->>EBS: Publish WorkflowCompleted/Failed/Paused
    API->>UI: Stream run status/timeline
```

## 4.2 Continuous Discovery and Registry Update Flow

```mermaid
sequenceDiagram
    participant Scheduler as Otto Discovery Scheduler
    participant Scout as Otto Scout Discovery
    participant Classifier as Capability Classifier
    participant Registry as Registry Service
    participant Health as Health/Lifecycle Service
    participant Perf as Performance Service
    participant Bus as Event Bus
    participant MaestroUI as Maestro Discovery/Registry Views

    Scheduler->>Scout: Trigger scan(plan/scope)
    Scout->>Scout: Detect local/cloud resources
    Scout->>Classifier: Classify capabilities
    Classifier-->>Scout: capability tags
    Scout->>Registry: Upsert resource metadata
    Health->>Registry: Update status lifecycle
    Perf->>Registry: Update usage/performance stats
    Registry->>Bus: ResourceUpdated/Discovered/Deprecated
    Bus-->>MaestroUI: Push updates
```

---

## 5) Otto Module Breakdown (Reusable Services)

| Otto Service | Responsibility | API Surface | Storage | Status |
| --- | --- | --- | --- | --- |
| Install/Update/Recovery | Install, update, repair, healing, runtime bootstrap | Existing Otto command/runtime contracts | Existing Otto manifests/state | **Foundation complete/in-progress** |
| Graph Service | Graph schema, versioning, traversal, query, event propagation metadata | Graph CRUD + query + traversal API | Graph store + version snapshots | New |
| Workflow Runtime Service | Execute graph workflows with routing/retries/approvals | Run lifecycle API + command API + event stream | Run-state store + checkpoints | New |
| State & Checkpoint Service | Save/resume/rollback/snapshot | Checkpoint API + restore API | Checkpoint/event-sourced state store | New |
| Discovery (Scout) Service | Detect ecosystem resources continuously | Scan API + scheduler + change feed | Discovery index + inventory graph | New |
| Registry Service (expanded) | System-of-record for resources & capabilities | Resource metadata/query API | Registry relational store | Expand existing |
| Capability Classification | Taxonomy and capability tagging | Classification API + policy hooks | Classification tables/vectors | New |
| Health & Lifecycle | Installed/missing/broken/deprecated states | Health probe + lifecycle transitions | Health history store | New |
| Performance Metrics | Cost/latency/success/resource utilization | Metrics ingest/query API | Time-series metrics store | New |
| Context Service | Reusable context entities and attachments | Context CRUD + attach/detach API | Context document store + links | New |
| Event Bus | Cross-service async communication | Publish/subscribe contracts | Bus broker + event log | New (platform-level) |

---

## 6) Maestro Module Breakdown (Product Layer)

| Maestro Module | Scope | Depends On |
| --- | --- | --- |
| Workflow Builder | Compose graph workflows visually, validate authoring constraints | Graph Service, Context Service |
| Runtime Monitor | Observe run state transitions and node execution | Workflow Runtime, Event Bus, State Service |
| Discovery Dashboard | Inspect scan results and ecosystem drift | Discovery Service, Registry Service |
| Resource Explorer | Deep resource detail, dependencies, health/perf trends | Registry, Health, Performance |
| Registry Browser | Search/filter resources by capabilities and constraints | Registry + Classification |
| State Manager | Resume/rollback/checkpoint operations | State Service + Runtime Service |
| Execution Timeline | Deterministic timeline/replay of events | Event Bus + State snapshots |
| Diagnostics View | Traces/logs/errors/root-cause links | Existing observability + Event Bus |
| Maestro API/BFF | Stable UI-facing contract adapter | All Otto services |
| Maestro Policy Layer | Product-specific routing/policy preferences | Runtime + Registry + Capability services |

---

## 7) API Contract Recommendations

Use explicit versioned contracts under Otto protocol conventions.

## 7.1 Core API Shapes

- **Graph Service**
  - `POST /graphs`, `GET /graphs/{id}`, `POST /graphs/{id}/versions`
  - `POST /graphs/{id}/query`, `POST /graphs/{id}/traverse`
- **Workflow Runtime**
  - `POST /runs`, `POST /runs/{id}/pause`, `POST /runs/{id}/resume`, `POST /runs/{id}/cancel`
  - `GET /runs/{id}`, `GET /runs/{id}/nodes`
- **State Service**
  - `POST /runs/{id}/checkpoints`, `GET /runs/{id}/checkpoints`
  - `POST /runs/{id}/rollback`, `POST /runs/{id}/restore`
- **Discovery/Scout**
  - `POST /scans`, `GET /scans/{id}`, `GET /inventory/resources`
- **Registry**
  - `GET /resources`, `GET /resources/{id}`, `POST /resources/query`
- **Context**
  - `POST /contexts`, `POST /contexts/{id}/attach`, `GET /contexts/{id}`
- **Events**
  - `GET /events/stream` (SSE/WebSocket) + broker topics

## 7.2 Event Contracts (minimum)

- `WorkflowStarted`, `WorkflowPaused`, `WorkflowCompleted`, `WorkflowFailed`
- `NodeStarted`, `NodeCompleted`, `NodeFailed`, `NodeSkipped`
- `CheckpointCreated`, `CheckpointRestored`, `RollbackExecuted`
- `ScoutDiscoveredResource`, `ResourceUpdated`, `ResourceHealthChanged`
- `CapabilityClassified`, `ResourceDeprecated`, `ResourceMissing`

Include deterministic fields: `eventId`, `eventTime`, `runId`, `graphVersion`, `nodeId`, `correlationId`, `sourceService`, `schemaVersion`.

---

## 8) Storage Recommendations

| Data Domain | Recommended Store | Why |
| --- | --- | --- |
| Graph definitions + versions | Relational + JSON columns (or document DB with relational index) | Strong versioning + query flexibility |
| Runtime state/checkpoints | Append-only event store + checkpoint snapshots | Deterministic replay and recovery |
| Registry metadata | Relational DB | Filtering, joins, dependencies, audit |
| Capability classification | Relational + optional vector index | Structured labels + semantic expansion |
| Performance metrics | Time-series DB | Efficient trend and percentile queries |
| Context objects | Document store + link table | Flexible context payloads with attach refs |
| Event bus durable log | Broker log retention | Replay and operational debugging |

Initial practical default: PostgreSQL (core metadata) + Redis/NATS/Kafka (events) + Prometheus-compatible metrics pipeline. Keep interfaces abstracted behind Otto service contracts.

---

## 9) Technology Stack Recommendation (Graph Service Decision)

## Decision: **Hybrid, phased**

- **Phase A (near-term): TypeScript-first Graph Service**
  - Reuses current Maestro/Otto TypeScript velocity and test harnesses.
  - Fastest path to stable contracts and feature correctness.
- **Phase B (scale path): Optional Rust graph kernel behind same service contract**
  - Introduce Rust for high-volume traversal/layout/execution planning hot paths.
  - Keep API contract stable so Maestro remains unaffected.

### Why hybrid over immediate Rust-only

- Existing codebase and integration/test pipelines are TypeScript-heavy.
- Early architectural risk is contract and domain-shape correctness, not raw traversal throughput.
- Hybrid keeps ETC/DRY/SOLID goals: stable interface, replaceable implementation.

### Recommended implementation posture

- Keep the public Otto service contracts language-agnostic and versioned.
- Use TypeScript service adapters and orchestration logic in the first implementation pass.
- Keep the Rust graph kernel as a pluggable backend when memory pressure, traversals, or layout optimization exceed TypeScript runtime efficiency.
- Do not couple Maestro UI or workflow orchestration directly to the graph engine storage implementation.

---

## 10) Execution Model Recommendations

## 10.1 Workflow Runtime States

- `Pending`
- `Running`
- `Waiting`
- `Paused`
- `Complete`
- `Failed`
- `Cancelled`
- `Skipped`

## 10.2 Routing/Logic Requirements

Support first-class:

- sequential, conditional, branch/merge
- bounded loops and controlled circular workflows
- confidence threshold routing
- retry routing and error routing
- dynamic node selection by capability + policy
- human intervention and approval nodes

## 10.3 Advanced Node Schema (recommended shape)

Each node supports composable subcomponents:

- `agentRef[]`
- `modelRef[]`
- `mcpServerRef[]`
- `toolRef[]`
- `promptRef[]`
- `contextRef[]`
- `conditions[]`
- `routingRules[]`
- `executionPolicy` (`retry`, `timeout`, `fallback`, `approvalRequired`)

Node contract must allow one or many references per resource type.

---

## 11) Prioritized Implementation Roadmap

## Current milestone: Runtime orchestration contract boundary

The shared Otto-first contract layer now includes graph traversal, event-bus publish semantics, discovery lifecycle metadata, capability/resource telemetry contracts, graph persistence/version semantics, and concrete adapter boundaries for both the Graph Service and Workflow Runtime. The next concrete implementation step is to formalize the orchestration policy and execution routing boundary so Maestro can schedule runs, route alternate paths, apply approval/confidence rules, and create/restore checkpoints without drifting into ad hoc runtime logic or standalone CLI/API creation outside the Otto command-service rule.

## Phase 0 — Foundation Lock (already mostly complete)

- Freeze and version current Otto install/update/runtime contracts.
- Publish contract baseline and compatibility matrix.
- Exit criteria: existing install/update/runtime flows remain green.

## Phase 1 — Event Bus + Contract Core

- Introduce platform-wide event bus schemas and publisher/subscriber SDK.
- Normalize deterministic event fields.
- Exit criteria: runtime + discovery + registry events visible end-to-end.
- Current execution status: event envelopes, capability/resource metadata, graph traversal, and persistence/versioning contracts are in the shared platform contract layer and validated by TypeScript checks.

## Phase 2 — Graph Service v1

- Build TypeScript Graph Service with versioned graph persistence and traversal/query APIs.
- Include layout metadata and serializer contracts.
- Exit criteria: Maestro builder can persist/load/query graph versions via service APIs.
- Immediate next milestone: formalize the graph service adapter boundary and first TypeScript implementation contract in the shared platform layer before introducing a concrete runtime implementation or a new Otto ecosystem repo.

## Phase 3 — Workflow Runtime Service v1

- Execute graph nodes with state machine semantics and routing.
- Implement retries, timeouts, alternate/error path routing.
- Exit criteria: deterministic run replay for baseline workflow templates.

## Phase 4 — State & Checkpoint Service v1

- Checkpointing, resume, rollback, and partial restoration.
- Exit criteria: failed workflows can resume from checkpoint without full restart.

## Phase 5 — Discovery/Scout + Registry Expansion

- Continuous discovery scheduler + machine-wide inventory graph.
- Registry expansion for health/version/dependencies/last-seen/capabilities.
- Exit criteria: discovery dashboard reflects live ecosystem changes.

## Phase 6 — Capability Classification + Dynamic Selection

- Capability taxonomy and policy-based resource selection (“best available coding model”).
- Exit criteria: workflow runtime can select resources by capability intent.

## Phase 7 — Health/Performance Intelligence

- Track success/failure/cost/latency/resource metrics.
- Feed recommendation engine and policy guards.
- Exit criteria: policy can route using performance and health signals.

## Phase 8 — Maestro Productization Layer

- Full workflow builder, monitor, timeline, state manager, registry explorer.
- Harden BFF/API surface and multi-tenant readiness.
- Exit criteria: operational beta with governance and diagnostics guardrails.

---

## 12) New Major Initiative: Local AI Ecosystem Discovery and Visual Orchestration

### 12.1 Strategic intent

Add a new major roadmap initiative to the Maestro platform: "Local AI Ecosystem Discovery and Visual Orchestration".

The long-term objective is for Maestro to automatically discover, catalog, visualize, and orchestrate AI resources available on a local machine and eventually across networked machines and remote environments. This work expands Maestro beyond orchestration runtime management into a living AI system inventory and visual execution plane.

This initiative must be implemented as a direct extension of the Otto-first architecture:

- Otto remains the reusable platform substrate for scanning, inventory, lifecycle monitoring, registry state, runtime eventing, and graph execution.
- Maestro remains the product-facing orchestration and visualization layer that renders discovery results, workflow layouts, runtime state, and governance decisions.
- The initiative does not replace the existing contract-first graph and workflow work; it layers on top of it as the next strategic product expansion.

### 12.2 Initiative scope

This initiative covers five core themes:

1. Local AI resource discovery and normalization
2. Repeatable local testing and validation environment
3. Centralized resource registry and health tracking
4. Otto/Maestro UI integration for AI discovery and workflow execution
5. Continuous discovery + graph-based orchestration for local AI resources

### 12.3 Discovery architecture

```mermaid
flowchart LR
    subgraph Scanners[Discovery Scanners]
        O[OllamaScanner]
        M[LocalModelScanner]
        L[LMStudioScanner]
        P[MCPScanner]
        D[DockerScanner]
        A[AgentScanner]
        E[EndpointScanner]
    end

    subgraph Normalize[Normalization Layer]
        N[DetectedResource Normalizer]
        C[Capability Classifier]
    end

    subgraph Registry[Resource Registry]
        R[Registry Store]
        T[Health + Status Tracker]
        H[Search / Filter / Tagging]
    end

    subgraph UX[Maestro Surface]
        UI[AI Discovery UI]
        G[Visual Workflow Graph]
        V[Resource Explorer]
    end

    O --> N
    M --> N
    L --> N
    P --> N
    D --> N
    A --> N
    E --> N
    N --> C
    C --> R
    R --> T
    T --> H
    H --> UI
    H --> V
    H --> G
```

### 12.4 Recommended technology stack

- Discovery runtime: Node.js + TypeScript service adapters
- File system scanning: `chokidar`, `fs/promises`, native OS APIs
- Background scheduling: `cron`/`node-schedule` or a lightweight worker loop
- Registry persistence: SQLite for local dev, PostgreSQL for longer-term production
- Event bus: existing Otto event bus; optionally NATS/RabbitMQ later
- Graph/UI orchestration: existing Otto graph contracts + Maestro product layers; optional `reactflow`/custom graph renderer for visual workflow surfaces
- Metrics and health: existing registry health snapshot contracts and performance telemetry layers
- Local AI API integration: Ollama REST API, LM Studio local API compatibility endpoints, OpenAI-compatible endpoints, local MCP server discovery metadata
- Search and metadata: structured tags + optional vector index when needed

### 12.5 Recommended execution order

1. Phase A — Local AI Discovery Framework
2. Phase B — Local Test Environment
3. Phase C — Resource Registry
4. Phase D — Initial UI Integration
5. Phase E — Continuous Discovery System
6. Phase F — Otto Node Graph Foundation
7. Phase G — Node Property Inspector
8. Phase H — Maestro + Otto Integration
9. Phase I — First End-to-End Workflow Test
10. Phase J — Future Vision Document

This ordering keeps the platform grounded in actual local evidence before introducing a larger visual orchestrator.

### 12.6 Dependencies and blockers

- Discovery accuracy depends on existing registry and capability-classification contracts.
- UI integration depends on the Otto-first module manifest and contract loader working correctly.
- Visual orchestration depends on the Otto node-graph foundation being available and stable.
- Continuous discovery must avoid interfering with active AI workloads and should use throttled scheduling and incremental scans.
- Local environment validation requires a working Ollama/LM Studio or equivalent local runtime to verify discovery and metadata extraction in real conditions.
- The registry must remain the source of truth; scanners should upsert records and emit events rather than mutating runtime state directly.

### 12.7 Implementation phases A-J

Current implementation status: Phase A is implemented and revalidated under the mandatory feature validation framework. The core design rule remains the unified resource-node model, and the discovery framework under `features/local-ai-discovery/index.ts` now includes runtime and model scanners for Ollama in addition to local model files, LM Studio, MCP configuration, AI-development repositories, and local endpoints.
Phase B is complete and validated as a repeatable local testing environment. The repo now includes: `features/local-ai-discovery/services/test-environment/index.ts`, the machine validation command `npm run validate:ai-discovery-local`, structured PASS/FAIL real-machine outputs, and evidence artifacts in `docs/local-ai-discovery-validation.latest.json`.
Real-machine validation confirms runtime detection, executable detection, model metadata extraction, registry dedupe/update behavior, and runtime->model relationship generation. Remaining roadmap-priority gaps are expansion scanners (Python virtual environments, Docker workloads, agent frameworks, richer MCP runtime coverage).
Phase C is complete for the registry scope: searchable registry queries, status and health lifecycle APIs, categorization/tagging operations, stale missing-resource handling, inventory snapshots, and relationship dedupe safeguards are implemented and validated.
#### Phase A — Local AI Discovery Framework

Objective: create a modular, plugin-driven discovery framework for local AI resources.

Core tasks:
- Define a `DiscoveryScanner` contract and normalized `DetectedResource` model.
- Implement `OllamaScanner`, `LocalModelScanner`, `LMStudioScanner`, `MCPScanner`, `DockerScanner`, `AgentScanner`, and `EndpointScanner` adapters.
- Normalize path, metadata, type, status, lastSeen, and discoveredBy values.
- Capture duplicates, stale entries, and re-discovered resources in a deterministic manner.
- Ensure scanner modules can be added without modifying core orchestration logic.

Milestones:
- scanner contract exists
- sample local detection run returns normalized resources
- discovery output is registry-ready

Testing requirements:
- scanner contract tests
- integration tests for representative local resources
- duplicate detection tests
- stale-resource detection tests

Documentation updates:
- discovery framework README section
- scanner registry and extension points
- example output contracts

#### Phase B — Development and Test Environment

Objective: create a repeatable local testing environment for AI discovery and runtime validation.

Core tasks:
- Define and automate an Ollama installation workflow for development environments.
- Download a lightweight test model (for example TinyLlama or Phi) and verify metadata extraction.
- Validate model detection, runtime detection, and local endpoint detection.
- Document setup steps, expected outputs, and troubleshooting.
- Add a repeatable real-machine validation gate (`validate:ai-discovery-local`) and require evidence snapshots for discovery changes.
- Upgrade Ollama coverage from directory detection to runtime + executable + model API normalization.

Milestones:
- local dev machine can install and detect Ollama
- small model can be downloaded and discovered
- runtime + metadata checks pass in CI/local automation
- runtime node + model nodes + runtime-model relationships are present in graph outputs

Testing requirements:
- runtime discovery test
- model discovery test
- metadata extraction test
- resource duplication test
- resource update test
- resource removal detection test
- graph relationship completeness test for runtime->model and device->runtime edges

Documentation updates:
- local setup guide with commands, expected artifacts, and verification steps
- troubleshooting section for missing services and model detection issues

#### Phase C — Resource Registry

Objective: provide the canonical source of truth for AI resources.

Core tasks:
- Define the registry resource schema for models, agents, MCP servers, tools, endpoints, workflows, and future resource types.
- Implement add/update/remove/search/filter/tagging/categorization operations.
- Track health state, lastSeen, source, and metadata for all discovered resources.
- Expose registry APIs that discovery and UI layers can consume without direct data mutation.

Milestones:
- registry persists discovered resources deterministically
- health state transitions and field updates are consistent
- UI can query grouped resource inventory

Testing requirements:
- registry CRUD tests
- health state transitions
- search/filter/categorization validation
- duplicate merge semantics

Documentation updates:
- registry schema and lifecycle docs
- health-state definitions
- operations guide

#### Phase D — Initial UI Integration

Objective: add a new Maestro section named "AI Discovery".

Core tasks:
- Add new page or panel under Maestro for discovery status and inventory.
- Add actions: Run First Scan, Rescan Device, Continuous Discovery Toggle.
- Display counts, discovery logs, scan status, and last scan time.
- Group discovered items by type: models, agents, MCP servers, tools, endpoints, other.
- Provide expandable details for each resource item.

Milestones:
- page renders with health and status cards
- discovery logs stream into UI
- resources are grouped and searchable

Testing requirements:
- page rendering contract tests
- grouping logic validation
- empty-state and degraded-state tests

Documentation updates:
- AI discovery page contract
- UX and interaction behaviors

Current implementation status: Phase D is complete in this repository's contract/runtime scope. The AI discovery section (`maestro.ai-discovery`) is now wired into feature catalog, UI contract, navigation, settings, module registration, and panel specification artifacts. A runtime-backed state projection service (`AiDiscoveryUiStateBuilder`) now provides scan status, controls, grouped resources, resource counts, logs, and last-scan metadata for Otto UI consumption.

#### Phase E — Continuous Discovery System

Objective: create a background discovery service that remains low-impact and low-noise.

Core tasks:
- Create scheduler and incremental rescan loop.
- Support pause/resume and configurable intervals.
- Add throttling and resource-aware scan windows.
- Use file-system watchers or event-driven notifications where available.
- Minimize CPU, RAM, and disk churn while avoiding interference with active AI workloads.

Milestones:
- scheduler can run incremental scans without disrupting active workloads
- throttling and pause/resume work as expected
- change detection produces updates without full re-scan storms

Testing requirements:
- scheduler interval tests
- pause/resume tests
- throttling and low-resource validation
- event-driven update tests

Documentation updates:
- scan policy and scheduling guide
- operational considerations for low-impact discovery

#### Phase F — Otto Node Graph Foundation

Objective: create a reusable node-based workflow system inside Otto for visual orchestration.

Core tasks:
- Build reusable graph components with pan/zoom/grid/minimap/theme support.
- Support node grouping, labels, comments, selection, validation, and runtime statuses.
- Support connectors, typed ports, validation, and status indicators.
- Support branch logic, filters, splitters, mergers, and routing conditions.

Milestones:
- graph canvas renders and supports editing
- node properties and value changes are reflected immediately
- execution state is visible on graph elements

Testing requirements:
- graph rendering contract tests
- node lifecycle tests
- connection/disconnection tests
- graph validation tests

Documentation updates:
- node graph component contract and interaction model
- visual orchestration design guide

#### Phase G — Node Property Inspector

Objective: implement a property editor side panel for selected nodes.

Core tasks:
- Display node name, type, properties, configuration, validation state, and connected I/O.
- Allow live editing from the side panel.
- Ensure updates are immediately reflected in the graph state.
- Validate changed properties before execution.

Milestones:
- inspector reflects selected node state and runtime values
- edits propagate instantly to graph schema and execution context

Testing requirements:
- inspector rendering tests
- property validation tests
- live reflection tests

Documentation updates:
- node inspector API and UX patterns

#### Phase H — Maestro + Otto Integration

Objective: integrate Otto's node graph module directly into Maestro.

Core tasks:
- Share component architecture, style layer, and state contracts.
- Reuse node definitions and registry-driven metadata.
- Ensure Maestro can render and execute user-defined workflows driven by discovered local resources.
- Add orchestration boundaries between UI, orchestration policy, and Otto runtime services.

Milestones:
- Maestro renders Otto node graph surfaces in the workflow product layer
- user-defined graph workflows execute through the existing controlled runtime path

Testing requirements:
- Maestro + Otto integration tests
- rendering contract tests
- workflow execution tests from graph to runtime

Documentation updates:
- integration architecture doc
- shared component contract and boundaries

#### Phase I — First End-to-End Test

Objective: validate the full flow from local AI discovery to visual graph execution.

Workflow:

Local AI Discovery

Start -> Scan Device -> Detect Ollama -> Locate Models -> Register Resources -> Update UI -> Display Graph

Success criteria:
- local AI resources are detected
- resources are registered
- results are visible in UI
- graph execution can be observed live
- node statuses are visible and consistent

Testing requirements:
- end-to-end discovery-to-registration test
- graph execution trace test
- UI state check to confirm results display

Documentation updates:
- product walkthrough and success criteria

#### Phase J — Future Vision Document

Objective: capture the longer-term operating model beyond local discovery.

Future discovery targets:
- network devices
- remote servers
- remote agents
- containers and Kubernetes
- cloud AI resources
- GPU inventories
- distributed workflows

Future graph capabilities:
- agent orchestration
- multi-agent workflows
- dynamic tool routing
- resource allocation
- automated task planning
- self-discovery feedback loops

Milestones:
- future-state architecture doc approved
- gap analysis for remote and distributed environments
- roadmap update for next expansion phases

Documentation updates:
- future vision and extension roadmap
- cross-platform expansion strategy

### 12.8 Recommended architecture diagram for the full initiative

```mermaid
flowchart TD
    A[Discovery Scheduler] --> B[Scanner Layer]
    B --> C[Normalization + Classification]
    C --> D[Registry + Health Tracking]
    D --> E[UI Inventory + Graph Explorer]
    D --> F[Workflow Runtime Routing]
    F --> G[Otto Node Graph]
    G --> H[Maestro Visual Orchestration]
    H --> I[End-to-End AI Workflow Execution]
    I --> J[Continuous Feedback + Re-scan Loop]
``` 

This initiative should be treated as a major expansion of the existing architecture, not as an isolated feature. It fits naturally into the current Otto-first service model and will create the next strategic product layer for Maestro after the current runtime/registry/workflow contracts are stabilized.

---

## 13) Migration Path from Tracer-Bullet to Target Platform

1. **Stabilize current contracts** (no breaking changes to Otto integration foundation).
2. **Introduce service façades** in Maestro to call Otto services behind interfaces.
3. **Dual-path period**:
   - existing conductor/runtime paths continue,
   - new Graph/Runtime/State services run in parallel for selected workflows.
4. **Progressive cutover** by capability flag:
   - graph persistence cutover,
   - runtime cutover,
   - checkpoint/resume cutover,
   - discovery/registry intelligence cutover.
5. **Deprecate local-only implementations** once parity + regression thresholds are met.

No “big bang” replacement.

---

## 13) Risks & Technical Challenges

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Service boundary leakage (UI or Maestro owning Otto logic) | High coupling, fragile evolution | Contract governance + review gates |
| Event schema drift | Broken observability/replay | Versioned schemas + compatibility tests |
| Non-deterministic runtime behavior | Unreliable orchestration | Deterministic clocks/IDs + replay tests |
| Discovery false positives/noise | Poor trust in inventory | confidence scoring + source provenance |
| Capability misclassification | Bad dynamic routing | layered taxonomy + human override |
| State/checkpoint corruption | Failed recovery | immutable logs + checksums + rollback tests |
| Performance overhead from service split | Latency increase | async eventing + caching + perf SLOs |
| Premature Rust complexity | Slower delivery | phased TS-first, Rust only for hot paths |

---

## 14) Recommended Next Execution Order (Immediate)

For the next several development phases, execute in this order:

1. Event contract normalization + bus scaffolding
2. Graph Service v1 (TS)
3. Workflow Runtime v1 state machine + routing primitives
4. Checkpoint/Resume v1
5. Discovery continuous scan engine
6. Registry expansion + capability classification
7. Health/performance policy routing
8. Maestro UI surfaces consuming service APIs only

This order minimizes rework and preserves current Otto integration investment.

---

## 15) Governance Rules for Ongoing Work

- Otto-first reusable capability rule: if reusable, it belongs in Otto service layer.
- Maestro remains orchestration UX and product-domain policy layer.
- All new cross-service behavior requires explicit contracts and event schemas.
- Maintain feature-first implementation structure and deterministic testability standards.

---

## 16) Definition of Done for “Master Plan Acceptance”

This plan is considered accepted when:

- Otto/Maestro boundaries are approved and documented.
- API and event contract skeletons are ratified.
- Phase 1–3 delivery backlog is created from this plan.
- Migration flags/cutover checkpoints are defined in implementation tracking docs.
