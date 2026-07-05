import type { LayoutHint } from '../types.js';

/** Collects and normalizes layout hints for document parsing tasks. */
export class LayoutHintStore {
  private readonly hints = new Map<string, LayoutHint>();

  /** Sets a layout hint by name. */
  set(hint: LayoutHint): void {
    this.hints.set(hint.name, hint);
  }

  /** Returns all active layout hints sorted by name. */
  list(): LayoutHint[] {
    return [...this.hints.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
}
