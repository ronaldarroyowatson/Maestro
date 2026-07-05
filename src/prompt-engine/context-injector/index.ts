/** Injects context payload into prompt templates using token replacement. */
export class ContextInjector {
  /** Replaces {{token}} placeholders from provided context values. */
  inject(template: string, context: Record<string, string>): string {
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, token: string) => context[token] ?? '');
  }
}
