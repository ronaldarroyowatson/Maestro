import { randomUUID } from 'node:crypto';
import type { Pipeline, PipelineSnapshot } from '../../../../src/shared/index.js';
import { DescriptorImportError } from '../../models/types.js';
import type { ComponentRegistry } from '../../../../src/component-registry/index.js';

function extractAttribute(source: string, name: string): string {
  const regex = new RegExp(`${name}=\\"([^\\"]*)\\"`);
  const match = source.match(regex);
  return match?.[1] ?? '';
}

function unescapeXml(value: string): string {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

/** Imports and validates XML pipeline descriptors into snapshot objects. */
export class DescriptorImporter {
  constructor(private readonly componentRegistry: ComponentRegistry) {}

  private validateXmlShape(xml: string): void {
    if (!xml.includes('<MaestroPipeline') || !xml.includes('<Metadata>') || !xml.includes('<Nodes>') || !xml.includes('<Edges>')) {
      throw new DescriptorImportError('XML does not match MaestroPipeline descriptor schema');
    }
  }

  /** Parses XML descriptor and reconstructs pipeline snapshot. */
  import(xml: string): PipelineSnapshot {
    this.validateXmlShape(xml);

    const rootTagMatch = xml.match(/<MaestroPipeline[^>]*>/);
    if (!rootTagMatch) {
      throw new DescriptorImportError('Missing MaestroPipeline root element');
    }

    const rootTag = rootTagMatch[0];
    const snapshotId = extractAttribute(rootTag, 'snapshotId') || randomUUID();
    const maestroVersion = extractAttribute(rootTag, 'maestroVersion') || '0.1.1';

    const nodeMatches = [...xml.matchAll(/<Node id=\"([^\"]+)\" typeId=\"([^\"]+)\">([^<]*)<\/Node>/g)];
    const edgeMatches = [...xml.matchAll(/<Edge id=\"([^\"]+)\" from=\"([^\"]+)\" fromPort=\"([^\"]+)\" to=\"([^\"]+)\" toPort=\"([^\"]+)\" reviewerNodeId=\"([^\"]*)\" \/>/g)];

    const nodes = nodeMatches.map((match) => ({
      instanceId: match[1],
      nodeTypeId: match[2],
      config: match[3] ? JSON.parse(unescapeXml(match[3])) : {},
      position: { x: 0, y: 0 }
    }));

    const edges = edgeMatches.map((match) => ({
      edgeId: match[1],
      fromNodeId: match[2],
      fromPort: match[3],
      toNodeId: match[4],
      toPort: match[5],
      reviewerNodeId: match[6] || undefined
    }));

    const pipelineIdMatch = xml.match(/<PipelineId>([^<]*)<\/PipelineId>/);
    const pipelineVersionMatch = xml.match(/<PipelineVersion>([^<]*)<\/PipelineVersion>/);
    const pipelineHashMatch = xml.match(/<PipelineHash>([^<]*)<\/PipelineHash>/);

    const pipeline: Pipeline = {
      id: pipelineIdMatch?.[1] ?? randomUUID(),
      version: pipelineVersionMatch?.[1] ?? '1.0.0',
      contentHash: pipelineHashMatch?.[1] ?? '',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      changelog: 'Imported from descriptor',
      metadata: {
        name: 'Imported Pipeline',
        description: '',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      graph: {
        graphId: randomUUID(),
        nodes,
        edges
      }
    };

    const snapshot: PipelineSnapshot = {
      snapshotId,
      contentHash: pipeline.contentHash,
      pipeline,
      components: {
        promptTemplates: [],
        contextConfigs: [],
        vocabularyRegistries: [],
        schemas: [],
        ruleSets: []
      },
      maestroVersion,
      createdAt: new Date()
    };

    // Idempotent embedded component registration placeholders.
    void this.componentRegistry;

    return snapshot;
  }
}
