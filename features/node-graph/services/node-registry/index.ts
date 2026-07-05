import type { NodeDefinition } from '../../../../src/shared/index.js';

const BUILT_IN_NODE_SHAPES = ['service', 'agent', 'conductor', 'reviewer', 'trigger'] as const;

/** Runtime catalog for node definitions keyed by nodeTypeId. */
export class NodeRegistry {
  private readonly definitions = new Map<string, NodeDefinition>();

  constructor() {
    for (const shape of BUILT_IN_NODE_SHAPES) {
      this.register({
        nodeTypeId: shape,
        shape,
        displayName: shape,
        configSchema: { type: 'object', additionalProperties: true },
        inputPorts: shape === 'trigger' ? [] : [{ portId: 'in', portType: 'any', schema: {}, required: false }],
        outputPorts: shape === 'trigger' ? [{ portId: 'out', portType: 'any', schema: {}, required: false }] : [{
          portId: 'out',
          portType: 'any',
          schema: {},
          required: false
        }]
      });
    }
  }

  /** Registers or replaces a node definition. */
  register(definition: NodeDefinition): void {
    this.definitions.set(definition.nodeTypeId, definition);
  }

  /** Returns a registered node definition by type id. */
  getDefinition(nodeTypeId: string): NodeDefinition {
    const definition = this.definitions.get(nodeTypeId);
    if (!definition) {
      throw new Error(`NodeDefinition not found for nodeTypeId: ${nodeTypeId}`);
    }
    return definition;
  }

  /** Returns all registered node definitions. */
  listAll(): NodeDefinition[] {
    return [...this.definitions.values()];
  }
}
