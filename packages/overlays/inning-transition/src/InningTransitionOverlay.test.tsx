import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InningTransitionOverlay } from './InningTransitionOverlay';
import type { InningTransitionData } from './types';

const VALID_DATA: InningTransitionData = {
  gameId: 'game-001',
  transition: {
    type: 'top_to_bottom',
    label: 'Cambio de entrada',
    statusLabel: 'Fin 3a',
    nextLabel: 'Cambio a baja 3a',
  },
  inning: { number: 3, completedHalf: 'top', nextHalf: 'bottom' },
  score: {
    home: { teamId: 'team-mineros', shortName: 'MIN', runs: 4 },
    away: { teamId: 'team-visit', shortName: 'VIS', runs: 3 },
  },
  nextBattingTeam: { teamId: 'team-mineros', shortName: 'MIN' },
  nextBattersSummary: 'Batean 6 . 7 . 8',
};

describe('InningTransitionOverlay', () => {
  it('renderiza dentro de BroadcastShell', () => {
    const { container } = render(<InningTransitionOverlay data={VALID_DATA} />);
    expect(container.querySelector('.mb-shell')).toBeTruthy();
  });

  it('muestra el numero de inning', () => {
    render(<InningTransitionOverlay data={VALID_DATA} />);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('muestra el status de transicion', () => {
    render(<InningTransitionOverlay data={VALID_DATA} />);
    expect(screen.getByText('Fin 3a')).toBeTruthy();
  });

  it('muestra el label del proximo turno', () => {
    render(<InningTransitionOverlay data={VALID_DATA} />);
    expect(screen.getByText('Cambio a baja 3a')).toBeTruthy();
  });

  it('muestra el marcador', () => {
    render(<InningTransitionOverlay data={VALID_DATA} />);
    expect(screen.getByText(/MIN 4/)).toBeTruthy();
  });

  it('muestra el equipo que batea', () => {
    render(<InningTransitionOverlay data={VALID_DATA} />);
    const matches = screen.getAllByText('MIN');
    expect(matches.length).toBeGreaterThan(0);
  });

  it('muestra el resumen de proximos bateadores cuando existe', () => {
    render(<InningTransitionOverlay data={VALID_DATA} />);
    expect(screen.getByText('Batean 6 . 7 . 8')).toBeTruthy();
  });

  it('oculta el resumen cuando no existe', () => {
    const data = { ...VALID_DATA, nextBattersSummary: undefined };
    render(<InningTransitionOverlay data={data} />);
    expect(screen.queryByText(/Batean/)).toBeNull();
  });

  it('muestra error cuando faltan datos requeridos', () => {
    const { container } = render(
      <InningTransitionOverlay data={{ ...VALID_DATA, gameId: '' }} />,
    );
    expect(container.textContent).toContain('incompletos');
  });

  it('renderiza variante minimal', () => {
    const { container } = render(
      <InningTransitionOverlay data={VALID_DATA} variant="minimal" />,
    );
    expect(container.querySelector('.mb-shell')).toBeTruthy();
  });

  it('usa lower_third_compact por defecto', () => {
    const { container } = render(<InningTransitionOverlay data={VALID_DATA} />);
    expect(container.querySelector('.mb-shell')).toBeTruthy();
  });

  it('renderiza variante end_game', () => {
    const { container } = render(
      <InningTransitionOverlay data={VALID_DATA} variant="end_game" />,
    );
    expect(container.querySelector('.mb-shell')).toBeTruthy();
  });
});
