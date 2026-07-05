import { randomUUID } from 'node:crypto';
import { sha256, type Pipeline, type PipelineSnapshot, type SnapshotComponents, type VersionedArtifact } from '../../../../src/shared/index.js';
import type { ComponentRegistry } from '../../../../src/component-registry/index.js';

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

/** Creates immutable pipeline snapshots with embedded active component versions. */
export class SnapshotService {
  constructor(private readonly componentRegistry: ComponentRegistry, private readonly maestroVersion = '0.1.1') {}

  private resolveMany(type: 'prompt-template' | 'context-config' | 'vocabulary-registry' | 'schema' | 'rule-set', ids: string[]): VersionedArtifact[] {
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    return uniqueIds.map((id) => this.componentRegistry.versionResolver.resolve(type, id));
  }

  /** Creates immutable snapshot by embedding all referenced active components. */
  async createSnapshot(pipeline: Pipeline): Promise<PipelineSnapshot> {
    const promptTemplateIds = pipeline.graph.nodes.map((node) => String(node.config.promptTemplateId ?? '')).filter(Boolean);
    const contextConfigIds = pipeline.graph.nodes.map((node) => String(node.config.contextConfigId ?? '')).filter(Boolean);
    const vocabularyRegistryIds = pipeline.graph.nodes.map((node) => String(node.config.vocabularyRegistryId ?? '')).filter(Boolean);
    const schemaIds = pipeline.graph.nodes.map((node) => String(node.config.schemaId ?? '')).filter(Boolean);
    const ruleSetIds = pipeline.graph.nodes.map((node) => String(node.config.ruleSetId ?? '')).filter(Boolean);

    const components: SnapshotComponents = {
      promptTemplates: this.resolveMany('prompt-template', promptTemplateIds),
      contextConfigs: this.resolveMany('context-config', contextConfigIds),
      vocabularyRegistries: this.resolveMany('vocabulary-registry', vocabularyRegistryIds),
      schemas: this.resolveMany('schema', schemaIds),
      ruleSets: this.resolveMany('rule-set', ruleSetIds)
    };

    const frozenPipeline = deepClone(pipeline);
    const frozenComponents = deepClone(components);

    const base = {
      snapshotId: randomUUID(),
      pipeline: frozenPipeline,
      components: frozenComponents,
      maestroVersion: this.maestroVersion,
      createdAt: new Date()
    };

    const contentHash = sha256(JSON.stringify(base));
    return {
      ...base,
      contentHash
    };
  }
}
