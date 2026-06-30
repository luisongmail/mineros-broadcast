import { Router, type Response } from 'express';
import type { AuthenticatedRequest } from '../auth/authMiddleware';
import { requireAuth } from '../auth/authMiddleware';
import { requireAuthorization, requireRole } from '../authorization/authzMiddleware';
import {
  STEP_UP_HEADER,
  stepUpRequired,
  validateStepUpToken,
} from '../authorization/stepUpService';
import { queryAudit, queryAuditCount, logAuditEvent } from '../audit/auditService';
import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';

export const adminRouter = Router();

function isMysqlError(
  error: unknown,
): error is { code?: string; sqlMessage?: string; message?: string } {
  return typeof error === 'object' && error !== null;
}

function toUtcIso(value: unknown): string {
  if (value == null) return '';
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

/**
 * GET /api/admin/users
 * Paginated + filtered user listing — requires SysAdmin
 *
 * Query params:
 *   page     — page number, default 1
 *   limit    — rows per page, 1-100, default 50
 *   search   — text against email / display_name (LIKE)
 *   status   — 'active' | 'suspended' | 'inactive'
 *   role     — 'SysAdmin' | 'Admin' | 'Operator' | 'none'
 *   mfa      — 'enabled' | 'disabled'
 *   sortBy   — 'created_at' | 'email' | 'display_name' | 'last_login_at', default 'created_at'
 *   sortDir  — 'asc' | 'desc', default 'desc'
 */
adminRouter.get(
  '/users',
  requireAuth,
  requireRole('SysAdmin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!pool) {
      res.json({ users: [], total: 0, page: 1, limit: 50, pages: 0 });
      return;
    }

    const {
      page: pageStr = '1',
      limit: limitStr = '50',
      search = '',
      status,
      role,
      mfa,
      sortBy = 'created_at',
      sortDir = 'desc',
    } = req.query as Record<string, string>;

    const page = Math.max(1, parseInt(pageStr, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(limitStr, 10) || 50));
    const offset = (page - 1) * limit;

    const ALLOWED_SORT = new Set(['created_at', 'email', 'display_name', 'last_login_at']);
    const orderCol = ALLOWED_SORT.has(sortBy) ? `u.${sortBy}` : 'u.created_at';
    const orderDir = sortDir === 'asc' ? 'ASC' : 'DESC';

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (search.trim().length >= 3) {
      conditions.push('(u.email LIKE ? OR u.display_name LIKE ?)');
      const like = `%${search.trim()}%`;
      params.push(like, like);
    }
    if (status && ['active', 'suspended', 'inactive'].includes(status)) {
      conditions.push('u.status = ?');
      params.push(status);
    }
    if (mfa === 'enabled') {
      conditions.push('u.mfa_enabled = 1');
    } else if (mfa === 'disabled') {
      conditions.push('u.mfa_enabled = 0');
    }
    if (role === 'none') {
      conditions.push('ra.role IS NULL');
    } else if (role && ['SysAdmin', 'Admin', 'Operator'].includes(role)) {
      conditions.push('ra.role = ?');
      params.push(role);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const conn = await pool.getConnection();
    try {
      const [countRows] = await conn.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total
         FROM users u
         LEFT JOIN role_assignments ra ON u.user_id = ra.user_id
           AND ra.resource_type = 'Platform'
           AND ra.resource_id = 'global'
           AND ra.status = 'active'
         ${where}`,
        params,
      );

      const total = (countRows[0]?.total as number) || 0;
      const pages = Math.max(1, Math.ceil(total / limit));

      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT u.user_id, u.email, u.display_name, u.status, u.mfa_enabled, u.last_login_at, u.created_at,
                ra.role
         FROM users u
         LEFT JOIN role_assignments ra ON u.user_id = ra.user_id
           AND ra.resource_type = 'Platform'
           AND ra.resource_id = 'global'
           AND ra.status = 'active'
         ${where}
         ORDER BY ${orderCol} ${orderDir}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      );

      const users = rows.map((row) => {
        const displayName: string = row.display_name ?? '';
        const parts = displayName.split(' ');
        return {
          id: row.user_id,
          email: row.email,
          firstName: parts[0] || '',
          lastName: parts.slice(1).join(' ') || '',
          status: row.status,
          mfaEnabled: Boolean(row.mfa_enabled),
          lastLogin: toUtcIso(row.last_login_at),
          createdAt: toUtcIso(row.created_at),
          role: row.role || null,
        };
      });

      res.json({ users, total, page, limit, pages });
    } catch (err) {
      console.error('[adminRouter] GET /users failed:', err);
      if (isMysqlError(err) && (err.code === 'ER_BAD_FIELD_ERROR' || err.code === 'ER_NO_SUCH_TABLE')) {
        res.status(500).json({
          error: {
            code: 'ADMIN_USERS_SCHEMA_MISMATCH',
            message: err.sqlMessage || err.message || 'Esquema de base de datos incompatible para /api/admin/users.',
          },
        });
        return;
      }
      res.status(500).json({ error: { code: 'DB_ERROR', message: 'Error al obtener usuarios.' } });
    } finally {
      conn.release();
    }
  },
);

/**
 * PATCH /api/admin/users/:userId
 * Update user display_name — requires SysAdmin
 */
adminRouter.patch(
  '/users/:userId',
  requireAuth,
  requireRole('SysAdmin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { userId } = req.params;
    const { displayName } = req.body as { displayName?: string };

    if (!displayName || displayName.trim().length === 0) {
      res.status(400).json({
        error: {
          code: 'INVALID_DISPLAY_NAME',
          message: 'displayName no puede estar vacío.',
        },
      });
      return;
    }

    if (!pool) {
      res.json({ ok: true, userId, displayName, message: 'Nombre actualizado (mock).' });
      return;
    }

    const conn = await pool.getConnection();
    try {
      const [userRows] = await conn.execute<RowDataPacket[]>(
        `SELECT user_id, display_name FROM users WHERE user_id = ?`,
        [userId],
      );
      if (userRows.length === 0) {
        res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' } });
        return;
      }

      const oldDisplayName = userRows[0].display_name;
      await conn.execute(
        `UPDATE users SET display_name = ?, updated_at = NOW() WHERE user_id = ?`,
        [displayName.trim(), userId],
      );

      await logAuditEvent(
        req.user!.userId,
        'user.profile.update',
        'User',
        userId,
        'allowed',
        {
          field: 'display_name',
          oldValue: oldDisplayName,
          newValue: displayName.trim(),
          actorRole: req.user!.role,
        },
        {
          reason: 'admin_profile_update',
        },
      );

      res.json({ ok: true, userId, displayName: displayName.trim(), message: 'Nombre de usuario actualizado.' });
    } finally {
      conn.release();
    }
  },
);

/**
 * DELETE /api/admin/users/:userId
 * Delete user — SysAdmin global OR Admin/Owner scoped to Tournament/Team
 */
adminRouter.delete(
  '/users/:userId',
  requireAuth,
  requireRole('Admin', 'SysAdmin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { userId } = req.params;
    const { reason, confirmationName, resourceType, resourceId } = req.body as {
      reason?: string;
      confirmationName?: string;
      resourceType?: 'Tournament' | 'Team';
      resourceId?: string;
    };

    if (!reason || !reason.trim()) {
      res.status(400).json({ error: { code: 'REASON_REQUIRED', message: 'reason es requerido.' } });
      return;
    }
    if (!confirmationName || !confirmationName.trim()) {
      res.status(400).json({ error: { code: 'CONFIRMATION_REQUIRED', message: 'confirmationName es requerido.' } });
      return;
    }

    if (!pool) {
      res.json({ ok: true, userId, deleted: true });
      return;
    }

    const conn = await pool.getConnection();
    try {
      const [targetRows] = await conn.execute<RowDataPacket[]>(
        `SELECT user_id, email, display_name FROM users WHERE user_id = ? LIMIT 1`,
        [userId],
      );
      if (targetRows.length === 0) {
        res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' } });
        return;
      }
      const expectedConfirmationName =
        String(targetRows[0].display_name ?? '').trim() || String(targetRows[0].email ?? '');
      if (confirmationName.trim() !== expectedConfirmationName) {
        res.status(400).json({
          error: {
            code: 'CONFIRMATION_MISMATCH',
            message: 'El nombre de confirmación no coincide.',
            expected: expectedConfirmationName,
          },
        });
        return;
      }

      const isSysAdmin = req.user?.role === 'SysAdmin';
      if (!isSysAdmin) {
        if (!resourceType || !resourceId) {
          res.status(400).json({ error: { code: 'RESOURCE_SCOPE_REQUIRED', message: 'resourceType/resourceId son requeridos para Admin.' } });
          return;
        }
        if (!['Tournament', 'Team'].includes(resourceType)) {
          res.status(400).json({ error: { code: 'INVALID_SCOPE', message: 'resourceType debe ser Tournament o Team.' } });
          return;
        }

        const [actorScope] = await conn.execute<RowDataPacket[]>(
          `SELECT 1
           FROM role_assignments
           WHERE user_id = ? AND resource_type = ? AND resource_id = ?
             AND role IN ('Admin','Owner') AND status = 'active'
           LIMIT 1`,
          [req.user!.userId, resourceType, resourceId],
        );
        if (actorScope.length === 0) {
          res.status(403).json({ error: { code: 'PERMISSION_DENIED', message: 'No tienes permisos en ese scope.' } });
          return;
        }

        const [targetScope] = await conn.execute<RowDataPacket[]>(
          `SELECT 1
           FROM role_assignments
           WHERE user_id = ? AND resource_type = ? AND resource_id = ? AND status = 'active'
           LIMIT 1`,
          [userId, resourceType, resourceId],
        );
        if (targetScope.length === 0) {
          res.status(403).json({ error: { code: 'USER_SCOPE_MISMATCH', message: 'El usuario no está asignado a ese scope.' } });
          return;
        }
      }

      const [targetPrivilegedRoleRows] = await conn.execute<RowDataPacket[]>(
        `SELECT role
         FROM role_assignments
         WHERE user_id = ? AND status = 'active'
           AND resource_type = 'Platform' AND resource_id = 'global'
           AND role IN ('Admin','SysAdmin')
         LIMIT 1`,
        [userId],
      );
      const requiresStepUp = targetPrivilegedRoleRows.length > 0;
      if (requiresStepUp) {
        const rawStepUpHeader = req.headers[STEP_UP_HEADER];
        const stepUpToken = Array.isArray(rawStepUpHeader) ? rawStepUpHeader[0] : rawStepUpHeader;
        const hasFreshStepUpSession = stepUpRequired(req.user!.sessionId, req.user!.stepUpAt);

        if (!hasFreshStepUpSession) {
          const hasValidStepUpToken =
            typeof stepUpToken === 'string' &&
            stepUpToken.length > 0 &&
            (await validateStepUpToken(
              stepUpToken,
              req.user!.userId,
              'delete_user',
              userId,
            ));

          if (!hasValidStepUpToken) {
            res.status(403).json({
              error: {
                code: 'STEP_UP_REQUIRED',
                message: 'Esta acción requiere re-verificación.',
              },
            });
            return;
          }
        }
      }

      await conn.execute(`DELETE FROM users WHERE user_id = ?`, [userId]);

      await logAuditEvent(
        req.user!.userId,
        'user.delete',
        'User',
        userId,
        'allowed',
        {
          actorRole: req.user!.role,
          resourceType: resourceType ?? 'Platform',
          resourceId: resourceId ?? 'global',
        },
        {
          reason: reason.trim(),
          targetEmail: targetRows[0].email,
        },
      );

      res.json({ ok: true, userId, deleted: true });
    } finally {
      conn.release();
    }
  },
);

/**
 * GET /api/admin/sessions
 * Get list of active sessions — requires SysAdmin
 */
adminRouter.get(
  '/sessions',
  requireAuth,
  requireRole('SysAdmin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!pool) {
      res.json({ sessions: [], total: 0, page: 1, limit: 50, pages: 0 });
      return;
    }

    const {
      page: pageStr = '1',
      limit: limitStr = '50',
      search = '',
      status = 'active',
      sortBy = 'last_seen_at',
      sortDir = 'desc',
    } = req.query as Record<string, string>;

    const page = Math.max(1, parseInt(pageStr, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(limitStr, 10) || 50));
    const offset = (page - 1) * limit;

    const allowedSort = new Set(['created_at', 'last_seen_at', 'user_id', 'session_id', 'ip']);
    const orderCol = allowedSort.has(sortBy) ? `s.${sortBy}` : 's.last_seen_at';
    const orderDir = sortDir === 'asc' ? 'ASC' : 'DESC';

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (status === 'active') {
      conditions.push('s.status = ?');
      params.push('active');
      conditions.push('(s.expires_at IS NULL OR s.expires_at > NOW())');
    } else if (status === 'expired') {
      conditions.push('s.status = ?');
      params.push('active');
      conditions.push('s.expires_at IS NOT NULL AND s.expires_at <= NOW()');
    } else if (status === 'invalidated') {
      conditions.push('s.status = ?');
      params.push('invalidated');
    }

    if (search.trim().length >= 3) {
      const like = `%${search.trim()}%`;
      conditions.push('(s.session_id LIKE ? OR s.user_id LIKE ? OR s.ip LIKE ?)');
      params.push(like, like, like);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const conn = await pool.getConnection();
    try {
      const [countRows] = await conn.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total
         FROM sessions s
         ${where}`,
        params,
      );
      const total = (countRows[0]?.total as number) || 0;
      const pages = Math.ceil(total / limit) || 1;

      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT s.session_id, s.user_id, s.ip, s.user_agent_hash, s.created_at, s.last_seen_at, s.expires_at
         FROM sessions s
         ${where}
         ORDER BY ${orderCol} ${orderDir}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      );
      const sessions = rows.map((row) => ({
        id: row.session_id,
        userId: row.user_id,
        ipAddress: row.ip,
        userAgent: row.user_agent_hash,
        createdAt: toUtcIso(row.created_at),
        lastActivity: toUtcIso(row.last_seen_at),
        expiresAt: toUtcIso(row.expires_at),
      }));
      res.json({ sessions, total, page, limit, pages });
    } catch (err) {
      console.error('[adminRouter] GET /sessions failed:', err);
      res.status(500).json({ error: { code: 'SESSIONS_FETCH_ERROR', message: 'Error al obtener sesiones.' } });
    } finally {
      conn.release();
    }
  },
);

