import type { RowDataPacket } from 'mysql2';
import { pool } from '../db';
import { getPolicy } from './policyLoader';

export interface SubjectContext {
  userId: string;
  sessionId: string;
  authLevel: string;
  status?: string;
}

export interface ResourceContext {
  type: string;
  id: string;
  /** Recurso padre opcional (ej: game → tournament, tournament → league) */
  parentType?: string;
  parentId?: string;
  grandParentType?: string;
  grandParentId?: string;
  status?: string;
}

export interface EvalContext {
  subject: SubjectContext;
  resource: ResourceContext;
  action: string;
}

// ─────────────────────────────────────────────
// Evaluadores del mini-DSL
// ─────────────────────────────────────────────

async function hasGlobalRole(userId: string, role: string): Promise<boolean> {
  if (!pool) return false;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT 1 FROM role_assignments
       WHERE user_id = ? AND role = ? AND resource_type = 'Platform' AND resource_id = 'global'
       AND status = 'active'
       LIMIT 1`,
      [userId, role],
    );
    return rows.length > 0;
  } finally {
    conn.release();
  }
}

async function hasRole(userId: string, resourceType: string, resourceId: string, roles: string[]): Promise<boolean> {
  if (!pool) return false;
  const conn = await pool.getConnection();
  try {
    const placeholders = roles.map(() => '?').join(',');
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT 1 FROM role_assignments
       WHERE user_id = ? AND role IN (${placeholders}) AND resource_type = ? AND resource_id = ? AND status = 'active'
       LIMIT 1`,
      [userId, ...roles, resourceType, resourceId] as string[],
    );
    return rows.length > 0;
  } finally {
    conn.release();
  }
}

async function inheritsRole(
  userId: string,
  parentType: string,
  parentId: string | undefined,
  roles: string[],
): Promise<boolean> {
  if (!parentId || !pool) return false;
  return hasRole(userId, parentType, parentId, roles);
}

async function isAssignedScorer(
  userId: string,
  gameId: string,
  scorerRoles?: string[],
): Promise<boolean> {
  if (!pool) return false;
  const conn = await pool.getConnection();
  try {
    let query = `SELECT 1 FROM scoring_assignments WHERE user_id = ? AND game_id = ? AND status = 'active'`;
    const params: unknown[] = [userId, gameId];
    if (scorerRoles && scorerRoles.length > 0) {
      query += ` AND role IN (${scorerRoles.map(() => '?').join(',')})`;
      params.push(...scorerRoles);
    }
    query += ' LIMIT 1';
    const [rows] = await conn.execute<RowDataPacket[]>(query, params as string[]);
    return rows.length > 0;
  } finally {
    conn.release();
  }
}

async function canDelegateRole(
  userId: string,
  targetRole: string,
  resourceType: string,
  resourceId: string,
): Promise<boolean> {
  if (!pool) return false;
  // Solo el Owner o alguien con hasDelegatedUserAdmin puede delegar roles no-SysAdmin
  if (targetRole === 'SysAdmin') return false;
  return hasRole(userId, resourceType, resourceId, ['Owner', 'Admin']);
}

async function hasDelegatedUserAdmin(userId: string, resourceType: string, resourceId: string): Promise<boolean> {
  if (!pool) return false;
  return hasRole(userId, resourceType, resourceId, ['Admin', 'Owner']);
}

// ─────────────────────────────────────────────
// Evaluador de expresiones del mini-DSL
// ─────────────────────────────────────────────

