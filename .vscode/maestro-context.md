# Maestro Project Overview

Maestro is a local-first orchestration tool that coordinates AI agents, tools, and workflows. It is designed to run both local and cloud models, manage sessions, and provide a visual interface for orchestration.

## Project Structure
- **backend/** — Python backend for agent orchestration, model routing, and tool execution.
- **frontend/** or **ui/** — HTML/CSS/JavaScript interface for the Maestro dashboard.
- **config/** — Configuration files for models, tools, and environment settings.
- **docs/** — Documentation files for contributors and users.

## Key Concepts
- **Agents**: Modular AI workers that perform tasks.
- **Tools**: Functions or scripts agents can call.
- **Sessions**: Persistent workspaces for long-running tasks.
- **Local Models**: Models running via Ollama or other runtimes.

## Goals
- Run local and remote AI models.
- Provide a visual orchestration dashboard.
- Support multi-agent workflows.
- Allow users to create, manage, and debug projects.

## Known Issues
(Add anything you know is broken or needs fixing)
