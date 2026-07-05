import { describe, expect, it } from 'vitest';
import { validate } from '../../src/shared/index.js';

describe('json schema validator', () => {
  it('returns valid result for matching schema', () => {
    const schema = {
      type: 'object',
      properties: {
        id: { type: 'string' }
      },
      required: ['id'],
      additionalProperties: false
    };

    const result = validate(schema, { id: 'abc' });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns errors for invalid payload', () => {
    const schema = {
      type: 'object',
      properties: {
        id: { type: 'string' }
      },
      required: ['id'],
      additionalProperties: false
    };

    const result = validate(schema, {});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