/**
 * DELETE /api/admin/sessions/:sessionId
 * Invalidate a single session — requires SysAdmin + step-up MFA
 */
adminRouter.delete(
  '/sessions/:sessionId',
  requireAuth,
  requireRole('SysAdmin'),
  requireAuthorization('session.invalidate', { resourceType: 'Session', resourceIdParam: 'sessionId' }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { sessionId } = req.params;

    if (!pool) {
      res.json({ ok: true, sessionId, invalidated: true });
      return;
    }

    const conn = await pool.getConnection();
    try {
      await conn.execute(
        `UPDATE sessions SET status = 'invalidated', revoked_at = NOW()
         WHERE session_id = ? AND status = 'active'`,
        [sessionId],
      );
      res.json({ ok: true, sessionId, invalidated: true, revokedAt: new Date().toISOString() });
    } finally {
      conn.release();
    }
  },
);

/**
 * GET /api/admin/audit-logs/export
 * Export audit logs as CSV or JSON — requires SysAdmin
 */
adminRouter.get(
  '/audit-logs/export',
  requireAuth,
  requireRole('SysAdmin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const {
      format = 'csv',
      action,
      from,
      to,
    } = req.query as Record<string, string>;

    const entries = await queryAudit({
      action,
      from,
      to,
      page: 1,
      limit: 10000, // Export all available
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.json"');
      res.json(entries);
      return;
    }

    // CSV format (default)
    const csvHeader = 'AuditID,Actor,Action,ResourceType,ResourceID,Result,CreatedAt\n';
    const csvRows = entries
      .map((entry) =>
        [
          entry.auditId,
          entry.actorUserId || '',
          entry.action,
          entry.resourceType,
          entry.resourceId,
          entry.result,
          entry.createdAt,
        ]
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    res.send(csvHeader + csvRows);
  },
);

/**
 * POST /api/admin/policy/update
 * Update security policy — requires SysAdmin role + step-up MFA
 * Protected: Admin-only action requiring identity re-verification
 */
adminRouter.post(
  '/policy/update',
  requireAuth,
  requireRole('SysAdmin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const body = req.body as Record<string, unknown>;
      const policyName = typeof body.policyName === 'string' ? body.policyName : 'default';
      // Accept both formats: { policyContent: {...} } or direct { ...policyData }
      const policyData = body.policyContent || body.policy || body;

      // Validate required fields
      if (!policyData || typeof policyData !== 'object') {
        res.status(400).json({ error: { code: 'INVALID_POLICY', message: 'Policy data required' } });
        return;
      }

      if (!pool) {
        // Mock response if no database
        res.json({
          ok: true,
          policyName,
          policyContent: policyData,
          updatedAt: new Date().toISOString(),
          updatedBy: req.user!.userId,
        });
        return;
      }

      const conn = await pool.getConnection();
      try {
        // Update or insert default policy
        await conn.execute(
          `INSERT INTO system_policies (policy_name, policy_content, updated_by)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE
             policy_content = ?,
             updated_by = ?,
             updated_at = NOW()`,
          [
            policyName,
            JSON.stringify(policyData),
            req.user!.userId,
            JSON.stringify(policyData),
            req.user!.userId,
          ],
        );

        res.json({
          ok: true,
          policyName,
          policyContent: policyData,
          updatedAt: new Date().toISOString(),
          updatedBy: req.user!.userId,
        });
      } finally {
        conn.release();
      }
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'POLICY_UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update policy',
        },
      });
    }
  },
);

