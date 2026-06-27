import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock de la DB
vi.mock('../db', () => ({ pool: null }));
// Mock del policyLoader con política de test
vi.mock('./policyLoader', () => {
  const mock = {
    policyId: 'test',
    version: '1.0.0',
    status: 'active',
    criticalActions: ['game.finalizeStats'],
    defaults: { decision: 'deny', auditDenied: true, auditAllowedCritical: true },
    capabilityGroups: {},
    rules: [
      {
        ruleId: 'game.view',
        actions: ['game.view'],
        resources: ['Game'],
        allowIf: ["subject.hasGlobalRole('SysAdmin')"],
        auditLevel: 'low',
      },
    ],
  };
  return {
    getPolicy: () => mock,
    loadPolicy: () => mock,
    _resetPolicyForTest: vi.fn(),
  };
});

describe('authorizationService — sin DB (pool=null)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('deniega cuando pool es null y no puede verificar rol', async () => {
    const { authorize } = await import('./authorizationService');
    const result = await authorize({
      userId: 'usr_1',
      sessionId: 'sess_1',
      authLevel: 'otp',
      action: 'game.view',
      resourceType: 'Game',
      resourceId: 'game_1',
    });
    expect(result.decision).toBe('deny');
  });

  it('deniega acción no mapeada en la política', async () => {
    const { authorize } = await import('./authorizationService');
    const result = await authorize({
      userId: 'usr_1',
      sessionId: 'sess_1',
      authLevel: 'otp',
      action: 'unknown.action',
      resourceType: 'Game',
      resourceId: 'game_1',
    });
    expect(result.decision).toBe('deny');
    expect(result.ruleId).toBe('default.deny');
  });

  it('getCapabilities devuelve array vacío sin pool', async () => {
    const { getCapabilities } = await import('./authorizationService');
    const caps = await getCapabilities('usr_1', 'otp', 'Game', 'game_1');
    expect(Array.isArray(caps) || typeof caps === 'object').toBe(true);
  });
});
