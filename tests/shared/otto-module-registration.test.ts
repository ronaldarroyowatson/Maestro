import { describe, expect, it } from 'vitest';
import path from 'node:path';
import {
  validateMaestroModuleRegistration,
  validateMaestroOttoModuleDefinition
} from '../../src/shared/index.js';

describe('maestro otto module registration', () => {
  it('is consistent with ui contract and observability contract', () => {
    const repoRoot = path.resolve(process.cwd());
    const result = validateMaestroModuleRegistration(repoRoot);

    expect(result.ok).toBe(true);
    expect(result.problems).toEqual([]);
  });

  it('has a concrete Otto module manifest and bootstrap contract', () => {
    const repoRoot = path.resolve(process.cwd());
    const result = validateMaestroOttoModuleDefinition(repoRoot);

    expect(result.ok).toBe(true);
    expect(result.problems).toEqual([]);
  });
});
