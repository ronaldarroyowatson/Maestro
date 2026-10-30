import type { ResourceNode, ResourceRelationship } from '../../../../src/shared/index.js';

export interface ResourceRegistryFilter {
  type?: ResourceNode['type'];
  status?: ResourceNode['status'];
  tags?: string[];
  nameContains?: string;
}

export class ResourceRegistry {
  private readonly resources = new Map<string, ResourceNode>();

  create(node: ResourceNode): ResourceNode {
    this.resources.set(node.id, {
      ...node,
      relationships: node.relationships ?? []
    });
    return this.resources.get(node.id)!;
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

  removeMissing(lastSeenBefore: Date): number {
    const toRemove = Array.from(this.resources.values()).filter((node) => node.status === 'missing' && node.lastSeen.getTime() < lastSeenBefore.getTime());
    for (const node of toRemove) {
      this.resources.delete(node.id);
    }
    return toRemove.length;
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
    return this.create(node);
  }
}

export const DEFAULT_RESOURCE_REGISTRY = new ResourceRegistry();
