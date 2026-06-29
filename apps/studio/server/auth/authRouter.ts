import { Router, type Request, type Response } from 'express';
import { requestOtp, verifyOtp, consumeOtpPlaintext } from './otpService';
import { sendOtpEmail } from './emailService';
import { signToken, getTokenExpiresInSeconds } from './jwtService';
import {
  createSession,
  rotateRefreshToken,
  revokeSession,
  buildRefreshCookie,
  buildClearCookie,
} from './sessionService';
import { requireAuth, type AuthenticatedRequest } from './authMiddleware';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../db';

const router = Router();

// ─────────────────────────────────────────────
// POST /api/auth/otp/request
// ─────────────────────────────────────────────
router.post('/otp/request', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as { email?: string };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: { code: 'INVALID_EMAIL', message: 'Ingresa un correo electrónico válido.' } });
    return;
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? 'unknown';
  const result = await requestOtp(email.toLowerCase().trim(), ip);

  if (!result.ok) {
    res.status(429).json({
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Demasiados intentos. Espera antes de solicitar un nuevo código.', retryAfter: result.retryAfter },
    });
    return;
  }

  // Enviar email (sin esperar — no revelar si el email existe)
  if (result.challengeId !== 'noop' && result.challengeId !== 'dev_nodb') {
    const otp = consumeOtpPlaintext(result.challengeId);
    if (otp) {
      sendOtpEmail(email, otp).catch((err) => {
        console.error('[Auth] Error enviando OTP email:', err);
      });
    }
  }

  res.json({ message: 'Si el correo está registrado o invitado, recibirás un código de acceso.' });
});

// ─────────────────────────────────────────────
// POST /api/auth/otp/verify
// ─────────────────────────────────────────────
router.post('/otp/verify', async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body as { email?: string; otp?: string };

  console.log(`[AUTH] POST /otp/verify → email=${email}, otp=${otp}`);

  if (!email || !otp) {
    console.log(`[AUTH] /otp/verify → MISSING EMAIL OR OTP`);
    res.status(400).json({ error: { code: 'INVALID_OTP', message: 'Código inválido o expirado.' } });
    return;
  }

  const result = await verifyOtp(email.toLowerCase().trim(), otp.trim());
  console.log(`[AUTH] /otp/verify → result:`, result);

  if (!result.ok) {
    if (result.reason === 'max_attempts') {
      res.status(401).json({ error: { code: 'OTP_MAX_ATTEMPTS', message: 'Máximo de intentos alcanzado. Solicita un nuevo código.' } });
      return;
    }
    res.status(401).json({ error: { code: 'INVALID_OTP', message: 'Código inválido o expirado.' } });
    return;
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? 'unknown';
  const ua = req.headers['user-agent'] ?? '';

  const { sessionId, refreshToken } = await createSession(result.userId, ip, ua);

  const accessToken = signToken({
    sub: result.userId,
    sid: sessionId,
    email: result.email,
    authLevel: 'otp',
  });

  res.setHeader('Set-Cookie', buildRefreshCookie(refreshToken));
  res.json({
    accessToken,
    tokenType: 'Bearer',
    expiresIn: getTokenExpiresInSeconds(),
    sessionId,
  });
});

// ─────────────────────────────────────────────
// POST /api/auth/token/refresh
// ─────────────────────────────────────────────
router.post('/token/refresh', async (req: Request, res: Response): Promise<void> => {
  const cookieHeader = req.headers.cookie ?? '';
  const match = cookieHeader.match(/pf_refresh=([^;]+)/);
  const incomingToken = match?.[1];

  if (!incomingToken) {
    res.status(401).json({ error: { code: 'REFRESH_TOKEN_EXPIRED', message: 'Sesión expirada. Inicia sesión nuevamente.' } });
    return;
  }

  const result = await rotateRefreshToken(incomingToken);

  if (!result.ok) {
    res.setHeader('Set-Cookie', buildClearCookie());
    if (result.reason === 'reuse_detected') {
      res.status(401).json({ error: { code: 'REFRESH_TOKEN_REUSE', message: 'Sesión invalidada por seguridad. Inicia sesión nuevamente.' } });
      return;
    }
    res.status(401).json({ error: { code: 'REFRESH_TOKEN_EXPIRED', message: 'Sesión expirada. Inicia sesión nuevamente.' } });
    return;
  }

  // Obtener email del usuario para el nuevo JWT
  let email = 'unknown@playflow.app';
  if (pool) {
    try {
      const conn = await pool.getConnection();
      const [rows] = await conn.execute<RowDataPacket[]>(`SELECT email FROM users WHERE user_id = ?`, [result.userId]);
      conn.release();
      if (rows.length > 0) email = rows[0].email as string;
    } catch { /* no fatal */ }
  }

  const accessToken = signToken({
    sub: result.userId,
    sid: result.sessionId,
    email,
    authLevel: 'otp',
  });

  res.setHeader('Set-Cookie', buildRefreshCookie(result.newRefreshToken));
  res.json({
    accessToken,
    tokenType: 'Bearer',
    expiresIn: getTokenExpiresInSeconds(),
  });
});

// ─────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────
router.post('/logout', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user) {
    await revokeSession(req.user.sid, req.user.sub);
  }
  res.setHeader('Set-Cookie', buildClearCookie());
  res.status(204).send();
});

export default router;
