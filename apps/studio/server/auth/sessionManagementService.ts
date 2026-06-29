/**
 * sessionManagementService.ts
 * Gestiona el ciclo de vida de sesiones (crear, validar, invalidar).
 */

import { pool } from '../db';
import { logAuditEvent } from '../audit/auditService';

export interface Session {
  sessionId: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}

/**
 * Invalida una sesión específica (para logout, security lockout, etc.).
 */
export async function invalidateSession(
  sessionId: string,
  userId: string,
  reason: string,
  requestContext: Record<string, unknown>
): Promise<void> {
  try {
    // Marca la sesión como inactiva
    if (!pool) throw new Error('Database not configured');
    await pool.query(
      `UPDATE sessions SET is_active = FALSE, updated_at = NOW()
       WHERE session_id = ? AND user_id = ?`,
      [sessionId, userId]
    );

    // Audita la invalidación
    await logAuditEvent(
      userId,
      'SESSION_INVALIDATED',
      'Session',
      sessionId,
      'allowed',
      { reason, ...requestContext },
    );
  } catch (error) {
    console.error(`[SessionManagement] Error invalidating session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Invalida todas las sesiones activas de un usuario
 * (útil para logout global, cambio de contraseña, seguridad).
 */
export async function invalidateAllUserSessions(
  userId: string,
  reason: string,
  excludeSessionId?: string,
  requestContext?: Record<string, unknown>
): Promise<number> {
  try {
    if (!pool) throw new Error('Database not configured');

    let query = `UPDATE sessions SET is_active = FALSE, updated_at = NOW()
                 WHERE user_id = ?`;
    const params: any[] = [userId];

    // Opcionalmente excluye la sesión actual
    if (excludeSessionId) {
      query += ` AND session_id != ?`;
      params.push(excludeSessionId);
    }

    const [result] = await pool.query(query, params);

    // Audita la invalidación en masa
    if (requestContext) {
      await logAuditEvent(
        userId,
        'ALL_SESSIONS_INVALIDATED',
        'User',
        userId,
        'allowed',
        { reason, sessionsAffected: (result as any).affectedRows, ...requestContext },
      );
    }

    return (result as any).affectedRows || 0;
  } catch (error) {
    console.error(`[SessionManagement] Error invalidating all sessions for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Verifica si una sesión es válida y no ha expirado.
 */
export async function isSessionValid(sessionId: string, userId: string): Promise<boolean> {
  try {
    if (!pool) throw new Error('Database not configured');

    const [result] = await pool.query(
      `SELECT is_active, expires_at FROM sessions
       WHERE session_id = ? AND user_id = ? LIMIT 1`,
      [sessionId, userId]
    );

    const rows = result as any[];
    if (rows.length === 0) return false;

    const session = rows[0];
    return session.is_active === 1 && new Date(session.expires_at) > new Date();
  } catch (error) {
    console.error(`[SessionManagement] Error checking session validity:`, error);
    return false;
  }
}

/**
 * Obtiene una sesión por ID.
 */
export async function getSession(sessionId: string, userId: string): Promise<Session | null> {
  try {
    if (!pool) throw new Error('Database not configured');

    const [result] = await pool.query(
      `SELECT session_id as sessionId, user_id as userId, created_at as createdAt,
              expires_at as expiresAt, ip_address as ipAddress, user_agent as userAgent, is_active as isActive
       FROM sessions
       WHERE session_id = ? AND user_id = ? LIMIT 1`,
      [sessionId, userId]
    );

    const rows = result as any[];
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error(`[SessionManagement] Error getting session:`, error);
    return null;
  }
}

/**
 * Lista todas las sesiones activas de un usuario.
 */
export async function getUserActiveSessions(userId: string): Promise<Session[]> {
  try {
    if (!pool) throw new Error('Database not configured');

    const [result] = await pool.query(
      `SELECT session_id as sessionId, user_id as userId, created_at as createdAt,
              expires_at as expiresAt, ip_address as ipAddress, user_agent as userAgent, is_active as isActive
       FROM sessions
       WHERE user_id = ? AND is_active = 1 AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [userId]
    );

    return (result as any[]) || [];
  } catch (error) {
    console.error(`[SessionManagement] Error getting user sessions:`, error);
    return [];
  }
}

/**
 * Limpia sesiones expiradas (para mantenimiento).
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    if (!pool) throw new Error('Database not configured');

    const [result] = await pool.query(
      `UPDATE sessions SET is_active = FALSE
       WHERE expires_at < NOW() AND is_active = 1`
    );

    return (result as any).affectedRows || 0;
  } catch (error) {
    console.error(`[SessionManagement] Error cleaning up expired sessions:`, error);
    return 0;
  }
}
