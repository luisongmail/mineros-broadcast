import jwt from 'jsonwebtoken';

export type AuthLevel = 'anonymous' | 'otp' | 'mfa' | 'step_up';

export interface JwtPayload {
  sub: string;   // userId
  sid: string;   // sessionId
  email: string;
  authLevel: AuthLevel;
  iat?: number;
  exp?: number;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
}

function getExpiresIn(): number {
  return Number(process.env.JWT_ACCESS_TOKEN_MINUTES ?? 15) * 60;
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getSecret(), {
    algorithm: 'HS256',
    expiresIn: getExpiresIn(),
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
