import crypto from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../db';

export interface AuditEntry {
  auditId: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  result: 'allowed' | 'denied';
  authorizationJson: string;
  requestJson: string;
  integrityJson: string;
  createdAt: string;
}

export interface StepUpAuditEvent {
  action: 'step_up_requested' | 'step_up_verified' | 'step_up_failed';
  userId: string;
  sessionId: string;
  resourceType: string;
  resourceId: string;
  ipAddress?: string;
  userAgent?: string;
  verificationMethod: 'totp';
  totpVerified: boolean;
  reason?: string;
}

export interface AuditFilter {
  actorUserId?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export async function logAuditEvent(
  actorUserId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  result: 'allowed' | 'denied',
  authorizationContext: Record<string, unknown>,
): Promise<string> {
  const auditId = `aud_${crypto.randomUUID().replace(/-/g, '')}`;
  const eventHash = hashEntry(auditId, actorUserId, action, resourceType, resourceId);

  if (pool) {
    const conn = await pool.getConnection();
    try {
      await conn.execute(
        `INSERT INTO audit_events
           (audit_id, timestamp, actor_user_id, action, resource_type, resource_id, result, event_hash, authorization_json)
         VALUES (?, NOW(3), ?, ?, ?, ?, ?, ?, ?)`,
        [
          auditId,
          actorUserId,
          action,
          resourceType,
          resourceId,
          result,
          eventHash,
          JSON.stringify(authorizationContext),
        ],
      );
    } finally {
      conn.release();
    }
  }

  return auditId;
}

/**
 * Log a step-up MFA verification event to the audit trail
 * Tracks when users verify their identity via TOTP for sensitive operations
 */
export async function logStepUpEvent(event: StepUpAuditEvent): Promise<string> {
  const result = event.totpVerified ? 'allowed' : 'denied';
  
  return logAuditEvent(
    event.userId,
    event.action,
    event.resourceType,
    event.resourceId,
    result,
    {
      verificationMethod: event.verificationMethod,
      totpVerified: event.totpVerified,
      sessionId: event.sessionId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      reason: event.reason,
    },
  );
}

/**
 * Log policy update event (for admin panel)
 */
export async function logPolicyUpdateEvent(event: {
  action: string;
  adminUserId: string;
  policyName: string;
  previousValue: unknown;
  newValue: unknown;
  reason: string;
}): Promise<string> {
  return logAuditEvent(
    event.adminUserId,
    event.action,
    'Policy',
    event.policyName,
    'allowed',
    { previousValue: event.previousValue, newValue: event.newValue, reason: event.reason },
  );
}

/**
 * Log user suspension event
 */
export async function logUserSuspensionEvent(event: {
  action: string;
  adminUserId: string;
  targetUserId: string;
  reason: string;
  details?: string;
}): Promise<string> {
  return logAuditEvent(
    event.adminUserId,
    event.action,
    'User',
    event.targetUserId,
    'allowed',
    { reason: event.reason, details: event.details },
  );
}

/**
 * Log user reactivation event
 */
export async function logUserReactivationEvent(event: {
  action: string;
  adminUserId: string;
  targetUserId: string;
  reason: string;
  approvalCount?: number;
}): Promise<string> {
  return logAuditEvent(
    event.adminUserId,
    event.action,
    'User',
    event.targetUserId,
    'allowed',
    { reason: event.reason, approvalCount: event.approvalCount },
  );
}

/**
 * Log session invalidation event
 */
export async function logSessionInvalidationEvent(event: {
  action: string;
  adminUserId: string;
  targetUserId: string;
  sessionCount: number;
  reason: string;
}): Promise<string> {
  return logAuditEvent(
    event.adminUserId,
    event.action,
    'User',
    event.targetUserId,
    'allowed',
    { sessionCount: event.sessionCount, reason: event.reason },
  );
}

/**
 * Log access denial event
 */
export async function logAccessDenialEvent(event: {
  action: string;
  userId: string;
  attemptedAction: string;
  reason: string;
}): Promise<string> {
  return logAuditEvent(
    event.userId,
    event.action,
    'Action',
    event.attemptedAction,
    'denied',
    { reason: event.reason },
  );
}

export async function queryAudit(filter: AuditFilter = {}): Promise<AuditEntry[]> {
  if (!pool) return [];
  const {
    actorUserId,
    resourceType,
    resourceId,
    action,
    from,
    to,
    page = 1,
    limit = 50,
  } = filter;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (actorUserId) { conditions.push('actor_user_id = ?'); params.push(actorUserId); }
  if (resourceType) { conditions.push('resource_type = ?'); params.push(resourceType); }
  if (resourceId) { conditions.push('resource_id = ?'); params.push(resourceId); }
  if (action) { conditions.push('action = ?'); params.push(action); }
  if (from) { conditions.push('timestamp >= ?'); params.push(from); }
  if (to) { conditions.push('timestamp <= ?'); params.push(to); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  
  // Build LIMIT/OFFSET clauses separately to avoid mysql2 type confusion
  const limitClause = `LIMIT ${Math.max(1, Math.min(500, limit))} OFFSET ${Math.max(0, offset)}`;

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM audit_events ${where} ORDER BY timestamp DESC ${limitClause}`,
      params as (string | number)[],
    );
    return rows.map(mapAudit);
  } finally {
    conn.release();
  }
}

export async function verifyChainIntegrity(from?: string, to?: string): Promise<{
  totalChecked: number;
  broken: number;
  firstBrokenAt: string | null;
}> {
  if (!pool) return { totalChecked: 0, broken: 0, firstBrokenAt: null };
  const conn = await pool.getConnection();
  try {
    const params: string[] = [];
    let where = '';
    if (from) { where += 'WHERE created_at >= ?'; params.push(from); }
    if (to) { where += (where ? ' AND' : 'WHERE') + ' created_at <= ?'; params.push(to); }

    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT audit_id, actor_user_id, action, resource_type, resource_id, integrity_json, created_at
       FROM audit_events ${where} ORDER BY created_at ASC`,
      params,
    );

    let broken = 0;
    let firstBrokenAt: string | null = null;
    let prevHash: string | null = null;

    for (const row of rows) {
      const integrity = JSON.parse(row.integrity_json as string) as {
        eventHash: string;
        previousHash: string | null;
      };
      const expected = hashEntry(
        row.audit_id as string,
        row.actor_user_id as string,
        row.action as string,
        row.resource_type as string,
        row.resource_id as string,
      );
      const hashOk = expected === integrity.eventHash;
      const chainOk = integrity.previousHash === prevHash;

      if (!hashOk || !chainOk) {
        broken++;
        if (!firstBrokenAt) firstBrokenAt = String(row.created_at);
      }
      prevHash = integrity.eventHash;
    }

    return { totalChecked: rows.length, broken, firstBrokenAt };
  } finally {
    conn.release();
  }
}

