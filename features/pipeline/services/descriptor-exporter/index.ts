import type { PipelineSnapshot } from '../../../../src/shared/index.js';

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/** Exports pipeline snapshots to self-contained XML descriptor format. */
export class DescriptorExporter {
  /** Serializes snapshot into MaestroPipeline XML descriptor string. */
  export(snapshot: PipelineSnapshot): string {
    const nodesXml = snapshot.pipeline.graph.nodes
      .map((node) => `<Node id=\"${escapeXml(node.instanceId)}\" typeId=\"${escapeXml(node.nodeTypeId)}\">${escapeXml(JSON.stringify(node.config))}</Node>`)
      .join('');

    const edgesXml = snapshot.pipeline.graph.edges
      .map(
        (edge) =>
          `<Edge id=\"${escapeXml(edge.edgeId)}\" from=\"${escapeXml(edge.fromNodeId)}\" fromPort=\"${escapeXml(edge.fromPort)}\" to=\"${escapeXml(edge.toNodeId)}\" toPort=\"${escapeXml(edge.toPort)}\" reviewerNodeId=\"${escapeXml(edge.reviewerNodeId ?? '')}\" />`
      )
      .join('');

    const componentsXml = [
      ['PromptTemplates', snapshot.components.promptTemplates],
      ['ContextConfigs', snapshot.components.contextConfigs],
      ['VocabularyRegistries', snapshot.components.vocabularyRegistries],
      ['Schemas', snapshot.components.schemas],
      ['RuleSets', snapshot.components.ruleSets]
    ]
      .map(
        ([name, values]) =>
          `<${name}>${(values as Array<{ id: string; version: string; contentHash: string }>).map((item) => `<Artifact id=\"${escapeXml(item.id)}\" version=\"${escapeXml(item.version)}\" contentHash=\"${escapeXml(item.contentHash)}\" />`).join('')}</${name}>`
      )
      .join('');

    return `<?xml version=\"1.0\" encoding=\"UTF-8\"?><MaestroPipeline version=\"1.0\" snapshotId=\"${escapeXml(snapshot.snapshotId)}\" maestroVersion=\"${escapeXml(snapshot.maestroVersion)}\"><Metadata><PipelineId>${escapeXml(snapshot.pipeline.id)}</PipelineId><PipelineVersion>${escapeXml(snapshot.pipeline.version)}</PipelineVersion><PipelineHash>${escapeXml(snapshot.pipeline.contentHash)}</PipelineHash></Metadata><Nodes>${nodesXml}</Nodes><Edges>${edgesXml}</Edges>${componentsXml}</MaestroPipeline>`;
  }
}
