import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LineupOverlay } from './LineupOverlay';
import type { LineupOverlayProps } from './types';

const baseProps: LineupOverlayProps = {
  team: {
    teamId: 'team-mineros',
    name: 'Mineros de Santiago',
    shortName: 'MIN',
    logoAssetId: 'logo-mineros',
  },
  players: [
    { order: 1, playerId: 'p1', name: 'Ana Ruiz', number: '12', position: 'CF', avg: '.385', photoAssetId: 'p1', status: 'active' },
    { order: 2, playerId: 'p2', name: 'Bea Soto', number: '04', position: 'SS', avg: '.300', photoAssetId: 'p2', status: 'active', isCurrentBatter: true },
    { order: 3, playerId: 'p3', name: 'Carla Gil', number: '17', position: '2B', avg: '.278', photoAssetId: 'p3', status: 'active' },
    { order: 4, playerId: 'p4', name: 'Diana Paz', number: '09', position: '1B', avg: '.301', photoAssetId: 'p4', status: 'active' },
    { order: 5, playerId: 'p5', name: 'Elena Cruz', number: '11', position: '3B', avg: '.255', photoAssetId: 'p5', status: 'active' },
    { order: 6, playerId: 'p6', name: 'Fernanda Sol', number: '23', position: 'RF', avg: '.287', photoAssetId: 'p6', status: 'active' },
    { order: 7, playerId: 'p7', name: 'Gina Toro', number: '31', position: 'LF', avg: '.240', photoAssetId: 'p7', status: 'active' },
    { order: 8, playerId: 'p8', name: 'Hilda Mar', number: '05', position: 'C', avg: '.221', photoAssetId: 'p8', status: 'active' },
    { order: 9, playerId: 'p9', name: 'Iris Leon', number: '44', position: 'P', avg: '.198', photoAssetId: 'p9', status: 'active' },
  ],
  pitcher: {
    playerId: 'pitcher-1',
    name: 'Julia Mesa',
    number: '32',
    photoAssetId: 'pitcher-32',
  },
  assetBaseUrl: 'https://assets.mineros.test',
};

describe('LineupOverlay', () => {
  it('renderiza nombre del equipo', () => {
    render(<LineupOverlay {...baseProps} />);
    expect(screen.getByText('Mineros de Santiago')).toBeInTheDocument();
  });

  it('renderiza 9 jugadores cuando se proveen 9', () => {
    render(<LineupOverlay {...baseProps} />);
    expect(screen.getAllByTestId('lineup-row')).toHaveLength(9);
  });

  it('renderiza numero de orden correcto', () => {
    render(<LineupOverlay {...baseProps} />);
    expect(within(screen.getAllByTestId('lineup-row')[0]).getByText('1')).toBeInTheDocument();
  });

  it('destaca bateador actual', () => {
    render(<LineupOverlay {...baseProps} />);
    const currentRow = screen.getAllByTestId('lineup-row').find((row) => row.getAttribute('data-current-batter') === 'true');
    expect(currentRow).toHaveClass('bg-mineros-red/20');
  });

  it('muestra nombre y numero de jugador', () => {
    render(<LineupOverlay {...baseProps} />);
    const firstRow = screen.getAllByTestId('lineup-row')[0];
    expect(within(firstRow).getByText('Ana Ruiz')).toBeInTheDocument();
    expect(within(firstRow).getByText('12')).toBeInTheDocument();
  });

  it('muestra posicion cuando se provee', () => {
    render(<LineupOverlay {...baseProps} />);
    expect(within(screen.getAllByTestId('lineup-row')[0]).getByText('CF')).toBeInTheDocument();
  });

  it('oculta avg cuando no se provee', () => {
    render(
      <LineupOverlay
        {...baseProps}
        players={[{ ...baseProps.players[0], avg: undefined }]}
      />,
    );
    expect(screen.queryByText(/AVG\s\.385/)).not.toBeInTheDocument();
  });

  it('renderiza pitcher cuando se provee', () => {
    render(<LineupOverlay {...baseProps} />);
    expect(screen.getByText('Pitcher abridora')).toBeInTheDocument();
    expect(screen.getByText('Julia Mesa')).toBeInTheDocument();
  });

  it("jugador con status substituted se muestra diferente", () => {
    render(
      <LineupOverlay
        {...baseProps}
        players={[{ ...baseProps.players[0], status: 'substituted' }]}
      />,
    );
    expect(screen.getByTestId('lineup-row')).toHaveClass('opacity-60');
  });

  it('renderiza con minimo 1 jugador', () => {
    render(
      <LineupOverlay
        {...baseProps}
        players={[baseProps.players[0]]}
        pitcher={undefined}
      />,
    );
    const rows = screen.getAllByTestId('lineup-row');
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText('Ana Ruiz')).toBeInTheDocument();
  });

  it('renderiza posicion defensiva en diamante', () => {
    render(<LineupOverlay {...baseProps} />);
    expect(screen.getByLabelText('Posicion defensiva en diamante')).toBeInTheDocument();
    expect(screen.getAllByText('CF')[0]).toBeInTheDocument();
  });
});
