import type { Response, NextFunction } from 'express';
import { authorize, type AuthorizationRequest } from './authorizationService';
import { stepUpRequired } from './stepUpService';
import type { AuthenticatedRequest } from '../auth/authMiddleware';

/**
 * Contexto de autorización extraído del request.
 * Extendemos AuthenticatedRequest con detalles del recurso.
 */
export interface AuthorizedRequest extends AuthenticatedRequest {
  authzContext?: {
    resourceType: string;
    resourceId: string;
    decision?: Awaited<ReturnType<typeof authorize>>;
  };
}

/**
 * Opciones para requireAuthorization()
 */
export interface RequireOptions {
  resourceType: string;
  resourceIdParam?: string; // Parámetro de URL o body field (default: 'id')
  parentResourceType?: string;
  parentResourceIdParam?: string;
  grandParentResourceType?: string;
  grandParentResourceIdParam?: string;
}

/**
 * Helper para extraer un parámetro de request (URL params o body)
 */
function getParamValue(req: AuthorizedRequest, paramName: string): string | undefined {
  // Primero intentar desde URL params
  const urlParam = req.params[paramName];
  if (urlParam) return urlParam;

  // Luego desde body
  const bodyParam = (req.body as Record<string, unknown>)?.[paramName];
  if (typeof bodyParam === 'string') return bodyParam;

  return undefined;
}

/**
 * Middleware de autorización: valida capability + política.
 * Requisitos:
 * 1. JWT válido (requireAuth debe ir antes)
 * 2. Capacidad autorizada en PolicyEvaluator
 * 3. Opcionalmente, step-up MFA si la política lo requiere
 *
 * Uso:
 *   app.post('/api/settings/:id', requireAuth, authorize('update_settings'), handler);
 */
export function requireAuthorization(action: string, options: RequireOptions) {
  return async (req: AuthorizedRequest, res: Response, next: NextFunction): Promise<void> => {
    // 1. Validar que exista usuario autenticado
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Se requiere autenticación.' } });
      return;
    }

    // 2. Extraer resourceId de params o body
    const resourceIdParam = options.resourceIdParam ?? 'id';
    const resourceId = getParamValue(req, resourceIdParam);

    if (!resourceId) {
      res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: `Falta parámetro requerido: ${resourceIdParam}` },
      });
      return;
    }

    // 3. Extraer parent resource IDs si aplica
    let parentResourceId: string | undefined;
    let grandParentResourceId: string | undefined;

    if (options.parentResourceIdParam) {
      parentResourceId = getParamValue(req, options.parentResourceIdParam);
    }
    if (options.grandParentResourceIdParam) {
      grandParentResourceId = getParamValue(req, options.grandParentResourceIdParam);
    }

    // 4. Construir contexto de autorización
    const authzReq: AuthorizationRequest = {
      userId: req.user.userId,
      sessionId: req.user.sessionId,
      authLevel: req.user.authLevel,
      action,
      resourceType: options.resourceType,
      resourceId,
      userStatus: 'active',
      resourceParentType: options.parentResourceType,
      resourceParentId: parentResourceId ?? undefined,
      resourceGrandParentType: options.grandParentResourceType,
      resourceGrandParentId: grandParentResourceId ?? undefined,
    };

    // 5. Evaluar autorización
    try {
      const decision = await authorize(authzReq);

      // 6. Adjuntar contexto al request
      req.authzContext = {
        resourceType: options.resourceType,
        resourceId,
        decision,
      };

      // 7. Si se deniega → 403 Forbidden
      if (!decision.allowed) {
        console.warn(
          `[AuthZ] ${action} DENIED for user ${req.user.userId} on ${options.resourceType}/${resourceId}. Reason: ${decision.reason}`,
        );
        res.status(403).json({
          error: {
            code: 'PERMISSION_DENIED',
            message: 'No tienes permiso para realizar esta acción.',
            reason: decision.reason,
          },
        });
        return;
      }

      // 8. Si requiere step-up MFA → validar frescura
      if (decision.requiresStepUp) {
        const stepUpValid = stepUpRequired(req.user.sessionId, req.user.stepUpAt);
        if (!stepUpValid) {
          console.warn(
            `[AuthZ] ${action} REQUIRES_STEP_UP for user ${req.user.userId} on ${options.resourceType}/${resourceId}`,
          );
          res.status(403).json({
            error: {
              code: 'STEP_UP_REQUIRED',
              message: 'Esta acción requiere re-verificación de identidad.',
              stepUpRequired: true,
            },
          });
          return;
        }
      }

      // 9. Si requiere motivo → validar que esté en request
      if (decision.requiresReason && !(req.body as Record<string, unknown>)?.reason) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Se requiere un motivo (reason) para esta acción.',
          },
        });
        return;
      }

      // 10. Log de auditoría
      if (decision.auditLevel === 'high') {
        console.info(
          `[Audit] ${action} ALLOWED for user ${req.user.userId} on ${options.resourceType}/${resourceId}. Rule: ${decision.ruleId}`,
        );
      }

      // 11. Continuar
      next();
    } catch (err) {
      console.error(`[AuthZ] Error evaluating authorization: ${err}`);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Error al evaluar autorización.' },
      });
    }
  };
}

/**
 * Variante simplificada: solo valida que el usuario tenga un rol específico.
 * Para rutas que no requieren PolicyEvaluator complejo.
 *
 * Uso:
 *   app.post('/api/admin/users', requireAuth, requireRole('Admin'), handler);
 */
export function requireRole(...roles: string[]) {
  return async (req: AuthorizedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Se requiere autenticación.' } });
      return;
    }

    // Validar que el usuario tenga uno de los roles requeridos
    if (!req.user.role || !roles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'PERMISSION_DENIED',
          message: `Se requiere uno de estos roles: ${roles.join(', ')}`,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Middleware que solo permite SysAdmin.
 */
export const requireSysAdmin = () => requireRole('SysAdmin');

/**
 * Middleware que solo permite Admin o SysAdmin.
 */
export const requireAdmin = () => requireRole('Admin', 'SysAdmin');
