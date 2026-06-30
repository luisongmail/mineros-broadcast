import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

let lastOtp = '';

vi.mock('../db', () => ({ pool: null }));
vi.mock('../auth/emailService', () => ({
  sendOtpEmail: vi.fn(async (_to: string, otp: string) => {
    lastOtp = otp;
  }),
}));
vi.mock('../auth/authMiddleware', () => ({
  requireAuth: (req: any, _res: any, next: () => void) => {
    req.user = {
      sub: 'usr_admin_001',
      userId: 'usr_admin_001',
      email: 'admin@test.local',
      sid: 'sess_001',
      sessionId: 'sess_001',
      role: 'SysAdmin',
      authLevel: 'mfa',
      stepUpAt: null,
    };
    next();
  },
}));
vi.mock('../authorization/authzMiddleware', () => ({
  requireRole: () => (_req: any, _res: any, next: () => void) => next(),
  requireAuthorization: () => (_req: any, _res: any, next: () => void) => next(),
}));

function clearStepUpGlobals() {
  for (const key of Object.keys(global as Record<string, unknown>)) {
    if (key.startsWith('__stepup_') || key.startsWith('__su_')) {
      delete (global as Record<string, unknown>)[key];
    }
  }
}

describe('HTTP flow: step-up + delete user protegido', () => {
  let server: Server;
  let baseUrl = '';

  beforeEach(async () => {
    vi.resetModules();
    clearStepUpGlobals();
    lastOtp = '';

    const express = (await import('express')).default;
    const { default: securityRouter } = await import('./securityRouter');
    const { adminRouter } = await import('../admin/adminRouter');

    const app = express();
    app.use(express.json());
    app.use('/api/security', securityRouter);
    app.use('/api/admin', adminRouter);

    server = app.listen(0);
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    clearStepUpGlobals();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  });

  it('completa request→verify→delete en flujo HTTP', async () => {
    const requestRes = await fetch(`${baseUrl}/api/security/step-up/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        action: 'delete_user',
        resourceType: 'User',
        resourceId: 'usr_target_001',
      }),
    });

    expect(requestRes.status).toBe(200);
    const requestBody = await requestRes.json() as { challengeId: string };
    expect(requestBody.challengeId).toBeTruthy();
    expect(lastOtp).toMatch(/^\d{6}$/);

    const verifyRes = await fetch(`${baseUrl}/api/security/step-up/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        challengeId: requestBody.challengeId,
        code: lastOtp,
      }),
    });

    expect(verifyRes.status).toBe(200);
    const verifyBody = await verifyRes.json() as { stepUpToken: string };
    expect(verifyBody.stepUpToken).toBeTruthy();

    const deleteRes = await fetch(`${baseUrl}/api/admin/users/usr_target_001`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
        'x-step-up-token': verifyBody.stepUpToken,
      },
      body: JSON.stringify({
        reason: 'qa_flow_validation',
        confirmationName: 'Target User',
      }),
    });
    expect(deleteRes.status).toBe(200);
    const deleteBody = await deleteRes.json() as { ok: boolean; deleted: boolean };
    expect(deleteBody.ok).toBe(true);
    expect(deleteBody.deleted).toBe(true);

  });
});
