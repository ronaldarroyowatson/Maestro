import { describe, expect, it } from 'vitest';
import { sha256 } from '../../src/shared/index.js';

describe('sha256', () => {
  it('hashes string content deterministically', () => {
    expect(sha256('maestro')).toBe('233e1cded61ace811d7a930947b06acb18cda1dc7b67e215941e1830fdec3b7c');
  });

  it('hashes buffer payloads', () => {
    const digest = sha256(Buffer.from('maestro'));
    expect(digest).toHaveLength(64);
  });
});
