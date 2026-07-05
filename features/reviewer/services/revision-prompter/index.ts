import type { PromptEngine } from '../../../prompt-engine/index.js';

/** Builds correction prompts for revision-requested outcomes. */
export class RevisionPrompter {
  constructor(private readonly promptEngine: PromptEngine) {}

  /** Renders a revision prompt from template or falls back to deterministic text. */
  render(templateId: string | undefined, reason: string, output: unknown): string {
    if (!templateId) {
      return `Please revise the previous output. Reason: ${reason}. Previous output: ${JSON.stringify(output)}`;
    }

    const rendered = this.promptEngine.render(
      templateId,
      {
        reason,
        output: JSON.stringify(output)
      },
      { task: ['Produce a corrected output that satisfies reviewer checks.'] }
    );

    return rendered.prompt;
  }
}
