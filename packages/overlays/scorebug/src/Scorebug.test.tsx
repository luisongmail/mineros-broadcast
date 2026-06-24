// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Scorebug } from './Scorebug';

describe('Scorebug', () => {
  let game: {
    homeTeam: { id: string; name: string; shortName: string; logoAssetId: string; role: 'home' };
    awayTeam: { id: string; name: string; shortName: string; logoAssetId: string; role: 'away' };
    score: { home: number; away: number };
    inning: number;
    inningHalf: 'top' | 'bottom';
    outs: number;
    bases: { first: boolean; second: boolean; third: boolean };
    count?: { balls: number; strikes: number };
  };

  beforeEach(() => {
    game = {
      homeTeam: {
        id: 'TEAM-HOME',
        name: 'Mineros',
        shortName: 'MIN',
        logoAssetId: 'AM-LOGO-001',
        role: 'home',
      },
      awayTeam: {
        id: 'TEAM-AWAY',
        name: 'Rivales',
        shortName: 'RIV',
        logoAssetId: 'AM-TEAM-002',
        role: 'away',
      },
      score: { home: 4, away: 2 },
      inning: 3,
      inningHalf: 'top',
      outs: 1,
      bases: { first: false, second: false, third: false },
      count: { balls: 2, strikes: 1 },
    };
  });

  describe('datos obligatorios visibles', () => {
    it('renderiza el nombre corto del equipo local', () => {
      render(<Scorebug game={game} />);
      expect(screen.getByText('MIN')).toBeTruthy();
    });

    it('renderiza el nombre corto del equipo visitante', () => {
      render(<Scorebug game={game} />);
      expect(screen.getByText('RIV')).toBeTruthy();
    });

    it('renderiza el marcador local', () => {
      render(<Scorebug game={game} />);
      expect(screen.getByText('4')).toBeTruthy();
    });

    it('renderiza el marcador visitante', () => {
      render(<Scorebug game={game} />);
      expect(screen.getByText('2')).toBeTruthy();
    });

    it('renderiza el número de inning', () => {
      render(<Scorebug game={game} />);
      expect(screen.getByText('3')).toBeTruthy();
    });
  });

  describe('estado de la media entrada', () => {
    it("muestra indicador ▲ para inningHalf='top'", () => {
      render(<Scorebug game={{ ...game, inningHalf: 'top' }} />);
      expect(screen.getByText('▲')).toBeTruthy();
    });

    it("muestra indicador ▼ para inningHalf='bottom'", () => {
      render(<Scorebug game={{ ...game, inningHalf: 'bottom' }} />);
      expect(screen.getByText('▼')).toBeTruthy();
    });
  });

  describe('outs y bases', () => {
    it('renderiza outs correctamente (0, 1, 2)', () => {
      const { rerender } = render(<Scorebug game={{ ...game, outs: 0 }} />);
      expect(screen.getByText(/0 OUT\b/)).toBeTruthy();

      rerender(<Scorebug game={{ ...game, outs: 1 }} />);
      expect(screen.getByText(/1 OUT\b/)).toBeTruthy();

      rerender(<Scorebug game={{ ...game, outs: 2 }} />);
      expect(screen.getByText(/2 OUTS\b/)).toBeTruthy();
    });

    it('no acepta outs=3 (prop validation / test de edge case)', () => {
      render(<Scorebug game={{ ...game, outs: 3 }} />);
      expect(screen.queryByText(/3 OUTS?\b/)).toBeNull();
    });

    it('renderiza las 3 bases en estado vacío', () => {
      render(<Scorebug game={{ ...game, bases: { first: false, second: false, third: false } }} />);
      expect(screen.getByText(/1B:○/)).toBeTruthy();
      expect(screen.getByText(/2B:○/)).toBeTruthy();
      expect(screen.getByText(/3B:○/)).toBeTruthy();
    });

    it('renderiza base ocupada cuando first=true', () => {
      render(<Scorebug game={{ ...game, bases: { first: true, second: false, third: false } }} />);
      expect(screen.getByText(/1B:●/)).toBeTruthy();
    });

    it('renderiza base ocupada cuando second=true', () => {
      render(<Scorebug game={{ ...game, bases: { first: false, second: true, third: false } }} />);
      expect(screen.getByText(/2B:●/)).toBeTruthy();
    });

    it('renderiza base ocupada cuando third=true', () => {
      render(<Scorebug game={{ ...game, bases: { first: false, second: false, third: true } }} />);
      expect(screen.getByText(/3B:●/)).toBeTruthy();
    });
  });

  describe('conteo y reglas de datos', () => {
    it('muestra conteo cuando se provee count', () => {
      render(<Scorebug game={{ ...game, count: { balls: 2, strikes: 1 } }} />);
      expect(screen.getByText(/B 2/)).toBeTruthy();
      expect(screen.getByText(/S 1/)).toBeTruthy();
    });

    it('no muestra conteo cuando count no se provee', () => {
      render(<Scorebug game={{ ...game, count: undefined }} />);
      expect(screen.queryByText(/Conteo/i)).toBeNull();
    });

    it('NO renderiza marcador calculado (los datos vienen por props)', () => {
      const { rerender } = render(<Scorebug game={game} />);
      expect(screen.getByText('4')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();

      rerender(
        <Scorebug
          game={{
            ...game,
            score: {
              home: 9,
              away: 8,
            },
          }}
        />,
      );

      expect(screen.getByText('9')).toBeTruthy();
      expect(screen.getByText('8')).toBeTruthy();
    });
  });

  describe('reglas visuales', () => {
    it('tiene fondo oscuro (no transparente en el componente interno)', () => {
      const { container } = render(<Scorebug game={game} />);
      expect(container.querySelector('.mb-shell')).toBeTruthy();
    });
  });
});
