import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { validateMaestroModuleRegistration } from '../../src/shared/index.js';

describe('maestro otto module registration', () => {
  it('is consistent with ui contract and observability contract', () => {
    const repoRoot = path.resolve(process.cwd());
    const result = validateMaestroModuleRegistration(repoRoot);

    expect(result.ok).toBe(true);
    expect(result.problems).toEqual([]);
  });
});
