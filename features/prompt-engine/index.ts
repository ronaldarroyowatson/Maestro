import { ContextInjector } from './services/context-injector/index.js';
import { InstructionSetBuilder } from './services/instruction-set/index.js';
import { TemplateManager } from './services/template-manager/index.js';
import { PromptVersioning } from './services/prompt-versioning/index.js';
import type { PromptRenderResult, PromptTemplate } from './models/types.js';

export type { PromptRenderResult, PromptTemplate, PromptVersion } from './models/types.js';
export type { InstructionSet } from './services/instruction-set/index.js';

/** Prompt-engine facade for template management and deterministic prompt rendering. */
export class PromptEngine {
  readonly templateManager: TemplateManager;
  readonly instructionSet: InstructionSetBuilder;
  readonly contextInjector: ContextInjector;
  readonly promptVersioning: PromptVersioning;

  constructor() {
    this.templateManager = new TemplateManager();
    this.instructionSet = new InstructionSetBuilder();
    this.contextInjector = new ContextInjector();
    this.promptVersioning = new PromptVersioning();
  }

  /** Registers a prompt template for future prompt rendering. */
  registerTemplate(template: PromptTemplate): void {
    this.templateManager.register(template);
  }

  /** Renders a prompt by combining instruction set and context injection. */
  render(
    templateId: string,
    contextValues: Record<string, string>,
    instructionInput: Parameters<InstructionSetBuilder['build']>[0]
  ): PromptRenderResult {
    const template = this.templateManager.get(templateId);
    const instructions = this.instructionSet.flatten(this.instructionSet.build(instructionInput));
    const mergedTemplate = instructions.length > 0 ? `${instructions}\n\n${template.template}` : template.template;
    const prompt = this.contextInjector.inject(mergedTemplate, contextValues);

    return {
      prompt,
      templateId: template.id,
      templateVersion: template.version
    };
  }
}
