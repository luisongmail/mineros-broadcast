import crypto from 'node:crypto';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../db';

export type ScorerRole = 'official_scorer' | 'assistant_scorer' | 'line_scorer';

export interface ScorerAssignment {
  assignmentId: string;
  gameId: string;
  userId: string;
  role: ScorerRole;
  assignedBy: string;
  assignedAt: string;
  status: 'active' | 'revoked';
}

export async function assignScorer(
  gameId: string,
  userId: string,
  role: ScorerRole,
  actorId: string,
): Promise<ScorerAssignment> {
  if (!pool) {
    return {
      assignmentId: `sa_dev_${Date.now()}`,
      gameId,
      userId,
      role,
      assignedBy: actorId,
      assignedAt: new Date().toISOString(),
      status: 'active',
    };
  }
  const conn = await pool.getConnection();
  try {
    const assignmentId = `sa_${crypto.randomUUID().replace(/-/g, '')}`;
    await conn.execute<ResultSetHeader>(
      `INSERT INTO scoring_assignments
         (assignment_id, game_id, user_id, role, assigned_by, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', NOW())
       ON DUPLICATE KEY UPDATE role = VALUES(role), status = 'active', assigned_by = VALUES(assigned_by)`,
      [assignmentId, gameId, userId, role, actorId],
    );
    await conn.execute(
      `INSERT INTO security_events (event_type, severity, user_id, details_json)
       VALUES ('scorer.assigned', 'info', ?, ?)`,
      [actorId, JSON.stringify({ gameId, targetUserId: userId, role })],
    );
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM scoring_assignments WHERE user_id = ? AND game_id = ? AND role = ? AND status = 'active' LIMIT 1`,
      [userId, gameId, role],
    );
    return mapAssignment(rows[0]);
  } finally {
    conn.release();
  }
}

export async function revokeScorer(assignmentId: string, actorId: string): Promise<void> {
  if (!pool) return;
  const conn = await pool.getConnection();
  try {
    await conn.execute(
      `UPDATE scoring_assignments SET status = 'revoked' WHERE assignment_id = ?`,
      [assignmentId],
    );
    await conn.execute(
      `INSERT INTO security_events (event_type, severity, user_id, details_json)
       VALUES ('scorer.revoked', 'info', ?, ?)`,
      [actorId, JSON.stringify({ assignmentId })],
    );
  } finally {
    conn.release();
  }
}

export async function getGameScorers(gameId: string): Promise<ScorerAssignment[]> {
  if (!pool) return [];
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM scoring_assignments WHERE game_id = ? AND status = 'active' ORDER BY created_at`,
      [gameId],
    );
    return rows.map(mapAssignment);
  } finally {
    conn.release();
  }
}

export async function canScore(
  userId: string,
  gameId: string,
  roles: ScorerRole[] = ['official_scorer', 'assistant_scorer'],
): Promise<boolean> {
  if (!pool) return process.env.NODE_ENV === 'development';
  const conn = await pool.getConnection();
  try {
    const placeholders = roles.map(() => '?').join(',');
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT 1 FROM scoring_assignments
       WHERE user_id = ? AND game_id = ? AND role IN (${placeholders}) AND status = 'active'
       LIMIT 1`,
      [userId, gameId, ...roles] as string[],
    );
    return rows.length > 0;
  } finally {
    conn.release();
  }
}

function mapAssignment(row: RowDataPacket): ScorerAssignment {
  return {
    assignmentId: row.assignment_id as string,
    gameId: row.game_id as string,
    userId: row.user_id as string,
    role: row.role as ScorerRole,
    assignedBy: row.assigned_by as string,
    assignedAt: String(row.created_at),
    status: row.status as ScorerAssignment['status'],
  };
}
