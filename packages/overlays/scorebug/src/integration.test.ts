// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GameEngine, type GameTeam } from '@mineros/game-engine';

import { Scorebug } from './Scorebug';

const homeTeam: GameTeam = {
  id: 'TEAM-HOME',
  name: 'Mineros de Santiago',
  shortName: 'MIN',
  logoAssetId: 'AM-LOGO-001',
  role: 'home',
};

const awayTeam: GameTeam = {
  id: 'TEAM-AWAY',
  name: 'Rivales',
  shortName: 'RIV',
  logoAssetId: 'AM-TEAM-002',
  role: 'away',
};

describe('Scorebug + GameEngine integration', () => {
  it('Scorebug muestra datos directamente del GameState', () => {
    const engine = new GameEngine('game-001', homeTeam, awayTeam);
    engine.startGame();
    engine.incrementScore('home');
    engine.incrementScore('home');

    render(Scorebug({ game: engine.getState() }));

    expect(screen.getByText('2')).toBeTruthy();
  });

  it('Scorebug refleja cambio de outs sin calcular', () => {
    const engine = new GameEngine('game-002', homeTeam, awayTeam);
    engine.startGame();
    engine.addOut();

    render(Scorebug({ game: engine.getState() }));

    expect(screen.getByText(/1 OUT\b/)).toBeTruthy();
  });

  it('Scorebug refleja cambio de inning', () => {
    const engine = new GameEngine('game-003', homeTeam, awayTeam);
    engine.startGame();
    engine.advanceHalfInning();
    engine.advanceHalfInning();

    render(Scorebug({ game: engine.getState() }));

    expect(screen.getByText('▲')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('Scorebug refleja bases ocupadas', () => {
    const engine = new GameEngine('game-004', homeTeam, awayTeam);
    engine.startGame();
    engine.setBases({ first: { id: 'r1', name: '', number: 1, originBase: 'first', earned: true }, third: { id: 'r3', name: '', number: 3, originBase: 'third', earned: true } });

    render(Scorebug({ game: engine.getState() }));

    expect(screen.getByText(/1B:●/)).toBeTruthy();
    expect(screen.getByText(/2B:○/)).toBeTruthy();
    expect(screen.getByText(/3B:●/)).toBeTruthy();
  });
});
