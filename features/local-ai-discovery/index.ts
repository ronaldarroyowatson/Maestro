import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type {
  ResourceNode as SharedResourceNode,
  ResourceRelationship as SharedResourceRelationship
} from '../../src/shared/index.js';
import { ResourceRegistry } from './services/registry/index.js';

export type LocalAiResourceType = SharedResourceNode['type'];
export type ResourceRelationship = SharedResourceRelationship;
export type ResourceNode = SharedResourceNode;

export interface DetectedResource {
  id: string;
  name: string;
  type: LocalAiResourceType;
  path?: string;
  status: 'detected' | 'healthy' | 'degraded' | 'missing' | 'unknown';
  metadata: Record<string, unknown>;
  discoveredBy: string;
  lastSeen: Date;
}

export interface DiscoveryScanContext {
  rootPath?: string;
  environment?: Record<string, string | undefined>;
}

export interface ResourceGraph {
  graphId: string;
  nodes: ResourceNode[];
  edges: ResourceRelationship[];
  scannedAt: Date;
}

export interface DiscoveryScanResult {
  resources: DetectedResource[];
  graph: ResourceGraph;
  scannedAt: Date;
}

export interface DiscoveryScanner {
  readonly id: string;
  readonly type: string;
  scan(context: DiscoveryScanContext): Promise<DetectedResource[]>;
}

export abstract class BaseDiscoveryScanner implements DiscoveryScanner {
  readonly id: string;
  readonly type: string;

  constructor(id: string, type: string) {
    this.id = id;
    this.type = type;
  }

  abstract scan(context: DiscoveryScanContext): Promise<DetectedResource[]>;
}

export class OllamaScanner extends BaseDiscoveryScanner {
  constructor() {
    super('ollama-scanner', 'ollama');
  }

  async scan(context: DiscoveryScanContext): Promise<DetectedResource[]> {
    const env = context.environment ?? process.env;
    const baseDir = context.rootPath ?? os.homedir();
    const directories = [
      env.OLLAMA_MODELS_DIR,
      env.OLLAMA_DIR,
      path.join(baseDir, '.ollama'),
      path.join(baseDir, '.ollama', 'models'),
      path.join(baseDir, 'Library', 'Application Support', 'Ollama'),
      path.join(baseDir, 'AppData', 'Local', 'Ollama')
    ].filter((candidate): candidate is string => Boolean(candidate));

    const seen = new Set<string>();
    const resources: DetectedResource[] = [];

    for (const directory of directories) {
      if (!directory || seen.has(directory)) {
        continue;
      }
      seen.add(directory);

      const exists = await pathExists(directory);
      if (!exists) {
        continue;
      }

      resources.push({
        id: `ollama:${directory}`,
        name: 'Ollama',
        type: 'ollama',
        path: directory,
        status: 'healthy',
        metadata: {
          kind: 'installation',
          detectedFrom: 'ollama-scanner'
        },
        discoveredBy: this.id,
        lastSeen: new Date()
      });
    }

    return resources;
  }
}

export class LmStudioScanner extends BaseDiscoveryScanner {
  constructor() {
    super('lmstudio-scanner', 'lmstudio');
  }

  async scan(context: DiscoveryScanContext): Promise<DetectedResource[]> {
    const baseDir = context.rootPath ?? os.homedir();
    const directories = [
      path.join(baseDir, '.lmstudio'),
      path.join(baseDir, 'Library', 'Application Support', 'LM Studio'),
      path.join(baseDir, 'AppData', 'Local', 'Programs', 'LM Studio'),
      path.join(baseDir, 'AppData', 'Local', 'LM Studio')
    ].filter(Boolean);

    const resources: DetectedResource[] = [];
    for (const directory of directories) {
      const exists = await pathExists(directory);
      if (exists) {
        resources.push({
          id: `lmstudio:${directory}`,
          name: 'LM Studio',
          type: 'lmstudio',
          path: directory,
          status: 'healthy',
          metadata: {
            kind: 'installation',
            detectedFrom: 'lmstudio-scanner'
          },
          discoveredBy: this.id,
          lastSeen: new Date()
        });
      }
    }

    return resources;
  }
}

export class LocalModelScanner extends BaseDiscoveryScanner {
  constructor() {
    super('local-model-scanner', 'model');
  }

