import { HistoryEngine } from '../history-engine/index.js';
import { AiSecurityEngine, type SandboxAction, type SecurityApproval } from '../security-engine/index.js';

export class MaestroSecurityIntegration {
  readonly securityEngine: AiSecurityEngine;
  readonly historyEngine: HistoryEngine;

  constructor(securityEngine = new AiSecurityEngine(), historyEngine = new HistoryEngine()) {
    this.securityEngine = securityEngine;
    this.historyEngine = historyEngine;
  }

  execute(action: SandboxAction, approval?: SecurityApproval, state?: Record<string, unknown>) {
    const decision = this.securityEngine.executeAction(action, approval, state);
    if (!decision.allowed) {
      return { ok: false, reason: decision.reason ?? 'Action denied by security policy.' };
    }

    return { ok: true, result: decision.result };
  }
}
