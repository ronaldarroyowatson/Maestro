import { createHash } from 'node:crypto';

/** Computes a SHA-256 digest for string or binary payloads. */
export function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}
