import { sha256 } from '../../shared/index.js';
import type { PromptVersion } from '../types.js';

/** Creates reproducible prompt version records from contributing components. */
export class PromptVersioning {
  /** Creates a prompt version snapshot using component id/version tuples. */
  create(promptId: string, components: PromptVersion['components']): PromptVersion {
    const normalized = [...components].sort((a, b) => `${a.artifactType}:${a.artifactId}`.localeCompare(`${b.artifactType}:${b.artifactId}`));
    const digest = sha256(JSON.stringify(normalized)).slice(0, 12);

    return {
      promptId,
      promptVersion: `1.0.${parseInt(digest.slice(0, 4), 16) % 10000}`,
      components: normalized,
      createdAt: new Date()
    };
  }
}
