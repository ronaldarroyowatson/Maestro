import { describe, expect, it } from 'vitest';
import { ComponentRegistry } from '../../../src/component-registry/index.js';
import type { Pipeline } from '../../../src/shared/index.js';
import { NodeGraph } from '../../node-graph/index.js';
import { PipelineFeature } from '../index.js';
import { PipelineBuilder } from '../services/pipeline-builder/index.js';
import { PipelineBuilderError } from '../models/types.js';

function fakeProviderRegistry() {
  return {
    listAll: async () => ({ entries: [], lastDiscoveredAt: new Date() })
  } as unknown as import('../../provider-registry/index.js').ProviderRegistry;
}

function registerComponent(registry: ComponentRegistry, type: 'prompt-template' | 'context-config' | 'vocabulary-registry' | 'schema' | 'rule-set', id: string) {
  const now = new Date();
  registry.register(
    type,
    {
      id,
      version: '1.0.0',
      contentHash: `${id}-hash`,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      changelog: 'init'
    },
    true
  );
}

describe('pipeline feature', () => {
  it('snapshot immutability holds after source pipeline mutation', async () => {
    const componentRegistry = new ComponentRegistry(':memory:');
    registerComponent(componentRegistry, 'prompt-template', 'pt1');

    const pipelineFeature = new PipelineFeature(componentRegistry, fakeProviderRegistry());
    const builder = new PipelineBuilder(new NodeGraph());
    const pipeline = builder
      .addNode({ instanceId: 'n1', nodeTypeId: 'trigger', config: { role: 'entry', promptTemplateId: 'pt1' }, position: { x: 0, y: 0 } })
      .addNode({ instanceId: 'n2', nodeTypeId: 'trigger', config: { role: 'exit' }, position: { x: 1, y: 0 } })
      .setMetadata({ name: 'p', description: '', tags: [], createdAt: new Date(), updatedAt: new Date() })
      .build();

    const snapshot = await pipelineFeature.snapshot.createSnapshot(pipeline);
    const before = JSON.stringify(snapshot);

    pipeline.metadata.name = 'mutated';
    pipeline.graph.nodes[0].config.role = 'mutated';

    expect(JSON.stringify(snapshot)).toBe(before);
  });

  it('round-trip snapshot -> xml -> snapshot preserves graph shape', async () => {
    const componentRegistry = new ComponentRegistry(':memory:');
    const pipelineFeature = new PipelineFeature(componentRegistry, fakeProviderRegistry());
    const builder = new PipelineBuilder(new NodeGraph());

    const pipeline = builder
      .addNode({ instanceId: 'n1', nodeTypeId: 'trigger', config: { role: 'entry' }, position: { x: 0, y: 0 } })
      .addNode({ instanceId: 'n2', nodeTypeId: 'trigger', config: { role: 'exit' }, position: { x: 1, y: 0 } })
      .setMetadata({ name: 'p', description: '', tags: [], createdAt: new Date(), updatedAt: new Date() })
      .build();

    const snapshot = await pipelineFeature.snapshot.createSnapshot(pipeline);
    const xml = pipelineFeature.descriptorExporter.export(snapshot);
    const imported = pipelineFeature.descriptorImporter.import(xml);

    expect(imported.pipeline.id).toBe(snapshot.pipeline.id);
    expect(imported.pipeline.graph.nodes.length).toBe(snapshot.pipeline.graph.nodes.length);
    expect(imported.pipeline.graph.edges.length).toBe(snapshot.pipeline.graph.edges.length);
  });

  it('pipeline-validator rejects missing agent descriptor', async () => {
    const componentRegistry = new ComponentRegistry(':memory:');
    const pipelineFeature = new PipelineFeature(componentRegistry, fakeProviderRegistry());
    const builder = new PipelineBuilder(new NodeGraph());

    const pipeline: Pipeline = builder
      .addNode({ instanceId: 'n1', nodeTypeId: 'trigger', config: { role: 'entry' }, position: { x: 0, y: 0 } })
      .addNode({ instanceId: 'n2', nodeTypeId: 'agent', config: { agentDescriptorId: 'missing:descriptor' }, position: { x: 1, y: 0 } })
      .addNode({ instanceId: 'n3', nodeTypeId: 'trigger', config: { role: 'exit' }, position: { x: 2, y: 0 } })
      .setMetadata({ name: 'p', description: '', tags: [], createdAt: new Date(), updatedAt: new Date() })
      .build();

    const validation = await pipelineFeature.pipelineValidator.validate(pipeline);
    expect(validation.valid).toBe(false);
    expect(validation.catalogIssues.length).toBeGreaterThan(0);
  });

  it('builder throws and includes validation errors when edge references missing node', () => {
    const builder = new PipelineBuilder(new NodeGraph());

    expect(() =>
      builder
        .addNode({ instanceId: 'n1', nodeTypeId: 'trigger', config: { role: 'entry' }, position: { x: 0, y: 0 } })
        .addNode({ instanceId: 'n2', nodeTypeId: 'trigger', config: { role: 'exit' }, position: { x: 1, y: 0 } })
        .addEdge({ edgeId: 'e1', fromNodeId: 'n1', fromPort: 'out', toNodeId: 'missing', toPort: 'in' })
        .setMetadata({ name: 'p', description: '', tags: [], createdAt: new Date(), updatedAt: new Date() })
        .build()
    ).toThrowError(PipelineBuilderError);

    try {
      builder
        .addNode({ instanceId: 'm1', nodeTypeId: 'trigger', config: { role: 'entry' }, position: { x: 0, y: 0 } })
        .addNode({ instanceId: 'm2', nodeTypeId: 'trigger', config: { role: 'exit' }, position: { x: 1, y: 0 } })
        .addEdge({ edgeId: 'e2', fromNodeId: 'm1', fromPort: 'out', toNodeId: 'missing', toPort: 'in' })
        .setMetadata({ name: 'p2', description: '', tags: [], createdAt: new Date(), updatedAt: new Date() })
        .build();
    } catch (error) {
      const builderError = error as PipelineBuilderError;
      expect(builderError.errors.length).toBeGreaterThan(0);
    }
  });
});
