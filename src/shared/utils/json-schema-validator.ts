import AjvModule, { type ErrorObject } from 'ajv';
import type { JSONSchema, ValidationResult } from '../types/nodes.js';

type AjvCtor = new (options?: Record<string, unknown>) => {
  compile: (schema: JSONSchema) => { (data: unknown): boolean; errors?: ErrorObject[] | null };
};

const Ajv = (((AjvModule as unknown as { default?: AjvCtor }).default ?? AjvModule) as unknown) as AjvCtor;
const ajv = new Ajv({ allErrors: true, strict: false });

function toMessage(error: ErrorObject): string {
  const path = error.instancePath || '/';
  return `${path} ${error.message ?? 'validation error'}`.trim();
}

/** Validates unknown data against a JSON schema and returns a structured result. */
export function validate(schema: JSONSchema, data: unknown): ValidationResult {
  const compiled = ajv.compile(schema);
  const valid = compiled(data);

  if (valid) {
    return { valid: true, errors: [], warnings: [] };
  }

  return {
    valid: false,
    errors: (compiled.errors ?? []).map((error: ErrorObject) => ({
      code: String(error.keyword),
      message: toMessage(error)
    })),
    warnings: []
  };
}
