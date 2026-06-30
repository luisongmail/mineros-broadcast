import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('stepUpService DB contract', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('inserta challenge con session_id en step_up_challenges', async () => {
    const execute = vi.fn().mockResolvedValue([{}]);
    const release = vi.fn();
    const getConnection = vi.fn().mockResolvedValue({ execute, release });

    vi.doMock('../db', () => ({
      pool: { getConnection },
    }));
    vi.doMock('../auth/emailService', () => ({
      sendOtpEmail: vi.fn().mockResolvedValue(undefined),
    }));

    const { requestStepUp } = await import('./stepUpService');

    await requestStepUp(
      'usr_001',
      'test@example.com',
      'delete_user',
      'User',
      'usr_target_001',
      'sess_001',
    );

    expect(getConnection).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(1);
    const [sql, params] = execute.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('session_id');
    expect(params[2]).toBe('sess_001');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('normaliza session_id largo para la columna CHAR(36)', async () => {
    const execute = vi.fn().mockResolvedValue([{}]);
    const release = vi.fn();
    const getConnection = vi.fn().mockResolvedValue({ execute, release });

    vi.doMock('../db', () => ({
      pool: { getConnection },
    }));
    vi.doMock('../auth/emailService', () => ({
      sendOtpEmail: vi.fn().mockResolvedValue(undefined),
    }));

    const { requestStepUp } = await import('./stepUpService');
    const longSessionId = 'sess_1234567890abcdefghijklmnopqrstuvwxyz_EXTRA';

    await requestStepUp(
      'usr_001',
      'test@example.com',
      'delete_user',
      'User',
      'usr_target_001',
      longSessionId,
    );

    const [, params] = execute.mock.calls[0] as [string, unknown[]];
    const persistedSessionId = String(params[2]);
    expect(persistedSessionId.length).toBe(36);
    expect(persistedSessionId).not.toBe(longSessionId);
    expect(release).toHaveBeenCalledTimes(1);
  });
});
