import type { VersionedArtifact } from '../shared/index.js';

/** Versioned prompt template artifact. */
export interface PromptTemplate extends VersionedArtifact {
  title: string;
  template: string;
  variables: string[];
}

/** Resolved prompt material ready for provider inference. */
export interface PromptRenderResult {
  prompt: string;
  templateId: string;
  templateVersion: string;
}

/** Version trace of all components contributing to prompt construction. */
export interface PromptVersion {
  promptId: string;
  promptVersion: string;
  components: Array<{ artifactId: string; artifactVersion: string; artifactType: string }>;
  createdAt: Date;
}
