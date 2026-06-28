import { createHash, randomInt, randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';

const databaseUrl = process.env.DATABASE_URL;
const jwtIssuer = process.env.JWT_ISSUER ?? 'playflow';
const jwtAudience = process.env.JWT_AUDIENCE ?? 'playflow-app';
const accessTokenTtlSeconds = Number(process.env.JWT_ACCESS_TOKEN_SECONDS ?? 900);

export const pool = databaseUrl
  ? mysql.createPool({
      uri: databaseUrl,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: 'Z',
      charset: 'utf8mb4',
    })
  : undefined;

interface MemoryOtpChallenge {
  codeHash: string;
  expiresAt: string;
}

const memoryOtpChallenges = new Map<string, MemoryOtpChallenge>();

export function getJwtConfig(): { issuer: string; audience: string; expiresInSeconds: number } {
  return {
    issuer: jwtIssuer,
    audience: jwtAudience,
    expiresInSeconds: accessTokenTtlSeconds,
  };
}

export function createUserIdFromEmail(email: string): string {
  const digest = createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  return `usr_${digest.slice(0, 24)}`;
}

export function createSessionId(): string {
  return `sess_${randomUUID().replace(/-/g, '')}`;
}

export function generateOtpCode(): string {
  const value = randomInt(0, 1_000_000);
  return value.toString().padStart(6, '0');
}

function hashOTP(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

export async function storeOtpChallenge(email: string, code: string, expiresAt: Date): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const codeHash = hashOTP(code);

  if (!pool) {
    memoryOtpChallenges.set(normalizedEmail, { codeHash, expiresAt: expiresAt.toISOString() });
    return;
  }

  const userId = createUserIdFromEmail(normalizedEmail);
  const challengeId = `otp_${randomUUID().replace(/-/g, '')}`;

  const connection = await pool.getConnection();

  try {
    await connection.execute(
      `INSERT INTO users (user_id, email, display_name, status)
       VALUES (?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE email = VALUES(email), updated_at = CURRENT_TIMESTAMP(3)`,
      [userId, normalizedEmail, normalizedEmail],
    );

    await connection.execute(
      `INSERT INTO otp_challenges (
         challenge_id,
         user_id,
         email,
         code_hash,
         status,
         attempts,
         expires_at
      ) VALUES (?, ?, ?, ?, 'pending', 0, ?)`,
      [challengeId, userId, normalizedEmail, codeHash, expiresAt],
    );
  } finally {
    connection.release();
  }
}

export async function findValidOtpChallenge(email: string, code: string): Promise<{ userId: string } | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const codeHash = hashOTP(code);

  if (!pool) {
    const challenge = memoryOtpChallenges.get(normalizedEmail);

    if (!challenge) {
      return null;
    }

    if (challenge.codeHash !== codeHash || new Date(challenge.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    memoryOtpChallenges.delete(normalizedEmail);
    return { userId: createUserIdFromEmail(normalizedEmail) };
  }

  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.execute<mysql.RowDataPacket[]>(
      `SELECT challenge_id, user_id
       FROM otp_challenges
       WHERE email = ?
        AND code_hash = ?
         AND status = 'pending'
         AND expires_at > UTC_TIMESTAMP(3)
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalizedEmail, codeHash],
    );

    const challenge = rows[0];

    if (!challenge) {
      return null;
    }

    await connection.execute(
      `UPDATE otp_challenges
       SET status = 'consumed', consumed_at = UTC_TIMESTAMP(3)
       WHERE challenge_id = ?`,
      [challenge.challenge_id as string],
    );

    return { userId: challenge.user_id as string };
  } finally {
    connection.release();
  }
}

export async function storeUserSession(
  userId: string,
  jwt: string,
  expiresAt: Date,
  sessionId: string,
): Promise<void> {
  if (!pool) {
    return;
  }

  const connection = await pool.getConnection();

  try {
    await connection.execute(
      `INSERT INTO user_sessions (session_id, user_id, jwt, expires_at)
       VALUES (?, ?, ?, ?)`,
      [sessionId, userId, jwt, expiresAt],
    );
  } finally {
    connection.release();
  }
}
