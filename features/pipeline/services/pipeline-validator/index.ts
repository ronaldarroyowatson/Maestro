import type { Pipeline } from '../../../../src/shared/index.js';
import { NodeGraph } from '../../../node-graph/index.js';
import type { ProviderRegistry } from '../../../provider-registry/index.js';
import type { ComponentRegistry } from '../../../../src/component-registry/index.js';
import type { MissingComponent, MissingDescriptor, PipelineValidationResult } from '../../models/types.js';

/** Performs deep pre-execution validation for pipelines. */
export class PipelineValidator {
  constructor(
    private readonly nodeGraph: NodeGraph,
    private readonly providerRegistry: ProviderRegistry,
    private readonly componentRegistry: ComponentRegistry
  ) {}

  /** Validates graph structure plus agent catalog/component references. */
  async validate(pipeline: Pipeline): Promise<PipelineValidationResult> {
    const graphValidation = this.nodeGraph.validate(pipeline.graph);

    const catalog = await this.providerRegistry.listAll();
    const catalogIds = new Set(catalog.entries.map((entry) => entry.descriptorId));

    const catalogIssues: MissingDescriptor[] = [];
    const componentIssues: MissingComponent[] = [];

    for (const node of pipeline.graph.nodes) {
      if (node.nodeTypeId.includes('agent')) {
        const descriptorId = String(node.config.agentDescriptorId ?? '');
        if (descriptorId && !catalogIds.has(descriptorId)) {
          catalogIssues.push({
            nodeId: node.instanceId,
            agentDescriptorId: descriptorId,
            message: `Missing agent descriptor ${descriptorId}`
          });
        }
      }

      const componentChecks: Array<{ key: string; type: MissingComponent['componentType'] }> = [
        { key: 'promptTemplateId', type: 'prompt-template' },
        { key: 'contextConfigId', type: 'context-config' },
        { key: 'vocabularyRegistryId', type: 'vocabulary-registry' },
        { key: 'schemaId', type: 'schema' },
        { key: 'ruleSetId', type: 'rule-set' }
      ];

      for (const check of componentChecks) {
        const componentId = String(node.config[check.key] ?? '');
        if (!componentId) {
          continue;
        }
        try {
          this.componentRegistry.versionResolver.resolve(check.type, componentId);
        } catch {
          componentIssues.push({
            nodeId: node.instanceId,
            componentId,
            componentType: check.type,
            message: `Missing active ${check.type} ${componentId}`
          });
        }
      }
    }

    return {
      valid: graphValidation.valid && catalogIssues.length === 0 && componentIssues.length === 0,
      graphErrors: graphValidation.errors,
      catalogIssues,
      componentIssues
    };
  }
}
