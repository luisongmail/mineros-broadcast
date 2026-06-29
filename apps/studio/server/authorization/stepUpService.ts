import crypto from 'node:crypto';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../db';
import { sendOtpEmail } from '../auth/emailService';
import { logStepUpEvent } from '../audit/auditService';

function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export interface StepUpChallenge {
  challengeId: string;
  expiresAt: Date;
  action: string;
  resourceType: string;
  resourceId: string;
}

export type StepUpRequestResult =
  | { ok: true; challenge: StepUpChallenge }
  | { ok: false; reason: 'not_required' | 'rate_limited' };

export type StepUpVerifyResult =
  | { ok: true; stepUpToken: string; challenge: StepUpChallenge }
  | { ok: false; reason: 'invalid_code' | 'already_consumed' | 'not_found' };

const STEP_UP_TTL_MINUTES = 5;
const STEP_UP_HEADER = 'x-step-up-token' as const;
const STEP_UP_FRESHNESS_MINUTES = 5; // Frescura: re-verificar si pasaron > 5 minutos

export { STEP_UP_HEADER };

/**
 * Valida si un step-up es vigente (fresco).
 * Retorna true si stepUpAt está dentro de la ventana de tiempo.
 */
export function stepUpRequired(_sessionId: string, stepUpAt?: number): boolean {
  if (!stepUpAt) return false;
  const now = Date.now();
  const ageMs = now - stepUpAt;
  const freshnesThresholdMs = STEP_UP_FRESHNESS_MINUTES * 60_000;
  return ageMs < freshnesThresholdMs;
}

/** Crea un desafío step-up y envía OTP al usuario */
export async function requestStepUp(
  userId: string,
  email: string,
  action: string,
  resourceType: string,
  resourceId: string,
): Promise<StepUpRequestResult> {
  const otp = crypto.randomInt(100000, 999999).toString();
  const challengeId = `suc_${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + STEP_UP_TTL_MINUTES * 60_000);

  if (pool) {
    const conn = await pool.getConnection();
    try {
      await conn.execute<ResultSetHeader>(
        `INSERT INTO step_up_challenges
           (challenge_id, user_id, action, resource_type, resource_id,
            otp_hash, expires_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          challengeId,
          userId,
          action,
          resourceType,
          resourceId,
          crypto.createHash('sha256').update(otp).digest('hex'),
          expiresAt,
        ],
      );
    } finally {
      conn.release();
    }
  } else {
    // Dev sin DB: guardar en memoria
    (global as Record<string, unknown>)[`__stepup_${challengeId}`] = {
      otp,
      action,
      resourceType,
      resourceId,
      expiresAt,
    };
  }

  await sendOtpEmail(email, otp);

  return {
    ok: true,
    challenge: { challengeId, expiresAt, action, resourceType, resourceId },
  };
}

