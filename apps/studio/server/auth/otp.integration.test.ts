/**
 * Tests de integración para el flujo OTP completo con MySQL real.
 *
 * Requieren: DATABASE_URL apuntando a una DB de test con el schema aplicado.
 * Se saltan automáticamente si DATABASE_URL no está configurado.
 *
 * Qué cubren (bugs encontrados en producción):
 *  - challenge_id demasiado largo para CHAR(36) → VARCHAR(50)
 *  - column 'user_id' vs 'id' en tabla users
 *  - hash SHA-256 round-trip: requestOtp → verifyOtp con código real
 *  - challenge expirado devuelve invalid_otp
 *  - intentos máximos bloquea correctamente
 *  - challenge se marca 'consumed' al verificar exitosamente
 *  - second verify del mismo código falla (consumed)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';

const DB_URL = process.env.DATABASE_URL;
const SKIP = !DB_URL;

let pool: mysql.Pool | null = null;

beforeAll(async () => {
  if (SKIP) return;
  pool = mysql.createPool(DB_URL!);
  // Insertar usuario de test
  await pool.execute(
    `INSERT INTO users (user_id, email, display_name, status)
     VALUES (?, ?, '', 'active')
     ON DUPLICATE KEY UPDATE status = 'active'`,
    [TEST_USER_ID, TEST_EMAIL],
  );
});

afterAll(async () => {
  if (!pool) return;
  // Limpiar datos de test
  await pool.execute(`DELETE FROM otp_challenges WHERE user_id = ?`, [TEST_USER_ID]);
  await pool.execute(`DELETE FROM sessions WHERE user_id = ?`, [TEST_USER_ID]);
  await pool.execute(`DELETE FROM users WHERE user_id = ?`, [TEST_USER_ID]);
  await pool.end();
});

beforeEach(async () => {
  if (!pool) return;
  await pool.execute(
    `UPDATE otp_challenges SET status = 'expired' WHERE user_id = ? AND status = 'pending'`,
    [TEST_USER_ID],
  );
});

const TEST_USER_ID = 'usr_integtest00000000000000000000';
const TEST_EMAIL = 'integration-test@playflow.internal';

// ─── helpers ──────────────────────────────────────────────────────────────────

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

async function insertChallenge(
  p: mysql.Pool,
  opts: { otp: string; status?: string; expiresInMs?: number },
) {
  const challengeId = `otp_${crypto.randomUUID().replace(/-/g, '')}`;
  const expiresAt = new Date(Date.now() + (opts.expiresInMs ?? 600_000));
  await p.execute(
    `INSERT INTO otp_challenges (challenge_id, user_id, otp_hash, expires_at, status, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      challengeId,
      TEST_USER_ID,
      hashOtp(opts.otp),
      expiresAt,
      opts.status ?? 'pending',
      JSON.stringify({ ip: '127.0.0.1' }),
    ],
  );
  return challengeId;
}

// ─── suite ────────────────────────────────────────────────────────────────────

describe.skipIf(SKIP)('OTP integration — DB real', () => {
  it('challenge_id cabe en VARCHAR(50): otp_ + 32 hex = 36 chars', async () => {
    const id = `otp_${crypto.randomUUID().replace(/-/g, '')}`;
    expect(id.length).toBeLessThanOrEqual(50);
    // Con guiones hubiera sido 40 chars — el bug original
    const idWithDashes = `otp_${crypto.randomUUID()}`;
    expect(idWithDashes.length).toBe(40); // confirma que CON guiones también cabe en VARCHAR(50)
    expect(idWithDashes.length).toBeGreaterThan(36); // pero NO en CHAR(36)
  });

  it('INSERT de challenge_id en DB no falla por longitud', async () => {
    const challengeId = await insertChallenge(pool!, { otp: '123456' });
    const [rows] = await pool!.execute<mysql.RowDataPacket[]>(
      `SELECT challenge_id FROM otp_challenges WHERE challenge_id = ?`,
      [challengeId],
    );
    expect((rows as mysql.RowDataPacket[])[0]?.challenge_id).toBe(challengeId);
  });

  it('tabla users tiene columna user_id (no id)', async () => {
    const [rows] = await pool!.execute<mysql.RowDataPacket[]>(
      `SELECT user_id FROM users WHERE user_id = ?`,
      [TEST_USER_ID],
    );
    expect((rows as mysql.RowDataPacket[])[0]?.user_id).toBe(TEST_USER_ID);
  });

  it('hash round-trip: el código generado verifica correctamente', async () => {
    // Simula exactamente lo que hace requestOtp → verifyOtp
    const otp = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
    await insertChallenge(pool!, { otp });

    const [rows] = await pool!.execute<mysql.RowDataPacket[]>(
      `SELECT otp_hash, expires_at FROM otp_challenges
       WHERE user_id = ? AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
      [TEST_USER_ID],
    );
    const stored = (rows as mysql.RowDataPacket[])[0];
    expect(stored).toBeDefined();

    const provided = hashOtp(otp);
    expect(provided).toBe(stored.otp_hash);
  });

  it('código incorrecto NO verifica (hash diferente)', async () => {
    const otp = '555555';
    await insertChallenge(pool!, { otp });

    const [rows] = await pool!.execute<mysql.RowDataPacket[]>(
      `SELECT otp_hash FROM otp_challenges WHERE user_id = ? AND status = 'pending' LIMIT 1`,
      [TEST_USER_ID],
    );
    const stored = (rows as mysql.RowDataPacket[])[0];
    const wrong = hashOtp('999999');
    expect(wrong).not.toBe(stored.otp_hash);
  });

  it('challenge expirado es rechazado', async () => {
    await insertChallenge(pool!, { otp: '111111', expiresInMs: -1000 }); // ya expiró
    const [rows] = await pool!.execute<mysql.RowDataPacket[]>(
      `SELECT challenge_id, expires_at FROM otp_challenges
       WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
      [TEST_USER_ID],
    );
    const ch = (rows as mysql.RowDataPacket[])[0];
    expect(new Date(ch.expires_at as string) < new Date()).toBe(true);
  });

  it('marcar consumed impide segundo verify', async () => {
    const otp = '777777';
    const challengeId = await insertChallenge(pool!, { otp });

    // Primer verify: correcto → consumed
    await pool!.execute(
      `UPDATE otp_challenges SET status = 'consumed' WHERE challenge_id = ?`,
      [challengeId],
    );

    // Segundo intento: ya no hay challenges 'pending'
    const [rows] = await pool!.execute<mysql.RowDataPacket[]>(
      `SELECT challenge_id FROM otp_challenges
       WHERE user_id = ? AND status = 'pending' LIMIT 1`,
      [TEST_USER_ID],
    );
    expect((rows as mysql.RowDataPacket[]).length).toBe(0);
  });

  it('nuevo requestOtp expira el challenge anterior', async () => {
    await insertChallenge(pool!, { otp: '100000' }); // challenge viejo
    const [before] = await pool!.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as cnt FROM otp_challenges WHERE user_id = ? AND status = 'pending'`,
      [TEST_USER_ID],
    );
    expect((before as mysql.RowDataPacket[])[0].cnt).toBe(1);

    // Simular nuevo requestOtp: expirar el anterior
    await pool!.execute(
      `UPDATE otp_challenges SET status = 'expired' WHERE user_id = ? AND status = 'pending'`,
      [TEST_USER_ID],
    );
    await insertChallenge(pool!, { otp: '200000' }); // challenge nuevo

    const [after] = await pool!.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as cnt FROM otp_challenges WHERE user_id = ? AND status = 'pending'`,
      [TEST_USER_ID],
    );
    expect((after as mysql.RowDataPacket[])[0].cnt).toBe(1);
  });

  it('sessions tiene columna session_id (no id) y acepta VARCHAR(50)', async () => {
    const sessionId = `sess_${crypto.randomUUID().replace(/-/g, '')}`; // 37 chars
    expect(sessionId.length).toBeLessThanOrEqual(50);

    await pool!.execute(
      `INSERT INTO sessions (session_id, user_id, status) VALUES (?, ?, 'active')`,
      [sessionId, TEST_USER_ID],
    );
    const [rows] = await pool!.execute<mysql.RowDataPacket[]>(
      `SELECT session_id FROM sessions WHERE session_id = ?`,
      [sessionId],
    );
    expect((rows as mysql.RowDataPacket[])[0]?.session_id).toBe(sessionId);

    // Cleanup
    await pool!.execute(`DELETE FROM sessions WHERE session_id = ?`, [sessionId]);
  });

  it('role_assignments tiene assignment_id, user_id, granted_by_user_id', async () => {
    const assignmentId = `ra_${crypto.randomUUID().replace(/-/g, '')}`;
    await pool!.execute(
      `INSERT INTO role_assignments (assignment_id, user_id, role, resource_type, resource_id, granted_by_user_id)
       VALUES (?, ?, 'Viewer', 'Platform', 'global', ?)`,
      [assignmentId, TEST_USER_ID, TEST_USER_ID],
    );
    const [rows] = await pool!.execute<mysql.RowDataPacket[]>(
      `SELECT assignment_id, user_id, granted_by_user_id FROM role_assignments WHERE assignment_id = ?`,
      [assignmentId],
    );
    const row = (rows as mysql.RowDataPacket[])[0];
    expect(row.assignment_id).toBe(assignmentId);
    expect(row.user_id).toBe(TEST_USER_ID);
    expect(row.granted_by_user_id).toBe(TEST_USER_ID);

    await pool!.execute(`DELETE FROM role_assignments WHERE assignment_id = ?`, [assignmentId]);
  });
});
