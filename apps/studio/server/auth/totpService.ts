import * as OTPAuth from 'otpauth';
import crypto from 'node:crypto';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../db';

const TOTP_ISSUER = process.env.MFA_TOTP_ISSUER ?? 'PlayFlow';
const TOTP_WINDOW = Number(process.env.MFA_TOTP_WINDOW ?? 1);

function getEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET ?? '';
  return crypto.createHash('sha256').update(secret).digest(); // 32 bytes
}

function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptSecret(ciphertext: string): string {
  const [ivHex, encHex] = ciphertext.split(':');
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

export interface TotpSetupData {
  qrUri: string;
  secretBase32: string;
  credentialId: string;
}

/** Genera un nuevo secret TOTP, lo cifra y guarda como pendiente */
export async function initTotpSetup(userId: string, email: string): Promise<TotpSetupData> {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  const qrUri = totp.toString(); // otpauth://totp/...
  const secretBase32 = secret.base32;
  const encryptedSecret = encryptSecret(secretBase32);
  const credentialId = `mfa_${crypto.randomUUID()}`;

  if (pool) {
    const conn = await pool.getConnection();
    try {
      // Eliminar credentials pendientes previas del usuario
      await conn.execute(
        `DELETE FROM user_mfa_credentials WHERE user_id = ? AND status = 'pending_verification'`,
        [userId],
      );
      await conn.execute<ResultSetHeader>(
        `INSERT INTO user_mfa_credentials
           (credential_id, user_id, credential_type, credential_data, status, friendly_name)
         VALUES (?, ?, 'totp', ?, 'pending_verification', 'Autenticador')`,
        [credentialId, userId, encryptedSecret],
      );
    } finally {
      conn.release();
    }
  }

  return { qrUri, secretBase32, credentialId };
}

/** Verifica el código y activa la credential TOTP */
export async function verifyAndActivateTotp(
  userId: string,
  code: string,
): Promise<{ ok: boolean; credentialId?: string }> {
  if (!pool) {
    // Dev sin DB: aceptar "000000"
    if (code === '000000') return { ok: true, credentialId: 'dev_mfa' };
    return { ok: false };
  }

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT credential_id, credential_data FROM user_mfa_credentials
       WHERE user_id = ? AND credential_type = 'totp' AND status = 'pending_verification'
       ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    if (rows.length === 0) return { ok: false };

    const { credential_id, credential_data } = rows[0] as { credential_id: string; credential_data: string };
    const secretBase32 = decryptSecret(credential_data);
    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secretBase32), digits: 6, period: 30 });

    const delta = totp.validate({ token: code, window: TOTP_WINDOW });
    if (delta === null) return { ok: false };

    await conn.execute(
      `UPDATE user_mfa_credentials SET status = 'active' WHERE credential_id = ?`,
      [credential_id],
    );

    return { ok: true, credentialId: credential_id };
  } finally {
    conn.release();
  }
}

/** Verifica el código TOTP en el flujo de login (MFA activo) */
export async function verifyTotpLogin(userId: string, code: string): Promise<boolean> {
  if (!pool) return code === '000000';

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT credential_data FROM user_mfa_credentials
       WHERE user_id = ? AND credential_type = 'totp' AND status = 'active'
       LIMIT 1`,
      [userId],
    );
    if (rows.length === 0) return false;

    const secretBase32 = decryptSecret(rows[0].credential_data as string);
    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secretBase32), digits: 6, period: 30 });
    return totp.validate({ token: code, window: TOTP_WINDOW }) !== null;
  } finally {
    conn.release();
  }
}

/** Verifica si el usuario tiene MFA TOTP activo */
export async function hasMfaActive(userId: string): Promise<boolean> {
  if (!pool) return false;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT 1 FROM user_mfa_credentials WHERE user_id = ? AND status = 'active' LIMIT 1`,
      [userId],
    );
    return rows.length > 0;
  } finally {
    conn.release();
  }
}
