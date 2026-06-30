import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

const validateStepUpTokenMock = vi.fn();

vi.mock('../auth/authMiddleware', () => ({
  requireAuth: (req: any, _res: any, next: () => void) => {
    req.user = {
      userId: 'usr_actor_001',
      sessionId: 'sess_actor_001',
      role: req.headers['x-role'] ?? 'Admin',
      stepUpAt: null,
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
  validateStepUpToken: (...args: unknown[]) => validateStepUpTokenMock(...args),
}));
vi.mock('../audit/auditService', () => ({
  logAuditEvent: vi.fn(async () => 'aud_test_001'),
  queryAudit: vi.fn(async () => ({ entries: [], total: 0 })),
}));

type MockPool = {
  getConnection: () => Promise<{
    execute: (sql: string, params?: unknown[]) => Promise<[any[]]>;
    release: () => void;
  }>;
};

function createPool(targetPrivileged: boolean): MockPool {
  return {
    async getConnection() {
      return {
        async execute(sql: string) {
          if (sql.includes('SELECT user_id, email, display_name FROM users')) {
            return [[{ user_id: 'usr_target_001', email: 'target@test.local', display_name: 'Target User' }]];
          }
          if (sql.includes('WHERE user_id = ? AND resource_type = ? AND resource_id = ?') && sql.includes('role IN (\'Admin\',\'Owner\')')) {
            return [[{ one: 1 }]];
          }
          if (sql.includes('WHERE user_id = ? AND resource_type = ? AND resource_id = ? AND status = \'active\'')) {
            return [[{ one: 1 }]];
          }
          // Verificación de rol privilegiado PLATFORM — debe incluir resource_type = 'Platform'
          if (
            sql.includes('FROM role_assignments') &&
            sql.includes('role IN (\'Admin\',\'SysAdmin\')') &&
            sql.includes("resource_type = 'Platform'")
          ) {
            return [targetPrivileged ? [{ role: 'Admin' }] : []];
          }
          if (sql.startsWith('DELETE FROM users')) {
            return [[{ affectedRows: 1 }]];
          }
          return [[]];
        },
        release() {},
      };
    },
  };
}

// Pool que simula usuario con rol Admin en Tournament pero sin rol Platform
function createPoolTournamentAdmin(): MockPool {
  return {
    async getConnection() {
      return {
        async execute(sql: string) {
          if (sql.includes('SELECT user_id, email, display_name FROM users')) {
            return [[{ user_id: 'usr_target_001', email: 'target@test.local', display_name: 'Target User' }]];
          }
          if (sql.includes('WHERE user_id = ? AND resource_type = ? AND resource_id = ?') && sql.includes('role IN (\'Admin\',\'Owner\')')) {
            return [[{ one: 1 }]];
          }
          if (sql.includes('WHERE user_id = ? AND resource_type = ? AND resource_id = ? AND status = \'active\'')) {
            return [[{ one: 1 }]];
          }
          // Plataforma: sin rol — solo tiene Admin en Tournament scope
          if (
            sql.includes('FROM role_assignments') &&
            sql.includes('role IN (\'Admin\',\'SysAdmin\')') &&
            sql.includes("resource_type = 'Platform'")
          ) {
            return [[]];
          }
          if (sql.startsWith('DELETE FROM users')) {
            return [[{ affectedRows: 1 }]];
          }
          return [[]];
        },
        release() {},
      };
    },
  };
}

describe('admin delete adaptive controls', () => {
  let server: Server;
  let baseUrl = '';

  async function bootWithPool(targetPrivileged: boolean) {
    vi.resetModules();
    validateStepUpTokenMock.mockReset();
    validateStepUpTokenMock.mockResolvedValue(true);

    vi.doMock('../db', () => ({ pool: createPool(targetPrivileged) }));

    const { adminRouter } = await import('./adminRouter');
    const app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);
    server = app.listen(0);
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }

  beforeEach(async () => {
    await bootWithPool(false);
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  });

  it('permite delete low-risk con confirmación por nombre sin step-up', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/usr_target_001`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test',
        'x-role': 'Admin',
      },
      body: JSON.stringify({
        reason: 'cleanup',
        confirmationName: 'Target User',
        resourceType: 'Team',
        resourceId: 'team_001',
      }),
    });

    expect(res.status).toBe(200);
    expect(validateStepUpTokenMock).not.toHaveBeenCalled();
  });

  it('requiere step-up cuando el target es privilegiado', async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    await bootWithPool(true);

    const res = await fetch(`${baseUrl}/api/admin/users/usr_target_001`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test',
        'x-role': 'Admin',
      },
      body: JSON.stringify({
        reason: 'cleanup',
        confirmationName: 'Target User',
        resourceType: 'Team',
        resourceId: 'team_001',
      }),
    });

    expect(res.status).toBe(403);
    const body = await res.json() as { error?: { code?: string } };
    expect(body.error?.code).toBe('STEP_UP_REQUIRED');
  });

  it('permite delete de target privilegiado con step-up token válido', async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    await bootWithPool(true);
    validateStepUpTokenMock.mockResolvedValue(true);

    const res = await fetch(`${baseUrl}/api/admin/users/usr_target_001`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test',
        'x-role': 'Admin',
        'x-step-up-token': 'su_valid_001',
      },
      body: JSON.stringify({
        reason: 'cleanup',
        confirmationName: 'Target User',
        resourceType: 'Team',
        resourceId: 'team_001',
      }),
    });

    expect(res.status).toBe(200);
    expect(validateStepUpTokenMock).toHaveBeenCalled();
  });

  it('no exige step-up si el target tiene rol Admin en Tournament pero no en Platform', async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    vi.resetModules();
    validateStepUpTokenMock.mockReset();
    vi.doMock('../db', () => ({ pool: createPoolTournamentAdmin() }));

    const { adminRouter } = await import('./adminRouter');
    const app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);
    server = app.listen(0);
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const res = await fetch(`${baseUrl}/api/admin/users/usr_target_001`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test',
        'x-role': 'Admin',
      },
      body: JSON.stringify({
        reason: 'cleanup',
        confirmationName: 'Target User',
        resourceType: 'Team',
        resourceId: 'team_001',
      }),
    });

    expect(res.status).toBe(200);
    expect(validateStepUpTokenMock).not.toHaveBeenCalled();
  });
});
