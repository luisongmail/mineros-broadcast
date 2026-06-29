import { Router, type Response } from 'express';
import type { AuthenticatedRequest } from '../auth/authMiddleware';
import { requireAuth } from '../auth/authMiddleware';
import { requireAuthorization, requireRole } from '../authorization/authzMiddleware';
import { queryAudit } from '../audit/auditService';
import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';

export const adminRouter = Router();

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
