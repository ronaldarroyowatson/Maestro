import type { Edge, Graph, NodeDefinition, ValidationResult } from '../../src/shared/index.js';
import { EdgeManager } from './services/edge-manager/index.js';
import { GraphValidator } from './services/graph-validator/index.js';
import { InMemoryGraphService } from './services/graph-service/index.js';
import { NodeRegistry } from './services/node-registry/index.js';
import { TopologicalSorter } from './services/topological-sorter/index.js';

export { InMemoryGraphService };
export { NodeGraphUiStateBuilder, DEFAULT_NODE_GRAPH_UI_STATE_BUILDER } from './services/ui-integration/index.js';
export { NodePropertyInspector, DEFAULT_NODE_PROPERTY_INSPECTOR } from './services/property-inspector/index.js';
export {
  MaestroOttoIntegrationService,
  DEFAULT_MAESTRO_OTTO_INTEGRATION_SERVICE
} from './services/maestro-otto-integration/index.js';
export { runPhaseIEndToEndValidation, buildPhaseIGraph } from './services/end-to-end-validation/index.js';
export { MaestroOttoNodeEngineService } from './services/otto-node-engine-integration/index.js';
export { DiscoveryGraphSyncService } from './services/discovery-graph-sync/index.js';
export type { OttoNodeEngineClient, OttoNodeEngineFeatureFlags } from './services/otto-node-engine-integration/index.js';
export type { DiscoveryGraphSource, DiscoveryGraphSyncAssertion, DiscoveryGraphSyncResult } from './services/discovery-graph-sync/index.js';
export type { ExecutionLayer, TopologicalOrder } from './models/types.js';

/** Node-graph facade that composes graph modules and exposes feature API. */
export class NodeGraph {
  readonly nodeRegistry: NodeRegistry;
  readonly edgeManager: EdgeManager;
  readonly graphValidator: GraphValidator;
  readonly topologicalSorter: TopologicalSorter;

  constructor() {
    this.nodeRegistry = new NodeRegistry();
    this.edgeManager = new EdgeManager();
    const definitionResolver = (nodeTypeId: string): NodeDefinition => this.nodeRegistry.getDefinition(nodeTypeId);
    this.graphValidator = new GraphValidator(definitionResolver);
    this.topologicalSorter = new TopologicalSorter(definitionResolver);
  }

  /** Registers a custom node definition. */
  registerNode(definition: NodeDefinition): void {
    this.nodeRegistry.register(definition);
  }

  /** Validates graph structure and constraints. */
  validate(graph: Graph): ValidationResult {
    return this.graphValidator.validate(graph);
  }

  /** Computes graph execution layers using topological sort. */
  topologicalOrder(graph: Graph): string[][] {
    return this.topologicalSorter.sort(graph);
  }

  /** Validates and adds a new edge. */
  connect(edge: Edge, fromDefinition: NodeDefinition, toDefinition: NodeDefinition): Edge {
    return this.edgeManager.addEdge(edge, fromDefinition, toDefinition);
  }
}
