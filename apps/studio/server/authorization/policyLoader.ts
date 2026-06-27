import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export interface PolicyRule {
  ruleId: string;
  description?: string;
  actions: string[];
  resources: string[];
  allowIf?: string[];
  denyIf?: string[];
  requiresStepUp?: boolean | string;
  requiresReason?: boolean | string;
  auditLevel?: 'low' | 'medium' | 'high';
}

export interface SecurityPolicy {
  policyId: string;
  version: string;
  status: string;
  rules: PolicyRule[];
  capabilityGroups: Record<string, string[]>;
  criticalActions: string[];
  defaults: {
    decision: 'deny' | 'allow';
    auditDenied: boolean;
    auditAllowedCritical: boolean;
  };
}

let _policy: SecurityPolicy | null = null;

export function loadPolicy(): SecurityPolicy {
  if (_policy) return _policy;

  const policyPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../../docs/requirements/30-security-access-control-audit/security-policy-v1.0.0.json',
  );

  const raw = readFileSync(policyPath, 'utf-8');
  _policy = JSON.parse(raw) as SecurityPolicy;
  console.log(`[PolicyLoader] Cargada política ${_policy.policyId} v${_policy.version}`);
  return _policy;
}

export function getPolicy(): SecurityPolicy {
  return _policy ?? loadPolicy();
}

/** Para tests — permite inyectar una política mock */
export function _resetPolicyForTest(mock?: SecurityPolicy): void {
  _policy = mock ?? null;
}
