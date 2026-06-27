import crypto from 'node:crypto';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../db';

export type ResourceType = 'Tournament' | 'League' | 'Game' | 'Season';
export type RoleLevel = 'Owner' | 'Admin' | 'Operator' | 'User';

export interface RoleAssignment {
  assignmentId: string;
  userId: string;
  resourceType: ResourceType;
  resourceId: string;
  role: RoleLevel;
  assignedBy: string;
  assignedAt: string;
  status: 'active' | 'revoked';
}

export async function assignRole(
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
  role: RoleLevel,
  actorId: string,
): Promise<RoleAssignment> {
  if (!pool) {
    return {
      assignmentId: `ra_dev_${Date.now()}`,
      userId,
      resourceType,
      resourceId,
      role,
      assignedBy: actorId,
      assignedAt: new Date().toISOString(),
      status: 'active',
    };
  }
  const conn = await pool.getConnection();
  try {
    const assignmentId = `ra_${crypto.randomUUID().replace(/-/g, '')}`;
    await conn.execute<ResultSetHeader>(
      `INSERT INTO role_assignments
         (assignment_id, user_id, resource_type, resource_id, role, assigned_by, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
       ON DUPLICATE KEY UPDATE role = VALUES(role), status = 'active', assigned_by = VALUES(assigned_by), updated_at = NOW()`,
      [assignmentId, userId, resourceType, resourceId, role, actorId],
    );
    await conn.execute(
      `INSERT INTO security_events (event_type, severity, user_id, details_json)
       VALUES ('role.assigned', 'info', ?, ?)`,
      [actorId, JSON.stringify({ targetUserId: userId, resourceType, resourceId, role })],
    );
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM role_assignments WHERE user_id = ? AND resource_type = ? AND resource_id = ? AND role = ? AND status = 'active' LIMIT 1`,
      [userId, resourceType, resourceId, role],
    );
    return mapAssignment(rows[0]);
  } finally {
    conn.release();
  }
}

export async function revokeRole(
  assignmentId: string,
  actorId: string,
): Promise<void> {
  if (!pool) return;
  const conn = await pool.getConnection();
  try {
    await conn.execute(
      `UPDATE role_assignments SET status = 'revoked', updated_at = NOW() WHERE assignment_id = ?`,
      [assignmentId],
    );
    await conn.execute(
      `INSERT INTO security_events (event_type, severity, user_id, details_json)
       VALUES ('role.revoked', 'info', ?, ?)`,
      [actorId, JSON.stringify({ assignmentId })],
    );
  } finally {
    conn.release();
  }
}

export async function getUserRoles(userId: string): Promise<RoleAssignment[]> {
  if (!pool) return [];
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM role_assignments WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map(mapAssignment);
  } finally {
    conn.release();
  }
}

export async function getResourceMembers(
  resourceType: ResourceType,
  resourceId: string,
): Promise<RoleAssignment[]> {
  if (!pool) return [];
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM role_assignments WHERE resource_type = ? AND resource_id = ? AND status = 'active' ORDER BY created_at DESC`,
      [resourceType, resourceId],
    );
    return rows.map(mapAssignment);
  } finally {
    conn.release();
  }
}

function mapAssignment(row: RowDataPacket): RoleAssignment {
  return {
    assignmentId: row.assignment_id as string,
    userId: row.user_id as string,
    resourceType: row.resource_type as ResourceType,
    resourceId: row.resource_id as string,
    role: row.role as RoleLevel,
    assignedBy: row.assigned_by as string,
    assignedAt: String(row.created_at),
    status: row.status as RoleAssignment['status'],
  };
}
