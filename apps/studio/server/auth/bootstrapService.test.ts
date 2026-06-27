import { describe, it, expect, vi } from 'vitest';

vi.mock('../db', () => ({ pool: undefined, hasDatabaseConfigured: () => false }));

describe('bootstrapService — sin DB', () => {
  it('no hace nada si BOOTSTRAP_SYSADMIN_EMAIL está vacío', async () => {
    delete process.env.BOOTSTRAP_SYSADMIN_EMAIL;
    const { bootstrapSysAdmin } = await import('./bootstrapService');
    await expect(bootstrapSysAdmin()).resolves.toBeUndefined();
  });

  it('no hace nada si no hay DB aunque el email esté configurado', async () => {
    process.env.BOOTSTRAP_SYSADMIN_EMAIL = 'admin@playflow.app';
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { bootstrapSysAdmin } = await import('./bootstrapService');
    await expect(bootstrapSysAdmin()).resolves.toBeUndefined();
    consoleSpy.mockRestore();
  });
});
