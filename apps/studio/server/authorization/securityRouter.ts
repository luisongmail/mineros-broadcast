import { Router, type Response } from 'express';
import type { AuthenticatedRequest } from '../auth/authMiddleware';
import { requireAuth } from '../auth/authMiddleware';
import { authorize, getCapabilities } from './authorizationService';
import { requestStepUp, verifyStepUp } from './stepUpService';
import { initTotpSetup, verifyAndActivateTotp, verifyTotpLogin } from '../auth/totpService';
import { signToken, getTokenExpiresInSeconds } from '../auth/jwtService';
import { createSession, buildRefreshCookie } from '../auth/sessionService';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../db';

const router = Router();

// ─────────────────────────────────────────────
// GET /api/security/context
// ─────────────────────────────────────────────
router.get('/context', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;

  // Obtener scopes disponibles (recursos donde el usuario tiene al menos un rol)
  const availableScopes: Array<{ resourceType: string; resourceId: string; name: string; role: string }> = [];

  if (pool) {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT ra.resource_type, ra.resource_id, ra.role,
                COALESCE(l.name, t.name, tm.name, g.id, 'Recurso') AS resource_name
         FROM role_assignments ra
         LEFT JOIN leagues l ON ra.resource_type = 'League' AND l.id = ra.resource_id
         LEFT JOIN tournaments t ON ra.resource_type = 'Tournament' AND t.id = ra.resource_id
         LEFT JOIN teams tm ON ra.resource_type = 'Team' AND tm.id = ra.resource_id
         LEFT JOIN games g ON ra.resource_type = 'Game' AND g.id = ra.resource_id
         WHERE ra.user_id = ? AND ra.status = 'active'`,
        [user.sub],
      );
      for (const r of rows) {
        availableScopes.push({
          resourceType: r.resource_type as string,
          resourceId: r.resource_id as string,
          name: r.resource_name as string,
          role: r.role as string,
        });
      }
    } finally {
      conn.release();
    }
  }

  const isSysAdmin = availableScopes.some((s) => s.role === 'SysAdmin') ||
    (pool ? await checkSysAdmin(user.sub) : false);

  res.json({
    user: {
      userId: user.sub,
      email: user.email,
      displayName: user.email,
      globalRoles: isSysAdmin ? ['SysAdmin'] : [],
      authLevel: user.authLevel,
      sessionId: user.sid,
    },
    availableScopes,
    securityFlags: {
      requiresStepUpForSensitiveActions: true,
      canViewAudit: isSysAdmin,
      isSysAdmin,
    },
  });
});

async function checkSysAdmin(userId: string): Promise<boolean> {
  if (!pool) return false;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT 1 FROM role_assignments WHERE user_id = ? AND role = 'SysAdmin'
       AND resource_type = 'Platform' AND resource_id = 'global' AND status = 'active' LIMIT 1`,
      [userId],
    );
    return rows.length > 0;
  } finally {
    conn.release();
  }
}

// ─────────────────────────────────────────────
// GET /api/security/resources/:resourceType/:resourceId/capabilities
// ─────────────────────────────────────────────
router.get(
  '/resources/:resourceType/:resourceId/capabilities',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user!;
    const { resourceType, resourceId } = req.params;
    const parentType = req.query.parentType as string | undefined;
    const parentId = req.query.parentId as string | undefined;

    const capabilities = await getCapabilities(
      user.sub,
      user.authLevel,
      resourceType,
      resourceId,
      parentType,
      parentId,
    );

    res.json(capabilities);
  },
);

// ─────────────────────────────────────────────
// POST /api/security/authorize
// ─────────────────────────────────────────────
router.post('/authorize', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { action, resourceType, resourceId } = req.body as {
    action: string;
    resourceType: string;
    resourceId: string;
  };

  const decision = await authorize({
    userId: user.sub,
    sessionId: user.sid,
    authLevel: user.authLevel,
    action,
    resourceType,
    resourceId,
  });

  res.json(decision);
});

