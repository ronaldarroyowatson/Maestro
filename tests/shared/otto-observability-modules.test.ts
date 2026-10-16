import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

interface MaestroPayload {
  configuration: {
    paths: Record<string, string>;
  };
  extensions: {
    required: Array<{
      id: string;
      source: string;
      alias?: string;
    }>;
  };
}

describe('maestro otto observability baseline', () => {
  it('declares required observability modules and paths', () => {
    const payloadPath = path.join(process.cwd(), 'otto', 'maestro-payload.json');
    const payload = JSON.parse(readFileSync(payloadPath, 'utf8')) as MaestroPayload;

    const requiredExtensionIds = new Set(payload.extensions.required.map((entry) => entry.id));
    expect(requiredExtensionIds.has('logging.module')).toBe(true);
    expect(requiredExtensionIds.has('tracing.module')).toBe(true);
    expect(requiredExtensionIds.has('metrics.module')).toBe(true);
    expect(requiredExtensionIds.has('debug.module')).toBe(true);

    expect(payload.configuration.paths.logs).toContain('/logs/');
    expect(payload.configuration.paths.traces).toContain('/traces/');
    expect(payload.configuration.paths.telemetry).toContain('/telemetry/');
    expect(payload.configuration.paths.diagnostics).toContain('/diagnostics/');
  });
});
