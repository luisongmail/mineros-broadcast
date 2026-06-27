import crypto from 'node:crypto';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../db';

const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES ?? 10);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 5);
const OTP_RESEND_SECONDS = Number(process.env.OTP_RESEND_SECONDS ?? 60);
const OTP_RATE_LIMIT = Number(process.env.OTP_RATE_LIMIT_PER_IP ?? 10);
const OTP_RATE_WINDOW = Number(process.env.OTP_RATE_WINDOW_MINUTES ?? 15);

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

function generateOtp(): string {
  // 6 dígitos criptográficamente seguros
  const bytes = crypto.randomBytes(4);
  const num = bytes.readUInt32BE(0) % 1_000_000;
  return num.toString().padStart(6, '0');
}

export type OtpRequestResult =
  | { ok: true; challengeId: string }
  | { ok: false; reason: 'rate_limited'; retryAfter: number };

export type OtpVerifyResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; reason: 'invalid_otp' }
  | { ok: false; reason: 'max_attempts' }
  | { ok: false; reason: 'not_found' };

/** Crea un desafío OTP para un email registrado o invitado. Nunca revela si el email existe. */
export async function requestOtp(email: string, ip: string): Promise<OtpRequestResult> {
  if (!pool) return { ok: true, challengeId: 'dev_nodb' };

  const conn = await pool.getConnection();
  try {
    // Rate limit por IP
    const windowStart = new Date(Date.now() - OTP_RATE_WINDOW * 60_000);
    const [ipRows] = await conn.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM otp_challenges
       WHERE created_at > ? AND JSON_EXTRACT(metadata_json, '$.ip') = ?`,
      [windowStart, ip],
    );
    const ipCount = (ipRows[0]?.cnt as number) ?? 0;
    if (ipCount >= OTP_RATE_LIMIT) {
      return { ok: false, reason: 'rate_limited', retryAfter: OTP_RESEND_SECONDS };
    }

    // Verificar si el usuario existe
    const [userRows] = await conn.execute<RowDataPacket[]>(
      `SELECT user_id FROM users WHERE email = ? AND status = 'active'`,
      [email],
    );
    if (userRows.length === 0) {
      // No-enumeración: no revelar que el email no existe. Retornar ok sin crear desafío.
      return { ok: true, challengeId: 'noop' };
    }
    const userId = userRows[0].user_id as string;

    // Verificar reenvío mínimo
    const recentCutoff = new Date(Date.now() - OTP_RESEND_SECONDS * 1_000);
    const [recentRows] = await conn.execute<RowDataPacket[]>(
      `SELECT challenge_id FROM otp_challenges
       WHERE user_id = ? AND created_at > ? AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
      [userId, recentCutoff],
    );
    if (recentRows.length > 0) {
      return { ok: false, reason: 'rate_limited', retryAfter: OTP_RESEND_SECONDS };
    }

    // Invalidar desafíos previos del usuario
    await conn.execute(
      `UPDATE otp_challenges SET status = 'expired' WHERE user_id = ? AND status = 'pending'`,
      [userId],
    );

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const challengeId = `otp_${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

    await conn.execute<ResultSetHeader>(
      `INSERT INTO otp_challenges (challenge_id, user_id, otp_hash, expires_at, metadata_json)
       VALUES (?, ?, ?, ?, ?)`,
      [challengeId, userId, otpHash, expiresAt, JSON.stringify({ ip })],
    );

    // Retornar el OTP para que el llamador lo envíe por email
    // Usamos el challengeId como portador del OTP en memoria (nunca en DB en texto plano)
    (global as Record<string, unknown>)[`__otp_${challengeId}`] = otp;
    setTimeout(() => { delete (global as Record<string, unknown>)[`__otp_${challengeId}`]; }, OTP_TTL_MINUTES * 60_000);

    return { ok: true, challengeId };
  } finally {
    conn.release();
  }
}

/** Obtiene el OTP en texto plano para enviar por email (borrado del store en memoria tras leer) */
export function consumeOtpPlaintext(challengeId: string): string | null {
  const key = `__otp_${challengeId}`;
  const otp = (global as Record<string, unknown>)[key] as string | undefined;
  if (otp) delete (global as Record<string, unknown>)[key];
  return otp ?? null;
}

/** Valida el código OTP ingresado por el usuario */
export async function verifyOtp(email: string, code: string): Promise<OtpVerifyResult> {
  if (!pool) {
    // Sin DB (dev sin MySQL): acepta cualquier código "000000" para testing
    if (code === '000000') return { ok: true, userId: 'dev_user', email };
    return { ok: false, reason: 'invalid_otp' };
  }

  const conn = await pool.getConnection();
  try {
    const [userRows] = await conn.execute<RowDataPacket[]>(
      `SELECT user_id FROM users WHERE email = ? AND status = 'active'`,
      [email],
    );
    if (userRows.length === 0) return { ok: false, reason: 'invalid_otp' }; // no-enumeración

    const userId = userRows[0].user_id as string;

    const [challenges] = await conn.execute<RowDataPacket[]>(
      `SELECT challenge_id, otp_hash, attempts, expires_at
       FROM otp_challenges
       WHERE user_id = ? AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );

    if (challenges.length === 0) return { ok: false, reason: 'invalid_otp' };

    const ch = challenges[0];
    const challengeId = ch.challenge_id as string;
    const attempts = (ch.attempts as number) ?? 0;

    if (new Date(ch.expires_at as string) < new Date()) {
      await conn.execute(`UPDATE otp_challenges SET status = 'expired' WHERE challenge_id = ?`, [challengeId]);
      return { ok: false, reason: 'invalid_otp' };
    }

    if (attempts >= OTP_MAX_ATTEMPTS) {
      return { ok: false, reason: 'max_attempts' };
    }

    const providedHash = hashOtp(code);
    if (providedHash !== ch.otp_hash) {
      await conn.execute(
        `UPDATE otp_challenges SET attempts = attempts + 1 WHERE challenge_id = ?`,
        [challengeId],
      );
      if (attempts + 1 >= OTP_MAX_ATTEMPTS) return { ok: false, reason: 'max_attempts' };
      return { ok: false, reason: 'invalid_otp' };
    }

    // Código correcto — marcar como consumido
    await conn.execute(
      `UPDATE otp_challenges SET status = 'consumed' WHERE challenge_id = ?`,
      [challengeId],
    );

    return { ok: true, userId, email };
  } finally {
    conn.release();
  }
}
