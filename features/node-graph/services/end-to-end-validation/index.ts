import type { GraphDefinition, ResourceNode, WorkflowRuntimeServiceAdapter } from '../../../../src/shared/index.js';
import type { LocalAiDiscoveryService } from '../../../local-ai-discovery/index.js';
import { MaestroOttoIntegrationService } from '../maestro-otto-integration/index.js';

export interface PhaseITestAssertion {
  name: string;
  result: 'PASS' | 'FAIL';
  details?: string;
}

export interface PhaseIExecutionTrace {
  runId: string;
  states: string[];
}

export interface PhaseIValidationReport {
  assertions: PhaseITestAssertion[];
  executionTrace: PhaseIExecutionTrace;
  resourceSummary: {
    discoveredCount: number;
    registryCount: number;
    modelCount: number;
    runtimeCount: number;
  };
  graphSummary: {
    nodeCount: number;
    edgeCount: number;
  };
}

export function buildPhaseIGraph(resources: ResourceNode[]): GraphDefinition {
  const model = resources.find((resource) => resource.type === 'model');
  const modelResourceId = model?.id ?? 'model:missing';
  const modelName = model?.name ?? 'Missing Model';

  return {
    graphId: 'phase-i-e2e-graph',
    version: '1.0.0',
    name: 'Phase I End-to-End Graph',
    description: 'Discovery to graph execution validation flow.',
    createdAt: new Date(),
    updatedAt: new Date(),
    nodes: [
      { id: 'start', type: 'trigger', label: 'Start' },
      {
        id: 'model-step',
        type: 'service',
        label: 'Model Execution',
        resources: [{ kind: 'model', id: modelResourceId, name: modelName }]
      },
      { id: 'finish', type: 'reviewer', label: 'Finish' }
    ],
    edges: [
      { id: 'e1', from: 'start', to: 'model-step' },
      { id: 'e2', from: 'model-step', to: 'finish' }
    ],
    layout: {
      start: { nodeId: 'start', x: 0, y: 0 },
      'model-step': { nodeId: 'model-step', x: 220, y: 0 },
      finish: { nodeId: 'finish', x: 440, y: 0 }
    }
  };
}

export async function runPhaseIEndToEndValidation(input: {
  discovery: LocalAiDiscoveryService;
  integration: MaestroOttoIntegrationService;
  runtime: WorkflowRuntimeServiceAdapter;
  context: { rootPath?: string; environment?: Record<string, string | undefined> };
}): Promise<PhaseIValidationReport> {
  const scan = await input.discovery.scanAll(input.context);
  const registryResources = input.discovery.registry.list();
  const graph = buildPhaseIGraph(registryResources);
  const integrationResult = await input.integration.executeGraphRun({
    pipelineId: 'phase-i-validation',
    graph,
    resources: registryResources,
    requestInput: {
      source: 'phase-i-end-to-end-validation'
    },
    strictResourceMapping: true
  });

  const states: string[] = [];
  const initial = await input.runtime.getRun(integrationResult.run.runId);
  states.push(initial?.state.state ?? 'unknown');
  await input.runtime.pauseRun(integrationResult.run.runId);
  const paused = await input.runtime.getRun(integrationResult.run.runId);
  states.push(paused?.state.state ?? 'unknown');
  await input.runtime.resumeRun(integrationResult.run.runId);
  const resumed = await input.runtime.getRun(integrationResult.run.runId);
  states.push(resumed?.state.state ?? 'unknown');
  await input.runtime.cancelRun(integrationResult.run.runId);
  const cancelled = await input.runtime.getRun(integrationResult.run.runId);
  states.push(cancelled?.state.state ?? 'unknown');

  const modelCount = scan.resources.filter((resource) => resource.type === 'model').length;
  const runtimeCount = scan.resources.filter((resource) => resource.type === 'runtime').length;

  const assertions: PhaseITestAssertion[] = [
    {
      name: 'End-to-End Discovery to Registration Test',
      result: scan.resources.length > 0 && registryResources.length > 0 ? 'PASS' : 'FAIL'
    },
    {
      name: 'Ollama Model Detection Test',
      result: modelCount > 0 ? 'PASS' : 'FAIL'
    },
    {
      name: 'Graph Execution Trace Test',
      result: states.join(',') === 'pending,paused,running,cancelled' ? 'PASS' : 'FAIL',
      details: states.join(' -> ')
    },
    {
      name: 'Node Status Visibility Test',
      result: integrationResult.uiState.nodes.every((node) => typeof node.status === 'string') ? 'PASS' : 'FAIL'
    }
  ];

  return {
    assertions,
    executionTrace: {
      runId: integrationResult.run.runId,
      states
    },
    resourceSummary: {
      discoveredCount: scan.resources.length,
      registryCount: registryResources.length,
      modelCount,
      runtimeCount
    },
    graphSummary: {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length
    }
  };
}
