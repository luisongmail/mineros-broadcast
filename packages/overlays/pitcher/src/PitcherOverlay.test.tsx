// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PitcherOverlay } from './PitcherOverlay';
import type { PitcherData } from './types';

const basePitcher: PitcherData = {
  playerId: 'player-031',
  number: '31',
  name: 'L. Soto',
  teamId: 'team-mineros',
  photoAssetId: 'PLAYER-031',
  throws: 'R',
  stats: {
    ip: '3.2',
    pitches: 54,
    strikeouts: 5,
    walks: 1,
    era: '2.10',
    lastPitch: 'RECTA',
    lastPitchSpeed: '88 KM/H',
  },
};

describe('PitcherOverlay', () => {
  it('renderiza nombre del pitcher', () => {
    render(<PitcherOverlay pitcher={basePitcher} />);
    expect(screen.getByText('L. Soto')).toBeInTheDocument();
  });

  it('renderiza stats IP, K, BB cuando se proveen', () => {
    render(<PitcherOverlay pitcher={basePitcher} />);
    expect(screen.getByText('IP')).toBeInTheDocument();
    expect(screen.getByText('3.2')).toBeInTheDocument();
    expect(screen.getByText('K')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('BB')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('oculta stats cuando no se proveen', () => {
    render(<PitcherOverlay pitcher={{ ...basePitcher, stats: undefined }} />);
    expect(screen.queryByText('IP')).not.toBeInTheDocument();
    expect(screen.queryByText('PIT')).not.toBeInTheDocument();
  });

  it('renderiza placeholder de foto', () => {
    render(<PitcherOverlay pitcher={{ ...basePitcher, photoAssetId: undefined }} />);
    expect(screen.getByLabelText('Placeholder de L. Soto')).toBeInTheDocument();
    expect(screen.getByText('LS')).toBeInTheDocument();
  });

  it('renderiza título PITCHER EN EL CÍRCULO', () => {
    render(<PitcherOverlay pitcher={basePitcher} />);
    expect(screen.getByText('PITCHER EN EL CÍRCULO')).toBeInTheDocument();
  });

  it('canvas tiene clase mb-shell', () => {
    const { container } = render(<PitcherOverlay pitcher={basePitcher} />);
    expect(container.querySelector('.mb-shell')).toBeInTheDocument();
  });

  it('acepta datos mínimos', () => {
    expect(() => render(<PitcherOverlay pitcher={{ playerId: 'p-1', name: 'Ana Ruiz', teamId: 'team-mineros' }} />)).not.toThrow();
    expect(screen.getByText('Ana Ruiz')).toBeInTheDocument();
  });

  it('maneja stats parciales correctamente', () => {
    render(
      <PitcherOverlay
        pitcher={{
          ...basePitcher,
          stats: {
            ip: '4.0',
            strikeouts: 6,
          },
        }}
      />,
    );

    expect(screen.getByText('4.0')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
