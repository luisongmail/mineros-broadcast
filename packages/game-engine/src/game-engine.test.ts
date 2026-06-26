import { describe, expect, it, vi } from 'vitest';

import type { GameEvent, GameTeam } from './types';
import { GameEngine } from './GameEngine';
import { BASEBALL5_RULES, DEFAULT_BASEBALL_RULES, SOFTBALL_FAST_RULES } from './types';

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
    const handler = vi.fn<[GameEvent], void>();
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
    const handler = vi.fn<[GameEvent], void>();
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

  describe('setCount — strikeout y walk', () => {
    it('3er strike activa strikeout: out +1, conteo queda en 0-0', () => {
      const engine = createEngine();
      engine.startGame();
      engine.setCount({ strikes: 2 });
      engine.setCount({ strikes: 3 });
      const s = engine.getState();
      expect(s.outs).toBe(1);
      expect(s.count.strikes).toBe(0);
      expect(s.count.balls).toBe(0);
    });

    it('4a bola: walk, bateador va a 1a (1a estaba vacia)', () => {
      const engine = createEngine();
      engine.startGame();
      engine.setCount({ balls: 3 });
      engine.setCount({ balls: 4 });
      const s = engine.getState();
      expect(s.bases.first).toBe(true);
      expect(s.bases.second).toBe(false);
      expect(s.count.balls).toBe(0);
    });

    it('walk con corredor en 1a: 1a y 2a ocupadas', () => {
      const engine = createEngine();
      engine.startGame();
      engine.setBases({ first: true });
      engine.setCount({ balls: 4 });
      const s = engine.getState();
      expect(s.bases.first).toBe(true);
      expect(s.bases.second).toBe(true);
      expect(s.bases.third).toBe(false);
    });

    it('walk con 1a y 2a ocupadas: las tres bases ocupadas', () => {
      const engine = createEngine();
      engine.startGame();
      engine.setBases({ first: true, second: true });
      engine.setCount({ balls: 4 });
      const s = engine.getState();
      expect(s.bases.first).toBe(true);
      expect(s.bases.second).toBe(true);
      expect(s.bases.third).toBe(true);
    });

    it('walk con bases llenas: anota carrera, bases siguen llenas', () => {
      const engine = createEngine();
      engine.startGame();
      engine.setBases({ first: true, second: true, third: true });
      const before = engine.getState().score;
      engine.setCount({ balls: 4 });
      const s = engine.getState();
      const battingTeam = 'away'; // top = visitante batea
      expect(s.score[battingTeam]).toBe(before[battingTeam] + 1);
      expect(s.bases.first).toBe(true);
      expect(s.bases.second).toBe(true);
      expect(s.bases.third).toBe(true);
    });

    it('walk con solo 2a ocupada: no hay fuerza en 2a, 1a y 2a ocupadas', () => {
      const engine = createEngine();
      engine.startGame();
      engine.setBases({ second: true });
      engine.setCount({ balls: 4 });
      const s = engine.getState();
      expect(s.bases.first).toBe(true);
      expect(s.bases.second).toBe(true);
      expect(s.bases.third).toBe(false);
    });
  });

  describe('endGame', () => {
    it('cambia el estado a final y emite game_finalized', () => {
      const engine = createEngine();
      const handler = vi.fn<[GameEvent], void>();
      engine.on('game_finalized', handler);
      engine.startGame();
      engine.incrementScore('home');
      engine.endGame();
      expect(engine.getState().status).toBe('final');
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0]).toMatchObject({
        eventType: 'game_finalized',
        payload: { finalScore: { home: 1, away: 0 } },
      });
    });

    it('no emite evento si el juego ya es final', () => {
      const engine = createEngine();
      const handler = vi.fn<[GameEvent], void>();
      engine.on('game_finalized', handler);
      engine.startGame();
      engine.endGame();
      engine.endGame();
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('GameEngine — GameRules', () => {
    it('uses DEFAULT_BASEBALL_RULES when no rules provided', () => {
      const engine = new GameEngine('g1', homeTeam, awayTeam);
      expect(engine.getRules().inningsCount).toBe(9);
      expect(engine.getRules().hasPitcher).toBe(true);
      expect(engine.getRules().maxBalls).toBe(4);
    });

    it('accepts custom rules in constructor', () => {
      const engine = new GameEngine('g1', homeTeam, awayTeam, BASEBALL5_RULES);
      expect(engine.getRules().inningsCount).toBe(5);
      expect(engine.getRules().hasPitcher).toBe(false);
      expect(engine.getRules().maxBalls).toBeNull();
      expect(engine.getRules().batterAttempts).toBe(1);
    });

    it('merges partial rules with defaults', () => {
      const engine = new GameEngine('g1', homeTeam, awayTeam, { inningsCount: 7 });
      expect(engine.getRules().inningsCount).toBe(7);
      expect(engine.getRules().hasPitcher).toBe(true);
    });

    it('GameState includes rules', () => {
      const engine = new GameEngine('g1', homeTeam, awayTeam, SOFTBALL_FAST_RULES);
      const state = engine.getState();
      expect(state.rules.continuousBatting).toBe(false);
      expect(state.rules.dpFlexAllowed).toBe(true);
      expect(state.rules.mercyRule).toHaveLength(1);
    });

    it('counts a Baseball5 swing as an immediate out', () => {
      const engine = new GameEngine('g1', homeTeam, awayTeam, BASEBALL5_RULES);

      engine.setCount({ strikes: 1 });

      expect(engine.getState().outs).toBe(1);
      expect(engine.getState().count).toEqual({ balls: 0, strikes: 0 });
    });

    it('ends regulation using configured inningsCount', () => {
      const engine = new GameEngine('g1', homeTeam, awayTeam, {
        ...DEFAULT_BASEBALL_RULES,
        inningsCount: 1,
      });

      engine.startGame();
      engine.incrementScore('away');
      engine.advanceHalfInning();
      engine.addOut();
      engine.addOut();
      engine.addOut();

      expect(engine.getState().status).toBe('final');
      expect(engine.getState().inning).toBe(1);
      expect(engine.getState().inningHalf).toBe('bottom');
    });
  });
});