// ─────────────────────────────────────────────
// POST /api/auth/step-up/request
// ─────────────────────────────────────────────
router.post('/step-up/request', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { action, resourceType, resourceId } = req.body as {
      action: string;
      resourceType: string;
      resourceId: string;
    };

    if (!action || !resourceType || !resourceId) {
      res.status(400).json({ error: { code: 'MISSING_TOKEN', message: 'action, resourceType y resourceId son requeridos.' } });
      return;
    }

    const result = await requestStepUp(
      user.sub,
      user.email,
      action,
      resourceType,
      resourceId,
      user.sid,
    );
    if (!result.ok) {
      res.status(429).json({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Demasiadas solicitudes de step-up.' } });
      return;
    }

    res.json({
      challengeId: result.challenge.challengeId,
      expiresAt: result.challenge.expiresAt.toISOString(),
      method: 'otp',
      action,
      resourceType,
      resourceId,
    });
  } catch (error) {
    console.error('[securityRouter] step-up/request failed:', error);
    const detail = error instanceof Error ? error.message : 'unknown_error';
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({
      error: {
        code: 'STEP_UP_REQUEST_FAILED',
        message: 'No fue posible iniciar la re-verificación.',
        ...(isProd ? {} : { detail }),
      },
    });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/step-up/verify
// ─────────────────────────────────────────────
router.post('/step-up/verify', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { challengeId, code } = req.body as { challengeId: string; code: string; reason?: string };

    // Extract client info from request
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? 'unknown';
    const userAgent = (req.headers['user-agent'] ?? 'unknown') as string;

    const result = await verifyStepUp(user.sub, challengeId, code, user.sid, ipAddress, userAgent);

    if (!result.ok) {
      if (result.reason === 'already_consumed') {
        res.status(409).json({ error: { code: 'CHALLENGE_ALREADY_CONSUMED', message: 'Este desafío ya fue utilizado.' } });
        return;
      }
      res.status(401).json({ error: { code: 'INVALID_STEP_UP_CODE', message: 'Código inválido o expirado.' } });
      return;
    }

    res.json({
      stepUpToken: result.stepUpToken,
      expiresAt: result.challenge.expiresAt.toISOString(),
      action: result.challenge.action,
      resourceType: result.challenge.resourceType,
      resourceId: result.challenge.resourceId,
    });
  } catch (error) {
    console.error('[securityRouter] step-up/verify failed:', error);
    res.status(500).json({ error: { code: 'STEP_UP_VERIFY_FAILED', message: 'No fue posible verificar el código.' } });
  }
});

// ─────────────────────────────────────────────
// MFA — TOTP para SysAdmin
// POST /api/auth/mfa/setup/init
// ─────────────────────────────────────────────
router.post('/mfa/setup/init', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const setup = await initTotpSetup(user.sub, user.email);
  res.json({ qrUri: setup.qrUri, secret: setup.secretBase32 });
});

// POST /api/auth/mfa/setup/verify
router.post('/mfa/setup/verify', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { code } = req.body as { code: string };
  const result = await verifyAndActivateTotp(user.sub, code);
  if (!result.ok) {
    res.status(401).json({ error: { code: 'INVALID_OTP', message: 'Código inválido. Escanea el QR nuevamente.' } });
    return;
  }
  res.json({ ok: true, credentialId: result.credentialId });
});

// POST /api/auth/mfa/verify  — segundo factor en el login
router.post('/mfa/verify', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  // El userId viene del body (estado temporal post-OTP, antes de emitir JWT)
  const { userId, email, code } = req.body as { userId: string; email: string; code: string };

  const valid = await verifyTotpLogin(userId, code);
  if (!valid) {
    res.status(401).json({ error: { code: 'INVALID_OTP', message: 'Código TOTP inválido.' } });
    return;
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? 'unknown';
  const { sessionId, refreshToken } = await createSession(userId, ip, req.headers['user-agent'] ?? '');
  const accessToken = signToken({ sub: userId, sid: sessionId, email, authLevel: 'mfa' });

  res.setHeader('Set-Cookie', buildRefreshCookie(refreshToken));
  res.json({ accessToken, tokenType: 'Bearer', expiresIn: getTokenExpiresInSeconds(), sessionId });
});

export default router;
