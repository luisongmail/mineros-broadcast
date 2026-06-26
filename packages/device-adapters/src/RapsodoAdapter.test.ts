import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RapsodoAdapter } from './RapsodoAdapter';
import type { NormalizedPitchData } from './types';
import { MPH_TO_KMH, FT_TO_M, IN_TO_CM } from './types';

const MOCK_PITCH = {
  PitchUID: 'pitch-001',
  PitchType: 'FF',
  AutoPitchType: 'FF',
  ReleaseSpeed: 91.5,
  SpinRate: 2280,
  SpinAxis: 212,
  HorzBreak: -4.1,
  InducedVertBreak: 7.8,
  PlateLocSide: -0.72,
  PlateLocHeight: 2.55,
};

function mockFetch(responses: Array<{ ok: boolean; json?: unknown }>) {
  let idx = 0;
  return vi.fn().mockImplementation(() => {
    const resp = responses[idx % responses.length] ?? { ok: true, json: MOCK_PITCH };
    idx++;
    return Promise.resolve({
      ok: resp.ok,
      json: () => Promise.resolve(resp.json),
    });
  });
}

describe('RapsodoAdapter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('healthCheck retorna "ok" cuando el servidor responde', async () => {
    global.fetch = mockFetch([{ ok: true }]);
    const adapter = new RapsodoAdapter('rapsodo-test');
    const result = await adapter.healthCheck();
    expect(result).toBe('ok');
  });

  it('healthCheck retorna "error" cuando el servidor falla', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const adapter = new RapsodoAdapter();
    const result = await adapter.healthCheck();
    expect(result).toBe('error');
  });

  it('connect lanza si healthCheck falla', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const adapter = new RapsodoAdapter();
    await expect(adapter.connect({ deviceId: 'r', host: '192.168.1.99' })).rejects.toThrow();
  });

  it('normaliza y emite pitch con unidades métricas', async () => {
    // Primer fetch: health OK; segundo fetch: pitch data
    global.fetch = mockFetch([
      { ok: true },                       // healthCheck
      { ok: true, json: MOCK_PITCH },     // pollOnce /api/lastPitch
    ]);

    const adapter = new RapsodoAdapter('rapsodo-test');
    const received: NormalizedPitchData[] = [];
    adapter.onPitchData((d) => received.push(d));

    await adapter.connect({ deviceId: 'rapsodo-test', host: '192.168.1.1', pollIntervalMs: 100 });

    // Avanzar el timer para disparar el primer polling
    await vi.advanceTimersByTimeAsync(150);

    expect(received).toHaveLength(1);
    const p = received[0]!;
    expect(p.startSpeed).toBeCloseTo(91.5 * MPH_TO_KMH, 1);
    expect(p.plateX).toBeCloseTo(-0.72 * FT_TO_M, 3);
    expect(p.plateZ).toBeCloseTo(2.55 * FT_TO_M, 3);
    expect(p.pfxX).toBeCloseTo(-4.1 * IN_TO_CM, 2);
    expect(p.pfxZ).toBeCloseTo(7.8 * IN_TO_CM, 2);
    expect(p.spinRate).toBe(2280);
    expect(p.pitchClass).toBe('FF');
    expect(p.confidence).toBe(1.0);

    await adapter.disconnect();
  });

  it('no emite duplicados cuando PitchUID no cambia', async () => {
    const sameUidPitch = { ...MOCK_PITCH, PitchUID: 'same-uid' };
    global.fetch = mockFetch([
      { ok: true },
      { ok: true, json: sameUidPitch },
      { ok: true, json: sameUidPitch },  // mismo UID en segunda poll
    ]);

    const adapter = new RapsodoAdapter('rapsodo-dedup');
    const received: NormalizedPitchData[] = [];
    adapter.onPitchData((d) => received.push(d));

    await adapter.connect({ deviceId: 'rapsodo-dedup', host: '192.168.1.1', pollIntervalMs: 100 });
    await vi.advanceTimersByTimeAsync(250);  // 2 polls

    expect(received).toHaveLength(1);  // solo uno, el segundo es duplicate

    await adapter.disconnect();
  });

  it('cancela suscripción de pitcheos', async () => {
    global.fetch = mockFetch([
      { ok: true },
      { ok: true, json: MOCK_PITCH },
    ]);

    const adapter = new RapsodoAdapter('rapsodo-cancel');
    const handler = vi.fn();
    const unsub = adapter.onPitchData(handler);
    unsub();

    await adapter.connect({ deviceId: 'rapsodo-cancel', host: '192.168.1.1', pollIntervalMs: 100 });
    await vi.advanceTimersByTimeAsync(150);

    expect(handler).not.toHaveBeenCalled();
    await adapter.disconnect();
  });
});
