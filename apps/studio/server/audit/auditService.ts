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

let lastHash: string | null = null;

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

  const integrityJson = JSON.stringify({
    eventHash,
    previousHash: lastHash,
    algorithm: 'sha256-chain',
  });

  lastHash = eventHash;

  if (pool) {
    const conn = await pool.getConnection();
    try {
      await conn.execute(
        `INSERT INTO audit_events
           (audit_id, actor_user_id, action, resource_type, resource_id, result, authorization_json, request_json, integrity_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          auditId,
          actorUserId,
          action,
          resourceType,
          resourceId,
          result,
          JSON.stringify(authorizationContext),
          JSON.stringify(requestContext),
          integrityJson,
        ],
      );
    } finally {
      conn.release();
    }
  }

  return auditId;
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
  const params: unknown[] = [];

  if (actorUserId) { conditions.push('actor_user_id = ?'); params.push(actorUserId); }
  if (resourceType) { conditions.push('resource_type = ?'); params.push(resourceType); }
  if (resourceId) { conditions.push('resource_id = ?'); params.push(resourceId); }
  if (action) { conditions.push('action = ?'); params.push(action); }
  if (from) { conditions.push('created_at >= ?'); params.push(from); }
  if (to) { conditions.push('created_at <= ?'); params.push(to); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM audit_events ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params as string[],
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
