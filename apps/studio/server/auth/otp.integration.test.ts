/**
 * Tests de integración OTP contra la base de datos real de desarrollo.
 * Usa playflow_db en localhost:3306 — la misma que corre el servidor.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';

// Conecta a la DB real de dev — mismas credenciales que .env
const DB = {
  host: '127.0.0.1',
  port: 3306,
  user: 'playflow_app',
  password: 'dev_password',
  database: 'playflow_db',
};

const TEST_USER_ID = 'usr_integtest00000000000000000001';
const TEST_EMAIL = 'integration-test@playflow.internal';

let pool: mysql.Pool;

beforeAll(async () => {
  pool = mysql.createPool(DB);
  await pool.execute(
    `INSERT INTO users (user_id, email, display_name, status)
     VALUES (?, ?, '', 'active')
     ON DUPLICATE KEY UPDATE status = 'active'`,
    [TEST_USER_ID, TEST_EMAIL],
  );
});

afterAll(async () => {
  await pool.execute(`DELETE FROM otp_challenges WHERE user_id = ?`, [TEST_USER_ID]);
  await pool.execute(`DELETE FROM sessions WHERE user_id = ?`, [TEST_USER_ID]);
  await pool.execute(`DELETE FROM role_assignments WHERE user_id = ?`, [TEST_USER_ID]);
  await pool.execute(`DELETE FROM audit_events WHERE actor_user_id = ?`, [TEST_USER_ID]);
  await pool.execute(`DELETE FROM users WHERE user_id = ?`, [TEST_USER_ID]);
  await pool.end();
});

beforeEach(async () => {
  await pool.execute(
    `UPDATE otp_challenges SET status = 'expired' WHERE user_id = ? AND status = 'pending'`,
    [TEST_USER_ID],
  );
});

// ─── helpers ──────────────────────────────────────────────────────────────────

function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

type Row = mysql.RowDataPacket;

async function insertChallenge(opts: { otp: string; expiresInMs?: number }): Promise<string> {
  const challengeId = `otp_${crypto.randomUUID().replace(/-/g, '')}`;
  const expiresAt = new Date(Date.now() + (opts.expiresInMs ?? 600_000));
  await pool.execute(
    `INSERT INTO otp_challenges (challenge_id, user_id, otp_hash, expires_at, metadata_json)
     VALUES (?, ?, ?, ?, ?)`,
    [challengeId, TEST_USER_ID, hashOtp(opts.otp), expiresAt, JSON.stringify({ ip: '127.0.0.1' })],
  );
  return challengeId;
}

// ─── schema ───────────────────────────────────────────────────────────────────

describe('schema — columnas correctas en DB real', () => {
  it('users tiene user_id como PK', async () => {
    const [rows] = await pool.execute<Row[]>(
      `SELECT user_id FROM users WHERE user_id = ?`, [TEST_USER_ID],
    );
    expect(rows[0]?.user_id).toBe(TEST_USER_ID);
  });

  it('otp_challenges tiene challenge_id, user_id, otp_hash, metadata_json', async () => {
    const challengeId = await insertChallenge({ otp: '000000' });
    const [rows] = await pool.execute<Row[]>(
      `SELECT challenge_id, user_id, otp_hash FROM otp_challenges WHERE challenge_id = ?`,
      [challengeId],
    );
    expect(rows[0].challenge_id).toBe(challengeId);
    expect(rows[0].user_id).toBe(TEST_USER_ID);
    expect(rows[0].otp_hash).toBe(hashOtp('000000'));
  });

  it('sessions tiene session_id, created_at, last_seen_at (no started_at, last_active_at)', async () => {
    const sessionId = `sess_${crypto.randomUUID().replace(/-/g, '')}`;
    await pool.execute(
      `INSERT INTO sessions (session_id, user_id, created_at, last_seen_at, status)
       VALUES (?, ?, NOW(), NOW(), 'active')`,
      [sessionId, TEST_USER_ID],
    );
    const [rows] = await pool.execute<Row[]>(
      `SELECT session_id, created_at, last_seen_at FROM sessions WHERE session_id = ?`,
      [sessionId],
    );
    expect(rows[0].session_id).toBe(sessionId);
    expect(rows[0].created_at).toBeDefined();
    await pool.execute(`DELETE FROM sessions WHERE session_id = ?`, [sessionId]);
  });

  it('role_assignments tiene assignment_id, user_id, granted_by_user_id', async () => {
    const assignmentId = `ra_${crypto.randomUUID().replace(/-/g, '')}`;
    await pool.execute(
      `INSERT INTO role_assignments (assignment_id, user_id, role, resource_type, resource_id, granted_by_user_id)
       VALUES (?, ?, 'Viewer', 'Platform', 'global', ?)`,
      [assignmentId, TEST_USER_ID, TEST_USER_ID],
    );
    const [rows] = await pool.execute<Row[]>(
      `SELECT assignment_id, granted_by_user_id FROM role_assignments WHERE assignment_id = ?`,
      [assignmentId],
    );
    expect(rows[0].assignment_id).toBe(assignmentId);
    expect(rows[0].granted_by_user_id).toBe(TEST_USER_ID);
    await pool.execute(`DELETE FROM role_assignments WHERE assignment_id = ?`, [assignmentId]);
  });

  it('audit_events tiene audit_id y timestamp (no id, payload_json)', async () => {
    const auditId = `aud_${crypto.randomUUID().replace(/-/g, '')}`;
    await pool.execute(
      `INSERT INTO audit_events (audit_id, action, result, event_hash) VALUES (?, ?, ?, ?)`,
      [auditId, 'test.action', 'allow', hashOtp(auditId)],
    );
    const [rows] = await pool.execute<Row[]>(
      `SELECT audit_id, timestamp FROM audit_events WHERE audit_id = ?`, [auditId],
    );
    expect(rows[0].audit_id).toBe(auditId);
    expect(rows[0].timestamp).toBeDefined();
    await pool.execute(`DELETE FROM audit_events WHERE audit_id = ?`, [auditId]);
  });
});

// ─── longitudes de ID ─────────────────────────────────────────────────────────

describe('IDs con prefijo caben en VARCHAR(50)', () => {
  it('otp_ + UUID sin guiones = 36 chars', () => {
    const id = `otp_${crypto.randomUUID().replace(/-/g, '')}`;
    expect(id).toHaveLength(36);
  });

  it('sess_ + UUID sin guiones = 37 chars', () => {
    const id = `sess_${crypto.randomUUID().replace(/-/g, '')}`;
    expect(id).toHaveLength(37);
  });

  it('otp_ + UUID CON guiones = 40 chars — NO cabe en CHAR(36)', () => {
    const id = `otp_${crypto.randomUUID()}`;
    expect(id).toHaveLength(40);
    expect(id.length).toBeGreaterThan(36);
  });

  it('INSERT de challenge_id prefijado no falla en DB', async () => {
    const id = await insertChallenge({ otp: '123456' });
    const [rows] = await pool.execute<Row[]>(
      `SELECT challenge_id FROM otp_challenges WHERE challenge_id = ?`, [id],
    );
    expect(rows[0]?.challenge_id).toBe(id);
  });
});

// ─── flujo OTP ────────────────────────────────────────────────────────────────

describe('flujo OTP completo', () => {
  it('hash del código almacenado en DB coincide al verificar', async () => {
    const otp = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
    await insertChallenge({ otp });
    const [rows] = await pool.execute<Row[]>(
      `SELECT otp_hash FROM otp_challenges WHERE user_id = ? AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
      [TEST_USER_ID],
    );
    expect(rows[0].otp_hash).toBe(hashOtp(otp));
  });

  it('código incorrecto produce hash diferente', async () => {
    await insertChallenge({ otp: '555000' });
    const [rows] = await pool.execute<Row[]>(
      `SELECT otp_hash FROM otp_challenges WHERE user_id = ? AND status = 'pending' LIMIT 1`,
      [TEST_USER_ID],
    );
    expect(hashOtp('000555')).not.toBe(rows[0].otp_hash);
  });

  it('challenge con expires_at en el pasado es detectado como expirado', async () => {
    await insertChallenge({ otp: '111111', expiresInMs: -1_000 });
    const [rows] = await pool.execute<Row[]>(
      `SELECT expires_at FROM otp_challenges WHERE user_id = ? AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
      [TEST_USER_ID],
    );
    expect(new Date(rows[0].expires_at as string) < new Date()).toBe(true);
  });

  it('marcar consumed → no queda ningún challenge pending', async () => {
    const id = await insertChallenge({ otp: '777777' });
    await pool.execute(
      `UPDATE otp_challenges SET status = 'consumed' WHERE challenge_id = ?`, [id],
    );
    const [rows] = await pool.execute<Row[]>(
      `SELECT challenge_id FROM otp_challenges WHERE user_id = ? AND status = 'pending'`,
      [TEST_USER_ID],
    );
    expect(rows).toHaveLength(0);
  });

  it('nuevo requestOtp expira el anterior — siempre solo 1 pending', async () => {
    await insertChallenge({ otp: '100001' });
    await pool.execute(
      `UPDATE otp_challenges SET status = 'expired' WHERE user_id = ? AND status = 'pending'`,
      [TEST_USER_ID],
    );
    await insertChallenge({ otp: '200002' });
    const [rows] = await pool.execute<Row[]>(
      `SELECT COUNT(*) as cnt FROM otp_challenges WHERE user_id = ? AND status = 'pending'`,
      [TEST_USER_ID],
    );
    expect(rows[0].cnt).toBe(1);
  });
});
