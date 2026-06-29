import jwt from 'jsonwebtoken';

export type AuthLevel = 'anonymous' | 'otp' | 'mfa' | 'step_up';

export interface JwtPayload {
  sub: string;   // userId
  sid: string;   // sessionId
  email: string;
  authLevel: AuthLevel;
  role?: string;  // User role (Admin, SysAdmin, Operator, etc.) — opcional
  stepUpAt?: number; // Timestamp cuando se verificó step-up (para validar frescura)
  iat?: number;
  exp?: number;
}

// Alias para compatibilidad con authMiddleware
export interface JwtPayloadWithProperties extends JwtPayload {
  userId: string; // Alias de 'sub'
  sessionId: string; // Alias de 'sid'
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
}

function getExpiresIn(): number {
  return Number(process.env.JWT_ACCESS_TOKEN_MINUTES ?? 15) * 60;
}

export function getDevTokenExpiresIn(): number {
  return Number(process.env.JWT_DEV_TOKEN_MINUTES ?? 1440) * 60;  // default 24h
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getSecret(), {
    algorithm: 'HS256',
    expiresIn: getExpiresIn(),
    issuer: process.env.JWT_ISSUER ?? 'playflow',
    audience: process.env.JWT_AUDIENCE ?? 'playflow-app',
  });
}

export function signDevToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getSecret(), {
    algorithm: 'HS256',
    expiresIn: getDevTokenExpiresIn(),
    issuer: process.env.JWT_ISSUER ?? 'playflow',
    audience: process.env.JWT_AUDIENCE ?? 'playflow-app',
  });
}

export function verifyToken(token: string): JwtPayload {
  const payload = jwt.verify(token, getSecret(), {
    algorithms: ['HS256'],
    issuer: process.env.JWT_ISSUER ?? 'playflow',
    audience: process.env.JWT_AUDIENCE ?? 'playflow-app',
  });
  return payload as JwtPayload;
}

export function getTokenExpiresInSeconds(): number {
  return getExpiresIn();
}
