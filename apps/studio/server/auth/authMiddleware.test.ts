import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../db', () => ({ pool: undefined, hasDatabaseConfigured: () => false }));

beforeEach(() => {
  process.env.JWT_SECRET = 'test_secret_64bytes_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  process.env.JWT_ISSUER = 'playflow';
  process.env.JWT_AUDIENCE = 'playflow-app';
  process.env.JWT_ACCESS_TOKEN_MINUTES = '15';
});

function makeReqRes(authHeader?: string) {
  const req = {
    headers: authHeader ? { authorization: authHeader } : {},
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as Request;
  let statusCode = 200;
  let body: unknown;
  const res = {
    status(code: number) { statusCode = code; return this; },
    json(data: unknown) { body = data; return this; },
    getStatus: () => statusCode,
    getBody: () => body,
  } as unknown as Response & { getStatus: () => number; getBody: () => unknown };
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next, getStatus: () => statusCode, getBody: () => body };
}

describe('authMiddleware', () => {
  it('requireAuth permite pasar con token válido', async () => {
    const { signToken } = await import('./jwtService');
    const { requireAuth } = await import('./authMiddleware');
    const token = signToken({ sub: 'usr_1', sid: 'sess_1', email: 'a@b.cl', authLevel: 'otp' });
    const { req, res, next } = makeReqRes(`Bearer ${token}`);
    requireAuth(req as Parameters<typeof requireAuth>[0], res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('requireAuth rechaza sin Authorization header', async () => {
    const { requireAuth } = await import('./authMiddleware');
    const { req, res, next, getStatus, getBody } = makeReqRes();
    requireAuth(req as Parameters<typeof requireAuth>[0], res, next);
    expect(next).not.toHaveBeenCalled();
    expect(getStatus()).toBe(401);
    expect((getBody() as { error: { code: string } }).error.code).toBe('UNAUTHENTICATED');
  });

  it('requireAuth rechaza token malformado', async () => {
    const { requireAuth } = await import('./authMiddleware');
    const { req, res, next, getStatus } = makeReqRes('Bearer not_a_jwt');
    requireAuth(req as Parameters<typeof requireAuth>[0], res, next);
    expect(next).not.toHaveBeenCalled();
    expect(getStatus()).toBe(401);
  });

  it('optionalAuth continúa sin header', async () => {
    const { optionalAuth } = await import('./authMiddleware');
    const { req, res, next } = makeReqRes();
    optionalAuth(req as Parameters<typeof optionalAuth>[0], res, next);
    expect(next).toHaveBeenCalledOnce();
    expect((req as { user?: unknown }).user).toBeUndefined();
  });

  it('optionalAuth adjunta user con token válido', async () => {
    const { signToken } = await import('./jwtService');
    const { optionalAuth } = await import('./authMiddleware');
    const token = signToken({ sub: 'usr_2', sid: 'sess_2', email: 'b@b.cl', authLevel: 'otp' });
    const { req, res, next } = makeReqRes(`Bearer ${token}`);
    optionalAuth(req as Parameters<typeof optionalAuth>[0], res, next);
    expect(next).toHaveBeenCalledOnce();
    expect((req as { user?: { sub: string } }).user?.sub).toBe('usr_2');
  });
});