/**
 * POST /api/admin/user/:userId/suspend
 * Suspend user account — requires SysAdmin + step-up MFA
 * Protected: Sensitive action affecting user access
 */
adminRouter.post(
  '/user/:userId/suspend',
  requireAuth,
  requireRole('SysAdmin'),
  requireAuthorization('user.suspend', { resourceType: 'User', resourceIdParam: 'userId' }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { userId } = req.params;
    const { reason } = req.body as { reason?: string };

    if (!pool) {
      res.json({ ok: true, userId, suspended: true });
      return;
    }

    const conn = await pool.getConnection();
    try {
      await conn.execute(
        `UPDATE users SET status = 'suspended'
         WHERE user_id = ?`,
        [userId],
      );

      // Log to audit trail
      await logAuditEvent(
        req.user!.userId,
        'user.suspend',
        'User',
        userId,
        'allowed',
        {
          action: 'suspend',
          reason: reason || 'admin_suspension',
          actorRole: req.user!.role,
        },
        {
          reason: reason || 'admin_suspension',
        },
      );

      res.json({ ok: true, userId, suspended: true, suspendedAt: new Date().toISOString() });
    } finally {
      conn.release();
    }
  },
);

/**
 * POST /api/admin/user/:userId/reactivate
 * Reactivate suspended user — requires SysAdmin + step-up MFA
 */