  async scan(context: DiscoveryScanContext): Promise<DetectedResource[]> {
    const baseDir = context.rootPath ?? os.homedir();
    const candidateRoots = [
      context.environment?.OLLAMA_MODELS_DIR,
      path.join(baseDir, '.ollama', 'models'),
      path.join(baseDir, 'models'),
      path.join(baseDir, '.cache'),
      path.join(baseDir, 'AppData', 'Local')
    ].filter((candidate): candidate is string => Boolean(candidate));

    const resources: DetectedResource[] = [];
    const processed = new Set<string>();

    for (const root of candidateRoots) {
      if (processed.has(root)) {
        continue;
      }
      processed.add(root);

      const files = await collectModelFiles(root, 0, 4);
      for (const file of files) {
        resources.push({
          id: `model:${file.path}`,
          name: path.basename(file.path),
          type: 'model',
          path: file.path,
          status: 'detected',
          metadata: {
            fileName: path.basename(file.path),
            fileExtension: path.extname(file.path),
            sizeBytes: file.size,
            detectedFrom: 'local-model-scanner'
          },
          discoveredBy: this.id,
          lastSeen: new Date()
        });
      }
    }

    return resources;
  }
}

export class McpScanner extends BaseDiscoveryScanner {
  constructor() {
    super('mcp-scanner', 'mcp');
  }

  async scan(context: DiscoveryScanContext): Promise<DetectedResource[]> {
    const baseDir = context.rootPath ?? os.homedir();
    const candidatePaths = [
      path.join(baseDir, '.config', 'mcp'),
      path.join(baseDir, '.mcp'),
      path.join(baseDir, '.vscode', 'mcp.json'),
      path.join(baseDir, 'mcp.json'),
      path.join(baseDir, '.config', 'mcp.json')
    ];

    const resources: DetectedResource[] = [];
    for (const candidate of candidatePaths) {
      const exists = await pathExists(candidate);
      if (exists) {
        resources.push({
          id: `mcp:${candidate}`,
          name: path.basename(candidate) === 'mcp.json' ? 'MCP Config' : 'MCP Server Directory',
          type: 'mcp',
          path: candidate,
          status: 'healthy',
          metadata: {
            kind: 'configuration',
            detectedFrom: 'mcp-scanner'
          },
          discoveredBy: this.id,
          lastSeen: new Date()
        });
      }
    }

    return resources;
  }
}

export class EndpointScanner extends BaseDiscoveryScanner {
  constructor() {
    super('endpoint-scanner', 'endpoint');
  }

  async scan(context: DiscoveryScanContext): Promise<DetectedResource[]> {
    const env = context.environment ?? process.env;
    const baseUrls = [
      env.OLLAMA_HOST,
      env.LMSTUDIO_API_BASE,
      env.OPENAI_API_BASE,
      env.OPENAI_BASE_URL,
      env.LOCAL_LLM_BASE_URL,
      env.MAESTRO_LOCAL_MODEL_BASE_URL
    ].filter((candidate): candidate is string => Boolean(candidate));

    return baseUrls.map((baseUrl) => {
      const normalizedBaseUrl = normalizeEndpointUrl(baseUrl);
      return {
        id: `endpoint:${normalizedBaseUrl}`,
        name: new URL(normalizedBaseUrl).hostname,
        type: 'endpoint' as const,
        path: normalizedBaseUrl,
        status: 'healthy' as const,
        metadata: {
          kind: 'openai-compatible',
          url: normalizedBaseUrl,
          detectedFrom: 'endpoint-scanner'
        },
        discoveredBy: this.id,
        lastSeen: new Date()
      };
    });
  }
}

