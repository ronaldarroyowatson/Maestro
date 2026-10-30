export const OTTO_HISTORY_ENGINE = {
  name: 'otto-history-engine',
  version: '0.1.0',
  snapshotOnWrite: true,
  supportsRollback: true,
  preservesAuditTrail: true,
  readOnlyFallback: true
} as const;
