import { DEFAULT_MAX_RETRIES } from '../../../../src/shared/index.js';
import type { NodeInstance } from '../../../../src/shared/index.js';
import type { ExecutionContext, NodeResult, RetryConfig } from '../../models/types.js';

/** Wraps node execution with retry logic and backoff strategies. */
export class RetryManager {
  constructor(private readonly executeOnce: (node: NodeInstance, context: ExecutionContext) => Promise<NodeResult>) {}

  private async backoff(attempt: number, strategy: 'fixed' | 'exponential' | 'jitter'): Promise<void> {
    const base = 25;
    const waitMs =
      strategy === 'fixed'
        ? base
        : strategy === 'exponential'
          ? base * 2 ** Math.max(attempt - 1, 0)
          : base + Math.floor(Math.random() * 20);

    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  /** Executes node with retry policy and returns final result. */
  async execute(node: NodeInstance, context: ExecutionContext, config: RetryConfig): Promise<NodeResult> {
    const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    const strategy = config.backoffStrategy ?? 'fixed';

    let attempt = 0;
    let lastResult = await this.executeOnce(node, context);

    while (lastResult.status === 'failed' && attempt < maxRetries) {
      attempt += 1;
      await this.backoff(attempt, strategy);
      lastResult = await this.executeOnce(node, context);
      if (lastResult.status === 'completed') {
        return lastResult;
      }
    }

    return lastResult;
  }
}
