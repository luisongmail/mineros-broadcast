import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type JwtPayload } from './jwtService';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload & {
    userId: string;    // Alias de 'sub'
    sessionId: string; // Alias de 'sid'
  };
}

/**
 * Middleware de autenticación.
 * Valida el header Authorization: Bearer <jwt> y adjunta req.user.
 * Si el token es inválido o falta, responde 401.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Se requiere autenticación.' } });
    return;
  }

  const token = header.slice(7);
  try {
    const jwtPayload = verifyToken(token);
    // Mapear JwtPayload a AuthenticatedRequest con alias
    req.user = {
      ...jwtPayload,
      userId: jwtPayload.sub,
      sessionId: jwtPayload.sid,
    };
    next();
  } catch {
    res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Token inválido o expirado.' } });
  }
}

/**
 * Middleware opcional: adjunta req.user si hay token, pero no bloquea si falta.
 * Útil para rutas que funcionan tanto autenticadas como anónimas.
 */
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const jwtPayload = verifyToken(header.slice(7));
      req.user = {
        ...jwtPayload,
        userId: jwtPayload.sub,
        sessionId: jwtPayload.sid,
      };
    } catch {
      // Token inválido → continuar sin usuario
    }
  }
  next();
}
