import { validate, type JSONSchema } from '../../../../src/shared/index.js';

/** Validates reviewer payloads against configured JSON schema contracts. */
export class ReviewerSchemaValidator {
  /** Validates output payload against schema and returns validation result. */
  validate(schema: JSONSchema, payload: unknown) {
    return validate(schema, payload);
  }
}
