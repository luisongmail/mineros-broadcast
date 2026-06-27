import { describe, expect, it, vi } from 'vitest';

import type { GameEvent } from '@playflow/game-engine';

import { EventEngine } from './EventEngine';

function createEvent(overrides: Partial<GameEvent> = {}): GameEvent {
  return {
    eventId: 'evt-000001',
    eventType: 'batter_changed',
    gameId: 'game-2026-001',
    timestamp: '2026-06-23T00:00:00Z',
    source: 'GameEngine',
    payload: {
      currentBatterId: 'player-018',
      previousBatterId: 'player-017',
    },
    ...overrides,
  };
}

describe('EventEngine', () => {
  it('rechaza eventos con eventType no soportado', () => {
    const engine = new EventEngine();
    const output = engine.process(createEvent({ eventType: 'run_scored' as GameEvent['eventType'] }) as GameEvent);

    expect(output.requests).toEqual([]);
    expect(output.audit).toMatchObject({
      result: 'rejected',
      eventType: 'run_scored',
      rejectionReason: "El eventType 'run_scored' no está soportado en V1.",
    });
  });

  it('rechaza eventos con campos obligatorios faltantes', () => {
    const engine = new EventEngine();
    const invalidEvent = createEvent({ eventId: '' });
    const output = engine.process(invalidEvent);

    expect(output.requests).toEqual([]);
    expect(output.audit).toMatchObject({
      result: 'rejected',
      rejectionReason: "El campo 'eventId' es obligatorio.",
    });
  });

  it('genera solicitudes correctas para batter_changed', () => {
    const engine = new EventEngine();
    const output = engine.process(createEvent());

    expect(output.requests).toEqual([
      {
        requestId: 'request-000001',
        source: 'EventEngine',
        eventId: 'evt-000001',
        action: 'showOverlay',
        overlay: 'batter',
        preferredZone: 'B',
        mode: 'preview',
        priority: 80,
        payload: {
          currentBatterId: 'player-018',
          previousBatterId: 'player-017',
        },
      },
      {
        requestId: 'request-000002',
        source: 'EventEngine',
        eventId: 'evt-000001',
        action: 'requestScene',
        sceneId: 'scene-cambio-bateador',
        mode: 'preview',
        priority: 70,
      },
    ]);
    expect(output.audit.result).toBe('request_sent');
  });

  it('genera solicitudes correctas para inning_ended e incluye sponsor', () => {
    const engine = new EventEngine();
    const output = engine.process(
      createEvent({
        eventId: 'evt-000002',
        eventType: 'inning_ended',
        payload: { inning: 5, inningHalf: 'top' },
      }),
    );

    expect(output.requests).toEqual([
      {
        requestId: 'request-000001',
        source: 'EventEngine',
        eventId: 'evt-000002',
        action: 'requestScene',
        sceneId: 'scene-fin-entrada',
        mode: 'preview',
        priority: 90,
      },
      {
        requestId: 'request-000002',
        source: 'EventEngine',
        eventId: 'evt-000002',
        action: 'requestSponsor',
        placement: 'sponsor_overlay',
        preferredZone: 'D',
        mode: 'preview',
        context: { inning: 5, inningHalf: 'top' },
      },
    ]);
  });

  it('genera solicitudes correctas para home_run', () => {
    const engine = new EventEngine();
    const output = engine.process(
      createEvent({
        eventId: 'evt-000003',
        eventType: 'home_run',
        payload: { batterId: 'player-018', distance: 410 },
      }),
    );

    expect(output.requests).toEqual([
      {
        requestId: 'request-000001',
        source: 'EventEngine',
        eventId: 'evt-000003',
        action: 'requestScene',
        sceneId: 'scene-home-run',
        mode: 'preview',
        priority: 95,
      },
      {
        requestId: 'request-000002',
        source: 'EventEngine',
        eventId: 'evt-000003',
        action: 'requestSponsor',
        placement: 'sponsor_overlay',
        preferredZone: 'D',
        mode: 'preview',
        context: { batterId: 'player-018', distance: 410 },
      },
    ]);
  });

  it('registra auditoría para cada evento procesado', () => {
    const engine = new EventEngine();

    engine.process(createEvent({ eventId: 'evt-000010' }));
    engine.process(createEvent({ eventId: 'evt-000011', eventType: 'inning_ended' }));

    expect(engine.getAuditLog()).toHaveLength(2);
    expect(engine.getAuditLog()).toEqual([
      expect.objectContaining({
        auditId: 'audit-000001',
        eventId: 'evt-000010',
      }),
      expect.objectContaining({
        auditId: 'audit-000002',
        eventId: 'evt-000011',
      }),
    ]);
  });

  it('notifica listeners cuando procesa un evento', () => {
    const engine = new EventEngine();
    const listener = vi.fn();

    engine.on(listener);
    const output = engine.process(createEvent());

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(output);
  });

  it('getAuditLog retorna los registros acumulados', () => {
    const engine = new EventEngine();

    engine.process(createEvent({ eventId: 'evt-000020' }));
    engine.process(createEvent({ eventId: 'evt-000021', eventType: 'home_run' }));
    engine.process(createEvent({ eventId: 'evt-000022', eventType: 'pitcher_changed' }));

    const auditLog = engine.getAuditLog();

    expect(auditLog).toHaveLength(3);
    expect(auditLog.map((entry) => entry.eventId)).toEqual(['evt-000020', 'evt-000021', 'evt-000022']);
  });
});
