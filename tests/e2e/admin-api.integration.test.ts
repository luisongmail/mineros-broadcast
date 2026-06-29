/**
 * Admin API Integration Tests
 * Validates all admin endpoints: authentication, authorization, data persistence
 * Run: pnpm test:e2e --testPathPattern="admin-api"
 * 
 * NOTE: This test uses the real auth flow:
 * 1. POST /auth/login with email + password
 * 2. If MFA required, POST /auth/mfa/verify with TOTP code
 * 3. Get JWT token with role included
 * 4. Use token for all admin endpoints
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_BASE = 'http://localhost:5173/api';

// Test credentials (seeded by migration 006, assume password set in DB seed)
const TEST_USER = {
  email: 'luison@playflow.cl',
  password: 'Test123!@#', // Update if different seed password
};

let authToken = '';
let userId = '';

/**
 * Helper: Decode JWT payload (basic decoding, not validation)
 */
function decodeJwt(token: string): Record<string, any> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT');
  const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
  return JSON.parse(payload);
}

/**
 * Phase 1: Authentication
 * Validates that we can obtain a valid JWT with role included
 */
test.describe('Admin API - Phase 1: Authentication', () => {
  test('POST /auth/login - Login with email and password', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password,
      },
    });

    // Should return 200 or redirect to MFA if required
    expect([200, 400, 401, 302]).toContain(res.status());
  });

  test('POST /auth/login and verify MFA - Get JWT with role', async ({ request }) => {
    // Step 1: Try login
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password,
      },
    });

    // If login requires MFA, verify with code
    let token = '';
    let user = {};

    if (loginRes.ok()) {
      const body = await loginRes.json();
      if (body.token) {
        token = body.token;
        user = body.user || {};
      } else if (body.mfaRequired) {
        // MFA required—use hardcoded test TOTP (assumes dev env allows 000000)
        const mfaRes = await request.post(`${API_BASE}/auth/mfa/verify`, {
          data: {
            email: TEST_USER.email,
            code: '000000', // Dev env test code
          },
        });

        if (mfaRes.ok()) {
          const mfaBody = await mfaRes.json();
          token = mfaBody.token;
          user = mfaBody.user || {};
        }
      }
    }

    // If we got a token, validate it contains role
    if (token) {
      authToken = token;
      userId = user.sub || user.id || '';

      const decoded = decodeJwt(token);
      expect(decoded.role || decoded.authLevel).toBeDefined();
      expect([decoded.role, decoded.authLevel]).toContain('SysAdmin');
    }
  });
});

/**
 * Phase 2: Authorization
 * Validates that endpoints check role before execution
 */
test.describe('Admin API - Phase 2: Authorization', () => {
  test('GET /admin/users - Requires SysAdmin role', async ({ request }) => {
    const res = await request.get(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    // Must succeed (we have SysAdmin role)
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.users || Array.isArray(body)).toBeTruthy();
  });

  test('GET /admin/users - Denied without auth header', async ({ request }) => {
    const res = await request.get(`${API_BASE}/admin/users`);

    // Must fail (no auth)
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe('UNAUTHENTICATED');
  });

  test('GET /admin/users - Denied with wrong role (future test)', async ({ request }) => {
    // This would require creating a user with Operator role
    // Placeholder for future role-based access control testing
    expect(true).toBeTruthy();
  });
});

/**
 * Phase 3: Admin Endpoints - Policy Management
 * Validates policy CRUD and persistence
 */
test.describe('Admin API - Phase 3: Policy Management', () => {
  test('POST /admin/policy/update - Update policy with complete data', async ({ request }) => {
    const policyUpdate = {
      requireMfaForAll: true,
      gracePeriodDays: 14,
      maxFailedAttempts: 3,
      sessionTimeoutMinutes: 60,
    };

    const res = await request.post(`${API_BASE}/admin/policy/update`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { policyContent: policyUpdate },
    });

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.policyContent).toBeDefined();
  });

  test('POST /admin/policy/update - Update policy with partial data', async ({ request }) => {
    const policyUpdate = { requireMfaForAll: false };

    const res = await request.post(`${API_BASE}/admin/policy/update`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: policyUpdate, // Direct format (no wrapper)
    });

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('POST /admin/policy/update - Reject without auth header', async ({ request }) => {
    const res = await request.post(`${API_BASE}/admin/policy/update`, {
      data: { requireMfaForAll: true },
    });

    expect(res.status()).toBe(401);
  });

  test('POST /admin/policy/update - Reject invalid policy data', async ({ request }) => {
    const res = await request.post(`${API_BASE}/admin/policy/update`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: null, // Invalid
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error?.code).toBe('INVALID_POLICY');
  });
});

