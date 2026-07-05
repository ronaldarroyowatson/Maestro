import { randomUUID } from 'node:crypto';
import type { Edge, NodeInstance, Pipeline, PipelineMetadata } from '../../../../src/shared/index.js';
import { sha256 } from '../../../../src/shared/index.js';
import { NodeGraph } from '../../../node-graph/index.js';
import { PipelineBuilderError } from '../../models/types.js';

/** Fluent pipeline builder that validates graph before materialization. */
export class PipelineBuilder {
  private readonly nodes: NodeInstance[] = [];
  private readonly edges: Edge[] = [];
  private metadata: PipelineMetadata = {
    name: 'Untitled Pipeline',
    description: '',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  constructor(private readonly nodeGraph: NodeGraph) {}

  /** Adds a node instance to the pipeline graph. */
  addNode(nodeInstance: NodeInstance): this {
    this.nodes.push(nodeInstance);
    return this;
  }

  /** Adds an edge to the pipeline graph. */
  addEdge(edge: Edge): this {
    this.edges.push(edge);
    return this;
  }

  /** Sets pipeline metadata. */
  setMetadata(metadata: PipelineMetadata): this {
    this.metadata = metadata;
    return this;
  }

  /** Builds and validates immutable pipeline artifact. */
  build(): Pipeline {
    const graph = {
      graphId: randomUUID(),
      nodes: [...this.nodes],
      edges: [...this.edges]
    };

    const validation = this.nodeGraph.validate(graph);
    if (!validation.valid) {
      throw new PipelineBuilderError(validation.errors);
    }

    const now = new Date();
    const pipeline: Pipeline = {
      id: randomUUID(),
      version: '1.0.0',
      contentHash: sha256(JSON.stringify(graph)),
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      changelog: 'Initial pipeline build',
      graph,
      metadata: { ...this.metadata, createdAt: now, updatedAt: now }
    };

    return pipeline;
  }
}
