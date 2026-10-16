# Maestro Setup Playbook

This document is the machine-replacement and recovery guide for the Maestro/Otto environment. It is intentionally written as an operational checklist so the workspace can be reconstructed on a different machine without guesswork.

## 1. Principles

- Otto is the runtime backbone and extension platform.
- Maestro remains the feature-based orchestration layer.
- TypeScript is the default implementation language for maintainability and development velocity.
- Rust is reserved for verified hot paths and performance-sensitive components.
- Every environment change must be documented so the setup can be mirrored.

## 2. Required Toolchain

Install the following before starting work:

- Git
- GitHub CLI (for repo and release workflow support)
- Node.js and package manager tooling
- TypeScript tooling
- Rust toolchain for any performance-sensitive or hot-path experimentation
- shell and OS utilities for local project bootstrap and installer checks

Recommended validations:

```bash
node --version
npm --version
rustc --version
git --version
```

## 3. Workspace Layout

Create a stable layout on every machine:

```text
/workspace/
  maestro/
  otto/
  extensions/
  gap-fillers/
  ops/
```

Purpose:

- `maestro/` — the main repo under active development
- `otto/` — Otto runtime or backbone repo used for integration contracts
- `extensions/` — Otto extension repos or related packages
- `gap-fillers/` — local repos or wrappers for features not yet provided by the ecosystem
- `ops/` — setup scripts, notes, and recovery documentation

## 4. Repository and Dependency Acquisition Sequence

Use this order when setting up a new machine:

1. Clone the Maestro repo into `/workspace/maestro`.
2. Clone the Otto ecosystem repo or backbone repo into `/workspace/otto`.
3. Review extension and installer repos referenced by the project documentation.
4. Create or add any missing local packages under `gap-fillers/`.
5. Confirm the repo boundaries between Maestro and Otto before writing code.
6. Validate the install and test flow from a clean state.

## 5. Tooling and MCP Registry

The environment should record every tool or MCP service used to support development, execution, and review.

### Core tools
- Git
- GitHub CLI
- Node.js / npm / pnpm
- TypeScript compiler
- Rust toolchain
- any OS-specific build utilities required for installers or packaging

### MCP / execution services
- command execution services for runtime orchestration
- telemetry and logging bridges
- provider adapters and external tool integrations
- local runtime validators or contract checkers

### Registry rule
If a tool or MCP server is added, update this document and the relevant architecture or README section immediately. The setup must be reproducible from the docs alone.

## 6. Validation Commands

Run the repo's standard validation sequence after a fresh install:

```bash
npm install
npm run typecheck
npm test
```

If the install or packaging flow is being validated:

```bash
npm run build
```

Use the installer documentation in `installer/README.md` to validate release and bootstrap scripts.

## 7. Performance Model

Maestro should remain speed-oriented without prematurely converting the whole codebase to Rust.

Recommended sequence:

1. establish a benchmark or hot-path baseline
2. locate the bottleneck
3. decide if the code belongs in TypeScript or a Rust hot path
4. only then add new Rust boundaries
5. validate with objective benchmarking before broadening scope

This ensures the stack stays fast while preserving maintainability.

## 8. Setup-to-Recovery Workflow

When moving between machines or recovering from a reset:

1. Recreate the workspace tree.
2. Re-clone the canonical repos.
3. Reinstall dependencies.
4. Re-run validation commands.
5. Re-verify Otto integration contracts and payload assumptions.
6. Confirm local gap-fillers and extension repos exist and match the saved inventory.
7. Update the playbook if any repo or tool entry changed.

## 9. Recovery Checklist

Use this concise checklist during a rebuild:

- [ ] workspace directories created
- [ ] Maestro repo cloned
- [ ] Otto repo cloned
- [ ] extension repos identified and cloned
- [ ] gap-filler repos created if needed
- [ ] Node dependencies installed
- [ ] Rust toolchain installed and checked
- [ ] TypeScript validation passed
- [ ] test suite passed
- [ ] install/bootstrap checks completed
- [ ] process notes updated

## 10. Documentation Maintenance Rule

The environment is only reproducible if the documentation stays current. Any time a new tool, repo, MCP server, or local process is introduced, record it here and in the primary architecture or README documentation.

This is the process guardrail for continuity between workstations and disaster recovery.
