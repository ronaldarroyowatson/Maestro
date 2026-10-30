import type { ResourceNode, ResourceRelationship } from '../../../../src/shared/index.js';

export interface ResourceRegistryFilter {
  type?: ResourceNode['type'];
  status?: ResourceNode['status'];
  tags?: string[];
  category?: string;
  nameContains?: string;
}

export interface ResourceInventorySnapshot {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
}

export class ResourceRegistry {
  private readonly resources = new Map<string, ResourceNode>();

  create(node: ResourceNode): ResourceNode {
    return this.upsert(node);
  }

  update(nodeId: string, next: Partial<ResourceNode>): ResourceNode | undefined {
    const existing = this.resources.get(nodeId);
    if (!existing) {
      return undefined;
    }

    const updated = {
      ...existing,
      ...next,
      relationships: next.relationships ?? existing.relationships ?? []
    };

    this.resources.set(nodeId, updated);
    return updated;
  }

  remove(nodeId: string): boolean {
    return this.resources.delete(nodeId);
  }

  lookup(nodeId: string): ResourceNode | undefined {
    return this.resources.get(nodeId);
  }

  list(): ResourceNode[] {
    return Array.from(this.resources.values()).sort((left, right) => left.name.localeCompare(right.name));
  }

  findByType(type: ResourceNode['type']): ResourceNode[] {
    return this.list().filter((node) => node.type === type);
  }

  findByTag(tag: string): ResourceNode[] {
    return this.list().filter((node) => node.tags.includes(tag));
  }

  filter(criteria: ResourceRegistryFilter): ResourceNode[] {
    const lowerName = criteria.nameContains?.toLowerCase();
    return this.list().filter((node) => {
      if (criteria.type && node.type !== criteria.type) {
        return false;
      }

      if (criteria.status && node.status !== criteria.status) {
        return false;
      }

      if (criteria.tags && criteria.tags.length > 0 && !criteria.tags.every((tag) => node.tags.includes(tag))) {
        return false;
      }

      if (criteria.category && String(node.metadata.category ?? '') !== criteria.category) {
        return false;
      }

      if (lowerName && !node.name.toLowerCase().includes(lowerName)) {
        return false;
      }

      return true;
    });
  }

  search(query: string): ResourceNode[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    return this.list().filter((node) => {
      if (node.name.toLowerCase().includes(normalized)) {
        return true;
      }

      if ((node.path ?? '').toLowerCase().includes(normalized)) {
        return true;
      }

      return Object.values(node.metadata).some((value) => String(value).toLowerCase().includes(normalized));
    });
  }

  updateStatus(nodeId: string, status: ResourceNode['status'], reason?: string): ResourceNode | undefined {
    const node = this.resources.get(nodeId);
    if (!node) {
      return undefined;
    }

    const metadata = {
      ...node.metadata,
      statusReason: reason,
      statusUpdatedAt: new Date().toISOString()
    };
    const updated: ResourceNode = {
      ...node,
      status,
      metadata,
      lastSeen: new Date()
    };
    this.resources.set(nodeId, updated);
    return updated;
  }

  updateHealth(nodeId: string, health: { healthy: boolean; reason?: string; checkedAt?: Date }): ResourceNode | undefined {
    const nextStatus: ResourceNode['status'] = health.healthy ? 'healthy' : 'degraded';
    const checkedAt = (health.checkedAt ?? new Date()).toISOString();
    return this.update(nodeId, {
      status: nextStatus,
      metadata: {
        ...(this.lookup(nodeId)?.metadata ?? {}),
        health: {
          healthy: health.healthy,
          reason: health.reason,
          checkedAt
        }
      },
      lastSeen: health.checkedAt ?? new Date()
    });
  }

  assignCategory(nodeId: string, category: string): ResourceNode | undefined {
    const node = this.resources.get(nodeId);
    if (!node) {
      return undefined;
    }

    return this.update(nodeId, {
      metadata: {
        ...node.metadata,
        category
      }
    });
  }