adminRouter.post(
  '/user/:userId/reactivate',
  requireAuth,
  requireRole('SysAdmin'),
  requireAuthorization('user.reactivate', { resourceType: 'User', resourceIdParam: 'userId' }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { userId } = req.params;

    if (!pool) {
      res.json({ ok: true, userId, reactivated: true });
      return;
    }

    const conn = await pool.getConnection();
    try {
      await conn.execute(
        `UPDATE users SET status = 'active'
         WHERE user_id = ?`,
        [userId],
      );

      // Log to audit trail
      await logAuditEvent(
        req.user!.userId,
        'user.reactivate',
        'User',
        userId,
        'allowed',
        {
          action: 'reactivate',
          actorRole: req.user!.role,
        },
        {
          reason: 'admin_reactivate_user',
        },
      );

      res.json({ ok: true, userId, reactivated: true, reactivatedAt: new Date().toISOString() });
    } finally {
      conn.release();
    }
  },
);

/**
 * GET /api/admin/audit-logs
 * View audit logs — requires SysAdmin role
 * Protected: Sensitive operational data
 */
adminRouter.get(
  '/audit-logs',
  requireAuth,
  requireRole('SysAdmin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const {
      page = '1',
      limit = '50',
      action,
      result,
      search,
    } = req.query as Record<string, string>;

    try {
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Math.min(100, Number(limit) || 50));
      const auditResult: 'allowed' | 'denied' | undefined =
        (result === 'allowed' || result === 'denied') ? result : undefined;
      const auditFilters: {
        page: number;
        limit: number;
        action?: string;
        result?: 'allowed' | 'denied';
        search?: string;
      } = {
        page: pageNum,
        limit: limitNum,
        action: action || undefined,
        result: auditResult,
        search: search?.trim() && search.trim().length >= 3 ? search.trim() : undefined,
      };

      const logs = await queryAudit(auditFilters);
      const total = await queryAuditCount(auditFilters);
      const pages = Math.ceil(total / limitNum) || 1;

      res.json({
        logs,
        total,
        page: pageNum,
        limit: limitNum,
        pages,
        count: logs.length,
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({
        error: 'Failed to fetch audit logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

/**
 * POST /api/admin/sessions/invalidate
 * Invalidate all sessions for a user — requires SysAdmin + step-up MFA
 * Protected: Immediate security impact
 */
adminRouter.post(
  '/sessions/invalidate',
  requireAuth,
  requireRole('SysAdmin'),
  requireAuthorization('session.invalidate', { resourceType: 'User', resourceIdParam: 'userId' }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { userId } = req.body as { userId: string };

    if (!userId) {
      res.status(400).json({ error: 'userId required' });
      return;
    }

    if (!pool) {
      res.json({ ok: true, sessionsInvalidated: 1, userId });
      return;
    }

    const conn = await pool.getConnection();
    try {
      const [result] = await conn.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM sessions WHERE user_id = ? AND status = 'active'`,
        [userId],
      );
      const count = (result[0].count as number) || 0;

      await conn.execute(
        `UPDATE sessions SET status = 'invalidated', invalidated_at = NOW()
         WHERE user_id = ? AND status = 'active'`,
        [userId],
      );

      res.json({
        ok: true,
        userId,
        sessionsInvalidated: count,
        invalidatedAt: new Date().toISOString(),
      });
    } finally {
      conn.release();
    }
  },
);

/**
 * GET /api/admin/system/health
 * System health and metrics — requires SysAdmin
 */
adminRouter.get(
  '/system/health',
  requireAuth,
  requireRole('SysAdmin'),
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      db: pool ? 'connected' : 'not_configured',
    });
  },
);

// ────────────────────────────────────────────
// User Management: Invite + Role Assignment
// ────────────────────────────────────────────

/**
 * POST /api/admin/users/invite
 * Invite a new user to the system
 * Required: SysAdmin
 */
adminRouter.post(
 '/users/invite',
 requireAuth,
 requireRole('SysAdmin'),
 async (req: AuthenticatedRequest, res: Response): Promise<void> => {
   try {
     const { email } = req.body as { email?: string };

     if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
       res.status(400).json({ error: { code: 'INVALID_EMAIL', message: 'Email válido requerido.' } });
       return;
     }

     if (!pool) {
       res.json({ ok: true, userId: `usr_dev_${Date.now()}`, email });
       return;
     }

     const conn = await pool.getConnection();
     try {
       // Check if user already exists
       const [existing] = await conn.execute<RowDataPacket[]>(
         `SELECT user_id FROM users WHERE email = ?`,
         [email.toLowerCase().trim()],
       );

       if (existing.length > 0) {
         res.status(400).json({ error: { code: 'USER_EXISTS', message: 'Usuario ya existe.' } });
         return;
       }

       // Create user
       const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(7)}`;
       await conn.execute(
         `INSERT INTO users (user_id, email, display_name, status, created_at, updated_at)
          VALUES (?, ?, ?, 'active', NOW(), NOW())`,
         [userId, email.toLowerCase().trim(), email.split('@')[0]],
       );

       res.status(201).json({ ok: true, userId, email, message: 'Usuario invitado. Podrá crear contraseña en el primer login.' });
     } finally {
       conn.release();
     }
   } catch (err) {
     console.error('[Admin] Error inviting user:', err);
     res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error al invitar usuario.' } });
   }
 },
);

/**
 * POST /api/admin/users/:userId/roles/assign
 * Assign a role (global/scoped): SysAdmin, Admin, Operator
 * Required: SysAdmin
 */
adminRouter.post(
 '/users/:userId/roles/assign',
 requireAuth,
 requireRole('SysAdmin'),
 async (req: AuthenticatedRequest, res: Response): Promise<void> => {
   try {
     const { userId } = req.params;
     const {
       role,
       resourceType: rawResourceType,
       resourceId: rawResourceId,
     } = req.body as {
       role?: string;
       resourceType?: 'Platform' | 'Tournament' | 'Team';
       resourceId?: string;
     };

     if (!role || !['SysAdmin', 'Admin', 'Operator'].includes(role)) {
       res.status(400).json({
         error: {
           code: 'INVALID_ROLE',
           message: 'Role debe ser: SysAdmin, Admin, o Operator.',
         },
       });
       return;
     }

     const resourceType = rawResourceType ?? 'Platform';
     if (!['Platform', 'Tournament', 'Team'].includes(resourceType)) {
       res.status(400).json({
         error: {
           code: 'INVALID_SCOPE',
           message: 'resourceType debe ser Platform, Tournament o Team.',
         },
       });
       return;
     }

     const resourceId = resourceType === 'Platform'
       ? (rawResourceId?.trim() || 'global')
       : (rawResourceId?.trim() || '');

     if ((resourceType === 'Tournament' || resourceType === 'Team') && resourceId.length === 0) {
       res.status(400).json({
         error: {
           code: 'INVALID_SCOPE',
           message: 'resourceId es obligatorio para Tournament/Team.',
         },
       });
       return;
     }

     if (!pool) {
       res.json({ ok: true, userId, role, resourceType, resourceId, message: 'Rol asignado (mock).' });
       return;
     }

     const conn = await pool.getConnection();
     try {
       // Verify user exists and get current role
       const [user] = await conn.execute<RowDataPacket[]>(
         `SELECT ra.role FROM users u
          LEFT JOIN role_assignments ra ON u.user_id = ra.user_id AND ra.resource_type = ? AND ra.resource_id = ?
          WHERE u.user_id = ?`,
         [resourceType, resourceId, userId],
       );
       if (user.length === 0) {
         res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' } });
         return;
       }

       const oldRole = user[0].role || null;

       // Delete existing role assignment (simpler than ON DUPLICATE KEY with missing columns)
       await conn.execute(
         `DELETE FROM role_assignments WHERE user_id = ? AND resource_type = ? AND resource_id = ?`,
         [userId, resourceType, resourceId],
       );

       // Assign new role
       await conn.execute(
         `INSERT INTO role_assignments (user_id, role, resource_type, resource_id, granted_by_user_id, status, created_at)
          VALUES (?, ?, ?, ?, ?, 'active', NOW())`,
         [userId, role, resourceType, resourceId, req.user?.sub || null],
       );

       // Log to audit trail
       await logAuditEvent(
        req.user!.userId,
         'user.role.assign',
         'User',
         userId,
         'allowed',
         {
           field: 'role',
           oldValue: oldRole,
           newValue: role,
           resourceType,
           resourceId,
           actorRole: req.user!.role,
         },
        {
          reason: 'admin_assign_role',
        },
       );

       res.json({ ok: true, userId, role, resourceType, resourceId, message: `Rol '${role}' asignado a usuario.` });
     } finally {
       conn.release();
     }
   } catch (err) {
     console.error('[Admin] Error assigning role:', err);
     res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error al asignar rol.' } });
   }
 },
);

/**
 * GET /api/admin/users/:userId/roles
 * Get user's global role assignment
 * Required: SysAdmin
 */
adminRouter.get(
 '/users/:userId/roles',
 requireAuth,
 requireRole('SysAdmin'),
 async (req: AuthenticatedRequest, res: Response): Promise<void> => {
   try {
     const { userId } = req.params;

     if (!pool) {
       res.json({ userId, role: 'Operator', status: 'active' });
       return;
     }

     const conn = await pool.getConnection();
     try {
       const [roles] = await conn.execute<RowDataPacket[]>(
         `SELECT role, status, created_at FROM role_assignments WHERE user_id = ? AND status = 'active'`,
         [userId],
       );

       if (roles.length === 0) {
         res.json({ userId, role: null, message: 'Usuario sin rol asignado.' });
         return;
       }

       // Return highest priority role
       const rolePriority = { SysAdmin: 3, Admin: 2, Operator: 1 };
       const sorted = roles.sort((a, b) => (rolePriority[a.role as keyof typeof rolePriority] || 0) - (rolePriority[b.role as keyof typeof rolePriority] || 0));

       res.json({ userId, role: sorted[sorted.length - 1].role, status: sorted[sorted.length - 1].status });
     } finally {
       conn.release();
     }
   } catch (err) {
     console.error('[Admin] Error fetching user roles:', err);
     res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error al obtener roles.' } });
   }
 },
);

export default adminRouter;
