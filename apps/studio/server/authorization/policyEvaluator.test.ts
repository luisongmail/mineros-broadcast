import { describe, it, expect, beforeEach } from 'vitest';
import { _resetPolicyForTest } from './policyLoader';
import type { SecurityPolicy } from './policyLoader';

const MOCK_POLICY: SecurityPolicy = {
  policyId: 'test-policy',
  version: '1.0.0',
  status: 'active',
  criticalActions: ['game.finalizeStats'],
  defaults: { decision: 'deny', auditDenied: true, auditAllowedCritical: true },
  capabilityGroups: {},
  rules: [
    {
      ruleId: 'sysadmin.all',
      actions: ['*'],
      resources: ['*'],
      allowIf: ["subject.hasGlobalRole('SysAdmin')"],
      auditLevel: 'high',
    },
    {
      ruleId: 'game.view',
      actions: ['game.view'],
      resources: ['Game'],
      allowIf: [
        "subject.hasGlobalRole('SysAdmin')",
        "subject.hasRole(resource, ['Owner','Admin','Operator','User'])",
        "subject.isAssignedScorer(resource)",
      ],
      auditLevel: 'low',
    },
    {
      ruleId: 'game.scoreEvent',
      actions: ['game.scoreEventCreate'],
      resources: ['Game'],
      allowIf: [
        "subject.hasGlobalRole('SysAdmin')",
        "subject.isAssignedScorer(resource, ['official_scorer','assistant_scorer'])",
      ],
      auditLevel: 'high',
      requiresStepUp: false,
    },
    {
      ruleId: 'user.manage',
      actions: ['user.suspend', 'user.revokeSession'],
      resources: ['User'],
      allowIf: ["subject.hasGlobalRole('SysAdmin')"],
      requiresStepUp: "action in ['user.suspend','user.revokeSession']",
      auditLevel: 'high',
    },
  ],
};

beforeEach(() => {
  _resetPolicyForTest(MOCK_POLICY);
});

describe('policyLoader', () => {
  it('getPolicy retorna la política inyectada', async () => {
    const { getPolicy } = await import('./policyLoader');
    const policy = getPolicy();
    expect(policy.policyId).toBe('test-policy');
    expect(policy.rules).toHaveLength(4);
  });
});

describe('policyEvaluator — sin DB', () => {
  it('deniega por defecto cuando no hay regla que coincida', async () => {
    const { evaluate } = await import('./policyEvaluator');
    const result = await evaluate({
      subject: { userId: 'usr_1', sessionId: 's', authLevel: 'otp' },
      resource: { type: 'League', id: 'league_1' },
      action: 'unknown.action',
    });
    expect(result.decision).toBe('deny');
    expect(result.ruleId).toBe('default.deny');
  });

  it('evalúa requiresStepUp string correctamente para action in [...]', async () => {
    const { evaluate } = await import('./policyEvaluator');
    // La regla user.manage no tiene allowIf que pase sin DB (hasGlobalRole requiere DB)
    // pero podemos testear que el evaluador no lanza
    const result = await evaluate({
      subject: { userId: 'usr_1', sessionId: 's', authLevel: 'otp' },
      resource: { type: 'User', id: 'usr_2' },
      action: 'user.suspend',
    });
    // Sin DB no puede verificar hasGlobalRole → deny
    expect(result.decision).toBe('deny');
  });

  it('deniega cuando el recurso no coincide', async () => {
    const { evaluate } = await import('./policyEvaluator');
    const result = await evaluate({
      subject: { userId: 'usr_1', sessionId: 's', authLevel: 'otp' },
      resource: { type: 'NonExistent', id: 'id_1' },
      action: 'game.view',
    });
    expect(result.decision).toBe('deny');
  });
});
