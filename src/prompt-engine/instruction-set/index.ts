/** Defines a normalized instruction-set for prompt construction. */
export interface InstructionSet {
  system: string[];
  policy: string[];
  task: string[];
}

/** Builds deterministic instruction blocks for prompt composition. */
export class InstructionSetBuilder {
  /** Builds a normalized instruction set from optional input blocks. */
  build(input: Partial<InstructionSet>): InstructionSet {
    return {
      system: [...(input.system ?? [])],
      policy: [...(input.policy ?? [])],
      task: [...(input.task ?? [])]
    };
  }

  /** Flattens instruction set into a deterministic string block. */
  flatten(set: InstructionSet): string {
    const blocks = [
      ['SYSTEM', set.system],
      ['POLICY', set.policy],
      ['TASK', set.task]
    ] as const;

    return blocks
      .filter(([, values]) => values.length > 0)
      .map(([label, values]) => `${label}:\n${values.join('\n')}`)
      .join('\n\n');
  }
}
