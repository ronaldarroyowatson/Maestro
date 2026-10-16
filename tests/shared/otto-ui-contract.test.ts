import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { validateMaestroOttoUiContract } from '../../src/shared/index.js';

describe('maestro otto ui contract', () => {
  it('is internally consistent and resolves an entry page route', () => {
    const repoRoot = path.resolve(process.cwd());
    const result = validateMaestroOttoUiContract(repoRoot);

    expect(result.ok).toBe(true);
    expect(result.problems).toEqual([]);
    expect(result.entryPageRoute).toBe('/maestro/install-status');
  });
});
