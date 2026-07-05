import type { PromptTemplate } from '../types.js';

/** Manages versioned prompt templates in memory for prompt assembly. */
export class TemplateManager {
  private readonly templates = new Map<string, PromptTemplate>();

  /** Registers or replaces a prompt template artifact. */
  register(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  /** Returns a prompt template by id. */
  get(templateId: string): PromptTemplate {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Prompt template not found: ${templateId}`);
    }
    return template;
  }

  /** Lists all registered templates. */
  list(): PromptTemplate[] {
    return [...this.templates.values()];
  }
}
