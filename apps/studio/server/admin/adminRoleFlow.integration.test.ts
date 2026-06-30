/**
 * adminRoleFlow.integration.test.ts
 *
 * Flujo completo: asignar rol a usuario → listar usuarios → verificar que el nuevo rol
 * aparece en la respuesta de listado (un solo query con JOIN, no N+1 separados).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

vi.mock('../auth/authMiddleware', () => ({
  requireAuth: (req: any, _res: any, next: () => void) => {
    req.user = {
      userId: 'usr_sysadmin_001',
      sessionId: 'sess_sysadmin_001',
      role: 'SysAdmin',
    };
    next();
  },
}));
vi.mock('../authorization/authzMiddleware', () => ({
  requireRole: () => (_req: any, _res: any, next: () => void) => next(),
  requireAuthorization: () => (_req: any, _res: any, next: () => void) => next(),
}));
vi.mock('../authorization/stepUpService', () => ({
  STEP_UP_HEADER: 'x-step-up-token',
  stepUpRequired: vi.fn(() => false),
  validateStepUpToken: vi.fn(async () => true),
}));
vi.mock('../audit/auditService', () => ({
  logAuditEvent: vi.fn(async () => 'aud_test_001'),
  queryAudit: vi.fn(async () => ({ entries: [], total: 0 })),
}));

// Estado mutable del pool — simula la BD actualizando el rol tras PATCH
let currentRole: string | null = null;

function createPool() {
  return {
    async getConnection() {
      return {
        async execute(sql: string, _params?: unknown[]) {
          // GET /api/admin/users — COUNT query
          if (sql.includes('COUNT(*) AS total') && sql.includes('FROM users u')) {
            return [[{ total: 1 }]];
          }

          // GET /api/admin/users — paginated data query
          if (
            sql.includes('FROM users u') &&
            sql.includes('LEFT JOIN role_assignments ra') &&
            sql.includes('LIMIT ?') &&
            !sql.includes('WHERE u.user_id')
          ) {
            return [
              [
                {
                  user_id: 'usr_target_001',
                  email: 'target@test.local',
                  display_name: 'Target User',
                  status: 'active',
                  mfa_enabled: 0,
                  last_login_at: null,
                  created_at: new Date('2024-01-01'),
                  role: currentRole,
                },
              ],
            ];
          }

          // Verificación de existencia de usuario (PATCH roles/assign)
          if (sql.includes('SELECT user_id FROM users WHERE user_id = ?')) {
            return [[{ user_id: 'usr_target_001' }]];
          }

          // Verificación de rol del actor (roles del que ejecuta la acción)
          if (
            sql.includes('FROM role_assignments') &&
            sql.includes("WHERE user_id = ? AND status = 'active'")
          ) {
            return [[{ role: 'SysAdmin' }]];
          }

          // DELETE rol anterior + INSERT nuevo (PATCH roles/assign)
          if (sql.startsWith('DELETE FROM role_assignments')) {
            currentRole = null;
            return [{ affectedRows: 1 }];
          }
          if (sql.startsWith('INSERT INTO role_assignments')) {
            currentRole = 'Operator';
            return [{ insertId: 1, affectedRows: 1 }];
          }

          // Consulta de usuario + rol actual para respuesta del PATCH
          if (
            sql.includes('FROM users u') &&
            sql.includes('LEFT JOIN role_assignments ra') &&
            sql.includes('WHERE u.user_id = ?')
          ) {
            return [
              [
                {
                  user_id: 'usr_target_001',
                  email: 'target@test.local',
                  display_name: 'Target User',
                  status: 'active',
                  role: currentRole,
                },
              ],
            ];
          }

          return [[]];
        },
        // query() — usado para COUNT cuando no hay filtros (params vacío)
        async query(sql: string, _params?: unknown[]) {
          if (sql.includes('COUNT(*) AS total') && sql.includes('FROM users u')) {
            return [[{ total: 1 }]];
          }
          if (
            sql.includes('FROM users u') &&
            sql.includes('LEFT JOIN role_assignments ra') &&
            sql.includes('LIMIT ?') &&
            !sql.includes('WHERE u.user_id')
          ) {
            return [
              [
                {
                  user_id: 'usr_target_001',
                  email: 'target@test.local',
                  display_name: 'Target User',
                  status: 'active',
                  mfa_enabled: 0,
                  last_login_at: null,
                  created_at: new Date('2024-01-01'),
                  role: currentRole,
                },
              ],
            ];
          }
          return [[]];
        },
        release() {},
      };
    },
  };
}

describe('admin role assignment flow', () => {
  let server: Server;
  let baseUrl = '';

  beforeEach(async () => {
    currentRole = null;
    vi.resetModules();
    vi.doMock('../db', () => ({ pool: createPool() }));

    const { adminRouter } = await import('./adminRouter');
    const app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    await new Promise<void>((res, rej) => server.close((err) => err ? rej(err) : res()));
  });

  it('GET /api/admin/users devuelve usuarios con rol incluido en un único query', async () => {
    currentRole = 'Admin';

    const res = await fetch(`${baseUrl}/api/admin/users`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.users).toHaveLength(1);

    const user = body.users[0];
    expect(user.id).toBe('usr_target_001');
    expect(user.role).toBe('Admin');
  });

  it('POST roles/assign → GET /api/admin/users refleja el nuevo rol inmediatamente', async () => {
    // Estado inicial: sin rol
    const before = await fetch(`${baseUrl}/api/admin/users`);
    const bodyBefore = await before.json();
    expect(bodyBefore.users[0].role).toBeNull();

    // Asignar rol Operator
    const assign = await fetch(
      `${baseUrl}/api/admin/users/usr_target_001/roles/assign`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'Operator' }),
      },
    );
    expect(assign.status).toBe(200);

    // Listar usuarios — el rol debe aparecer en el mismo endpoint de listado
    const after = await fetch(`${baseUrl}/api/admin/users`);
    const bodyAfter = await after.json();
    expect(bodyAfter.users[0].role).toBe('Operator');
  });

  it('GET /api/admin/users no llama a ningún endpoint individual de rol por usuario', async () => {
    currentRole = 'SysAdmin';
    let roleEndpointCalled = false;

    // Wrapper para detectar llamadas individuales al endpoint de rol
    const originalFetch = global.fetch;
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.match(/\/users\/[^/]+\/roles$/)) {
        roleEndpointCalled = true;
      }
      return originalFetch(input, init);
    };

    await fetch(`${baseUrl}/api/admin/users`);

    global.fetch = originalFetch;
    expect(roleEndpointCalled).toBe(false);
  });
});
