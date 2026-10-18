import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { getMaestroFeatureCatalog, validateMaestroOttoUiContract } from '../../src/shared/index.js';

describe('maestro otto ui contract', () => {
  it('is internally consistent and resolves an entry page route', () => {
    const repoRoot = path.resolve(process.cwd());
    const result = validateMaestroOttoUiContract(repoRoot);

    expect(result.ok).toBe(true);
    expect(result.problems).toEqual([]);
    expect(result.entryPageRoute).toBe('/maestro/install-status');
  });

  it('exposes a real product feature catalog beyond the tracer-bullet shell', () => {
    const features = getMaestroFeatureCatalog();

    expect(features.some((feature) => feature.id === 'maestro.workflow-builder')).toBe(true);
    expect(features.some((feature) => feature.id === 'maestro.runtime-status')).toBe(true);
    expect(features.some((feature) => feature.id === 'maestro.runtime-monitor')).toBe(true);
    expect(features.some((feature) => feature.id === 'maestro.registry-browser')).toBe(true);
    expect(features.some((feature) => feature.id === 'maestro.diagnostics')).toBe(true);
    expect(features.find((feature) => feature.id === 'maestro.runtime-status')?.status).toBe('legacy');
    expect(features.some((feature) => feature.id === 'maestro.install-status' && feature.status === 'stable')).toBe(true);
  });
});
