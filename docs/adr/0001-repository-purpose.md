# ADR 0001: Repository Purpose and Boundaries

## Status

Accepted

## Context

Maestro is the orchestration runtime for Otto graph-based execution, discovery, routing, and governance. The repository must stay focused on orchestration behavior and not drift into provider-specific or infrastructure ownership that belongs in adjacent Otto repos.

## Decision

Maestro owns runtime orchestration, graph execution state, discovery integration, registry logic, command wiring, audit/security enforcement, and operational contracts. Shared platform capabilities remain owned by the Otto ecosystem and are consumed through explicit contracts, adapters, and command-service registration.

## Consequences

- Clear ownership boundaries across the Otto ecosystem
- Reduced duplication and drift across repositories
- Easier compatibility validation and upgrade paths
- Better traceability for commands, permissions, and runtime contracts
