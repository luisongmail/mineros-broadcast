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
  result?: 'allowed' | 'denied';
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

let lastHash: string | null = null;
const AUDIT_TIMESTAMP_COLUMN = 'timestamp';

export async function logAuditEvent(
  actorUserId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  result: 'allowed' | 'denied',
  authorizationContext: Record<string, unknown>,
  requestContext: Record<string, unknown>,
): Promise<string> {
  const auditId = `aud_${crypto.randomUUID().replace(/-/g, '')}`;
  const eventHash = hashEntry(auditId, actorUserId, action, resourceType, resourceId);
  const previousHash = lastHash;

  lastHash = eventHash;

  if (pool) {
    const conn = await pool.getConnection();
    try {
      await conn.execute(
        `INSERT INTO audit_events
           (audit_id, actor_user_id, action, resource_type, resource_id, result,
            reason, previous_hash, event_hash, authorization_json, change_summary, ${AUDIT_TIMESTAMP_COLUMN})
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))`,
        [
          auditId,
          actorUserId,
          action,
          resourceType,
          resourceId,
          result,
          typeof requestContext.reason === 'string' ? requestContext.reason : null,
          previousHash,
          eventHash,
          JSON.stringify(authorizationContext),
          JSON.stringify(requestContext),
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
    },
    {
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
    { previousValue: event.previousValue, newValue: event.newValue },
    { reason: event.reason },
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
    { reason: event.reason },
    { details: event.details },
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
    {},
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
    {},
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
    {},
  );
}

function buildAuditWhere(filter: AuditFilter): { where: string; params: Array<string | number> } {
  const {
    actorUserId,
    resourceType,
    resourceId,
    action,
    result,
    search,
    from,
    to,
  } = filter;
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (actorUserId) { conditions.push('actor_user_id = ?'); params.push(actorUserId); }
  if (resourceType) { conditions.push('resource_type = ?'); params.push(resourceType); }
  if (resourceId) { conditions.push('resource_id = ?'); params.push(resourceId); }
  if (action) { conditions.push('action = ?'); params.push(action); }
  if (result) { conditions.push('result = ?'); params.push(result); }
  const trimmedSearch = search?.trim();
  if (trimmedSearch && trimmedSearch.length >= 3) {
    const like = `%${trimmedSearch}%`;
    conditions.push('(audit_id LIKE ? OR actor_user_id LIKE ? OR resource_type LIKE ? OR resource_id LIKE ?)');
    params.push(like, like, like, like);
  }
  if (from) { conditions.push(`${AUDIT_TIMESTAMP_COLUMN} >= ?`); params.push(from); }
  if (to) { conditions.push(`${AUDIT_TIMESTAMP_COLUMN} <= ?`); params.push(to); }

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

export async function queryAuditCount(filter: AuditFilter = {}): Promise<number> {
  if (!pool) return 0;
  const conn = await pool.getConnection();
  try {
    const { where, params } = buildAuditWhere(filter);
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM audit_events
       ${where}`,
      params,
    );
    return (rows[0]?.total as number) || 0;
  } finally {
    conn.release();
  }
}

export async function queryAudit(filter: AuditFilter = {}): Promise<AuditEntry[]> {
  if (!pool) return [];
  const {
    page = 1,
    limit = 50,
  } = filter;
  const pageNum = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const limitNum = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.floor(limit))) : 50;

  const conn = await pool.getConnection();
  try {
    const { where, params } = buildAuditWhere(filter);

    const offset = (pageNum - 1) * limitNum;

    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT *, ${AUDIT_TIMESTAMP_COLUMN} AS created_at
       FROM audit_events
       ${where}
       ORDER BY ${AUDIT_TIMESTAMP_COLUMN} DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset],
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
    if (from) { where += `WHERE ${AUDIT_TIMESTAMP_COLUMN} >= ?`; params.push(from); }
    if (to) { where += (where ? ' AND' : 'WHERE') + ` ${AUDIT_TIMESTAMP_COLUMN} <= ?`; params.push(to); }

    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT audit_id, actor_user_id, action, resource_type, resource_id, previous_hash, event_hash,
              ${AUDIT_TIMESTAMP_COLUMN} AS created_at
       FROM audit_events ${where} ORDER BY ${AUDIT_TIMESTAMP_COLUMN} ASC`,
      params,
    );

    let broken = 0;
    let firstBrokenAt: string | null = null;
    let prevHash: string | null = null;

    for (const row of rows) {
      const expected = hashEntry(
        row.audit_id as string,
        row.actor_user_id as string,
        row.action as string,
        row.resource_type as string,
        row.resource_id as string,
      );
      const rowEventHash = row.event_hash as string;
      const rowPreviousHash = (row.previous_hash as string | null) ?? null;
      const hashOk = expected === rowEventHash;
      const chainOk = rowPreviousHash === prevHash;

      if (!hashOk || !chainOk) {
        broken++;
        if (!firstBrokenAt) firstBrokenAt = String(row.created_at);
      }

      prevHash = rowEventHash;
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
  const createdAt = normalizeToUtcIso(row.created_at);
  const integrityJson = JSON.stringify({
    eventHash: row.event_hash ?? null,
    previousHash: row.previous_hash ?? null,
    algorithm: 'sha256-chain',
  });
  return {
    auditId: row.audit_id as string,
    actorUserId: row.actor_user_id as string,
    action: row.action as string,
    resourceType: row.resource_type as string,
    resourceId: row.resource_id as string,
    result: row.result as AuditEntry['result'],
    authorizationJson: (row.authorization_json as string) ?? '{}',
    requestJson: (row.change_summary as string) ?? '{}',
    integrityJson,
    createdAt,
  };
}

function normalizeToUtcIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const withZone = /Z|[+-]\d{2}:\d{2}$/.test(normalized) ? normalized : `${normalized}Z`;
    const date = new Date(withZone);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}
