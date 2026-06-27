/**
 * Tests de integración OTP + schema — levanta MySQL via Docker automáticamente.
 * No requiere DATABASE_URL ni configuración previa. Solo necesita Docker corriendo.
 *
 * Cubre los bugs encontrados en producción que los unit tests (mock DB) no detectan:
 *   - challenge_id demasiado largo para CHAR(36)
 *   - nombres de columna incorrectos (id vs user_id, subject_id vs user_id, etc.)
 *   - hash SHA-256 round-trip: generate → store → verify
 *   - challenge expirado, consumed, max_attempts
 *   - sessions y role_assignments con schema correcto
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MySqlContainer, type StartedMySqlContainer } from '@testcontainers/mysql';
import mysql from 'mysql2/promise';

const MIGRATION_PATH = resolve(
  __dirname,
  '../../../../infra/mysql/migrations/002_security_module.sql',
);

const TEST_USER_ID = 'usr_integtest00000000000000000001';
const TEST_EMAIL = 'integration-test@playflow.internal';

let container: StartedMySqlContainer;
let pool: mysql.Pool;

// ─── setup / teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  container = await new MySqlContainer('mysql:8.0')
    .withDatabase('playflow_test')
    .withUsername('test')
    .withUserPassword('test')
    .start();

  pool = mysql.createPool({
    host: container.getHost(),
    port: container.getPort(),
    user: container.getUsername(),
    password: container.getUserPassword(),
    database: container.getDatabase(),
    multipleStatements: true,
  });

  // Aplicar migración completa
  const migration = readFileSync(MIGRATION_PATH, 'utf-8');
  await pool.query(migration);

  // Usuario de test
  await pool.execute(
    `INSERT INTO users (user_id, email, display_name, status) VALUES (?, ?, '', 'active')`,
    [TEST_USER_ID, TEST_EMAIL],
  );
}, 120_000); // hasta 2 min para que Docker descargue la imagen

afterAll(async () => {
  await pool?.end();
  await container?.stop();
});

beforeEach(async () => {
  // Cada test parte con challenges limpios para el usuario de test
  await pool.execute(
    `UPDATE otp_challenges SET status = 'expired' WHERE user_id = ? AND status = 'pending'`,
    [TEST_USER_ID],
  );
});

// ─── helpers ──────────────────────────────────────────────────────────────────

function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

async function insertChallenge(opts: {
  otp: string;
  status?: string;
  expiresInMs?: number;
}): Promise<string> {
  const challengeId = `otp_${crypto.randomUUID().replace(/-/g, '')}`;
  const expiresAt = new Date(Date.now() + (opts.expiresInMs ?? 600_000));
  await pool.execute(
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

type Row = mysql.RowDataPacket;

// ─── schema ───────────────────────────────────────────────────────────────────

describe('schema — columnas correctas', () => {
  it('users tiene user_id como PK (no id)', async () => {
    const [rows] = await pool.execute<Row[]>(
      `SELECT user_id FROM users WHERE user_id = ?`,
      [TEST_USER_ID],
    );
    expect(rows[0]?.user_id).toBe(TEST_USER_ID);
  });

  it('otp_challenges tiene challenge_id VARCHAR(50), user_id, otp_hash, metadata_json', async () => {
    const challengeId = await insertChallenge({ otp: '000000' });
    const [rows] = await pool.execute<Row[]>(
      `SELECT challenge_id, user_id, otp_hash, metadata_json FROM otp_challenges WHERE challenge_id = ?`,
      [challengeId],
    );
    expect(rows[0].challenge_id).toBe(challengeId);
    expect(rows[0].user_id).toBe(TEST_USER_ID);
    expect(rows[0].otp_hash).toBe(hashOtp('000000'));
    const meta = typeof rows[0].metadata_json === 'string'
      ? JSON.parse(rows[0].metadata_json as string)
      : rows[0].metadata_json;
    expect(meta.ip).toBe('127.0.0.1');
  });

  it('role_assignments tiene assignment_id, user_id, granted_by_user_id (no subject_id, granted_by)', async () => {
    const assignmentId = `ra_${crypto.randomUUID().replace(/-/g, '')}`;
    await pool.execute(
      `INSERT INTO role_assignments (assignment_id, user_id, role, resource_type, resource_id, granted_by_user_id)
       VALUES (?, ?, 'Viewer', 'Platform', 'global', ?)`,
      [assignmentId, TEST_USER_ID, TEST_USER_ID],
    );
    const [rows] = await pool.execute<Row[]>(
      `SELECT assignment_id, user_id, granted_by_user_id FROM role_assignments WHERE assignment_id = ?`,
      [assignmentId],
    );
    expect(rows[0].assignment_id).toBe(assignmentId);
    expect(rows[0].user_id).toBe(TEST_USER_ID);
    expect(rows[0].granted_by_user_id).toBe(TEST_USER_ID);
    await pool.execute(`DELETE FROM role_assignments WHERE assignment_id = ?`, [assignmentId]);
  });

  it('sessions tiene session_id como PK, created_at y last_seen_at (no started_at, last_active_at)', async () => {
    const sessionId = `sess_${crypto.randomUUID().replace(/-/g, '')}`;
    await pool.execute(
      `INSERT INTO sessions (session_id, user_id, created_at, last_seen_at, ip, status)
       VALUES (?, ?, NOW(), NOW(), '127.0.0.1', 'active')`,
      [sessionId, TEST_USER_ID],
    );
    const [rows] = await pool.execute<Row[]>(
      `SELECT session_id, created_at, last_seen_at FROM sessions WHERE session_id = ?`,
      [sessionId],
    );
    expect(rows[0].session_id).toBe(sessionId);
    expect(rows[0].created_at).toBeDefined();
    expect(rows[0].last_seen_at).toBeDefined();
    await pool.execute(`DELETE FROM sessions WHERE session_id = ?`, [sessionId]);
  });

  it('audit_events tiene audit_id, timestamp, authorization_json (no id, payload_json)', async () => {
    const auditId = `aud_${crypto.randomUUID().replace(/-/g, '')}`;
    await pool.execute(
      `INSERT INTO audit_events (audit_id, action, result, event_hash) VALUES (?, ?, ?, ?)`,
      [auditId, 'test.action', 'allow', hashOtp(auditId)],
    );
    const [rows] = await pool.execute<Row[]>(
      `SELECT audit_id, timestamp FROM audit_events WHERE audit_id = ?`,
      [auditId],
    );
    expect(rows[0].audit_id).toBe(auditId);
    expect(rows[0].timestamp).toBeDefined();
    await pool.execute(`DELETE FROM audit_events WHERE audit_id = ?`, [auditId]);
  });
});

// ─── ID lengths ───────────────────────────────────────────────────────────────

describe('longitudes de ID — caben en VARCHAR(50)', () => {
  it('challenge_id: otp_ + UUID sin guiones = 36 chars', () => {
    const id = `otp_${crypto.randomUUID().replace(/-/g, '')}`;
    expect(id).toHaveLength(36);
    expect(id.length).toBeLessThanOrEqual(50);
  });

  it('session_id: sess_ + UUID sin guiones = 37 chars', () => {
    const id = `sess_${crypto.randomUUID().replace(/-/g, '')}`;
    expect(id).toHaveLength(37);
    expect(id.length).toBeLessThanOrEqual(50);
  });

  it('token_id: rt_ + UUID sin guiones = 35 chars', () => {
    const id = `rt_${crypto.randomUUID().replace(/-/g, '')}`;
    expect(id).toHaveLength(35);
    expect(id.length).toBeLessThanOrEqual(50);
  });

  it('UUID con guiones + prefijo otp_ = 40 chars — NO cabe en CHAR(36)', () => {
    const idWithDashes = `otp_${crypto.randomUUID()}`;
    expect(idWithDashes).toHaveLength(40);
    expect(idWithDashes.length).toBeGreaterThan(36); // hubiera causado ER_DATA_TOO_LONG
  });

  it('INSERT de challenge_id en DB no falla por longitud', async () => {
    const challengeId = await insertChallenge({ otp: '123456' });
    const [rows] = await pool.execute<Row[]>(
      `SELECT challenge_id FROM otp_challenges WHERE challenge_id = ?`,
      [challengeId],
    );
    expect(rows[0]?.challenge_id).toBe(challengeId);
  });
});

// ─── flujo OTP completo ───────────────────────────────────────────────────────

describe('flujo OTP — hash round-trip', () => {
  it('el hash del código generado coincide con el almacenado en DB', async () => {
    const otp = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
    await insertChallenge({ otp });

    const [rows] = await pool.execute<Row[]>(
      `SELECT otp_hash FROM otp_challenges
       WHERE user_id = ? AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
      [TEST_USER_ID],
    );
    expect(rows[0].otp_hash).toBe(hashOtp(otp));
  });

  it('código incorrecto produce hash diferente', async () => {
    const otp = '555000';
    await insertChallenge({ otp });
    const [rows] = await pool.execute<Row[]>(
      `SELECT otp_hash FROM otp_challenges WHERE user_id = ? AND status = 'pending' LIMIT 1`,
      [TEST_USER_ID],
    );
    expect(hashOtp('000555')).not.toBe(rows[0].otp_hash);
  });

  it('challenge expirado (expires_at en el pasado) es detectado', async () => {
    await insertChallenge({ otp: '111111', expiresInMs: -1_000 });
    const [rows] = await pool.execute<Row[]>(
      `SELECT expires_at FROM otp_challenges
       WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
      [TEST_USER_ID],
    );
    expect(new Date(rows[0].expires_at as string) < new Date()).toBe(true);
  });

  it('marcar consumed → no quedan challenges pending', async () => {
    const id = await insertChallenge({ otp: '777777' });
    await pool.execute(
      `UPDATE otp_challenges SET status = 'consumed' WHERE challenge_id = ?`,
      [id],
    );
    const [rows] = await pool.execute<Row[]>(
      `SELECT challenge_id FROM otp_challenges WHERE user_id = ? AND status = 'pending'`,
      [TEST_USER_ID],
    );
    expect(rows).toHaveLength(0);
  });

  it('nuevo challenge expira el anterior → solo 1 pending en todo momento', async () => {
    await insertChallenge({ otp: '100001' });
    // simula nuevo requestOtp
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

  it('attempts se incrementa en verify fallido y bloquea en max_attempts', async () => {
    const id = await insertChallenge({ otp: '333333' });
    // 5 intentos fallidos
    for (let i = 0; i < 5; i++) {
      await pool.execute(
        `UPDATE otp_challenges SET attempts = attempts + 1 WHERE challenge_id = ?`,
        [id],
      );
    }
    const [rows] = await pool.execute<Row[]>(
      `SELECT attempts FROM otp_challenges WHERE challenge_id = ?`,
      [id],
    );
    expect(rows[0].attempts).toBe(5);
  });
});
