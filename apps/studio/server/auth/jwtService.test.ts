import { describe, it, expect, beforeEach } from 'vitest';

// Aislar de variables de entorno reales
beforeEach(() => {
  process.env.JWT_SECRET = 'test_secret_64bytes_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  process.env.JWT_ISSUER = 'playflow';
  process.env.JWT_AUDIENCE = 'playflow-app';
  process.env.JWT_ACCESS_TOKEN_MINUTES = '15';
});

describe('jwtService', () => {
  it('firma y verifica un token válido', async () => {
    const { signToken, verifyToken } = await import('./jwtService');
    const token = signToken({ sub: 'usr_1', sid: 'sess_1', email: 'a@b.cl', authLevel: 'otp' });
    const payload = verifyToken(token);
    expect(payload.sub).toBe('usr_1');
    expect(payload.sid).toBe('sess_1');
    expect(payload.email).toBe('a@b.cl');
    expect(payload.authLevel).toBe('otp');
  });

  it('lanza si el token está expirado', async () => {
    process.env.JWT_ACCESS_TOKEN_MINUTES = '0';
    const { signToken, verifyToken } = await import('./jwtService');
    const token = signToken({ sub: 'usr_1', sid: 'sess_1', email: 'a@b.cl', authLevel: 'otp' });
    await new Promise((r) => setTimeout(r, 1100));
    expect(() => verifyToken(token)).toThrow();
  });

  it('lanza si el secreto es incorrecto', async () => {
    const { signToken } = await import('./jwtService');
    process.env.JWT_SECRET = 'other_secret_64bytes_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const { verifyToken } = await import('./jwtService');
    const token = signToken({ sub: 'usr_1', sid: 'sess_1', email: 'a@b.cl', authLevel: 'otp' });
    // Restaurar secreto diferente para que falle
    process.env.JWT_SECRET = 'wrong_secret_64bytes_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    expect(() => verifyToken(token)).toThrow();
  });

  it('getTokenExpiresInSeconds retorna los segundos correctos', async () => {
    process.env.JWT_ACCESS_TOKEN_MINUTES = '15';
    const { getTokenExpiresInSeconds } = await import('./jwtService');
    expect(getTokenExpiresInSeconds()).toBe(900);
  });
});
