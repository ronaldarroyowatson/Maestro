import { NodeGraph } from '../node-graph/index.js';
import type { ComponentRegistry } from '../../src/component-registry/index.js';
import type { ProviderRegistry } from '../provider-registry/index.js';
import type { Pipeline } from '../../src/shared/index.js';
import { DescriptorExporter } from './services/descriptor-exporter/index.js';
import { DescriptorImporter } from './services/descriptor-importer/index.js';
import { PipelineBuilder } from './services/pipeline-builder/index.js';
import { PipelineStore } from './services/pipeline-store/index.js';
import { PipelineValidator } from './services/pipeline-validator/index.js';
import { SnapshotService } from './services/snapshot/index.js';

export type {
  DescriptorExportResult,
  MissingComponent,
  MissingDescriptor,
  PipelineValidationResult,
  SnapshotRecord
} from './models/types.js';
export { DescriptorImportError, PipelineBuilderError } from './models/types.js';

/** Pipeline feature facade for build/store/validate/snapshot/descriptor lifecycle. */
export class PipelineFeature {
  readonly pipelineBuilder: PipelineBuilder;
  readonly pipelineStore: PipelineStore;
  readonly pipelineValidator: PipelineValidator;
  readonly snapshot: SnapshotService;
  readonly descriptorExporter: DescriptorExporter;
  readonly descriptorImporter: DescriptorImporter;

  constructor(
    componentRegistry: ComponentRegistry,
    providerRegistry: ProviderRegistry,
    storePath = ':memory:'
  ) {
    const nodeGraph = new NodeGraph();
    this.pipelineBuilder = new PipelineBuilder(nodeGraph);
    this.pipelineStore = new PipelineStore(storePath);
    this.pipelineValidator = new PipelineValidator(nodeGraph, providerRegistry, componentRegistry);
    this.snapshot = new SnapshotService(componentRegistry);
    this.descriptorExporter = new DescriptorExporter();
    this.descriptorImporter = new DescriptorImporter(componentRegistry);
  }

  /** Saves pipeline as immutable version and optionally activates it. */
  save(pipeline: Pipeline, activate = false): void {
    this.pipelineStore.save(pipeline);
    if (activate) {
      this.pipelineStore.activate(pipeline.id, pipeline.version);
    }
  }
}