export class ResourceNodeGraphBuilder {
  build(resources: DetectedResource[]): ResourceGraph {
    const nodes = resources.map((resource) => this.buildNode(resource));
    const edges: ResourceRelationship[] = [];
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));

    for (const node of nodes) {
      const parent = this.inferParent(node, nodeMap);
      if (parent) {
        edges.push({
          id: `${parent.id}->${node.id}`,
          from: parent.id,
          to: node.id,
          kind: 'contains',
          metadata: { inferred: true }
        });
      }
    }

    return {
      graphId: `resource-graph-${Date.now()}`,
      nodes,
      edges,
      scannedAt: new Date()
    };
  }

  private buildNode(resource: DetectedResource): ResourceNode {
    const tags = this.buildTags(resource);
    const node: ResourceNode = {
      id: resource.id,
      name: resource.name,
      type: resource.type,
      status: resource.status,
      tags,
      metadata: {
        ...resource.metadata,
        path: resource.path,
        discoveredFrom: resource.discoveredBy
      },
      relationships: [],
      discoveredBy: resource.discoveredBy,
      createdAt: new Date(),
      lastSeen: resource.lastSeen,
      path: resource.path
    };

    node.metadata.workflowNodeCompatible = node.type === 'model' || node.type === 'agent' || node.type === 'tool' || node.type === 'mcp' || node.type === 'endpoint' || node.type === 'runtime';
    return node;
  }

  private buildTags(resource: DetectedResource): string[] {
    const tags = new Set<string>([
      resource.type,
      resource.status,
      resource.discoveredBy
    ]);

    if (resource.metadata.kind) {
      tags.add(String(resource.metadata.kind));
    }

    if (resource.metadata.fileExtension) {
      tags.add(String(resource.metadata.fileExtension).replace('.', 'file'));
    }

    return Array.from(tags);
  }

  private inferParent(node: ResourceNode, nodeMap: Map<string, ResourceNode>): ResourceNode | undefined {
    if (node.type === 'model') {
      const modelRootId = node.metadata.modelRootId as string | undefined;
      const ollamaRootId = node.metadata.ollamaRootId as string | undefined;
      const parentId = modelRootId ?? ollamaRootId;
      if (parentId && nodeMap.has(parentId)) {
        return nodeMap.get(parentId);
      }
    }

    if (node.type === 'endpoint' || node.type === 'tool' || node.type === 'mcp') {
      const service = Array.from(nodeMap.values()).find((candidate) => candidate.type === 'service' || candidate.type === 'runtime' || candidate.type === 'ollama' || candidate.type === 'lmstudio');
      if (service) {
        return service;
      }
    }

    if (node.type === 'ollama' || node.type === 'lmstudio' || node.type === 'runtime' || node.type === 'container') {
      const device = Array.from(nodeMap.values()).find((candidate) => candidate.type === 'device');
      if (device) {
        return device;
      }
    }

    return undefined;
  }
}

export class AiRepositoryScanner extends BaseDiscoveryScanner {
  constructor() {
    super('ai-repository-scanner', 'repository');
  }

  async scan(context: DiscoveryScanContext): Promise<DetectedResource[]> {
    const homeDir = context.rootPath ?? os.homedir();
    const candidates = [
      path.join(homeDir, 'Projects'),
      path.join(homeDir, 'Workspace'),
      path.join(homeDir, 'Code'),
      path.join(homeDir, 'src'),
      homeDir
    ];

    const resources: DetectedResource[] = [];
    const seen = new Set<string>();

    for (const candidate of candidates) {
      const exists = await pathExists(candidate);
      if (!exists) {
        continue;
      }

      const entries = await fs.readdir(candidate, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(candidate, entry.name);
        if (!entry.isDirectory()) {
          continue;
        }

        if (seen.has(fullPath)) {
          continue;
        }

        const isAiRepo = await this.isAiRepository(fullPath);
        if (!isAiRepo) {
          continue;
        }

        seen.add(fullPath);
        resources.push({
          id: `repository:${fullPath}`,
          name: entry.name,
          type: 'repository',
          path: fullPath,
          status: 'detected',
          metadata: {
            kind: 'ai-development-repository',
            detectedFrom: 'ai-repository-scanner'
          },
          discoveredBy: this.id,
          lastSeen: new Date()
        });
      }
    }

    return resources;
  }

  private async isAiRepository(directory: string): Promise<boolean> {
    const packageJsonPath = path.join(directory, 'package.json');
    const pyProjectPath = path.join(directory, 'pyproject.toml');
    const requirementsPath = path.join(directory, 'requirements.txt');

    const packageJsonExists = await pathExists(packageJsonPath);
    const pyProjectExists = await pathExists(pyProjectPath);
    const requirementsExists = await pathExists(requirementsPath);

    if (!packageJsonExists && !pyProjectExists && !requirementsExists) {
      return false;
    }

    const markers = ['ollama', 'langchain', 'llama', 'transformers', 'autogen', 'openhands', 'vllm', 'tensorrt', 'pytorch', 'openai'];

    const fileTexts: string[] = [];
    if (packageJsonExists) {
      fileTexts.push(await fs.readFile(packageJsonPath, 'utf8'));
    }
    if (pyProjectExists) {
      fileTexts.push(await fs.readFile(pyProjectPath, 'utf8'));
    }
    if (requirementsExists) {
      fileTexts.push(await fs.readFile(requirementsPath, 'utf8'));
    }

    const combined = fileTexts.join('\n').toLowerCase();
    return markers.some((marker) => combined.includes(marker));
  }
}

export class LocalAiDiscoveryService {
  readonly registry: ResourceRegistry;
  private readonly scanners = new Map<string, DiscoveryScanner>();

