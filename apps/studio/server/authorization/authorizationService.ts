import type { RowDataPacket } from 'mysql2';
import { pool } from '../db';
import { evaluate, type EvalContext } from './policyEvaluator';
import { getPolicy } from './policyLoader';

export interface AuthorizationRequest {
  userId: string;
  sessionId: string;
  authLevel: string;
  action: string;
  resourceType: string;
  resourceId: string;
  userStatus?: string;
  resourceStatus?: string;
  resourceParentType?: string;
  resourceParentId?: string;
  resourceGrandParentType?: string;
  resourceGrandParentId?: string;
}

export interface AuthorizationDecision {
  allowed: boolean;
  decision: 'allow' | 'deny';
  ruleId: string;
  reason: string;
  policyVersion: string;
  requiresStepUp: boolean;
  requiresReason: boolean;
  auditLevel: 'low' | 'medium' | 'high';
}

export async function authorize(req: AuthorizationRequest): Promise<AuthorizationDecision> {
  const policy = getPolicy();

  const ctx: EvalContext = {
    subject: {
      userId: req.userId,
      sessionId: req.sessionId,
      authLevel: req.authLevel,
      status: req.userStatus ?? 'active',
    },
    resource: {
      type: req.resourceType,
      id: req.resourceId,
      parentType: req.resourceParentType,
      parentId: req.resourceParentId,
      grandParentType: req.resourceGrandParentType,
      grandParentId: req.resourceGrandParentId,
      status: req.resourceStatus,
    },
    action: req.action,
  };

  const result = await evaluate(ctx);

  return {
    allowed: result.decision === 'allow',
    decision: result.decision,
    ruleId: result.ruleId,
    reason: result.reason,
    policyVersion: `${policy.policyId}@${policy.version}`,
    requiresStepUp: result.requiresStepUp,
    requiresReason: result.requiresReason,
    auditLevel: result.auditLevel,
  };
}

// ─────────────────────────────────────────────
// CapabilityService — calcula todas las capabilities de un usuario sobre un recurso
// ─────────────────────────────────────────────

export interface CapabilityMap {
  resource: { type: string; id: string };
  user: { userId: string; authLevel: string };
  effectiveRoles: string[];
  capabilities: Record<string, boolean>;
  requirements: Record<string, { requiresStepUp?: boolean; requiresReason?: boolean }>;
  explanations: Record<string, string>;
}

export async function getCapabilities(
  userId: string,
  authLevel: string,
  resourceType: string,
  resourceId: string,
  parentType?: string,
  parentId?: string,
): Promise<CapabilityMap> {
  const policy = getPolicy();

  // Calcular todos los actions del grupo relevante para este resourceType
  const allActions = new Set<string>();
  for (const rule of policy.rules) {
    if (rule.resources.includes('*') || rule.resources.includes(resourceType)) {
      for (const a of rule.actions) {
        if (a !== '*') allActions.add(a);
      }
    }
  }

  // Obtener roles efectivos del usuario en este recurso
  const effectiveRoles = await getEffectiveRoles(userId, resourceType, resourceId, parentType, parentId);

  // Evaluar cada action
  const capabilities: Record<string, boolean> = {};
  const requirements: Record<string, { requiresStepUp?: boolean; requiresReason?: boolean }> = {};
  const explanations: Record<string, string> = {};

  await Promise.all(
    [...allActions].map(async (action) => {
      const decision = await authorize({
        userId,
        sessionId: 'cap_check',
        authLevel,
        action,
        resourceType,
        resourceId,
        resourceParentType: parentType,
        resourceParentId: parentId,
      });
      capabilities[action] = decision.allowed;
      if (decision.requiresStepUp || decision.requiresReason) {
        requirements[action] = {
          requiresStepUp: decision.requiresStepUp || undefined,
          requiresReason: decision.requiresReason || undefined,
        };
      }
      explanations[action] = decision.reason;
    }),
  );

  return {
    resource: { type: resourceType, id: resourceId },
    user: { userId, authLevel },
    effectiveRoles,
    capabilities,
    requirements,
    explanations,
  };
}

async function getEffectiveRoles(
  userId: string,
  resourceType: string,
  resourceId: string,
  parentType?: string,
  parentId?: string,
): Promise<string[]> {
  if (!pool) return [];
  const conn = await pool.getConnection();
  try {
    const roles: string[] = [];

    // Roles directos en el recurso
    const [directRows] = await conn.execute<RowDataPacket[]>(
      `SELECT role FROM role_assignments
       WHERE user_id = ? AND resource_type = ? AND resource_id = ? AND status = 'active'`,
      [userId, resourceType, resourceId],
    );
    for (const r of directRows) roles.push(r.role as string);

    // Roles en el padre (herencia)
    if (parentType && parentId) {
      const [parentRows] = await conn.execute<RowDataPacket[]>(
        `SELECT role FROM role_assignments
         WHERE user_id = ? AND resource_type = ? AND resource_id = ? AND status = 'active'`,
        [userId, parentType, parentId],
      );
      for (const r of parentRows) roles.push(`${r.role as string}@${parentType}`);
    }

    // Rol global SysAdmin
    const [globalRows] = await conn.execute<RowDataPacket[]>(
      `SELECT role FROM role_assignments
       WHERE user_id = ? AND resource_type = 'Platform' AND resource_id = 'global' AND status = 'active'`,
      [userId],
    );
    for (const r of globalRows) roles.push(r.role as string);

    return [...new Set(roles)];
  } finally {
    conn.release();
  }
}
