import type { AuditEntry } from './types';

export function createAuditEntry(
  auditId: string,
  operatorId: string,
  command: string,
  previousState: Record<string, unknown>,
  newState: Record<string, unknown>,
  timestamp: string,
  reason?: string,
): AuditEntry {
  return {
    auditId,
    timestamp,
    operatorId,
    command,
    reason,
    previousState,
    newState,
  };
}
