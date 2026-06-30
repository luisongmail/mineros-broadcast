import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('auditService DB contract', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('usa columnas reales de audit_events (sin request_json/integrity_json)', async () => {
    const execute = vi.fn().mockResolvedValue([{}]);
    const release = vi.fn();
    const getConnection = vi.fn().mockResolvedValue({ execute, release });

    vi.doMock('../db', () => ({
      pool: { getConnection },
    }));

    const { logAuditEvent } = await import('./auditService');
    await logAuditEvent(
      'usr_001',
      'step_up_verified',
      'User',
      'usr_target_001',
      'allowed',
      { verificationMethod: 'otp' },
      { reason: 'flow_check' },
    );

    expect(getConnection).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(1);
    const [sql] = execute.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('previous_hash');
    expect(sql).toContain('event_hash');
    expect(sql).toContain('change_summary');
    expect(sql).not.toContain('request_json');
    expect(sql).not.toContain('integrity_json');
    expect(sql).not.toContain('created_at');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('no agrega filtro LIKE cuando search tiene menos de 3 caracteres', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([[{ total: 1 }]])
      .mockResolvedValueOnce([[{
        audit_id: 'aud_1',
        actor_user_id: 'usr_1',
        action: 'user.read',
        resource_type: 'User',
        resource_id: 'usr_1',
        result: 'allowed',
        authorization_json: '{}',
        request_json: '{}',
        integrity_json: '{}',
        created_at: '2026-06-30T00:00:00.000Z',
      }]]);
    const execute = vi.fn().mockResolvedValue([[]]);
    const release = vi.fn();
    const getConnection = vi.fn().mockResolvedValue({ query, execute, release });

    vi.doMock('../db', () => ({
      pool: { getConnection },
    }));

    const { queryAuditCount, queryAudit } = await import('./auditService');
    await queryAuditCount({ search: 'ab' });
    await queryAudit({ search: 'ab', page: 1, limit: 10 });

    const [countSql, countParams] = query.mock.calls[0] as [string, unknown[]];
    expect(countSql).not.toContain('LIKE');
    expect(countParams).toEqual([]);

    const [dataSql, dataParams] = query.mock.calls[1] as [string, unknown[]];
    expect(dataSql).not.toContain('LIKE');
    expect(dataParams).toEqual([10, 0]);
    expect(execute).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(2);
  });

  it('agrega filtro LIKE cuando search tiene 3 o más caracteres', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([[{ total: 1 }]])
      .mockResolvedValueOnce([[{
        audit_id: 'aud_1',
        actor_user_id: 'usr_001',
        action: 'user.read',
        resource_type: 'User',
        resource_id: 'usr_001',
        result: 'allowed',
        authorization_json: '{}',
        request_json: '{}',
        integrity_json: '{}',
        created_at: '2026-06-30T00:00:00.000Z',
      }]]);
    const execute = vi.fn().mockResolvedValue([[]]);
    const release = vi.fn();
    const getConnection = vi.fn().mockResolvedValue({ query, execute, release });

    vi.doMock('../db', () => ({
      pool: { getConnection },
    }));

    const { queryAuditCount, queryAudit } = await import('./auditService');
    await queryAuditCount({ search: 'usr_001' });
    await queryAudit({ search: 'usr_001', page: 1, limit: 10 });

    const [countSql, countParams] = query.mock.calls[0] as [string, unknown[]];
    expect(countSql).toContain('audit_id LIKE ?');
    expect(countParams).toEqual(['%usr_001%', '%usr_001%', '%usr_001%', '%usr_001%']);

    const [dataSql, dataParams] = query.mock.calls[1] as [string, unknown[]];
    expect(dataSql).toContain('audit_id LIKE ?');
    expect(dataParams).toEqual(['%usr_001%', '%usr_001%', '%usr_001%', '%usr_001%', 10, 0]);
    expect(execute).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(2);
  });
});
