import type { AgentDescriptor, InferenceRequest, InferenceResponse, ProviderAdapter, ProviderHealth } from '../../../../../src/shared/index.js';

export interface McpServerConfig {
  url: string;
  name: string;
  authToken?: string;
}

export interface McpAdapterOptions {
  mcpServers: McpServerConfig[];
}

/** Provider adapter for Model Context Protocol servers. */
export class McpAdapter implements ProviderAdapter {
  readonly providerId = 'mcp';
  readonly displayName = 'MCP';

  constructor(private readonly options: McpAdapterOptions) {}

  async discover(): Promise<AgentDescriptor[]> {
    const descriptors: AgentDescriptor[] = [];

    for (const server of this.options.mcpServers) {
      const response = await fetch(`${server.url}/agents`, {
        headers: server.authToken ? { authorization: `Bearer ${server.authToken}` } : undefined
      });
      const payload = (await response.json()) as { agents?: Array<{ id: string; name?: string; capabilities?: string[] }> };

      for (const agent of payload.agents ?? []) {
        descriptors.push({
          descriptorId: `mcp:${server.name}:${agent.id}`,
          providerId: this.providerId,
          modelId: agent.id,
          displayName: agent.name ?? agent.id,
          capabilities: agent.capabilities ?? []
        });
      }
    }

    return descriptors;
  }

  async run(request: InferenceRequest): Promise<InferenceResponse> {
    const [, serverName, agentId] = request.agentDescriptorId.split(':');
    const server = this.options.mcpServers.find((item) => item.name === serverName);
    if (!server) {
      throw new Error(`MCP server not found for descriptor: ${request.agentDescriptorId}`);
    }

    const started = Date.now();
    const response = await fetch(`${server.url}/sample`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(server.authToken ? { authorization: `Bearer ${server.authToken}` } : {})
      },
      body: JSON.stringify({
        agentId,
        prompt: request.prompt,
        context: request.context
      })
    });

    const payload = (await response.json()) as { text?: string; usage?: { totalTokens?: number } };

    return {
      text: payload.text ?? '',
      tokensUsed: payload.usage?.totalTokens ?? 0,
      latencyMs: Date.now() - started,
      rawResponse: payload
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = Date.now();
    try {
      const first = this.options.mcpServers[0];
      if (!first) {
        return { status: 'degraded', latencyMs: 0, message: 'No MCP servers configured' };
      }
      const response = await fetch(`${first.url}/health`, {
        headers: first.authToken ? { authorization: `Bearer ${first.authToken}` } : undefined
      });
      return {
        status: response.ok ? 'healthy' : 'degraded',
        latencyMs: Date.now() - started,
        message: response.ok ? 'MCP reachable' : `HTTP ${response.status}`
      };
    } catch (error) {
      return { status: 'unreachable', latencyMs: Date.now() - started, message: String(error) };
    }
  }
}
