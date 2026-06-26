import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ScoreboardOverlay } from './ScoreboardOverlay';
import type { ScoreboardOverlayData } from './types';

const baseData: ScoreboardOverlayData = {
  schemaVersion: '1.0.0',
  correlationId: 'test-correlation',
  overlay: 'baseball_scoreboard_board',
  variant: 'full_board',
  branding: {
    brandName: 'Mineros Broadcast',
  },
  competition: {
    name: 'Liga Oriente',
    tournament: 'Torneo Apertura 2026',
    category: 'Infantil',
  },
  venue: {
    name: 'Estadio Lo Prado',
  },
  game: {
    gameId: 'game-001',
    gameType: 'Juego Regular',
    date: '2026-06-25',
    startTime: '13:30',
    configuredInnings: 7,
    remainingTime: '48:12',
    status: 'live',
  },
  teams: {
    away: { teamId: 'away', displayName: 'Team Anderson', abbr: 'TAI' },
    home: { teamId: 'home', displayName: 'Astros', abbr: 'AST' },
  },
  lineScore: {
    innings: [
      { inning: 1, away: 0, home: 1 },
      { inning: 2, away: 0, home: 0 },
      { inning: 3, away: 1, home: 0 },
      { inning: 4, away: 1, home: 3 },
      { inning: 5, away: null, home: null },
      { inning: 6, away: null, home: null },
      { inning: 7, away: null, home: null },
    ],
    totals: {
      away: { runs: 2, hits: 5, errors: 1 },
      home: { runs: 4, hits: 6, errors: 0 },
    },
  },
  battingTeam: { teamId: 'home', displayName: 'Astros', abbr: 'AST' },
  nextBatters: [
    { order: 1, playerId: 'p1', playerNumber: '12', playerName: 'S. Sánchez', position: 'SS', battingHand: 'BD', avg: '.333', hits: 2, rbi: 1, today: '1-2' },
    { order: 2, playerId: 'p2', playerNumber: '18', playerName: 'C. Arias', position: 'CF', battingHand: 'BI', avg: '.286', hits: 1, rbi: 0, today: '0-1' },
    { order: 3, playerId: 'p3', playerNumber: '23', playerName: 'I. Córdova', position: '1B', battingHand: 'BD', avg: '.417', hits: 3, rbi: 2, today: '2-2' },
  ],
  pitchers: {
    away: { teamId: 'away', teamAbbr: 'TAI', playerId: 'pitcher-away', playerNumber: '45', playerName: 'R. Gómez', ip: '3.0', runsAllowed: 4, hitsAllowed: 6, walks: 2, strikeouts: 3, pitchCount: 64 },
    home: { teamId: 'home', teamAbbr: 'AST', playerId: 'pitcher-home', playerNumber: '21', playerName: 'C. Jara', ip: '4.0', runsAllowed: 2, hitsAllowed: 5, walks: 1, strikeouts: 5, pitchCount: 54 },
  },
  sponsors: [
    { sponsorId: 'merchise', displayName: 'Merchise', text: 'Tecnología para la transmisión', active: true, priority: 1 },
    { sponsorId: 'storeware', displayName: 'Storeware', text: 'Plataforma oficial de datos', active: true, priority: 2 },
    { sponsorId: 'pjd', displayName: 'PJD', text: 'Auspiciador de la jornada', active: true, priority: 3 },
  ],
  layout: {
    sponsorGrid: {
      enabled: true,
      visibleCards: 3,
      transitionMs: 450,
      holdMs: 5000,
      showPartialNextCard: true,
      cardGapPx: 22,
    },
  },
};

describe('ScoreboardOverlay', () => {
  afterEach(() => {
    cleanup();
  });

  it('renderiza encabezado y título principal', () => {
    render(<ScoreboardOverlay data={baseData} isPaused />);
    expect(screen.getByText('Pizarra oficial')).toBeInTheDocument();
    expect(screen.getByText(/Liga Oriente/i)).toBeInTheDocument();
    expect(screen.getByText('Estadio Lo Prado · Juego Regular')).toBeInTheDocument();
  });

  it('renderiza columnas dinámicas según entradas configuradas', () => {
    render(
      <ScoreboardOverlay
        data={{
          ...baseData,
          game: { ...baseData.game, configuredInnings: 5 },
          lineScore: {
            ...baseData.lineScore,
            innings: baseData.lineScore.innings.slice(0, 5),
          },
        }}
        isPaused
      />,
    );

    expect(screen.getByText(/Configuración del juego: 5 entradas/i)).toBeInTheDocument();
    expect(screen.queryByText(/Configuración del juego: 7 entradas/i)).not.toBeInTheDocument();
  });

  it('usa fallback de abreviatura para badges sin logo', () => {
    render(
      <ScoreboardOverlay
        data={{
          ...baseData,
          teams: {
            away: { ...baseData.teams.away, logoAssetId: undefined },
            home: { ...baseData.teams.home, logoAssetId: undefined },
          },
          battingTeam: { ...baseData.battingTeam, logoAssetId: undefined },
        }}
        isPaused
      />,
    );

    expect(screen.getAllByTestId('team-badge-fallback-AS').length).toBeGreaterThan(0);
  });

  it('renderiza auspiciadores activos', () => {
    render(<ScoreboardOverlay data={baseData} isPaused />);
    expect(screen.getAllByText('Merchise').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Storeware').length).toBeGreaterThan(0);
  });
});
