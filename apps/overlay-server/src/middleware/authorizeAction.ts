import type { RowDataPacket } from 'mysql2';
import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { pool, getJwtConfig } from '../lib/db';
import { getValidatedEnvelope, sendIc003Error } from './validateIC003';
import type {
  AccessTokenClaims,
  AuthorizedOverlayUser,
  OverlayOperatorAction,
  OverlayOperatorRole,
} from '../types';

const permissionMatrix: Record<OverlayOperatorRole, ReadonlySet<OverlayOperatorAction>> = {
  admin: new Set([
    'preview_overlay',
    'take_overlay',
    'hide_overlay',
    'hide_all',
    'lock_scorebug',
    'force_show',
    'clear_preview',
    'reload_assets',
  ]),
  director: new Set([
    'preview_overlay',
    'take_overlay',
    'hide_overlay',
    'hide_all',
    'lock_scorebug',
    'force_show',
    'clear_preview',
    'reload_assets',
  ]),
  operator: new Set([
    'preview_overlay',
    'take_overlay',
    'hide_overlay',
    'hide_all',
    'clear_preview',
  ]),
  revisor: new Set(['preview_overlay', 'clear_preview']),
  invitado: new Set(),
};

const actionPolicies: Record<OverlayOperatorAction, { requiredScope: string }> = {
  preview_overlay: { requiredScope: 'overlay.preview' },
  take_overlay: { requiredScope: 'overlay.take' },
  hide_overlay: { requiredScope: 'overlay.hide' },
  hide_all: { requiredScope: 'overlay.hide_all' },
  lock_scorebug: { requiredScope: 'overlay.lock_scorebug' },
  force_show: { requiredScope: 'overlay.force_show' },
  clear_preview: { requiredScope: 'overlay.clear_preview' },
  reload_assets: { requiredScope: 'overlay.reload_assets' },
};

const roleScopes: Record<OverlayOperatorRole, readonly string[]> = {
  admin: Object.values(actionPolicies).map((policy) => policy.requiredScope),
  director: [
    'overlay.preview',
    'overlay.take',
    'overlay.hide',
    'overlay.hide_all',
    'overlay.lock_scorebug',
    'overlay.force_show',
    'overlay.clear_preview',
    'overlay.reload_assets',
  ],
  operator: ['overlay.preview', 'overlay.take', 'overlay.hide', 'overlay.hide_all', 'overlay.clear_preview'],
  revisor: ['overlay.preview', 'overlay.clear_preview'],
  invitado: [],
};

const rolePriority: OverlayOperatorRole[] = ['admin', 'director', 'operator', 'revisor', 'invitado'];

function requireJwtSecret(): string {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required and must be set in .env or Key Vault');
  }

  return jwtSecret;
}

function normalizeRole(value: unknown): OverlayOperatorRole | null {
  if (typeof value !== 'string') {
    return null;
  }

  switch (value.trim().toLowerCase()) {
    case 'sysadmin':
    case 'owner':
    case 'admin':
      return 'admin';
    case 'director':
      return 'director';
    case 'operador':
    case 'operator':
      return 'operator';
    case 'reviewer':
    case 'revisor':
      return 'revisor';
    case 'guest':
    case 'invitado':
    case 'user':
      return 'invitado';
    default:
      return null;
  }
}

function parseScopes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(/[\s,]+/u)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
}

function verifyJWT(token: string): AccessTokenClaims {
  const { issuer, audience } = getJwtConfig();
  const decoded = jwt.verify(token, requireJwtSecret(), {
    algorithms: ['HS256'],
    issuer,
    audience,
  }) as JwtPayload | string;

  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid JWT payload.');
  }

  const { sub, sid, email, authLevel } = decoded;

  if (typeof sub !== 'string' || typeof sid !== 'string' || typeof email !== 'string' || authLevel !== 'otp') {
    throw new Error('Invalid JWT claims.');
  }

  return {
    sub,
    sid,
    email,
    authLevel,
    role: normalizeRole(decoded.role) ?? undefined,
    scope: parseScopes(decoded.scope),
  };
}

async function resolveRoleFromDatabase(userId: string): Promise<OverlayOperatorRole | null> {
  if (!pool) {
    return null;
  }

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT role
     FROM role_assignments
     WHERE user_id = ?
       AND status = 'active'
       AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP(3))`,
    [userId],
  );

  const resolvedRoles = rows
    .map((row) => normalizeRole(row.role))
    .filter((value): value is OverlayOperatorRole => value !== null);

  if (resolvedRoles.length === 0) {
    return null;
  }

  return rolePriority.find((role) => resolvedRoles.includes(role)) ?? null;
}

function buildAuthorizedUser(claims: AccessTokenClaims, role: OverlayOperatorRole): AuthorizedOverlayUser {
  const tokenScopes = parseScopes(claims.scope);

  return {
    userId: claims.sub,
    sessionId: claims.sid,
    email: claims.email,
    authLevel: claims.authLevel,
    role,
    scope: tokenScopes.length > 0 ? tokenScopes : [...roleScopes[role]],
  };
}

export async function authorizeAction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const envelope = getValidatedEnvelope(req);

    if (!envelope) {
      sendIc003Error(res, {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'No se encontró un envelope IC-003 validado.',
      });
      return;
    }

    const authHeader = req.headers.authorization ?? '';

    if (!authHeader.startsWith('Bearer ')) {
      sendIc003Error(res, {
        status: 401,
        requestEnvelope: envelope,
        code: 'UNAUTHORIZED',
        message: 'Missing Bearer token',
      });
      return;
    }

    let claims: AccessTokenClaims;

    try {
      claims = verifyJWT(authHeader.slice(7));
    } catch (error) {
      sendIc003Error(res, {
        status: 401,
        requestEnvelope: envelope,
        code: 'UNAUTHORIZED',
        message: error instanceof Error ? error.message : 'Invalid Bearer token',
      });
      return;
    }

    const persistedRole = await resolveRoleFromDatabase(claims.sub);
    const effectiveRole = persistedRole ?? claims.role ?? null;

    if (!effectiveRole) {
      sendIc003Error(res, {
        status: 403,
        requestEnvelope: envelope,
        code: 'UNAUTHORIZED',
        message: 'No fue posible determinar un rol autorizado para el operador.',
        details: { userId: claims.sub },
      });
      return;
    }

    const action = actionPolicies[envelope.payload.action];

    if (!action) {
      sendIc003Error(res, {
        status: 422,
        requestEnvelope: envelope,
        code: 'VALIDATION_ERROR',
        message: `La acción ${String(envelope.payload.action)} no es válida.`,
      });
      return;
    }

    const user = buildAuthorizedUser(claims, effectiveRole);
    const hasRolePermission = permissionMatrix[user.role].has(envelope.payload.action);
    const hasScopePermission = user.scope.includes(action.requiredScope);

    if (!hasRolePermission || !hasScopePermission) {
      sendIc003Error(res, {
        status: 403,
        requestEnvelope: envelope,
        code: 'UNAUTHORIZED',
        message: 'Insufficient scope',
        details: {
          userId: user.userId,
          role: user.role,
          action: envelope.payload.action,
          requiredScope: action.requiredScope,
          grantedScopes: user.scope,
        },
      });
      return;
    }

    req.user = user;
    req.overlayRole = effectiveRole;
    envelope.payload.operatorId = user.userId;
    envelope.payload.role = user.role;
    next();
  } catch (error) {
    next(error);
  }
}