/** Verifica el código step-up y emite el token opaco */
export async function verifyStepUp(
  userId: string,
  challengeId: string,
  code: string,
  sessionId?: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<StepUpVerifyResult> {
  const providedHash = crypto.createHash('sha256').update(code).digest('hex');

  if (!pool) {
    // Dev sin DB
    const stored = (global as Record<string, unknown>)[`__stepup_${challengeId}`] as {
      otp: string;
      action: string;
      resourceType: string;
      resourceId: string;
      expiresAt: Date;
    } | undefined;
    if (!stored) return { ok: false, reason: 'not_found' };
    
    const isValid = crypto.createHash('sha256').update(stored.otp).digest('hex') === providedHash;
    
    // Log audit event
    await logStepUpEvent({
      action: isValid ? 'step_up_verified' : 'step_up_failed',
      userId,
      sessionId: sessionId || 'unknown',
      resourceType: stored.resourceType,
      resourceId: stored.resourceId,
      ipAddress,
      userAgent,
      verificationMethod: 'totp',
      totpVerified: isValid,
    });
    
    if (!isValid) return { ok: false, reason: 'invalid_code' };
    
    delete (global as Record<string, unknown>)[`__stepup_${challengeId}`];
    const stepUpToken = generateOpaqueToken();
    (global as Record<string, unknown>)[`__su_${stepUpToken}`] = {
      userId,
      action: stored.action,
      resourceType: stored.resourceType,
      resourceId: stored.resourceId,
      expiresAt: new Date(Date.now() + STEP_UP_TTL_MINUTES * 60_000),
    };
    return { ok: true, stepUpToken, challenge: { challengeId, ...stored } };
  }

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT challenge_id, user_id, action, resource_type, resource_id,
              otp_hash, expires_at, status
       FROM step_up_challenges
       WHERE challenge_id = ? AND user_id = ?`,
      [challengeId, userId],
    );

    if (rows.length === 0) {
      await logStepUpEvent({
        action: 'step_up_failed',
        userId,
        sessionId: sessionId || 'unknown',
        resourceType: 'unknown',
        resourceId: 'unknown',
        ipAddress,
        userAgent,
        verificationMethod: 'totp',
        totpVerified: false,
        reason: 'not_found',
      });
      return { ok: false, reason: 'not_found' };
    }
    
    const ch = rows[0];

    if (ch.status !== 'pending') {
      await logStepUpEvent({
        action: 'step_up_failed',
        userId,
        sessionId: sessionId || 'unknown',
        resourceType: ch.resource_type as string,
        resourceId: ch.resource_id as string,
        ipAddress,
        userAgent,
        verificationMethod: 'totp',
        totpVerified: false,
        reason: 'already_consumed',
      });
      return { ok: false, reason: 'already_consumed' };
    }
    
    const isExpired = new Date(ch.expires_at as string) < new Date();
    const isValidCode = ch.otp_hash === providedHash;
    const isValid = !isExpired && isValidCode;

    const stepUpToken = isValid ? generateOpaqueToken() : '';
    const tokenExpiresAt = new Date(Date.now() + STEP_UP_TTL_MINUTES * 60_000);

    if (isValid) {
      await conn.execute(
        `UPDATE step_up_challenges
         SET status = 'consumed', step_up_token_hash = ?, consumed_at = NOW()
         WHERE challenge_id = ?`,
        [crypto.createHash('sha256').update(stepUpToken).digest('hex'), challengeId],
      );
    }

    // Log audit event
    await logStepUpEvent({
      action: isValid ? 'step_up_verified' : 'step_up_failed',
      userId,
      sessionId: sessionId || 'unknown',
      resourceType: ch.resource_type as string,
      resourceId: ch.resource_id as string,
      ipAddress,
      userAgent,
      verificationMethod: 'totp',
      totpVerified: isValid,
      reason: isExpired ? 'expired' : !isValidCode ? 'invalid_code' : undefined,
    });

    if (!isValid) {
      return { ok: false, reason: isExpired ? 'invalid_code' : 'invalid_code' };
    }

    return {
      ok: true,
      stepUpToken,
      challenge: {
        challengeId,
        expiresAt: tokenExpiresAt,
        action: ch.action as string,
        resourceType: ch.resource_type as string,
        resourceId: ch.resource_id as string,
      },
    };
  } finally {
    conn.release();
  }
}

/** Valida el step-up token del header X-Step-Up-Token para la acción y recurso indicados */
export async function validateStepUpToken(
  token: string,
  userId: string,
  requiredAction: string,
  resourceId: string,
): Promise<boolean> {
  if (!pool) {
    const stored = (global as Record<string, unknown>)[`__su_${token}`] as {
      userId: string;
      action: string;
      resourceId: string;
      expiresAt: Date;
    } | undefined;
    if (!stored) return false;
    if (stored.userId !== userId) return false;
    if (stored.action !== requiredAction) return false;
    if (stored.resourceId !== resourceId) return false;
    if (new Date(stored.expiresAt) < new Date()) return false;
    delete (global as Record<string, unknown>)[`__su_${token}`];
    return true;
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT challenge_id, action, resource_id, expires_at, status
       FROM step_up_challenges
       WHERE step_up_token_hash = ? AND user_id = ? AND status = 'consumed'
       LIMIT 1`,
      [tokenHash, userId],
    );
    if (rows.length === 0) return false;
    const ch = rows[0];
    if (new Date(ch.expires_at as string) < new Date()) return false;
    if (ch.action !== requiredAction) return false;
    if (ch.resource_id !== resourceId) return false;

    // Invalidar el token tras usarlo (un solo uso)
    await conn.execute(
      `UPDATE step_up_challenges SET status = 'used' WHERE challenge_id = ?`,
      [ch.challenge_id],
    );
    return true;
  } finally {
    conn.release();
  }
}