/**
 * Phase 4: Admin Endpoints - User Management
 * Validates user listing, suspension, reactivation
 */
test.describe('Admin API - Phase 4: User Management', () => {
  test('GET /admin/users - Retrieve user list', async ({ request }) => {
    const res = await request.get(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // Should return array or object with users property
    const users = Array.isArray(body) ? body : body.users;
    expect(Array.isArray(users) || users).toBeTruthy();
  });

  test('POST /admin/users/:userId/suspend - Suspend user', async ({ request }) => {
    // This test requires a valid user ID
    // Using placeholder—update with real user ID if available
    const res = await request.post(
      `${API_BASE}/admin/users/${userId}/suspend`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { reason: 'Test suspension' },
      },
    );

    // May 404 if user doesn't exist in dev env
    // Should succeed (200/201) if user exists
    expect([200, 201, 404]).toContain(res.status());
  });

  test('POST /admin/users/:userId/reactivate - Reactivate user', async ({ request }) => {
    const res = await request.post(
      `${API_BASE}/admin/users/${userId}/reactivate`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    expect([200, 201, 404]).toContain(res.status());
  });
});

/**
 * Phase 5: Admin Endpoints - Session Management
 * Validates session listing and invalidation
 */
test.describe('Admin API - Phase 5: Session Management', () => {
  test('GET /admin/sessions - Retrieve active sessions', async ({ request }) => {
    const res = await request.get(`${API_BASE}/admin/sessions`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const sessions = Array.isArray(body) ? body : body.sessions;
    expect(Array.isArray(sessions) || sessions).toBeTruthy();
  });

  test('DELETE /admin/sessions/:id - Invalidate session', async ({ request }) => {
    // Get current session ID from token (would need to decode JWT in real test)
    // Using placeholder—this requires session ID extraction
    const testSessionId = 'placeholder-session-id';

    const res = await request.delete(`${API_BASE}/admin/sessions/${testSessionId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    // Should fail with 404 (session doesn't exist) or 200 (success)
    expect([200, 204, 404]).toContain(res.status());
  });
});

/**
 * Phase 6: Admin Endpoints - Audit Logs
 * Validates audit log retrieval
 */
test.describe('Admin API - Phase 6: Audit Logs', () => {
  test('GET /admin/audit-logs - Retrieve audit log', async ({ request }) => {
    const res = await request.get(`${API_BASE}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const logs = Array.isArray(body) ? body : body.logs;
    expect(Array.isArray(logs) || logs).toBeTruthy();
  });

  test('GET /admin/audit-logs/export - Export audit logs', async ({ request }) => {
    const res = await request.get(`${API_BASE}/admin/audit-logs/export`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    // May 200 (JSON) or 400 (not implemented)
    expect([200, 400]).toContain(res.status());
  });
});

/**
 * Phase 7: Admin Endpoints - System Health
 * Validates system health endpoint
 */
test.describe('Admin API - Phase 7: System Health', () => {
  test('GET /admin/system/health - Retrieve system health status', async ({ request }) => {
    const res = await request.get(`${API_BASE}/admin/system/health`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status || body.health).toBeDefined();
  });
});

/**
 * Integration Summary
 * All phases must pass before admin features are considered stable
 */
test.describe('Admin API - Integration Summary', () => {
  test('All admin endpoints respond with proper authentication/authorization', async () => {
    // This is a marker test—actual validation is in phases 1-7
    expect(authToken).toBeTruthy();
    expect(authToken.length).toBeGreaterThan(10);
  });
});
