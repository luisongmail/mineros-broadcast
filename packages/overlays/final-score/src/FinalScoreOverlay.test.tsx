import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FinalScoreOverlay } from './FinalScoreOverlay';
import type { FinalScoreData } from './types';

const VALID_DATA: FinalScoreData = {
  gameId: 'game-001',
  status: 'final',
  winner: { teamId: 'team-mineros', name: 'Mineros', shortName: 'MIN' },
  loser: { teamId: 'team-visit', name: 'Visita', shortName: 'VIS' },
  finalScore: { winnerRuns: 7, loserRuns: 5 },
  lineScore: {
    winner: { runs: 7, hits: 9, errors: 1 },
    loser: { runs: 5, hits: 7, errors: 2 },
  },
  featuredPlayer: { playerId: 'p-001', name: 'C. Jara', summary: '2-3 . 2 RBI' },
  context: { inningsPlayed: 7, label: 'Final 7 entradas' },
};

describe('FinalScoreOverlay', () => {
  it('renderiza dentro de BroadcastShell', () => {
    const { container } = render(<FinalScoreOverlay data={VALID_DATA} />);
    expect(container.querySelector('.mb-shell')).toBeTruthy();
  });

  it('muestra el marcador del ganador', () => {
    render(<FinalScoreOverlay data={VALID_DATA} />);
    expect(screen.getByText(/MIN 7/)).toBeTruthy();
  });

  it('muestra el marcador del perdedor', () => {
    render(<FinalScoreOverlay data={VALID_DATA} />);
    expect(screen.getByText(/VIS 5/)).toBeTruthy();
  });

  it('muestra el label Final', () => {
    render(<FinalScoreOverlay data={VALID_DATA} />);
    expect(screen.getByText('Final')).toBeTruthy();
  });

  it('muestra el linea R H E cuando existe', () => {
    render(<FinalScoreOverlay data={VALID_DATA} />);
    expect(screen.getByText('R H E')).toBeTruthy();
  });

  it('oculta linea R H E cuando no existe', () => {
    const data = { ...VALID_DATA, lineScore: undefined };
    render(<FinalScoreOverlay data={data} />);
    expect(screen.queryByText('R H E')).toBeNull();
  });

  it('muestra jugadora destacada cuando existe', () => {
    render(<FinalScoreOverlay data={VALID_DATA} />);
    expect(screen.getByText('C. Jara')).toBeTruthy();
  });

  it('oculta jugadora destacada cuando no existe', () => {
    const data = { ...VALID_DATA, featuredPlayer: undefined };
    render(<FinalScoreOverlay data={data} />);
    expect(screen.queryByText('C. Jara')).toBeNull();
  });

  it('muestra el contexto del juego', () => {
    render(<FinalScoreOverlay data={VALID_DATA} />);
    expect(screen.getByText('Final 7 entradas')).toBeTruthy();
  });

  it('renderiza variante full_card', () => {
    const { container } = render(<FinalScoreOverlay data={VALID_DATA} variant="full_card" />);
    expect(container.querySelector('.mb-shell')).toBeTruthy();
  });

  it('muestra error cuando faltan datos requeridos', () => {
    const { container } = render(
      <FinalScoreOverlay data={{ ...VALID_DATA, gameId: '' }} />,
    );
    expect(container.textContent).toContain('incompletos');
  });

  it('usa lower_third_compact por defecto con variante invalida', () => {
    const { container } = render(
      <FinalScoreOverlay data={VALID_DATA} variant={'invalid' as never} />,
    );
    expect(container.querySelector('.mb-shell')).toBeTruthy();
  });
});
