export const OTTO_AI_SECURITY_ENGINE = {
  name: 'otto-ai-security-engine',
  version: '0.1.0',
  permissionModel: 'scope-based',
  requiresApproval: true,
  blocksReplay: true,
  blocksSelfGrant: true,
  supportsAudit: true
} as const;
