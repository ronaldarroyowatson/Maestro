import { readFileSync } from 'node:fs';
import path from 'node:path';

interface NodeGraphPortSpec {
  id: string;
  direction: 'in' | 'out';
  dataType: string;
  required: boolean;
}

interface NodeGraphTypeSpec {
  id: string;
  label: string;
  icon: string;
  color: string;
  ports: NodeGraphPortSpec[];
}

interface NodeGraphCanvasSpec {
  pan: boolean;
  zoom: boolean;
  grid: boolean;
  minimap: boolean;
  theme: 'dark' | 'light' | 'system';
  nodeSelection: boolean;
}

interface NodeGraphNodeSpec {
  id: string;
  type: string;
  label: string;
  status: 'idle' | 'running' | 'complete' | 'failed' | 'paused' | 'skipped';
  group: string;
}

interface NodeGraphEdgeSpec {
  id: string;
  from: string;
  to: string;
  fromPort: string;
  toPort: string;
  condition?: string;
}

interface NodeGraphSpec {
  id: string;
  name: string;
  nodes: NodeGraphNodeSpec[];
  edges: NodeGraphEdgeSpec[];
}

interface MaestroNodeGraphContract {
  version: string;
  runtime: string;
  canvas: NodeGraphCanvasSpec;
  nodeTypes: NodeGraphTypeSpec[];
  graphs: NodeGraphSpec[];
}

export function loadMaestroNodeGraphContract(repoRoot: string): MaestroNodeGraphContract {
  const contractPath = path.join(repoRoot, 'ui', 'nodes', 'maestro-node-graphs.json');
  return JSON.parse(readFileSync(contractPath, 'utf8')) as MaestroNodeGraphContract;
}

export function validateMaestroNodeGraphContract(repoRoot: string): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  const contract = loadMaestroNodeGraphContract(repoRoot);

  if (contract.runtime !== 'maestro') {
    problems.push(`Invalid runtime '${contract.runtime}'. Expected 'maestro'.`);
  }

  const requiredCanvasFlags: Array<keyof NodeGraphCanvasSpec> = ['pan', 'zoom', 'grid', 'minimap', 'nodeSelection'];
  for (const flag of requiredCanvasFlags) {
    if (typeof contract.canvas[flag] !== 'boolean') {
      problems.push(`Node graph canvas flag '${flag}' must be boolean.`);
    }
  }

  if (!['dark', 'light', 'system'].includes(contract.canvas.theme)) {
    problems.push(`Node graph canvas theme '${contract.canvas.theme}' is invalid.`);
  }

  const nodeTypeIds = new Set(contract.nodeTypes.map((type) => type.id));
  for (const nodeType of contract.nodeTypes) {
    if (nodeType.ports.length === 0) {
      problems.push(`Node type '${nodeType.id}' must declare at least one port.`);
      continue;
    }

    const hasOutput = nodeType.ports.some((port) => port.direction === 'out');
    if (!hasOutput) {
      problems.push(`Node type '${nodeType.id}' must declare at least one output port.`);
    }
  }

  for (const graph of contract.graphs) {
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();
    for (const node of graph.nodes) {
      if (nodeIds.has(node.id)) {
        problems.push(`Graph '${graph.id}' contains duplicate node id '${node.id}'.`);
      }
      nodeIds.add(node.id);

      if (!nodeTypeIds.has(node.type)) {
        problems.push(`Graph '${graph.id}' references unknown node type '${node.type}'.`);
      }
    }

    for (const edge of graph.edges) {
      if (edgeIds.has(edge.id)) {
        problems.push(`Graph '${graph.id}' contains duplicate edge id '${edge.id}'.`);
      }
      edgeIds.add(edge.id);

      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
        problems.push(`Graph '${graph.id}' edge '${edge.id}' references unknown node id.`);
        continue;
      }

      const fromTypeId = graph.nodes.find((node) => node.id === edge.from)?.type;
      const toTypeId = graph.nodes.find((node) => node.id === edge.to)?.type;
      const fromType = contract.nodeTypes.find((type) => type.id === fromTypeId);
      const toType = contract.nodeTypes.find((type) => type.id === toTypeId);

      if (!fromType?.ports.some((port) => port.id === edge.fromPort && port.direction === 'out')) {
        problems.push(`Graph '${graph.id}' edge '${edge.id}' references invalid output port '${edge.fromPort}'.`);
      }
      if (!toType?.ports.some((port) => port.id === edge.toPort && port.direction === 'in')) {
        problems.push(`Graph '${graph.id}' edge '${edge.id}' references invalid input port '${edge.toPort}'.`);
      }
    }
  }

  return {
    ok: problems.length === 0,
    problems
  };
}