function hashEntry(
  auditId: string,
  actorUserId: string,
  action: string,
  resourceType: string,
  resourceId: string,
): string {
  return crypto
    .createHash('sha256')
    .update(`${auditId}|${actorUserId}|${action}|${resourceType}|${resourceId}`)
    .digest('hex');
}

function mapAudit(row: RowDataPacket): AuditEntry {
  return {
    auditId: row.audit_id as string,
    actorUserId: row.actor_user_id as string,
    action: row.action as string,
    resourceType: row.resource_type as string,
    resourceId: row.resource_id as string,
    result: row.result as AuditEntry['result'],
    authorizationJson: row.authorization_json as string,
    requestJson: row.request_json as string,
    integrityJson: row.integrity_json as string,
    createdAt: String(row.created_at),
  };
}

/**
 * Map audit event to frontend AuditEntry for admin panel
 * Converts database schema to UI interface
 */
export function mapAuditToUI(row: RowDataPacket): {
  id: string;
  action: string;
  result: 'allowed' | 'denied';
  actor: string;
  resource: string;
  timestamp: string;
  details: Record<string, unknown>;
} {
  return {
    id: row.audit_id as string,
    action: row.action as string,
    result: row.result as 'allowed' | 'denied',
    actor: row.actor_email || row.actor_user_id || 'Unknown',
    resource: row.resource_type ? `${row.resource_type}${row.resource_id ? ':' + row.resource_id : ''}` : 'Unknown',
    timestamp: String(row.timestamp),
    details: {
      sessionId: row.session_id,
      ipAddress: row.ip,
      userAgent: row.user_agent_hash,
      decision: row.decision,
      reason: row.reason,
    },
  };
}
