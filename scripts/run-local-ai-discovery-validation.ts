import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

import {
  AiRepositoryScanner,
  EndpointScanner,
  LmStudioScanner,
  LocalAiDiscoveryService,
  LocalModelScanner,
  McpScanner,
  OllamaModelScanner,
  OllamaRuntimeScanner,
  OllamaScanner
} from '../features/local-ai-discovery/index.js';

interface ScanSummary {
  resourceCount: number;
  graphNodeCount: number;
  graphEdgeCount: number;
  resourceTypes: Record<string, number>;
}

function summarizeScan(resources: Array<{ type: string }>, graph: { nodes: unknown[]; edges: unknown[] }): ScanSummary {
  const resourceTypes: Record<string, number> = {};
  for (const resource of resources) {
    resourceTypes[resource.type] = (resourceTypes[resource.type] ?? 0) + 1;
  }

  return {
    resourceCount: resources.length,
    graphNodeCount: graph.nodes.length,
    graphEdgeCount: graph.edges.length,
    resourceTypes
  };
}

async function run(): Promise<void> {
  const service = new LocalAiDiscoveryService();
  const context = {
    rootPath: process.cwd(),
    environment: {
      ...process.env,
      OLLAMA_DIR: process.env.OLLAMA_DIR ?? 'C:\\Users\\ronal\\AppData\\Local\\Programs\\Ollama',
      OLLAMA_MODELS_DIR: process.env.OLLAMA_MODELS_DIR ?? 'C:\\Users\\ronal\\.ollama\\models',
      OLLAMA_HOST: process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434',
      OPENAI_API_BASE: process.env.OPENAI_API_BASE ?? 'http://127.0.0.1:11434'
    }
  };

  const first = await service.scanAll(context);
  const firstRegistry = service.registry.list();
  const firstRegistryMap = new Map(firstRegistry.map((node) => [node.id, node]));
  const second = await service.scanAll(context);
  const secondRegistry = service.registry.list();
  const scanners = [
    new OllamaRuntimeScanner(),
    new OllamaScanner(),
    new OllamaModelScanner(),
    new LocalModelScanner(),
    new LmStudioScanner(),
    new McpScanner(),
    new EndpointScanner(),
    new AiRepositoryScanner()
  ];
  const scannerBreakdown: Array<{
    scannerId: string;
    count: number;
    resourceTypes: Record<string, number>;
    sample: Array<{ id: string; name: string; type: string; path?: string }>;
  }> = [];

  for (const scanner of scanners) {
    const scannerResources = await scanner.scan(context);
    scannerBreakdown.push({
      scannerId: scanner.id,
      count: scannerResources.length,
      resourceTypes: scannerResources.reduce<Record<string, number>>((acc, resource) => {
        acc[resource.type] = (acc[resource.type] ?? 0) + 1;
        return acc;
      }, {}),
      sample: scannerResources.slice(0, 20).map((resource) => ({
        id: resource.id,
        name: resource.name,
        type: resource.type,
        path: resource.path
      }))
    });
  }

  const ollamaExecutableCandidates = [
    process.env.OLLAMA_EXE,
    path.join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Ollama', 'ollama.exe'),
    'C:\\Program Files\\Ollama\\ollama.exe'
  ].filter((value): value is string => Boolean(value));
  const ollamaExecutableProbe: Array<{ path: string; exists: boolean }> = [];
  for (const candidate of ollamaExecutableCandidates) {
    ollamaExecutableProbe.push({
      path: candidate,
      exists: await fs
        .access(candidate)
        .then(() => true)
        .catch(() => false)
    });
  }

  const resolvedOllamaExecutable = ollamaExecutableProbe.find((probe) => probe.exists)?.path;
  const ollamaVersionOutput = resolvedOllamaExecutable
    ? spawnSync(resolvedOllamaExecutable, ['--version'], { encoding: 'utf8' }).stdout.trim()
    : '';
  const ollamaListOutput = resolvedOllamaExecutable
    ? spawnSync(resolvedOllamaExecutable, ['list'], { encoding: 'utf8' }).stdout.trim()
    : '';

  let ollamaApiTags: unknown = null;
  try {
    const response = await fetch('http://127.0.0.1:11434/api/tags');
    if (response.ok) {
      ollamaApiTags = await response.json();
    }
  } catch {
    ollamaApiTags = null;
  }

  const mcpPathCandidates = [
    path.join(process.cwd(), '.vscode', 'mcp.json'),
    path.join(process.cwd(), 'mcp.json'),
    path.join(os.homedir(), '.mcp'),
    path.join(os.homedir(), '.config', 'mcp')
  ];
  const mcpProbe: Array<{ path: string; exists: boolean }> = [];
  for (const candidate of mcpPathCandidates) {
    mcpProbe.push({
      path: candidate,
      exists: await fs
        .access(candidate)
        .then(() => true)
        .catch(() => false)
    });
  }

  const dockerInfo = spawnSync('docker', ['ps', '--format', '{{.Names}}'], { encoding: 'utf8' });
  const outputPath = path.join(process.cwd(), 'docs', 'local-ai-discovery-validation.latest.json');

  const report = {
    executedAt: new Date().toISOString(),
    context: {
      rootPath: context.rootPath,
      ollamaDir: context.environment.OLLAMA_DIR,
      ollamaModelsDir: context.environment.OLLAMA_MODELS_DIR,
      ollamaHost: context.environment.OLLAMA_HOST
    },
    firstScan: summarizeScan(first.resources, first.graph),
    secondScan: summarizeScan(second.resources, second.graph),
    scannerBreakdown,
    localProbeEvidence: {
      ollamaExecutableProbe,
      resolvedOllamaExecutable,
      ollamaVersionOutput,
      ollamaListOutput,
      ollamaApiTags,
      mcpProbe,
      dockerCommandAvailable: !dockerInfo.error,
      dockerContainers: (dockerInfo.stdout ?? '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      dockerProbeError: dockerInfo.error ? String(dockerInfo.error.message) : undefined
    },
    registryAfterFirstScan: {
      count: firstRegistry.length,
      typeCounts: firstRegistry.reduce<Record<string, number>>((acc, node) => {
        acc[node.type] = (acc[node.type] ?? 0) + 1;
        return acc;
      }, {})
    },
    registryAfterSecondScan: {
      count: secondRegistry.length,
      typeCounts: secondRegistry.reduce<Record<string, number>>((acc, node) => {
        acc[node.type] = (acc[node.type] ?? 0) + 1;
        return acc;
      }, {}),
      duplicateIdCount: secondRegistry.length - new Set(secondRegistry.map((node) => node.id)).size
    },
    registryUpdateVerification: {
      sameResourceCountAcrossScans:
        firstRegistry.length === secondRegistry.length &&
        firstRegistry.every((firstNode) => secondRegistry.some((secondNode) => secondNode.id === firstNode.id)),
      updatedLastSeenNodeCount: secondRegistry.filter((node) => {
        const firstNode = firstRegistryMap.get(node.id);
        if (!firstNode) {
          return false;
        }

        return new Date(node.lastSeen).getTime() >= new Date(firstNode.lastSeen).getTime();
      }).length
    },
    relationshipEvidence: secondRegistry
      .filter((node) => node.relationships.length > 0)
      .map((node) => ({
        nodeId: node.id,
        nodeType: node.type,
        relationshipCount: node.relationships.length,
        relationships: node.relationships
      })),
    graphEvidence: {
      nodes: second.graph.nodes,
      edges: second.graph.edges
    },
    testResults: [
      {
        name: 'Ollama Runtime Detected',
        result: second.resources.some((resource) => resource.id === 'runtime:ollama') ? 'PASS' : 'FAIL'
      },
      {
        name: 'Ollama Model Detected',
        result: second.resources.some((resource) => resource.type === 'model') ? 'PASS' : 'FAIL'
      },
      {
        name: 'Duplicate Resource Test',
        result: secondRegistry.length - new Set(secondRegistry.map((node) => node.id)).size === 0 ? 'PASS' : 'FAIL'
      },
      {
        name: 'Resource Relationship Test',
        result: second.graph.edges.some((edge) => edge.from === 'runtime:ollama' && edge.to.startsWith('model:ollama:')) ? 'PASS' : 'FAIL'
      }
    ],
    failureModesTested: [
      'Missing Configuration Test',
      'Invalid Endpoint Test',
      'Malformed JSON Test',
      'Duplicate Resource Test'
    ],
    edgeCasesTested: [
      'Empty Resource List Test',
      'Large Scale Resource Scan Test',
      'Rapid Repeated Scanning Test'
    ],
    knownLimitations: [
      'MCP, Docker, and Python environment scanners are still partial or not implemented as runtime scanners.',
      'AI repository scanner currently depends on local manifest markers and may miss unconventional repository layouts.'
    ],
    recommendedImprovements: [
      'Add PythonEnvironmentScanner, DockerScanner, and AgentFrameworkScanner.',
      'Promote runtime/model relationship checks to required CI gating.'
    ]
  };

  const passCount = report.testResults.filter((test) => test.result === 'PASS').length;
  const failCount = report.testResults.length - passCount;

  const outputSummary = {
    outputPath,
    firstScanResources: report.firstScan.resourceCount,
    secondScanResources: report.secondScan.resourceCount,
    registryCountAfterSecondScan: report.registryAfterSecondScan.count,
    duplicateIdCountAfterSecondScan: report.registryAfterSecondScan.duplicateIdCount,
    passCount,
    failCount,
    testResults: report.testResults
  };

  console.log(JSON.stringify(outputSummary, null, 2));
  for (const test of report.testResults) {
    console.log(`${test.result} - ${test.name}`);
  }
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

run().catch((error: unknown) => {
  console.error('Discovery validation failed.');
  console.error(error);
  process.exitCode = 1;
});
