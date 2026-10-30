import type { ResourceNode, ResourceRelationship } from '../../../../src/shared/index.js';

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

  addRelationship(fromNodeId: string, toNodeId: string, kind: ResourceRelationship['kind'], metadata: Record<string, unknown> = {}): ResourceRelationship | undefined {
    const source = this.resources.get(fromNodeId);
    const target = this.resources.get(toNodeId);
    if (!source || !target) {
      return undefined;
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
