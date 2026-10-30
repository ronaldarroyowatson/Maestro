import { randomUUID } from 'node:crypto';

export type SandboxScope = {
  agentId: string;
  root: string;
  allowedPaths: string[];
  allowedTools: string[];
  allowedNodes: string[];
  allowedMcpServers: string[];
  permissions: Record<string, boolean>;
};

export type SandboxSession = {
  id: string;
  agentId: string;
  root: string;
  createdAt: Date;
};

export class SandboxEngine {
  readonly root: string;

  constructor(root = '/workspace/sandbox') {
    this.root = this.normalizeRoot(root);
  }

  createSession(agentId: string): SandboxSession {
    return {
      id: randomUUID(),
      agentId,
      root: this.root,
      createdAt: new Date()
    };
  }

  normalizeTarget(target: string): string {
    if (!target || typeof target !== 'string') {
      throw new Error('Sandbox target is required.');
    }

    const simplified = target.replace(/\\/g, '/');
    const traversal = simplified.includes('../') || simplified.includes('..\\') || simplified === '..';
    if (traversal || simplified.startsWith('/')) {
      throw new Error(`Sandbox violation: target escapes the sandbox root: ${target}`);
    }

    const anchored = `${this.root.replace(/\/$/, '')}/${simplified.replace(/^\//, '')}`;
    const canonical = anchored.replace(/\/+/g, '/');
    if (!canonical.startsWith(`${this.root.replace(/\/$/, '')}/`) && canonical !== this.root) {
      throw new Error(`Sandbox violation: target escapes the sandbox root: ${target}`);
    }
    return canonical;
  }

  validateScope(scope: SandboxScope, target: string): boolean {
    try {
      const normalizedTarget = this.normalizeTarget(target);
      const matchesAllowedPath = scope.allowedPaths.some((allowedPath) => {
        const root = this.normalizeRoot(allowedPath);
        return normalizedTarget === root || normalizedTarget.startsWith(`${root}/`);
      });
      return matchesAllowedPath;
    } catch {
      return false;
    }
  }

  normalizeRoot(root: string): string {
    return root.replace(/\\/g, '/').replace(/\/$/, '') || '/workspace/sandbox';
  }
}