async function evalCondition(expr: string, ctx: EvalContext): Promise<boolean> {
  const { subject, resource, action } = ctx;

  // subject.hasGlobalRole('X')
  const globalRoleMatch = expr.match(/^subject\.hasGlobalRole\('([^']+)'\)$/);
  if (globalRoleMatch) {
    return hasGlobalRole(subject.userId, globalRoleMatch[1]);
  }

  // subject.hasRole(resource, ['X','Y',...])
  const hasRoleMatch = expr.match(/^subject\.hasRole\(resource,\s*\[([^\]]+)\]\)$/);
  if (hasRoleMatch) {
    const roles = hasRoleMatch[1].split(',').map((r) => r.trim().replace(/'/g, ''));
    return hasRole(subject.userId, resource.type, resource.id, roles);
  }

  // subject.isAssignedScorer(resource) o subject.isAssignedScorer(resource, [...])
  const scorerMatch = expr.match(/^subject\.isAssignedScorer\(resource(?:,\s*\[([^\]]+)\])?\)$/);
  if (scorerMatch) {
    const roles = scorerMatch[1]
      ? scorerMatch[1].split(',').map((r) => r.trim().replace(/'/g, ''))
      : undefined;
    return isAssignedScorer(subject.userId, resource.id, roles);
  }

  // subject.isAssignedScorer(resource.game)
  const scorerGameMatch = expr.match(/^subject\.isAssignedScorer\(resource\.game\)$/);
  if (scorerGameMatch) {
    // El resourceId del contexto es el game
    return isAssignedScorer(subject.userId, resource.id);
  }

  // subject.inheritsRole(resource.tournament, ['X','Y'])
  const inheritsTournMatch = expr.match(/^subject\.inheritsRole\(resource\.tournament,\s*\[([^\]]+)\]\)$/);
  if (inheritsTournMatch) {
    const roles = inheritsTournMatch[1].split(',').map((r) => r.trim().replace(/'/g, ''));
    return inheritsRole(subject.userId, 'Tournament', resource.parentId, roles);
  }

  // subject.inheritsRole(resource.league, ['X','Y'])
  const inheritsLeagueMatch = expr.match(/^subject\.inheritsRole\(resource\.league,\s*\[([^\]]+)\]\)$/);
  if (inheritsLeagueMatch) {
    const roles = inheritsLeagueMatch[1].split(',').map((r) => r.trim().replace(/'/g, ''));
    return inheritsRole(subject.userId, 'League', resource.grandParentId ?? resource.parentId, roles);
  }

  // subject.inheritsRole(resource.game, ['X','Y'])
  const inheritsGameMatch = expr.match(/^subject\.inheritsRole\(resource\.game,\s*\[([^\]]+)\]\)$/);
  if (inheritsGameMatch) {
    const roles = inheritsGameMatch[1].split(',').map((r) => r.trim().replace(/'/g, ''));
    return inheritsRole(subject.userId, 'Game', resource.id, roles);
  }

  // subject.canDelegateRole(targetRole, targetResource)
  const delegateMatch = expr.match(/^subject\.canDelegateRole\(targetRole,\s*targetResource\)$/);
  if (delegateMatch) {
    return canDelegateRole(subject.userId, action, resource.type, resource.id);
  }

  // subject.hasDelegatedUserAdmin(resource.scope)
  const delegatedAdminMatch = expr.match(/^subject\.hasDelegatedUserAdmin\(resource\.scope\)$/);
  if (delegatedAdminMatch) {
    return hasDelegatedUserAdmin(subject.userId, resource.type, resource.id);
  }

  // subject.status != 'active'
  if (expr === "subject.status != 'active'") {
    return (subject.status ?? 'active') !== 'active';
  }

  // resource.status in ['closed','finalized']
  const resourceStatusMatch = expr.match(/^resource\.status in \[([^\]]+)\]$/);
  if (resourceStatusMatch) {
    const statuses = resourceStatusMatch[1].split(',').map((s) => s.trim().replace(/'/g, ''));
    return statuses.includes(resource.status ?? '');
  }

  // Condiciones complejas que no son implementables sin más contexto → denegar por defecto
  console.warn(`[PolicyEvaluator] Expresión no implementada: ${expr}`);
  return false;
}

async function evalRequiresStepUp(expr: boolean | string | undefined, ctx: EvalContext): Promise<boolean> {
  if (expr === undefined || expr === false) return false;
  if (expr === true) return true;

  // "action.isCritical == true"
  if (expr === 'action.isCritical == true') {
    const policy = getPolicy();
    return policy.criticalActions?.includes(ctx.action) ?? false;
  }

  // "action in ['user.suspend','user.revokeSession']"
  const actionInMatch = (expr as string).match(/^action in \[([^\]]+)\]$/);
  if (actionInMatch) {
    const actions = actionInMatch[1].split(',').map((a) => a.trim().replace(/'/g, ''));
    return actions.includes(ctx.action);
  }

  return false;
}

// ─────────────────────────────────────────────
// Resultado de evaluación
// ─────────────────────────────────────────────

export interface EvalResult {
  decision: 'allow' | 'deny';
  ruleId: string;
  reason: string;
  requiresStepUp: boolean;
  requiresReason: boolean;
  auditLevel: 'low' | 'medium' | 'high';
}

export async function evaluate(ctx: EvalContext): Promise<EvalResult> {
  const policy = getPolicy();
  const { action, resource } = ctx;

  const denied: EvalResult = {
    decision: 'deny',
    ruleId: 'default.deny',
    reason: 'no_matching_rule',
    requiresStepUp: false,
    requiresReason: false,
    auditLevel: 'medium',
  };

  // Buscar reglas que coincidan con la acción y el recurso
  const matchingRules = policy.rules.filter((rule) => {
    const actionMatch = rule.actions.includes('*') || rule.actions.includes(action);
    const resourceMatch = rule.resources.includes('*') || rule.resources.includes(resource.type);
    return actionMatch && resourceMatch;
  });

  for (const rule of matchingRules) {
    // Evaluar denyIf primero (deny tiene precedencia)
    if (rule.denyIf) {
      for (const cond of rule.denyIf) {
        if (await evalCondition(cond, ctx)) {
          return {
            decision: 'deny',
            ruleId: rule.ruleId,
            reason: `deny_condition: ${cond}`,
            requiresStepUp: false,
            requiresReason: false,
            auditLevel: rule.auditLevel ?? 'medium',
          };
        }
      }
    }

    // Evaluar allowIf (OR — basta con que una condición sea verdadera)
    if (rule.allowIf) {
      for (const cond of rule.allowIf) {
        if (await evalCondition(cond, ctx)) {
          const requiresStepUp = await evalRequiresStepUp(rule.requiresStepUp, ctx);
          const requiresReason =
            rule.requiresReason === true ||
            (typeof rule.requiresReason === 'string' && rule.requiresReason.includes(action));

          return {
            decision: 'allow',
            ruleId: rule.ruleId,
            reason: cond,
            requiresStepUp,
            requiresReason,
            auditLevel: rule.auditLevel ?? 'medium',
          };
        }
      }
    }
  }

  return denied;
}
