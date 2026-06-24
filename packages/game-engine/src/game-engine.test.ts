import { describe, expect, it, vi } from 'vitest';

import type { GameEvent, GameTeam } from './types';
import { GameEngine } from './GameEngine';

const homeTeam: GameTeam = {
  id: 'team-mineros',
  name: 'Mineros',
  shortName: 'MIN',
  logoAssetId: 'AM-LOGO-001',
  role: 'home',
};

const awayTeam: GameTeam = {
  id: 'team-rival',
  name: 'Rival',
  shortName: 'RIV',
  logoAssetId: 'AM-LOGO-002',
  role: 'away',
};

function createEngine(): GameEngine {
  return new GameEngine('game-2026-001', homeTeam, awayTeam);
}

describe('GameEngine', () => {
  it('crea el estado inicial del partido', () => {
    const engine = createEngine();
    const state = engine.getState();

    expect(state).toMatchObject({
      gameId: 'game-2026-001',
      status: 'scheduled',
      inning: 1,
      inningHalf: 'top',
      outs: 0,
      bases: { first: false, second: false, third: false },
      count: { balls: 0, strikes: 0 },
      score: { home: 0, away: 0 },
      lineup: { home: [], away: [] },
      eventLog: [],
      auditLog: [],
    });
    expect(state.createdAt).toBeTruthy();
    expect(state.updatedAt).toBeTruthy();
  });

  it("startGame cambia status a 'live'", () => {
    const engine = createEngine();

    engine.startGame();

    expect(engine.getState().status).toBe('live');
  });

  it('incrementScore incrementa carrera y emite run_scored', () => {
    const engine = createEngine();
    const handler = vi.fn<(event: GameEvent) => void>();
    engine.on('run_scored', handler);

    engine.incrementScore('home');

    expect(engine.getState().score).toEqual({ home: 1, away: 0 });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({
      eventType: 'run_scored',
      payload: {
        team: 'home',
        score: { home: 1, away: 0 },
      },
    });
  });

  it('addOut agrega out y al tercer out limpia y avanza media entrada', () => {
    const engine = createEngine();

    engine.setBases({ first: true, third: true });
    engine.setCount({ balls: 2, strikes: 1 });
    engine.addOut();
    engine.addOut();
    expect(engine.getState().outs).toBe(2);

    engine.addOut();

    expect(engine.getState()).toMatchObject({
      inning: 1,
      inningHalf: 'bottom',
      outs: 0,
      bases: { first: false, second: false, third: false },
      count: { balls: 0, strikes: 0 },
    });
    expect(engine.getState().eventLog.at(-2)).toMatchObject({ eventType: 'inning_ended' });
    expect(engine.getState().eventLog.at(-1)).toMatchObject({ eventType: 'inning_started' });
  });

  it('setBases cambia bases y clearBases las limpia', () => {
    const engine = createEngine();

    engine.setBases({ first: true, second: true });
    expect(engine.getState().bases).toEqual({ first: true, second: true, third: false });

    engine.clearBases();
    expect(engine.getState().bases).toEqual({ first: false, second: false, third: false });
  });

  it('setCount cambia conteo y resetCount lo reinicia', () => {
    const engine = createEngine();

    engine.setCount({ balls: 3, strikes: 2 });
    expect(engine.getState().count).toEqual({ balls: 3, strikes: 2 });

    engine.resetCount();
    expect(engine.getState().count).toEqual({ balls: 0, strikes: 0 });
  });

  it('advanceHalfInning mueve top a bottom y bottom a top con inning+1', () => {
    const engine = createEngine();

    engine.advanceHalfInning();
    expect(engine.getState()).toMatchObject({ inning: 1, inningHalf: 'bottom' });

    engine.advanceHalfInning();
    expect(engine.getState()).toMatchObject({ inning: 2, inningHalf: 'top' });
  });

  it('setCurrentBatter emite batter_changed y reinicia conteo', () => {
    const engine = createEngine();
    const handler = vi.fn<(event: GameEvent) => void>();
    engine.on('batter_changed', handler);

    engine.setCount({ balls: 2, strikes: 2 });
    engine.setCurrentBatter('player-018');

    expect(engine.getState().currentBatterId).toBe('player-018');
    expect(engine.getState().count).toEqual({ balls: 0, strikes: 0 });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({
      eventType: 'batter_changed',
      payload: { currentBatterId: 'player-018' },
    });
  });

  it('setScore con operatorId y reason crea entrada de auditoría', () => {
    const engine = createEngine();

    engine.setScore({ home: 4 }, 'operator-001', 'Corrección');

    expect(engine.getState().score).toEqual({ home: 4, away: 0 });
    expect(engine.getState().auditLog).toHaveLength(1);
    expect(engine.getState().auditLog[0]).toMatchObject({
      auditId: 'audit-000001',
      operatorId: 'operator-001',
      command: 'setScore',
      reason: 'Corrección',
      previousState: { home: 0, away: 0 },
      newState: { home: 4, away: 0 },
    });
  });

  it('lanza error si outs es menor que 0', () => {
    const engine = createEngine();

    expect(() => engine.setOuts(-1, 'operator-001')).toThrow('outs cannot be negative');
  });

  it('lanza error si el marcador es negativo', () => {
    const engine = createEngine();

    expect(() => engine.setScore({ away: -1 }, 'operator-001', 'Corrección')).toThrow('score.away cannot be negative');
  });

  it('nunca persiste outs igual a 3', () => {
    const engine = createEngine();

    engine.addOut();
    engine.addOut();
    engine.addOut();

    expect(engine.getState().outs).not.toBe(3);
    expect(engine.getState().outs).toBe(0);
  });
});