  constructor(scanners: DiscoveryScanner[] = [
    new OllamaScanner(),
    new LmStudioScanner(),
    new LocalModelScanner(),
    new McpScanner(),
    new AiRepositoryScanner(),
    new EndpointScanner()
  ]) {
    this.registry = new ResourceRegistry();
    for (const scanner of scanners) {
      this.scanners.set(scanner.id, scanner);
    }
  }

  registerScanner(scanner: DiscoveryScanner): void {
    this.scanners.set(scanner.id, scanner);
  }

  async scanAll(context: DiscoveryScanContext = {}): Promise<DiscoveryScanResult> {
    const resources: DetectedResource[] = [];

    for (const scanner of this.scanners.values()) {
      const discovered = await scanner.scan(context);
      resources.push(...discovered);
    }

    const deduped = dedupeResources(resources);
    deduped.sort((left, right) => {
      const typeDelta = left.type.localeCompare(right.type);
      if (typeDelta !== 0) {
        return typeDelta;
      }
      return left.name.localeCompare(right.name);
    });

    const deviceNode = {
      id: `device:${context.rootPath ?? os.hostname()}`,
      name: 'Local Machine',
      type: 'device' as const,
      status: 'healthy' as const,
      tags: ['device', 'local'],
      metadata: { rootPath: context.rootPath ?? os.homedir() },
      relationships: [],
      discoveredBy: 'local-ai-discovery-service',
      createdAt: new Date(),
      lastSeen: new Date(),
      path: context.rootPath ?? os.homedir()
    };

    this.registry.create(deviceNode);

    for (const resource of deduped) {
      const node: ResourceNode = {
        id: resource.id,
        name: resource.name,
        type: resource.type,
        status: resource.status,
        tags: [resource.type, resource.status, resource.discoveredBy],
        metadata: {
          ...resource.metadata,
          path: resource.path,
          discoveredFrom: resource.discoveredBy
        },
        relationships: [],
        discoveredBy: resource.discoveredBy,
        createdAt: new Date(),
        lastSeen: resource.lastSeen,
        path: resource.path
      };

      this.registry.create(node);
      if (resource.type === 'ollama' || resource.type === 'lmstudio' || resource.type === 'runtime' || resource.type === 'container' || resource.type === 'repository') {
        this.registry.addRelationship(deviceNode.id, node.id, 'contains', { inferred: true });
      }

      if (resource.type === 'model') {
        const ollamaParent = this.registry.findByType('ollama')[0];
        if (ollamaParent) {
          this.registry.addRelationship(ollamaParent.id, node.id, 'contains', { inferred: true, parentType: 'ollama' });
        }
      }
    }

    const graph = new ResourceNodeGraphBuilder().build([
      {
        id: deviceNode.id,
        name: deviceNode.name,
        type: deviceNode.type,
        path: deviceNode.path,
        status: deviceNode.status,
        metadata: deviceNode.metadata,
        discoveredBy: deviceNode.discoveredBy,
        lastSeen: deviceNode.lastSeen
      },
      ...deduped
    ]);

    return {
      resources: deduped,
      graph,
      scannedAt: new Date()
    };
  }
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function dedupeResources(resources: DetectedResource[]): DetectedResource[] {
  const seen = new Map<string, DetectedResource>();

  for (const resource of resources) {
    const key = resource.id || `${resource.type}:${resource.name}:${resource.path ?? ''}`;
    if (!seen.has(key)) {
      seen.set(key, resource);
    }
  }

  return Array.from(seen.values());
}

async function collectModelFiles(root: string, depth: number, maxDepth: number): Promise<Array<{ path: string; size: number }>> {
  if (depth > maxDepth) {
    return [];
  }

  if (!(await pathExists(root))) {
    return [];
  }

  const entries = await fs.readdir(root, { withFileTypes: true });
  const results: Array<{ path: string; size: number }> = [];

  for (const entry of entries) {
    const candidate = path.join(root, entry.name);

    if (entry.isDirectory()) {
      results.push(...(await collectModelFiles(candidate, depth + 1, maxDepth)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!MODEL_EXTENSIONS.has(extension)) {
      continue;
    }

    const stat = await fs.stat(candidate);
    results.push({
      path: candidate,
      size: stat.size
    });
  }

  return results;
}

const MODEL_EXTENSIONS = new Set(['.gguf', '.safetensors', '.onnx', '.bin', '.pt', '.ckpt']);

function normalizeEndpointUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `http://${value}`;
}

export const DEFAULT_LOCAL_AI_DISCOVERY = new LocalAiDiscoveryService();
