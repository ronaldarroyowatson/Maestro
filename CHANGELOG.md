# Changelog

## Maestro 0.4 — March 2026
Release preparation and stabilization update.

- Improved multi-agent turn handoff reliability in pipeline execution
- Fixed coder code capture path from backend state to frontend dashboard
- Added minimal smoke test suite under `tests/` for core startup and agent flow
- Removed temporary phase verification scripts replaced by proper smoke tests
- Updated README with Quick Start, 0.4 architecture summary, and unified entrypoint usage
- Prepared release artifacts for unified startup script and installer workflow

## Maestro 0.2 — March 2026
Stable, fully working build.

- Complete backend rewrite (FastAPI, WebSockets, state manager, event loop)
- Complete frontend rewrite (HTML/CSS/JS dashboard)
- Deterministic AutoGen 0.6.0 multi‑agent pipeline
- Local LLM integration via Ollama (mistral, deepseek-coder, phi3)
- Full debug instrumentation across backend and frontend
- WebSocket stability and reconnection logic
- Clean project structure and file organization
- Added .gitignore and removed cache files
- First fully stable end‑to‑end execution of multi‑agent tasks

## Maestro 0.1 — February 2026
Initial experimental build.

- Basic FastAPI backend
- Early WebSocket connection
- Minimal UI
- Unstable agent pipeline
- Frequent hangs and communication failures
