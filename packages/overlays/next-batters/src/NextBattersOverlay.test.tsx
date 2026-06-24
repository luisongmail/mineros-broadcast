import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NextBattersOverlay } from './NextBattersOverlay';
import type { NextBattersOverlayProps } from './types';

const baseProps: NextBattersOverlayProps = {
  team: {
    teamId: 'team-mineros',
    name: 'Mineros de Santiago',
    shortName: 'MIN',
    logoAssetId: 'logo-mineros',
  },
  inning: {
    number: 3,
    half: 'top',
  },
  batters: [
    { state: 'current', order: 2, playerId: 'p2', number: '12', name: 'C. Jara', position: '2B', avg: '.385', photoAssetId: 'p2' },
    { state: 'on_deck', order: 3, playerId: 'p3', number: '15', name: 'M. Pellizaris', position: '3B', avg: '.300', photoAssetId: 'p3' },
    { state: 'in_the_hole', order: 4, playerId: 'p4', number: '08', name: 'V. Rios', position: 'SS', avg: '.278', photoAssetId: 'p4' },
  ],
  assetBaseUrl: 'https://assets.mineros.test',
};

describe('NextBattersOverlay', () => {
  it('renderiza bateador actual con estado current', () => {
    render(<NextBattersOverlay {...baseProps} />);
    expect(screen.getByTestId('batter-card-current')).toHaveAttribute('data-batter-state', 'current');
  });

  it('renderiza AL BATE para estado current', () => {
    render(<NextBattersOverlay {...baseProps} />);
    expect(screen.getByText('AL BATE')).toBeInTheDocument();
  });

  it('renderiza EN ESPERA para estado on_deck', () => {
    render(<NextBattersOverlay {...baseProps} />);
    expect(screen.getByText('EN ESPERA')).toBeInTheDocument();
  });

  it('renderiza SIGUIENTE para estado in_the_hole', () => {
    render(<NextBattersOverlay {...baseProps} />);
    expect(screen.getByText('SIGUIENTE')).toBeInTheDocument();
  });

  it('renderiza nombre y numero del bateador', () => {
    render(<NextBattersOverlay {...baseProps} />);
    expect(screen.getByText('C. Jara')).toBeInTheDocument();
    expect(screen.getByText('#12')).toBeInTheDocument();
  });

  it('renderiza posicion cuando se provee', () => {
    render(<NextBattersOverlay {...baseProps} />);
    expect(screen.getByText(/2B/)).toBeInTheDocument();
  });

  it('renderiza avg cuando se provee', () => {
    render(<NextBattersOverlay {...baseProps} />);
    expect(screen.getByText(/AVG \.385/)).toBeInTheDocument();
  });

  it('no renderiza avg cuando no se provee', () => {
    render(
      <NextBattersOverlay
        {...baseProps}
        batters={[{ ...baseProps.batters[0], avg: undefined }]}
      />,
    );
    expect(screen.queryByText(/AVG/)).not.toBeInTheDocument();
  });

  it('bateador current tiene diferenciacion visual', () => {
    render(<NextBattersOverlay {...baseProps} />);
    expect(screen.getByTestId('batter-card-current')).toHaveClass('border-mineros-red');
  });

  it('renderiza con solo 1 bateador', () => {
    render(
      <NextBattersOverlay
        {...baseProps}
        batters={[baseProps.batters[0]]}
      />,
    );
    expect(screen.getAllByTestId(/batter-card-/)).toHaveLength(1);
    expect(screen.getByText('C. Jara')).toBeInTheDocument();
  });

  it('renderiza foto placeholder cuando no hay photoAssetId', () => {
    render(
      <NextBattersOverlay
        {...baseProps}
        batters={[{ ...baseProps.batters[0], photoAssetId: undefined }]}
      />,
    );
    expect(screen.getByTestId('photo-placeholder')).toBeInTheDocument();
  });
});
