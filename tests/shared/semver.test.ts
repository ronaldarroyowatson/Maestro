import { describe, expect, it } from 'vitest';
import { compare, isCompatible, parse } from '../../src/shared/index.js';

describe('semver utils', () => {
  it('parses valid versions', () => {
    expect(parse('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it('compares versions in expected order', () => {
    expect(compare('1.2.3', '1.2.4')).toBe(-1);
    expect(compare('1.2.4', '1.2.4')).toBe(0);
    expect(compare('2.0.0', '1.9.9')).toBe(1);
  });

  it('checks compatibility by major and floor version', () => {
    expect(isCompatible('1.4.0', '1.2.9')).toBe(true);
    expect(isCompatible('2.0.0', '1.9.9')).toBe(false);
  });
});
