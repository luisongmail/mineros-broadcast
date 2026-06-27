import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../db', () => ({ pool: null }));

describe('auditRetentionJob — sin DB', () => {
  afterEach(async () => {
    const mod = await import('./auditRetentionJob');
    mod.stopRetentionScheduler();
    vi.resetModules();
  });

  it('runRetentionJob devuelve resultado vacío sin pool', async () => {
    vi.mock('../db', () => ({ pool: null }));
    const { runRetentionJob } = await import('./auditRetentionJob');
    const result = await runRetentionJob();
    expect(result.total).toBe(0);
    expect(result.archivedHigh).toBe(0);
    expect(result.archivedMedium).toBe(0);
    expect(result.archivedLow).toBe(0);
    expect(result.ranAt).toBeTruthy();
  });

  it('runRetentionJob acepta config personalizada', async () => {
    vi.mock('../db', () => ({ pool: null }));
    const { runRetentionJob } = await import('./auditRetentionJob');
    const result = await runRetentionJob({ highDays: 10, mediumDays: 5, lowDays: 2 });
    expect(result.total).toBe(0);
  });

  it('startRetentionScheduler no lanza sin pool', async () => {
    vi.useFakeTimers();
    vi.mock('../db', () => ({ pool: null }));
    const { startRetentionScheduler, stopRetentionScheduler } = await import('./auditRetentionJob');
    expect(() => startRetentionScheduler()).not.toThrow();
    stopRetentionScheduler();
    vi.useRealTimers();
  });
});
