> ## ⚠️ ARCHIVED — PROTOTYPE ONLY
>
> **This repository contains Maestro v0.4, a proof-of-concept prototype. It is formally
> archived as of 2026-07-04 (tag: `v0.4-prototype`, branch: `archive/v0.4-prototype`).**
>
> **Do not use this as a base for new development.**
>
> The Maestro project has been redesigned from the ground up as a modular,
> framework-agnostic AI agent orchestration platform. See the Maestro v1.0 repository
> for current development.
>
> See [ARCHIVE.md](./ARCHIVE.md) for the full archive record, lessons learned, and
> a mapping of prototype concepts to the greenfield architecture.

# Maestro 0.4 — Local Multi-Agent Orchestration Studio

Maestro is a fully local, fully autonomous multi‑agent orchestration system built for experimentation, education, and real‑world automation. It combines a FastAPI backend, a real‑time WebSocket dashboard, and a deterministic AutoGen 0.6.0 agent pipeline powered by local LLMs running through Ollama.

Version 0.4 focuses on stabilization, cleaner startup flow, and release readiness.

## Quick Start

### Prerequisites
- Python 3.11+
- Ollama installed and running

### Install

```bash
pip install -r backend/requirements.txt
```

### Run (Current)

```bash
uvicorn backend.main:app --reload
```

Open:

```text
http://127.0.0.1:8000
```

### Run (Unified Entrypoint)

After Phase 3, use:

```bash
python run_maestro.py
```

This will start the backend, wait until it is ready, then open the dashboard in your browser.

## Architecture (0.4)

Maestro 0.4 has three primary layers:
- `backend/`: pipeline load/parse/compile/execute, state management, API and WebSocket endpoints
- `frontend/`: dashboard UI, event handling, message/code rendering
- `pipelines/system/default.xml`: default multi-agent workflow definition (composer -> coder -> critic -> archivist)

## Features

### Multi‑Agent Pipeline
Maestro runs four coordinated agents in a strict round‑robin cycle:
- Composer — breaks tasks into structured plans
- Coder — generates Python code
- Critic — reviews code for issues
- Archivist — summarizes the final result

### Local LLM Support (via Ollama)
Each agent uses a different local model:
- mistral:instruct
- deepseek-coder:6.7b
- phi3

### Real‑Time Dashboard
The frontend displays:
- Live agent messages
- Code output
- Current agent and model
- Debug console
- Task input panel

### Debug Instrumentation
Every subsystem logs:
- Thread lifecycle
- WebSocket connections
- State updates
- Agent messages
- Pipeline progress

This makes Maestro easy to debug, extend, and teach.

## Installation

Clone the repository and install dependencies:

```bash
git clone <your-repo-url>
cd Maestro
pip install -r backend/requirements.txt
```

## Project Structure

    Maestro/
    ├── backend/
    │   ├── main.py
    │   ├── maestro_runner.py
    │   ├── maestro_local_autonomous.py
    │   ├── state.py
    │   ├── ws.py
    │   ├── event_loop.py
    │   ├── models.py
    │   └── __init__.py
    ├── frontend/
    │   ├── index.html
    │   ├── styles.css
    │   └── app.js
    ├── .gitignore
    ├── README.md
    ├── CHANGELOG.md
    └── VERSION

## Running a Task

Enter a natural language instruction in the dashboard, such as:

    Write a Python program that simulates a simple turn‑based RPG battle system.

Maestro will:
1. Reset state
2. Start background and streamer threads
3. Run the agent pipeline
4. Stream messages to the UI
5. Display code and summary

## Versioning

Maestro uses simple semantic versioning:
- 0.x — development builds
- 1.0 — first public release

Current version: 0.4

See CHANGELOG.md for details.

## Roadmap

- Agent activity indicators
- Model selection UI
- Node‑graph orchestration view
- Task history
- Multi‑task queue
- Context window management
- Plugin system
- Exportable pipelines

## License

MIT License (or your preferred license)

## Contributing

Pull requests are welcome. Please open issues for bugs or feature requests.
