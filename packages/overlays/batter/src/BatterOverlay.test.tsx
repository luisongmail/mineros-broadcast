// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { BatterOverlay } from './BatterOverlay';
import type { BatterData } from './types';

const baseBatter: BatterData = {
  playerId: 'player-015',
  number: '15',
  name: 'Martina Pellizaris',
  position: '2B',
  status: 'AL BATE',
  teamId: 'team-mineros',
  photoAssetId: 'AM-PLAYER-015',
  stats: {
    avg: '.385',
    hits: 5,
    rbi: 4,
    today: '2-2',
  },
};

describe('BatterOverlay', () => {
  it('renderiza nombre del bateador', () => {
    render(<BatterOverlay batter={baseBatter} />);
    expect(screen.getByText('Martina Pellizaris')).toBeInTheDocument();
  });

  it('renderiza número cuando se provee', () => {
    render(<BatterOverlay batter={baseBatter} />);
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('renderiza AL BATE como status', () => {
    render(<BatterOverlay batter={baseBatter} />);
    expect(screen.getByText('AL BATE')).toBeInTheDocument();
  });

  it('renderiza stats cuando se proveen', () => {
    render(<BatterOverlay batter={baseBatter} />);
    expect(screen.getByText('AVG')).toBeInTheDocument();
    expect(screen.getByText('.385')).toBeInTheDocument();
    expect(screen.getByText('H')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('RBI')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('no renderiza stats cuando no se proveen', () => {
    render(<BatterOverlay batter={{ ...baseBatter, stats: undefined }} />);
    expect(screen.queryByText('AVG')).not.toBeInTheDocument();
    expect(screen.queryByText('RBI')).not.toBeInTheDocument();
  });

  it('renderiza placeholder cuando no hay foto', () => {
    render(<BatterOverlay batter={{ ...baseBatter, photoAssetId: undefined }} />);
    expect(screen.getByLabelText('Placeholder de Martina Pellizaris')).toBeInTheDocument();
    expect(screen.getByText('MP')).toBeInTheDocument();
  });

  it('renderiza posición cuando se provee', () => {
    render(<BatterOverlay batter={baseBatter} />);
    expect(screen.getByText('2B')).toBeInTheDocument();
  });

  it('no renderiza posición cuando no se provee', () => {
    render(<BatterOverlay batter={{ ...baseBatter, position: undefined }} />);
    expect(screen.queryByText('2B')).not.toBeInTheDocument();
  });

  it('variante compact renderiza versión minimalista', () => {
    render(<BatterOverlay batter={baseBatter} variant="compact" />);
    expect(screen.getByText('Martina Pellizaris')).toBeInTheDocument();
    expect(screen.queryByText('AVG')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Placeholder de Martina Pellizaris')).not.toBeInTheDocument();
  });

  it('variante desconocida usa lower_third', () => {
    render(<BatterOverlay batter={{ ...baseBatter, photoAssetId: undefined }} variant={'desconocida' as never} />);
    expect(screen.getByLabelText('Placeholder de Martina Pellizaris')).toBeInTheDocument();
  });

  it('acepta datos mínimos obligatorios', () => {
    expect(() =>
      render(
        <BatterOverlay
          batter={{
            playerId: 'player-001',
            name: 'Ada Gómez',
            status: 'ON DECK',
            teamId: 'team-mineros',
          }}
        />,
      ),
    ).not.toThrow();

    expect(screen.getByText('Ada Gómez')).toBeInTheDocument();
    expect(screen.getByText('ON DECK')).toBeInTheDocument();
  });

  it('falta playerId maneja error de datos incompletos', () => {
    render(
      <BatterOverlay
        batter={{
          playerId: '',
          name: 'Ada Gómez',
          status: 'AL BATE',
          teamId: 'team-mineros',
        } as BatterData}
      />,
    );

    expect(screen.getByText('Datos de bateador incompletos')).toBeInTheDocument();
  });
});
