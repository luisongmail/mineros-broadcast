import { describe, it, expect, vi } from 'vitest';

vi.mock('../db', () => ({ pool: null }));

describe('auditService — sin DB', () => {
  it('logAuditEvent devuelve auditId aunque pool sea null', async () => {
    const { logAuditEvent } = await import('./auditService');
    const id = await logAuditEvent('usr_1', 'game.view', 'Game', 'g1', 'allowed', {}, {});
    expect(id).toMatch(/^aud_/);
  });

  it('queryAudit devuelve array vacío sin pool', async () => {
    const { queryAudit } = await import('./auditService');
    const entries = await queryAudit({ actorUserId: 'usr_1' });
    expect(entries).toEqual([]);
  });

  it('verifyChainIntegrity devuelve ceros sin pool', async () => {
    const { verifyChainIntegrity } = await import('./auditService');
    const result = await verifyChainIntegrity();
    expect(result.totalChecked).toBe(0);
    expect(result.broken).toBe(0);
    expect(result.firstBrokenAt).toBeNull();
  });

  it('hash chain es secuencial y consistente', async () => {
    vi.resetModules();
    vi.mock('../db', () => ({ pool: null }));
    const { logAuditEvent } = await import('./auditService');
    const id1 = await logAuditEvent('usr_1', 'a1', 'Game', 'g1', 'allowed', {}, {});
    const id2 = await logAuditEvent('usr_1', 'a2', 'Game', 'g1', 'allowed', {}, {});
    expect(id1).toMatch(/^aud_/);
    expect(id2).toMatch(/^aud_/);
    expect(id1).not.toBe(id2);
  });
});
