import crypto from 'node:crypto';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../db';

export interface UserRecord {
  userId: string;
  email: string;
  displayName: string | null;
  status: 'active' | 'suspended' | 'invited';
  createdAt: string;
  updatedAt: string;
}

export async function listUsers(page = 1, limit = 50): Promise<UserRecord[]> {
  if (!pool) return [];
  const offset = (page - 1) * limit;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT user_id, email, display_name, status, created_at, updated_at
       FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset] as number[],
    );
    return rows.map(mapUser);
  } finally {
    conn.release();
  }
}

export async function getUserById(userId: string): Promise<UserRecord | null> {
  if (!pool) return null;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT user_id, email, display_name, status, created_at, updated_at FROM users WHERE user_id = ?`,
      [userId],
    );
    return rows[0] ? mapUser(rows[0]) : null;
  } finally {
    conn.release();
  }
}

export async function inviteUser(email: string, actorId: string): Promise<{ userId: string }> {
  if (!pool) return { userId: `usr_dev_${Date.now()}` };
  const conn = await pool.getConnection();
  try {
    const userId = `usr_${crypto.randomUUID().replace(/-/g, '')}`;
    await conn.execute<ResultSetHeader>(
      `INSERT INTO users (user_id, email, status, created_at, updated_at)
       VALUES (?, ?, 'invited', NOW(), NOW())
       ON DUPLICATE KEY UPDATE status = IF(status = 'suspended', 'active', status), updated_at = NOW()`,
      [userId, email],
    );
    await conn.execute(
      `INSERT INTO security_events (event_type, severity, user_id, details_json)
       VALUES ('user.invited', 'info', ?, ?)`,
      [actorId, JSON.stringify({ invitedEmail: email })],
    );
    // Recuperar el userId real (en caso de ON DUPLICATE KEY)
    const [rows] = await conn.execute<RowDataPacket[]>(`SELECT user_id FROM users WHERE email = ?`, [email]);
    return { userId: rows[0].user_id as string };
  } finally {
    conn.release();
  }
}

export async function suspendUser(userId: string, actorId: string, reason: string): Promise<void> {
  if (!pool) return;
  const conn = await pool.getConnection();
  try {
    await conn.execute(`UPDATE users SET status = 'suspended', updated_at = NOW() WHERE user_id = ?`, [userId]);
    // Revocar sesiones activas
    await conn.execute(
      `UPDATE sessions SET status = 'revoked', ended_at = NOW() WHERE user_id = ? AND status = 'active'`,
      [userId],
    );
    await conn.execute(
      `INSERT INTO audit_events (audit_id, actor_user_id, action, resource_type, resource_id, result, authorization_json, request_json, integrity_json)
       VALUES (?, ?, 'user.suspend', 'User', ?, 'allowed', ?, '{}', ?)`,
      [
        `aud_${crypto.randomUUID()}`,
        actorId,
        userId,
        JSON.stringify({ reason }),
        JSON.stringify({ eventHash: crypto.randomUUID(), previousHash: null }),
      ],
    );
  } finally {
    conn.release();
  }
}

export async function reactivateUser(userId: string, actorId: string): Promise<void> {
  if (!pool) return;
  const conn = await pool.getConnection();
  try {
    await conn.execute(`UPDATE users SET status = 'active', updated_at = NOW() WHERE user_id = ?`, [userId]);
    await conn.execute(
      `INSERT INTO security_events (event_type, severity, user_id, details_json)
       VALUES ('user.reactivated', 'info', ?, ?)`,
      [actorId, JSON.stringify({ targetUserId: userId })],
    );
  } finally {
    conn.release();
  }
}

function mapUser(row: RowDataPacket): UserRecord {
  return {
    userId: row.user_id as string,
    email: row.email as string,
    displayName: (row.display_name as string | null) ?? null,
    status: row.status as UserRecord['status'],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
