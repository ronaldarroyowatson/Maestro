# Local AI Discovery Registry Schema and Operations Guide

## Purpose

The local AI discovery registry is the canonical source of truth for discovered Resource Nodes and their relationships.

## Resource Schema

Each registry entry uses the shared `ResourceNode` contract:

- `id`
- `name`
- `type`
- `status`
- `tags`
- `metadata`
- `relationships`
- `discoveredBy`
- `createdAt`
- `lastSeen`
- `path`

## Supported Operations

### CRUD and upsert

- `create(node)`
- `update(nodeId, partial)`
- `remove(nodeId)`
- `lookup(nodeId)`
- `upsert(node)` with merge semantics

### Query and inventory

- `list()`
- `findByType(type)`
- `findByTag(tag)`
- `search(query)`
- `filter({ type, status, tags, category, nameContains })`
- `getInventorySnapshot()`

### Lifecycle and health

- `updateStatus(nodeId, status, reason?)`
- `updateHealth(nodeId, { healthy, reason?, checkedAt? })`
- `markMissingForAbsent(activeIds, { ignoreIds? })`
- `removeMissing(lastSeenBefore)`

### Categorization and tags

- `assignCategory(nodeId, category)`
- `addTags(nodeId, tags)`
- `removeTags(nodeId, tags)`

### Relationship management

- `addRelationship(from, to, kind, metadata?)`
- Duplicate relationship insertion is suppressed for deterministic graph state.

## Health-State Definitions

- `healthy`: resource responds and is usable.
- `detected`: resource is present but not fully validated.
- `degraded`: resource present but with failing/partial health checks.
- `missing`: previously known resource absent from current discovery.
- `unknown`: state cannot yet be determined.

## Registry Lifecycle Rules

1. Discovery writes/updates resources via `create`/`upsert`.
2. Relationship edges are added after resource persistence.
3. Each scan calls `markMissingForAbsent` for stale detection.
4. Optional cleanup uses `removeMissing` with explicit cutoff.
5. UI and orchestration should consume registry query APIs rather than mutate state directly.
