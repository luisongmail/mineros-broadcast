import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Response } from 'express';
import { requireAuthorization, requireRole, requireSysAdmin, requireAdmin, type AuthorizedRequest } from './authzMiddleware';
import * as authzService from './authorizationService';
import * as stepUpService from './stepUpService';

vi.mock('./authorizationService');
vi.mock('./stepUpService');

describe('authzMiddleware', () => {
  let mockReq: Partial<AuthorizedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockReq = {
      user: {
        sub: 'user-123',
        sid: 'sess-456',
        email: 'user@example.com',
        authLevel: 'mfa',
        role: 'Admin',
        stepUpAt: Date.now() - 1000,
        userId: 'user-123',
        sessionId: 'sess-456',
      },
      params: { id: 'resource-789' },
      body: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('requireAuthorization', () => {
    it('debería permitir si la política lo autoriza', async () => {
      const mockDecision = {
        allowed: true,
        decision: 'allow' as const,
        ruleId: 'rule-001',
        reason: 'User has admin role',
        policyVersion: '1.0',
        requiresStepUp: false,
        requiresReason: false,
        auditLevel: 'low' as const,
      };

      vi.mocked(authzService.authorize).mockResolvedValue(mockDecision);

      const middleware = requireAuthorization('read_settings', {
        resourceType: 'Settings',
        resourceIdParam: 'id',
      });

      await middleware(mockReq as AuthorizedRequest, mockRes as Response, mockNext);

      expect(mockReq.authzContext).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('debería denegar si la política lo prohibe', async () => {
      const mockDecision = {
        allowed: false,
        decision: 'deny' as const,
        ruleId: 'rule-002',
        reason: 'User role insufficient',
        policyVersion: '1.0',
        requiresStepUp: false,
        requiresReason: false,
        auditLevel: 'medium' as const,
      };

      vi.mocked(authzService.authorize).mockResolvedValue(mockDecision);

      const middleware = requireAuthorization('delete_user', {
        resourceType: 'User',
        resourceIdParam: 'id',
      });

      await middleware(mockReq as AuthorizedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('debería requerir step-up si no es vigente', async () => {
      const mockDecision = {
        allowed: true,
        decision: 'allow' as const,
        ruleId: 'rule-003',
        reason: 'Allowed but requires step-up',
        policyVersion: '1.0',
        requiresStepUp: true,
        requiresReason: false,
        auditLevel: 'high' as const,
      };

      vi.mocked(authzService.authorize).mockResolvedValue(mockDecision);
      vi.mocked(stepUpService.stepUpRequired).mockReturnValue(false);

      const middleware = requireAuthorization('modify_policy', {
        resourceType: 'Policy',
        resourceIdParam: 'id',
      });

      await middleware(mockReq as AuthorizedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('debería retornar 401 si no hay usuario', async () => {
      mockReq.user = undefined;

      const middleware = requireAuthorization('read_settings', {
        resourceType: 'Settings',
        resourceIdParam: 'id',
      });

      await middleware(mockReq as AuthorizedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('debería retornar 400 si falta resourceId', async () => {
      mockReq.params = {};

      const middleware = requireAuthorization('read_settings', {
        resourceType: 'Settings',
        resourceIdParam: 'id',
      });

      await middleware(mockReq as AuthorizedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('requireRole', () => {
    it('debería permitir si el usuario tiene el rol', async () => {
      const middleware = requireRole('Admin');
      await middleware(mockReq as AuthorizedRequest, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('debería denegar si el usuario no tiene el rol', async () => {
      if (mockReq.user) mockReq.user.role = 'Operator';
      const middleware = requireRole('Admin');
      await middleware(mockReq as AuthorizedRequest, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireSysAdmin', () => {
    it('debería permitir si es SysAdmin', async () => {
      if (mockReq.user) mockReq.user.role = 'SysAdmin';
      const middleware = requireSysAdmin();
      await middleware(mockReq as AuthorizedRequest, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('debería permitir si es Admin', async () => {
      if (mockReq.user) mockReq.user.role = 'Admin';
      const middleware = requireAdmin();
      await middleware(mockReq as AuthorizedRequest, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
