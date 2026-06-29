import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import type { Pool, PoolConnection } from 'mysql2/promise';
import { createPool } from 'mysql2/promise';

describe('OTP E2E — Request → Verify', () => {
  let pool: Pool;
  let conn: PoolConnection;
  const testEmail = `otp-test-${Date.now()}@test.local`;
  let testUserId: string;
  let testChallengeId: string;
  let testOtp: string;

  beforeAll(async () => {
    // Asegurar que DATABASE_URL está definido ANTES de cargar otpService
    if (!process.env.DATABASE_URL) {
      const dbUser = process.env.DB_USER || 'root';
      const dbPass = process.env.DB_PASSWORD || 'root_password';
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbName = process.env.DB_NAME || 'playflow_db';
      process.env.DATABASE_URL = `mysql://${dbUser}:${dbPass}@${dbHost}:3306/${dbName}`;
    }

    pool = await createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root_password',
      database: process.env.DB_NAME || 'playflow_db',
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });

    // Crear usuario de test
    conn = await pool.getConnection();
    try {
      testUserId = `usr_test_${Date.now()}`;
      await conn.execute(
        `INSERT INTO users (user_id, email, display_name, status, mfa_enabled, created_at, updated_at) 
         VALUES (?, ?, ?, 'active', 0, NOW(3), NOW(3))`,
        [testUserId, testEmail, 'Test User'],
      );
      console.log(`✅ Usuario creado: ${testUserId} (${testEmail})`);
    } catch (err) {
      console.error('❌ Error creando usuario:', (err as any).message);
      throw err;
    } finally {
      conn.release();
    }
  });

  afterAll(async () => {
    // Limpieza
    try {
      const conn = await pool.getConnection();
      await conn.execute(
        `DELETE FROM otp_challenges WHERE user_id = ?`,
        [testUserId],
      );
      await conn.execute(
        `DELETE FROM users WHERE user_id = ?`,
        [testUserId],
      );
      conn.release();
      console.log(`✅ Limpieza completada`);
    } finally {
      await pool.end();
    }
  });

  it('Step 1: requestOtp genera challenge con hash válido', async () => {
    // Importar AQUÍ para asegurar DATABASE_URL está seteado
    const { requestOtp } = await import('./otpService');

    console.log('\n📋 [Step 1] Llamando requestOtp...');
    const result = await requestOtp(testEmail, '127.0.0.1');  // ← Pasar IP

    console.log(`Response:`, result);
    
    if (!result.ok) {
      throw new Error(`requestOtp falló: ${(result as any).reason}`);
    }
    
    expect(result.ok).toBe(true);
    expect(result.challengeId).toBeDefined();
    
    // Verificar que NO sea dev_nodb (eso significa pool == null)
    if (result.challengeId === 'dev_nodb') {
      throw new Error('❌ POOL ES NULL — DATABASE_URL no está siendo usado correctamente');
    }

    testChallengeId = result.challengeId;
    console.log(`✅ Challenge generado: ${testChallengeId}`);

    // Recuperar el OTP de memoria global
    const otp = (global as Record<string, unknown>)[`__otp_${testChallengeId}`];
    console.log(`OTP en memoria global: ${otp}, tipo: ${typeof otp}`);
    
    if (!otp) {
      // Si no está en memoria, probablemente se guardó en DB. Recuperarla de allá
      const conn = await pool.getConnection();
      try {
        const [rows]: any = await conn.execute(
          `SELECT otp_hash FROM otp_challenges WHERE challenge_id = ?`,
          [testChallengeId],
        );
        console.log(`DB otp_challenges:`, rows);
      } finally {
        conn.release();
      }
    }

    testOtp = otp as string;
    expect(testOtp).toBeDefined();
    console.log(`✅ OTP en memoria: ${testOtp}`);
  });

  it('Step 2: verifyOtp valida correctamente el OTP', async () => {
    if (!testChallengeId || !testOtp) {
      console.log('⏭️  Saltando Step 2 — Step 1 falló');
      return;
    }

    const { verifyOtp } = await import('./otpService');

    console.log(`\n📋 [Step 2] Llamando verifyOtp con:`);
    console.log(`  Email: ${testEmail}`);
    console.log(`  Code: ${testOtp}`);

    const result = await verifyOtp(testEmail, testOtp);
    console.log(`Response:`, result);

    if (!result.ok) {
      // Diagnóstico: ir a BD y ver qué está pasando
      const conn = await pool.getConnection();
      try {
        const [rows]: any = await conn.execute(
          `SELECT 
             challenge_id, 
             otp_hash, 
             status, 
             attempts, 
             expires_at,
             HEX(otp_hash) as hash_hex
           FROM otp_challenges 
           WHERE challenge_id = ?`,
          [testChallengeId],
        );
        console.log(`\n🔍 DB State:`, rows[0]);

        // Calcular hash local
        const localHash = crypto.createHash('sha256').update(testOtp).digest('hex');
        console.log(`Local hash: ${localHash}`);
        console.log(`DB hash: ${rows[0]?.otp_hash}`);
        console.log(`Match: ${localHash === rows[0]?.otp_hash}`);
      } finally {
        conn.release();
      }
    }

    expect(result.ok).toBe(true);
    expect((result as any).userId).toBe(testUserId);
    console.log(`✅ OTP validado correctamente`);
  });

  it('Step 3: verifyOtp rechaza OTP incorrecto', async () => {
    if (!testChallengeId) {
      console.log('⏭️  Saltando Step 3 — Step 1 falló');
      return;
    }

    const { verifyOtp } = await import('./otpService');

    console.log(`\n📋 [Step 3] Llamando verifyOtp con código INCORRECTO...`);
    const result = await verifyOtp(testEmail, '000000');
    console.log(`Response:`, result);

    expect(result.ok).toBe(false);
    expect((result as any).reason).toBe('invalid_otp');
    console.log(`✅ OTP incorrecto rechazado`);
  });
});
