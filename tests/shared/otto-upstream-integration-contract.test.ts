import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { validateMaestroOttoUpstreamHandoffContract } from '../../src/shared/index.js';

describe('maestro otto upstream integration contract', () => {
  it('is consistent with module, command, and ui contract boundaries', () => {
    const repoRoot = path.resolve(process.cwd());
    const result = validateMaestroOttoUpstreamHandoffContract(repoRoot);

    expect(result.ok).toBe(true);
    expect(result.problems).toEqual([]);
  });
});