  addTags(nodeId: string, tags: string[]): ResourceNode | undefined {
    const node = this.resources.get(nodeId);
    if (!node) {
      return undefined;
    }

    const nextTags = new Set(node.tags);
    for (const tag of tags) {
      if (tag.trim()) {
        nextTags.add(tag.trim());
      }
    }

    return this.update(nodeId, {
      tags: Array.from(nextTags)
    });
  }

  removeTags(nodeId: string, tags: string[]): ResourceNode | undefined {
    const node = this.resources.get(nodeId);
    if (!node) {
      return undefined;
    }

    const removeSet = new Set(tags);
    return this.update(nodeId, {
      tags: node.tags.filter((tag) => !removeSet.has(tag))
    });
  }

  removeMissing(lastSeenBefore: Date): number {
    const toRemove = Array.from(this.resources.values()).filter((node) => node.status === 'missing' && node.lastSeen.getTime() < lastSeenBefore.getTime());
    for (const node of toRemove) {
      this.resources.delete(node.id);
    }
    return toRemove.length;
  }

  markMissingForAbsent(activeResourceIds: string[], options: { ignoreIds?: string[] } = {}): number {
    const active = new Set(activeResourceIds);
    const ignored = new Set(options.ignoreIds ?? []);
    let marked = 0;

    for (const node of this.resources.values()) {
      if (ignored.has(node.id)) {
        continue;
      }

      if (!active.has(node.id) && node.status !== 'missing') {
        this.updateStatus(node.id, 'missing', 'Resource not present in latest discovery scan');
        marked += 1;
      }
    }

    return marked;
  }

  getInventorySnapshot(): ResourceInventorySnapshot {
    const snapshot: ResourceInventorySnapshot = {
      total: 0,
      byType: {},
      byStatus: {},
      byCategory: {}
    };

    for (const node of this.resources.values()) {
      snapshot.total += 1;
      snapshot.byType[node.type] = (snapshot.byType[node.type] ?? 0) + 1;
      snapshot.byStatus[node.status] = (snapshot.byStatus[node.status] ?? 0) + 1;
      const category = String(node.metadata.category ?? 'uncategorized');
      snapshot.byCategory[category] = (snapshot.byCategory[category] ?? 0) + 1;
    }

    return snapshot;
  }

  addRelationship(fromNodeId: string, toNodeId: string, kind: ResourceRelationship['kind'], metadata: Record<string, unknown> = {}): ResourceRelationship | undefined {
    const source = this.resources.get(fromNodeId);
    const target = this.resources.get(toNodeId);
    if (!source || !target) {
      return undefined;
    }

    const existing = source.relationships.find((relationship) => relationship.to === toNodeId && relationship.kind === kind);
    if (existing) {
      return existing;
    }

    const nextRelationship: ResourceRelationship = {
      id: `${fromNodeId}->${toNodeId}:${kind}`,
      from: fromNodeId,
      to: toNodeId,
      kind,
      metadata
    };

    source.relationships.push(nextRelationship);
    target.relationships.push({
      id: `${toNodeId}<-${fromNodeId}:${kind}`,
      from: toNodeId,
      to: fromNodeId,
      kind: kind === 'contains' ? 'contains' : 'references',
      metadata
    });

    return nextRelationship;
  }

  upsert(node: ResourceNode): ResourceNode {
    const existing = this.resources.get(node.id);
    if (!existing) {
      const created = {
        ...node,
        tags: Array.from(new Set(node.tags)),
        relationships: node.relationships ?? []
      };
      this.resources.set(node.id, created);
      return created;
    }

    const merged: ResourceNode = {
      ...existing,
      ...node,
      createdAt: existing.createdAt,
      tags: Array.from(new Set([...existing.tags, ...node.tags])),
      metadata: {
        ...existing.metadata,
        ...node.metadata
      },
      relationships: existing.relationships.length > 0 ? existing.relationships : node.relationships ?? []
    };

    this.resources.set(node.id, merged);
    return merged;
  }
}

export const DEFAULT_RESOURCE_REGISTRY = new ResourceRegistry();
