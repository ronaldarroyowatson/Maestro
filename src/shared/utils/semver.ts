/** Parsed semantic version triplet. */
export interface ParsedSemver {
  major: number;
  minor: number;
  patch: number;
}

/** Parses a strict major.minor.patch semantic version string. */
export function parse(version: string): ParsedSemver {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) {
    throw new Error(`Invalid semver: ${version}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  };
}

/** Compares semantic versions returning sort order. */
export function compare(a: string, b: string): -1 | 0 | 1 {
  const va = parse(a);
  const vb = parse(b);

  if (va.major !== vb.major) {
    return va.major < vb.major ? -1 : 1;
  }
  if (va.minor !== vb.minor) {
    return va.minor < vb.minor ? -1 : 1;
  }
  if (va.patch !== vb.patch) {
    return va.patch < vb.patch ? -1 : 1;
  }

  return 0;
}

/** Checks compatibility where major matches and current >= required. */
export function isCompatible(current: string, required: string): boolean {
  const currentParsed = parse(current);
  const requiredParsed = parse(required);

  if (currentParsed.major !== requiredParsed.major) {
    return false;
  }

  return compare(current, required) >= 0;
}
