import { Router, type Response } from 'express';
import type { AuthenticatedRequest } from '../auth/authMiddleware';
import { requireAuth } from '../auth/authMiddleware';
import { requireAuthorization, requireRole } from '../authorization/authzMiddleware';
import { queryAudit } from '../audit/auditService';
import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';

export const adminRouter = Router();

/**
 * GET /api/admin/users
 * Get list of all users — requires SysAdmin
 */
adminRouter.get(
  '/users',
  requireAuth,
  requireRole('SysAdmin'),
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!pool) {
      res.json({ users: [] });
      return;
    }

    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT id, email, first_name, last_name, status, mfa_enabled, last_login, created_at
         FROM users ORDER BY created_at DESC`,
      );
      const users = rows.map((row) => ({
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        status: row.status,
        mfaEnabled: row.mfa_enabled,
        lastLogin: row.last_login,
        createdAt: row.created_at,
      }));
      res.json({ users });
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
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!pool) {
      res.json({ sessions: [] });
      return;
    }

    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT id, user_id, ip_address, user_agent, created_at, last_activity, expires_at
         FROM sessions WHERE status = 'active' ORDER BY last_activity DESC LIMIT 100`,
      );
      const sessions = rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at,
        lastActivity: row.last_activity,
        expiresAt: row.expires_at,
      }));
      res.json({ sessions });
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
        `UPDATE sessions SET status = 'invalidated', invalidated_at = NOW()
         WHERE id = ? AND status = 'active'`,
        [sessionId],
      );
      res.json({ ok: true, sessionId, invalidated: true, invalidatedAt: new Date().toISOString() });
    } finally {
      conn.release();
    }
  },
);

/**
 * GET /api/admin/audit/logs/export
 * Export audit logs as CSV or JSON — requires SysAdmin
 */
adminRouter.get(
  '/audit/logs/export',
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
  requireAuthorization('policy.update', { resourceType: 'Platform' }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { policyName, policyContent } = req.body as {
      policyName: string;
      policyContent: Record<string, unknown>;
    };

    if (!policyName || !policyContent) {
      res.status(400).json({ error: 'policy_name and policy_content required' });
      return;
    }

    // TODO: Persist policy update to database
    // For now, just acknowledge
    res.json({
      ok: true,
      policyName,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user!.sub,
    });
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
        `UPDATE users SET status = 'suspended', suspended_reason = ?, suspended_at = NOW()
         WHERE id = ?`,
        [reason || 'admin_suspension', userId],
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
        `UPDATE users SET status = 'active', suspended_reason = NULL, suspended_at = NULL
         WHERE id = ?`,
        [userId],
      );
      res.json({ ok: true, userId, reactivated: true, reactivatedAt: new Date().toISOString() });
    } finally {
      conn.release();
    }
  },
);

/**
 * GET /api/admin/audit/logs
 * View audit logs — requires SysAdmin role
 * Protected: Sensitive operational data
 */
adminRouter.get(
  '/audit/logs',
  requireAuth,
  requireRole('SysAdmin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const {
      userId,
      action,
      resourceType,
      resourceId,
      from,
      to,
      page = '1',
      limit = '50',
    } = req.query as Record<string, string>;

    const entries = await queryAudit({
      actorUserId: userId,
      action,
      resourceType,
      resourceId,
      from,
      to,
      page: Number(page),
      limit: Number(limit),
    });

    res.json({
      entries,
      page: Number(page),
      limit: Number(limit),
      count: entries.length,
    });
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
  requireAuthorization('session.invalidate', { resourceType: 'System' }),
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

export default adminRouter;
